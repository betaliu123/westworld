"""One explicit offline wording batch; no runtime world state or credentials in output."""
import argparse, hashlib, json, os, re, urllib.request
from pathlib import Path
from datetime import datetime, timezone
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/offline/2026-11-12-item-responses.json'
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--generate',action='store_true');args=parser.parse_args()
    if not args.generate:parser.error('Explicit --generate is required (one request)')
    text=(ROOT/'src/item-response-lines.js').read_text(encoding='utf-8')
    lines=dict(re.findall(r"^ (\w+):'([^']+)'",text,re.M))
    cfg={}
    if (ROOT/'.env').exists():
        for row in (ROOT/'.env').read_text(encoding='utf-8-sig').splitlines():
            if '=' in row and not row.startswith('#'):
                key,value=row.split('=',1);cfg[key.strip()]=value.strip().strip('"').strip("'")
    def setting(key,default=''):return os.environ.get(key) or cfg.get(key,default)
    prompt='为北宋武侠游戏预生成物品反馈。输入的每个键是一条已经确定的本地规则结果，保持其全部事实与立场，只润色为自然直接对白。返回JSON {"lines":{"原键":"一句台词"}}，不增删键。每条不超过65字，称你、不假定性别；不用系统、任务、检定、好感、玩家等词。royal_pass仅是持王府腰牌的来客，不是王爷本人；放行但记下持牌面貌。royal_owner已由在场且清醒的原主否认交付。royal_lost已收到报失但尚未定罪，不能抓贼。其余不得增加承诺、赠物、金钱、秘密或偷窃指控。'
    payload={'model':setting('LLM_MODEL','deepseek-v4-flash'),'temperature':.65,'thinking':{'type':'disabled'},'max_tokens':1200,'messages':[{'role':'system','content':prompt},{'role':'user','content':json.dumps(lines,ensure_ascii=False)}]}
    digest=hashlib.sha256(json.dumps(payload,ensure_ascii=False,sort_keys=True).encode()).hexdigest()
    if OUT.exists():
        print('Candidate batch exists; review it before generating another batch.');return
    if not setting('LLM_API_KEY'):raise RuntimeError('Server key is not configured')
    req=urllib.request.Request(setting('LLM_BASE_URL','https://ai.leihuo.netease.com').rstrip('/')+'/v1/chat/completions',json.dumps(payload).encode(),{'Content-Type':'application/json','Authorization':'Bearer '+setting('LLM_API_KEY')})
    with urllib.request.urlopen(req,timeout=40) as response:result=json.load(response)
    raw=result['choices'][0]['message']['content'].strip().removeprefix('```json').removeprefix('```').removesuffix('```').strip()
    candidates=json.loads(raw)['lines']
    if set(candidates)!=set(lines) or any(not isinstance(v,str) or len(v)>65 for v in candidates.values()):raise ValueError('Invalid candidate keys or line length')
    OUT.parent.mkdir(parents=True,exist_ok=True)
    OUT.write_text(json.dumps({'generatedAt':datetime.now(timezone.utc).isoformat(),'requestHash':digest,'model':payload['model'],'temperature':payload['temperature'],'thinking':payload['thinking'],'maxTokens':payload['max_tokens'],'prompt':prompt,'facts':lines,'candidates':candidates,'reviewed':False},ensure_ascii=False,indent=2),encoding='utf-8')
    print('Saved one candidate batch for editorial review: '+str(OUT.relative_to(ROOT)))
if __name__=='__main__':main()
