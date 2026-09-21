import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { createServer } from '../server/index.mjs';
function client(url){
  const socket=new WebSocket(url),queue=[],waiters=[];
  socket.on('message',data=>{const message=JSON.parse(data);const index=waiters.findIndex(w=>w.match(message));if(index>=0){const waiter=waiters.splice(index,1)[0];clearTimeout(waiter.timer);waiter.resolve(message);}else queue.push(message);});
  return {socket,send:message=>socket.send(JSON.stringify(message)),wait(match){const index=queue.findIndex(match);if(index>=0)return Promise.resolve(queue.splice(index,1)[0]);return new Promise((resolve,reject)=>{const waiter={match,resolve,timer:setTimeout(()=>{waiters.splice(waiters.indexOf(waiter),1);reject(new Error('Timed out waiting for room message'));},3000)};waiters.push(waiter);});}};
}
test('real sockets create/join, relay cars, synchronize maps, hand over hosting and clean up',async t=>{
  const app=createServer();app.server.listen(0,'127.0.0.1');await once(app.server,'listening');t.after(()=>app.close());
  const port=app.server.address().port,url=`ws://127.0.0.1:${port}/room`,a=client(url),b=client(url);await Promise.all([once(a.socket,'open'),once(b.socket,'open')]);
  a.send({type:'create',name:'Lena',car:'bmw',settings:{theme:'alpine',seed:'shared-weekend',night:false}});
  const host=await a.wait(m=>m.type==='welcome');assert.match(host.code,/^[A-Z2-9]{6}$/);
  b.send({type:'join',name:'Kai',car:'porsche',code:host.code});const guest=await b.wait(m=>m.type==='welcome');assert.equal(guest.players.length,2);assert.equal(guest.settings.seed,'shared-weekend');
  const state={x:33,s:220,heading:.2,speed:16,steeringAngle:.05,pitch:.01,roll:.01,heave:22,brake:0,paused:false};
  a.send({type:'state',revision:1,state});const snapshot=await b.wait(m=>m.type==='states'&&m.players.some(p=>p.id===host.you));assert.equal(snapshot.players.find(p=>p.id===host.you).state.s,220);
  b.send({type:'configure',settings:{theme:'desert',seed:'wrong-host',night:true}});assert.match((await b.wait(m=>m.type==='error')).message,/host/);
  a.send({type:'configure',settings:{theme:'coastal',seed:'ocean-together',night:true}});const changed=await b.wait(m=>m.type==='room'&&m.revision===2);assert.equal(changed.settings.theme,'coastal');assert.equal(changed.settings.night,true);assert.ok(changed.players.every(p=>p.state===null));
  b.send({type:'profile',car:'lamborghini'});await a.wait(m=>m.type==='room'&&m.players.some(p=>p.car==='lamborghini'));
  a.socket.close();const transferred=await b.wait(m=>m.type==='room'&&m.host===guest.you);assert.equal(transferred.players.length,1);
  b.send({type:'leave'});await b.wait(m=>m.type==='left');assert.equal(app.hub.rooms.size,0);b.socket.close();
  const response=await fetch(`http://127.0.0.1:${port}/health`);assert.equal(response.status,200);assert.deepEqual(await response.json(),{ok:true});
});
test('unknown codes and cross-origin connections fail without creating rooms',async t=>{
  const app=createServer();app.server.listen(0,'127.0.0.1');await once(app.server,'listening');t.after(()=>app.close());const url=`ws://127.0.0.1:${app.server.address().port}/room`;
  const c=client(url);await once(c.socket,'open');c.send({type:'join',code:'AAAAAA'});assert.match((await c.wait(m=>m.type==='error')).message,/not found/);assert.equal(app.hub.rooms.size,0);c.socket.close();
  const bad=new WebSocket(url,{origin:'https://unrelated.example'});const [error]=await once(bad,'error');assert.match(error.message,/403/);
});
