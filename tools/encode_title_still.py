"""Encode the capture made by tools/capture_title_still.mjs as the title screen's loading still.

The still is fetched before the game's scripts, so it is kept small: 1600 px wide, lossy WebP.
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / '.artifacts' / 'title-still.png'
TARGET = ROOT / 'assets' / 'ui' / 'title-still.webp'
WIDTH = 1600

image = Image.open(SOURCE).convert('RGB')
image = image.resize((WIDTH, round(image.height * WIDTH / image.width)), Image.LANCZOS)
image.save(TARGET, 'WEBP', quality=72, method=6)
print(f'{TARGET.relative_to(ROOT)}: {image.width}x{image.height}, {TARGET.stat().st_size} bytes')
