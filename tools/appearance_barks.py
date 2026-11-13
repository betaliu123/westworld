"""Explicit, bounded DS generation. Candidates never overwrite the reviewed runtime pack."""
import argparse
import hashlib
import json
import os
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/offline/2026-11-11-appearance-barks'
CAST = {
    'gate_guard': '韩校尉，守关，言简意赅，看衣着但仍按凭据核查，不随口放行。',
    'gate_relief': '周伍长，守关，谨慎实在，语气比韩校尉缓和，不随口放行。',
    'tea_host': '宋茶娘，茶棚主人，利落有分寸，对来客平等，不凭衣着送茶或免钱。',
    'gate_merchant': '赵行商，商旅，留心衣着与生意，精明而不油滑，不编造交易和欠款。',
    'porter': '周大石，花石纲脚夫，关心衣着是否便于出力，朴实，不擅自招工或发车。',
    'scribe': '刻字人，寡言细致，从线条与轮廓看衣着，不谈秘密身份和暗号。',
    'bookseller': '温素笺，修书辨版，敏锐温和，用语清雅但不掉书袋，不评价身材。',
    'traveler': '锦衣客，外在身份是行客，含蓄有眼力，不透露宗室身份、不调情、不许诺。',
    'inspector': '顾钦差，冷静重证据，衣着不会替代凭据，不凭衣服定罪或认同入职。',
    'fu': '符祥，应奉局管事，精于揣度，关心行头和分寸，不虚构招工、同僚、上下级。',
}
CONTEXTS = {
    'runner': '玩家实际穿着差役服或官兵服。允许暂称差爷/这位官差，只是外观判断，不能说已入职、是同僚、奉命或放行。',
    'porter': '玩家实际穿着挑夫短褂，只有装束像脚夫，不代表已受雇、有货、很累或已干活。',
    'skirt': '玩家实际穿裙装。未知性别，不能称姑娘、公子、娘子，不能将裙装与羞耻、犯罪挂钩。',
    'merchant': '玩家实际穿商旅衣着。只看得出商旅打扮，未知姓名、资财、随身货物或行程。',
    'plain': '玩家实际穿普通布衣。只评价衣着/轮廓，不假定贫穷、修补、颜色、刺绣、材质品质。',
    'hat': '玩家实际戴着斗笠。只评价帽檐与面容轮廓，不假定天气，不要求卸帽，不认作有罪。',
}
PROMPT = '''为北宋武侠开放世界写NPC看见玩家装束后的即时短冒泡。仅补措辞，不决定身份、盘问结果、奖励或行动。
输入含指定人物、六种可观察装扮。每个人每种装扮写4句不同短句。只返回JSON {"lines":{"人物ID.runner":["..."],...}}，键必须完整。
每句8到28个字符，中文自然口语，短、轻、有个人辨识度。可以改口称呼或看衣着作一句感想，留出玩家继续走动的空间。
不能说“换了”“又来了”“上次”“刚才还是”“认不出”——没有过去的观察记录。没有证据不得认出原主、说衣物偷来或识破易容。
禁止造天气、颜色、伤病、贫富、每日收入、手上有货、空座、茶温、已送物、账款、人情、能力、后续承诺；不得声称发生了转身/让路/敬礼/递茶等尚未执行动作。
禁止问句、邀约、报价、给任务或要求回答。不要动作括号、内心旁白、系统数值、游戏术语、教学、引号和模板变量。
不称少侠，不默认玩家男女，不评价身材或性吸引力；不贬低劳动者或裙装。不要十人共用套话，不要反复赞漂亮，不用口癖填字。
每句只依据对应装扮现象与说话人的眼光，不写NPC未知的主角身份、面貌秘密或势力。'''


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True).encode()).hexdigest()


def validate(lines, speakers):
    expected = {f'{speaker}.{context}' for speaker in speakers for context in CONTEXTS}
    if set(lines) != expected:
        raise ValueError('Candidate keys do not match the brief')
    for key, variants in lines.items():
        if len(variants) != 4 or any(not isinstance(t, str) or not 8 <= len(t) <= 28 for t in variants):
            raise ValueError(f'Invalid line count or length: {key}')
        if len(set(variants)) != 4:
            raise ValueError(f'Duplicate variants: {key}')


