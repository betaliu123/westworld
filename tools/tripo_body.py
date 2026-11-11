"""Two wardrobe base bodies through the Leihuo Tripo gateway. No keys in output."""
import json, os, sys, urllib.request, urllib.error
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
for line in (ROOT / '.env').read_text(encoding='utf-8-sig').splitlines():
    if '=' in line and not line.lstrip().startswith('#'):
        key, value = line.split('=', 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))
OUT = ROOT / 'assets-src' / 'wardrobe-bodies'
OUT.mkdir(parents=True, exist_ok=True)
BASE = 'https://ai.leihuo.netease.com/tripo3d/v3/task'
PROMPTS = {
 'male': 'Full body realistic adult Chinese man, Northern Song dynasty commoner, bare chest, lean natural anatomy, plain ivory loose linen trousers reaching ankles, simple cloth shoes, black hair topknot. Neutral symmetrical A pose, arms 35 degrees away from body, hands open, legs slightly apart. Single game character, clean sculpted anatomy, muted earthy colors, complete head hands feet, no accessories, no background or base.',
 'female': 'Full body realistic adult Chinese woman, Northern Song dynasty commoner, modest opaque ivory linen inner clothing: plain long sleeved cross collar blouse fully covering chest and torso, tied waist, loose ivory trousers reaching ankles, simple cloth shoes, black hair bun. Neutral symmetrical A pose, arms 35 degrees away from body, hands open, legs slightly apart. Single game character, muted earthy colors, complete head hands feet, no accessories, no background or base.',
}
def request(url, payload=None):
    data = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, headers={'Authorization': 'Bearer '+os.environ.get('TRIPO_API_KEY', os.environ.get('LLM_API_KEY', '')), 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=90) as r: return json.load(r)
    except urllib.error.HTTPError as e:
        print('HTTP', e.code, e.read().decode()[:700]); sys.exit(1)
mode, who = sys.argv[1:3]
file = OUT / (who + '-task.json')
if mode == 'create':
    if file.exists(): print('Existing task retained:', who); sys.exit()
    payload = {'model':'tripo-v3.1-20260211','type':'text_to_model','model_version':'v3.1-20260211','prompt':PROMPTS[who], 'negative_prompt':'cartoon, chibi, doll, armor, sword, cloak, extra limbs, pedestal, nudity below waist', 'texture':True,'pbr':True,'face_limit':15000}
    result = request(BASE, payload)
    if not result.get('data', {}).get('task_id'): print(json.dumps(result,ensure_ascii=False)[:800]);sys.exit(1)
    file.write_text(json.dumps({'request':payload,'response':result},ensure_ascii=False,indent=2), encoding='utf-8')
    print(who, 'submitted', result['data']['task_id'])
elif mode == 'status':
    record=json.loads(file.read_text(encoding='utf-8')); result=request(BASE+'/'+record['response']['data']['task_id'])
    (OUT/(who+'-result.json')).write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    d=result.get('data',{});print(who, d.get('status'),d.get('progress'), 'outputs:', list(d.get('output',{})))
    if d.get('status')=='failed': print(str(d.get('error',d))[:700])
