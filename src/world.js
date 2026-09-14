import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createRoad, randomAt, noise2, clamp } from './dynamics.js';
export const THEMES = {
  alpine: { name:'Alpine Hills', location:'THE QUIET SIDE OF THE ALPS', caption:'Green hills. A little fresh air.', sky:'#bfdbdb', horizon:'#e8edda', land:'#79965c', light:'#fff4cc', fog:'#c4d5be', accent:'#567150', ambient:'Forest breeze', water:'#78aaa6' },
  desert: { name:'Desert Canyon', location:'SOMEWHERE IN THE SOUTHWEST', caption:'Warm earth. Wide-open skies.', sky:'#afd2d8', horizon:'#efd6b3', land:'#bd8050', light:'#ffe0a4', fog:'#d8ad88', accent:'#a46946', ambient:'Desert wind', water:'#b9a378' },
  coastal: { name:'Coastal Cliffs', location:'WHERE THE LAND MEETS THE SEA', caption:'Salt air. Endless blue.', sky:'#b7d5df', horizon:'#e2e7dd', land:'#8eaa7d', light:'#fff7de', fog:'#b9d2d4', accent:'#638e93', ambient:'Ocean waves', water:'#6bacae' },
};
const CHUNK=160;
const lateral=[-1400,-1050,-800,-600,-450,-330,-240,-175,-120,-85,-60,-42,-28,-18,-11,-7,0,7,11,18,28,42,60,85,120,175,240,330,450,600,800,1050,1400];
const object = new THREE.Object3D();
const vertexColor=new THREE.Color();
function geometryFrom(positions, colors, indices) {
  let geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  if(colors.length)geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);
  geometry=geometry.toNonIndexed();geometry.computeVertexNormals();return geometry;
}
function makePine() {
  const lower=new THREE.ConeGeometry(1.3,3.6,6);lower.translate(0,2.9,0);
  const upper=new THREE.ConeGeometry(.94,2.8,6);upper.translate(0,4.55,0);
  return mergeGeometries([lower,upper]);
}
function makeCactus() {
  const stem=new THREE.CylinderGeometry(.24,.31,3.8,7);stem.translate(0,1.9,0);
  const arm=new THREE.CylinderGeometry(.17,.2,1.7,7);arm.translate(.8,2.2,0);
  const join=new THREE.CylinderGeometry(.18,.18,.8,7);join.rotateZ(Math.PI/2);join.translate(.4,1.4,0);
  return mergeGeometries([stem,arm,join]);
}
export class World {
  constructor(scene, seed, theme, quality='high') {
    this.scene=scene;this.root=new THREE.Group();scene.add(this.root);this.chunks=new Map();this.exploration=new Map();this.quality=quality;
    this.pineGeometry=makePine();this.cactusGeometry=makeCactus();this.trunkGeometry=new THREE.CylinderGeometry(.16,.25,1.8,5);this.trunkGeometry.translate(0,.9,0);
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
    this.waterMaterial=new THREE.MeshStandardMaterial({color:this.palette.water,roughness:.35,metalness:.12});
  }
  clear() {
    if(this.chunks)for(const chunk of this.chunks.values())this.disposeChunk(chunk);
    this.chunks?.clear();
    if(this.exploration)for(const chunk of this.exploration.values())this.disposeChunk(chunk);
    this.exploration?.clear();
    for(const key of ['terrainMaterial','roadMaterial','lineMaterial','treeMaterial','trunkMaterial','rockMaterial','detailMaterial','waterMaterial'])this[key]?.dispose();
  }
  disposeChunk(chunk) {
    const shared=[this.pineGeometry,this.trunkGeometry,this.rockGeometry,this.cactusGeometry];
    chunk.traverse(o=>{if(o.isMesh&&!shared.includes(o.geometry))o.geometry.dispose();if(o.isInstancedMesh)o.dispose();if(o.userData.ownMaterial)o.material.dispose();});
    this.root.remove(chunk);
  }
  update(s,origin,carX=this.road.x(s)) {
    this.root.position.z=origin;
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
    const positions=[],colors=[],indices=[];const rows=20,cols=lateral.length;
    const base=new THREE.Color(this.palette.land),light=new THREE.Color(theme==='desert'?'#d2a173':'#b0b77b');
    for(let j=0;j<=rows;j++) {
      const s=start+j*8,cx=road.x(s);
      for(let k=0;k<cols;k++) {
        const offset=lateral[k],x=cx+offset;
        let y=road.terrain(x,s);
        if(theme==='alpine'&&road.river(s)<25)y-=Math.max(0,1-road.river(s)/25)*16;
        positions.push(x,y,-j*8);
        const v=noise2(x/33,s/37,seed+24)*.12+randomAt(index*700+j*33+k,seed)*.05;
        vertexColor.copy(base).lerp(light,clamp(v+.25,0,1));
        if(theme==='alpine'&&y>125)vertexColor.lerp(new THREE.Color('#d7dccb'),clamp((y-125)/80,0,.86));
        if(theme==='coastal'&&offset<-20)vertexColor.set('#c4ba95');
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
    const treeCount=this.quality==='low'?35:theme==='desert'?20:105;
    const trees=new THREE.InstancedMesh(theme==='desert'?this.cactusGeometry:this.pineGeometry,this.treeMaterial,treeCount);
    const trunks=new THREE.InstancedMesh(this.trunkGeometry,this.trunkMaterial,treeCount);
    let placed=0;
    for(let i=0;i<treeCount*3&&placed<treeCount;i++) {
      const rand=n=>randomAt(index*22117+i*37+n,seed);
      const s=start+rand(0)*CHUNK,side=rand(1)<.5?-1:1;
      const offset=side*(13+Math.pow(rand(2),1.7)*330),x=road.x(s)+offset,y=road.terrain(x,s);
      if(theme==='coastal'&&side<0||theme==='alpine'&&road.river(s)<30)continue;
      const scale=(theme==='coastal'?.65:1)*(1+rand(4)*1.15);
      object.position.set(x,y,-(s-start));object.rotation.set(0,rand(6)*6.28,0);object.scale.setScalar(scale);object.updateMatrix();
      trees.setMatrixAt(placed,object.matrix);trunks.setMatrixAt(placed,object.matrix);
      vertexColor.set(theme==='desert'?'#758053':rand(8)>.5?'#48764c':'#365b40');vertexColor.multiplyScalar(.87+rand(9)*.3);trees.setColorAt(placed,vertexColor);placed++;
    }
    trees.count=placed;trunks.count=placed;trees.castShadow=true;trees.receiveShadow=true;group.add(trees);if(theme!=='desert')group.add(trunks);else trunks.dispose();
    const rockCount=theme==='desert'?30:22;
    const rocks=new THREE.InstancedMesh(this.rockGeometry,this.rockMaterial,rockCount);
    for(let i=0;i<rockCount;i++) {
      const r=n=>randomAt(index*1919+i*17+n,seed+211);
      const s=start+r(0)*CHUNK;
      const size=theme==='desert'?4+r(4)*13:1+r(4)*3.6;
      const offset=(r(1)>.5?1:-1)*(12+size*1.8+r(2)*210),x=road.x(s)+offset;
      object.position.set(x,road.terrain(x,s)+size*.2,-(s-start));object.rotation.set(r(3),r(5)*3,0);object.scale.set(size,size*(theme==='desert'?1.8:.65),size*.8);object.updateMatrix();rocks.setMatrixAt(i,object.matrix);
    }
    rocks.castShadow=true;rocks.receiveShadow=true;group.add(rocks);
    this.addRoadFurniture(group,start);
    if(theme==='coastal') {
      const sea=new THREE.Mesh(new THREE.PlaneGeometry(1800,CHUNK+2,1,1),this.waterMaterial);sea.rotation.x=-Math.PI/2;sea.position.set(road.x(start+80)-950,-3,-80);group.add(sea);
      if(((index%7)+7)%7===3)this.lighthouse(group,start+90);
      // Fine pale bands suggest surf against the foot of the cliffs.
      for(let i=0;i<3;i++) {
        const surf=new THREE.Mesh(new THREE.PlaneGeometry(1.2,CHUNK),new THREE.MeshBasicMaterial({color:'#dbe9d9',transparent:true,opacity:.22-i*.045,depthWrite:false}));surf.rotation.x=-Math.PI/2;surf.position.set(road.x(start+80)-43-i*9,-2.94,-80);surf.userData.ownMaterial=true;group.add(surf);
      }
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
    const x=this.road.x(s)-27,y=this.road.terrain(x,s),z=-(s-group.userData.index*CHUNK);
    const white=new THREE.MeshStandardMaterial({color:'#e7e6cf',roughness:.9});
    const tower=new THREE.Mesh(new THREE.CylinderGeometry(1.4,2.2,14,12),white);tower.position.set(x,y+7,z);tower.userData.ownMaterial=true;tower.castShadow=true;group.add(tower);
    for(const [h,r,color]of [[10,1.66,'#b36d52'],[14,2.1,'#4c6660']]) {
      const band=new THREE.Mesh(new THREE.CylinderGeometry(r,r,1.4,12),new THREE.MeshStandardMaterial({color}));band.position.set(x,y+h,z);band.userData.ownMaterial=true;group.add(band);
    }
    const glow=new THREE.Mesh(new THREE.CylinderGeometry(1.35,1.35,1.8,10),new THREE.MeshStandardMaterial({color:'#f8e4ae',emissive:'#ffe5aa',emissiveIntensity:1.2}));glow.position.set(x,y+15.4,z);glow.userData.ownMaterial=true;group.add(glow);
    const roof=new THREE.Mesh(new THREE.ConeGeometry(2.1,1.4,12),this.rockMaterial);roof.position.set(x,y+17,z);group.add(roof);
  }
  setNight(value) {
    this.root.traverse(o=>{if(o.userData.reflector)o.material.emissiveIntensity=value*.8;});
  }
}
