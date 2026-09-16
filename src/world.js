import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createRoad, randomAt, noise2, clamp } from './dynamics.js';
import { createVegetation, resolveVegetation } from './scenery.js';
export const THEMES = {
  alpine: { name:'Alpine Hills', location:'THE QUIET SIDE OF THE ALPS', caption:'Green hills. A little fresh air.', sky:'#bfdbdb', horizon:'#e8edda', land:'#79965c', light:'#fff4cc', fog:'#c4d5be', accent:'#567150', ambient:'Forest breeze', water:'#78aaa6' },
  desert: { name:'Desert Canyon', location:'SOMEWHERE IN THE SOUTHWEST', caption:'Warm earth. Wide-open skies.', sky:'#afd2d8', horizon:'#efd6b3', land:'#bd8050', light:'#ffe0a4', fog:'#d8ad88', accent:'#a46946', ambient:'Desert wind', water:'#b9a378' },
  coastal: { name:'Coastal Cliffs', location:'WHERE THE LAND MEETS THE SEA', caption:'Salt air. Endless blue.', sky:'#b7d5df', horizon:'#e2e7dd', land:'#8eaa7d', light:'#fff7de', fog:'#b9d2d4', accent:'#638e93', ambient:'Ocean waves', water:'#6bacae' },
};
const CHUNK=160;

