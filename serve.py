#!/usr/bin/env python3
# serve.py — 西部世界 Demo 本地开发服务器
# 与 python -m http.server 的区别：对所有响应发 no-store 缓存头，
# 保证浏览器每次刷新都加载最新代码（避免改了 JS 却跑旧缓存的"灵异卡死"）。
#
# 用法：
#   python serve.py [端口]      # 默认 8080
# 然后浏览器打开 http://localhost:8080

import sys
import functools
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):  # 日志精简：只报错误
        if args and isinstance(args[1], str) and args[1].startswith(("4", "5")):
            super().log_message(fmt, *args)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    handler = functools.partial(NoCacheHandler, directory=".")
    server = ThreadingHTTPServer(("127.0.0.1", port), handler)
    print(f"西部世界 Demo 已启动: http://localhost:{port}")
    print("缓存已禁用，刷新即最新代码。按 Ctrl+C 停止。")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
