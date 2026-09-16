import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { World, THEMES } from './world.js';
import { buildCar, disposeCar } from './cars.js';
import { CAR_SPECS, clamp, damp, stepVehicle, cruiseInput, randomAt, settleVehicle, surfaceHeight, wheelSteeringAngle, wheelContacts } from './dynamics.js';
import { Soundscape } from './audio.js';
import { mountUI, refreshIcons, icon } from './ui.js';
import './style.css';

mountUI();
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let saved={};try{saved=JSON.parse(localStorage.getItem('elsewhere-settings')||'{}')||{};}catch{}
const query=new URLSearchParams(location.search);
const initialTheme=query.get('theme')||saved.theme;
let theme=Object.hasOwn(THEMES,initialTheme)?initialTheme:'alpine';
let carId=Object.hasOwn(CAR_SPECS,saved.car)?saved.car:'bmw';
let seed=(query.get('seed')||saved.seed||'slow-sunday').slice(0,64);
let quality=['low','medium','high'].includes(saved.quality)?saved.quality:matchMedia('(pointer: coarse)').matches?'medium':'high';
let nightTarget=saved.night===true?1:0,night=nightTarget,started=false,paused=false,autodrive=false,origin=0,cameraMode=0,uiHidden=false;
const sound=new Soundscape();sound.volume=Number.isFinite(saved.volume)?clamp(saved.volume,0,1):.32;sound.musicVolume=Number.isFinite(saved.music)?clamp(saved.music,0,1):.3;sound.muted=saved.muted===true;sound.theme=theme;sound.car=carId;
function save(){try{localStorage.setItem('elsewhere-settings',JSON.stringify({theme,car:carId,seed,quality,night:!!nightTarget,volume:sound.volume,music:sound.musicVolume,muted:sound.muted}));}catch{}}
let renderer;
try {
  renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
} catch(error) {
  $('#app').innerHTML='<div class="gpu-error"><div><div class="eyebrow">A SMALL BUMP IN THE ROAD</div><h1>Your browser needs WebGL to explore here.</h1><p>Enable hardware acceleration in your browser, or try a recent version of Chrome, Firefox, Safari, or Edge.</p><button class="primary-button" onclick="location.reload()">Try again ↗</button></div></div>';
  throw error;
}
renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,quality==='high'?1.75:quality==='medium'?1.25:1));
renderer.shadowMap.enabled=quality!=='low';renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
$('#scene').append(renderer.domElement);
const scene=new THREE.Scene();
const environmentRoom=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);const environmentMap=pmrem.fromScene(environmentRoom,.04);scene.environment=environmentMap.texture;scene.environmentIntensity=.42;environmentRoom.dispose();pmrem.dispose();
const mirrorTarget=new THREE.WebGLRenderTarget(256,96),mirrorCamera=new THREE.PerspectiveCamera(55,256/96,.15,1100);let mirrorTime=0;mirrorTarget.texture.repeat.x=-1;mirrorTarget.texture.offset.x=1;
scene.fog=new THREE.Fog(THEMES[theme].fog,200,quality==='low'?760:1300);
const camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.1,3500);
const sun=new THREE.DirectionalLight('#fff1cc',3.1);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-85;sun.shadow.camera.right=85;sun.shadow.camera.top=85;sun.shadow.camera.bottom=-85;sun.shadow.camera.near=1;sun.shadow.camera.far=450;sun.shadow.bias=-.0003;sun.shadow.normalBias=.055;scene.add(sun,sun.target);
const hemi=new THREE.HemisphereLight('#d3e6e6','#788058',2.5);scene.add(hemi);
const skyMaterial=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{top:{value:new THREE.Color(THEMES[theme].sky)},bottom:{value:new THREE.Color(THEMES[theme].horizon)},night:{value:night},sunDirection:{value:new THREE.Vector3(-.6,.45,-.6).normalize()}},vertexShader:'varying vec3 vDirection; void main(){ vDirection=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',fragmentShader:`varying vec3 vDirection;uniform vec3 top;uniform vec3 bottom;uniform float night;uniform vec3 sunDirection;
void main(){vec3 dir=normalize(vDirection);float h=pow(max(0.0,dir.y),.52);vec3 col=mix(bottom,top,h);float glow=pow(max(dot(dir,sunDirection),0.0),18.0)*.22;float disc=smoothstep(.99965,.9998,dot(dir,sunDirection));col+=vec3(1.0,.88,.6)*glow*(1.0-night);col=mix(col,vec3(1.0,.97,.83),disc*(1.0-night));gl_FragColor=vec4(col,1.0);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});
const sky=new THREE.Mesh(new THREE.SphereGeometry(2600,24,16),skyMaterial);sky.renderOrder=-10;scene.add(sky);
const starsGeo=new THREE.BufferGeometry(),starPositions=[];
for(let i=0;i<1200;i++){const theta=randomAt(i*3,11)*Math.PI*2,phi=randomAt(i*3+1,11)*Math.PI*.48,r=2100;starPositions.push(Math.cos(theta)*Math.sin(phi)*r,Math.cos(phi)*r,Math.sin(theta)*Math.sin(phi)*r);}
starsGeo.setAttribute('position',new THREE.Float32BufferAttribute(starPositions,3));const stars=new THREE.Points(starsGeo,new THREE.PointsMaterial({color:'#d3e4ea',size:2.2,sizeAttenuation:false,transparent:true,opacity:night,depthWrite:false}));scene.add(stars);
const moon=new THREE.Mesh(new THREE.SphereGeometry(24,24,16),new THREE.MeshBasicMaterial({color:'#f0f0db',transparent:true,opacity:night,fog:false}));scene.add(moon);
const clouds=new THREE.Group();scene.add(clouds);const cloudMaterial=new THREE.MeshBasicMaterial({color:'#f2f1df',transparent:true,opacity:.3,depthWrite:false,fog:true});const cloudGeometry=new THREE.IcosahedronGeometry(1,2);
for(let i=0;i<18;i++) {
  const cloud=new THREE.Group();const x=(randomAt(i*7,22)-.5)*2400,y=230+randomAt(i*7+1,22)*150,z=(randomAt(i*7+2,22)-.5)*1800;
  cloud.position.set(x,y,z);
  for(let j=0;j<4;j++){const puff=new THREE.Mesh(cloudGeometry,cloudMaterial);puff.position.set(j*31,randomAt(i*7+j,33)*7,0);puff.scale.set(45,9+randomAt(i*3+j,44)*7,22);cloud.add(puff);}clouds.add(cloud);
}
// Low-cost atmospheric ridges fill the horizon without extending the active terrain.
const ridges=new THREE.Group();scene.add(ridges);
const ridgeMaterial=new THREE.MeshBasicMaterial({vertexColors:true,fog:false});
for(let i=0;i<13;i++){
  let geo=new THREE.ConeGeometry(1,1,9,5).toNonIndexed();
  const pos=geo.attributes.position,colors=[];
  for(let v=0;v<pos.count;v++){
    const h=pos.getY(v)+.5;
    const color=new THREE.Color(h>.79?'#e1e6d9':h>.64?'#b9cbbb':'#a3bdad');
    color.multiplyScalar(.97+randomAt(Math.floor(v/3)+i*59,92)*.06);
    colors.push(color.r,color.g,color.b);
  }
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  const mountain=new THREE.Mesh(geo,ridgeMaterial);
  const height=210+randomAt(i,71)*230;
  mountain.position.set((i-6)*300,height*.5-75,-1700-randomAt(i,72)*250);
  mountain.scale.set(420+randomAt(i,74)*290,height,370);
  mountain.rotation.y=randomAt(i,75)*6.28;ridges.add(mountain);
}
const world=new World(scene,seed,theme,quality);
let car=buildCar(carId);scene.add(car.root);
const state={s:180,x:0,speed:0,heading:0,travelHeading:0,steer:0,distance:0,offroad:false};
function resetCar(announce=true){state.x=world.road.x(state.s)+2.3;state.heading=world.road.heading(state.s);state.speed=0;settleVehicle(state,car.spec,world.road);if(announce)toast('Back on the road. No worries.');}
resetCar(false);world.update(state.s,origin);
const keys=new Set(),touch={left:0,right:0,throttle:0,brake:0};
let cameraReady=false,lastTime=0,elapsed=0,hudTime=0,lightingTime=0,toastTimer,contextLost=false,fpsFrames=0,fpsTime=0,frameRate=60;
let carY=world.road.y(state.s),activeDialog=null,lastFocus=null,orbitYaw=0,orbitTilt=0,dragging=false,dragPoint=null;
const cameraNames=['Chase','Cockpit','Bonnet','Wide'];
const wheelCenter=new THREE.Vector3(),bodyOrientation=new THREE.Quaternion();
const cameraForward=new THREE.Vector3(),cameraUp=new THREE.Vector3(0,1,0);
const cameraTarget=new THREE.Vector3(),cameraDesired=new THREE.Vector3(),lookDesired=new THREE.Vector3();
const dayTop=new THREE.Color(),dayBottom=new THREE.Color(),dayFog=new THREE.Color();
const nightTop=new THREE.Color('#091526'),nightBottom=new THREE.Color('#374953'),nightFog=new THREE.Color('#273d49');
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3000);}
function updateUrl(){const url=new URL(location.href);url.searchParams.set('seed',seed);url.searchParams.set('theme',theme);history.replaceState(null,'',url);}
function syncUI(){
  $$('[data-theme]').forEach(b=>{b.classList.toggle('selected',b.dataset.theme===theme);b.setAttribute('aria-pressed',b.dataset.theme===theme);});
  $$('[data-car]').forEach(b=>{b.classList.toggle('selected',b.dataset.car===carId);b.setAttribute('aria-pressed',b.dataset.car===carId);});
  $('#day-btn').classList.toggle('selected',!nightTarget);$('#night-btn').classList.toggle('selected',!!nightTarget);$('#day-btn').setAttribute('aria-pressed',!nightTarget);$('#night-btn').setAttribute('aria-pressed',!!nightTarget);
  document.body.classList.toggle('night',!!nightTarget);$('#car-name').textContent=CAR_SPECS[carId].name;$('#seed-display').textContent=seed;$('#seed-input').value=seed;$('#quality').value=quality;
  $('#location').textContent=THEMES[theme].location;$('#cruise-btn').setAttribute('aria-checked',autodrive);
  $('#volume').value=Math.round(sound.volume*100);$('#volume-output').textContent=Math.round(sound.volume*100)+'%';$('#music').value=Math.round(sound.musicVolume*100);$('#music-output').textContent=Math.round(sound.musicVolume*100)+'%';
  $('#sound-btn').innerHTML=icon(sound.muted?'volume-x':'volume-2');$('#sound-btn').setAttribute('aria-label',sound.muted?'Unmute sound':'Mute sound');refreshIcons();save();
}
function startDrive(){
  started=true;paused=false;document.body.classList.add('playing');$('#escape-panel').classList.add('closed');$('#escape-panel').classList.remove('mobile-open');$('#journey-btn').setAttribute('aria-expanded','false');
  sound.start().catch(()=>toast('Sound is unavailable. The road is still yours.'));$('#pause-overlay').hidden=true;
  toast(autodrive?'Autodrive is on. Settle in.':'W or ↑ to go. There’s no hurry.');
}
function setPause(value){if(!started)return;paused=value;$('#pause-overlay').hidden=!value;$('#pause-btn').innerHTML=icon(value?'play':'pause');$('#pause-btn').setAttribute('aria-label',value?'Resume drive':'Pause drive');refreshIcons();if(!value)sound.start().catch(()=>{});}
function setAutodrive(value){autodrive=value;$('#cruise-btn').setAttribute('aria-checked',value);if(value&&!started)startDrive();if(started)toast(value?'Autodrive on. Enjoy the view.':'The wheel is yours.');}
function setCamera(value){cameraMode=Number(value);document.body.classList.toggle('cockpit-view',cameraMode===1);cameraReady=false;orbitYaw=orbitTilt=0;$('#camera-view').value=String(cameraMode);$('#camera-btn').setAttribute('aria-label',`Change camera: ${cameraNames[cameraMode]}`);$('#camera-status').textContent=cameraNames[cameraMode]+' view';if(!started)startDrive();toast(cameraMode===1?'Cockpit · live instruments and rear-view mirror':cameraNames[cameraMode]+' camera');}
function setNight(value){nightTarget=value?1:0;syncUI();}
function setTheme(value){if(value===theme)return;theme=value;world.setEnvironment(seed,theme);world.initialized=false;world.update(state.s,origin);sound.theme=theme;resetCar(false);cameraReady=false;syncUI();updateUrl();toast(`${THEMES[theme].name}. A change of scenery.`);}
function setCar(value){if(value===carId)return;scene.remove(car.root);disposeCar(car);carId=value;car=buildCar(carId);scene.add(car.root);settleVehicle(state,car.spec,world.road);cameraReady=false;sound.car=carId;syncUI();$('#car-picker').hidden=true;$('#car-btn').setAttribute('aria-expanded','false');toast(CAR_SPECS[carId].subtitle);}
function setQuality(value){quality=value;world.quality=value;world.setEnvironment(seed,theme);world.initialized=false;world.update(state.s,origin);renderer.setPixelRatio(Math.min(devicePixelRatio,value==='high'?1.75:value==='medium'?1.25:1));renderer.shadowMap.enabled=value!=='low';sun.shadow.mapSize.set(value==='high'?2048:1024,value==='high'?2048:1024);sun.shadow.map?.dispose();sun.shadow.map=null;save();}
function openDialog(id){lastFocus=document.activeElement;activeDialog=id;$('#'+id).hidden=false;keys.clear();if(id==='seed-modal')$('#seed-input').value=seed;$('#'+id).querySelector('input,button,select')?.focus();}
function closeDialog(id){$('#'+id).hidden=true;if(activeDialog===id)activeDialog=null;if(id==='car-picker')$('#car-btn').setAttribute('aria-expanded','false');lastFocus?.focus();}
$('#start-btn').addEventListener('click',startDrive);
$('#camera-btn').addEventListener('click',()=>setCamera((cameraMode+1)%4));$('#camera-view').addEventListener('change',e=>setCamera(e.target.value));
renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','Driving view');
renderer.domElement.addEventListener('pointerdown',e=>{if(activeDialog||cameraMode===1||cameraMode===2)return;dragging=true;dragPoint=[e.clientX,e.clientY];renderer.domElement.setPointerCapture(e.pointerId);});
renderer.domElement.addEventListener('pointermove',e=>{if(!dragging)return;orbitYaw-= (e.clientX-dragPoint[0])*.006;orbitTilt=clamp(orbitTilt+(e.clientY-dragPoint[1])*.012,-1.5,6);dragPoint=[e.clientX,e.clientY];});
renderer.domElement.addEventListener('pointerup',()=>dragging=false);renderer.domElement.addEventListener('pointercancel',()=>dragging=false);renderer.domElement.addEventListener('dblclick',()=>{orbitYaw=orbitTilt=0;});
$('#resume-btn').addEventListener('click',()=>setPause(false));$('#pause-btn').addEventListener('click',()=>setPause(!paused));
$$('[data-theme]').forEach(b=>b.addEventListener('click',()=>setTheme(b.dataset.theme)));
$$('[data-car]').forEach(b=>b.addEventListener('click',()=>setCar(b.dataset.car)));
$('#car-btn').addEventListener('click',()=>{const open=$('#car-picker').hidden;$('#car-picker').hidden=!open;$('#car-btn').setAttribute('aria-expanded',open);});
$('#day-btn').addEventListener('click',()=>setNight(false));$('#night-btn').addEventListener('click',()=>setNight(true));
$('#cruise-btn').addEventListener('click',()=>setAutodrive(!autodrive));
$('#journey-btn').addEventListener('click',()=>{const panel=$('#escape-panel');if(started)panel.classList.toggle('closed');else panel.classList.toggle('mobile-open');$('#journey-btn').setAttribute('aria-expanded',started?!panel.classList.contains('closed'):panel.classList.contains('mobile-open'));});
$('#settings-btn').addEventListener('click',()=>openDialog('settings-modal'));$('#seed-btn').addEventListener('click',()=>openDialog('seed-modal'));
$$('[data-close]').forEach(b=>b.addEventListener('click',()=>closeDialog(b.dataset.close)));
$$('.modal-backdrop').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeDialog(m.id);}));
$('#sound-btn').addEventListener('click',()=>{sound.muted=!sound.muted;sound.start().catch(()=>{});syncUI();});
$('#fullscreen-btn').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else toast('Use your browser’s fullscreen controls.');}catch{toast('Use your browser’s fullscreen controls.');}});
$('#quality').addEventListener('change',e=>setQuality(e.target.value));
$('#volume').addEventListener('input',e=>{sound.volume=Number(e.target.value)/100;$('#volume-output').textContent=e.target.value+'%';sound.start().catch(()=>{});save();});
$('#music').addEventListener('input',e=>{sound.musicVolume=Number(e.target.value)/100;$('#music-output').textContent=e.target.value+'%';sound.start().catch(()=>{});save();});
$('#apply-seed').addEventListener('click',()=>{const value=$('#seed-input').value.trim();if(!value){$('#seed-input').focus();toast('Give this road a name first.');return;}seed=value;state.s=180;state.distance=0;origin=0;world.setEnvironment(seed,theme);world.initialized=false;world.update(state.s,origin);resetCar(false);cameraReady=false;syncUI();updateUrl();closeDialog('seed-modal');toast('A new road, just for you.');});
$('#seed-input').addEventListener('keydown',e=>{if(e.key==='Enter')$('#apply-seed').click();});
$('#copy-seed').addEventListener('click',async()=>{const url=new URL(location.href);url.searchParams.set('seed',$('#seed-input').value.trim()||seed);url.searchParams.set('theme',theme);try{await navigator.clipboard.writeText(url.href);toast('Road link copied. A little escape to share.');}catch{const field=$('#seed-input');field.value=url.href;field.select();toast('Select and copy the link in the field.');}});
function manualInput(){if(autodrive){autodrive=false;$('#cruise-btn').setAttribute('aria-checked',false);toast('The wheel is yours.');}}
const drivingKeys=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
addEventListener('keydown',e=>{
  if(activeDialog){if(e.code==='Escape'){e.preventDefault();closeDialog(activeDialog);}if(e.key==='Tab'){const focusables=[...$('#'+activeDialog).querySelectorAll('button,input,select')];const first=focusables[0],last=focusables.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}return;}
  if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName))return;
  if(drivingKeys.includes(e.code)||e.code==='Space')e.preventDefault();
  keys.add(e.code);if(e.repeat)return;
  if(drivingKeys.includes(e.code)||e.code==='ShiftLeft'||e.code==='ShiftRight'){if(!started)startDrive();manualInput();}
  if(e.code==='KeyR')resetCar();
  if(e.code==='KeyF')setAutodrive(!autodrive);
  if(e.code==='KeyN')setNight(!nightTarget);
  if(e.code==='KeyC')setCamera((cameraMode+1)%4);
  if(e.code==='KeyM')$('#sound-btn').click();
  if(e.code==='Space'){if(!started)startDrive();else setPause(!paused);}
  if(e.code==='Escape'){if(!$('#car-picker').hidden)closeDialog('car-picker');else if(started)setPause(!paused);}
  if(e.code==='KeyH'){uiHidden=!uiHidden;document.body.classList.toggle('hidden-ui',uiHidden);}
});
addEventListener('keyup',e=>keys.delete(e.code));
const releaseInputs=()=>{keys.clear();Object.keys(touch).forEach(k=>touch[k]=0);$$('[data-control]').forEach(b=>b.classList.remove('active'));};
addEventListener('blur',()=>{releaseInputs();if(started)setPause(true);});
document.addEventListener('visibilitychange',()=>{if(document.hidden){releaseInputs();if(started)setPause(true);sound.suspend();}else lastTime=performance.now();});
$$('[data-control]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);touch[b.dataset.control]=1;b.classList.add('active');manualInput();sound.start().catch(()=>{});});const release=()=>{touch[b.dataset.control]=0;b.classList.remove('active');};b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release);});
addEventListener('gamepadconnected',()=>{$('#gamepad-note').textContent='Gamepad connected · left stick + triggers';toast('Gamepad connected. Make yourself comfortable.');});
let padButtons=[];
function getInput(){
  let steer=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'))+touch.right-touch.left;
  let throttle=Number(keys.has('KeyW')||keys.has('ArrowUp'))||touch.throttle;
  let brake=Number(keys.has('KeyS')||keys.has('ArrowDown'))||touch.brake;
  let handbrake=Number(keys.has('ShiftLeft')||keys.has('ShiftRight'));
  const gamepad=Array.from(navigator.getGamepads?.()||[]).find(Boolean);
  if(gamepad){const axis=gamepad.axes[0]||0;if(Math.abs(axis)>.12)steer=axis;throttle=Math.max(throttle,gamepad.buttons[7]?.value||0);brake=Math.max(brake,gamepad.buttons[6]?.value||0);if(Math.abs(axis)>.2||throttle>.1||brake>.1){manualInput();if(!started)startDrive();}const buttons=gamepad.buttons.map(b=>b.pressed);handbrake=Math.max(handbrake,gamepad.buttons[1]?.value||0);if(handbrake)manualInput();if(buttons[2]&&!padButtons[2])setCamera((cameraMode+1)%4);if(buttons[0]&&!padButtons[0])resetCar();if(buttons[3]&&!padButtons[3])setAutodrive(!autodrive);if(buttons[9]&&!padButtons[9])setPause(!paused);padButtons=buttons;}
  return {steer:clamp(steer,-1,1),throttle,brake,handbrake};
}
function lighting(dt){
  night=damp(night,nightTarget,reducedMotion?12:.85,dt);const p=THEMES[theme];
  dayTop.set(p.sky).lerp(nightTop,night);dayBottom.set(p.horizon).lerp(nightBottom,night);dayFog.set(p.fog).lerp(nightFog,night);
  skyMaterial.uniforms.top.value.copy(dayTop);skyMaterial.uniforms.bottom.value.copy(dayBottom);skyMaterial.uniforms.night.value=night;
  scene.fog.color.copy(dayFog);scene.fog.near=200-night*80;scene.fog.far=(quality==='low'?760:1300)-night*250;
  sun.color.set(p.light).lerp(new THREE.Color('#a7c4e0'),night);sun.intensity=3.1*(1-night)+.47*night;
  hemi.color.set('#d1e4df').lerp(new THREE.Color('#7496b3'),night);hemi.groundColor.set('#889264').lerp(new THREE.Color('#364658'),night);hemi.intensity=2.4*(1-night)+.65*night;
  ridgeMaterial.color.set('#ffffff').lerp(new THREE.Color('#283d51'),night);ridges.visible=theme==='alpine';renderer.toneMappingExposure=1.13-night*.16;cloudMaterial.opacity=.28*(1-night)+.035*night;stars.material.opacity=night;moon.material.opacity=night;
  scene.environmentIntensity=.42-night*.31;car.beams.forEach(b=>b.intensity=night*125);
  lightingTime+=dt;if(lightingTime>.2){world.setNight(night);lightingTime=0;}
}
function updateView(dt,input){
  const road=world.road,s=state.s;
  carY=state.heave??road.y(s);
  car.root.position.set(state.x,carY,-(s-origin));car.root.rotation.set(0,-state.heading,0);
  car.body.rotation.set(reducedMotion?(state.groundPitch||0):(state.pitch||0),0,reducedMotion?(state.groundRoll||0):(state.roll||0),'YXZ');
  bodyOrientation.copy(car.body.quaternion);
  car.wheels.forEach((w,i)=>{
    // Match the axle centers to the tilted body; suspension changes height independently.
    wheelCenter.set(w.x,w.radius,w.z).applyQuaternion(bodyOrientation);
    const contact=state.contacts?.[i];
    w.pivot.position.set(wheelCenter.x,(contact?contact.height-carY:0)+w.radius,wheelCenter.z);
    const steer=wheelSteeringAngle(car.spec,state.steeringAngle||0,w.side,w.front);
    w.pivot.rotation.set(state.groundPitch||0,-steer,state.groundRoll||0,'YXZ');w.spin.rotation.x=state.wheelRotation||0;
  });
  car.shadow.position.y=.025;car.shadow.rotation.set(-Math.PI/2+(state.groundPitch||0),0,state.groundRoll||0);
  car.materials.tail.emissiveIntensity=.35+night*.7+Math.max(state.brake||0,state.handbrake||0)*3.5;
  car.materials.headlight.emissiveIntensity=.35+night*3;
  car.windows.visible=!(started&&(cameraMode===1||cameraMode===2));
  car.cockpit.update(state,night,elapsed);
  car.root.updateMatrixWorld(true);
  const locked=started&&(cameraMode===1||cameraMode===2);
  if(locked){
    const anchor=cameraMode===1?car.cockpit.eye:car.cockpit.bonnet;anchor.getWorldPosition(cameraDesired);
    cameraForward.set(0,cameraMode===1?-.035:-.10,-1).applyQuaternion(car.body.getWorldQuaternion(new THREE.Quaternion()));
    lookDesired.copy(cameraDesired).addScaledVector(cameraForward,30);
    cameraUp.set(0,1,0).applyQuaternion(car.body.getWorldQuaternion(new THREE.Quaternion()));camera.up.copy(cameraUp);
    camera.position.copy(cameraDesired);cameraTarget.copy(lookDesired);cameraReady=true;
  }else{
    camera.up.set(0,1,0);
    const h=state.heading+orbitYaw,backX=-Math.sin(h),backZ=Math.cos(h);
    const distance=!started?11.7:cameraMode===3?19:9.1;
    const height=(!started?4.3:cameraMode===3?7.3:3.1)+orbitTilt;
    const ahead=(!started?10:cameraMode===3?8:5)*Math.max(0,Math.cos(orbitYaw));
    const side=!started?(innerWidth<620?0:4.5):0;
    cameraDesired.set(state.x+backX*distance+Math.cos(h)*side,carY+height,-(s-origin)+backZ*distance+Math.sin(h)*side);
    cameraDesired.y=Math.max(cameraDesired.y,surfaceHeight(road,cameraDesired.x,origin-cameraDesired.z)+.9);
    lookDesired.set(state.x+Math.sin(state.heading)*ahead,carY+1.0,-(s-origin)-Math.cos(state.heading)*ahead);
    if(!cameraReady){camera.position.copy(cameraDesired);cameraTarget.copy(lookDesired);cameraReady=true;}
    else{camera.position.lerp(cameraDesired,1-Math.exp(-dt*(reducedMotion?24:6)));cameraTarget.lerp(lookDesired,1-Math.exp(-dt*7));}
  }
  camera.lookAt(cameraTarget);
  const targetFov=locked?(cameraMode===1?67:60):49+(reducedMotion?0:Math.min(Math.abs(state.speed)*.06,4));
  camera.fov=damp(camera.fov,targetFov,7,dt);camera.updateProjectionMatrix();
  ridges.position.set(state.x,0,-(s-origin));sky.position.copy(camera.position);stars.position.copy(camera.position);moon.position.copy(camera.position).add(new THREE.Vector3(560,330,-1550));clouds.position.set(state.x,0,-(s-origin));
  sun.position.set(state.x-75,carY+125,-(s-origin)-85);sun.target.position.set(state.x,carY,-(s-origin)-12);
  mirrorTime+=dt;
  if(cameraMode===1&&started&&mirrorTime>.12){
    mirrorTime=0;car.cockpit.mirrorMaterial.map=mirrorTarget.texture;car.cockpit.mirrorMaterial.needsUpdate=true;
    mirrorCamera.position.set(state.x-Math.sin(state.heading)*2.25,carY+1.45,-(s-origin)+Math.cos(state.heading)*2.25);
    mirrorCamera.lookAt(state.x-Math.sin(state.heading)*42,carY+1.35,-(s-origin)+Math.cos(state.heading)*42);
    car.root.visible=false;renderer.setRenderTarget(mirrorTarget);renderer.render(scene,mirrorCamera);renderer.setRenderTarget(null);car.root.visible=true;
  }
}
function animate(now){
  requestAnimationFrame(animate);if(contextLost)return;
  const rawDt=lastTime?(now-lastTime)/1000:1/60;const dt=Math.min(rawDt,.05);lastTime=now;fpsFrames++;fpsTime+=rawDt;if(fpsTime>=1){frameRate=fpsFrames/fpsTime;fpsFrames=0;fpsTime=0;}if(document.hidden)return;elapsed+=dt;
  let input=activeDialog?{steer:0,throttle:0,brake:0}:getInput();if(autodrive)input=cruiseInput(state,world.road,car.spec);
  if(started&&!paused&&!activeDialog){const steps=Math.max(1,Math.ceil(dt/(1/120)));for(let i=0;i<steps;i++){stepVehicle(state,input,car.spec,world.road,dt/steps);if(world.resolveVehicle(state,car.spec))state.contacts=wheelContacts(state,car.spec,world.road);if(state.needsRecovery){resetCar(false);toast('Back on dry ground. Keep wandering.');break;}}}
  const nextOrigin=Math.floor(state.s/1600)*1600;if(nextOrigin!==origin){const delta=nextOrigin-origin;camera.position.z+=delta;cameraTarget.z+=delta;origin=nextOrigin;}
  world.update(state.s,origin,state.x);world.animate(elapsed,paused||!!activeDialog?0:dt);lighting(dt);updateView(dt,input);sound.update(state,elapsed,night>.5,paused||!!activeDialog||!started);
  hudTime+=dt;if(hudTime>.1){$('#speed').textContent=Math.round(Math.abs(state.speed)*3.6);$('#gear').textContent=state.gear===-1?'R':String(state.gear||1);$('#rpm').textContent=Math.round((state.rpm||car.spec.idle)/100)*100;$('#rev-fill').style.width=clamp((state.rpm||0)/car.spec.redline*100,0,100)+'%';$('#distance').innerHTML=(state.distance/1000).toFixed(1)+' <span>km</span>';hudTime=0;if(import.meta.env.DEV)renderer.domElement.dataset.diagnostics=JSON.stringify({fps:Math.round(frameRate),speed:state.speed,rpm:state.rpm,gear:state.gear,steeringAngle:state.steeringAngle,pitch:state.pitch,roll:state.roll,camera:cameraNames[cameraMode],distance:state.distance,offroad:state.offroad,s:state.s,x:state.x,roadX:world.road.x(state.s),origin,chunks:world.chunks.size,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,paused,autodrive,quality,car:carId,theme});}
  renderer.render(scene,camera);
}
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;setPause(true);toast('The graphics took a breather. Restoring the view…');});
renderer.domElement.addEventListener('webglcontextrestored',()=>{contextLost=false;lastTime=0;toast('The view is back. Continue when you’re ready.');});
syncUI();lighting(1);updateView(1/60,{throttle:0,brake:0,steer:0});renderer.render(scene,camera);requestAnimationFrame(animate);
setTimeout(()=>{$('#loading').classList.add('done');setTimeout(()=>$('#loading').remove(),800);},450);
// Read-only diagnostics for checking resource bounds and graphics health in development.
if(import.meta.env.DEV)Object.defineProperty(window,'__elsewhere',{get:()=>({state:{...state},theme,car:carId,seed,quality,night,autodrive,paused,started,chunks:world.chunks.size,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,origin})});
