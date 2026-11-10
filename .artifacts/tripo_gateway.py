"""Submit reference images to Tripo through the Leihuo gateway (v2 task API) and download GLBs.
The key is read from the prior chat and kept in memory only."""
import json, os, re, time, urllib.request, urllib.error, uuid

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REFS = os.path.join(ROOT, "cc_task", "2026-11-10-refs")
OUT = os.path.join(ROOT, "assets-src", "tripo", "gateway")
TRANSCRIPT = r"C:\Users\liuchang06\.cursor\projects\c-Users-liuchang06-Documents-Codex-2026-10-13-new-chat-3-westworld-wuxia-publish\agent-transcripts\2a628343-bbcb-4beb-90f0-8e1b8cab2a42\2a628343-bbcb-4beb-90f0-8e1b8cab2a42.jsonl"
BASE = "https://ai.leihuo.netease.com"
MODEL = "tripo-v3.1-20260211"
VERSION = "v3.1-20260211"

JOBS = {
    "constable": {"file": "constable.png", "faces": 18000, "rig": True},
    "envoy": {"file": "envoy.png", "faces": 18000, "rig": True},
    "sandgang": {"file": "sandgang.png", "faces": 18000, "rig": True},
    "maskopera": {"file": "maskopera.png", "faces": 18000, "rig": True},
    "pass": {"file": "pass.png", "faces": 4000, "rig": False},
    "teapot": {"file": "teapot.png", "faces": 6000, "rig": False},
    "stall": {"file": "stall.png", "faces": 10000, "rig": False},
}

def key():
    with open(TRANSCRIPT, encoding="utf-8", errors="replace") as f:
        for line in f:
            if "ai.leihuo.netease.com" in line and "user_query" in line:
                m = re.search(r"sk-[A-Za-z0-9_\-]+", line)
                if m:
                    return m.group(0)
    raise SystemExit("missing key")

KEY = key()

def request(method, path, body=None, headers=None, timeout=120):
    data = body if isinstance(body, bytes) or body is None else json.dumps(body).encode()
    h = {"Authorization": "Bearer " + KEY}
    if headers:
        h.update(headers)
    elif not isinstance(body, bytes):
        h["Content-Type"] = "application/json"
    req = urllib.request.Request(BASE + path, data=data, method=method, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", "replace")
        try:
            payload = json.loads(raw)
        except Exception:
            payload = {"raw": raw[:800]}
        return e.code, payload

def upload(path):
    boundary = "----tripo" + uuid.uuid4().hex
    filename = os.path.basename(path)
    blob = open(path, "rb").read()
    head = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{filename}\"\r\n"
            f"Content-Type: image/png\r\n\r\n").encode()
    body = head + blob + f"\r\n--{boundary}--\r\n".encode()
    status, payload = request("POST", "/v2/openapi/upload", body, {
        "Content-Type": f"multipart/form-data; boundary={boundary}",
    }, timeout=180)
    if status != 200 or payload.get("code") not in (0, "0", "success"):
        raise RuntimeError(f"upload {filename} {status} {json.dumps(payload)[:400]}")
    data = payload.get("data") or {}
    token = data.get("image_token") if isinstance(data, dict) else None
    if not token:
        raise RuntimeError(f"no image token {json.dumps(payload)[:400]}")
    return token

def create(payload):
    status, response = request("POST", "/v2/openapi/task", payload, timeout=120)
    if status >= 400:
        raise RuntimeError(f"create {status} {json.dumps(response)[:500]}")
    data = response.get("data")
    if isinstance(data, str):
        return data
    if isinstance(data, dict):
        return data.get("task_id") or data.get("taskId") or data.get("id")
    raise RuntimeError(f"no task id {json.dumps(response)[:500]}")

def poll(task_id, timeout=900):
    start = time.time()
    last = None
    while time.time() - start < timeout:
        status, response = request("GET", f"/v2/openapi/task/{task_id}", timeout=60)
        text = json.dumps(response)[:300]
        if text != last:
            print("  poll", task_id[:8], status, text, flush=True)
            last = text
        if status >= 400 and response.get("code") not in ("success", 0):
            if "queued" in text or "running" in text or "progress" in text:
                time.sleep(8)
                continue
            raise RuntimeError(f"poll {status} {text}")
        data = response.get("data", response)
        state = ""
        if isinstance(data, dict):
            state = str(data.get("status") or data.get("task_status") or "").lower()
            inner = data.get("data")
            if isinstance(inner, dict) and not state:
                state = str(inner.get("status") or "").lower()
            if state in ("success", "succeeded"):
                return data
            if state in ("failed", "cancelled", "banned"):
                raise RuntimeError(f"task failed {json.dumps(data)[:600]}")
        time.sleep(8)
    raise RuntimeError("timeout " + task_id)

def model_url(data):
    def walk(o):
        if isinstance(o, dict):
            url = o.get("url")
            if isinstance(url, str) and ".glb" in url.lower():
                return url
            for v in o.values():
                found = walk(v)
                if found:
                    return found
        elif isinstance(o, list):
            for v in o:
                found = walk(v)
                if found:
                    return found
        elif isinstance(o, str) and o.startswith("http") and ".glb" in o.lower():
            return o
        return None
    return walk(data)

def download(url, path):
    urllib.request.urlretrieve(url, path)

def image_task(token, faces):
    return {
        "model": MODEL,
        "type": "image_to_model",
        "model_version": VERSION,
        "file": {"type": "png", "file_token": token},
        "texture": True,
        "pbr": False,
        "texture_quality": "standard",
        "face_limit": faces,
        "auto_size": False,
        "orientation": "align_image",
    }

def rig_task(source_id):
    return {
        "model": MODEL,
        "type": "animate_rig",
        "model_version": VERSION,
        "original_model_task_id": source_id,
        "out_format": "glb",
        "rig_type": "biped",
        "spec": "mixamo",
    }

def one(name):
    job = JOBS[name]
    src = os.path.join(REFS, job["file"])
    print("upload", name, flush=True)
    token = upload(src)
    task_id = create(image_task(token, job["faces"]))
    print("image", name, task_id, flush=True)
    result = poll(task_id)
    final_id = task_id
    if job["rig"]:
        print("rig", name, flush=True)
        final_id = create(rig_task(task_id))
        result = poll(final_id)
    url = model_url(result)
    if not url:
        open(os.path.join(OUT, name + ".json"), "w", encoding="utf-8").write(json.dumps(result, ensure_ascii=False, indent=2))
        raise RuntimeError("no model url for " + name)
    dest = os.path.join(OUT, name + ".glb")
    download(url, dest)
    meta = {"name": name, "image_task": task_id, "final_task": final_id, "bytes": os.path.getsize(dest)}
    open(os.path.join(OUT, name + ".json"), "w", encoding="utf-8").write(json.dumps(meta, ensure_ascii=False, indent=2))
    print("saved", name, meta["bytes"], flush=True)
    return dest

def run(names):
    os.makedirs(OUT, exist_ok=True)
    from concurrent.futures import ThreadPoolExecutor, as_completed
    errors = []
    with ThreadPoolExecutor(4) as ex:
        futs = {ex.submit(one, name): name for name in names}
        for fut in as_completed(futs):
            name = futs[fut]
            try:
                fut.result()
            except Exception as e:
                errors.append(f"{name}: {e}")
                print("fail", name, e, flush=True)
    if errors:
        raise SystemExit("\n".join(errors))

if __name__ == "__main__":
    import sys
    run(sys.argv[1:] or list(JOBS))
