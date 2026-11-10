import pathlib, re, sys
b = pathlib.Path(sys.argv[1]).read_bytes()
text = b.decode("utf-8", "ignore")
names = sorted(set(re.findall(r"mixamo[A-Za-z0-9:_]{0,40}", text)))
print("mixamo", len(names))
print("\n".join(names[:30]))
nodes = sorted(set(re.findall(r'"name":"([^"]{1,48})"', text)))
print("nodes", len(nodes))
print("\n".join(nodes[:80]))
