import * as T from '../vendor/three.module.js';

const vertexShader = `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;

// Scene is rendered linear into a half-float target; tone mapping, mist, ink lines and paper are applied here.
const fragmentShader = `
precision highp float;
varying vec2 vUv;
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform vec2 resolution;
uniform float near, far, exposure, daylight, lineWidth, debugView;
uniform vec3 paper, ink;
uniform mat4 projectionInverse, cameraWorld;

float viewZ(vec2 uv){
  float d=texture2D(tDepth,uv).x*2.-1.;
  return 2.*near*far/(far+near-d*(far-near));
}
vec3 aces(vec3 x){
  x*=exposure*.8;
  return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);
}
vec3 srgb(vec3 c){return mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(.0031308,c));}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){
  vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
vec3 worldAt(vec2 uv,float depth){
  vec4 v=projectionInverse*vec4(uv*2.-1.,depth*2.-1.,1.);
  return (cameraWorld*vec4(v.xyz/v.w,1.)).xyz;
}

void main(){
  float depth=texture2D(tDepth,vUv).x;
  vec3 scene=texture2D(tColor,vUv).rgb;
  vec2 px=1./resolution;
  vec2 grain=gl_FragCoord.xy;
  vec3 paperTone=paper*(.55+.45*daylight);
  vec3 c;
  if(depth>.99999){
    c=srgb(clamp(scene,0.,1.));
    float l=dot(c,vec3(.299,.587,.114));
    c=mix(c,vec3(l),.45);
    c=mix(c,paperTone,.3+.25*smoothstep(.45,.0,vUv.y));
  }else{
    c=srgb(aces(scene));
    float z=viewZ(vUv);
    vec3 p=worldAt(vUv,depth);
    float l=dot(c,vec3(.299,.587,.114));
    float vermilion=smoothstep(.06,.25,c.r-max(c.g,c.b));
    c=mix(vec3(l),c,mix(.42,.95,vermilion));
    c=mix(c,c*c*(3.-2.*c),.4);
    c*=paper*1.06;

    // Pencil wobble keeps lines from looking like a vector outline.
    vec2 jitter=(vec2(noise(grain*.09),noise(grain*.09+17.))-.5)*.9;
    vec2 o=px*lineWidth*(.8+.5*noise(grain*.025));
    vec2 j=jitter*px;
    float zl=viewZ(vUv+vec2(-o.x,0)+j),zr=viewZ(vUv+vec2(o.x,0)+j);
    float zu=viewZ(vUv+vec2(0,o.y)+j),zd=viewZ(vUv+vec2(0,-o.y)+j);
    float za=viewZ(vUv+o+j),zb=viewZ(vUv-o+j),zc=viewZ(vUv+vec2(o.x,-o.y)+j),ze=viewZ(vUv+vec2(-o.x,o.y)+j);
    float nearest=min(min(min(zl,zr),min(zu,zd)),min(min(za,zb),min(zc,ze)));
    float silhouette=(z-nearest)/z;
    float crease=(abs(zl+zr-2.*z)+abs(zu+zd-2.*z)+.5*abs(za+zb-2.*z)+.5*abs(zc+ze-2.*z))/z;
    float edge=smoothstep(.03,.09,silhouette)+smoothstep(.05,.16,crease)*.6;
    edge*=1.-smoothstep(25.,75.,z);
    edge*=.65+.35*noise(grain*.18);

    float distanceMist=1.-exp(-max(z-9.,0.)*.022);
    float groundMist=exp(-max(p.y,0.)*.42)*(1.-exp(-max(z-6.,0.)*.05));
    float mist=clamp(distanceMist*.85+groundMist*.4,0.,.92);
    c=mix(c,ink,clamp(edge,0.,1.)*.85*(1.-mist));
    if(debugView>.5){gl_FragColor=vec4(vec3(clamp(edge,0.,1.)),1.);return;}
    c=mix(c,paperTone,mist);
  }
  float fiber=noise(grain*vec2(.5,.08))*.5+noise(grain*.9)*.5;
  c*=.955+.07*fiber;
  vec2 q=vUv-.5;
  c=mix(c,c*vec3(.86,.83,.78),smoothstep(.32,.8,dot(q,q)*2.2));
  gl_FragColor=vec4(c,1.);
}`;

export function inkPost(renderer, scene, camera) {
  const enabled = !/[?&]ink=0\b/.test(globalThis.location?.search || '');
  const depthTexture = new T.DepthTexture(1, 1);
  depthTexture.type = T.UnsignedIntType;
  const target = new T.WebGLRenderTarget(1, 1, {type: T.HalfFloatType, depthTexture});
  const uniforms = {
    tColor: {value: target.texture}, tDepth: {value: depthTexture},
    resolution: {value: new T.Vector2(1, 1)}, near: {value: camera.near}, far: {value: camera.far},
    exposure: {value: renderer.toneMappingExposure}, daylight: {value: 1}, lineWidth: {value: 1.4}, debugView: {value: /[?&]ink=edges\b/.test(globalThis.location?.search || '') ? 1 : 0},
    paper: {value: new T.Color(0xe7dcc4)}, ink: {value: new T.Color(0x2a2b2c)},
    projectionInverse: {value: camera.projectionMatrixInverse}, cameraWorld: {value: camera.matrixWorld},
  };
  uniforms.paper.value.convertLinearToSRGB();
  uniforms.ink.value.convertLinearToSRGB();
  const quad = new T.Mesh(new T.PlaneGeometry(2, 2), new T.ShaderMaterial({uniforms, vertexShader, fragmentShader, depthTest: false, depthWrite: false, toneMapped: false}));
  const screen = new T.Scene(); screen.add(quad);
  const flat = new T.Camera();
  return {
    enabled,
    setSize(width, height) {
      const ratio = renderer.getPixelRatio();
      target.setSize(Math.floor(width * ratio), Math.floor(height * ratio));
      uniforms.resolution.value.set(Math.floor(width * ratio), Math.floor(height * ratio));
      uniforms.lineWidth.value = 1.5 * ratio;
    },
    render(daylight = 1) {
      if (!enabled) { renderer.render(scene, camera); return; }
      uniforms.daylight.value = daylight;
      uniforms.exposure.value = renderer.toneMappingExposure;
      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(screen, flat);
    },
  };
}
