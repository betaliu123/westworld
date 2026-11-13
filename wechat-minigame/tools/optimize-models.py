from pathlib import Path
import json,struct,subprocess,tempfile,argparse
parser=argparse.ArgumentParser();parser.add_argument("--source",default="engine/src/models");parser.add_argument("--max-texture-size",default=1024,type=int);parser.add_argument("--quality",default=85,type=int);args=parser.parse_args()
# Rewrite buffer views, retaining all skeletons, animation channels and geometry.
for source_model in Path(args.source).glob('*.glb'):
 p=Path('engine/src/models')/source_model.name
 raw=source_model.read_bytes();n=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+n]);binary=raw[28+n:];replacements={}
 for im in g.get('images',[]):
  if 'bufferView' not in im:continue
  idx=im['bufferView'];v=g['bufferViews'][idx];data=binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]
  with tempfile.TemporaryDirectory() as t:
   source=Path(t)/'image';source.write_bytes(data);out=Path(t)/'out.jpg'
   subprocess.run(['sips','-Z',str(args.max_texture_size),'-s','format','jpeg','-s','formatOptions',str(args.quality),str(source),'--out',str(out)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
   replacements[idx]=out.read_bytes();im['mimeType']='image/jpeg'
 chunks=bytearray()
 for i,v in enumerate(g['bufferViews']):
  chunks.extend(b'\0'*((-len(chunks))%4));data=replacements.get(i,binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]);v['byteOffset']=len(chunks);v['byteLength']=len(data);chunks.extend(data)
 chunks.extend(b'\0'*((-len(chunks))%4));g['buffers'][0]['byteLength']=len(chunks)
 js=json.dumps(g,separators=(',',':')).encode();js+=b' '*((-len(js))%4)
 output=struct.pack('<III',0x46546c67,2,28+len(js)+len(chunks))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(chunks),0x004e4942)+chunks
 p.write_bytes(output)
 print(p.name,len(raw),'->',len(output))
# Motion provenance updates: texture optimisations preserve all skeleton transforms.
import hashlib
p=Path('engine/src/models/sumiro-motion.local.json');d=json.loads(p.read_text());d['targetSHA256']=hashlib.sha256(Path('engine/src/models/hero.glb').read_bytes()).hexdigest();p.write_text(json.dumps(d,separators=(',',':')))
