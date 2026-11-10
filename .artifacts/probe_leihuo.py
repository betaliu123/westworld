"""Probe the Leihuo gateway. Key is read from the prior chat transcript and never printed."""
import json, re, urllib.request, urllib.error

TRANSCRIPT = r"C:\Users\liuchang06\.cursor\projects\c-Users-liuchang06-Documents-Codex-2026-10-13-new-chat-3-westworld-wuxia-publish\agent-transcripts\2a628343-bbcb-4beb-90f0-8e1b8cab2a42\2a628343-bbcb-4beb-90f0-8e1b8cab2a42.jsonl"
OUT = r"C:\Users\liuchang06\Documents\Codex\2026-10-13\new-chat-3\westworld-wuxia-publish\.artifacts\leihuo-models.txt"

key = None
with open(TRANSCRIPT, encoding="utf-8", errors="replace") as f:
    for line in f:
        if "ai.leihuo.netease.com" in line and "user_query" in line:
            m = re.search(r"sk-[A-Za-z0-9_\-]+", line)
            if m:
                key = m.group(0)
                break
if not key:
    raise SystemExit("key not found")

def call(method, url, body=None, timeout=40, limit=200000):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, method=method, headers={
        "Authorization": "Bearer " + key,
        "Content-Type": "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read(limit)
            return r.status, raw.decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read(1500).decode("utf-8", "replace")
    except Exception as e:
        return 0, type(e).__name__ + ": " + str(e)

lines = []
status, body = call("GET", "https://ai.leihuo.netease.com/v1/models")
lines.append(f"GET /v1/models {status} bytes {len(body)}")
ids = []
try:
    data = json.loads(body)
    ids = [d.get("id", "") for d in data.get("data", [])]
except Exception as e:
    lines.append("parse fail " + type(e).__name__)
    lines.append(body[:400])
interesting = [i for i in ids if re.search(r"tripo|image|3d|dall|flux|kling|hunyuan|gpt-image|jimeng|rodin", i, re.I)]
lines.append("interesting:")
lines.extend("  " + i for i in interesting)
lines.append(f"total models {len(ids)}")

# Invalid bodies only. Do not send a real prompt.
probes = [
    ("GET", "https://ai.leihuo.netease.com/v3/account/balance", None),
    ("POST", "https://ai.leihuo.netease.com/v3/generation/text-to-model", {}),
    ("GET", "https://ai.leihuo.netease.com/v2/openapi/user/balance", None),
    ("POST", "https://ai.leihuo.netease.com/v1/task/submit", {"model": "tripo-v3.1-20260211"}),
]
for method, url, payload in probes:
    st, raw = call(method, url, payload)
    lines.append(f"\n{method} {url} -> {st}")
    lines.append(raw[:700].replace(key, "sk-REDACTED"))

open(OUT, "w", encoding="utf-8").write("\n".join(lines))
print("wrote", OUT, "models", len(ids), "interesting", len(interesting))
