"""Resize generated portrait originals into the runtime bundle; originals are retained."""
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / "assets/npc-portraits/manifest.json").read_text(encoding="utf-8"))
import argparse
parser = argparse.ArgumentParser()
parser.add_argument("originals", type=Path)
args = parser.parse_args()
total = 0
for entry in manifest["portraits"]:
    source = args.originals / entry["original"]
    output = root / "assets/npc-portraits" / entry["file"]
    with Image.open(source) as image:
        image.convert("RGB").resize((512, 512), Image.Resampling.LANCZOS).save(output, "WEBP", quality=85, method=6)
    total += output.stat().st_size
print(f'{len(manifest["portraits"])} portraits, {total / 1024:.0f} KiB')
