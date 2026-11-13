from pathlib import Path
import json,subprocess,argparse,hashlib
parser=argparse.ArgumentParser();parser.add_argument('source',type=Path);args=parser.parse_args()
root=args.source;out=Path('resources/audio/npc');out.mkdir(parents=True,exist_ok=True)
doc=json.loads((root/'assets/audio/npc/manifest.json').read_text())
for i,row in enumerate(doc['entries']):
 source=root/row['url'].lstrip('/');tmp=Path('work')/f'voice-{i}.mp3'
 subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(source),'-ar','24000','-ac','1','-b:a','32k',str(tmp)],check=True)
 data=tmp.read_bytes();filename=hashlib.sha256(data).hexdigest()+'.mp3';(out/filename).write_bytes(data)
 row['originalUrl']=row['url'];row['url']='/assets/audio/npc/'+filename;row['mobileEncoding']={'format':'mp3','sampleRate':24000,'bitrate':32000};tmp.unlink()
(out/'manifest.json').write_text(json.dumps(doc,ensure_ascii=False,separators=(',',':')))
Path('resources/audio/voice-cast.json').write_bytes((root/'assets/audio/voice-cast.json').read_bytes())
print('Packaged voice lines:',len(doc['entries']))
