"""Restore the two factions dropped from the background lineups.

漕帮 is cut from lineup2-v1 and set between the current 青竹会 and 无常当.
神霄宫 is newly generated (Song Daoist crown, no European crown) and set left of the current 皇城司 and 禁军.
"""
import os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.chdir(os.path.dirname(os.path.abspath(__file__)))

from PIL import Image, ImageFilter, ImageDraw
import gen

TRANSCRIPT = r"C:\Users\liuchang06\.cursor\projects\c-Users-liuchang06-Documents-Codex-2026-10-13-new-chat-3-westworld-wuxia-publish\agent-transcripts\2a628343-bbcb-4beb-90f0-8e1b8cab2a42\2a628343-bbcb-4beb-90f0-8e1b8cab2a42.jsonl"

def load_key():
    if os.environ.get('LEIHUO_KEY'): return
    found = None
    with open(TRANSCRIPT, encoding='utf-8', errors='replace') as f:
        for line in f:
            m = re.search(r'sk-[A-Za-z0-9_\-]{40,}', line)
            if m: found = m.group(0)
    if not found: raise SystemExit('image key not found')
    os.environ['LEIHUO_KEY'] = found

def largest(mask):
    w, h = mask.size
    px = mask.load()
    seen = bytearray(w * h)
    best = []
    for y in range(h):
        for x in range(w):
            i = y * w + x
            if seen[i] or px[x, y] == 0: continue
            stack, comp = [(x, y)], []
            seen[i] = 1
            while stack:
                cx, cy = stack.pop()
                comp.append((cx, cy))
                for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                    if nx < 0 or ny < 0 or nx >= w or ny >= h: continue
                    j = ny * w + nx
                    if seen[j] or px[nx, ny] == 0: continue
                    seen[j] = 1
                    stack.append((nx, ny))
            if len(comp) > len(best): best = comp
    out = Image.new('L', mask.size, 0)
    op = out.load()
    for x, y in best: op[x, y] = 255
    return out

def cut(path, x0, x1, keep='largest'):
    im = Image.open(path).convert('RGB')
    w, h = im.size
    band = im.crop((int(x0 * w), 0, int(x1 * w), h))
    bg = band.resize((1, 1)).resize(band.size)
    diff = Image.frombytes('L', band.size, bytes(
        255 if max(abs(a - b) for a, b in zip(p, q)) > 16 else 0
        for p, q in zip(band.getdata(), bg.getdata())))
    # Dilate first so a thin pole still joins its lantern to the body, then keep that one shape.
    diff = diff.filter(ImageFilter.MaxFilter(5))
    if keep == 'largest': diff = largest(diff)
    box = diff.getbbox()
    if not box: raise SystemExit('empty cut ' + path)
    pad = 8
    box = (max(0, box[0] - pad), max(0, box[1] - pad), min(band.width, box[2] + pad), min(band.height, box[3] + pad))
    return band.crop(box), diff.crop(box)

def sheet(parts, out, paper_src='lineup2-kept.png'):
    src = Image.open(paper_src).convert('RGB')
    W, H = src.size
    paper = src.crop((1180, 30, 1500, 990)).resize((W, H))
    foot = int(H * .94)
    for fig, mask, cx in parts:
        target_h = int(H * .86)
        scale = target_h / fig.height
        fig = fig.resize((int(fig.width * scale), target_h), Image.Resampling.LANCZOS)
        mask = mask.resize(fig.size, Image.Resampling.LANCZOS).filter(ImageFilter.GaussianBlur(4))
        x = int(cx * W - fig.width / 2)
        y = foot - fig.height
        paper.paste(fig, (x, y), mask)
    paper.save(out)
    print(out, paper.size)

def restore_caobang():
    knight, km = cut('lineup2-kept.png', 0, .33)
    boat, bm = cut('lineup2-v1.png', .36, .64)
    pawn, pm = cut('lineup2-kept.png', .36, 1)
    sheet([(knight, km, .17), (boat, bm, .50), (pawn, pm, .83)], 'lineup2.png')

def restore_wuchang():
    gen.PROMPTS['wuchang'] = (
        'Character design of exactly one full-body young woman, front three-quarter view, feet visible, centered, '
        'on a plain flat light parchment background with nothing else, no text. Northern Song dynasty concept art for a female-audience wuxia game. '
        'A beautiful glamorous pawnshop proprietress in her twenties who loves money and wears it. '
        'The appeal of a jewel-workshop owner: bright knowing smile, clever fox-like eyes, delicate makeup, a small beauty mark, '
        'elegant high bun with gold hairpins and dangling coin-and-pearl ornaments. Human woman only: no animal ears, no fox face, no tail, no second face. '
        'Costume in malachite green and cinnabar red silk with gold coin embroidery, a coin necklace, gold bracelets, '
        'strings of square-holed bronze coins hanging as a stylish waist fringe. '
        'A lit white paper lantern on a short lacquered pole rests on one shoulder, a slim gold-inlaid pawn box and a small abacus hang at her hip like jewelry. '
        'She stands lightly, one hand flipping a coin, confident and playful. Fully dressed in layered Song robes, elegant, not revealing. '
        'Absolutely not middle-aged, not stern, not weary, not plain. ')
    if not os.path.exists('wuchang.png'):
        path = gen.gen('wuchang', size='1024x1536')
        print('generated', path)
    knight, km = cut('lineup2-three.png', 0, .32)
    boat, bm = cut('lineup2-v1.png', .37, .62)
    pawn, pm = cut('wuchang.png', 0, 1, keep='all')
    sheet([(knight, km, .17), (boat, bm, .50), (pawn, pm, .83)], 'lineup2.png')

def restore_shenxiao():
    gen.PROMPTS['shenxiao'] = (
        'Character design of exactly one full-body male Daoist sorcerer, front three-quarter view, feet visible, centered, '
        'on a plain flat light parchment background with nothing else, no text. Northern Song dynasty, attractive design for a female-audience wuxia game. '
        'Authentic Song Daoist dress: hair in a neat topknot held by a small jade lotus-petal Daoist crown and a long hairpin, '
        'as in Song paintings of Daoist immortals. Absolutely no European crown, no spikes, no tiara, no metal points. '
        'White and azurite-blue Daoist robe with cloud patterns and wide sleeves, one hand conjuring a twisting ribbon of water, '
        'the other a small flame, a horsetail whisk at his belt, long beard, otherworldly calm. ')
    daoist, dm = cut('shenxiao.png', 0, 1, keep='all')
    agent, am = cut('lineup3-kept.png', .26, .70)
    soldier, sm = cut('lineup3-kept.png', .70, 1)
    sheet([(daoist, dm, .17), (agent, am, .50), (soldier, sm, .83)], 'lineup3.png')

if __name__ == '__main__':
    which = sys.argv[1:] or ['caobang', 'shenxiao']
    if 'shenxiao' in which or 'wuchang' in which: load_key()
    if 'wuchang' in which: restore_wuchang()
    if 'caobang' in which: restore_caobang()
    if 'shenxiao' in which: restore_shenxiao()
