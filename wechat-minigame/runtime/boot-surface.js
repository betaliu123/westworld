import {drawLoading} from './loading-view.js';
// The screen keeps its WebGL context for Three. Only the texture source uses 2D.
export function bootSurface(wx,canvas,state){
 const info=wx.getWindowInfo?wx.getWindowInfo():wx.getSystemInfoSync(),w=info.windowWidth,h=info.windowHeight,ratio=Math.min(info.pixelRatio||1,2);
 canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);
 const gl=canvas.getContext('webgl2',{antialias:false})||canvas.getContext('webgl',{antialias:false});
 if(!gl)throw Error('WebGL unavailable');
 const surface=wx.createCanvas();surface.width=canvas.width;surface.height=canvas.height;const c=surface.getContext('2d');
 const shader=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
 const vs=shader(gl.VERTEX_SHADER,'attribute vec2 p;varying vec2 uv;void main(){uv=vec2((p.x+1.)*.5,(1.-p.y)*.5);gl_Position=vec4(p,0.,1.);}');
 const fs=shader(gl.FRAGMENT_SHADER,'precision mediump float;uniform sampler2D tex;varying vec2 uv;void main(){gl_FragColor=texture2D(tex,uv);}');
 const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
 const buffer=gl.createBuffer(),texture=gl.createTexture(),attribute=gl.getAttribLocation(program,'p');let disposed=false,layout;
 const touch=e=>{if(!state.error||disposed)return;for(const t of e.changedTouches||[]){const b=layout?.retry;if(b&&t.clientX>=b.x&&t.clientX<=b.x+b.w&&t.clientY>=b.y&&t.clientY<=b.y+b.h)state.retry?.();}};
 wx.onTouchEnd(touch);
 return {paint(){
  if(disposed)return;c.setTransform(ratio,0,0,ratio,0,0);layout=drawLoading(c,w,h,state);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,canvas.width,canvas.height);gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);gl.enableVertexAttribArray(attribute);gl.vertexAttribPointer(attribute,2,gl.FLOAT,false,0,0);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,surface);gl.uniform1i(gl.getUniformLocation(program,'tex'),0);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
 },dispose(){disposed=true;wx.offTouchEnd?.(touch);gl.disableVertexAttribArray(attribute);gl.bindBuffer(gl.ARRAY_BUFFER,null);gl.bindTexture(gl.TEXTURE_2D,null);gl.useProgram(null);gl.deleteBuffer(buffer);gl.deleteTexture(texture);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);}};
}
