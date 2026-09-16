import { randomAt, clamp } from './dynamics.js';

export const CHUNK_SIZE = 160;
// The same seeded placements feed the renderer and collision system at every quality.
export function createVegetation(road,theme,index) {
  const plants=[],count=theme==='desert'?24:105,start=index*CHUNK_SIZE;
  for(let i=0;i<count*4&&plants.length<count;i++) {
    const rand=n=>randomAt(index*22117+i*37+n,road.seed);
    const s=start+rand(0)*CHUNK_SIZE,side=rand(1)<.5?-1:1;
    const offset=side*(14+Math.pow(rand(2),1.7)*330),x=road.x(s)+offset;
    if(theme==='coastal'&&side<0||theme==='alpine'&&road.river(s)<38)continue;
    const y=road.ground(x,s),scale=(theme==='coastal'?.72:1)*(1+rand(4)*1.15);
    const slope=Math.hypot(road.ground(x+1,s)-road.ground(x-1,s),road.ground(x,s+1)-road.ground(x,s-1))/2;
    if(slope>1.25||y<(road.waterLevel(x,s)??-Infinity)+.5)continue;
    plants.push({x,s,y:y-.12,scale,yaw:rand(6)*Math.PI*2,type:theme==='desert'?'cactus':'tree',radius:(theme==='desert'?.29:.23)*scale,color:rand(8),shade:.87+rand(9)*.3,bend:0,bendVelocity:0,cooldown:0});
  }
  return plants;
}

// A rounded vehicle footprint against rooted trunks. Low restitution keeps bumps gentle.
export function resolveVegetation(state,spec,plants,onYield=()=>{}) {
  const forwardX=Math.sin(state.heading),forwardS=Math.cos(state.heading);
  const halfWidth=spec.track/2+.10,spine=spec.wheelbase/2+.53-halfWidth;
  let contacts=0;
  for(const plant of plants) {
    if(plant.cooldown>0||Math.abs(plant.x-state.x)>6||Math.abs(plant.s-state.s)>6)continue;
    const dx=plant.x-state.x,ds=plant.s-state.s;
    const along=clamp(dx*forwardX+ds*forwardS,-spine,spine);
    let nx=state.x+forwardX*along-plant.x,ns=state.s+forwardS*along-plant.s;
    const distance=Math.hypot(nx,ns),radius=halfWidth+plant.radius;
    if(distance>=radius)continue;
    if(plant.type==='cactus'&&Math.abs(state.speed)>2.5){
      plant.cooldown=2.4;state.speed*=.86;
      onYield(plant,Math.sin(state.travelHeading)*Math.sign(state.speed),Math.cos(state.travelHeading)*Math.sign(state.speed),Math.abs(state.speed));contacts++;continue;
    }
    if(distance<.0001){nx=-forwardX;ns=-forwardS;}else{nx/=distance;ns/=distance;}
    state.x+=nx*(radius-distance+.00001);state.s+=ns*(radius-distance+.00001);
    let vx=Math.sin(state.travelHeading)*state.speed,vs=Math.cos(state.travelHeading)*state.speed;
    const inward=vx*nx+vs*ns;
    if(inward<0){
      vx-=nx*inward;vs-=ns*inward;
      const direction=Math.sign(state.speed)||1;
      state.speed=direction*Math.hypot(vx,vs)*.82;
      if(Math.abs(state.speed)>.05)state.travelHeading=Math.atan2(vx*direction,vs*direction);
      state.yawRate*=.45;
    }
    contacts++;
  }
  return contacts;
}
