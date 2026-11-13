import * as T from '../vendor/three.module.js';
// Independent scene/HUD budgets. HDR retains ACES exposure; tone mapping runs
// once on the final scene quad, before the full-resolution HUD.
export function mobileScene(renderer,scene,camera,display){
 const supported=renderer.capabilities.isWebGL2&&renderer.extensions.has('EXT_color_buffer_float');
 const target=supported?new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:true,stencilBuffer:false,samples:2}):null;
 const screen=new T.Scene(),flat=new T.Camera();
 if(target){target.texture.generateMipmaps=false;screen.add(new T.Mesh(new T.PlaneGeometry(2,2),new T.MeshBasicMaterial({map:target.texture,depthTest:false,depthWrite:false})));}
 return {enabled:!!target,
  setSize(w,h){if(target)target.setSize(Math.round(w*display.sceneRatio),Math.round(h*display.sceneRatio));},
  render(){
   if(!target||display.sceneRatio>=display.hudRatio){renderer.setRenderTarget(null);renderer.render(scene,camera);return;}
   renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(screen,flat);
  }
 };
}
