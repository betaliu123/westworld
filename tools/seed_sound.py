"""Small, explicit Seed Audio batch. Credentials never enter static files or logs.

python tools/seed_sound.py --only music --limit 1
python tools/seed_sound.py --limit 8
Changing a prompt creates a new hash; unchanged raw takes are reused.
"""
import argparse
import base64
import datetime
import hashlib
import io
import json
import os
from pathlib import Path
import urllib.error
import urllib.request

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parents[1]
ENDPOINT = 'https://ai.leihuo.netease.com/openspeech/api/v3/tts/create'
SAMPLES = {
    'music-danger': ('盘查·危弦', '生成40秒原创中国古风武侠潜行游戏危险区域纯音乐。官差正在附近搜查，低音古琴断续闷拨，两三个音缓缓反复，稀疏低沉鼓心在远处缓慢推进，少量弦的摩擦与压低的洞箫长气音。紧张、克制、有被发现前屏住呼吸的悬念，不是战斗高潮。不要大声骤响，不要惊吓，不要西方管弦配乐或电子合成音。没有人声、语言、吟唱、脚步和环境音。整体音量均匀，开头结尾轻柔，可低声循环。'),
    'music-prison': ('县狱·长夜', '生成40秒原创中国古风游戏牢房纯音乐。极稀疏低音古琴散音，偶尔两三枚黯淡泛音，极轻洞箫低音长息，缓慢、沉闷、清冷，留有大段安静余韵，像在狭小牢房等待天明。没有明确欢快旋律，没有鼓点、高潮或恐怖惊吓，没有电子音色，没有人声、吟唱、囚犯喊叫、锁链、滴水或其他环境音。音量平稳克制，首尾柔和，适合安静循环。'),
    'recognition': ('识破·弦涩', '生成1.6秒古风游戏被当面认出后的尴尬提示音。只有一架古琴的两次短促拨弦，第一下轻巧而突然，第二下低半拍轻微滑音收住，带一点窘迫和无言以对的顿挫。自然木质琴弦，克制、不滑稽、不惊悚、不刺耳，不用锣、笑声或卡通音效。没有任何人声、语言、音乐伴奏、环境声。干净近距离单次音效，余音迅速自然衰减。'),
    'npc-qinghe-cry': ('宋青禾·石后低泣', '生成6秒游戏人物音效。一名成年女子独自低声抽泣，努力平复情绪。中低音区的清润女声，两三次轻微哽咽、断续吸气，夹着自然停顿，结尾缓缓收声。表演克制、真实、有韧性，音量轻，不大声哭喊。单人近距离录音，干净干声。只有无词的抽泣和呼吸，不包含任何可辨认的字句、旁白、唱歌、音乐、环境底声或其他人的声音。'),
    'music-opening': ('开场·蛊与仙山', '生成40秒原创中国古风武侠游戏开场纯音乐，古琴独奏为主。开头五秒是低音区沉重的古琴散音与缓慢的按音滑音，压抑、隐忍，像暗处发作的毒痛；随后古琴急促的轮指与扫弦层层推进，力度逐渐增强，紧张、悬疑、有张力，远处只有一两下极低沉的大鼓；最后十秒力量收住，转为舒缓的五声音阶泛音与长音，落在宫音上余韵悠长，平静地引向清晨的小城。没有人声，没有吟唱，没有任何语言，没有电子音色、合成器和管弦乐团，没有环境声。近距离自然录音。'),
    'music-night': ('临溪·夜泊', '生成40秒原创中国古风游戏深夜探索纯音乐。北宋小城入夜，极稀疏的古琴泛音与低声洞箫，悠缓、安宁，保留长时间自然余韵和留白。没有鼓点，没有人声，没有电子音色，没有市集、鸟鸣或其他环境声。不悲壮不惊悚，不要高潮。开头结尾轻柔，适合低音量循环。'),
    'night': ('街巷·夜风', '生成30秒写实的古代小镇深夜环境底声。极轻的树叶夜风，远处零星秋虫，安静而疏落，空间开阔。无人声、叫卖、车马、音乐、犬吠、鸟鸣、铃声、机械声，不要持续密集的高频虫鸣。响度平稳低柔，适合夜间街巷低声循环。'),
    'night-inn': ('客栈·夜阑', '生成30秒古代小客栈临近打烊的室内环境底声。很安静，偶尔一只陶瓷酒杯轻轻放在木桌上、衣袖轻擦，远处一点炉火，不包含任何可辨认的人声或对话，没有笑闹，没有音乐、脚步循环、叫卖、现代电器。最多三次轻微杯盏声，声音低柔、克制、自然，适合低音量循环。'),
    'flute-poor': ('竹笛·生涩', '生成24秒原创中国竹笛独奏，单人初学者练习一支简单的五声音阶乡间小调，旋律围绕sol、la、do、la、sol展开。真实横吹竹笛，气息不稳、长音轻轻摇晃，几处音不准，换气过早造成短暂断句，偶尔漏气后重新接上旋律。明显生涩但仍能辨认小调，不夸张搞笑，不刺耳尖啸，不猛烈喷气，不快速吐音。第一秒就起笛，最后一秒自然收气。近距离自然干声，只有一支竹笛，没有任何人声、说话、唱歌、伴奏、鼓点、电子音、鸟叫或环境声。'),
    'flute-good': ('竹笛·娴熟', '生成24秒原创中国竹笛独奏，单人熟练乐师演奏一支简单的五声音阶乡间小调，旋律围绕sol、la、do、la、sol展开。真实横吹竹笛，竹质音色清润温暖，音准稳定，气息绵长，连音流畅，乐句舒展自然，少量细腻倚音，换气有留白。轻快从容而不炫技，不高音尖啸，不快速吐音，不戏剧性高潮。第一秒就起笛，最后一秒自然收气。近距离自然干声，只有一支竹笛，没有任何人声、说话、唱歌、伴奏、鼓点、电子音、鸟叫或环境声。'),
    'creek': ('临溪·缓流', '生成30秒写实自然环境录音：站在宽阔平缓的浅河岸边，柔和绵密的流水缓缓滑过岸边，水面轻轻荡漾，细小涟漪舒缓地相互融合。声音连续、柔软、均匀，有自然而缓慢的不规则变化，安静开阔，没有突出的单个响声。只录平缓水流，不要鸟叫、虫鸣、啄木鸟，不要水滴敲击，不要急促咕噜和冒泡，不要密集溅水，不要规律脉冲、哒哒声、机关枪声、马达或机械颤动，不要湍流、瀑布、海浪、雨声、风噪、人声、音乐。开头结尾保持同样平稳的水流，适合游戏河畔长期低声循环。'),
    'city': ('临溪·街巷底声', '生成20秒写实的北宋城镇街巷环境底声。人们在中远处轻声交谈，形成温和热闹、自然起伏的人声混响，夹杂偶尔的脚步和远处碗盏轻碰。所有人声均不可辨认具体字句，只作为远处的模糊人群声，绝不要说任何清晰台词，不要叫卖，不要近距离人物说话。无现代车流、广播、电机，无音乐，无戏剧性变化。开头结尾平稳，适合长时间循环游戏环境底声。'),
    'music': ('临溪·琴箫', '生成40秒完整的原创中国古风游戏探索背景纯音乐。北宋小城清晨，古琴温润的散音与少量洞箫长音相互呼应，五声音阶，悠缓从容、含蓄而有江湖感。旋律简洁有留白，力度轻，不要一直演奏密集的音符，不要戏剧性高潮。没有人声，没有吟唱，没有任何语言，没有鼓点，没有电子音色，没有环境声。近距离自然录音，尾音柔和。开头和结尾都轻缓，适合在城镇漫步时低声循环。'),
    'swing': ('刀锋破风', '生成3秒干净的游戏拟音素材。安静无混响环境中，只有一次利落的单手钢刀挥过空气的短促破风声，唰的一声，带轻微袖口布料摩擦，声音有真实重量，瞬态集中在开头一秒内，之后迅速安静。没有碰撞，没有金属撞击，没有人声、音乐、电子音、爆炸、背景噪音，不要多次挥动。'),
    'wood': ('木材受击', '生成3秒干净的写实游戏拟音。只有一次钢刀劈中坚硬木栅栏的撞击，短促厚实的木头咔嗒声，少量细小木屑落下。第一秒内命中，随后快速衰减。无其他动作，无人声、音乐、喘息、电子音，无长混响，不要连续敲击。'),
    'body': ('衣甲受击', '生成3秒干净的写实游戏拟音。只有一次拳掌击中穿厚布衣的练功沙包，低沉而结实的闷响，衣料窸窣，第一秒内击中，之后迅速安静。克制、无血腥，无骨折声，无人声、惨叫、音乐、电子音，无长混响，不要连续攻击。'),
    'metal': ('兵刃相接', '生成3秒干净的游戏拟音。两把钢刀只有一次短促的格挡碰撞，清脆的铛声与轻微真实金属余振，第一秒内碰撞，不尖锐刺耳，尾音自然很快消失。没有砍肉声，没有人声、音乐、风声、电子合成效果，无长混响，不要连续碰撞。'),
    'draw': ('拔刀出鞘', '生成3秒干净的游戏拟音。一把传统钢刀从木鞘中利落抽出，只有一次短暂的金属与木鞘滑擦声，末尾轻微金属清鸣，动作发生在第一秒，之后安静。没有挥刀攻击，没有打斗，没有人声、音乐、电子音，无长混响。'),
    'coins': ('铜钱轻落', '生成3秒干净的游戏拟音。三枚铜钱一次轻轻落在木桌上，细小清脆的叮当声，短暂滚动后停住，全部发生在前一秒半。自然、轻巧、近距离，之后安静。没有重复倒钱，没有人声、音乐、电子音，无长混响。'),
    'step': ('布靴落地', '生成3秒干净的游戏拟音。只有一只布靴在石板路上落地的一步，短促低沉的鞋底触地声，带一点细沙轻擦，声音在第一秒发生，之后安静。只有一步，不要连续走路，不要人声、喘息、音乐、电子音、背景环境声，无长混响。'),
    'npc-gasp-male': ('男子·受惊吸气', '生成2秒游戏人物反应音效。只有一名成年男子突然看到近处有人拔刀，短促地倒吸一口气，接一个压低的非语言惊呼，克制真实、不滑稽。反应只发生一次，集中在前一秒，随后安静。近距离干声，无清晰字句，无旁白、朗读、音乐、脚步、兵器、背景人群和长混响。'),
    'npc-gasp-female': ('女子·受惊吸气', '生成2秒游戏人物反应音效。只有一名成年女子突然看到近处有人拔刀，短促地倒吸一口气，接一个压低的非语言惊呼，克制真实、有力量、不尖锐刺耳。反应只发生一次，集中在前一秒，随后安静。近距离干声，无清晰字句，无旁白、朗读、音乐、脚步、兵器、背景人群和长混响。'),
    'npc-pain-male': ('男子·受击闷哼', '生成2秒游戏人物反应音效。只有一名成年男子被打中后突然呼气并发出一次短促低沉的痛哼，身体一缩的真实呼吸感，克制、不夸张、不血腥。只反应一次，集中在前一秒，之后安静。不持续呻吟，不哭喊。近距离干声，只有非语言人声，无清晰字句，无撞击、音乐、脚步、其他人声和长混响。'),
    'npc-pain-female': ('女子·受击闷哼', '生成2秒武侠游戏动作音效。一名成年女武者在练武对招中挨了一下，突然呼气并发出一次短促低沉的闷哼，克制、坚韧、自然。前一秒发生一次呼气声，随后安静，不重复、不延长。近距离干声，只包含这一人的非语言反应，不包含可辨认的字句、旁白、音乐、碰撞、脚步、其他人声和长混响。'),
    'npc-alarm-male': ('男子·目击惊叫', '生成2秒游戏人物反应音效。只有一名成年男子亲眼看到近处突然发生打斗，发出一次短而急促的非语言惊叫，随后收声避让。真实的惊吓和紧迫感，不恐怖、不戏剧化，不连续尖叫。反应集中在前一秒。近距离干声，无任何清晰字句，无旁白、朗读、打斗撞击、脚步、音乐、其他人声和长混响。'),
    'npc-alarm-female': ('女子·目击惊叫', '生成2秒游戏人物反应音效。只有一名成年女子亲眼看到近处突然发生打斗，发出一次短而急促的非语言惊叫，随后收声避让。真实的惊吓和紧迫感，有力量，不尖锐刺耳、不恐怖、不戏剧化，不连续尖叫。反应集中在前一秒。近距离干声，无任何清晰字句，无旁白、朗读、打斗撞击、脚步、音乐、其他人声和长混响。'),
    'npc-murmur-male': ('男子二人·低声议论', '生成3秒游戏现场反应音效。两名成年男子看到街上有人被绳子牵着走，先轻微惊讶吸气，再互相压低声音疑惑地议论两句。只有两个人的模糊非语言嘀咕声，听不清任何字词，不要生成可辨认的语言、名字或叫喊。声音短暂自然起伏，结尾收声。近距离干声，无音乐、脚步、器物、其他人群、笑声和长混响。'),
    'npc-murmur-female': ('女子二人·低声议论', '生成3秒游戏现场反应音效。两名成年女子看到街上有人被绳子牵着走，先轻微惊讶吸气，再互相压低声音疑惑地议论两句。只有两个人的模糊非语言嘀咕声，听不清任何字词，不要生成可辨认的语言、名字或叫喊。声音短暂自然起伏，结尾收声。近距离干声，无音乐、脚步、器物、其他人群、笑声和长混响。'),
    'npc-murmur-mixed': ('男女二人·低声议论', '生成3秒游戏现场反应音效。一名成年男子和一名成年女子看到街上有人被绳子牵着走，先轻微惊讶吸气，再互相压低声音疑惑地议论两句。只有这两个人的模糊非语言嘀咕声，听不清任何字词，不要生成可辨认的语言、名字或叫喊。声音短暂自然起伏，结尾收声。近距离干声，无音乐、脚步、器物、其他人群、笑声和长混响。'),
}


