import { randomInt, randomUUID } from 'node:crypto';
import { MAX_PLAYERS, CODE_PATTERN, CARS, cleanName, settingsFrom, stateFrom } from '../shared/protocol.js';

const ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export class RoomHub {
  constructor(){this.rooms=new Map();this.clients=new Set();}
  connect(socket){const peer={id:randomUUID(),socket,room:null,name:'Wanderer',car:'bmw',state:null,lastStateAt:0,windowAt:0,requests:0};this.clients.add(peer);return peer;}
  send(peer,message){if(peer.socket.readyState===1)peer.socket.send(JSON.stringify(message));}
  error(peer,message){this.send(peer,{type:'error',message});}
  roster(room){return [...room.peers.values()].map(p=>({id:p.id,name:p.name,car:p.car,state:p.state}));}
  roomPacket(room){return {type:'room',code:room.code,host:room.host,settings:room.settings,revision:room.revision,players:this.roster(room),capacity:MAX_PLAYERS};}
  broadcast(room,message){const payload=JSON.stringify(message);for(const p of room.peers.values())if(p.socket.readyState===1&&p.socket.bufferedAmount<128*1024)p.socket.send(payload);}
  membership(peer,room){
    peer.room=room;room.peers.set(peer.id,peer);
    this.send(peer,{...this.roomPacket(room),type:'welcome',you:peer.id});
    this.broadcast(room,this.roomPacket(room));
  }
  leave(peer){
    const room=peer.room;if(!room)return;room.peers.delete(peer.id);peer.room=null;peer.state=null;
    if(!room.peers.size){this.rooms.delete(room.code);return;}
    if(room.host===peer.id)room.host=room.peers.keys().next().value;
    this.broadcast(room,this.roomPacket(room));
  }
  disconnect(peer){this.leave(peer);this.clients.delete(peer);}
  handle(peer,msg,now=Date.now()){
    if(!msg||typeof msg!=='object'||typeof msg.type!=='string')return this.error(peer,'That request could not be read.');
    if(msg.type==='state'){
      if(!peer.room||msg.revision!==peer.room.revision||now-peer.lastStateAt<45)return;
      const state=stateFrom(msg.state);if(!state)return;
      peer.lastStateAt=now;peer.state=state;return;
    }
    if(now-peer.windowAt>10000){peer.windowAt=now;peer.requests=0;}
    if(++peer.requests>20)return this.error(peer,'Please wait a moment before trying again.');
    if(msg.type==='create'){
      if(peer.room)return this.error(peer,'Leave your current room first.');
      const settings=settingsFrom(msg.settings);if(!settings)return this.error(peer,'Choose a map and a road seed.');
      if(this.rooms.size>=256)return this.error(peer,'The rooms are busy. Please try again shortly.');
      let code;do{code=Array.from({length:6},()=>ALPHABET[randomInt(ALPHABET.length)]).join('');}while(this.rooms.has(code));
      const room={code,host:peer.id,settings,revision:1,peers:new Map()};this.rooms.set(code,room);
      peer.name=cleanName(msg.name);peer.car=CARS.includes(msg.car)?msg.car:'bmw';this.membership(peer,room);return;
    }
    if(msg.type==='join'){
      if(peer.room)return this.error(peer,'Leave your current room first.');
      const code=String(msg.code||'').trim().toUpperCase();
      const room=CODE_PATTERN.test(code)&&this.rooms.get(code);
      if(!room)return this.error(peer,'Room not found. Check the code, or ask your friend to create a new room.');
      if(room.peers.size>=MAX_PLAYERS)return this.error(peer,'This room is full. Up to 8 drivers can share a road.');
      peer.name=cleanName(msg.name);peer.car=CARS.includes(msg.car)?msg.car:'bmw';this.membership(peer,room);return;
    }
    if(msg.type==='leave'){this.leave(peer);this.send(peer,{type:'left'});return;}
    const room=peer.room;if(!room)return this.error(peer,'Create or join a room first.');
    if(msg.type==='configure'){
      if(room.host!==peer.id)return this.error(peer,'Only the host can change the shared map.');
      const settings=settingsFrom(msg.settings);if(!settings)return this.error(peer,'Choose a valid map and road seed.');
      if(settings.theme!==room.settings.theme||settings.seed!==room.settings.seed){room.revision++;for(const p of room.peers.values())p.state=null;}
      room.settings=settings;this.broadcast(room,this.roomPacket(room));return;
    }
    if(msg.type==='profile'){
      if(CARS.includes(msg.car))peer.car=msg.car;
      this.broadcast(room,this.roomPacket(room));return;
    }
  }
  tick(now=Date.now()){
    for(const room of this.rooms.values())this.broadcast(room,{type:'states',revision:room.revision,time:now,players:[...room.peers.values()].filter(p=>p.state).map(p=>({id:p.id,state:{...p.state,paused:p.state.paused||now-p.lastStateAt>3000}}))});
  }
}
