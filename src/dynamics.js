// Original, road-going tunes: SI units (kg, kW, Nm, metres, radians).
export const CAR_SPECS = {
  lamborghini: { id:'lamborghini', name:'Lamborghini', subtitle:'A little more extraordinary.', era:'V10 · ALL-WHEEL DRIVE', color:'#c7db54', mass:1525, power:470, torque:560, grip:1.18, acceleration:11.5, maxSpeed:88, steering:1.55, suspension:9, cylinders:10, note:42, wheelbase:2.62, track:1.72, wheelRadius:.345, maxSteer:.56, rearBias:.58, awd:true, understeer:.13, rollCompliance:.0045, pitchCompliance:.003, finalDrive:3.7, gears:[3.9,2.6,1.9,1.47,1.15,.9,.74], redline:8500, idle:900 },
  bmw: { id:'bmw', name:'BMW 2002', subtitle:'Old soul. Open road.', era:'INLINE-4 · REAR-WHEEL DRIVE', color:'#db7d39', mass:1020, power:96, torque:180, grip:.94, acceleration:6.4, maxSpeed:52, steering:1.18, suspension:6.7, cylinders:4, note:54, wheelbase:2.5, track:1.46, wheelRadius:.31, maxSteer:.63, rearBias:.49, awd:false, understeer:.17, rollCompliance:.01, pitchCompliance:.006, finalDrive:3.64, gears:[3.76,2.02,1.32,1,.82], redline:6500, idle:850 },
  porsche: { id:'porsche', name:'Porsche 911', subtitle:'Every curve, a conversation.', era:'FLAT-6 · REAR-ENGINE', color:'#a8c6c3', mass:1260, power:184, torque:310, grip:1.12, acceleration:8.8, maxSpeed:70, steering:1.36, suspension:8, cylinders:6, note:47, wheelbase:2.27, track:1.53, wheelRadius:.325, maxSteer:.59, rearBias:.62, awd:false, understeer:.08, rollCompliance:.0065, pitchCompliance:.0045, finalDrive:3.44, gears:[3.5,2.06,1.41,1.09,.87,.72], redline:6800, idle:880 },
};
export function hashSeed(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function randomAt(n, seed = 0) {
  let x = Math.imul(n ^ seed, 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}
const smooth = t => t * t * (3 - 2 * t);
export function noise1(x, seed) {
  const i = Math.floor(x), t = smooth(x - i);
  return (randomAt(i, seed) * (1 - t) + randomAt(i + 1, seed) * t) * 2 - 1;
}
export function noise2(x, y, seed) {
  const j = Math.floor(y), t = smooth(y - j);
  return noise1(x + j * 137, seed) * (1 - t) + noise1(x + (j + 1) * 137, seed) * t;
}
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const damp = (a, b, rate, dt) => a + (b - a) * (1 - Math.exp(-rate * dt));
export const angleDelta = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
export function createRoad(seedText, theme = 'alpine') {
  const seed = hashSeed(seedText);
  const road = {
    seed, theme,
    seaLevel:-3,
    coast(s) { return this.x(s)-44-noise1(s/270,seed+402)*9-noise1(s/93,seed+403)*3; },
    columns(s) {
      const left=theme==='coastal'?[-1400,-1050,-800,-600,-450,-330,-240,-175,-120,...[-40,-18,-7,0,5,10].map(n=>this.coast(s)-this.x(s)+n),-11,-7]:[-1400,-1050,-800,-600,-450,-330,-240,-175,-120,-85,-60,-42,-28,-18,-11,-7];
      return [...left,0,7,11,18,28,42,60,85,120,175,240,330,450,600,800,1050,1400];
    },
    waterLevel(x,s) {
      if(theme==='coastal'&&x<this.coast(s))return this.seaLevel;
      if(theme==='alpine'&&this.river(s)<16&&Math.abs(x-this.x(s))<550){const mid=Math.floor(s/1800)*1800+930;return this.y(mid)-12;}
      return null;
    },
    ground(x,s) {
      // Sample the actual terrain triangles, so tires and roots meet the rendered surface.
      const s0=Math.floor(s/8)*8,v=(s-s0)/8,a=this.columns(s0),b=this.columns(s0+8);
      const xs=a.map((n,i)=>(this.x(s0)+n)*(1-v)+(this.x(s0+8)+b[i])*v);
      let k=0;while(k<xs.length-2&&xs[k+1]<x)k++;
      if(x<xs[0]||x>xs.at(-1))return this.terrain(x,s);
      const u=clamp((x-xs[k])/(xs[k+1]-xs[k]),0,1);
      const h00=this.terrain(this.x(s0)+a[k],s0),h10=this.terrain(this.x(s0)+a[k+1],s0);
      const h01=this.terrain(this.x(s0+8)+b[k],s0+8),h11=this.terrain(this.x(s0+8)+b[k+1],s0+8);
      return u+v<=1?h00+(h10-h00)*u+(h01-h00)*v:h11+(h01-h11)*(1-u)+(h10-h11)*(1-v);
    },
    x(s) { return noise1(s / 360, seed) * 112 + noise1(s / 1030, seed + 7) * 200 + noise1(s / 130, seed + 80) * 11; },
    y(s) { return 18 + noise1(s / 490, seed + 11) * 15 + noise1(s / 160, seed + 16) * 2.7; },
    heading(s) { return Math.atan2(this.x(s + 1) - this.x(s - 1), 2); },
    terrain(x, s) {
      const lateral = x - this.x(s), d = Math.abs(lateral);
      const blend = smooth(clamp((d - 7) / 30, 0, 1));
      const n = noise2(x / 160, s / 170, seed + 55) * 0.5 + noise2(x / 65, s / 80, seed + 95) * 0.22;
      let h;
      if (theme === 'desert') {
        const mesa = smooth(clamp((noise2(x / 210, s / 230, seed + 200) + .25) * 2, 0, 1));
        h = 4 + n * 25 + mesa * Math.min(d * .31, 110);
      } else if (theme === 'coastal') {
        if(lateral < -7){
          const shore=this.coast(s),inland=x-shore;
          if(inland<0)return this.seaLevel-Math.min(32,-inland*.48);
          if(inland<10)return this.seaLevel+.9*smooth(inland/10);
          const top=this.x(s)-7-shore;
          return this.seaLevel+.9+(this.y(s)-.1-this.seaLevel-.9)*smooth(clamp((inland-10)/(top-10),0,1));
        }
        h=4+n*34+Math.min(d*.15,65);
      } else {
        h = 3 + n * 48 + Math.min(d * .25, 180) * (0.6 + noise2(x / 430, s / 380, seed + 300) * .55);
        // A river valley periodically passes beneath a short viaduct.
        const river = this.river(s);
        if (river < 35) h -= (1 - river / 35) * 24;
      }
      let height=this.y(s)-.1+h*blend;
      if(theme==='alpine'&&this.river(s)<36){
        const mid=Math.floor(s/1800)*1800+930,bed=this.y(mid)-15;
        const channel=1-smooth(clamp((this.river(s)-11)/25,0,1));
        height+=(Math.min(height,bed)-height)*channel;
      }
      return height;
    },
    river(s) { return Math.abs(((s % 1800) + 1800) % 1800 - 930); },
  };
  return road;
}
export function surfaceHeight(road,x,s) {
  return Math.abs(x-road.x(s))<=5.6 ? road.y(s)+.018 : (road.ground?road.ground(x,s):road.terrain(x,s))+.018;
}
export function wheelContacts(state,spec,road) {
  const c=Math.cos(state.heading),sin=Math.sin(state.heading);
  return [-spec.wheelbase/2,spec.wheelbase/2].flatMap(z=>[-spec.track/2,spec.track/2].map(x=>{
    const wx=state.x+c*x-sin*z, ws=state.s-sin*x-c*z;
    return {x,z,height:surfaceHeight(road,wx,ws)};
  }));
}
export function wheelSteeringAngle(spec,angle,side,front=true) {
  if(!front||Math.abs(angle)<1e-7)return 0;
  const radius=spec.wheelbase/Math.abs(Math.tan(angle));
  return Math.sign(angle)*Math.atan(spec.wheelbase/Math.max(.4,radius-side*Math.sign(angle)*spec.track/2));
}
function spring(state,key,target,frequency,dt) {
  const velocity=key+'Velocity';
  if(!Number.isFinite(state[key])){state[key]=target;state[velocity]=0;}
  state[velocity]=(state[velocity]||0)+(frequency*frequency*(target-state[key])-2*frequency*.83*(state[velocity]||0))*dt;
  state[key]+=state[velocity]*dt;
}
export function settleVehicle(state,spec,road) {
  const contacts=wheelContacts(state,spec,road);
  const height=contacts.reduce((sum,w)=>sum+w.height,0)/4;
  state.carId=spec.id;state.heave=height;state.heaveVelocity=0;
  state.pitch=Math.atan2((contacts[0].height+contacts[1].height-contacts[2].height-contacts[3].height)/2,spec.wheelbase);
  state.roll=Math.atan2((contacts[1].height+contacts[3].height-contacts[0].height-contacts[2].height)/2,spec.track);
  state.groundPitch=state.pitch;state.groundRoll=state.roll;
  state.pitchVelocity=state.rollVelocity=state.yawRate=state.lateralAcceleration=state.longitudinalAcceleration=0;
  state.steer=state.steeringAngle=state.throttle=state.brake=state.reverseHold=state.shiftTimer=0;
  state.gear=1;state.rpm=spec.idle;state.travelHeading=state.heading;state.slip=0;state.contacts=contacts;
}
export function steeringLimit(spec,speed){return spec.maxSteer/(1+Math.pow(Math.abs(speed)/24,1.35));}
function transmission(state,spec,throttle,dt) {
  const wheelRpm=Math.abs(state.speed)/spec.wheelRadius*60/(2*Math.PI);
  let gear=clamp(state.gear||1,1,spec.gears.length);
  state.shiftTimer=Math.max(0,(state.shiftTimer||0)-dt);
  const coupled=wheelRpm*spec.gears[gear-1]*spec.finalDrive;
  if(!state.shiftTimer&&state.speed>0){
    if(coupled>spec.redline*.84&&gear<spec.gears.length){gear++;state.shiftTimer=.23;}
    else if(coupled<spec.redline*.27&&gear>1){gear--;state.shiftTimer=.22;}
  }
  state.gear=state.speed<-.15?-1:gear;
  const ratio=state.gear===-1?3.2:spec.gears[gear-1];
  const launch=spec.idle+throttle*1800/(1+Math.abs(state.speed)*.6);
  state.rpm=damp(state.rpm||spec.idle,clamp(Math.max(launch,wheelRpm*ratio*spec.finalDrive),spec.idle,spec.redline),13,dt);
  return ratio;
}
export function stepVehicle(state, input, spec, road, dt) {
  if(!Number.isFinite(dt)||dt<=0)return state;
  // Keep all public call sites stable even if their display runs at a lower rate.
  if(dt>1/120+.00001){const n=Math.ceil(dt/(1/120));for(let i=0;i<n;i++)stepVehicle(state,input,spec,road,dt/n);return state;}
  if(!Number.isFinite(state.heave)||state.carId!==spec.id)settleVehicle(state,spec,road);
  const speed=state.speed, absSpeed=Math.abs(speed),offroad=Math.abs(state.x-road.x(state.s))>5.8;
  state.throttle=damp(state.throttle,clamp(input.throttle||0,0,1),10,dt);
  state.brake=damp(state.brake,clamp(input.brake||0,0,1),18,dt);
  state.handbrake=clamp(input.handbrake||0,0,1);
  const ratio=transmission(state,spec,state.throttle,dt);
  const water=road.waterLevel?.(state.x,state.s),waterDepth=water==null?0:Math.max(0,water-surfaceHeight(road,state.x,state.s));
  state.waterDepth=waterDepth;state.needsRecovery=waterDepth>.75;
  const mu=spec.grip*(offroad?.57:1)*(waterDepth>.05?.62:1),traction=mu*9.81;
  const drivenLoad=spec.awd?1:clamp(spec.rearBias+(state.longitudinalAcceleration||0)*.018,.35,.82);
  const torqueShape=.73+.27*Math.sin(clamp(state.rpm/spec.redline,0,1)*Math.PI);
  const motorForce=Math.min(spec.torque*torqueShape*ratio*spec.finalDrive*.88/spec.wheelRadius, spec.power*1000*.87/Math.max(absSpeed,3));
  const available=Math.min(spec.acceleration,traction*drivenLoad,motorForce/spec.mass);
  let acceleration=state.throttle*available*(state.shiftTimer>0?.38:1);
  // Hold the brake at rest briefly before selecting reverse, avoiding an instant lurch.
  state.reverseHold=state.brake>.5&&speed<.15?(state.reverseHold||0)+dt:0;
  if(state.brake>.01){
    if(speed>.06)acceleration-=state.brake*traction;
    else if(state.reverseHold>.35||speed<-.06)acceleration-=state.brake*available*.65;
    else acceleration=0;
  }
  if(speed<-.06&&state.throttle>.01)acceleration+=state.throttle*traction;
  const c=Math.cos(state.heading),sin=Math.sin(state.heading);
  const slope=(surfaceHeight(road,state.x+sin,state.s+c)-surfaceHeight(road,state.x-sin,state.s-c))/2;
  const gravity=-9.81*Math.sin(Math.atan(slope));
  const rolling=(offroad?.082:.013)*9.81;
  const drag=.5*1.225*(spec.id==='bmw'?.74:.59)*speed*absSpeed/spec.mass;
  const engineBraking=(1-state.throttle)*(.16+absSpeed*.009);
  const resistance=rolling+engineBraking+state.handbrake*traction*.72+waterDepth*(2+absSpeed*.6);
  if(absSpeed>.035)acceleration+=gravity-drag-Math.sign(speed)*resistance;
  else if(Math.abs(gravity)>rolling&&!state.brake&&!state.handbrake)acceleration+=gravity-Math.sign(gravity)*rolling;
  let next=speed+acceleration*dt;
  // Brakes and passive resistance can bring a car to rest, never throw it into reverse.
  if(speed>0&&next<0&&(state.brake>.01||!state.throttle))next=0;
  if(speed<0&&next>0&&!state.throttle)next=0;
  if(absSpeed<.04&&state.throttle<.01&&state.reverseHold<=.35&&Math.abs(gravity)<=rolling)next=0;
  state.speed=clamp(next,-9,spec.maxSpeed);
  state.longitudinalAcceleration=(state.speed-speed)/dt;
  state.steer=damp(state.steer,clamp(input.steer||0,-1,1),spec.steering*4.2,dt);
  state.steeringAngle=state.steer*steeringLimit(spec,state.speed);
  const understeer=1+spec.understeer*state.speed*state.speed*.004;
  const requested=state.speed*Math.tan(state.steeringAngle)/(spec.wheelbase*understeer);
  const combined=Math.sqrt(Math.max(.38,1-Math.pow(Math.min(Math.abs(acceleration)/traction,.78),2)));
  const maxYaw=traction*combined/Math.max(Math.abs(state.speed),2);
  const targetYaw=clamp(requested,-maxYaw,maxYaw);
  state.yawRate=damp(state.yawRate,targetYaw,spec.steering*5,dt);
  if(absSpeed<.03)state.yawRate=0;
  state.heading+=state.yawRate*dt;
  const beta=Math.atan((1-spec.rearBias)*Math.tan(state.steeringAngle))*(1-state.handbrake*.8);
  const gripRate=spec.grip*(offroad?3.8:10)*(1-state.handbrake*.65);
  state.travelHeading+=angleDelta(state.heading+beta,state.travelHeading)*(1-Math.exp(-gripRate*dt));
  state.slip=Math.abs(angleDelta(state.heading+beta,state.travelHeading));
  const dx=Math.sin(state.travelHeading)*state.speed*dt,ds=Math.cos(state.travelHeading)*state.speed*dt;
  state.x+=dx;state.s+=ds;state.distance+=Math.hypot(dx,ds);state.offroad=offroad;
  state.lateralAcceleration=state.speed*state.yawRate;state.wheelRotation=((state.wheelRotation||0)-state.speed*dt/spec.wheelRadius)%(Math.PI*2);
  state.contacts=wheelContacts(state,spec,road);
  const h=state.contacts.map(w=>w.height),ground=(h[0]+h[1]+h[2]+h[3])/4;
  state.groundPitch=Math.atan2((h[0]+h[1]-h[2]-h[3])/2,spec.wheelbase);
  state.groundRoll=Math.atan2((h[1]+h[3]-h[0]-h[2])/2,spec.track);
  spring(state,'heave',ground,spec.suspension*2.5,dt);
  spring(state,'pitch',clamp(state.groundPitch+state.longitudinalAcceleration*spec.pitchCompliance,-.65,.65),spec.suspension,dt);
  spring(state,'roll',clamp(state.groundRoll+state.lateralAcceleration*spec.rollCompliance,-.48,.48),spec.suspension,dt);
  return state;
}
export function cruiseInput(state, road, spec=CAR_SPECS[state.carId]||CAR_SPECS.bmw) {
  const lookAhead=10+Math.max(state.speed,0)*.65;
  const targetX=road.x(state.s+lookAhead)+2.3;
  const error=angleDelta(Math.atan2(targetX-state.x,lookAhead),state.heading);
  const bend=Math.abs(angleDelta(road.heading(state.s+48),road.heading(state.s)));
  const targetSpeed=20-Math.min(7,bend*25);
  const steerAngle=Math.atan2(2*spec.wheelbase*Math.sin(error),lookAhead)*(1+spec.understeer*state.speed*state.speed*.004);
  return {steer:clamp(steerAngle/steeringLimit(spec,state.speed),-1,1),throttle:clamp((targetSpeed-state.speed)*.32+.2,0,1),brake:clamp((state.speed-targetSpeed-1)*.22,0,1),handbrake:0};
}
