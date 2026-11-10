import json, re, sys

p = sys.argv[1]

def redact(s):
    s = re.sub(r"sk-[A-Za-z0-9_\-]{8,}", "sk-REDACTED", s)
    s = re.sub(r"(Bearer\s+)\S+", r"\1REDACTED", s)
    return s

def texts(o, acc):
    if isinstance(o, dict):
        role = o.get("role")
        if "text" in o and isinstance(o["text"], str):
            acc.append((role, o["text"]))
        for v in o.values():
            texts(v, acc)
    elif isinstance(o, list):
        for v in o:
            texts(v, acc)

with open(p, "r", encoding="utf-8", errors="replace") as f:
    for i, line in enumerate(f):
        low = line.lower()
        if not any(k in low for k in ["leihuo", "tripo-v3", "网关", "路引", "茶壶"]):
            continue
        try:
            o = json.loads(line)
        except Exception:
            print("---", i, "bad json")
            continue
        acc = []
        texts(o, acc)
        print("==== line", i, "keys", list(o.keys())[:8], "snippets", len(acc))
        shown = 0
        for role, text in acc:
            if not any(k.lower() in text.lower() for k in ["leihuo", "tripo", "网关", "路引", "茶壶", "摊子"]):
                continue
            t = redact(text).replace("\n", " | ")
            print(f"[{role}] {t[:900]}")
            shown += 1
            if shown >= 3:
                break
