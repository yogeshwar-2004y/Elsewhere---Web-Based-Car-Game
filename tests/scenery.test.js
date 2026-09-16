import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoad,CAR_SPECS,stepVehicle } from '../src/dynamics.js';
import { createVegetation,resolveVegetation } from '../src/scenery.js';

const flat={x:()=>-100,y:()=>0,terrain:()=>0,heading:()=>0};
test('trees stop the car without tunnelling or a terminal state, even at high speed',()=>{
  for(const speed of [8,45,85]){
    const state={x:0,s:0,speed,heading:0,travelHeading:0,steer:0,distance:0};
    const tree={x:0,s:12,radius:.45,type:'tree'};let hits=0;
    for(let i=0;i<360;i++){stepVehicle(state,{throttle:1},CAR_SPECS.lamborghini,flat,1/120);hits+=resolveVegetation(state,CAR_SPECS.lamborghini,[tree]);}
    assert.ok(hits>0);assert.ok(state.s<10.2);assert.ok(Math.abs(state.speed)<.01);assert.ok(Number.isFinite(state.heading));assert.equal(state.needsRecovery,false);
  }
});
test('cacti bend on impact, reduce speed, and allow the journey to continue',()=>{
  const state={x:0,s:9.8,speed:14,heading:0,travelHeading:0,yawRate:0},cactus={x:0,s:12,radius:.4,type:'cactus',cooldown:0};let yielded=0;
  assert.equal(resolveVegetation(state,CAR_SPECS.lamborghini,[cactus],()=>yielded++),1);
  assert.equal(yielded,1);assert.ok(state.speed>0&&state.speed<14);assert.ok(cactus.cooldown>0);
  resolveVegetation(state,CAR_SPECS.lamborghini,[cactus],()=>yielded++);assert.equal(yielded,1);
});
test('vegetation is reproducible, rooted on the surface, and clear of roads and water',()=>{
  for(const theme of ['alpine','desert','coastal']){
    const road=createRoad('root-check',theme),plants=createVegetation(road,theme,4);assert.deepEqual(plants,createVegetation(road,theme,4));assert.ok(plants.length>10);
    for(const p of plants){assert.ok(Math.abs(p.x-road.x(p.s))>=14);assert.ok(Math.abs(p.y+.12-road.ground(p.x,p.s))<1e-7);assert.ok(p.y>(road.waterLevel(p.x,p.s)??-Infinity));}
  }
});
