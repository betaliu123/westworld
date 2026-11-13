export class TouchRouter {
 constructor({key,camera,tap}){Object.assign(this,{key,camera,tap});this.fingers=new Map();this.held=new Set();}
 hold(code,yes){if(yes&&!this.held.has(code)){this.held.add(code);this.key(code,'keydown');}else if(!yes&&this.held.delete(code))this.key(code,'keyup');}
 stick(dx,dy){const dead=12;this.hold('KeyW',dy < -dead);this.hold('KeyS',dy>dead);this.hold('KeyA',dx < -dead);this.hold('KeyD',dx>dead);this.hold('ShiftLeft',Math.hypot(dx,dy)>52);}
 start(t,zone){if(zone.kind==='stick'&&[...this.fingers.values()].some(f=>f.kind==='stick'))zone={kind:'ignored'};this.fingers.set(t.identifier,{...zone,x:t.clientX,y:t.clientY,lastX:t.clientX,lastY:t.clientY});if(zone.kind==='hold')this.hold(zone.code,true);}
 move(t){const f=this.fingers.get(t.identifier);if(!f)return;const x=t.clientX,y=t.clientY;if(f.kind==='stick')this.stick(x-f.x,y-f.y);if(f.kind==='camera')this.camera(x-f.lastX,y-f.lastY);if(['button','scroll'].includes(f.kind)&&Math.hypot(x-f.x,y-f.y)>10)f.moved=true;if(f.kind==='scroll'||(f.kind==='button'&&f.moved))f.move?.(y-f.lastY);f.lastX=x;f.lastY=y;}
 end(t){const f=this.fingers.get(t.identifier);if(!f)return;if(['button','scroll'].includes(f.kind)&&!f.moved&&Math.hypot(t.clientX-f.x,t.clientY-f.y)<10)f.action?.();if(f.kind==='stick')this.stick(0,0);if(f.kind==='hold')this.hold(f.code,false);if(f.kind==='camera'&&Math.hypot(t.clientX-f.x,t.clientY-f.y)<9)this.tap(t.clientX,t.clientY);this.fingers.delete(t.identifier);}
 cancel(){for(const code of [...this.held])this.hold(code,false);this.fingers.clear();}
}
export const hit=(r,x,y)=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h;
