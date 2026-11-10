"""One rig attempt against the gateway task id, printing the error body."""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tripo_gateway import request

body = {
    "model": "tripo-v3.1-20260211",
    "type": "animate_rig",
    "original_model_task_id": "task_r8b4pD2PiW688VPSugdcFu9hkgVO6zGt",
    "out_format": "glb",
    "spec": "mixamo",
    "topology": "biped",
}
status, payload = request("POST", "/v2/openapi/task", body, timeout=60)
print(status)
print(json.dumps(payload, ensure_ascii=False)[:800])
