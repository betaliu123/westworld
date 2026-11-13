"""Bake CC0 Quaternius combat to each actual NPC bind pose; no gameplay root motion."""
import importlib.util, json, hashlib, uuid, argparse
from pathlib import Path
import numpy as np
from scipy.spatial.transform import Rotation as R, Slerp

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('rig',Path(__file__).with_name('retarget-motion.py'))
rig=importlib.util.module_from_spec(spec);spec.loader.exec_module(rig)
SOURCE=ROOT/'assets-src/animations/quaternius/UAL1_Standard.glb'
CLIPS={'combat_idle':'Sword_Idle','combat_run':'Jog_Fwd_Loop','flee':'Sprint_Loop','attack':'Sword_Attack','punch':'Punch_Cross','hit':'Hit_Chest','startle':'Hit_Head'}
NAMES={'Hips':'pelvis','Spine':'spine_01','Spine1':'spine_02','Spine2':'spine_03','Neck':'neck_01','Head':'Head'}
for side,suffix in [('Left','l'),('Right','r')]:
 for dst,src in [('Shoulder','clavicle'),('Arm','upperarm'),('ForeArm','lowerarm'),('Hand','hand'),('UpLeg','thigh'),('Leg','calf'),('Foot','foot'),('ToeBase','ball')]:
  NAMES[side+dst]=src+'_'+suffix
 for finger in ['Thumb','Index','Middle','Ring','Pinky']:
  for i in range(1,4):NAMES[side+'Hand'+finger+str(i)]=finger.lower()+'_'+str(i).zfill(2)+'_'+suffix

