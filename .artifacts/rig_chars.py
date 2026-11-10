"""Rig the already finished image-to-model tasks. Uses the Tripo UUID, not the gateway task id."""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tripo_gateway import OUT, create, download, model_url, poll, request

JOBS = {
    "envoy": "task_r8b4pD2PiW688VPSugdcFu9hkgVO6zGt",
    "sandgang": "task_X7m7L6cz8PVHtN4I26joMLGt59oBK0zK",
    "maskopera": "task_8dV6Yv8GOM3m4CO8gmvVibezQXi001YU",
    "constable": "task_r6xI65arqPELPEBCGj5rsgF80BaCr3bW",
}

def fetch(gateway_id):
    status, response = request("GET", "/v2/openapi/task/" + gateway_id, timeout=60)
    data = response.get("data") or {}
    if status >= 400 or data.get("status") != "success":
        raise RuntimeError(f"{gateway_id} {status} {data.get('status')}")
    return data

def rig_body(uuid):
    return {
        "model": "tripo-v3.1-20260211",
        "type": "animate_rig",
        "original_model_task_id": uuid,
        "out_format": "glb",
        "rig_type": "biped",
        "spec": "mixamo",
    }

def one(name, gateway_id):
    data = fetch(gateway_id)
    uuid = data["task_id"]
    print("source", name, uuid, "credit", data.get("consumed_credit"), flush=True)
    raw = model_url(data)
    if raw:
        download(raw, os.path.join(OUT, name + "-mesh.glb"))
        print("mesh", name, os.path.getsize(os.path.join(OUT, name + "-mesh.glb")), flush=True)
    try:
        rig_id = create(rig_body(uuid))
    except RuntimeError as e:
        print("rig rejected", name, e, flush=True)
        alt = {"model": "tripo-v3.1-20260211", "type": "animate_rig", "original_model_task_id": uuid, "out_format": "glb", "spec": "mixamo"}
        rig_id = create(alt)
    print("rig", name, rig_id, flush=True)
    result = poll(rig_id)
    url = model_url(result)
    if not url:
        open(os.path.join(OUT, name + "-rig.json"), "w", encoding="utf-8").write(json.dumps(result)[:4000])
        raise RuntimeError("no rig url " + name)
    dest = os.path.join(OUT, name + ".glb")
    download(url, dest)
    print("saved", name, os.path.getsize(dest), "bones-task", result.get("task_id"), flush=True)

if __name__ == "__main__":
    names = sys.argv[1:] or list(JOBS)
    errors = []
    from concurrent.futures import ThreadPoolExecutor, as_completed
    with ThreadPoolExecutor(4) as ex:
        futs = {ex.submit(one, n, JOBS[n]): n for n in names}
        for fut in as_completed(futs):
            n = futs[fut]
            try:
                fut.result()
            except Exception as e:
                errors.append(f"{n}: {e}")
                print("fail", n, e, flush=True)
    if errors:
        raise SystemExit("\n".join(errors))
