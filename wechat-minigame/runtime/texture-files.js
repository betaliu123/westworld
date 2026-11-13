// Native Image keeps a file-backed source: GLTF's onload/revoke happens before
// Three uploads it to WebGL. Keep these bounded model textures across uploads
// and context restores; content-addressing also reuses files across restarts.
export function textureFiles(fs,directory){
 const known=new Set();
 return {
  createObjectURL(blob){
   const bytes=blob.bytes;let hash=2166136261;
   for(const byte of bytes)hash=Math.imul(hash^byte,16777619);
   const ext=/png/.test(blob.type)?'png':/webp/.test(blob.type)?'webp':'jpg';
   const name=`${directory}/jianghu-texture-v2-${(hash>>>0).toString(16)}-${bytes.byteLength}.${ext}`;
   if(!known.has(name)){fs.writeFileSync(name,bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));known.add(name);}
   return name;
  },
  revokeObjectURL(){}
 };
}
