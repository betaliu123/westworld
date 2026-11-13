"""Create an upload-only static snapshot; never upload the working tree itself."""
import argparse
import json
import re
import shutil
from urllib.parse import urlsplit
from html import escape
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPORTS = ROOT / '.artifacts' / 'drop'
EXTENSIONS = {'.js', '.css', '.json', '.glb', '.mp3', '.wav', '.webp', '.png',
              '.jpg', '.svg', '.woff2', '.txt', '.md'}
# This is the live hero animation pack, despite its historical .local filename.
HERO_MOTION = {
    'src/models/sumiro-motion.local.json': {
        'stand_idle', 'walk', 'jog', 'sprint', 'idle_sword', 'run_sword',
        'jump_fwd', 'jump_up', 'fall', 'land', 'draw', 'sheathe',
        'attack_1', 'attack_2', 'attack_3', 'hit', 'death',
    },
    'src/models/hero-stealth-motion.json': {'crouch_idle', 'crouch_walk'},
}


def build():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--name', default=datetime.now().strftime('%Y%m%d-%H%M%S'))
    parser.add_argument('--ai-relay', help='HTTPS API-only relay URL; never an LLM key')
    args = parser.parse_args()
    relay = args.ai_relay
    relay_config = ROOT / '.artifacts/ds-relay/public.json'
    if relay is None and relay_config.exists():
        relay = json.loads(relay_config.read_text(encoding='utf-8')).get('url')
    if relay:
        parts = urlsplit(relay)
        if parts.scheme != 'https' or not parts.hostname or parts.username or parts.password or parts.query or parts.fragment:
            parser.error('ai-relay must be an HTTPS URL without credentials, query or fragment')
    if not re.fullmatch(r'[A-Za-z0-9_-]+', args.name):
        parser.error('name must contain only letters, digits, hyphens or underscores')
    output = EXPORTS / args.name
    # A fresh directory prevents stale files or credentials surviving an update.
    output.mkdir(parents=True, exist_ok=False)
    candidates = [ROOT / 'index.html', *ROOT.glob('*.css')]
    for directory in ('src', 'vendor', 'assets'):
        candidates.extend((ROOT / directory).rglob('*'))
    count = 0
    for source in candidates:
        if not source.is_file() or source.is_symlink():
            continue
        relative = source.relative_to(ROOT)
        if any(part.startswith('.') for part in relative.parts):
            continue
        if source.name.endswith('-raw.wav'):
            continue
        if source.name.endswith('.local.json') and relative.as_posix() not in HERO_MOTION:
            continue
        if source.suffix not in EXTENSIONS and source.name != 'index.html':
            continue
        destination = output / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)
        count += 1
    shutil.copy2(ROOT / 'tools' / 'drop-static.js', output / 'drop-static.js')
    index = output / 'index.html'
    html = index.read_text(encoding='utf-8')
    adapter = '<script src="drop-static.js"' + (f' data-ai-relay="{escape(relay, quote=True)}"' if relay else '') + '></script>'
    html = html.replace('<script src="vendor/lucide.min.js">',
                        adapter + '<script src="vendor/lucide.min.js">')
    assert 'src="drop-static.js"' in html, 'index entry changed: inspect bootstrap placement'
    index.write_text(html, encoding='utf-8')
    motion_counts = {}
    for relative, required in HERO_MOTION.items():
        pack = json.loads((output / relative).read_text(encoding='utf-8'))
        clips = {clip['name']: clip for clip in pack['clips']}
        missing = required - clips.keys()
        assert not missing, f'hero animation pack incomplete: {relative}: {sorted(missing)}'
        assert all(clips[name].get('tracks') and clips[name]['duration'] > 0 for name in required), f'empty hero motion: {relative}'
        motion_counts[relative] = len(clips)
    # The runtime only needs final audio, not synthesis prompts or raw recordings.
    catalog_path = output / 'assets/audio/world/manifest.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf-8'))
    catalog = {key: {field: value[field] for field in ('title', 'src', 'seconds')}
               for key, value in catalog.items()}
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding='utf-8')
    voices = json.loads((output / 'assets/audio/npc/manifest.json').read_text(encoding='utf-8'))
    urls = [entry['src'] for entry in catalog.values()] + [entry['url'] for entry in voices['entries']]
    for url in urls:
        asset = (output / url.lstrip('/')).resolve()
        assert asset.is_relative_to(output.resolve()) and asset.is_file(), f'missing audio: {url}'
    # Check real local imports; localhost-only test harnesses are intentionally omitted.
    for script in (output / 'src').rglob('*.js'):
        for reference in re.findall(r'(?:from\s*|import\s*\()\s*[\'"]([^\'"]+)[\'"]', script.read_text(encoding='utf-8')):
            if reference.startswith(('.', '/')) and not reference.startswith('../tests/'):
                target = script.parent / reference if reference.startswith('.') else output / reference.lstrip('/')
                assert target.is_file(), f'missing module: {script.name}: {reference}'
    files = [p for p in output.rglob('*') if p.is_file()]
    assert not any(p.name.startswith('.') or p.suffix in {'.py', '.log'} for p in files)
    report = {'directory': str(output), 'files': len(files),
              'bytes': sum(p.stat().st_size for p in files), 'audioEntries': len(urls),
              'localApi': False, 'aiRelay': relay, 'heroMotionClips': motion_counts,
              'createdAt': datetime.now().astimezone().isoformat()}
    (EXPORTS / 'latest.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    build()
