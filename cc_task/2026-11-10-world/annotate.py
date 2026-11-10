"""Label the painted Bianjing base map with project fonts. Coordinates are authored on a 1024-wide view and scaled."""
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HERE, '..', '..', 'assets-src', 'fonts')
im = Image.open(os.path.join(HERE, 'map.png')).convert('RGB')
k = im.width / 1024
d = ImageDraw.Draw(im)
title = lambda s: ImageFont.truetype(os.path.join(FONTS, 'ZhiMangXing-Regular.ttf'), int(s * k))
body = lambda s: ImageFont.truetype(os.path.join(FONTS, 'LXGWWenKai-Regular.ttf'), int(s * k))
P = lambda x, y: (x * k, y * k)

INK, PAPER, CINNABAR, AZURITE, GOLD = '#15140f', '#ece3cf', '#a63a2b', '#2f5866', '#8a6a2c'

def label(x, y, text, size=22, color=INK, font=title, halo=PAPER, sub=None):
    f = font(size)
    d.text(P(x, y), text, font=f, fill=color, anchor='mm', stroke_width=int(4 * k), stroke_fill=halo)
    if sub:
        d.text(P(x, y + size * .9), sub, font=body(14), fill=color, anchor='mt', stroke_width=int(3 * k), stroke_fill=halo)

def dashed(points, color, width=3, dash=10, gap=7):
    pts = [P(*p) for p in points]
    for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
        length = ((x2 - x1) ** 2 + (y2 - y1) ** 2) ** .5
        n = int(length // ((dash + gap) * k)) + 1
        for i in range(n):
            a, b = i * (dash + gap) * k / length, min(1, (i * (dash + gap) + dash) * k / length)
            if a >= 1: break
            d.line([(x1 + (x2 - x1) * a, y1 + (y2 - y1) * a), (x1 + (x2 - x1) * b, y1 + (y2 - y1) * b)], fill=color, width=int(width * k))

# Routes: the entry road (solid cinnabar dashes), underground culverts (ink), the rumoured imperial tunnel (thin cinnabar).
dashed([(70, 370), (130, 395), (215, 400), (245, 390)], CINNABAR, 4)
dashed([(580, 438), (640, 395), (690, 330), (700, 300)], INK, 3, 6, 6)
dashed([(580, 438), (610, 395)], INK, 3, 6, 6)
dashed([(560, 300), (590, 340), (610, 380)], CINNABAR, 2, 4, 5)

# Newbie zone: cinnabar ring and seal.
r = 46
d.ellipse([P(55 - r, 360 - r), P(55 + r, 360 + r)], outline=CINNABAR, width=int(4 * k))
sx, sy, s = 18, 262, 46
d.rectangle([P(sx, sy), P(sx + s, sy + s)], fill=CINNABAR)
d.text(P(sx + s / 2, sy + s / 2), '起', font=title(34), fill=PAPER, anchor='mm')
label(62, 425, '临溪关', 24, CINNABAR, font=body, sub='新手区 · 出生与教学')

# Human realm.
label(130, 520, '西郊', 24, INK, sub='银杏 · 芦荡')
label(222, 360, '西水门', 17, font=body)
label(535, 160, '宫城', 28, GOLD)
label(530, 462, '州桥', 22)
label(530, 612, '南薰门', 17, font=body)
label(445, 345, '开封府 · 六扇门', 17, font=body)
label(640, 366, '甜水巷', 19, '#9c6d3c', font=body, sub='李师师')
label(700, 322, '樊楼', 24)
label(975, 360, '虹桥', 24, sub='汴河漕运')
label(330, 455, '汴河', 24, AZURITE)

# Ghost realm (underground and night): ink blot marks plus cinnabar names.
def ghost(x, y, text, sub=None):
    d.ellipse([P(x - 34, y - 5), P(x - 24, y + 5)], fill=INK)
    label(x + 8, y, text, 18, CINNABAR, font=body, sub=sub)
ghost(612, 474, '鬼市子', sub='五更开市')
ghost(790, 474, '鬼樊楼', sub='地下暗渠')

# Immortal realm.
label(750, 28, '艮岳', 34, AZURITE, sub='仙界 · 道君的仙山')

# Legend.
lx, ly = 760, 560
d.rectangle([P(lx, ly), P(lx + 250, ly + 112)], fill='#ece3cfe0' if False else PAPER, outline='#4f4b42', width=int(1 * k))
d.text(P(lx + 12, ly + 10), '三界图例', font=title(22), fill=INK)
rows = [(AZURITE, '仙界 · 艮岳'), (INK, '人界 · 城郭街坊'), (CINNABAR, '鬼界 · 鬼市与地下'), (CINNABAR, '粗红 入城 · 细红 暗道 · 墨 暗渠')]
for i, (c, t) in enumerate(rows):
    y = ly + 40 + i * 17
    if i < 3: d.rectangle([P(lx + 14, y + 3), P(lx + 24, y + 13)], fill=c)
    d.text(P(lx + (32 if i < 3 else 14), y), t, font=body(14), fill=c if i == 3 else INK)

out = os.path.join(HERE, 'map-labeled.png')
im.save(out)
im.convert('RGB').resize((1200, int(1200 * im.height / im.width))).save(out[:-4] + '.jpg', quality=85)
print(out)