def processed(raw, music=False, target=None):
    data, rate = sf.read(io.BytesIO(raw), always_2d=True, dtype='float32')
    if not len(data) or not np.isfinite(data).all():
        raise ValueError('Invalid audio')
    if not music:
        # Remove generation padding; keep the entire transient and natural tail.
        envelope = np.max(np.abs(data), axis=1)
        active = np.flatnonzero(envelope > max(.0001, float(envelope.max()) * .025))
        if not len(active):
            raise ValueError('Silent take')
        data = data[max(0, active[0] - int(rate * .015)):min(len(data), active[-1] + int(rate * .1))]
    rms = max(1e-8, float(np.sqrt(np.mean(data ** 2))))
    peak = max(1e-8, float(np.max(np.abs(data))))
    target = target if target is not None else (-23 if music else -19)
    gain = min(10 ** (target / 20) / rms, 10 ** (-3 / 20) / peak)
    data *= gain
    fade = min(int(rate * (.12 if music else .004)), len(data) // 4)
    data[:fade] *= np.linspace(0, 1, fade)[:, None]
    data[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return data, rate, round(20 * np.log10(gain), 2)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--only', choices=SAMPLES, nargs='+')
    parser.add_argument('--limit', type=int, default=1)
    args = parser.parse_args()
    env = {}
    for line in (ROOT / '.env').read_text(encoding='utf-8-sig').splitlines():
        if '=' in line and not line.strip().startswith('#'):
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    key = os.environ.get('TTS_API_KEY') or env.get('TTS_API_KEY') or env.get('LLM_API_KEY')
    if not key:
        raise SystemExit('Missing gateway credential')
    folder = ROOT / 'assets/audio/world'
    folder.mkdir(parents=True, exist_ok=True)
    manifest_path = folder / 'manifest.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8')) if manifest_path.exists() else {}
    generated = 0
    for name, (title, prompt) in SAMPLES.items():
        if args.only and name not in args.only:
            continue
        payload = dict(model='seed-audio-1.0', text_prompt=prompt,
                       audio_config=dict(format='wav', sample_rate=48000, enable_subtitle=False))
        digest = hashlib.sha256(json.dumps(payload, ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:16]
        raw_path = folder / f'{name}-{digest}-raw.wav'
        if not raw_path.exists():
            if generated >= args.limit:
                break
            request = urllib.request.Request(ENDPOINT, json.dumps(payload, ensure_ascii=False).encode(),
                                             {'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json'})
            try:
                with urllib.request.urlopen(request, timeout=180) as response:
                    result = json.load(response)
            except urllib.error.HTTPError as error:
                try:
                    detail = json.loads(error.read())
                    message = detail.get('message') or detail.get('msg') or detail.get('error', {}).get('message', '')
                    message = str(message).replace(key, '[redacted]')[:240]
                except (ValueError, AttributeError):
                    message = ''
                raise SystemExit(f'Gateway HTTP {error.code}: {message}; stopped without retry') from None
            if not result.get('audio'):
                raise SystemExit(f'No audio returned (code {result.get("code")}); stopped without retry')
            raw_path.write_bytes(base64.b64decode(result['audio'], validate=True))
            generated += 1
        data, rate, gain = processed(raw_path.read_bytes(), name in ('music', 'music-opening', 'city', 'creek', 'flute-poor', 'flute-good', 'music-night', 'music-danger', 'music-prison', 'night', 'night-inn'),
                                     target=-29 if name == 'creek' else None)
        if name == 'step':
            # The model can include several steps despite the prompt. Keep one footfall.
            data = data[:int(rate * .42)]
            fade = min(int(rate * .035), len(data))
            data[-fade:] *= np.linspace(1, 0, fade)[:, None]
        # PCM is supported by all target browsers; keep originals for re-editing.
        output = folder / f'{name}-{digest}.wav'
        sf.write(output, data, rate, subtype='PCM_16')
        # Preserve assets added by another explicit batch while the gateway was working.
        manifest = json.loads(manifest_path.read_text(encoding='utf-8')) if manifest_path.exists() else {}
        manifest[name] = dict(title=title, src='/' + output.relative_to(ROOT).as_posix(),
                              raw=raw_path.name, seconds=round(len(data) / rate, 3),
                              normalizationGainDb=gain, payload=payload, aiGenerated=True,
                              generatedAt=datetime.datetime.now(datetime.timezone.utc).isoformat())
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(json.dumps(dict(id=name, seconds=manifest[name]['seconds'], bytes=output.stat().st_size), ensure_ascii=False), flush=True)


if __name__ == '__main__':
    main()