def generate(revise=False):
    cfg = {}
    path = ROOT / '.env'
    if path.exists():
        for line in path.read_text(encoding='utf-8-sig').splitlines():
            if '=' in line and not line.lstrip().startswith('#'):
                key, value = line.split('=', 1)
                cfg[key.strip()] = value.strip().strip('"').strip("'")
    def setting(key, default=''):
        return os.environ.get(key) or cfg.get(key, default)
    if not setting('LLM_API_KEY'):
        raise ValueError('Server LLM_API_KEY is missing')
    OUT.mkdir(parents=True, exist_ok=True)
    speakers = list(CAST)
    for offset in range(0, len(speakers), 2):
        target = OUT / (('revised-' if revise else '') + f'batch-{offset // 2 + 1}.json')
        brief = {'cast': {key: CAST[key] for key in speakers[offset:offset + 2]}, 'contexts': CONTEXTS}
        prompt = PROMPT
        if revise:
            prompt += '''\n这是返修批次。上一批大量机械重复凭据、假定有腰牌/账本/行囊/绑腿、看衣服就断言常年赶路、把裙装说成不能干活，均已否决。
要像人物脱口而出的一句话，有停顿和自己的眼光。每个键严格4句，不是6句。
参考语气但不要逐字复用：宋茶娘见差服：“差爷……瞧我，见这衣裳就顺口叫了。”；脚夫见短褂：“短褂好，抬手不挂袖子。”；刻字人见商旅衣着：“行商的样式，倒也不必配一张笑脸。”；锦衣客见布衣：“布衣也好，少几分拘束。”；顾钦差见差服：“衣冠认得，来历还得另说。”
不用“穿裙子的”“穿成这样的”呼喝别人，不让普通裙装听上去像奇观。不反复宣讲规章。不要要求出示物品；不说免检、让路、免钱。不要求人物位于茶棚/书铺/关口，因为他们会走动。
仅凭衣着推测身份只能用“像/这身打扮”，不得推断过去经历。不要描述步态、天气、旁人的反应和衣裳具体颜色、质量、价格。全部称呼不分男女。
请在返回前逐句删去虚构事实与套话。'''
        body = {'model': setting('LLM_MODEL', 'deepseek-v4-flash'), 'messages': [
            {'role': 'system', 'content': prompt}, {'role': 'user', 'content': json.dumps(brief, ensure_ascii=False)}],
            'temperature': .85 if revise else .8, 'max_tokens': 5000 if revise else 3200, 'thinking': {'type': 'disabled'}}
        request_hash = digest(body)
        if target.exists():
            old = json.loads(target.read_text(encoding='utf-8'))
            if old.get('requestHash') == request_hash:
                print(f'Reused unchanged batch {offset // 2 + 1}', flush=True)
                continue
            raise ValueError('Existing batch has different inputs; choose a new output directory')
        cached_raw = target.with_suffix('.response.txt')
        cached_meta = target.with_suffix('.response-meta.json')
        result = None
        if cached_raw.exists():
            if not cached_meta.exists() or json.loads(cached_meta.read_text(encoding='utf-8')).get('requestHash') != request_hash:
                raise ValueError('Cached response requires matching request metadata')
            raw = cached_raw.read_text(encoding='utf-8')
            meta = json.loads(cached_meta.read_text(encoding='utf-8'))
            result = {'usage': meta.get('usage'), 'choices': [{'finish_reason': meta.get('finishReason')}]}
        else:
            request = urllib.request.Request(setting('LLM_BASE_URL', 'https://ai.leihuo.netease.com').rstrip('/') + '/v1/chat/completions',
                json.dumps(body).encode(), {'Authorization': 'Bearer ' + setting('LLM_API_KEY'), 'Content-Type': 'application/json'})
            with urllib.request.urlopen(request, timeout=55) as response:
                result = json.load(response)
            raw = result['choices'][0]['message']['content'].strip().removeprefix('```json').removeprefix('```').removesuffix('```').strip()
            cached_raw.write_text(raw, encoding='utf-8')
            cached_meta.write_text(json.dumps({'requestHash': request_hash, 'usage': result.get('usage'), 'finishReason': result['choices'][0].get('finish_reason'), 'model': body['model']}, indent=2), encoding='utf-8')
        # The provider sometimes closes the lines object between the two speakers.
        # Repair only that structural boundary, retaining every candidate verbatim.
        repaired = re.sub(r'\]\},"([a-z_]+\.(?:runner|porter|skirt|merchant|plain|hat))":', r'],"\1":', raw)
        lines = json.loads(repaired)['lines']
        # Keep raw candidates for manual review even if a length needs editing.
        pack = {'model': body['model'], 'parameters': {k: body[k] for k in ['temperature', 'max_tokens', 'thinking']},
            'prompt': prompt, 'brief': brief, 'requestHash': request_hash, 'generatedAt': datetime.now(timezone.utc).isoformat(),
            'usage': result.get('usage') if result else None, 'finishReason': result['choices'][0].get('finish_reason') if result else 'cached response; usage unavailable',
            'formatRepair': repaired != raw,
            'lines': lines, 'contentHash': digest(lines), 'reviewed': False}
        target.write_text(json.dumps(pack, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(json.dumps({'batch': offset // 2 + 1, 'model': pack['model'], 'lines': sum(map(len, lines.values())), 'usage': pack['usage']}, ensure_ascii=False), flush=True)


def compile_pack():
    review = json.loads((OUT / 'review.json').read_text(encoding='utf-8'))
    if review.get('reviewed') is not True:
        raise ValueError('Manual content review is required')
    lines, batches = {}, []
    for name in review['batches']:
        path = OUT / name
        batch = json.loads(path.read_text(encoding='utf-8'))
        if review['batches'].get(path.name) != digest(batch['lines']):
            raise ValueError('Review does not match this candidate batch')
        lines.update(batch['lines'])
        batches.append({'file': path.name, 'model': batch['model'], 'requestHash': batch['requestHash'], 'contentHash': batch['contentHash']})
    for key in review.get('droppedKeys', {}):
        del lines[key]
    for key, replacement in review.get('replacements', {}).items():
        context, index = key.rsplit(':', 1)
        lines[context][int(index)] = replacement['text']
    validate(lines, CAST)
    pack = {'version': 1, 'reviewed': True, 'scope': '离线场景装扮短句；不结算身份、关系、奖励或盘问',
        'sources': batches, 'contentHash': digest(lines), 'lines': lines}
    (ROOT / 'assets/appearance-barks.json').write_text(json.dumps(pack, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'reviewedLines': sum(map(len, lines.values())), 'contentHash': pack['contentHash']}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['generate', 'revise', 'compile'])
    args = parser.parse_args()
    try:
        compile_pack() if args.action == 'compile' else generate(args.action == 'revise')
    except Exception as error:
        # Never echo a credential, request headers, or remote response body.
        print('Offline appearance barks failed: ' + type(error).__name__)
        raise SystemExit(1)
