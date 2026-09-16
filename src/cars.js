import * as THREE from 'three';
import { CAR_SPECS } from './dynamics.js';
import { createModelBuilder } from './car-geometry.js';
import { buildCockpit } from './cockpit.js';

function buildWheels(root,b,spec,m) {
  const wheels=[];
  for(const z of [-spec.wheelbase/2,spec.wheelbase/2])for(const side of [-1,1]) {
    const pivot=new THREE.Group();pivot.userData.movable=true;pivot.position.set(side*spec.track/2,spec.wheelRadius,z);root.add(pivot);
    const spin=new THREE.Group();pivot.add(spin);const r=spec.wheelRadius,width=spec.id==='lamborghini'?.28:spec.id==='porsche'?.25:.21;
    const shape=[[r*.68,-width*.5],[r*.86,-width*.5],[r*.98,-width*.32],[r,0],[r*.98,width*.32],[r*.86,width*.5],[r*.68,width*.5]].map(([a,y])=>new THREE.Vector2(a,y));
    const tire=b.mesh(spin,new THREE.LatheGeometry(shape,36),m.rubber);tire.rotation.z=Math.PI/2;
    const face=side*(width*.5+.006),normal=[side,0,0],rim=r*.73;
    b.disc(spin,spec.id==='bmw'?m.alloy:m.black,[0,0,0],rim,width,normal);
    b.torus(spin,m.alloy,[face,0,0],rim,.012,normal);
    b.disc(spin,m.disc,[face-side*.044,0,0],rim*.83,.009,normal);
    if(spec.id==='bmw') {
      b.disc(spin,m.alloy,[face,0,0],rim*.87,.018,normal);
      for(let i=0;i<12;i++){const a=i*Math.PI/6;b.disc(spin,m.black,[face+side*.012,Math.sin(a)*rim*.69,Math.cos(a)*rim*.69],.025,.005,normal,12);}
      b.disc(spin,m.chrome,[face+side*.016,0,0],rim*.39,.025,normal);
    } else {
      for(let i=0;i<5;i++)for(const offset of spec.id==='lamborghini'?[-.045,.045]:[0]){
        const a=i*Math.PI*2/5+offset;
        b.beam(spin,m.alloy,[face,Math.sin(a)*.055,Math.cos(a)*.055],[face,Math.sin(a)*rim*.94,Math.cos(a)*rim*.94],spec.id==='porsche'?.032:.016,6);
      }
      b.disc(spin,m.alloy,[face+side*.009,0,0],.062,.021,normal);
      b.box(pivot,m.caliper,[face-side*.054,.10,.14],[.06,.18,.075],.02);
    }
    for(let i=0;i<5;i++){const a=i*Math.PI*2/5;b.disc(spin,m.black,[face+side*.027,Math.sin(a)*.043,Math.cos(a)*.043],.008,.003,normal,8);}
    b.torus(spin,m.sidewall,[side*(width*.5+.001),0,0],r*.88,.005,normal);
    b.batch(spin);
    wheels.push({pivot,spin,front:z<0,side,x:side*spec.track/2,z,radius:r});
  }
  return wheels;
}
function glazing(body,b,m,config) {
  const group=new THREE.Group();group.userData.movable=true;body.add(group);
  const {frontZ,frontY,frontW,topFront,topRear,roofY,roofW,rearZ,rearY,rearW}=config;
  const front=[[-frontW,frontY,frontZ],[frontW,frontY,frontZ],[roofW,roofY,topFront],[-roofW,roofY,topFront]];
  const rear=[[-roofW,roofY,topRear],[roofW,roofY,topRear],[rearW,rearY,rearZ],[-rearW,rearY,rearZ]];
  b.panel(group,m.glass,front);b.panel(group,m.glass,rear);
  for(const points of [front,rear]){b.path(body,m.black,points,.025,true);b.path(body,m.trim,points,.010,true);}
  for(const side of [-1,1]) {
    const points=[[side*frontW,frontY,frontZ+.035],[side*roofW,roofY,topFront],[side*roofW,roofY,topRear],[side*rearW,rearY,rearZ-.02]];
    b.panel(group,m.glass,points);b.path(body,m.paint,points,.028,true);
    b.beam(body,m.paint,points[0],points[1],.037);b.beam(body,m.paint,points[2],points[3],config.id==='porsche'?.068:.042);
    if(config.id==='bmw')b.beam(body,m.black,[side*(frontW-.04),frontY,.44],[side*roofW,roofY,.44],.022);
  }
  b.roof(body,m.paint,[[topFront-.025,roofW+.032,roofY+.016],[(topFront+topRear)/2,roofW+.044,roofY+.025],[topRear+.025,roofW+.032,roofY+.012]]);
  const headliner=b.material('#323936',{roughness:1,side:THREE.BackSide});
  b.roof(body,headliner,[[topFront,roofW,roofY-.022],[(topFront+topRear)/2,roofW,roofY-.010],[topRear,roofW,roofY-.023]]);
  for(const side of [-1,1])b.beam(body,m.black,[side*(frontW-.025),frontY+.018,frontZ+.025],[side*(roofW-.025),roofY-.025,topFront+.015],.025);
  // Wipers sit on the glass instead of protruding through the cabin.
  for(const side of [-1,1])b.beam(body,m.black,[side*.10,frontY+.012,frontZ-.015],[side*.46,frontY+.11,frontZ+.07],.011,6);
  b.batch(group);return group;
}
function details(body,b,spec,m,width,front,rear,belt) {
  for(const side of [-1,1]) {
    const x=side*width;
    b.path(body,m.gap,[[x,belt,-.78],[x,.39,-.74],[x,.36,.71],[x,belt,.75]],.007);
    b.box(body,m.trim,[x+side*.008,belt-.016,.39],[.025,.031,.15],.012);
    b.beam(body,m.black,[side*(width-.02),belt+.12,-.69],[side*(width+.11),belt+.15,-.75],.021);
    const mirror=b.box(body,spec.id==='bmw'?m.chrome:m.paint,[side*(width+.16),belt+.16,-.76],[.19,.105,.24],.045);
    b.box(body,m.mirror,[side*(width+.16),belt+.16,-.631],[.14,.065,.009],.02);
    b.box(body,m.black,[x,.30,.13],[.035,.075,1.78],.008);
    for(const axle of [-spec.wheelbase/2,spec.wheelbase/2]) {
      const points=[];for(let i=0;i<=20;i++){const a=i*Math.PI/20;points.push([x+side*.004,spec.wheelRadius+Math.sin(a)*(spec.wheelRadius+.077),axle+Math.cos(a)*(spec.wheelRadius+.077)]);}
      b.path(body,spec.id==='bmw'?m.trim:m.paint,points,spec.id==='bmw'?.013:.021);
    }
  }
  b.box(body,m.black,[0,.465,rear+.02],[.40,.135,.018],.012);
  b.label(body,'ELSEWHERE',[0,.467,rear+.034],.33,.088,{background:'#dedccb',color:'#34423b',font:'600 56px sans-serif'});
  const frontPlate=b.label(body,'ELSEWHERE',[0,.38,front-.024],.31,.074,{background:'#dedccb',color:'#34423b',font:'600 56px sans-serif'});frontPlate.rotation.y=Math.PI;
}
function buildBMW(body,b,spec,m) {
  b.bodyShell(body,m.paint,[[-2.09,.78,.29,.86,.91],[-1.88,.80,.29,.88,.92],[-1.35,.835,.28,.91,.94],[-.80,.815,.28,.91,.92],[.80,.82,.28,.91,.93],[1.39,.835,.28,.90,.94],[1.94,.80,.30,.85,.87],[2.08,.78,.33,.85,.89]],spec,[-.84,1.19]);
  const windows=glazing(body,b,m,{id:'bmw',frontZ:-.88,frontY:.93,frontW:.73,topFront:-.37,topRear:.72,roofY:1.395,roofW:.63,rearZ:1.20,rearY:.94,rearW:.72});
  b.box(body,m.black,[0,.697,-2.087],[1.48,.23,.031],.025);
  for(const side of [-1,1]) {
    b.disc(body,m.chrome,[side*.566,.716,-2.105],.157,.045,[0,0,-1]);
    b.disc(body,m.headlight,[side*.566,.716,-2.135],.132,.024,[0,0,-1]);
    for(let i=0;i<5;i++)b.box(body,m.chrome,[side*.305,.625+i*.035,-2.111],[.205,.007,.018]);
    b.box(body,m.black,[side*.071,.713,-2.139],[.116,.239,.025],.041);
    b.path(body,m.chrome,[[side*.071-.059,.602,-2.159],[side*.071-.059,.818,-2.159],[side*.071+.059,.818,-2.159],[side*.071+.059,.602,-2.159]],.009,true);
    b.box(body,m.amber,[side*.57,.47,-2.094],[.21,.077,.033],.013);
    b.disc(body,m.chrome,[side*.575,.708,2.073],.143,.029);
    b.disc(body,m.amber,[side*.575,.708,2.092],.123,.014);
    b.disc(body,m.tail,[side*.575,.708,2.103],.087,.018);
    b.box(body,m.black,[side*.47,.445,-2.15],[.055,.17,.075],.016);
    b.box(body,m.black,[side*.47,.442,2.14],[.055,.16,.070],.016);
    b.path(body,m.chrome,[[side*.805,.906,-1.9],[side*.839,.923,-1.3],[side*.824,.924,.8],[side*.812,.882,1.9]],.012);
    b.path(body,m.gap,[[side*.55,.905,-1.80],[side*.56,.947,-1.25],[side*.58,.947,-.88]],.006);
  }
  b.box(body,m.chrome,[0,.435,-2.145],[1.62,.075,.095],.025);b.box(body,m.chrome,[0,.425,2.127],[1.62,.080,.095],.026);
  b.label(body,'2002',[.34,.868,2.028],.22,.054,{background:spec.color,color:'#e4e5dc',font:'600 80px sans-serif'});
  b.disc(body,m.chrome,[-.53,.276,2.10],.042,.18);b.disc(body,m.black,[-.53,.276,2.197],.032,.01);
  details(body,b,spec,m,.832,-2.09,2.08,.91);
  return windows;
}
function buildLamborghini(body,b,spec,m) {
  b.bodyShell(body,m.paint,[[-2.34,.67,.24,.48,.54],[-2.16,.93,.23,.56,.61],[-1.64,1.00,.23,.76,.71],[-1.06,.98,.24,.80,.79],[-.58,.93,.25,.80,.82],[.72,.97,.25,.80,.85],[1.22,1.025,.25,.91,.91],[1.92,.99,.26,.84,.87],[2.29,.88,.29,.65,.75]],spec,[-.66,.98]);
  const windows=glazing(body,b,m,{id:'lamborghini',frontZ:-1.07,frontY:.80,frontW:.80,topFront:-.42,topRear:.52,roofY:1.16,roofW:.665,rearZ:1.15,rearY:.86,rearW:.74});
  for(const side of [-1,1]) {
    b.panel(body,m.black,[[side*.39,.35,-2.265],[side*.93,.37,-2.17],[side*.86,.57,-2.18],[side*.46,.52,-2.29]]);
    b.panel(body,m.black,[[side*.43,.642,-2.10],[side*.76,.633,-2.12],[side*.89,.706,-1.75],[side*.78,.698,-1.75]]);
    b.path(body,m.headlight,[[side*.49,.646,-2.08],[side*.70,.667,-1.98],[side*.85,.707,-1.78]],.009);
    b.path(body,m.headlight,[[side*.70,.667,-1.98],[side*.75,.641,-2.09]],.008);
    b.path(body,m.gap,[[side*.37,.615,-2.04],[side*.36,.77,-1.17],[side*.53,.816,-.84]],.007);
    b.panel(body,m.black,[[side*.991,.43,.83],[side*1.016,.75,1.02],[side*.965,.79,.30],[side*.961,.54,.31]]);
    b.beam(body,m.paint,[side*.982,.42,.86],[side*.974,.77,.31],.035,5);
    b.box(body,m.black,[side*.965,.28,.08],[.09,.065,1.7],.01);
    const rearZ=2.291;
    for(let i=0;i<3;i++){
      const x=side*(.44+i*.17);b.path(body,m.tail,[[x-side*.045,.687,rearZ],[x,.721,rearZ],[x+side*.045,.687,rearZ]],.012);
    }
    b.disc(body,m.chrome,[side*.235,.442,2.29],.08,.17);b.disc(body,m.black,[side*.235,.442,2.382],.058,.01);
    b.box(body,m.black,[side*.50,.895,1.80],[.065,.23,.065],.006);
  }
  b.box(body,m.black,[0,.265,-2.28],[1.85,.065,.19],.012);
  b.box(body,m.black,[0,.38,2.28],[1.62,.18,.09],.014);
  for(const x of [-.65,-.42,0,.42,.65])b.box(body,m.black,[x,.31,2.34],[.035,.18,.32],.008);
  b.box(body,m.paint,[0,1.01,1.88],[1.83,.065,.32],.024);
  for(let i=0;i<7;i++)b.box(body,m.black,[0,.934-i*.009,1.21+i*.078],[1.19,.022,.032],.008);
  b.label(body,'L A M B O R G H I N I',[0,.76,2.304],.75,.038,{background:'#343c30',color:'#d4dec4',font:'500 35px sans-serif'});
  details(body,b,spec,m,.972,-2.34,2.29,.80);
  return windows;
}
function buildPorsche(body,b,spec,m) {
  b.bodyShell(body,m.paint,[[-2.11,.61,.30,.68,.69],[-1.92,.75,.29,.79,.77],[-1.51,.83,.28,.94,.83],[-1.13,.855,.28,1.00,.86],[-.78,.825,.27,.93,.89],[.66,.85,.27,.94,.96],[1.14,.905,.28,1.04,1.025],[1.65,.89,.29,.94,1.00],[1.98,.79,.31,.80,.86],[2.10,.69,.34,.72,.77]],spec,[-.78,1.25]);
  const windows=glazing(body,b,m,{id:'porsche',frontZ:-.84,frontY:.915,frontW:.70,topFront:-.28,topRear:.63,roofY:1.355,roofW:.615,rearZ:1.30,rearY:1.035,rearW:.75});
  for(const side of [-1,1]) {
    // Long sculpted fender crests terminate in forward-facing, recessed round lamps.
    const housingPos=[],housingIndex=[];
    const rings=[[-1.94,.885,.153],[-1.77,.885,.161],[-1.50,.89,.125],[-1.20,.90,.07]];
    for(const [z,y,r]of rings)for(let i=0;i<=24;i++){const a=i/24*Math.PI*2;housingPos.push(side*.641+Math.cos(a)*r,y+Math.sin(a)*r*.96,z+Math.sin(a)*r*.278);}
    for(let j=0;j<3;j++)for(let i=0;i<24;i++){const a=j*25+i;housingIndex.push(a,a+1,a+25,a+1,a+26,a+25);}
    const housing=new THREE.BufferGeometry();housing.setAttribute('position',new THREE.Float32BufferAttribute(housingPos,3));housing.setIndex(housingIndex);housing.computeVertexNormals();b.mesh(body,housing,m.paint);
    b.torus(body,m.chrome,[side*.641,.885,-1.947],.151,.010,[0,.29,-1]);
    const lens=b.mesh(body,new THREE.CircleGeometry(.143,32),m.headlight,[side*.641,.885,-1.956]);lens.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(0,.29,-1).normalize());
    b.box(body,m.amber,[side*.592,.555,-2.063],[.235,.076,.032],.018);
    b.path(body,m.gap,[[side*.46,.80,-1.77],[side*.48,.863,-1.25],[side*.48,.922,-.85]],.006);
    b.box(body,m.black,[side*.848,.48,-.03],[.035,.075,1.60],.014);
    b.box(body,m.black,[side*.79,.49,1.95],[.11,.14,.16],.024);
    b.box(body,m.black,[side*.72,.465,-2.04],[.08,.14,.14],.020);
  }
  b.box(body,m.black,[0,.461,-2.10],[1.46,.10,.13],.040);
  b.box(body,m.black,[0,.463,2.104],[1.52,.12,.14],.035);
  b.box(body,m.tail,[0,.699,2.091],[1.48,.076,.032],.025);
  b.label(body,'P O R S C H E',[0,.70,2.115],.72,.044,{background:'#982c23',color:'#241e1a',font:'600 48px sans-serif'});
  for(let i=0;i<8;i++)b.box(body,m.black,[0,1.055-i*.018,1.40+i*.057],[.99,.019,.025],.006);
  b.box(body,m.paint,[0,1.031,1.85],[1.18,.067,.22],.025);
  b.label(body,'911 carrera',[.25,.848,1.993],.33,.046,{background:spec.color,color:'#e4e9df',font:'italic 600 65px sans-serif'});
  b.disc(body,m.chrome,[-.53,.305,2.114],.049,.15);b.disc(body,m.black,[-.53,.305,2.20],.037,.014);
  details(body,b,spec,m,.856,-2.11,2.10,.93);
  return windows;
}
export function buildCar(id) {
  const spec=CAR_SPECS[id],b=createModelBuilder(),root=new THREE.Group(),body=new THREE.Group();root.name=spec.name;body.name='sprung-body';root.add(body);
  const m={
    paint:b.material(spec.color,{metalness:.40,roughness:.25}),chrome:b.material('#cbd2d1',{metalness:.86,roughness:.23}),alloy:b.material('#b9c0bd',{metalness:.78,roughness:.30}),
    black:b.material('#171f20',{roughness:.68}),gap:b.material('#36443c',{roughness:.9}),rubber:b.material('#1a2021',{roughness:.98}),sidewall:b.material('#353b3a',{roughness:1}),
    glass:b.material('#75979e',{metalness:.30,roughness:.12,transparent:true,opacity:.32,depthWrite:false,side:THREE.DoubleSide}),
    headlight:b.material('#e9f5ed',{emissive:'#dfeef5',emissiveIntensity:.35,roughness:.15}),tail:b.material('#ae261c',{emissive:'#ff281a',emissiveIntensity:.35,roughness:.25}),
    amber:b.material('#d99431',{emissive:'#d58a29',emissiveIntensity:.15,roughness:.30}),red:b.material('#b63826',{roughness:.5}),caliper:b.material(id==='lamborghini'?'#ca3923':'#7c2822',{metalness:.4,roughness:.45}),disc:b.material('#68706c',{metalness:.8,roughness:.6}),mirror:b.material('#a2c0c3',{metalness:.78,roughness:.11}),
  };
  m.trim=id==='bmw'?m.chrome:m.black;
  const windows=id==='bmw'?buildBMW(body,b,spec,m):id==='lamborghini'?buildLamborghini(body,b,spec,m):buildPorsche(body,b,spec,m);
  const wheels=buildWheels(root,b,spec,m);
  const cockpit=buildCockpit(body,b,id,spec,m);
  const beams=[];
  for(const side of [-1,1]){const spot=new THREE.SpotLight('#fff0d6',0,115,Math.PI/7,.64,1.25);spot.position.set(side*.64,.72,-1.92);spot.target.position.set(side*1.5,-.20,-42);body.add(spot,spot.target);beams.push(spot);}
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,12,64,64,62);gradient.addColorStop(0,'rgba(10,21,19,.6)');gradient.addColorStop(1,'rgba(10,21,19,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  const texture=new THREE.CanvasTexture(canvas);b.textures.add(texture);const shadowMat=b.material('#ffffff',{map:texture,transparent:true,depthWrite:false,roughness:1});const shadow=b.mesh(root,new THREE.PlaneGeometry(3.1,5.5),shadowMat,[0,.024,0]);shadow.rotation.x=-Math.PI/2;shadow.castShadow=false;
  b.batch(body);
  return {root,body,wheels,beams,spec,windows,cockpit,shadow,materials:m,dispose:b.dispose};
}
export function disposeCar(car){car.dispose();}
