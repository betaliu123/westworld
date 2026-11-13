"""Freeze the original OFL title glyphs as Canvas paths (no rasterization).
Run after changing resources/fonts/zhimangxing.woff2; requires fonttools[woff].
"""
import hashlib
import json
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen
from fontTools.pens.boundsPen import BoundsPen

source = Path('resources/fonts/zhimangxing.woff2')
font = TTFont(source)
glyph_set = font.getGlyphSet()

class CanvasPen(BasePen):
    def __init__(self):
        super().__init__(glyph_set)
        self.commands = []
    def record(self, op, *points):
        self.commands.append([op, *[round(v, 3) for point in points for v in point]])
    def _moveTo(self, point): self.record('M', point)
    def _lineTo(self, point): self.record('L', point)
    def _qCurveToOne(self, a, b): self.record('Q', a, b)
    def _curveToOne(self, a, b, c): self.record('C', a, b, c)
    def _closePath(self): self.record('Z')
    def _endPath(self): pass

glyphs = {}
for char in '江湖有回声':
    name = font.getBestCmap()[ord(char)]
    glyph = glyph_set[name]
    pen, bounds = CanvasPen(), BoundsPen(glyph_set)
    glyph.draw(pen)
    glyph.draw(bounds)
    glyphs[char] = dict(advance=glyph.width, bounds=bounds.bounds, commands=pen.commands)
data = dict(source='Zhi Mang Xing / SIL OFL 1.1',
            sha256=hashlib.sha256(source.read_bytes()).hexdigest(),
            unitsPerEm=font['head'].unitsPerEm,
            top=max(g['bounds'][3] for g in glyphs.values()), glyphs=glyphs)
Path('runtime/title-outlines.js').write_text(
    '// Generated from resources/fonts/zhimangxing.woff2 by tools/build-title-outlines.py.\n'
    '// Original license: resources/fonts/OFL-ZhiMangXing.txt.\n'
    'export const TITLE_OUTLINES=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n',
    encoding='utf-8')
print('Title outlines:', len(glyphs), 'glyphs, original font SHA256:', data['sha256'])
