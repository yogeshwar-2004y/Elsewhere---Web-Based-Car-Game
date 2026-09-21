import test from 'node:test';
import assert from 'node:assert/strict';
import { RoomHub } from '../server/rooms.js';
import { stateFrom,settingsFrom,CODE_PATTERN } from '../shared/protocol.js';
const settings={theme:'coastal',seed:'with-friends',night:false};
const state={x:12,s:180,heading:.1,speed:20,steeringAngle:.05,pitch:0,roll:0,heave:20,brake:0,paused:false};
const connect=hub=>{const messages=[];const p=hub.connect({readyState:1,bufferedAmount:0,send:data=>messages.push(JSON.parse(data))});p.messages=messages;return p;};
const create=(hub,p)=>hub.handle(p,{type:'create',settings,name:'Host',car:'porsche'});

test('rooms have valid unique codes and sanitized names',()=>{
  const hub=new RoomHub(),codes=new Set();
  for(let i=0;i<30;i++){const p=connect(hub);create(hub,p);assert.match(p.room.code,CODE_PATTERN);codes.add(p.room.code);}assert.equal(codes.size,30);
  const guest=connect(hub);hub.handle(guest,{type:'join',code:[...codes][0].toLowerCase(),name:'<hello>\u0000',car:'unknown'});assert.equal(guest.name,'hello');assert.equal(guest.car,'bmw');
});
test('only hosts can change maps, revisions discard stale vehicle positions, and night preserves them',()=>{
  const hub=new RoomHub(),host=connect(hub),guest=connect(hub);create(hub,host);hub.handle(guest,{type:'join',code:host.room.code,name:'Friend'});
  hub.handle(host,{type:'state',revision:1,state});hub.handle(guest,{type:'configure',settings:{...settings,theme:'desert'}});assert.equal(host.room.settings.theme,'coastal');assert.equal(guest.messages.at(-1).type,'error');
  hub.handle(host,{type:'configure',settings:{...settings,night:true}});assert.equal(host.room.revision,1);assert.deepEqual(host.state,state);
  hub.handle(host,{type:'configure',settings:{...settings,theme:'alpine'}});assert.equal(host.room.revision,2);assert.equal(host.state,null);
  hub.handle(guest,{type:'state',revision:1,state});assert.equal(guest.state,null);
  hub.handle(guest,{type:'state',revision:2,state});assert.deepEqual(guest.state,state);
});
test('room capacity, host handoff, isolation and empty-room cleanup',()=>{
  const hub=new RoomHub(),host=connect(hub),outside=connect(hub);create(hub,host);create(hub,outside);const code=host.room.code,members=[];
  for(let i=0;i<7;i++){const guest=connect(hub);hub.handle(guest,{type:'join',code});members.push(guest);}assert.equal(host.room.peers.size,8);
  const extra=connect(hub);hub.handle(extra,{type:'join',code});assert.equal(extra.room,null);assert.match(extra.messages.at(-1).message,/full/);
  const before=outside.messages.length;hub.disconnect(host);assert.equal(members[0].room.host,members[0].id);assert.equal(outside.messages.length,before);
  for(const member of members)hub.disconnect(member);assert.equal(hub.rooms.has(code),false);assert.equal(hub.rooms.size,1);
});
test('invalid and oversized physics or map values do not enter the shared world',()=>{
  for(const bad of [{...state,x:Infinity},{...state,s:NaN},{...state,speed:9999},{...state,heave:'20'},{}])assert.equal(stateFrom(bad),null);
  assert.equal(settingsFrom({...settings,seed:'x'.repeat(65)}),null);assert.equal(settingsFrom({...settings,theme:'untrusted'}),null);
  assert.deepEqual(stateFrom({...state,secret:'ignored'}),state);
});
test('quiet or backgrounded drivers are marked paused, and one room does not leak into another',()=>{
  const hub=new RoomHub(),a=connect(hub),b=connect(hub);create(hub,a);create(hub,b);hub.handle(a,{type:'state',revision:1,state},1000);hub.tick(5000);
  assert.equal(a.messages.at(-1).players[0].state.paused,true);assert.deepEqual(b.messages.at(-1).players,[]);
});