const object = new THREE.Object3D();
const vertexColor=new THREE.Color();
function geometryFrom(positions, colors, indices) {
  let geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  if(colors.length)geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);
  geometry=geometry.toNonIndexed();geometry.computeVertexNormals();return geometry;
}
function mergeParts(parts){const result=mergeGeometries(parts);parts.forEach(g=>g.dispose());return result;}
function makePine() {
  return mergeParts([[1.45,2.6,2.3],[1.15,2.7,3.7],[.78,2.4,5]].map(([r,h,y])=>{const g=new THREE.ConeGeometry(r,h,9);g.translate(0,y,0);return g;}));
}
function makeCoastalTree(){
  return mergeParts([[-.65,3.0,0,1.5,.85,1.25],[.7,3.4,.15,1.65,.92,1.3],[0,4.05,0,1.35,.85,1.15]].map(([x,y,z,sx,sy,sz])=>{const g=new THREE.IcosahedronGeometry(1,1);g.scale(sx,sy,sz);g.translate(x,y,z);return g;}));
}
function makeCactus() {
  const parts=[];
  const segment=(radius,length,x,y,z=0)=>{const g=new THREE.CylinderGeometry(radius*.9,radius,length,10);g.translate(x,y,z);parts.push(g);};
  const cap=(r,x,y,z=0)=>{const g=new THREE.SphereGeometry(r,10,6);g.translate(x,y,z);parts.push(g);};
  segment(.28,3.7,0,1.85);cap(.255,0,3.7);
  for(const [side,height,length]of [[1,1.55,1.3],[-1,2.1,.8]]){
    const x=side*.7,join=new THREE.CylinderGeometry(.16,.19,.7,10);join.rotateZ(Math.PI/2);join.translate(x/2,height,0);parts.push(join);cap(.19,x,height);
    segment(.19,length,x,height+length/2);cap(.17,x,height+length);
  }
  return mergeParts(parts);
}
export class World {
  constructor(scene, seed, theme, quality='high') {
    this.scene=scene;this.root=new THREE.Group();scene.add(this.root);this.chunks=new Map();this.exploration=new Map();this.quality=quality;
    this.timeUniform={value:0};this.originUniform={value:0};this.pineGeometry=makePine();this.coastalTreeGeometry=makeCoastalTree();this.cactusGeometry=makeCactus();this.trunkGeometry=new THREE.CylinderGeometry(.13,.25,3.1,8);this.trunkGeometry.translate(0,1.5,0);
    this.rockGeometry=new THREE.DodecahedronGeometry(1,0);
    this.setEnvironment(seed,theme);
  }
  setEnvironment(seed,theme) {
    this.clear();this.theme=theme;this.palette=THEMES[theme];this.road=createRoad(seed,theme);
    this.terrainMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true});
    this.roadMaterial=new THREE.MeshStandardMaterial({color:theme==='desert'?'#66655d':'#626a62',roughness:.96});
    this.lineMaterial=new THREE.MeshStandardMaterial({color:'#e9e6c7',roughness:1});
    this.treeMaterial=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1,flatShading:true});
    this.trunkMaterial=new THREE.MeshStandardMaterial({color:'#6c6650',roughness:1});
    this.rockMaterial=new THREE.MeshStandardMaterial({color:theme==='desert'?'#ad6d44':'#919b85',roughness:1,flatShading:true});
    this.detailMaterial=new THREE.MeshStandardMaterial({color:'#c2baa0',roughness:.92});
    this.waterMaterial=new THREE.MeshStandardMaterial({color:this.palette.water,roughness:.28,metalness:.22});
    this.waterMaterial.onBeforeCompile=shader=>{
      shader.uniforms.flowTime=this.timeUniform;shader.uniforms.worldOrigin=this.originUniform;
      shader.vertexShader='varying vec2 waterCoord; uniform float worldOrigin;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vec4 waterWorld=modelMatrix*vec4(position,1.0); waterCoord=vec2(waterWorld.x,waterWorld.z-worldOrigin);');
      shader.fragmentShader='varying vec2 waterCoord; uniform float flowTime;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        float ripple=sin(waterCoord.x*.34+waterCoord.y*.51+flowTime*.9);
        float swell=sin(waterCoord.x*.085-waterCoord.y*.19+flowTime*.42);
        vec3 rippleNormal=vec3(ripple*.055,0.0,swell*.075);
        normal=normalize(normal+mat3(viewMatrix)*rippleNormal);`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n diffuseColor.rgb *= .96+.04*sin(waterCoord.y*.24+waterCoord.x*.09+flowTime*.7);');
    };
    if(theme==='coastal'){
      this.sea=new THREE.Mesh(new THREE.PlaneGeometry(16000,16000),this.waterMaterial);this.sea.name='continuous-ocean';this.sea.rotation.x=-Math.PI/2;this.sea.position.y=this.road.seaLevel;this.scene.add(this.sea);
    }
    this.foamMaterial=new THREE.MeshBasicMaterial({color:'#dcebe1',transparent:true,opacity:.27,depthWrite:false});
    this.treeMaterial.onBeforeCompile=shader=>{
      shader.uniforms.windTime=this.timeUniform;
      shader.vertexShader='uniform float windTime;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        #ifdef USE_INSTANCING
        float windPhase=instanceMatrix[3].x*.17+instanceMatrix[3].z*.11;
        transformed.x+=sin(windTime*.85+windPhase)*pow(max(position.y,0.0)/6.0,2.0)*.12;
        transformed.z+=cos(windTime*.62+windPhase)*pow(max(position.y,0.0)/6.0,2.0)*.07;
        #endif`);
    };
  }
  clear() {
    if(this.sea){this.scene.remove(this.sea);this.sea.geometry.dispose();this.sea=null;}
    if(this.chunks)for(const chunk of this.chunks.values())this.disposeChunk(chunk);
    this.chunks?.clear();
    if(this.exploration)for(const chunk of this.exploration.values())this.disposeChunk(chunk);
    this.exploration?.clear();
    for(const key of ['terrainMaterial','roadMaterial','lineMaterial','treeMaterial','trunkMaterial','rockMaterial','detailMaterial','waterMaterial','foamMaterial'])this[key]?.dispose();
  }
  disposeChunk(chunk) {
    const shared=[this.pineGeometry,this.coastalTreeGeometry,this.trunkGeometry,this.rockGeometry,this.cactusGeometry];
    chunk.traverse(o=>{if(o.isMesh&&!shared.includes(o.geometry))o.geometry.dispose();if(o.isInstancedMesh)o.dispose();if(o.userData.ownMaterial)o.material.dispose();});
    this.root.remove(chunk);
  }
  update(s,origin,carX=this.road.x(s)) {
    this.root.position.z=origin;this.originUniform.value=origin;
    if(this.sea)this.sea.position.set(carX-3500,this.road.seaLevel,-s+origin);
    const current=Math.floor(s/CHUNK), ahead=this.quality==='low'?5:this.quality==='medium'?7:9;
    for(const [index,chunk]of this.chunks)if(index<current-3||index>current+ahead){this.disposeChunk(chunk);this.chunks.delete(index);}
    // Prioritize the closest missing segment; create at most one per frame after initial load.
    for(let i=current-3;i<=current+ahead;i++) if(!this.chunks.has(i)){this.chunks.set(i,this.buildChunk(i));if(this.initialized)break;}
    this.initialized=true;
    this.updateExploration(carX,s);
  }
  updateExploration(x,s) {
    const needed=new Set(),size=256;
    if(Math.abs(x-this.road.x(s))>950){
      const tx=Math.floor(x/size),tz=Math.floor(s/size);
      for(let a=tx-2;a<=tx+2;a++)for(let b=tz-2;b<=tz+2;b++)needed.add(a+':'+b);
    }
    for(const [key,tile]of this.exploration)if(!needed.has(key)){this.disposeChunk(tile);this.exploration.delete(key);}
    for(const key of needed)if(!this.exploration.has(key)){
      const [tx,tz]=key.split(':').map(Number),positions=[],indices=[],colors=[];
      const color=new THREE.Color(this.palette.land),segments=16;
      for(let j=0;j<=segments;j++)for(let i=0;i<=segments;i++){
        const px=tx*size+i*size/segments,ps=tz*size+j*size/segments;
        positions.push(px,this.road.terrain(px,ps)-.15,-j*size/segments);
        vertexColor.copy(color).multiplyScalar(1+noise2(px/33,ps/37,this.road.seed)*.07);colors.push(vertexColor.r,vertexColor.g,vertexColor.b);
      }
      for(let j=0;j<segments;j++)for(let i=0;i<segments;i++){const a=j*(segments+1)+i;indices.push(a,a+1,a+segments+1,a+1,a+segments+2,a+segments+1);}
      const group=new THREE.Group();group.position.z=-tz*size;const mesh=new THREE.Mesh(geometryFrom(positions,colors,indices),this.terrainMaterial);mesh.receiveShadow=true;group.add(mesh);this.root.add(group);this.exploration.set(key,group);
      break;
    }
  }
  buildChunk(index) {
    const group=new THREE.Group();const start=index*CHUNK;group.position.z=-start;group.userData.index=index;this.root.add(group);
    const road=this.road, theme=this.theme, seed=road.seed;
    const positions=[],colors=[],indices=[];const rows=20,cols=road.columns(start).length;
    const base=new THREE.Color(this.palette.land),light=new THREE.Color(theme==='desert'?'#d2a173':'#b0b77b');
    for(let j=0;j<=rows;j++) {
      const s=start+j*8,cx=road.x(s),lateral=road.columns(s);
      for(let k=0;k<cols;k++) {
        const offset=lateral[k],x=cx+offset;
        let y=road.terrain(x,s);

        positions.push(x,y,-j*8);
        const v=noise2(x/33,s/37,seed+24)*.12+randomAt(index*700+j*33+k,seed)*.05;
        vertexColor.copy(base).lerp(light,clamp(v+.25,0,1));
        if(theme==='alpine'&&y>125)vertexColor.lerp(new THREE.Color('#d7dccb'),clamp((y-125)/80,0,.86));
        if(theme==='coastal'&&offset< -11)vertexColor.set(y<road.seaLevel+1.2?'#c4ba95':'#969987');
        if(theme==='desert')vertexColor.multiplyScalar(1+Math.sin(y*.42)*.055);
        colors.push(vertexColor.r,vertexColor.g,vertexColor.b);
      }
    }
    for(let j=0;j<rows;j++)for(let k=0;k<cols-1;k++){const a=j*cols+k;indices.push(a,a+1,a+cols,a+1,a+cols+1,a+cols);}
    const terrain=new THREE.Mesh(geometryFrom(positions,colors,indices),this.terrainMaterial);terrain.receiveShadow=true;group.add(terrain);
    const roadPos=[],roadIndices=[],linePos=[],lineIndices=[];
    const strip=(arr,ind,s1,s2,x1,x2,raise)=>{
      const k=arr.length/3;
      arr.push(road.x(s1)+x1,road.y(s1)+raise,-(s1-start),road.x(s1)+x2,road.y(s1)+raise,-(s1-start),road.x(s2)+x1,road.y(s2)+raise,-(s2-start),road.x(s2)+x2,road.y(s2)+raise,-(s2-start));
      ind.push(k,k+1,k+2,k+1,k+3,k+2);
    };
    for(let j=0;j<40;j++) {
      const s=start+j*4;
      strip(roadPos,roadIndices,s,s+4,-5.5,5.5,0);
      strip(linePos,lineIndices,s,s+4,-5.13,-5,.025);strip(linePos,lineIndices,s,s+4,5,5.13,.025);
      if(((s%16)+16)%16<8)strip(linePos,lineIndices,s,s+4,-.075,.075,.026);
    }
    const tarmac=new THREE.Mesh(geometryFrom(roadPos,[],roadIndices),this.roadMaterial);tarmac.receiveShadow=true;group.add(tarmac);
    group.add(new THREE.Mesh(geometryFrom(linePos,[],lineIndices),this.lineMaterial));
    const plants=createVegetation(road,theme,index),treeCount=plants.length;
    const trees=new THREE.InstancedMesh(theme==='desert'?this.cactusGeometry:theme==='coastal'?this.coastalTreeGeometry:this.pineGeometry,this.treeMaterial,treeCount);
    const trunks=theme==='desert'?null:new THREE.InstancedMesh(this.trunkGeometry,this.trunkMaterial,treeCount);
    plants.forEach((plant,i)=>{
      object.position.set(plant.x,plant.y,-(plant.s-start));object.rotation.set(0,plant.yaw,0);object.scale.setScalar(plant.scale);object.updateMatrix();
      trees.setMatrixAt(i,object.matrix);trunks?.setMatrixAt(i,object.matrix);
      vertexColor.set(theme==='desert'?'#73865b':theme==='coastal'?'#597459':plant.color>.5?'#48764c':'#365b40').multiplyScalar(plant.shade);trees.setColorAt(i,vertexColor);
    });
    trees.castShadow=trees.receiveShadow=true;group.add(trees);if(trunks){trunks.castShadow=true;group.add(trunks);}
    group.userData.plants=plants;group.userData.vegetation=trees;
    const rockCount=theme==='desert'?30:22;
    const rocks=new THREE.InstancedMesh(this.rockGeometry,this.rockMaterial,rockCount);
    for(let i=0;i<rockCount;i++) {
      const r=n=>randomAt(index*1919+i*17+n,seed+211);
      const s=start+r(0)*CHUNK;
      const size=theme==='desert'?4+r(4)*13:1+r(4)*3.6;
      const offset=(r(1)>.5?1:-1)*(12+size*1.8+r(2)*210),x=road.x(s)+offset;
      object.position.set(x,road.ground(x,s)+size*.2,-(s-start));object.rotation.set(r(3),r(5)*3,0);object.scale.set(size,size*(theme==='desert'?1.8:.65),size*.8);object.updateMatrix();rocks.setMatrixAt(i,object.matrix);
    }
    rocks.castShadow=true;rocks.receiveShadow=true;group.add(rocks);
    this.addRoadFurniture(group,start);
    if(theme==='coastal') {
      if(((index%7)+7)%7===3)this.lighthouse(group,start+90);
      // Shoreline vertices use the same eight-metre samples as the terrain.
      const foam=[],idx=[];
      for(let j=0;j<=20;j++){
        const s=start+j*8,shore=road.coast(s),width=1.0+.45*Math.sin(s*.031);
        foam.push(shore-width,road.seaLevel+.025,-j*8,shore-.05,road.seaLevel+.025,-j*8);
        if(j<20){const k=j*2;idx.push(k,k+1,k+2,k+1,k+3,k+2);}
      }
      const surf=new THREE.Mesh(geometryFrom(foam,[],idx),this.foamMaterial);surf.name='shoreline-surf';group.add(surf);
    }
    if(theme==='alpine') {
      const riverMid=Math.floor((start-850)/1800)*1800+930;
      for(const mid of [riverMid,riverMid+1800])if(mid>=start&&mid<start+CHUNK)this.bridge(group,mid,start);
      if(((index%19)+19)%19===7)this.tunnel(group,start+75);
    }
    return group;
  }
  addRoadFurniture(group,start) {
    const posts=[],stripes=[];
    for(let s=start;s<start+CHUNK;s+=24)for(const side of [-1,1]) {
      const g=new THREE.BoxGeometry(.13,.95,.15);g.translate(this.road.x(s)+side*6.3,this.road.y(s)+.43,-(s-start));posts.push(g);
      const mark=new THREE.BoxGeometry(.145,.19,.16);mark.translate(this.road.x(s)+side*6.3,this.road.y(s)+.71,-(s-start));stripes.push(mark);
    }
    group.add(new THREE.Mesh(mergeGeometries(posts),this.detailMaterial));posts.forEach(g=>g.dispose());
    const material=new THREE.MeshStandardMaterial({color:'#394b3d',emissive:'#d3d7ac',emissiveIntensity:0});
    const reflectors=new THREE.Mesh(mergeGeometries(stripes),material);reflectors.userData.ownMaterial=true;reflectors.userData.reflector=true;group.add(reflectors);stripes.forEach(g=>g.dispose());
  }
  bridge(group,mid,start) {
    const y=this.road.y(mid),cx=this.road.x(mid);
    const river=new THREE.Mesh(new THREE.PlaneGeometry(1100,32),this.waterMaterial);river.rotation.x=-Math.PI/2;river.position.set(cx,y-12,-(mid-start));group.add(river);
    for(let s=mid-25;s<mid+25;s+=5)for(const side of [-1,1]) {
      const support=new THREE.Mesh(new THREE.BoxGeometry(.28,1.25,.28),this.detailMaterial);support.position.set(this.road.x(s)+side*5.9,this.road.y(s)+.6,-(s-start));group.add(support);
      const rail=new THREE.Mesh(new THREE.BoxGeometry(.22,.23,5.25),this.detailMaterial);rail.position.set(this.road.x(s+2.5)+side*5.9,this.road.y(s)+1.2,-(s+2.5-start));rail.rotation.y=-this.road.heading(s);group.add(rail);
      if(s%10===0){const pier=new THREE.Mesh(new THREE.BoxGeometry(1.3,15,2),this.detailMaterial);pier.position.set(this.road.x(s)+side*4.6,this.road.y(s)-7.5,-(s-start));group.add(pier);}
    }
  }
  tunnel(group,mid) {
    const start=group.userData.index*CHUNK;
    const arch=new THREE.Shape();arch.moveTo(-8,0);arch.lineTo(-8,2);arch.absarc(0,2,8,Math.PI,0,true);arch.lineTo(8,0);arch.lineTo(6.2,0);arch.lineTo(6.2,2);arch.absarc(0,2,6.2,0,Math.PI,false);arch.lineTo(-6.2,0);arch.closePath();
    for(let i=-3;i<=3;i++) {
      const s=mid+i*4,geometry=new THREE.ExtrudeGeometry(arch,{depth:4.15,bevelEnabled:false,curveSegments:12});
      const part=new THREE.Mesh(geometry,this.rockMaterial);part.position.set(this.road.x(s),this.road.y(s)-.1,-(s-start));part.rotation.y=-this.road.heading(s);part.castShadow=true;part.receiveShadow=true;group.add(part);
    }
  }
  lighthouse(group,s) {
    const x=this.road.x(s)-27,y=this.road.ground(x,s),z=-(s-group.userData.index*CHUNK);
    const white=new THREE.MeshStandardMaterial({color:'#e7e6cf',roughness:.9});
    const tower=new THREE.Mesh(new THREE.CylinderGeometry(1.4,2.2,14,12),white);tower.position.set(x,y+7,z);tower.userData.ownMaterial=true;tower.castShadow=true;group.add(tower);
    for(const [h,r,color]of [[10,1.66,'#b36d52'],[14,2.1,'#4c6660']]) {
      const band=new THREE.Mesh(new THREE.CylinderGeometry(r,r,1.4,12),new THREE.MeshStandardMaterial({color}));band.position.set(x,y+h,z);band.userData.ownMaterial=true;group.add(band);
    }
    const glow=new THREE.Mesh(new THREE.CylinderGeometry(1.35,1.35,1.8,10),new THREE.MeshStandardMaterial({color:'#f8e4ae',emissive:'#ffe5aa',emissiveIntensity:1.2}));glow.position.set(x,y+15.4,z);glow.userData.ownMaterial=true;group.add(glow);
    const roof=new THREE.Mesh(new THREE.ConeGeometry(2.1,1.4,12),this.rockMaterial);roof.position.set(x,y+17,z);group.add(roof);
  }
  resolveVehicle(state,spec) {
    const current=Math.floor(state.s/CHUNK);
    let hits=0;
    for(let i=current-1;i<=current+1;i++){
      const plants=this.chunks.get(i)?.userData.plants;if(!plants)continue;
      hits+=resolveVegetation(state,spec,plants,(plant,x,s,speed)=>{plant.dirX=x;plant.dirS=s;plant.bendVelocity=Math.min(9,3+speed*.25);});
    }
    return hits;
  }
  animate(time,dt) {
    this.timeUniform.value=time;this.foamMaterial.opacity=.24+Math.sin(time*.65)*.06;
    for(const chunk of this.chunks.values()){
      let dirty=false;const start=chunk.userData.index*CHUNK;
      chunk.userData.plants.forEach((plant,i)=>{
        if(!plant.bendVelocity&&!plant.bend&&!plant.cooldown)return;
        plant.cooldown=Math.max(0,plant.cooldown-dt);
        const n=Math.max(1,Math.ceil(dt/(1/120))),step=dt/n;
        for(let k=0;k<n;k++){plant.bendVelocity+=(-14*plant.bend-4.2*plant.bendVelocity)*step;plant.bend=clamp(plant.bend+plant.bendVelocity*step,-.14,1.3);}
        if(!plant.cooldown&&Math.abs(plant.bend)<.004&&Math.abs(plant.bendVelocity)<.004)plant.bend=plant.bendVelocity=0;
        object.position.set(plant.x,plant.y,-(plant.s-start));object.rotation.set(-plant.dirS*plant.bend,plant.yaw,-plant.dirX*plant.bend,'ZXY');object.scale.setScalar(plant.scale);object.updateMatrix();chunk.userData.vegetation.setMatrixAt(i,object.matrix);dirty=true;
      });
      if(dirty)chunk.userData.vegetation.instanceMatrix.needsUpdate=true;
    }
  }
  setNight(value) {
    this.root.traverse(o=>{if(o.userData.reflector)o.material.emissiveIntensity=value*.8;});
  }
}
