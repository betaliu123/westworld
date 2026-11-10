"""Repaint one column of a lineup via the Leihuo images/edits API. Key comes from env LEIHUO_KEY only.
Usage: python edit.py <name> [<name> ...]   (names are keys of EDITS; the source png is overwritten, the original kept as *-prev.png)"""
import base64, io, os, shutil, sys, time, requests
from PIL import Image
from gen import STYLE

API = 'https://ai.leihuo.netease.com/v1/images/edits'
HERE = os.path.dirname(os.path.abspath(__file__))
KEEP = ' Keep the parchment background, the scale, the feet line and the other characters exactly unchanged.'
EDITS = {
    'wuchang': ('lineup2', (.64, 1.0),
        'Repaint only the right character as: a beautiful glamorous young woman, proprietress of the Wuchang Pawnshop, who loves money and wears it. '
        'Bright knowing smile, clever eyes, gold hairpins with dangling coin-and-pearl ornaments, malachite-green and cinnabar-red silk, '
        'a coin necklace and a waist fringe of bronze cash. A lit white paper lantern on a short lacquered pole over one shoulder, '
        'a slim gold-inlaid pawn box and a small abacus at her hip, one hand flipping a coin. Fully dressed Song robes, light and playful. '
        'Human only: no animal ears, no fox face, no tail. Not middle-aged, not stern, not weary.'),
    'shenxiao': ('lineup3', (0, .35),
        'Repaint only the left character as: a male Daoist sorcerer of the Shenxiao Palace in authentic Northern Song Daoist dress: '
        'hair in a neat topknot held by a small jade lotus-petal Daoist crown and a long hairpin, like Song paintings of Daoist immortals. '
        'Absolutely no European crown, no spikes, no tall tiara. '
        'White and azurite-blue Daoist robe with cloud patterns and wide sleeves, one hand conjuring a twisting ribbon of water, the other a small flame, '
        'a horsetail whisk at his belt, long beard, otherworldly calm.'),
    'huangcheng': ('lineup3', (.34, .66),
        'Repaint only the middle character as: a strikingly handsome, heroic young male secret agent of the Imperial City Office, charismatic like a lead male role: '
        'tall, broad-shouldered, athletic, upright and alert, sharp brows and intense eyes, '
        'black soft futou cloth headwrap with a sleek ponytail, a dark fitted narrow-sleeved robe with leather wrist guards and a wide belt, '
        'a dark cloak thrown back over one shoulder, one hand resting on a short saber half hidden under the cloak, a bronze fish-shaped tally at his belt. '
        'Still plain, no insignia, so he could pass in a crowd, but obviously dangerous.'),
}

def edit(name):
    src, (x0, x1), prompt = EDITS[name]
    path = os.path.join(HERE, src + '.png')
    img = Image.open(path).convert('RGBA')
    mask = Image.new('RGBA', img.size, (0, 0, 0, 255))
    mask.paste((0, 0, 0, 0), (int(x0 * img.width), 0, int(x1 * img.width), img.height))
    files = {}
    for key, im in (('image', img), ('mask', mask)):
        buf = io.BytesIO(); im.save(buf, 'PNG'); files[key] = (key + '.png', buf.getvalue(), 'image/png')
    data = {'model': 'gpt-image-2', 'prompt': prompt + KEEP + ' ' + STYLE, 'size': f'{img.width}x{img.height}', 'n': '1'}
    for attempt in range(6):
        r = requests.post(API, headers={'Authorization': 'Bearer ' + os.environ['LEIHUO_KEY']}, data=data, files=files, timeout=600)
        if r.status_code != 429: break
        time.sleep(25)
    r.raise_for_status()
    out = r.json()['data'][0]
    raw = base64.b64decode(out['b64_json']) if out.get('b64_json') else requests.get(out['url'], timeout=120).content
    prev = os.path.join(HERE, src + '-prev.png')
    if not os.path.exists(prev): shutil.copy(path, prev)
    open(path, 'wb').write(raw)
    return path

if __name__ == '__main__':
    for n in sys.argv[1:]:
        try: print('ok', n, edit(n))
        except Exception as e: print('fail', n, getattr(getattr(e, 'response', None), 'text', '')[:400] or e)