def bake(source,target,kind):
 mapped={i:source.names[NAMES[name[10:]]] for name,i in target.names.items() if name and name.startswith('mixamorig:') and name[10:] in NAMES}
 hips=target.names['mixamorig:Hips'];src_hips=source.names['pelvis']
 align=R.from_euler('y',90,degrees=True)
 # The generated NPCs are bound in a relaxed A pose, the source in a T pose.
 # Match semantic limb directions before applying animated world-space deltas.
 # Merely copying rest deltas double-folds the elbows behind the back.
 reference=target.world_rest.copy()
 chains=[['Shoulder','Arm','ForeArm','Hand','HandMiddle1']]
 for side in ['Left','Right']:
  for chain in chains:
   for parent,child in zip(chain,chain[1:]):
    i=target.names.get('mixamorig:'+side+parent);k=target.names.get('mixamorig:'+side+child)
    if i not in mapped or k not in mapped:continue
    j=mapped[i];l=mapped[k]
    a=target.world_rest[i].apply(target.nodes[k]['translation']);a/=np.linalg.norm(a)
    b=align.apply(source.world_rest[j].apply(source.nodes[l]['translation']));b/=np.linalg.norm(b)
    cross=np.cross(a,b);length=np.linalg.norm(cross)
    if length>1e-6:reference[i]=R.from_rotvec(cross/length*np.arctan2(length,np.dot(a,b)))*target.world_rest[i]
  # Wrist twist needs a second axis. A single finger direction leaves some
  # models' palms rotated 180 degrees, putting the sword through the body.
  i=target.names['mixamorig:'+side+'Hand'];j=mapped[i]
  def palm_frame(r,hand,middle,index,pinky):
   forward=np.array(r.nodes[middle]['translation']);forward/=np.linalg.norm(forward)
   radial=np.array(r.nodes[index]['translation'])-np.array(r.nodes[pinky]['translation'])
   radial-=forward*np.dot(radial,forward);radial/=np.linalg.norm(radial)
   return np.column_stack([r.world_rest[hand].apply(v) for v in [radial,forward,np.cross(radial,forward)]])
  digits=[target.names['mixamorig:'+side+'Hand'+f+'1'] for f in ['Middle','Index','Pinky']]
  dst=palm_frame(target,i,*digits);src=align.as_matrix()@palm_frame(source,j,*[mapped[d] for d in digits])
  correction=R.from_matrix(src@dst.T);reference[i]=correction*target.world_rest[i]
  for name,k in target.names.items():
   if name and name.startswith('mixamorig:'+side+'Hand') and k!=i:reference[k]=correction*target.world_rest[k]
 def world_positions(local,rot):
  out={}
  def at(i):
   if i not in out:
    p=source.parents.get(i);out[i]=at(p)+rot[p].apply(local[i]) if p is not None else local[i]
   return out[i]
  at(src_hips);return out
 rest_pos=[np.array(n.get('translation',[0,0,0])) for n in source.nodes]
 hip_rest=world_positions(rest_pos,source.world_rest)[src_hips]
 ratio=target.nodes[hips]['translation'][1]/hip_rest[1]
 clips=[]
 for name,source_name in CLIPS.items():
  animation=next(a for a in source.gltf['animations'] if a['name']==source_name)
  channels=[];duration=0
  for c in animation['channels']:
   if c['target']['path']=='scale':continue
   sampler=animation['samplers'][c['sampler']];ts=source.accessor(sampler['input']).ravel();vs=source.accessor(sampler['output'])
   duration=max(duration,float(ts[-1]));channels.append((c['target'],ts,vs))
  times=np.linspace(0,duration,round(duration*24)+1);sampled=[]
  for c,ts,vs in channels:
   sample_times=np.clip(times,ts[0],ts[-1]);sampled.append((c,Slerp(ts,R.from_quat(vs))(sample_times) if c['path']=='rotation' else np.array([np.interp(sample_times,ts,vs[:,i]) for i in range(3)]).T))
  poses={i:[] for i in mapped};positions=[]
  for f in range(len(times)):
   local=source.rest.copy();pos=rest_pos.copy()
   for c,values in sampled:
    if c['path']=='rotation':local[c['node']]=values[f]
    else:pos[c['node']]=values[f]
   src_world=source.world(local);world={}
   def at(i):
    if i not in world:
     p=target.parents.get(i)
     if i in mapped:
      j=mapped[i];delta=src_world[j]*source.world_rest[j].inv();world[i]=align*delta*align.inv()*reference[i]
     else:world[i]=at(p)*target.rest[i] if p is not None else target.rest[i]
    return world[i]
   for i in mapped:
    p=target.parents.get(i);q=(at(p).inv()*at(i)).as_quat() if p is not None else at(i).as_quat()
    if poses[i] and np.dot(poses[i][-1],q)<0:q=-q
    poses[i].append(q)
   hip=np.array(target.nodes[hips]['translation']);hip[1]+=(world_positions(pos,src_world)[src_hips][1]-hip_rest[1])*ratio;positions.append(hip)
  tracks=[]
  for i,qs in poses.items():
   values=np.array(qs);ts=times
   if np.max(np.abs(values-values[0]))<1e-5:values=values[[0,0]];ts=[0,duration]
   tracks.append(dict(name=target.nodes[i]['name'].replace(':','')+'.quaternion',type='quaternion',times=np.round(ts,6).tolist(),values=np.round(values,6).ravel().tolist()))
  tracks.append(dict(name='mixamorigHips.position',type='vector',times=np.round(times,6).tolist(),values=np.round(positions,6).ravel().tolist()))
  clips.append(dict(name=name,uuid=str(uuid.uuid5(uuid.NAMESPACE_URL,f'quaternius/{kind}/{name}')),duration=duration,tracks=tracks))
 return dict(source='https://quaternius.itch.io/universal-animation-library',license='CC0-1.0',sourceSHA256=hashlib.sha256(source.raw).hexdigest(),targetSHA256=hashlib.sha256(target.raw).hexdigest(),rootMotion='in-place XZ',clips=clips)

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--death-only',action='store_true');args=parser.parse_args()
 if args.death_only:CLIPS={'death':'Death01'}
 source=rig.Rig(SOURCE)
 for kind in ['commoner','guard','prince','woman','sandgang','constable','envoy']:
  pack=bake(source,rig.Rig(ROOT/f'src/models/npc-{kind}.glb'),kind)
  pack_name='death' if args.death_only else 'combat'
  (ROOT/f'src/models/npc-{kind}-{pack_name}.json').write_text(json.dumps(pack,separators=(',',':')),encoding='utf8')
  print(kind,[(c['name'],round(c['duration'],2)) for c in pack['clips']])
