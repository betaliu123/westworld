"""MiniMax voice cache. Credentials stay on the server; filenames depend on the full request."""
import argparse
from contextlib import contextmanager
import hashlib
import json
import os
from pathlib import Path
import subprocess
import threading
import time
import urllib.request
import urllib.error
from collections import Counter

ROOT = Path(__file__).resolve().parents[1]
EMOTIONS = {"happy", "sad", "angry", "fearful", "disgusted", "surprised", "calm"}
ENDPOINT = "https://ai.leihuo.netease.com/minimax/v1/t2a_v2"


def canonical(value):
    # JSON.stringify writes 1.0 as 1. Keep edited numeric settings identical across runtimes.
    def normalize(item):
        if isinstance(item, float) and item.is_integer():
            return int(item)
        if isinstance(item, dict):
            return {k: normalize(v) for k, v in item.items()}
        if isinstance(item, list):
            return [normalize(v) for v in item]
        return item
    return json.dumps(normalize(value), ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def request_for(config, actor, text, emotion=None):
    if actor not in config["cast"] or not isinstance(text, str):
        raise ValueError("unknown speaker")
    text = text.strip()
    if not text or len(text) > 240 or text.startswith(("（", "(")) or "<" in text or ">" in text:
        raise ValueError("not a spoken line")
    if emotion is not None and emotion not in EMOTIONS:
        raise ValueError("unsupported emotion")
    profile = config["cast"][actor]
    voice = {**config["defaults"], **{k: profile[k] for k in ("voice_id", "speed", "pitch")}}
    performance = next((p for p in config.get("performances", [])
                        if actor in p["actors"] and p["text"] == text), {})
    selected_emotion = emotion or performance.get("emotion")
    if selected_emotion:
        voice["emotion"] = selected_emotion
    payload = dict(model=config["model"], stream=False, output_format="hex",
                   text=performance.get("synthesisText", text), voice_setting=voice,
                   language_boost=config["language_boost"], audio_setting=config["audio_setting"])
    return text, payload


def identity(actor, payload):
    signature = canonical(dict(actor=actor, payload=payload))
    return signature, hashlib.sha256(signature.encode("utf-8")).hexdigest()


class VoiceUnavailable(Exception):
    pass


class VoiceStore:
    def __init__(self, root=ROOT, key=lambda: "", limit=12, synthesize=None, request_timeout=55):
        self.root, self.key, self.limit = Path(root), key, limit
        self.lock = threading.RLock()
        self.generated = 0
        self.synthesize = synthesize or (lambda payload, credential: self._remote(payload, credential, timeout=request_timeout))
        self.failed = {}

    def config(self):
        return json.loads((self.root / "assets/audio/voice-cast.json").read_text(encoding="utf-8"))

    @contextmanager
    def disk_lock(self):
        # The editor watcher and HTTP server can run together. Serialize their cache writes
        # and recheck after acquiring the lock, so the same line is not billed twice.
        folder = self.root / '.artifacts'
        folder.mkdir(parents=True, exist_ok=True)
        with (folder / 'voice-cache.lock').open('a+b') as handle:
            handle.seek(0, 2)
            if handle.tell() == 0:
                handle.write(b'0'); handle.flush()
            if os.name == 'nt':
                import msvcrt
                acquire = lambda: msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
                release = lambda: msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                import fcntl
                acquire = lambda: fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                release = lambda: fcntl.flock(handle.fileno(), fcntl.LOCK_UN)
            deadline = time.monotonic() + 65
            while True:
                handle.seek(0)
                try:
                    acquire(); break
                except OSError:
                    if time.monotonic() > deadline:
                        raise VoiceUnavailable('cache_busy') from None
                    time.sleep(.1)
            try:
                yield
            finally:
                handle.seek(0); release()

    @property
    def manifest_path(self):
        return self.root / "assets/audio/npc/manifest.json"

    def manifest(self):
        if not self.manifest_path.exists():
            return {"schema": 1, "entries": []}
        return json.loads(self.manifest_path.read_text(encoding="utf-8"))

    def _write(self, actor, text, payload, url, duration, source):
        signature, digest = identity(actor, payload)
        entry = dict(actor=actor, text=text, signature=signature, hash=digest, url=url,
                     duration=duration, settings=payload, source=source, aiGenerated=True)
        manifest = self.manifest()
        manifest["entries"] = [e for e in manifest["entries"] if e["hash"] != digest] + [entry]
        self.manifest_path.parent.mkdir(parents=True, exist_ok=True)
        temporary = self.manifest_path.with_suffix(".tmp")
        temporary.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        temporary.replace(self.manifest_path)
        return entry

    def cached(self, actor, payload):
        _, digest = identity(actor, payload)
        for entry in self.manifest()["entries"]:
            if entry["hash"] == digest and (self.root / entry["url"].lstrip("/")).is_file():
                return entry
        return None

    def seed_audition(self):
        config = self.config()
        source = self.root / "assets/audio/audition-2026-11-10"
        if not (source / "manifest.json").exists():
            return
        samples = json.loads((source / "manifest.json").read_text(encoding="utf-8-sig"))
        with self.lock, self.disk_lock():
            for cue in config["performances"]:
                sample = next((s for s in samples if s["id"] == cue.get("sample")), None)
                if not sample or not (source / sample["file"]).exists():
                    continue
                for actor in cue["actors"]:
                    text, payload = request_for(config, actor, cue["text"])
                    # A changed voice/acting setting must not reuse a stale audition.
                    if canonical(payload) != canonical(sample["settings"]):
                        continue
                    self._write(actor, text, payload,
                                "/assets/audio/audition-2026-11-10/" + sample["file"],
                                sample["durationSeconds"], "approved-audition")

    def get(self, actor, text, emotion=None, generate=True):
        with self.lock, self.disk_lock():
            text, payload = request_for(self.config(), actor, text, emotion)
            cached = self.cached(actor, payload)
            if cached:
                return cached
            if not generate:
                return None
            _, digest = identity(actor, payload)
            if self.failed.get(digest, 0) > time.monotonic():
                raise VoiceUnavailable("cooldown")
            if self.generated >= self.limit:
                raise VoiceUnavailable("trial_limit")
            credential = self.key()
            if not credential:
                raise VoiceUnavailable("not_configured")
            self.generated += 1  # Count attempts too: retries cannot silently run up usage.
            try:
                raw, duration = self.synthesize(payload, credential)
                if not raw or len(raw) < 256 or not 0 < duration < 180:
                    raise VoiceUnavailable("invalid_audio")
                folder = self.manifest_path.parent
                folder.mkdir(parents=True, exist_ok=True)
                target = folder / (digest + ".mp3")
                temporary = target.with_suffix(".part")
                temporary.write_bytes(raw)
                temporary.replace(target)
                return self._write(actor, text, payload, "/assets/audio/npc/" + target.name,
                                   duration, "minimax-generated")
            except VoiceUnavailable:
                self.failed[digest] = time.monotonic() + 60
                raise
            except urllib.error.HTTPError as error:
                self.failed[digest] = time.monotonic() + 60
                raise VoiceUnavailable('http_' + str(error.code)) from None
            except (TimeoutError, urllib.error.URLError):
                self.failed[digest] = time.monotonic() + 60
                raise VoiceUnavailable('network_unavailable') from None
            except Exception:
                self.failed[digest] = time.monotonic() + 60
                raise VoiceUnavailable("generation_failed") from None
            finally:
                credential = ""

    @staticmethod
    def _remote(payload, credential, timeout=55):
        request = urllib.request.Request(ENDPOINT, json.dumps(payload, ensure_ascii=False).encode("utf-8"),
                                         {"Authorization": "Bearer " + credential,
                                          "Content-Type": "application/json"})
        with urllib.request.urlopen(request, timeout=timeout) as response:
            result = json.load(response)
        status = result.get("base_resp", {}).get("status_code")
        if status != 0:
            raise VoiceUnavailable("upstream_" + str(status) if isinstance(status, int) else "upstream")
        raw = bytes.fromhex(result["data"]["audio"])
        duration = result.get("extra_info", {}).get("audio_length", 0) / 1000
        if not (raw.startswith(b"ID3") or raw[:1] == b"\xff"):
            raise VoiceUnavailable("invalid_mp3")
        return raw, duration


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=8, help="maximum new requests, cache hits cost nothing")
    parser.add_argument("--seed-only", action="store_true")
    parser.add_argument("--watch", action="store_true", help="recheck authored trial lines after edits")
    parser.add_argument("--catalog", choices=("trial", "chapter"), default="trial")
    parser.add_argument("--dry-run", action="store_true", help="list exact cache misses without calling the model or writing assets")
    parser.add_argument("--report", type=Path, help="write the batch plan/results (never credentials)")
    parser.add_argument("--timeout", type=int, default=180, help="offline request timeout in seconds")
    args = parser.parse_args()
    if args.watch and (args.dry_run or args.catalog != "trial"):
        parser.error("--watch only supports the trial catalog without --dry-run")
    if args.dry_run and args.seed_only:
        parser.error("--dry-run cannot import audition assets")
    env = {}
    if (ROOT / ".env").exists():
        for line in (ROOT / ".env").read_text(encoding="utf-8-sig").splitlines():
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip()
    key = lambda: os.environ.get("TTS_API_KEY") or env.get("TTS_API_KEY") or os.environ.get("LLM_API_KEY") or env.get("LLM_API_KEY", "")
    store = VoiceStore(root=ROOT, key=key, limit=max(0, args.limit), request_timeout=max(1, min(300, args.timeout)))
    if not args.dry_run:
        store.seed_audition()
    if args.seed_only:
        print("Imported matching approved samples.")
        return
    previous = None
    while True:
        revision = ((ROOT / "src/voice-lines.js").stat().st_mtime_ns,
                    (ROOT / "assets/audio/voice-cast.json").stat().st_mtime_ns)
        if revision == previous:
            time.sleep(2)
            continue
        previous = revision
        script = ("import {chapterVoiceCatalog} from './tools/voice_catalog.mjs'; console.log(JSON.stringify(chapterVoiceCatalog()))"
                  if args.catalog == "chapter" else
                  "import {VOICE_TRIAL} from './src/voice-lines.js'; console.log(JSON.stringify(VOICE_TRIAL))")
        rows = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", script], cwd=ROOT).decode("utf-8"))
        config = store.config()
        plan = []
        for row in rows:
            text, payload = request_for(config, row["actor"], row["text"])
            _, digest = identity(row["actor"], payload)
            plan.append({**row, "hash": digest, "status": "cached" if store.cached(row["actor"], payload) else "missing"})
        report = dict(schema=1, catalog=args.catalog, model=config["model"], endpoint=ENDPOINT,
                      startedAt=time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
                      limit=store.limit, requestTimeout=max(1, min(300, args.timeout)), dryRun=args.dry_run, entries=plan)
        def save_report():
            report["attempts"] = store.generated
            report["counts"] = dict(Counter(row["status"] for row in plan))
            if args.report:
                args.report.parent.mkdir(parents=True, exist_ok=True)
                args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        save_report()
        print(json.dumps(dict(catalog=args.catalog, total=len(plan), counts=report["counts"], limit=store.limit)), flush=True)
        if args.dry_run:
            return
        for row in plan:
            before = store.generated
            try:
                clip = store.get(row["actor"], row["text"])
                row.update(status="generated" if store.generated > before else "cached", url=clip["url"], duration=clip["duration"])
                print(json.dumps(dict(actor=row["actor"], status=row["status"],
                                      duration=clip["duration"]), ensure_ascii=False), flush=True)
            except VoiceUnavailable as error:
                row["status"] = str(error)
                print(json.dumps(dict(actor=row["actor"], status=str(error))), flush=True)
                save_report()
                raise SystemExit(1)  # Resume explicitly after fixing the failure; never burn the rest of a batch.
            save_report()
        if not args.watch:
            if any(row["status"] not in ("cached", "generated") for row in plan):
                raise SystemExit(1)
            break
        time.sleep(2)


if __name__ == "__main__":
    main()
