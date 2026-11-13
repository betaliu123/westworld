"""Convert the vendored OFL WOFF2 subsets for native WeChat font loading.
Requires fonttools[woff]. Body/title glyphs retain their original outlines;
the numerical font is reduced to the digits and punctuation used by the HUD.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools import subset
for source in Path('resources/fonts').glob('*.woff2'):
    font=TTFont(source)
    font.flavor=None
    if source.stem=='notoserifsc-600':
        options=subset.Options()
        options.hinting=False
        selector=subset.Subsetter(options=options)
        selector.populate(text='0123456789+-.,/%文')
        selector.subset(font)
    font.save(source.with_suffix('.ttf'))
