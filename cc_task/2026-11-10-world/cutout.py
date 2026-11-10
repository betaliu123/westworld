"""Ask the edit API to isolate one element of the horizon painting on a transparent background.
Usage: python cutout.py capital|genyue   (writes <name>-cut.png next to this script; key from env or fill.load_key)"""
import base64, io, os, sys, time, requests
from PIL import Image
from fill import load_key
from backdrop import PAINT, SIZE, LAYERS

API = 'https://ai.leihuo.netease.com/v1/images/edits'
HERE = os.path.dirname(os.path.abspath(__file__))
ASK = {
    'capital': 'Keep only the distant walled capital city (wall, gate towers, roofs, palace halls, pagoda) exactly as painted. '
               'Remove the sky, paper texture, mist background and the mountains completely: make them fully transparent. '
               'Soft misty edges may fade to transparent. Do not add anything.',
    'genyue': 'Keep only the immortal mountain Genyue (the rock peaks, pines, palaces) and the white clouds wrapping it, exactly as painted. '
              'Remove the sky, paper texture and haze completely: make them fully transparent. Cloud edges may fade softly. Do not add anything.',
}

def cut(name):
    load_key()
    box = LAYERS[name][0]
    crop = Image.open(PAINT).convert('RGB').resize(SIZE, Image.LANCZOS).crop(box)
    w, h = crop.size
    side = 1536 if w >= h else 1024
    canvas = Image.new('RGB', (1536, 1024) if w >= h else (1024, 1536), crop.getpixel((2, 2)))
    scale = min(canvas.width / w, canvas.height / h)
    crop = crop.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
    canvas.paste(crop, ((canvas.width - crop.width) // 2, (canvas.height - crop.height) // 2))
    buf = io.BytesIO(); canvas.save(buf, 'PNG')
    data = {'model': 'gpt-image-2', 'prompt': ASK[name], 'size': f'{canvas.width}x{canvas.height}', 'n': '1',
            'background': 'transparent', 'output_format': 'png'}
    for attempt in range(6):
        r = requests.post(API, headers={'Authorization': 'Bearer ' + os.environ['LEIHUO_KEY']}, data=data,
                          files={'image': ('image.png', buf.getvalue(), 'image/png')}, timeout=600)
        if r.status_code != 429: break
        time.sleep(25)
    if r.status_code >= 400: raise SystemExit(r.text[:400])
    out = r.json()['data'][0]
    raw = base64.b64decode(out['b64_json']) if out.get('b64_json') else requests.get(out['url'], timeout=120).content
    path = os.path.join(HERE, name + '-cut.png')
    open(path, 'wb').write(raw)
    im = Image.open(path)
    print(name, im.mode, im.size, 'alpha range', im.getextrema()[-1] if im.mode == 'RGBA' else '-')

if __name__ == '__main__':
    for n in sys.argv[1:]: cut(n)
