import * as THREE from 'three';
import { buildCar,disposeCar } from './cars.js';
import { angleDelta,clamp,wheelSteeringAngle,wheelContacts } from './dynamics.js';

const fields=['x','s','speed','steeringAngle','pitch','roll','heave','brake'];
function nameTag(name){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;
  const c=canvas.getContext('2d');c.fillStyle='#233e35dd';c.beginPath();c.roundRect(8,8,496,80,28);c.fill();c.font='500 34px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#f0f2dc';c.fillText(name,256,49,460);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false});const sprite=new THREE.Sprite(material);sprite.scale.set(2.8,.525,1);sprite.position.y=2.2;return sprite;
}
export class RemoteDrivers {
  constructor(scene){this.scene=scene;this.drivers=new Map();}
  remove(id){const d=this.drivers.get(id);if(!d)return;this.scene.remove(d.car.root);disposeCar(d.car);d.label.material.map.dispose();d.label.material.dispose();this.drivers.delete(id);}
  clear(){for(const id of this.drivers.keys())this.remove(id);}
  sync(players,ownId){
    const ids=new Set(players.filter(p=>p.id!==ownId).map(p=>p.id));for(const id of this.drivers.keys())if(!ids.has(id))this.remove(id);
    for(const p of players){
      if(p.id===ownId)continue;
      const previous=this.drivers.get(p.id);if(previous&&previous.car.spec.id!==p.car)this.remove(p.id);
      if(!this.drivers.has(p.id)){
        const car=buildCar(p.car,{remote:true}),label=nameTag(p.name);car.root.add(label);car.root.visible=false;this.scene.add(car.root);
        this.drivers.set(p.id,{car,label,samples:previous?.samples||[],spin:previous?.spin||0,paused:false});
      }
      const d=this.drivers.get(p.id);if(!d.samples.length&&p.state)d.samples.push({time:performance.now(),state:p.state});
    }
  }
  receive(players){const time=performance.now();for(const p of players){const d=this.drivers.get(p.id);if(!d)continue;d.samples.push({time,state:p.state});if(d.samples.length>8)d.samples.shift();}}
  update(time,dt,origin,night,local,road){
    let visible=0;
    for(const d of this.drivers.values()){
      const samples=d.samples;if(!samples.length)continue;const target=time-120;
      while(samples.length>2&&samples[1].time<target)samples.shift();
      const a=samples[0],b=samples[1]||a,t=clamp((target-a.time)/Math.max(1,b.time-a.time),0,1),s={};
      for(const key of fields)s[key]=THREE.MathUtils.lerp(a.state[key],b.state[key],t);
      s.heading=a.state.heading+angleDelta(b.state.heading,a.state.heading)*t;
      const latest=samples.at(-1);s.paused=latest.state.paused||time-latest.time>2500;
      // Extrapolate only briefly; a dropped connection never sends a ghost driving away.
      if(target>latest.time&&!s.paused){const lag=Math.min(.18,(target-latest.time)/1000);s.x=latest.state.x+Math.sin(latest.state.heading)*latest.state.speed*lag;s.s=latest.state.s+Math.cos(latest.state.heading)*latest.state.speed*lag;}
      const car=d.car;car.root.visible=Math.hypot(s.x-local.x,s.s-local.s)<420;if(!car.root.visible)continue;visible++;
      car.root.position.set(s.x,s.heave,-s.s+origin);car.root.rotation.set(0,-s.heading,0);car.body.rotation.set(s.pitch,0,s.roll,'YXZ');
      if(!s.paused)d.spin-=s.speed*dt/car.spec.wheelRadius;
      const contacts=wheelContacts(s,car.spec,road),center=new THREE.Vector3();
      car.wheels.forEach((wheel,i)=>{center.set(wheel.x,wheel.radius,wheel.z).applyQuaternion(car.body.quaternion);wheel.pivot.position.set(center.x,contacts[i].height-s.heave+wheel.radius,center.z);wheel.pivot.rotation.set(s.pitch,-wheelSteeringAngle(car.spec,s.steeringAngle,wheel.side,wheel.front),s.roll,'YXZ');wheel.spin.rotation.x=d.spin;});
      car.materials.tail.emissiveIntensity=.35+night*.7+s.brake*3.5;car.materials.headlight.emissiveIntensity=.35+night*3;
      d.label.material.opacity=s.paused?.55:.92;
    }
    return visible;
  }
}
