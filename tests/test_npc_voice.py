import concurrent.futures
import json
import multiprocessing
from pathlib import Path
import tempfile
import unittest
import io
from contextlib import redirect_stdout
from unittest.mock import patch
from urllib.error import HTTPError

from tools.npc_voice import VoiceStore, VoiceUnavailable, canonical, main

ROOT = Path(__file__).resolve().parents[1]


def concurrent_writer(root):
    def synth(payload, credential):
        with (Path(root) / 'calls.txt').open('a') as handle:
            handle.write('generated\n')
        return b'ID3' + b'x' * 300, 2.0
    VoiceStore(root, key=lambda: 'test-placeholder', synthesize=synth).get('traveler', '共同一句。')


class VoiceTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.root = Path(self.folder.name)
        self.config_path = self.root / 'assets/audio/voice-cast.json'
        self.config_path.parent.mkdir(parents=True)
        self.config = json.loads((ROOT / 'assets/audio/voice-cast.json').read_text(encoding='utf-8'))
        self.write_config()
        self.calls = []

    def tearDown(self):
        self.folder.cleanup()

    def write_config(self):
        self.config_path.write_text(json.dumps(self.config), encoding='utf-8')

    def synth(self, payload, credential):
        self.calls.append(payload)
        return b'ID3' + b'x' * 300, 2.0

    def store(self, limit=4, synthesize=None):
        return VoiceStore(self.root, key=lambda: 'test-placeholder', limit=limit, synthesize=synthesize or self.synth)

    def test_concurrent_cache_and_changes(self):
        store = self.store()
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
            rows = list(pool.map(lambda _: store.get('traveler', '请坐。'), range(3)))
        self.assertEqual(len(self.calls), 1)
        self.assertEqual(len({row['hash'] for row in rows}), 1)
        changed = store.get('traveler', '请坐下。')
        self.config['cast']['traveler']['speed'] = .95
        self.write_config()
        recast = store.get('traveler', '请坐。')
        self.assertEqual(len({rows[0]['hash'], changed['hash'], recast['hash']}), 3)
        self.assertEqual(len(self.calls), 3)
        self.assertNotIn('test-placeholder', store.manifest_path.read_text(encoding='utf-8'))

    def test_bad_input_is_not_charged_and_failure_does_not_cache(self):
        def broken(*_):
            raise RuntimeError('upstream error')
        store = self.store(1, broken)
        for actor, text in [('missing', '话'), ('traveler', '（心想）'), ('traveler', '<tag>')]:
            with self.assertRaises(ValueError):
                store.get(actor, text)
        self.assertEqual(store.generated, 0)
        with self.assertRaises(VoiceUnavailable):
            store.get('traveler', '失败录音。')
        self.assertEqual(store.manifest()['entries'], [])
        with self.assertRaisesRegex(VoiceUnavailable, 'trial_limit'):
            store.get('traveler', '另一句。')

    def test_numeric_edits_keep_browser_signature_format(self):
        self.assertEqual(canonical({'speed': 1.0, 'pitch': -0.0, 'vol': 1}), '{"pitch":0,"speed":1,"vol":1}')

    def test_dry_run_reports_missing_without_credentials_network_or_cache_writes(self):
        source = self.root / 'src/voice-lines.js'
        source.parent.mkdir()
        source.write_text('// fixture', encoding='utf-8')
        report = self.root / 'plan.json'
        rows = json.dumps([{'actor': 'player_female', 'text': '劳你通融。'}], ensure_ascii=False).encode('utf-8')
        with patch('tools.npc_voice.ROOT', self.root), patch('sys.argv', ['npc_voice.py', '--dry-run', '--report', str(report)]), \
             patch('tools.npc_voice.subprocess.check_output', return_value=rows), \
             patch.object(VoiceStore, '_remote', side_effect=AssertionError('paid call')), \
             patch.object(VoiceStore, 'seed_audition', side_effect=AssertionError('cache write')), redirect_stdout(io.StringIO()):
            main()
        result = json.loads(report.read_text(encoding='utf-8'))
        self.assertEqual(result['counts'], {'missing': 1})
        self.assertEqual(result['attempts'], 0)
        self.assertFalse((self.root / 'assets/audio/npc').exists())
        self.assertFalse((self.root / '.artifacts').exists())

    def test_http_error_reports_only_status_and_counts_attempt(self):
        def failure(*_):
            raise HTTPError('https://example.invalid', 429, 'secret-body', {}, None)
        store = self.store(1, failure)
        with self.assertRaisesRegex(VoiceUnavailable, '^http_429$'):
            store.get('traveler', '请稍候。')
        self.assertEqual(store.generated, 1)
        self.assertEqual(store.manifest()['entries'], [])

    def test_watcher_and_server_share_one_generation(self):
        jobs = [multiprocessing.Process(target=concurrent_writer, args=(str(self.root),)) for _ in range(2)]
        for job in jobs:
            job.start()
        for job in jobs:
            job.join(10)
            self.assertEqual(job.exitcode, 0)
        self.assertEqual((self.root / 'calls.txt').read_text().splitlines(), ['generated'])
        self.assertEqual(len(self.store().manifest()['entries']), 1)


if __name__ == '__main__':
    unittest.main()
