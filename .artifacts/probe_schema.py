"""Schema probe: invalid file token must not create a billed task."""
import json, re, urllib.request, urllib.error
TRANSCRIPT = r"C:\Users\liuchang06\.cursor\projects\c-Users-liuchang06-Documents-Codex-2026-10-13-new-chat-3-westworld-wuxia-publish\agent-transcripts\2a628343-bbcb-4beb-90f0-8e1b8cab2a42\2a628343-bbcb-4beb-90f0-8e1b8cab2a42.jsonl"
key = None
with open(TRANSCRIPT, encoding="utf-8", errors="replace") as f:
    for line in f:
        if "ai.leihuo.netease.com" in line and "user_query" in line:
            m = re.search(r"sk-[A-Za-z0-9_\-]+", line)
            if m:
                key = m.group(0)
                break
body = {"model": "tripo-v3.1-20260211", "type": "image_to_model", "model_version": "v3.1-20260211",
        "file": {"type": "png", "file_token": "deadbeef"}}
req = urllib.request.Request("https://ai.leihuo.netease.com/v2/openapi/task", json.dumps(body).encode(),
    {"Authorization": "Bearer " + key, "Content-Type": "application/json"})
try:
    with urllib.request.urlopen(req, timeout=40) as r:
        raw = r.read(800).decode()
        print(r.status, raw)
except urllib.error.HTTPError as e:
    print(e.code, e.read(800).decode())
