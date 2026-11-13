from pathlib import Path
import json,subprocess
p=Path('resources/audio/world');m=json.loads((p/'manifest.json').read_text())
for v in m.values():
 src=p/Path(v['src']).name;out=src.with_suffix('.mp3')
 subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(src),'-ar','22050','-ac','1','-b:a','48k',str(out)],check=True)
 v['src']=v['src'].rsplit('.',1)[0]+'.mp3';v.pop('raw',None)
for f in p.glob('*.wav'):f.unlink()
(p/'manifest.json').write_text(json.dumps(m,ensure_ascii=False))
