"""Small, reviewed offline DS dialogue pack. No runtime AI authority over rules."""
import json, os, urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
cfg={}
for line in (ROOT/'.env').read_text(encoding='utf-8-sig').splitlines():
 if '=' in line and not line.lstrip().startswith('#'):
  k,v=line.split('=',1);cfg[k.strip()]=v.strip().strip('\"').strip("'")
def setting(k,d=''):return os.environ.get(k) or cfg.get(k,d)
styles={'official':'守关官兵，谨慎、按规矩核对','noble':'微服宗室，含蓄、有眼力，不轻佻','host':'茶娘，务实、看惯过客','trader':'商贩，机灵，先顾生意'}
prompt='''为北宋武侠游戏写少量易容盘问台词。只措辞，不决定掷骰结果、金钱、声望、剧情。返回JSON {"lines":{"official.question":["…","…"],...}}。
不要模板化四人说同一句。官兵讲规矩，宗室谈眼光，茶娘关心茶钱与招待，商贩关注衣料与价格。四种人设见输入。每种 question（看见熟悉男子赵行商穿着女装，与旧日印象不同，评价衣着并礼貌追问，不歧视性别、不把女装说成犯罪）；success（解释检定已成功，放下疑心）；failure（已发现具体假面破绽如耳后易容膏、脸色和颈色不同，只指出假面，不要求脱衣；不得因为男性穿女装、举止不女性化就认定是假冒）。各2句。每句12到45汉字。不写动作括号，不写系统数字，不称玩家少侠，不造具体身份/历史/犯罪事实，不用现代用语。'''
body={'model':setting('LLM_MODEL','deepseek-v4-flash'),'messages':[{'role':'system','content':prompt},{'role':'user','content':json.dumps(styles,ensure_ascii=False)}],'temperature':.7,'max_tokens':1700,'thinking':{'type':'disabled'}}
req=urllib.request.Request(setting('LLM_BASE_URL','https://ai.leihuo.netease.com').rstrip('/')+'/v1/chat/completions',json.dumps(body).encode(),{'Authorization':'Bearer '+setting('LLM_API_KEY'),'Content-Type':'application/json'})
try:
 with urllib.request.urlopen(req,timeout=55) as response:data=json.load(response)
 raw=data['choices'][0]['message']['content'].strip().removeprefix('```json').removeprefix('```').removesuffix('```').strip()
 pack=json.loads(raw);lines=pack.get('lines',{})
 expected={a+'.'+b for a in styles for b in ['question','success','failure']}
 assert set(lines)==expected,'incorrect keys'
 for key,values in lines.items():
  assert len(values)==2 and all(isinstance(t,str) and 10<=len(t)<=60 and not any(w in t for w in ['成功率','声望','检定','女装癖','变态','下贱']) for t in values),'invalid dialogue'
 pack['model']=body['model'];pack['usage']=data.get('usage');pack['scope']='离线措辞；不参与身份、检定、归因结算'
 (ROOT/'assets/disguise-reactions.json').write_text(json.dumps(pack,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps({'model':pack['model'],'lines':sum(map(len,lines.values())),'usage':pack['usage']},ensure_ascii=False))
except Exception as e:
 print('Offline dialogue generation failed:',type(e).__name__);raise SystemExit(1)
