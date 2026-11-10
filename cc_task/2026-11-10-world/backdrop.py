"""Paint the distant capital and Mount Genyue for the horizon beyond the Linxi gate.

The game's horizon is src/art/mountain-wash.jpg wrapped on an open cylinder (radius 120, height 95, y centre 9);
u=.5 faces world -z, through the gate. The painting is made over a crop of that sector so it matches the scroll,
then cutout.py isolates the city and the mountain on transparent backgrounds, and `layers` turns them into the two
cut-out strips that ink-landscape.js hangs in front of the scroll. Cylinders mirror their image, so the strips are
saved mirrored.

Usage: python backdrop.py src paint; python cutout.py capital genyue; python backdrop.py layers
(the key comes from env LEIHUO_KEY or fill.load_key)
"""
import base64, io, os, sys, time, requests
from PIL import Image, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
PANORAMA = os.path.join(ROOT, 'src', 'art', 'mountain-wash.jpg')
SRC = os.path.join(HERE, 'horizon-east-src.png')
PAINT = os.path.join(HERE, 'horizon-east-paint.png')
API = 'https://ai.leihuo.netease.com/v1/images/edits'
SECTOR, TOP = 40 / 360, .55
SIZE = (1536, 1024)

PROMPT = (
    'This is a crop of a Song dynasty ink-wash landscape scroll on warm silk. Repaint only the transparent middle area, '
    'continuing the same hazy sepia sky, the same blue-grey ink mountains, brushwork and colour, so the edges join seamlessly. '
    'Add, very far away on the plain at the foot of the mountains (lower third of the image), the faint skyline of the great walled capital Bianjing: '
    'a long low grey city wall with gate towers, countless tiny tiled roofs, and in the centre the imperial palace city rising above them, '
    'tall multi-storey palace halls and pavilion towers with sweeping eaves, a slender pagoda, all pale and dissolving into mist, '
    'drawn with fine light ink lines like Along the River During the Qingming Festival seen from miles away. '
    'On the right side of the image, behind and above the city, rising higher than every other mountain, add the immortal mountain Genyue: '
    'a steep fantastic tower of scholar-rock peaks with pines, carrying a cluster of jade-green and pale-gold palace halls, terraces and a high pavilion on its summit, '
    'wrapped in thick drifting sea of white clouds at its waist and a soft glow of light behind the summit, unreal and otherworldly. '
    'Everything must stay distant, low contrast and atmospheric, mostly ink tones with only a hint of malachite green and pale gold on Genyue; '
    'no figures, no text, no seal, no frame, no foreground objects, no sun.'
)

def make_src():
    pano = Image.open(PANORAMA).convert('RGB')
    w, h = pano.size
    x0, x1 = round((.5 - SECTOR / 2) * w), round((.5 + SECTOR / 2) * w)
    pano.crop((x0, 0, x1, round(TOP * h))).resize(SIZE, Image.LANCZOS).save(SRC)
    return SRC

def paint():
    from fill import load_key
    load_key()
    img = Image.open(SRC).convert('RGBA')
    mask = Image.new('RGBA', img.size, (0, 0, 0, 255))
    mx, my = round(.07 * img.width), round(.06 * img.height)
    mask.paste((0, 0, 0, 0), (mx, my, img.width - mx, img.height - round(.04 * img.height)))
    files = {}
    for key, im in (('image', img), ('mask', mask)):
        buf = io.BytesIO(); im.save(buf, 'PNG'); files[key] = (key + '.png', buf.getvalue(), 'image/png')
    data = {'model': 'gpt-image-2', 'prompt': PROMPT, 'size': f'{img.width}x{img.height}', 'n': '1'}
    for attempt in range(6):
        r = requests.post(API, headers={'Authorization': 'Bearer ' + os.environ['LEIHUO_KEY']}, data=data, files=files, timeout=600)
        if r.status_code != 429: break
        time.sleep(25)
    r.raise_for_status()
    out = r.json()['data'][0]
    raw = base64.b64decode(out['b64_json']) if out.get('b64_json') else requests.get(out['url'], timeout=120).content
    open(PAINT, 'wb').write(raw)
    return PAINT

# Separate cut-outs so the original scroll's ridges and sky stay visible around them:
# (box in the painting handed to cutout.py, output file, fraction of the height that fades into haze at the base).
LAYERS = {
    'capital': ((210, 650, 1370, 870), 'horizon-capital.webp', .3),
    'genyue': ((770, 40, 1520, 640), 'horizon-genyue.webp', .2),
}

def layers():
    """Trim the transparent cut-outs from cutout.py, sink their base into haze, mirror for the cylinder and save."""
    import numpy as np
    out = []
    for name, (_, file, sink) in LAYERS.items():
        im = Image.open(os.path.join(HERE, name + '-cut.png')).convert('RGBA')
        im = im.crop(im.getchannel('A').point(lambda a: 255 if a > 12 else 0).getbbox())
        a = np.asarray(im).astype(np.float32)
        v = np.linspace(0, 1, im.height, dtype=np.float32)[:, None]
        a[..., 3] *= np.clip((1 - v) / sink, 0, 1)
        im = Image.fromarray(a.astype(np.uint8), 'RGBA')
        if im.width > 2048: im = im.resize((2048, round(im.height * 2048 / im.width)), Image.LANCZOS)
        path = os.path.join(ROOT, 'src', 'art', file)
        ImageOps.mirror(im).save(path, quality=90, method=6)
        out.append((path, im.size))
    return out

if __name__ == '__main__':
    for step in sys.argv[1:]:
        try: print('ok', step, {'src': make_src, 'paint': paint, 'layers': layers}[step]())
        except Exception as e: print('fail', step, getattr(getattr(e, 'response', None), 'text', '')[:400] or e); break
