import { CAR_SPECS } from './dynamics.js';
const VOICES={lamborghini:{ratios:[1,2.5,5],waves:['sawtooth','sawtooth','triangle'],gain:.85},bmw:{ratios:[1,2,3.02],waves:['triangle','square','triangle'],gain:.65},porsche:{ratios:[1,1.5,3],waves:['sawtooth','triangle','sine'],gain:1}};
export class Soundscape {
  constructor() { this.volume=.32;this.musicVolume=.3;this.muted=false;this.theme='alpine';this.car='bmw'; }
  async start() {
    if(this.context) { await this.context.resume();return; }
    const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext)return;
    const ctx=this.context=new AudioContext();this.master=ctx.createGain();this.master.gain.value=this.muted?0:this.volume;this.master.connect(ctx.destination);
    this.engineGain=ctx.createGain();this.engineGain.gain.value=.035;this.engineFilter=ctx.createBiquadFilter();this.engineFilter.type='lowpass';this.engineFilter.frequency.value=400;this.engineGain.connect(this.engineFilter);this.engineFilter.connect(this.master);
    this.oscillators=[1,1.5,2.01].map((ratio,i)=>{const o=ctx.createOscillator();o.type=i===0?'sawtooth':'triangle';o.frequency.value=CAR_SPECS[this.car].note*ratio;o.connect(this.engineGain);o.start();return o;});
    const buffer=ctx.createBuffer(1,ctx.sampleRate*4,ctx.sampleRate),data=buffer.getChannelData(0);let last=0;
    for(let i=0;i<data.length;i++){last=(last+Math.random()*.04-.02)/1.02;data[i]=last*4;}
    const noise=ctx.createBufferSource();noise.buffer=buffer;noise.loop=true;
    this.windFilter=ctx.createBiquadFilter();this.windFilter.type='lowpass';this.windFilter.frequency.value=1000;this.windGain=ctx.createGain();this.windGain.gain.value=.1;
    noise.connect(this.windFilter);this.windFilter.connect(this.windGain);this.windGain.connect(this.master);noise.start();
    this.music=ctx.createGain();this.music.gain.value=this.musicVolume*.12;this.music.connect(this.master);
    // Quiet, original, slowly breathing synth chords; no network or audio assets.
    [130.81,196,261.63,329.63,440].forEach((f,i)=>{
      const osc=ctx.createOscillator();osc.type='sine';osc.frequency.value=f;osc.detune.value=i*1.3;
      const gain=ctx.createGain();gain.gain.value=.2;
      const lfo=ctx.createOscillator();lfo.frequency.value=.025+i*.007;const depth=ctx.createGain();depth.gain.value=.12;lfo.connect(depth);depth.connect(gain.gain);
      osc.connect(gain);gain.connect(this.music);osc.start();lfo.start();
    });
    this.bird=ctx.createOscillator();this.bird.type='sine';this.birdGain=ctx.createGain();this.birdGain.gain.value=0;this.bird.connect(this.birdGain);this.birdGain.connect(this.master);this.bird.start();
    await ctx.resume();
  }
  update(speed,throttle,time,night,paused=false) {
    if(!this.context)return;const t=this.context.currentTime;const spec=CAR_SPECS[this.car];
    const rpm=850+(Math.abs(speed)*110%4400)+throttle*400;const voice=VOICES[this.car];
    if(this.lastVoice!==this.car){this.oscillators.forEach((o,i)=>o.type=voice.waves[i]);this.lastVoice=this.car;}
    this.oscillators.forEach((o,i)=>o.frequency.setTargetAtTime(spec.note*(rpm/1100)*voice.ratios[i],t,.13));
    this.engineGain.gain.setTargetAtTime((paused?.006:.012+throttle*.018+Math.abs(speed)*.00025)*voice.gain,t,.15);
    this.engineFilter.frequency.setTargetAtTime(200+rpm*.16,t,.2);
    const waves=this.theme==='coastal'?.12+Math.sin(time*.38)*.075:.035;
    this.windGain.gain.setTargetAtTime(waves+Math.abs(speed)*.002,t,.4);
    this.windFilter.frequency.setTargetAtTime(this.theme==='desert'?620:this.theme==='coastal'?1800:1000,t,.5);
    const chirp=this.theme==='alpine'&&Math.sin(time*.17)>.92&&!night?Math.pow(Math.max(0,Math.sin(time*13)),9)*.04:0;
    this.bird.frequency.setTargetAtTime(2300+Math.sin(time*10)*700,t,.02);this.birdGain.gain.setTargetAtTime(chirp,t,.015);
    this.master.gain.setTargetAtTime(this.muted?0:this.volume,t,.1);this.music.gain.setTargetAtTime(this.musicVolume*.12,t,.3);
  }
  suspend() {this.context?.suspend();}
}
