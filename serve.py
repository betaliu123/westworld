#!/usr/bin/env python3
# serve.py — 西部世界 Demo 本地开发服务器
# 与 python -m http.server 的区别：
#   1) 对所有响应发 no-store 缓存头，保证浏览器每次刷新都加载最新代码；
#   2) 提供 /api/llm/chat 代理，把 LLM API key 收回服务端（前端不再硬编码密钥）。
#
# 用法：
#   python serve.py [端口]      # 默认 8080
# 然后浏览器打开 http://localhost:8080
#
# LLM 配置（按优先级：环境变量 > .env 文件 > 默认值）：
#   LLM_BASE_URL / LLM_API_KEY / LLM_MODEL
#   LLM_SESSION_MAX / LLM_PER_MINUTE / LLM_MAX_TOKENS   # 用量闸

import sys
import os
import json
import time
import functools
import urllib.request
import urllib.error
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler


# ---------- 配置加载 ----------

def _load_env():
    """读取同目录 .env（KEY=VALUE 行），环境变量优先。"""
    env = {}
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip()
    return env


_ENV = _load_env()


def _cfg(key, default=None):
    return os.environ.get(key) or _ENV.get(key) or default


LLM_BASE_URL = _cfg("LLM_BASE_URL", "https://ai.leihuo.netease.com")
LLM_API_KEY = _cfg("LLM_API_KEY", "")
LLM_MODEL = _cfg("LLM_MODEL", "deepseek-v4-flash")

LIMITS = {
    "sessionMax": int(_cfg("LLM_SESSION_MAX", "200")),
    "perMinute": int(_cfg("LLM_PER_MINUTE", "20")),
    "maxTokensCap": int(_cfg("LLM_MAX_TOKENS", "900")),
}

# 用量计数（进程级共享，多人访问时是全局配额）
_usage = {"total": 0, "window_start": time.time(), "window_calls": 0}


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):  # 日志精简：只报错误
        if args and isinstance(args[1], str) and args[1].startswith(("4", "5")):
            super().log_message(fmt, *args)

    # ---------- LLM 代理 ----------

    def _send_json(self, status, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.rstrip("/") == "/api/llm/status":
            return self._send_json(200, {
                "configured": bool(LLM_BASE_URL and LLM_API_KEY and LLM_MODEL),
                "model": LLM_MODEL,
                "limits": LIMITS,
                "usage": {"totalCalls": _usage["total"], "sessionMax": LIMITS["sessionMax"]},
            })
        return super().do_GET()

    def do_POST(self):
        if self.path.rstrip("/") != "/api/llm/chat":
            return self._send_json(404, {"error": "not found"})
        if not (LLM_BASE_URL and LLM_API_KEY and LLM_MODEL):
            return self._send_json(503, {
                "error": "LLM 未配置：在 .env 里填 LLM_BASE_URL / LLM_API_KEY / LLM_MODEL"
            })

        # 用量闸
        now = time.time()
        if now - _usage["window_start"] >= 60:
            _usage["window_start"] = now
            _usage["window_calls"] = 0
        if _usage["total"] >= LIMITS["sessionMax"]:
            return self._send_json(429, {
                "error": "会话总调用已达上限 %d（重启 serve.py 重置）" % LIMITS["sessionMax"]
            })
        if _usage["window_calls"] >= LIMITS["perMinute"]:
            return self._send_json(429, {
                "error": "每分钟调用已达上限 %d" % LIMITS["perMinute"]
            })

        try:
            length = int(self.headers.get("Content-Length", 0) or 0)
            raw = self.rfile.read(length) if length else b"{}"
            payload = json.loads(raw.decode("utf-8") or "{}")
        except Exception as e:
            return self._send_json(400, {"error": "请求体不是合法 JSON: %s" % e})

        # 服务端强制：模型固定、max_tokens 上限、不流式
        payload["model"] = LLM_MODEL
        wanted = payload.get("max_tokens")
        payload["max_tokens"] = min(
            wanted if isinstance(wanted, int) else LIMITS["maxTokensCap"],
            LIMITS["maxTokensCap"],
        )
        payload["stream"] = False

        _usage["total"] += 1
        _usage["window_calls"] += 1

        req = urllib.request.Request(
            LLM_BASE_URL.rstrip("/") + "/v1/chat/completions",
            data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            method="POST",
            headers={
                "Content-Type": "application/json",
                "Authorization": "Bearer %s" % LLM_API_KEY,
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                data, code = r.read(), r.status
        except urllib.error.HTTPError as e:
            data, code = e.read(), e.code
        except Exception as e:
            data, code = json.dumps({"error": str(e)}).encode("utf-8"), 502

        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    host = _cfg("HOST", "0.0.0.0")  # 绑 0.0.0.0 便于同事内网访问
    handler = functools.partial(NoCacheHandler, directory=".")
    server = ThreadingHTTPServer((host, port), handler)
    print(f"西部世界 Demo 已启动: http://localhost:{port}")
    print(f"同事内网访问: http://<你的IP>:{port}")
    print(f"LLM: {LLM_MODEL if LLM_API_KEY else '未配置(缺 LLM_API_KEY)'} "
          f"限额 {LIMITS['sessionMax']}次/会话 {LIMITS['perMinute']}次/分")
    print("缓存已禁用，刷新即最新代码。按 Ctrl+C 停止。")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
