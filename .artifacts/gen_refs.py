"""Clean A-pose character sheets and prop sheets from the faction board, via Leihuo gpt-image-2.
Key stays in the process environment, loaded from the prior chat, never written out."""
import base64, io, json, os, re, time, urllib.request, urllib.error
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HERE = os.path.join(ROOT, "cc_task", "2026-11-10-refs")
BOARD = os.path.join(ROOT, "cc_task", "2026-11-10-world", "faction-board.jpg")
TRANSCRIPT = r"C:\Users\liuchang06\.cursor\projects\c-Users-liuchang06-Documents-Codex-2026-10-13-new-chat-3-westworld-wuxia-publish\agent-transcripts\2a628343-bbcb-4beb-90f0-8e1b8cab2a42\2a628343-bbcb-4beb-90f0-8e1b8cab2a42.jsonl"
API = "https://ai.leihuo.netease.com/v1/images/edits"
GEN = "https://ai.leihuo.netease.com/v1/images/generations"

def key():
    if os.environ.get("LEIHUO_KEY"):
        return os.environ["LEIHUO_KEY"]
    with open(TRANSCRIPT, encoding="utf-8", errors="replace") as f:
        for line in f:
            if "ai.leihuo.netease.com" in line and "user_query" in line:
                m = re.search(r"sk-[A-Za-z0-9_\-]+", line)
                if m:
                    os.environ["LEIHUO_KEY"] = m.group(0)
                    return m.group(0)
    raise SystemExit("missing key")

STYLE = ("Northern Song dynasty costume, painterly concept art on warm aged parchment, "
         "soft even light, full body visible including feet, plain empty parchment background, "
         "no text, no letters, no watermark, no extra people.")

CHARS = {
    "constable": "Redraw this exact woman as exactly one figure, front view only, for a 3D model. "
                 "Do not draw a side view, a back view, or a turnaround sheet. "
                 "Northern Song woman constable in a fitted black official robe with subtle cloud pattern, black boots, "
                 "black hat with one red tassel, a round bronze waist token with a red tassel and a short iron ruler hanging at the belt. "
                 "Relaxed A-pose, arms slightly away from the body, empty hands, no sword. One person only.",
    "envoy": "Redraw this exact young man as one clean character source for a 3D model: "
             "the same pale yellow wide-sleeved Northern Song court robe, tall black futou hat, long dark hair, "
             "slender elegant face. Front view, relaxed A-pose, empty hands. "
             "No fan, no birdcage, no bird. A small yellow scroll case may hang at the belt. One person only.",
    "sandgang": "Redraw this exact man as one clean character source for a 3D model: "
                "the same muscular Northern Song gang man, rust-red headscarf, open brown-red vest, sand-colored abstract tattoos "
                "on chest and arm with no readable writing, dark blue trousers, rope coils worn over the shoulder as clothing. "
                "Front view, relaxed A-pose, empty hands. No hook, no weapon. One person only.",
    "maskopera": "Redraw this exact woman as one clean character source for a 3D model: "
                 "the same Northern Song performer, elaborate hairpins, a blank white mask covering only the left half of her face, "
                 "layered dark ink-blue and grey gauze robes with wide sleeves. Front view, relaxed A-pose, empty hands. "
                 "Do not put a second mask in her hand. One person only.",
}

PROPS = {
    "pass": "One empty Northern Song travel permit, a single slightly curled sheet of aged yellow paper, seen from the front. "
            "One square vermilion seal near the top, and a few faint vertical ink strokes that are not real characters, not a drawing, and not a person. "
            "No human figure, no portrait, no face, no mask, no other objects. Plain warm parchment background. " + STYLE,
    "teapot": "One Northern Song ceramic teapot only, celadon green crackle glaze, round body, short curved spout, "
              "an overhead loop handle, a fitted lid with a small knob. Three-quarter view, entire object visible, "
              "plain warm parchment background, no cups, no text. " + STYLE,
    "stall": "One small Northern Song street food stall, no people: a low wooden table, four wooden posts, "
             "a faded reddish-brown cloth canopy, two baskets and a stack of bowls on the table. "
             "Three-quarter view, the whole stall including the feet of the posts visible, plain warm parchment background, "
             "no signs, no text, no lanterns with writing. " + STYLE,
}

def save_b64(name, data):
    raw = base64.b64decode(data["b64_json"]) if data.get("b64_json") else urllib.request.urlopen(data["url"], timeout=120).read()
    path = os.path.join(HERE, name + ".png")
    open(path, "wb").write(raw)
    return path

def post(url, data=None, files=None):
    import requests
    for attempt in range(6):
        if files:
            r = requests.post(url, headers={"Authorization": "Bearer " + key()}, data=data, files=files, timeout=600)
        else:
            r = requests.post(url, headers={"Authorization": "Bearer " + key(), "Content-Type": "application/json"},
                              data=json.dumps(data).encode(), timeout=600)
        if r.status_code != 429:
            break
        time.sleep(25)
    if r.status_code >= 400:
        raise SystemExit(f"{r.status_code} {r.text[:500]}")
    return r.json()["data"][0]

def crops():
    im = Image.open(BOARD).convert("RGB")
    w, h = im.size
    boxes = {
        "constable": (20, 30, 310, 800),
        "envoy": (300, 20, 600, 800),
        "sandgang": (560, 20, 900, 800),
        "maskopera": (860, 10, 1190, 820),
    }
    os.makedirs(HERE, exist_ok=True)
    paths = {}
    for name, box in boxes.items():
        crop = im.crop(box)
        canvas = Image.new("RGB", (1024, 1536), (232, 220, 196))
        scale = min(900 / crop.width, 1300 / crop.height)
        resized = crop.resize((int(crop.width * scale), int(crop.height * scale)), Image.Resampling.LANCZOS)
        canvas.paste(resized, ((1024 - resized.width) // 2, (1536 - resized.height) // 2))
        path = os.path.join(HERE, name + "-src.png")
        canvas.save(path)
        paths[name] = path
    return paths

def edit_char(name, src):
    img = Image.open(src).convert("RGBA")
    mask = Image.new("RGBA", img.size, (0, 0, 0, 0))
    files = {}
    for field, im in (("image", img), ("mask", mask)):
        buf = io.BytesIO()
        im.save(buf, "PNG")
        files[field] = (field + ".png", buf.getvalue(), "image/png")
    data = {"model": "gpt-image-2", "prompt": CHARS[name] + " " + STYLE, "size": "1024x1536", "n": "1"}
    return save_b64(name, post(API, data, files))

def gen_prop(name):
    return save_b64(name, post(GEN, {"model": "gpt-image-2", "prompt": PROPS[name], "size": "1024x1024", "n": 1}))

if __name__ == "__main__":
    import sys
    os.makedirs(HERE, exist_ok=True)
    which = sys.argv[1:]
    srcs = crops()
    jobs = which or list(CHARS) + list(PROPS)
    from concurrent.futures import ThreadPoolExecutor, as_completed
    futs = {}
    with ThreadPoolExecutor(3) as ex:
        for name in jobs:
            if name in CHARS:
                futs[ex.submit(edit_char, name, srcs[name])] = name
            elif name in PROPS:
                futs[ex.submit(gen_prop, name)] = name
        for f in as_completed(futs):
            name = futs[f]
            try:
                print("ok", name, f.result(), flush=True)
            except Exception as e:
                print("fail", name, e, flush=True)
