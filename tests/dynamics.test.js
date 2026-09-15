import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoad, CAR_SPECS, stepVehicle, cruiseInput, angleDelta} from '../src/dynamics.js';
test('seeds reproduce road geometry at chunk boundaries and far from origin',()=>{
  const a=createRoad('quiet-morning'),b=createRoad('quiet-morning'),c=createRoad('another-road');
  for(const s of [-1200,0,159.999,160,1600,1e7]){assert.equal(a.x(s),b.x(s));assert.equal(a.y(s),b.y(s));assert.notEqual(a.x(s),c.x(s));assert.ok(Number.isFinite(a.terrain(a.x(s)+180,s)));}
});
test('road edges meet terrain and all environments remain continuous',()=>{
  for(const theme of ['alpine','desert','coastal']){const road=createRoad('slow-sunday',theme);for(let s=0;s<10000;s+=37){assert.ok(Math.abs(road.terrain(road.x(s)+5,s)-road.y(s))<.11);assert.ok(Math.abs(road.x(s+.001)-road.x(s))<.01);assert.ok(Math.abs(road.y(s+.001)-road.y(s))<.01);}}
});
test('autodrive stays on the road for a long journey in each car',()=>{
  for(const seed of ['slow-sunday','quiet-morning','a-twisty-one'])for(const spec of Object.values(CAR_SPECS)){
    const road=createRoad(seed);const state={s:180,x:road.x(180)+2.3,speed:0,heading:road.heading(180),travelHeading:road.heading(180),steer:0,distance:0};let maxError=0;
    for(let i=0;i<60*60*12;i++){stepVehicle(state,cruiseInput(state,road),spec,road,1/60);maxError=Math.max(maxError,Math.abs(state.x-road.x(state.s)));}
    assert.ok(maxError<5.4,`${seed} ${spec.name} exceeded lane bounds: ${maxError}`);assert.ok(state.distance>8000);assert.ok(Number.isFinite(state.heading));
  }
});
test('manual driving is frame-rate independent and braking can reverse',()=>{
  const road=createRoad('open'),spec=CAR_SPECS.bmw;
  const simulate=(dt)=>{const state={x:road.x(0)+2,s:0,speed:0,heading:0,steer:0,distance:0};for(let i=0;i<8/dt;i++)stepVehicle(state,{throttle:1,brake:0,steer:.2},spec,road,dt);return state;};
  const a=simulate(1/60),b=simulate(1/120);assert.ok(Math.abs(a.distance-b.distance)<.5);assert.ok(Math.abs(angleDelta(a.heading,b.heading))<.03);
  for(let i=0;i<600;i++)stepVehicle(a,{throttle:0,brake:1,steer:0},spec,road,1/60);assert.ok(a.speed<0);assert.ok(a.distance>0);
});
test('off-road exploration has no terminal state',()=>{
  const road=createRoad('wander','coastal');const state={x:road.x(0)+300,s:0,speed:20,heading:Math.PI/2,steer:0,distance:0};for(let i=0;i<600;i++)stepVehicle(state,{throttle:1,brake:0,steer:0},CAR_SPECS.porsche,road,1/60);assert.ok(state.offroad);assert.ok(state.speed>0);assert.ok(state.distance>100);
});

const flatRoad={x:()=>0,y:()=>0,terrain:()=>0,heading:()=>0};
const fresh=()=>({s:0,x:2.3,speed:0,heading:0,steer:0,distance:0});
function driveFor(state,spec,input,seconds,road=flatRoad,dt=1/60){for(let i=0;i<Math.round(seconds/dt);i++)stepVehicle(state,input,spec,road,dt);return state;}

test('mass and engine power have observable effects on acceleration',()=>{
  const standard=driveFor(fresh(),CAR_SPECS.bmw,{throttle:1},10);
  const heavy=driveFor(fresh(),{...CAR_SPECS.bmw,mass:1800},{throttle:1},10);
  const weak=driveFor(fresh(),{...CAR_SPECS.bmw,power:35},{throttle:1},10);
  assert.ok(standard.speed>heavy.speed+3);assert.ok(standard.speed>weak.speed+3);
});
test('automatic gears shift without RPM wraparound or exceeding the redline',()=>{
  for(const spec of Object.values(CAR_SPECS)){
    const state=fresh();let highest=1,previous=spec.idle;
    for(let i=0;i<60*25;i++){stepVehicle(state,{throttle:1},spec,flatRoad,1/60);highest=Math.max(highest,state.gear);assert.ok(state.rpm>=spec.idle&&state.rpm<=spec.redline);assert.ok(Math.abs(state.rpm-previous)<900);previous=state.rpm;}
    assert.ok(highest>=3,`${spec.name} did not shift up`);
  }
});
test('braking stops before reverse engages and reverse steering changes direction',()=>{
  const s=fresh();s.speed=12;driveFor(s,CAR_SPECS.bmw,{brake:1},1.6);assert.ok(Math.abs(s.speed)<.08);
  driveFor(s,CAR_SPECS.bmw,{brake:1,steer:.5},2);assert.ok(s.speed<-.5);assert.equal(s.gear,-1);assert.ok(s.heading<0);
});
test('suspension transfers weight under acceleration, braking and cornering',()=>{
  const s=driveFor(fresh(),CAR_SPECS.bmw,{throttle:1},2);
  assert.ok(s.pitch>.005,'acceleration should lift the nose');
  driveFor(s,CAR_SPECS.bmw,{brake:1},.5);assert.ok(s.pitch<-.005,'braking should dip the nose');
  const turn=fresh();turn.speed=17;driveFor(turn,CAR_SPECS.bmw,{steer:.35,throttle:.3},1);
  assert.ok(turn.roll>.015,'a right turn should roll outward');assert.ok(Math.abs(turn.lateralAcceleration)<CAR_SPECS.bmw.grip*9.81*1.1);
});
test('hills influence coasting and grass increases stopping distance',()=>{
  const uphill={...flatRoad,y:s=>s*.12,terrain:(_x,s)=>s*.12},downhill={...flatRoad,y:s=>-s*.12,terrain:(_x,s)=>-s*.12};
  const a=fresh(),b=fresh();a.speed=b.speed=15;driveFor(a,CAR_SPECS.porsche,{},3,uphill);driveFor(b,CAR_SPECS.porsche,{},3,downhill);assert.ok(b.speed>a.speed+4);
  const tarmac=fresh(),grass=fresh();tarmac.speed=grass.speed=20;grass.x=30;driveFor(tarmac,CAR_SPECS.bmw,{brake:1},1.5);driveFor(grass,CAR_SPECS.bmw,{brake:1},1.5);assert.ok(grass.speed>tarmac.speed+2);
});
test('high-speed steering stays finite at 30, 60 and 144 FPS',()=>{
  const results=[];
  for(const fps of [30,60,144]){const s=fresh();s.speed=45;driveFor(s,CAR_SPECS.lamborghini,{steer:1,throttle:.3},4,flatRoad,1/fps);assert.ok(Number.isFinite(s.x+s.s+s.pitch+s.roll));assert.ok(Math.abs(s.roll)<.48);results.push(s);}
  assert.ok(Math.abs(results[0].distance-results[2].distance)<.6);
});
