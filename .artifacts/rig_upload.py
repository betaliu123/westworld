"""See whether the gateway upload accepts a GLB and whether rig can take that file token."""
import json, os, sys, uuid
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tripo_gateway import KEY, request

path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets-src", "tripo", "gateway", "envoy-mesh.glb")
boundary = "----tripo" + uuid.uuid4().hex
blob = open(path, "rb").read()
head = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"envoy.glb\"\r\n"
        f"Content-Type: model/gltf-binary\r\n\r\n").encode()
body = head + blob + f"\r\n--{boundary}--\r\n".encode()
status, payload = request("POST", "/v2/openapi/upload", body, {"Content-Type": f"multipart/form-data; boundary={boundary}"}, timeout=180)
print("upload", status, json.dumps(payload)[:400])
token = (payload.get("data") or {}).get("image_token") if isinstance(payload.get("data"), dict) else None
if not token:
    raise SystemExit(0)
trial = {
    "model": "tripo-v3.1-20260211",
    "type": "animate_rig",
    "file": {"type": "glb", "file_token": token},
    "out_format": "glb",
    "spec": "mixamo",
}
status, payload = request("POST", "/v2/openapi/task", trial, timeout=60)
print("rig", status, json.dumps(payload)[:500])
