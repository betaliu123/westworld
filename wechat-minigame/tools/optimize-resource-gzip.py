"""Optional offline lossless packing: pip install zopfli, then run from game root.
Build reuses a smaller existing gzip only when its decompressed bytes match source.
"""
import gzip
from pathlib import Path
import zopfli.gzip

paths=sorted(Path('packages/resources').rglob('*.json.gz'),key=lambda p:p.stat().st_size,reverse=True)[:6]
paths+=list(Path('packages/resources/assets/fonts').glob('*.ttf.gz'))
paths+=[Path('packages/resources/src/models/hero.glb.gz'),Path('packages/resources/src/models/npc-guard.glb.gz'),Path('packages/resources/src/models/npc-prince.glb.gz'),Path('packages/resources/src/models/npc-commoner.glb.gz')]
for path in paths:
    original=path.read_bytes()
    raw=gzip.decompress(original)
    packed=zopfli.gzip.compress(raw,numiterations=5)
    assert gzip.decompress(packed)==raw
    if len(packed)<len(original):
        path.write_bytes(packed)
    print(path.name, 'saved', max(0,len(original)-len(packed)), flush=True)
