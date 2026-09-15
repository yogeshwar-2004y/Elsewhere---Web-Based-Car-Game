import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function createModelBuilder() {
  const geometries=new Set(),materials=new Set(),textures=new Set();
  const own=g=>(geometries.add(g),g);
  const material=(color,props={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.48,...props});materials.add(m);return m;};
  const mesh=(parent,geo,mat,position=[0,0,0])=>{own(geo);const m=new THREE.Mesh(geo,mat);m.position.set(...position);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
  const box=(parent,mat,pos,size,radius=0)=>mesh(parent,radius?new RoundedBoxGeometry(...size,2,Math.min(radius,...size.map(x=>x*.45))):new THREE.BoxGeometry(...size),mat,pos);
  const sphere=(parent,mat,pos,size)=>{const m=mesh(parent,new THREE.SphereGeometry(1,24,12),mat,pos);m.scale.set(...size);return m;};
  const beam=(parent,mat,a,b,radius=.015,sides=8)=>{
    const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),delta=to.clone().sub(from);
    const m=mesh(parent,new THREE.CylinderGeometry(radius,radius,delta.length(),sides),mat,from.add(to).multiplyScalar(.5).toArray());m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;
  };
  const path=(parent,mat,points,radius=.012,closed=false)=>{
    for(let i=0;i<points.length-1;i++)beam(parent,mat,points[i],points[i+1],radius,6);
    if(closed)beam(parent,mat,points.at(-1),points[0],radius,6);
  };
  const panel=(parent,mat,points)=>{
    const positions=points.flat(),indices=[];for(let i=1;i<points.length-1;i++)indices.push(0,i,i+1);
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();return mesh(parent,geo,mat);
  };
  const disc=(parent,mat,pos,radius,depth,normal=[0,0,1],segments=32)=>{
    const m=mesh(parent,new THREE.CylinderGeometry(radius,radius,depth,segments),mat,pos);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(...normal).normalize());return m;
  };
  const torus=(parent,mat,pos,radius,tube,normal=[0,0,1],arc=Math.PI*2)=>{
    const m=mesh(parent,new THREE.TorusGeometry(radius,tube,8,40,arc),mat,pos);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(...normal).normalize());return m;
  };
  function bodyShell(parent,mat,stations,spec,cabin) {
    const positions=[],indices=[],rings=[],step=.09,ringCount=spec.id==='porsche'?12:10;
    const sample=z=>{let k=0;while(k<stations.length-2&&stations[k+1][0]<z)k++;const a=stations[k],b=stations[k+1],t=Math.max(0,Math.min(1,(z-a[0])/(b[0]-a[0])));return a.map((v,i)=>i?v+(b[i]-v)*t:z);};
    const start=stations[0][0],end=stations.at(-1)[0],count=Math.ceil((end-start)/step);
    for(let i=0;i<=count;i++) {
      const z=start+(end-start)*i/count,[,w,bottom,belt,crown]=sample(z);
      let cut=bottom+.035;
      for(const axle of [-spec.wheelbase/2,spec.wheelbase/2]){const d=Math.abs(z-axle),r=spec.wheelRadius+.075;if(d<r)cut=Math.max(cut,spec.wheelRadius+Math.sqrt(r*r-d*d));}
      const sideTop=Math.max(belt-.045,cut+.045);
      const noseBulge=spec.id==='porsche'?Math.exp(-Math.pow((z+1.73)/.40,2))*.16:0;
      const ring=spec.id==='porsche'?
        [[-w*.76,bottom],[w*.76,bottom],[w,cut],[w,sideTop],[w*.94,belt],[w*.79,Math.max(crown,belt-.01)+noseBulge],[w*.48,crown],[-w*.48,crown],[-w*.79,Math.max(crown,belt-.01)+noseBulge],[-w*.94,belt],[-w,sideTop],[-w,cut]]:
        [[-w*.76,bottom],[w*.76,bottom],[w,cut],[w,sideTop],[w*.9,belt],[w*.76,crown],[-w*.76,crown],[-w*.9,belt],[-w,sideTop],[-w,cut]];
      rings.push(z);for(const [x,y] of ring)positions.push(x,y,z);
    }
    for(let i=0;i<count;i++)for(let j=0;j<ringCount;j++){
      // Leave the cabin floor open under the dashboard and seats.
      if((spec.id==='porsche'?j>=5&&j<=7:j===5)&&rings[i]>=cabin[0]&&rings[i+1]<=cabin[1])continue;
      const a=i*ringCount+j,b=i*ringCount+(j+1)%ringCount,c=a+ringCount,d=b+ringCount;indices.push(a,b,c,b,d,c);
    }
    for(let j=1;j<ringCount-1;j++){indices.push(0,j+1,j);const k=count*ringCount;indices.push(k,k+j,k+j+1);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();return mesh(parent,geo,mat);
  }
  function roof(parent,mat,sections) {
    const pos=[],idx=[],cols=16;
    for(const [z,w,h]of sections)for(let j=0;j<=cols;j++){const t=j/cols*2-1;pos.push(t*w,h+(1-t*t)*.04,z);}
    for(let i=0;i<sections.length-1;i++)for(let j=0;j<cols;j++){const a=i*(cols+1)+j;idx.push(a,a+cols+1,a+1,a+1,a+cols+1,a+cols+2);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();return mesh(parent,geo,mat);
  }
  function label(parent,text,pos,width,height,{color='#efe8cf',background='#242b2b',font='600 48px sans-serif'}={}) {
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=Math.max(64,Math.round(512*height/width));
    const ctx=canvas.getContext('2d');ctx.fillStyle=background;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle=color;ctx.font=font;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,canvas.height/2,490);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;textures.add(texture);
    const mat=material('#ffffff',{map:texture,roughness:.75});return mesh(parent,new THREE.PlaneGeometry(width,height),mat,pos);
  }
  function batch(group) {
    group.updateWorldMatrix(true,true);const inverse=group.matrixWorld.clone().invert(),buckets=new Map(),remove=[];
    function visit(node){if(node!==group&&node.userData.movable)return;for(const child of node.children)visit(child);if(!node.isMesh||Array.isArray(node.material))return;let geo=node.geometry.clone();if(geo.index){const indexed=geo;geo=geo.toNonIndexed();indexed.dispose();}if(!node.material.map)geo.deleteAttribute('uv');geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,node.matrixWorld));let list=buckets.get(node.material);if(!list)buckets.set(node.material,list=[]);list.push(geo);remove.push(node);}
    visit(group);for(const m of remove)m.removeFromParent();
    for(const [mat,list]of buckets){const merged=mergeGeometries(list,false);if(merged){mesh(group,merged,mat);list.forEach(g=>g.dispose());}}
  }
  function dispose(){geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}
  return {geometries,materials,textures,material,mesh,box,sphere,beam,path,panel,disc,torus,bodyShell,roof,label,batch,dispose};
}
