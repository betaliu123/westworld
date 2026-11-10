"""Compose the locked four-faction designs into one board.
Sources are the approved full-body paintings, not a new generation."""
import os
from collections import deque
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
REFS = os.path.join(HERE, '..', '2026-11-10-refs')
FONTS = os.path.join(HERE, '..', '..', 'assets-src', 'fonts')
font = lambda f, s: ImageFont.truetype(os.path.join(FONTS, f), s)
TITLE, BODY, SEAL = 'ZhiMangXing-Regular.ttf', 'LXGWWenKai-Regular.ttf', 'MaShanZheng-Regular.ttf'
PAPER, INK, CINNABAR, OCHRE, MUTED = '#ece3cf', '#15140f', '#a63a2b', '#9c6d3c', '#7b766a'
NAMES = ['constable', 'envoy', 'sandgang', 'maskopera']
FACTIONS = [
    ('六扇门', '捕', CINNABAR, False, '皂衣红缨 · 腰牌铁尺'),
    ('应奉局', '奉', OCHRE, False, '黄袍黄封 · 花鸟使'),
    ('赤砂帮', '砂', '#8a3b22', False, '赭红头巾 · 砂纹刺青'),
    ('无相门', '', INK, True, '半面伶人 · 空白面具'),
]


def paper_mask(im, tol=34, step=18):
    """Walk the paper from the border. A figure edge is a color jump, so the fill stops there."""
    im = im.convert('RGB')
    w, h = im.size
    px = im.load()
    samples = [px[x, y] for x in range(0, w, 6) for y in (0, 2, h - 1)]
    samples += [px[x, y] for y in range(0, h, 6) for x in (0, 2, w - 1)]
    paper = tuple(sorted(channel)[len(channel) // 2] for channel in zip(*samples))

    def near_paper(rgb):
        return all(abs(rgb[i] - paper[i]) <= tol for i in range(3))

    def small_step(a, b):
        return all(abs(a[i] - b[i]) <= step for i in range(3))

    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if near_paper(px[x, y]):
                seen[y * w + x] = 1
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            i = y * w + x
            if not seen[i] and near_paper(px[x, y]):
                seen[i] = 1
                q.append((x, y))
    while q:
        x, y = q.popleft()
        here = px[x, y]
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if nx < 0 or ny < 0 or nx >= w or ny >= h:
                continue
            i = ny * w + nx
            if seen[i]:
                continue
            there = px[nx, ny]
            if small_step(here, there) and near_paper(there):
                seen[i] = 1
                q.append((nx, ny))
    mask = Image.new('L', (w, h), 0)
    mask.putdata([255 if v else 0 for v in seen])
    # Close pinholes in the paper without crossing into the figure.
    return mask.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.8))


def cut(name):
    im = Image.open(os.path.join(REFS, name + '.png')).convert('RGBA')
    im.putalpha(ImageChops.invert(paper_mask(im)))
    bbox = im.getchannel('A').point(lambda v: 255 if v > 18 else 0).getbbox()
    return im.crop(bbox)


def figure_ink(im):
    bg = Image.new('RGB', im.size, im.resize((1, 1), Image.Resampling.BOX).getpixel((0, 0)))
    diff = ImageChops.difference(im.convert('RGB'), bg).convert('L')
    diff = diff.point(lambda v: 255 if v > 40 else 0)
    w, h = diff.size
    m = int(min(w, h) * 0.045)
    cleared = ImageDraw.Draw(diff)
    cleared.rectangle([0, 0, w, m], fill=0)
    cleared.rectangle([0, h - m, w, h], fill=0)
    cleared.rectangle([0, 0, m, h], fill=0)
    cleared.rectangle([w - m, 0, w, h], fill=0)
    return diff.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))


def lineup():
    raws = [Image.open(os.path.join(REFS, name + '.png')).convert('RGB') for name in NAMES]
    gap, pad_y = 0, 0
    height = 1180
    fitted = []
    inks = []
    for fig in raws:
        scale = height / fig.height
        size = (round(fig.width * scale), height)
        fitted.append(fig.resize(size, Image.Resampling.LANCZOS))
        inks.append(figure_ink(fig).resize(size, Image.Resampling.NEAREST))
    width = sum(f.width for f in fitted) + gap * (len(fitted) - 1)
    shown = Image.new('RGB', (width, height), (214, 186, 136))
    ink = Image.new('L', shown.size, 0)
    x = 0
    centers = []
    for fig, mark in zip(fitted, inks):
        shown.paste(fig, (x, pad_y))
        ink.paste(mark, (x, pad_y))
        centers.append((x + fig.width / 2) / width)
        x += fig.width + gap
    return shown, ink, centers


def silhouette(img):
    alpha = img.getchannel('A') if img.mode == 'RGBA' else None
    if alpha:
        out = Image.new('RGB', img.size, PAPER)
        out.paste(Image.new('RGB', img.size, INK), mask=alpha.point(lambda v: 255 if v > 24 else 0))
        return out
    bg = Image.new('RGB', img.size, img.crop((0, 0, 40, 40)).resize((1, 1)).getpixel((0, 0)))
    diff = ImageChops.difference(img.convert('RGB'), bg).convert('L').point(lambda v: 255 if v > 38 else 0)
    out = Image.new('RGB', img.size, PAPER)
    out.paste(Image.new('RGB', img.size, INK), mask=diff)
    return out


def build():
    row_rgb, ink, centers = lineup()
    W, H = row_rgb.size
    band = H
    tokens = Image.open(os.path.join(HERE, 'tokens.png')).convert('RGB')
    t = tokens.crop((0, int(tokens.height * .08), tokens.width, int(tokens.height * .90)))
    t = t.resize((W, int(t.height * W / t.width)), Image.Resampling.LANCZOS)
    if t.height > 720:
        top = (t.height - 720) // 2
        t = t.crop((0, top, W, top + 720))
    board = Image.new('RGB', (W, H + 300 + band + 36 + t.height), PAPER)
    d = ImageDraw.Draw(board)
    board.paste(row_rgb, (0, 0))
    y = H + 18
    for (name, ch, color, hollow, note), cx in zip(FACTIONS, centers):
        x = int(cx * W)
        s = 108
        box = [x - s // 2, y, x + s // 2, y + s]
        if hollow:
            d.rectangle(box, outline=color, width=7)
        else:
            d.rectangle(box, fill=color)
            d.text((x, y + s / 2 + 2), ch, font=font(SEAL, 78), fill=PAPER, anchor='mm')
        d.text((x, y + s + 52), name, font=font(TITLE, 52), fill=INK, anchor='mm')
        d.text((x, y + s + 108), note, font=font(BODY, 28), fill=MUTED, anchor='mm')
    y = H + 300
    grey = ImageOps.grayscale(row_rgb).convert('RGB').resize((W, band), Image.Resampling.LANCZOS)
    board.paste(grey, (0, y))
    y += band + 36
    board.paste(t, (0, y))
    d.text((22, y + 16), '信物', font=font(TITLE, 44), fill=INK)
    png = os.path.join(HERE, 'faction-board-final.png')
    jpg = os.path.join(HERE, 'faction-board-final.jpg')
    board.save(png)
    board.resize((1400, int(1400 * board.height / W)), Image.Resampling.LANCZOS).save(jpg, quality=90)
    row_rgb.save(os.path.join(HERE, 'lineup-final.png'))
    print(png, board.size, 'centers', [round(c, 3) for c in centers])


if __name__ == '__main__':
    build()
