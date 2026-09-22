import test from 'node:test';
import assert from 'node:assert/strict';
import {multiplayerEndpoint,checkRoomServer} from '../src/multiplayer-endpoint.js';

test('room endpoints support local, same-origin, and separately hosted games',()=>{
  assert.deepEqual(multiplayerEndpoint('', 'http://localhost:5174/?seed=hello'),{
    socketUrl:'ws://localhost:5174/room',healthUrl:'http://localhost:5174/health',
  });
  assert.equal(multiplayerEndpoint('', 'https://game.example').socketUrl,'wss://game.example/room');
  assert.deepEqual(multiplayerEndpoint(' https://rooms.example ', 'https://game.example'),{
    socketUrl:'wss://rooms.example/room',healthUrl:'https://rooms.example/health',
  });
  assert.equal(multiplayerEndpoint('wss://rooms.example/room','https://game.example').socketUrl,'wss://rooms.example/room');
});
test('insecure and malformed multiplayer configurations are rejected before connecting',()=>{
  for(const endpoint of ['ws://rooms.example/room','ftp://rooms.example','wss://user:secret@rooms.example','wss://rooms.example/#fragment']){
    assert.throws(()=>multiplayerEndpoint(endpoint,'https://game.example'));
  }
});
test('missing backend and HTML fallback pages produce actionable errors',async()=>{
  const signal=new AbortController().signal;
  await assert.rejects(checkRoomServer('https://game.example/health',signal,async()=>new Response('Not found',{status:404})),/hasn’t been connected/);
  await assert.rejects(checkRoomServer('https://game.example/health',signal,async()=>new Response('<html>game</html>')),/address needs updating/);
  await assert.rejects(checkRoomServer('https://game.example/health',signal,async()=>Response.json({ok:true})),/address needs updating/);
});
test('health check recognizes the room server and preserves cancellation',async()=>{
  const controller=new AbortController();
  await checkRoomServer('https://rooms.example/health',controller.signal,async(url,options)=>{
    assert.equal(options.credentials,'omit');assert.equal(options.signal,controller.signal);
    return Response.json({ok:true,service:'elsewhere-rooms'});
  });
  controller.abort();
  await assert.rejects(checkRoomServer('https://rooms.example/health',controller.signal,async()=>{throw controller.signal.reason;}),{name:'AbortError'});
});
