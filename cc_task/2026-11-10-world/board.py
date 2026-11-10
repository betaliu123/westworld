"""Faction readability boards: lineup with seals and names, silhouette and greyscale tests, and the token row.
Usage: python board.py [main|bg1|bg2 ...]   (default: all)"""
import os, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps, ImageChops

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HERE, '..', '..', 'assets-src', 'fonts')
font = lambda f, s: ImageFont.truetype(os.path.join(FONTS, f), s)
TITLE, BODY, SEAL = 'ZhiMangXing-Regular.ttf', 'LXGWWenKai-Regular.ttf', 'MaShanZheng-Regular.ttf'
PAPER, INK, CINNABAR, OCHRE, MUTED = '#ece3cf', '#15140f', '#a63a2b', '#9c6d3c', '#7b766a'
MALACHITE, AZURITE = '#5f7f68', '#3f5f7a'

BOARDS = {
    'main': ('lineup', 'tokens', 'faction-board', [.128, .366, .61, .855], [
        ('六扇门', '捕', CINNABAR, False, '皂衣红缨 · 腰牌铁尺'),
        ('应奉局', '奉', OCHRE, False, '黄袍黄封 · 花鸟使'),
        ('赤砂帮', '砂', '#8a3b22', False, '赭红头巾 · 砂纹刺青'),
        ('无相门', '', INK, True, '半面伶人 · 空白面具'),
    ]),
    'bg1': ('lineup2', 'tokens2', 'faction-board-bg1', [.18, .5, .82], [
        ('青竹会', '竹', MALACHITE, False, '斗笠垂纱 · 竹鞘剑'),
        ('漕帮', '漕', AZURITE, False, '蓑衣长篙 · 夹带包袱'),
        ('无常当', '当', INK, False, '算盘白灯 · 只认当票'),
    ]),
    'bg2': ('lineup3', 'tokens3', 'faction-board-bg2', [.18, .5, .82], [
        ('神霄宫', '霄', AZURITE, False, '莲冠道袍 · 水火在手'),
        ('皇城司', '', MUTED, True, '布衣无记 · 铜鱼符'),
        ('禁军', '禁', CINNABAR, False, '面上刺字 · 长枪铁甲'),
    ]),
}

def silhouette(img):
    bg = Image.new('RGB', img.size, img.crop((0, 0, 40, 40)).resize((1, 1)).getpixel((0, 0)))
    diff = ImageChops.difference(img, bg).convert('L').point(lambda v: 255 if v > 38 else 0)
    diff = diff.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MedianFilter(5))
    out = Image.new('RGB', img.size, PAPER)
    out.paste(Image.new('RGB', img.size, INK), mask=diff)
    return out

def build(lineup_name, tokens_name, out_name, centers, factions):
    lineup = Image.open(os.path.join(HERE, lineup_name + '.png')).convert('RGB')
    tokens = Image.open(os.path.join(HERE, tokens_name + '.png')).convert('RGB')
    W, H = lineup.size
    band = H // 2
    board = Image.new('RGB', (W, H + 230 + band + 40 + 470), PAPER)
    d = ImageDraw.Draw(board)
    board.paste(lineup, (0, 0))

    y = H + 16
    for (name, ch, color, hollow, note), cx in zip(factions, centers):
        x = int(cx * W)
        s = 92
        box = [x - s // 2, y, x + s // 2, y + s]
        if hollow:
            d.rectangle(box, outline=color, width=6)
        else:
            d.rectangle(box, fill=color)
            d.text((x, y + s / 2 + 2), ch, font=font(SEAL, 70), fill=PAPER, anchor='mm')
        d.text((x, y + s + 44), name, font=font(TITLE, 44), fill=INK, anchor='mm')
        d.text((x, y + s + 92), note, font=font(BODY, 22), fill=MUTED, anchor='mm')

    y = H + 230
    half = (W // 2, band)
    sil = silhouette(lineup).resize(half)
    grey = ImageOps.grayscale(lineup).convert('RGB').resize(half)
    for img, x, label in [(sil, 0, '剪影 · 看轮廓'), (grey, W // 2, '灰度 · 看明暗')]:
        board.paste(img, (x, y))
        d.text((x + 18, y + 12), label, font=font(BODY, 24), fill=CINNABAR)
    d.line([(W // 2, y), (W // 2, y + band)], fill=MUTED, width=2)

    y += band + 40
    t = tokens.crop((0, int(tokens.height * .14), tokens.width, int(tokens.height * .84)))
    t = t.resize((W, int(t.height * W / t.width)))
    board.paste(t.crop((0, 0, W, 470)), (0, y))
    d.text((18, y + 12), '信物', font=font(TITLE, 36), fill=INK)

    out = os.path.join(HERE, out_name + '.png')
    board.save(out)
    board.resize((1200, int(1200 * board.height / W))).save(out[:-4] + '.jpg', quality=85)
    print(out, board.size)

if __name__ == '__main__':
    for key in sys.argv[1:] or BOARDS:
        build(*BOARDS[key])
