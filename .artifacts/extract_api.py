import json, re, sys
p = sys.argv[1]
start = int(sys.argv[2]) if len(sys.argv) > 2 else 0
end = int(sys.argv[3]) if len(sys.argv) > 3 else 10**9

def redact(s):
    s = re.sub(r"sk-[A-Za-z0-9_\-]{6,}", "sk-REDACTED", s)
    s = re.sub(r"tsk_[A-Za-z0-9_\-]{6,}", "tsk_REDACTED", s)
    return s

def walk(o, acc):
    if isinstance(o, dict):
        if isinstance(o.get("text"), str):
            acc.append(o["text"])
        if o.get("type") == "tool_use" or "name" in o and "input" in o:
            acc.append("TOOL " + str(o.get("name")) + " " + json.dumps(o.get("input"), ensure_ascii=False)[:2000])
        for v in o.values():
            walk(v, acc)
    elif isinstance(o, list):
        for v in o:
            walk(v, acc)

with open(p, encoding="utf-8", errors="replace") as f:
    for i, line in enumerate(f):
        if i < start or i > end:
            continue
        if not any(k in line.lower() for k in ["leihuo", "tripo", "models", "images/"]):
            continue
        o = json.loads(line)
        acc = []
        walk(o, acc)
        role = (o.get("message") or {}).get("role") or o.get("role")
        print(f"\n===== {i} {role} =====")
        for t in acc:
            if not any(k.lower() in t.lower() for k in ["leihuo", "tripo", "model", "http", "curl", "python"]):
                continue
            print(redact(t)[:1800])
            print("---")
