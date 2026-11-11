"""Explicit offline DS brainstorm; credentials stay in the existing server config."""
import json, os, sys, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
cfg = {}
for line in (ROOT / '.env').read_text(encoding='utf-8-sig').splitlines():
    if '=' in line and not line.lstrip().startswith('#'):
        k, v = line.split('=', 1)
        cfg[k.strip()] = v.strip().strip('"').strip("'")
def setting(k, default=''):
    return os.environ.get(k) or cfg.get(k, default)

brief = {
    'traveler': '锦衣客，化名赵闲舟，宋徽宗之弟，微服查税案；与顾钦差、符祥相识。',
    'inspector': '顾钦差，六扇门查案负责人；认得王爷和押纲管事符祥；有自用盘缠和堂内公用物资箱。',
    'fu': '符祥，应奉局管事，押运花石纲；敬畏王爷和钦差，实际持有名册和自己的钱。',
    'others': '周大石听符祥发车命令；韩校尉认识赵行商；周伍长认识韩校尉；茶娘认识赵行商和符祥；捕快认识燕七与顾钦差。',
    'constraints': '面貌判断已由本地检定完成。陌生脸不能获得王爷权限。只转移真实物品和现有钱，不刷钱；物资箱有限库存。拒绝不扣物。信息有来源，口供不是账本。每条需要后来再次见面时的追问。对方不知道玩家在冒充。',
}
prompt = '''为武侠开放世界离线设计冒名交往候选。穷举输入关系中有趣且能以现有事实结算的机会，重点是锦衣客、顾钦差、符祥之间六个方向。输出 JSON {"scenarios":[{"face":"id","observer":"id","intent":"目的","line":"对方接受身份后的12到65字台词","effect":"实际物品/钱/线索/权限变化","followup":"事后追问","conditions":"真实前提"}]}，18至24项。可以有索取盘缠、调取公用物资、索要名册、查案口供、借钱、延期催收、拒绝越权。不要编造已有赐婚、密旨、宴席、远程押人、正式入职或清罪；不写玩家已被识破，不输出实现代码。'''
body = {'model': setting('LLM_MODEL', 'deepseek-v4-flash'), 'messages': [{'role': 'system', 'content': prompt}, {'role': 'user', 'content': json.dumps(brief, ensure_ascii=False)}], 'temperature': .7, 'max_tokens': 6500, 'thinking': {'type': 'disabled'}}
dialogue = '--dialogue' in sys.argv
if dialogue:
    prompt = '''仅写NPC本人说的话，不写玩家的请求。输入人物关系不变。输出JSON {"lines":{"traveler:inspector":"...","traveler:fu":"...","inspector:fu":"...","fu:inspector":"...","inspector:traveler":"...","fu:traveler":"..."}}。键是玩家假扮的面貌:实际说话的NPC。每句30到75字，为NPC核对面貌通过后，承认其身份并接出可选行动。顾对王爷：恭敬称王爷，提到皇兄手诏查临溪税案，可备随身盘缠或堂内现有物资；符对王爷：敬畏称王爷，提到官家的亲弟弟，可交实际名册；符对顾：供查验名册与押运钱；顾对符：职权有界，不给私领公物；王爷对顾：称我闲舟即可，皇兄交办税案，盘缠可借；王爷对符：见过我不必装不识，我奉皇兄手诏查纲运，名册可留下核账。不可添加过去欠款、未有证据、密信内容、新人物、自动赠物或承诺清罪。每句各有性格，不要一律原来如此。'''
    body.update(messages=[{'role': 'system', 'content': prompt}, {'role': 'user', 'content': json.dumps(brief, ensure_ascii=False)}], temperature=.6, max_tokens=2300)
req = urllib.request.Request(setting('LLM_BASE_URL', 'https://ai.leihuo.netease.com').rstrip('/') + '/v1/chat/completions', json.dumps(body).encode(), {'Authorization': 'Bearer ' + setting('LLM_API_KEY'), 'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req, timeout=55) as response:
        data = json.load(response)
    raw = data['choices'][0]['message']['content'].strip().removeprefix('```json').removeprefix('```').removesuffix('```').strip()
    pack = json.loads(raw)
    assert isinstance(pack.get('lines' if dialogue else 'scenarios'), dict if dialogue else list)
    pack.update(model=body['model'], parameters={k: body[k] for k in ['temperature', 'max_tokens', 'thinking']}, prompt=prompt, brief=brief, usage=data.get('usage'), review='候选，未经本地规则接入不得视作已实现')
    path = ROOT / ('docs/plans/2026-11-11-identity-ds-dialogue.json' if dialogue else 'docs/plans/2026-11-11-identity-ds-candidates.json')
    path.parent.mkdir(exist_ok=True)
    path.write_text(json.dumps(pack, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'model': body['model'], 'count': len(pack['lines' if dialogue else 'scenarios']), 'output': str(path)}, ensure_ascii=False))
except Exception as exc:
    print('Offline generation failed: ' + type(exc).__name__)
    raise SystemExit(1)
