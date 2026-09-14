import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { World } from '../src/world.js';

test('adjacent terrain chunks join without cracks in every environment',()=>{
  for(const theme of ['alpine','desert','coastal']){
    const world=new World(new THREE.Scene(),'slow-sunday',theme,'low');world.update(100,0);
    const left=world.chunks.get(0).children[0].geometry.attributes.position;
    const right=world.chunks.get(1).children[0].geometry.attributes.position;
    const edge=(attribute,z)=>{const vertices=new Set();for(let i=0;i<attribute.count;i++)if(attribute.getZ(i)===z)vertices.add(attribute.getX(i).toFixed(4)+','+attribute.getY(i).toFixed(4));return [...vertices].sort();};
    assert.deepEqual(edge(left,-160),edge(right,0));world.clear();
  }
});
test('a 20km drive disposes old chunks and keeps the live world bounded',()=>{
  const scene=new THREE.Scene(),world=new World(scene,'streaming-check','alpine','low');let disposed=0;
  world.update(0,0);for(const chunk of world.chunks.values())chunk.traverse(o=>o.geometry?.addEventListener('dispose',()=>disposed++));
  for(let s=0;s<20000;s+=40){world.update(s,Math.floor(s/1600)*1600);assert.ok(world.chunks.size<=9);assert.ok(world.root.children.length<=9);}
  assert.ok(disposed>20,'old geometry should be disposed');assert.ok(world.chunks.has(Math.floor(19960/160)));
  world.clear();assert.equal(world.root.children.length,0);
});
test('terrain also streams for distant off-road exploration and cleans up on return',()=>{
  const world=new World(new THREE.Scene(),'explore','desert','low');for(let i=0;i<30;i++)world.update(180,0,4500);
  assert.equal(world.exploration.size,25);world.update(180,0,world.road.x(180));assert.equal(world.exploration.size,0);world.clear();
});
