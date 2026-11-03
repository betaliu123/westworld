export function wareMesh(T,sku){
 const g=new T.Group();function add(geo,col,x,y,z){const m=new T.Mesh(geo,new T.MeshStandardMaterial({color:col}));m.position.set(x,y,z);g.add(m);return m;}
 if(sku==='flute'){const tube=add(new T.CylinderGeometry(.055,.055,.85,10),0x603c46,0,.035,0);tube.rotation.z=Math.PI/2;for(let i=0;i<6;i++)add(new T.CylinderGeometry(.019,.019,.008,8),0x201917,i*.084-.16,.091,0);}
 else{const rect=(w,h,d,c,x,y,z)=>add(new T.BoxGeometry(w,h,d),c,x,y,z);rect(.59,.08,.42,0xe6d8b9,0,0,0);rect(.62,.025,.45,sku==='boxing'?0x44445c:0x457368,0,.055,0);rect(.07,.009,.25,0xe7d7ae,.19,.073,0);for(let i=0;i<4;i++)rect(.075,.012,.02,0xd1be99,-.26,.075,i*.09-.14);}
 return g;}
