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
