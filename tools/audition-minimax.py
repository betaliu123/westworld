"""Generate only the three explicitly requested MiniMax audition clips.

Uses an existing gateway credential in a temporary file, deletes it immediately
after reading, and never writes the credential or response audio hex to logs.
Run manually; this is not part of the game or audition-page runtime.
"""
import argparse
import datetime
import json
from pathlib import Path
import time
import urllib.error
import urllib.request

SAMPLES = [
    dict(id="prince-28", title="锦衣客 · 含笑试探", voice="male-qn-jingying", speed=0.94,
         text="城门查得这样紧……<#0.35#>你是怎么进来的？(chuckle)",
         direction="自动情绪，句间停顿与轻笑；与第一轮使用相同男声音色和主要台词"),
    dict(id="guard-28", title="守卫 · 怒气问责", voice="male-qn-badao", speed=0.96,
         text="站住。<#0.25#>把手里的东西放下。<#0.35#>你当我没瞧见？",
         emotion="angry", direction="显式 angry，短句停顿；观察是否过于喊叫"),
    dict(id="hostess-28", title="宋茶娘 · 松口气后道谢", voice="female-chengshu", speed=0.94,
         text="(sighs)多亏你搭了把手。<#0.3#>方才真吓着我了……<#0.35#>来，这盏茶，我请你。",
         direction="自动情绪与叹气；观察惊魂未定到感谢的转变"),
]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--key-file", required=True, type=Path)
    args = parser.parse_args()
    key = args.key_file.read_text(encoding="utf-8").strip()
    args.key_file.unlink()
    if not key.startswith("sk-"):
        raise SystemExit("Missing gateway credential")
    root = Path(__file__).resolve().parents[1]
    folder = root / "assets/audio/audition-2026-11-10"
    manifest_file = folder / "manifest.json"
    manifest = json.loads(manifest_file.read_text(encoding="utf-8-sig"))
    for sample in SAMPLES:
        destination = folder / (sample["id"] + ".mp3")
        if destination.exists() and any(m["id"] == sample["id"] for m in manifest):
            print(json.dumps({"id": sample["id"], "status": "already generated"}))
            continue
        voice = dict(voice_id=sample["voice"], speed=sample["speed"], vol=1, pitch=0)
        if "emotion" in sample:
            voice["emotion"] = sample["emotion"]
        body = dict(model="speech-2.8-hd", text=sample["text"], stream=False,
                    output_format="hex", voice_setting=voice, language_boost="Chinese",
                    audio_setting=dict(sample_rate=32000, bitrate=128000, format="mp3", channel=1))
        request = urllib.request.Request(
            "https://ai.leihuo.netease.com/minimax/v1/t2a_v2",
            data=json.dumps(body, ensure_ascii=False).encode("utf-8"), method="POST",
            headers={"Authorization": "Bearer " + key, "Content-Type": "application/json"})
        started = time.monotonic()
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                result = json.load(response)
        except urllib.error.HTTPError as error:
            raise SystemExit(f"Gateway HTTP {error.code}; stopped without retry") from None
        status = result.get("base_resp", {})
        audio_hex = (result.get("data") or {}).get("audio")
        if status.get("status_code") != 0 or not audio_hex:
            print(json.dumps({"id": sample["id"], "error": status}, ensure_ascii=False))
            raise SystemExit("Generation failed; stopped without retry")
        audio = bytes.fromhex(audio_hex)
        destination.write_bytes(audio)
        metadata = result.get("extra_info", {})
        record = dict(id=sample["id"], title=sample["title"], model=body["model"],
                      file=destination.name, durationSeconds=metadata.get("audio_length", 0) / 1000,
                      bytes=len(audio), generationSeconds=round(time.monotonic() - started, 2),
                      settings=body, direction=sample["direction"], aiGenerated=True,
                      generatedAt=datetime.datetime.now().astimezone().isoformat(timespec="seconds"))
        manifest.append(record)
        manifest_file.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps({k: record[k] for k in ("id", "durationSeconds", "bytes", "generationSeconds")}, ensure_ascii=False), flush=True)
    key = ""


if __name__ == "__main__":
    main()
