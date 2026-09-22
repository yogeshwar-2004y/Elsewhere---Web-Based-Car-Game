import { settingsFrom, stateFrom, cleanName, CARS } from '../shared/protocol.js';
import { multiplayerEndpoint, checkRoomServer } from './multiplayer-endpoint.js';

export class Multiplayer {
  constructor({onRoom,onStates,onStatus}){this.onRoom=onRoom;this.onStates=onStates;this.onStatus=onStatus;this.socket=null;this.room=null;this.id=null;this.lastSent=0;this.pending=null;}
  get isHost(){return !!this.room&&this.room.host===this.id;}
  async connect(type,{name,car,settings,code}){
    this.leave(false);
    this.onStatus('connecting','Finding your shared road…');
    const attempt=new AbortController();this.attempt=attempt;
    const waking=setTimeout(()=>{if(this.attempt===attempt)this.onStatus('connecting','Waking up the shared road… the first connection can take about a minute.');},5000);
    const deadline=setTimeout(()=>attempt.abort(),90000);
    let url;
    try{
      const endpoint=multiplayerEndpoint(import.meta.env.VITE_MULTIPLAYER_URL,location.href);
      await checkRoomServer(endpoint.healthUrl,attempt.signal);url=endpoint.socketUrl;
      if(attempt.signal.aborted)throw new Error('Connection cancelled.');
    }catch(error){
      const message=attempt.signal.aborted?'The multiplayer connection was cancelled or took too long. Try again, or continue solo.':error.message;
      if(this.attempt===attempt){this.attempt=null;this.onStatus('offline',message);}
      throw new Error(message);
    }finally{clearTimeout(waking);clearTimeout(deadline);}
    this.attempt=null;
    return new Promise((resolve,reject)=>{
      let socket;
      const fail=message=>{if(socket&&this.socket!==socket)return;clearTimeout(this.timeout);this.pending=null;this.socket=null;socket?.close();this.onStatus('offline',message);reject(new Error(message));};
      try{socket=new WebSocket(url);this.socket=socket;}catch{return fail('Multiplayer is unavailable here. You can still drive solo.');}
      this.pending={resolve,reject,fail};
      this.timeout=setTimeout(()=>fail('The multiplayer server did not respond. Solo play is still available.'),8000);
      socket.onopen=()=>this.send({type,name:cleanName(name),car,settings,code});
      socket.onmessage=event=>{
        if(this.socket!==socket)return;
        let msg;try{msg=JSON.parse(event.data);}catch{return;}
        if(msg.type==='error'){if(this.pending)return fail(msg.message);this.onStatus('error',msg.message);return;}
        if(msg.type==='welcome'||msg.type==='room'){
          const settings=settingsFrom(msg.settings);if(!settings||!Array.isArray(msg.players))return;
          if(msg.type==='welcome')this.id=msg.you;
          const previous=this.room;
          this.room={...msg,settings,players:msg.players.filter(p=>typeof p.id==='string'&&CARS.includes(p.car)).map(p=>({...p,name:cleanName(p.name),state:stateFrom(p.state)}))};
          if(msg.type==='welcome'){clearTimeout(this.timeout);const pending=this.pending;this.pending=null;pending?.resolve(this.room);}
          this.onRoom(this.room,previous,msg.type==='welcome');this.onStatus('connected','You’re sharing the road.');
        }
        if(msg.type==='states'&&this.room&&msg.revision===this.room.revision&&Array.isArray(msg.players)){
          const players=msg.players.map(p=>({id:p.id,state:stateFrom(p.state)})).filter(p=>p.state);
          for(const p of players){const member=this.room.players.find(m=>m.id===p.id);if(member)member.state=p.state;}
          this.onStates(players);
        }
      };
      socket.onerror=()=>{if(this.pending)fail('Could not reach multiplayer. Check your connection, or continue solo.');};
      socket.onclose=()=>{
        if(this.socket!==socket)return;
        if(this.pending)return fail('Could not connect to the room. Solo play is still available.');
        this.socket=null;const previous=this.room;this.room=null;this.id=null;this.onRoom(null,previous,false);
        this.onStatus('offline','Connection lost. Your solo drive can continue. Rejoin with the room code when you’re ready.');
      };
    });
  }
  send(message){if(this.socket?.readyState===WebSocket.OPEN&&this.socket.bufferedAmount<32768)this.socket.send(JSON.stringify(message));}
  sendState(state,paused,time){
    if(!this.room||time-this.lastSent<80)return;this.lastSent=time;
    const payload=stateFrom({x:state.x,s:state.s,heading:state.heading,speed:state.speed,steeringAngle:state.steeringAngle||0,pitch:state.pitch||0,roll:state.roll||0,heave:state.heave||0,brake:Math.max(state.brake||0,state.handbrake||0),paused});
    if(payload)this.send({type:'state',revision:this.room.revision,state:payload});
  }
  configure(settings){if(this.isHost)this.send({type:'configure',settings});}
  setCar(car){if(this.room)this.send({type:'profile',car});}
  leave(notify=true){
    this.attempt?.abort();this.attempt=null;
    clearTimeout(this.timeout);const previous=this.room,socket=this.socket,pending=this.pending;
    this.socket=null;this.pending=null;this.room=null;this.id=null;
    if(socket){if(socket.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type:'leave'}));socket.close();}
    pending?.reject(new Error('Connection cancelled.'));
    if(notify){this.onRoom(null,previous,false);this.onStatus('solo','Just you and the open road.');}
  }
}
