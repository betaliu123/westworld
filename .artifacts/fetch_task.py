"""Fetch one gateway task and write a redacted structure summary."""
import json, re, urllib.request
TRANSCRIPT = r"C:\Users\liuchang06\.cursor\projects\c-Users-liuchang06-Documents-Codex-2026-10-13-new-chat-3-westworld-wuxia-publish\agent-transcripts\2a628343-bbcb-4beb-90f0-8e1b8cab2a42\2a628343-bbcb-4beb-90f0-8e1b8cab2a42.jsonl"
key = None
with open(TRANSCRIPT, encoding="utf-8", errors="replace") as f:
    for line in f:
        if "ai.leihuo.netease.com" in line and "user_query" in line:
            m = re.search(r"sk-[A-Za-z0-9_\-]+", line)
            if m:
                key = m.group(0)
                break
task = "task_r8b4pD2PiW688VPSugdcFu9hkgVO6zGt"
req = urllib.request.Request("https://ai.leihuo.netease.com/v2/openapi/task/" + task, headers={"Authorization": "Bearer " + key})
with urllib.request.urlopen(req, timeout=60) as r:
    data = json.loads(r.read().decode())
out = r"C:\Users\liuchang06\Documents\Codex\2026-10-13\new-chat-3\westworld-wuxia-publish\.artifacts\task-sample.json"

def scrub(o):
    if isinstance(o, dict):
        return {k: ("<url>" if isinstance(v, str) and v.startswith("http") else scrub(v)) for k, v in o.items()}
    if isinstance(o, list):
        return [scrub(v) for v in o[:8]]
    if isinstance(o, str) and len(o) > 180:
        return o[:80] + "..."
    return o

open(out, "w", encoding="utf-8").write(json.dumps(scrub(data), ensure_ascii=False, indent=2)[:12000])
print("status", data.get("data", {}).get("status"), "progress", data.get("data", {}).get("progress"))
print("keys", list((data.get("data") or {}).keys()))
