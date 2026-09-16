import * as THREE from 'three';
import { clamp } from './dynamics.js';

export function buildCockpit(body,b,id,spec,m) {
  const low=id==='lamborghini';
  const cabin=new THREE.Group();body.add(cabin);
  const dashY=low?.68:id==='bmw'?.84:.81,eyeY=low?.98:id==='bmw'?1.175:1.14;
  const driverX=low?-.37:-.34;
  const leather=b.material(low?'#242a28':id==='bmw'?'#39352e':'#383c3a',{roughness:.96});
  const seatMat=b.material(id==='bmw'?'#8e6547':id==='porsche'?'#7c7668':'#333932',{roughness:.94});
  const stitch=b.material(id==='lamborghini'?spec.color:'#bbaf93',{roughness:.85});
  b.box(cabin,leather,[0,.31,.23],[1.34,.09,1.85],.025);
  b.box(cabin,leather,[0,dashY,-.68],[low?1.7:1.47,.20,.42],.075);
  b.box(cabin,m.black,[driverX,dashY+.10,-.50],[low?.67:.70,.25,.18],.05);
  for(const side of [-1,1]) {
    const x=side*(low?.86:.74);
    b.box(cabin,leather,[x,.64,.12],[.055,.54,1.4],.025);
    b.box(cabin,seatMat,[side*.36,.48,.46],[.52,.15,.55],.05);
    const back=b.box(cabin,seatMat,[side*.36,.77,.78],[.52,.62,.13],.065);back.rotation.x=-.14;
    b.box(cabin,seatMat,[side*.36,1.08,.83],[.29,.22,.13],.05);
    for(const offset of [-.18,.18])b.beam(cabin,stitch,[side*.36+offset,.54,.22],[side*.36+offset,.54,.65],.006);
    b.box(cabin,m.chrome,[x-side*.035,.78,.13],[.055,.035,.16],.01);
    for(let i=0;i<4;i++)b.box(cabin,m.black,[side*.59,dashY+.017,-.458+i*.001],[.13,.012,.012],.003).position.y+=i*.027;
  }
  b.box(cabin,leather,[0,.48,.11],[.24,.30,.94],.025);
  b.box(cabin,m.black,[.04,.63,.19],[.16,.035,.24],.02);
  b.beam(cabin,m.chrome,[.04,.64,.19],[.04,.81,.10],.013);
  b.sphere(cabin,low?m.chrome:leather,[.04,.81,.10],[.045,.045,.045]);
  const radio=b.box(cabin,m.black,[.21,dashY-.035,-.445],[.30,.08,.025],.008);
  for(const x of [.1,.32])b.disc(cabin,m.chrome,[x,dashY-.032,-.417],.021,.018,[0,0,1],12);
  if(low)for(let i=0;i<5;i++)b.box(cabin,i===2?m.red:m.chrome,[.02+i*.036,dashY-.13,-.36],[.018,.022,.03],.004);
  // An actual instrument texture, updated from the simulated speed, RPM and gear.
  const canvas=document.createElement('canvas');canvas.width=id==='porsche'?1024:768;canvas.height=288;
  const ctx=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;b.textures.add(texture);
  const displayMat=b.material('#ffffff',{map:texture,emissiveMap:texture,emissive:'#ffffff',emissiveIntensity:.25,roughness:1,toneMapped:false});
  const screen=b.mesh(cabin,new THREE.PlaneGeometry(id==='porsche'?.66:low?.70:.59,.222),displayMat,[driverX,dashY+.095,-.400]);
  screen.name='live-instruments';
  const wheel=new THREE.Group();wheel.userData.movable=true;wheel.position.set(driverX,dashY+.065,-.30);wheel.rotation.x=-.15;cabin.add(wheel);
  const rotation=new THREE.Group();wheel.add(rotation);
  b.torus(rotation,leather,[0,0,0],low?.153:.17,low?.018:.017);
  for(const angle of [0,Math.PI/2,Math.PI*3/2]) {
    const x=Math.sin(angle)*.15,y=-Math.cos(angle)*.15;
    b.beam(rotation,low?m.black:m.chrome,[0,0,0],[x,y,0],low?.027:.020,6);
  }
  b.disc(rotation,leather,[0,0,.005],.057,.035);
  b.disc(rotation,low?stitch:m.chrome,[0,0,.026],.023,.004);
  if(low)b.beam(rotation,stitch,[-.025,.151,.012],[.025,.151,.012],.005);
  b.batch(rotation);
  // The mirror receives a small live rear-view render in the game loop.
  const mirrorY=eyeY+(low?.08:.13);
  b.box(cabin,m.black,[0,mirrorY,-.64],[.34,.105,.035],.019);
  const mirrorMaterial=new THREE.MeshBasicMaterial({color:'#ffffff',toneMapped:false});b.materials.add(mirrorMaterial);
  const mirror=b.mesh(cabin,new THREE.PlaneGeometry(.305,.077),mirrorMaterial,[0,mirrorY,-.617]);mirror.name='rear-view-mirror';mirror.userData.movable=true;mirror.castShadow=mirror.receiveShadow=false;
  b.beam(cabin,m.black,[0,mirrorY+.05,-.65],[0,mirrorY+.07,-.70],.012);
  const eye=new THREE.Object3D();eye.name='driver-eye';eye.position.set(driverX,eyeY,.24);body.add(eye);
  const bonnet=new THREE.Object3D();bonnet.name='bonnet-camera';bonnet.position.set(0,low?1.07:1.20,low?-1.14:-1.00);body.add(bonnet);
  let lastDraw=-1;
  function dial(cx,cy,r,value,max,label,color,major=8) {
    ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fillStyle='#101817';ctx.fill();ctx.strokeStyle='#59605a';ctx.lineWidth=3;ctx.stroke();
    const from=Math.PI*.76,range=Math.PI*1.48;
    for(let i=0;i<=major*4;i++) {
      const a=from+i/(major*4)*range,large=i%4===0;ctx.strokeStyle=i/(major*4)>.85&&label==='RPM'?'#d58055':color;ctx.lineWidth=large?3:1;
      ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*r*.87,cy+Math.sin(a)*r*.87);ctx.lineTo(cx+Math.cos(a)*r*(large?.72:.79),cy+Math.sin(a)*r*(large?.72:.79));ctx.stroke();
      if(large){ctx.font=`500 ${r*.16}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(Math.round(i/(major*4)*max),cx+Math.cos(a)*r*.55,cy+Math.sin(a)*r*.55);}
    }
    const a=from+clamp(value/max,0,1)*range;ctx.strokeStyle='#ee8056';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(cx-Math.cos(a)*r*.15,cy-Math.sin(a)*r*.15);ctx.lineTo(cx+Math.cos(a)*r*.78,cy+Math.sin(a)*r*.78);ctx.stroke();ctx.beginPath();ctx.arc(cx,cy,7,0,Math.PI*2);ctx.fillStyle='#d2c4a2';ctx.fill();
    ctx.fillStyle=color;ctx.font=`500 ${r*.14}px monospace`;ctx.fillText(label,cx,cy+r*.36);
  }
  function update(state,night,time,force=false) {
    rotation.rotation.z=-(state.steeringAngle||0)*(low?9:12);
    if(!force&&time-lastDraw<.1)return;lastDraw=time;
    const w=canvas.width,h=canvas.height,speed=Math.round(Math.abs(state.speed)*3.6),rpm=state.rpm||spec.idle;
    const light=night>.5?'#e6be87':'#e7ebdc';ctx.fillStyle='#17201e';ctx.fillRect(0,0,w,h);
    if(low) {
      ctx.strokeStyle='#34443a';ctx.lineWidth=16;ctx.beginPath();ctx.arc(248,167,123,Math.PI*.88,Math.PI*2.12);ctx.stroke();
      ctx.strokeStyle=rpm>spec.redline*.83?'#f19a64':spec.color;ctx.beginPath();ctx.arc(248,167,123,Math.PI*.88,Math.PI*.88+clamp(rpm/spec.redline,0,1)*Math.PI*1.24);ctx.stroke();
      ctx.textAlign='center';ctx.fillStyle=light;ctx.font='500 86px monospace';ctx.fillText(state.gear===-1?'R':String(state.gear||1),248,160);
      ctx.font='500 25px monospace';ctx.fillText('STRADA',248,206);ctx.font='500 70px monospace';ctx.fillText(speed,652,160);ctx.font='500 21px monospace';ctx.fillText('km/h',652,194);ctx.font='500 18px monospace';ctx.fillStyle='#aab7a2';ctx.fillText(`${Math.round(rpm)} RPM`,248,247);
    } else if(id==='porsche') {
      dial(102,145,78,78,120,'OIL',light,6);dial(288,145,95,90,140,'°C',light,7);dial(512,145,127,rpm/1000,8,'RPM',light,8);dial(742,145,95,speed,280,'km/h',light,7);dial(928,145,78,1,1,'FUEL',light,4);
    } else {
      dial(153,139,106,speed,220,'km/h',light,11);dial(402,139,119,rpm/1000,7,'RPM',light,7);dial(633,139,84,1,1,'FUEL',light,4);
      ctx.fillStyle=light;ctx.font='500 18px monospace';ctx.fillText('2002',633,249);
    }
    displayMat.emissiveIntensity=.23+night*.7;texture.needsUpdate=true;
  }
  update({speed:0,rpm:spec.idle,gear:1},0,0,true);
  return {eye,bonnet,steeringWheel:rotation,mirror,mirrorMaterial,update,screen,cabin};
}
