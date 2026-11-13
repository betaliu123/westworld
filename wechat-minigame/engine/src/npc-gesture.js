import * as T from '../vendor/three.module.js';

// Actor-local hand goals, in metres for a two-metre person. These are upper-body
// layers over captured breathing/walking, never rotations of the old box arms.
export function handGoals(pose, time = 0) {
  if (!pose) return null;
  const wave = Math.sin(time * 4), kind = pose.kind;
  if (kind === 'ribbon' || kind === 'carry') {
    const lift = kind === 'ribbon' ? T.MathUtils.smoothstep(pose.throwTime || 0, 0, .55) : 0;
    return [[-.28,1.30 + lift*.40,.32 + lift*.14],[.28,1.30 + lift*.40,.32 + lift*.14]];
  }
  if (kind === 'bound') return [[-.08,1.03,.27],[.08,1.03,.27]];
  if (kind === 'clap') { const x = .07 + (1 + Math.sin(time*7))*.07; return [[-x,1.28,.38],[x,1.28,.38]]; }
  if (kind === 'flute') return [[-.15,1.62,.27],[.34,1.57,.31]];
  if (kind === 'sick') return [[-.12,1.01,.20],[.13,1.08,.24]];
  if (kind === 'eat' || kind === 'drink') return [null,[.09,1.72 + wave*.025,.23]];
  if (kind === 'pour') return [null,[.32,1.13,.46]];
  if (kind === 'reach' || kind === 'care') return [null,[.20,1.13 + wave*.025,.46]];
  return null;
}

function aimBone(bone, end, goal) {
  bone.updateWorldMatrix(true, true);
  const origin = bone.getWorldPosition(new T.Vector3());
  const from = end.getWorldPosition(new T.Vector3()).sub(origin).normalize();
  const to = goal.clone().sub(origin).normalize();
  const rotation = new T.Quaternion().setFromUnitVectors(from, to);
  rotation.multiply(bone.getWorldQuaternion(new T.Quaternion()));
  bone.quaternion.copy(bone.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(rotation));
  bone.updateWorldMatrix(false, true);
}

export function solveArm(upper, fore, hand, target, pole, weight = 1) {
  upper.updateWorldMatrix(true, true);
  const oldUpper = upper.quaternion.clone(), oldFore = fore.quaternion.clone();
  const shoulder = upper.getWorldPosition(new T.Vector3());
  const elbow = fore.getWorldPosition(new T.Vector3()), wrist = hand.getWorldPosition(new T.Vector3());
  const a = shoulder.distanceTo(elbow), b = elbow.distanceTo(wrist);
  if (a < .001 || b < .001) return;
  const direction = target.clone().sub(shoulder), distance = T.MathUtils.clamp(direction.length(), Math.abs(a-b)+.002, (a+b)*.94);
  direction.normalize();
  const bend = pole.clone().sub(shoulder); bend.addScaledVector(direction, -bend.dot(direction)).normalize();
  const along = (a*a - b*b + distance*distance)/(2*distance);
  const elbowGoal = shoulder.clone().addScaledVector(direction, along).addScaledVector(bend, Math.sqrt(Math.max(0,a*a-along*along)));
  aimBone(upper, fore, elbowGoal);
  aimBone(fore, hand, shoulder.clone().addScaledVector(direction,distance));
  upper.quaternion.slerpQuaternions(oldUpper, upper.quaternion.clone(), weight);
  fore.quaternion.slerpQuaternions(oldFore, fore.quaternion.clone(), weight);
  upper.updateWorldMatrix(false,true);
}

export class NpcGesture {
  constructor(actor, model, height) {
    this.actor=actor; this.scale=height/2; this.time=0;
    const aliases={Hips:'Hip',RightArm:'R_Upperarm',RightForeArm:'R_Forearm',RightHand:'R_Hand',LeftArm:'L_Upperarm',LeftForeArm:'L_Forearm',LeftHand:'L_Hand'};
    const bone=name=>model.getObjectByName('mixamorig'+name)||model.getObjectByName(aliases[name]||name);
    this.hips=bone('Hips');
    this.hipRest=actor.worldToLocal(this.hips.getWorldPosition(new T.Vector3())).y;
    // Goal signs are discovered from this skeleton, not assumed from source axes.
    this.arms=['Right','Left'].map(side=>({upper:bone(side+'Arm'),fore:bone(side+'ForeArm'),hand:bone(side+'Hand'),fingers:bone(side+'HandMiddle1'),weight:0,goal:null}));
  }
  update(dt, pose, active) {
    this.time+=dt;
    if (!active) { for(const arm of this.arms){arm.weight=0;arm.goal=null;} return; }
    const next=handGoals(pose,this.time);
    if(!next&&this.arms.every(arm=>arm.weight<.001)){for(const arm of this.arms)arm.weight=0;return;}
    const blend=1-Math.exp(-14*dt);
    this.actor.updateWorldMatrix(true,true);
    const hipOffset=this.actor.worldToLocal(this.hips.getWorldPosition(new T.Vector3())).y-this.hipRest;
    for(const arm of this.arms) {
      if(!arm.hand)continue;
      const local=this.actor.worldToLocal(arm.upper.getWorldPosition(new T.Vector3())),side=local.x<0?-1:1;
      const requested=next?.[side<0?0:1];
      arm.weight+=(Number(!!requested)-arm.weight)*blend;
      if(requested){
        const goal=new T.Vector3(...requested).multiplyScalar(this.scale);
        if(arm.goal)arm.goal.lerp(goal,blend);else arm.goal=goal;
      }
      if(!arm.goal||arm.weight<.001)continue;
      const pole=new T.Vector3(side*.65*this.scale,1.25*this.scale,-.12*this.scale);
      const goal=arm.goal.clone();goal.y+=hipOffset;pole.y+=hipOffset;
      solveArm(arm.upper,arm.fore,arm.hand,this.actor.localToWorld(goal),this.actor.localToWorld(pole),arm.weight);
      if(requested){
        const direction=['ribbon','carry','clap'].includes(pose.kind)?new T.Vector3(-side*.15,.5,.7):new T.Vector3(-side*.1,0,1);
        if(arm.fingerDirection)arm.fingerDirection.lerp(direction,blend);else arm.fingerDirection=direction;
      }
      if(arm.fingers&&arm.fingerDirection){
        const old=arm.hand.quaternion.clone(),wrist=arm.hand.getWorldPosition(new T.Vector3());
        const direction=arm.fingerDirection.clone().applyQuaternion(this.actor.getWorldQuaternion(new T.Quaternion()));
        aimBone(arm.hand,arm.fingers,wrist.add(direction));
        arm.hand.quaternion.slerpQuaternions(old,arm.hand.quaternion.clone(),arm.weight);
      }
    }
  }
  handPoint(side = 1) {
    const arm=this.arms.find(a=>Math.sign(this.actor.worldToLocal(a.upper.getWorldPosition(new T.Vector3())).x)===side);
    return arm?.hand.getWorldPosition(new T.Vector3());
  }
  betweenHands() {
    const a=this.handPoint(-1),b=this.handPoint(1);
    return a&&b?a.add(b).multiplyScalar(.5):null;
  }
}
