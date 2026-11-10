"""Invalid-body probes for the Leihuo Tripo upload and task routes. No real generation."""
import json, re, urllib.request, urllib.error

TRANSCRIPT = r"C:\Users\liuchang06\.cursor\projects\c-Users-liuchang06-Documents-Codex-2026-10-13-new-chat-3-westworld-wuxia-publish\agent-transcripts\2a628343-bbcb-4beb-90f0-8e1b8cab2a42\2a628343-bbcb-4beb-90f0-8e1b8cab2a42.jsonl"
OUT = r"C:\Users\liuchang06\Documents\Codex\2026-10-13\new-chat-3\westworld-wuxia-publish\.artifacts\leihuo-tripo-routes.txt"

key = None
with open(TRANSCRIPT, encoding="utf-8", errors="replace") as f:
    for line in f:
        if "ai.leihuo.netease.com" in line and "user_query" in line:
            m = re.search(r"sk-[A-Za-z0-9_\-]+", line)
            if m:
                key = m.group(0)
                break

def call(method, url, body=None, headers=None):
    data = None if body is None else (body if isinstance(body, bytes) else json.dumps(body).encode())
    h = {"Authorization": "Bearer " + key}
    if headers:
        h.update(headers)
    elif not isinstance(body, bytes):
        h["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, method=method, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            return r.status, r.read(600).decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read(700).decode("utf-8", "replace")
    except Exception as e:
        return 0, type(e).__name__ + ": " + str(e)

base = "https://ai.leihuo.netease.com"
paths = [
    ("GET", base + "/v2/openapi/task/00000000-0000-0000-0000-000000000000", None),
    ("POST", base + "/v2/openapi/upload", b""),
    ("POST", base + "/v2/openapi/task", {"model": "tripo-v3.1-20260211", "type": "text_to_model", "prompt": ""}),
    ("POST", base + "/v1/videos", {"model": "tripo-v3.1-20260211", "prompt": ""}),
]
lines = []
for method, url, body in paths:
    st, raw = call(method, url, body)
    lines.append(f"{method} {url.replace(base,'')} -> {st}")
    lines.append(raw.replace(key, "sk-REDACTED")[:500])
    lines.append("")
open(OUT, "w", encoding="utf-8").write("\n".join(lines))
print("wrote", OUT)
