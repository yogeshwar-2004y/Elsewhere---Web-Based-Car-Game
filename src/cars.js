import * as THREE from 'three';
import { CAR_SPECS } from './dynamics.js';

const chrome = new THREE.MeshStandardMaterial({ color: '#bdc6c1', metalness: .75, roughness: .28 });
const rubber = new THREE.MeshStandardMaterial({ color: '#202724', roughness: .95 });
const glass = new THREE.MeshStandardMaterial({ color: '#344c4d', metalness: .32, roughness: .19 });
const dark = new THREE.MeshStandardMaterial({ color: '#23312c', roughness: .7 });
const lamp = new THREE.MeshStandardMaterial({ color: '#ffedb6', emissive: '#fff3c9', emissiveIntensity: .4 });
const rearLamp = new THREE.MeshStandardMaterial({ color: '#b73723', emissive: '#ef361e', emissiveIntensity: .65 });
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const wheelGeo = new THREE.CylinderGeometry(.36, .36, .24, 20);
const hubGeo = new THREE.CylinderGeometry(.235, .235, .255, 12);

function box(parent, material, x, y, z, sx, sy, sz) {
  const mesh = new THREE.Mesh(boxGeo, material);
  mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz);
  mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function profile(parent, material, sections) {
  const vertices = [], indices = [];
  for (const [z, halfWidth, bottom, top] of sections) vertices.push(-halfWidth, bottom, z, halfWidth, bottom, z, -halfWidth, top, z, halfWidth, top, z);
  for (let i = 0; i < sections.length - 1; i++) {
    const k = i * 4, j = k + 4;
    indices.push(k+2,k+3,j+2, k+3,j+3,j+2, k,j,k+1,k+1,j,j+1, k,k+2,j,k+2,j+2,j, k+1,j+1,k+3,k+3,j+1,j+3);
  }
  const k = (sections.length - 1) * 4;
  indices.push(0,1,2,1,3,2, k,k+2,k+1,k+1,k+2,k+3);
  for (let i = 0; i < indices.length; i += 3) [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices,3)); geometry.setIndex(indices); geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh);
  return mesh;
}
export function buildCar(id) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const spec = CAR_SPECS[id];
  const paint = new THREE.MeshStandardMaterial({color: spec.color, metalness:.24, roughness:.32, flatShading:true});
  const trim = id === 'bmw' ? chrome : dark;
  const wheels = [];
  const width = id === 'lamborghini' ? 1.02 : .9;
  const axles = id === 'lamborghini' ? [-1.42,1.35] : [-1.28,1.26];
  for (const z of axles) for (const side of [-1,1]) {
    const pivot = new THREE.Group(); pivot.position.set(width * side, .39, z); root.add(pivot);
    const tire = new THREE.Mesh(wheelGeo, rubber); tire.rotation.z = Math.PI / 2; tire.castShadow=true; pivot.add(tire);
    const hub = new THREE.Mesh(hubGeo, chrome); hub.rotation.z = Math.PI / 2; pivot.add(hub);
    for(let i=0;i<5;i++) {
      const spoke=box(hub,dark,Math.sin(i*Math.PI*2/5)*.13,side*.131,Math.cos(i*Math.PI*2/5)*.13,.055,.012,.15); spoke.rotation.y=i*Math.PI*2/5;
    }
    wheels.push({ pivot, tire, hub, front: z < 0 });
  }
  if (id === 'bmw') {
    profile(body, paint,[[-2.12,.77,.46,.82],[-1.8,.92,.43,.97],[1.7,.91,.43,.99],[2.1,.8,.48,.88]]);
    profile(body, glass,[[-.98,.79,.96,1.01],[-.49,.71,.97,1.65],[.85,.7,.97,1.65],[1.34,.77,.97,1.02]]);
    box(body,paint,0,1.68,.19,1.47,.09,1.47);
    for (const side of [-1,1]) {
      const pillar=box(body,paint,side*.731,1.34,-.71,.08,.77,.07);pillar.rotation.x=.59;
      box(body,paint,side*.752,1.32,.4,.055,.65,.09);
      const back=box(body,paint,side*.735,1.34,1.08,.09,.76,.07);back.rotation.x=-.62;
      box(body,chrome,side*.926,.97,0,.025,.035,3.7);
      box(body,chrome,side*.938,1.02,.52,.03,.045,.22);
      box(body,chrome,side*1.02,1.15,-.78,.18,.1,.21);
      box(body,rearLamp,side*.58,.78,2.105,.47,.16,.028);
      for (const dx of [-.11,.11]) {
        const light = new THREE.Mesh(new THREE.CylinderGeometry(.135,.135,.045,16),lamp);light.rotation.x=Math.PI/2;light.position.set(side*.59+dx,.78,-2.1);body.add(light);
      }
    }
    box(body,dark,0,.78,-2.12,.36,.2,.06);
    for(const x of [-.08,.08]) box(body,chrome,x,.78,-2.158,.035,.19,.025);
    box(body,chrome,0,.5,2.15,1.8,.1,.12);box(body,chrome,0,.5,-2.15,1.8,.1,.12);
  } else if (id === 'lamborghini') {
    profile(body,paint,[[-2.36,.85,.3,.55],[-1.48,1.02,.3,.84],[.6,1.04,.32,.88],[2.24,.96,.36,.83]]);
    profile(body,glass,[[-1.02,.84,.8,.83],[-.4,.69,.8,1.29],[.6,.69,.83,1.3],[1.34,.79,.8,.88]]);
    box(body,paint,0,1.31,.12,1.4,.045,1.05);
    for(const side of [-1,1]) {
      box(body,dark,side*.85,.49,-2.27,.37,.14,.1);
      const light=box(body,lamp,side*.67,.66,-2.19,.47,.06,.2);light.rotation.y=side*.23;
      box(body,rearLamp,side*.62,.78,2.25,.6,.055,.025);
      box(body,dark,side*1.03,.6,.55,.035,.29,.55);
      box(body,paint,side*1.15,1.03,-.52,.26,.11,.3);
      box(body,dark,side*.68,.97,1.76,.1,.29,.1);
    }
    box(body,dark,0,1.12,1.84,2.03,.08,.38);
    box(body,dark,0,.42,2.27,1.6,.18,.09);
    for(let i=0;i<5;i++) box(body,dark,0,.93,1.12+i*.13,1.1,.03,.045);
  } else {
    profile(body,paint,[[-2.16,.66,.43,.75],[-1.65,.91,.42,.98],[-.8,.91,.43,.91],[1.18,.98,.43,1.05],[1.99,.88,.45,.82]]);
    profile(body,glass,[[-.85,.76,.96,.99],[-.35,.67,.96,1.54],[.45,.66,.97,1.6],[1.39,.78,.93,1.01]]);
    profile(body,paint,[[-.39,.69,1.49,1.55],[0,.69,1.53,1.63],[.5,.68,1.51,1.61],[1.4,.79,.99,1.04]]);
    for(const side of [-1,1]) {
      const fender = new THREE.Mesh(new THREE.SphereGeometry(.38,12,8),paint);fender.position.set(side*.72,.86,-1.58);fender.scale.set(1, .75, 1.7);body.add(fender);
      const head = new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,.06,20),lamp);head.rotation.x=1.26;head.position.set(side*.72,1.04,-1.88);body.add(head);
      box(body,dark,side*.917,.63,0,.032,.07,2.8);
      box(body,paint,side*1.02,1.09,-.46,.2,.1,.25);
      box(body,chrome,side*.935,1.06,.36,.03,.04,.2);
      const pillar=box(body,paint,side*.7,1.3,-.57,.06,.64,.07);pillar.rotation.x=.6;
      box(body,paint,side*.7,1.31,.5,.06,.55,.075);
    }
    box(body,rearLamp,0,.79,2.0,1.56,.12,.04);
    box(body,dark,0,.51,2.03,1.75,.13,.13);box(body,dark,0,.48,-2.13,1.48,.12,.13);
    const rearWindow=box(body,glass,0,1.415,.88,1.19,.024,.75);rearWindow.rotation.x=.56;
    for(let i=0;i<6;i++) box(body,dark,0,1.057,1.3+i*.085,1.04,.015,.035);
  }
  // Small unbranded plate and exhaust details on all three cars.
  box(body,dark,0,.63,2.115,.43,.14,.03);
  const plate = box(body,new THREE.MeshStandardMaterial({color:'#eee9d9'}),0,.64,id==='lamborghini'?2.3:2.14,.36,.10,.018);
  const pipe=new THREE.Mesh(new THREE.CylinderGeometry(.065,.065,.23,10),chrome);pipe.rotation.x=Math.PI/2;pipe.position.set(-.62,.36,2.1);body.add(pipe);
  const beams=[];
  for(const side of [-1,1]) {
    const spot=new THREE.SpotLight('#fff1cf',0,95,Math.PI/7,.7,1.5);spot.position.set(side*.67,.8,-1.9);spot.target.position.set(side*1.7,-.3,-42);root.add(spot,spot.target);beams.push(spot);
  }
  // A soft contact shadow grounds the car even on low quality.
  const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
  const ctx=canvas.getContext('2d');const gradient=ctx.createRadialGradient(32,32,5,32,32,31);gradient.addColorStop(0,'rgba(12,25,18,.5)');gradient.addColorStop(1,'rgba(12,25,18,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(3.5,6),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.055;root.add(shadow);
  return { root, body, wheels, beams, spec, plate };
}
export function disposeCar(car) {
  const geometries=new Set(), materials=new Set();
  car.root.traverse(o=>{if(o.isMesh){if(![boxGeo,wheelGeo,hubGeo].includes(o.geometry))geometries.add(o.geometry);if(![chrome,rubber,glass,dark,lamp,rearLamp].includes(o.material))materials.add(o.material);}});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>{m.map?.dispose();m.dispose();});
}
