import { CAR_SPECS } from './dynamics.js';
import { createIcons, Volume2, VolumeX, Maximize, SlidersHorizontal, ArrowUpRight, Compass, Check, Sun, Moon, Route, Shuffle, ChevronUp, ChevronDown, Infinity, MountainSnow, X, Headphones, Gamepad2, Link, Play, Pause, ArrowLeft, ArrowRight, ChevronsUp, Camera } from 'lucide';
const icons={Volume2,VolumeX,Maximize,SlidersHorizontal,ArrowUpRight,Compass,Check,Sun,Moon,Route,Shuffle,ChevronUp,ChevronDown,Infinity,MountainSnow,X,Headphones,Gamepad2,Link,Play,Pause,ArrowLeft,ArrowRight,ChevronsUp,Camera};
export const icon=(name,extra='')=>`<i data-lucide="${name}" ${extra}></i>`;
export function refreshIcons(){createIcons({icons,attrs:{'stroke-width':1.6}});}
const thumb=(theme)=>{
  const palettes={alpine:['#c9dfdc','#a8bd9e','#7e9e70','#527956','#91a77b'],desert:['#e8d5b4','#c59b72','#b77d54','#9d6348','#d4a678'],coastal:['#c6e0e4','#91b6b6','#76a6b0','#718775','#adc19c']};
  const c=palettes[theme];
  return `<svg viewBox="0 0 220 90" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="220" height="90" fill="${c[0]}"/><circle cx="176" cy="19" r="10" fill="#fff6d5" opacity=".8"/><path d="M0 68 35 17 62 42 102 9 143 55 171 30 220 63V90H0Z" fill="${c[1]}"/><path d="M0 53 45 43 89 67 123 31 166 44 220 23V90H0Z" fill="${c[2]}"/><path d="M0 70Q40 49 91 79T220 51V90H0Z" fill="${c[4]}"/>${theme==='coastal'?'<path d="M0 67Q58 61 116 86L220 90H0" fill="#7eafb8"/>':''}<path d="M113 90Q169 67 134 59T136 35" fill="none" stroke="#657068" stroke-width="9"/><path d="M113 90Q169 67 134 59T136 35" fill="none" stroke="#e8e6c6" stroke-width=".8" stroke-dasharray="4 4"/>${theme==='alpine'?`<path d="m29 46-9 22h6l-8 13h25l-8-13h5Zm28-14-8 20h5l-7 11h22l-7-11h5Z" fill="${c[3]}"/>`:theme==='desert'?`<path d="M21 73V31h31l8 9v34Zm147-16V29h28l6 28Z" fill="${c[3]}"/>`:`<path d="m59 62 2-28h7l3 28Z" fill="#eeeada"/><path d="m59 34 5-6 6 6Z" fill="#5d7774"/>`}</svg>`;
};
export function mountUI() {
  document.querySelector('#app').innerHTML=`
  <div id="scene" aria-label="Interactive 3D endless driving landscape"></div>
  <div class="scene-shade"></div>
  <header class="topbar">
    <a class="brand" href="./" aria-label="Elsewhere home"><svg viewBox="0 0 33 38" fill="none" aria-hidden="true"><path d="M3 34C3 19 22 22 22 4M13 34C13 23 31 21 31 4" stroke="currentColor" stroke-width="2.7" stroke-linecap="round"/><path d="m13 9 3-4m-5 14-3 2m-1 8-1 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span>elsewhere<span class="brand-dot">.</span></span></a>
    <div class="top-motto">NOWHERE TO BE. NOTHING TO CHASE.</div>
    <nav class="top-actions" aria-label="Game tools">
      <button class="icon-button" id="camera-btn" title="Change camera (C)" aria-label="Change camera: Chase">${icon('camera')}</button>
      <button class="icon-button" id="sound-btn" title="Toggle sound (M)" aria-label="Mute sound">${icon('volume-2')}</button>
      <button class="icon-button" id="fullscreen-btn" title="Fullscreen" aria-label="Enter fullscreen">${icon('maximize')}</button>
      <span class="nav-divider"></span>
      <button class="icon-button" id="settings-btn" title="Settings" aria-label="Open settings">${icon('sliders-horizontal')}</button>
    </nav>
  </header>
  <section class="intro" id="intro">
    <div class="eyebrow"><span></span> A SMALL ESCAPE FROM EVERYTHING</div>
    <h1>Take the<br>long way<span>.</span></h1>
    <p>No finish line. No right direction.<br>Just you, the road, and a little room to breathe.</p>
    <button id="start-btn" class="primary-button">Let’s drive ${icon('arrow-up-right')}</button>
    <div class="start-note">Free to wander. Always.</div>
  </section>
  <div class="drive-label" id="drive-label"><span class="live-dot"></span><span id="location">THE QUIET SIDE OF THE ALPS</span><span id="camera-status">Chase view</span></div>
  <aside class="escape-panel" id="escape-panel" aria-label="Journey options">
    <div class="panel-heading"><div><span class="eyebrow">MAKE IT YOURS</span><h2>Your escape</h2></div>${icon('compass')}</div>
    <div class="section-label">LANDSCAPE <span>01 — 03</span></div>
    <div class="theme-list" role="group" aria-label="Choose environment">
      ${[['alpine','Alpine Hills','Green hills. A little fresh air.'],['desert','Desert Canyon','Warm earth. Wide-open skies.'],['coastal','Coastal Cliffs','Salt air. Endless blue.']].map(([id,name,sub],i)=>`<button class="theme-card ${i===0?'selected':''}" data-theme="${id}" aria-pressed="${i===0}"><div class="theme-thumb">${thumb(id)}<span class="theme-check">${icon('check')}</span></div><div class="theme-caption"><strong>${name}</strong><small>${sub}</small></div></button>`).join('')}
    </div>
    <div class="time-control" role="group" aria-label="Time of day"><button id="day-btn" class="selected" aria-pressed="true">${icon('sun')} Day</button><button id="night-btn" aria-pressed="false">${icon('moon')} Night</button></div>
    <div class="cruise-row"><div>${icon('route')}<span>Autodrive <small>Let the road take you</small></span></div><button id="cruise-btn" class="toggle" role="switch" aria-checked="false" aria-label="Autodrive"><span></span></button></div>
    <button class="seed-link" id="seed-btn">${icon('shuffle')} <span>Road seed: <b id="seed-display">slow-sunday</b></span>${icon('arrow-up-right')}</button>
  </aside>
  <div class="bottom-bar">
    <button class="car-pill" id="car-btn" aria-label="Choose car" aria-expanded="false"><div class="car-drawing"><svg viewBox="0 0 86 40" fill="none" aria-hidden="true"><path d="m9 25 3-10 13-2 11-9h27l12 13 5 2v12H7v-6Z" stroke="currentColor" stroke-width="1.5"/><path d="m26 14 12-8h22l8 10H26Zm19-8v10M11 21h8m47 0h10M28 26h33" stroke="currentColor" stroke-width="1.3"/><circle cx="23" cy="30" r="6" fill="#2d4439" stroke="currentColor" stroke-width="1.5"/><circle cx="67" cy="30" r="6" fill="#2d4439" stroke="currentColor" stroke-width="1.5"/></svg></div><span><small>YOUR COMPANION</small><strong id="car-name">BMW 2002</strong></span>${icon('chevron-up')}</button>
    <div class="drive-hud" id="drive-hud"><div class="speed"><strong id="speed">0</strong><span>km/h</span><div class="powertrain"><span><b id="gear">1</b> <span id="rpm">850</span> rpm</span><div class="rev-track"><i id="rev-fill"></i></div></div></div><div class="hud-divider"></div><div class="distance"><strong id="distance">0.0 <span>km</span></strong><small>of taking it easy</small></div><button id="pause-btn" class="icon-button" aria-label="Pause drive">${icon('pause')}</button></div>
    <div class="journey-note">${icon('infinity')} A road without an ending.</div>
    <button id="journey-btn" class="journey-button" aria-label="Toggle journey options" aria-expanded="true">${icon('mountain-snow')} Your escape ${icon('chevron-down')}</button>
  </div>
  <div class="keyboard-hint" id="keyboard-hint"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> drive</span><span><kbd>R</kbd> return to road</span><span><kbd>C</kbd> camera</span><span><kbd>H</kbd> hide UI</span></div>
  <div class="corner-caption">UNWIND. GO A LITTLE FURTHER.</div>
  <div class="car-picker popover" id="car-picker" hidden><div class="popover-title"><span>Find your companion</span><button class="close-small" data-close="car-picker" aria-label="Close car picker">${icon('x')}</button></div>${[['lamborghini','Lamborghini','Bold spirit. Effortless power.','#c7db54'],['bmw','BMW 2002','Old soul. Open road.','#db7d39'],['porsche','Porsche 911','Made for the winding way.','#a8c6c3']].map(([id,name,sub,color])=>`<button data-car="${id}" class="car-option ${id==='bmw'?'selected':''}" aria-pressed="${id==='bmw'}"><span class="paint-chip" style="--paint:${color}"></span><span><strong>${name}</strong><small>${sub}</small><small class="car-spec-line">${CAR_SPECS[id].era}</small></span>${icon('check')}</button>`).join('')}</div>
  <div class="modal-backdrop" id="settings-modal" hidden><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title"><div class="dialog-heading"><div class="eyebrow">THE LITTLE THINGS</div><button class="icon-button" data-close="settings-modal" aria-label="Close settings">${icon('x')}</button></div><h2 id="settings-title">Settle in.</h2><p>A few adjustments for your kind of drive.</p><label class="setting-row">Camera view<select id="camera-view"><option value="0">Chase</option><option value="1">Cockpit · instruments</option><option value="2">Bonnet · hood view</option><option value="3">Wide</option></select></label><label class="setting-row">Graphics quality<select id="quality"><option value="high">High · scenic</option><option value="medium">Medium · balanced</option><option value="low">Low · easygoing</option></select></label><label class="setting-range">Sound volume <output id="volume-output">32%</output><input id="volume" aria-label="Sound volume" type="range" min="0" max="100" value="32"></label><label class="setting-range">Ambient music <output id="music-output">30%</output><input id="music" aria-label="Ambient music" type="range" min="0" max="100" value="30"></label><div class="settings-note">${icon('headphones')} Prefer your own soundtrack? Turn the music down and put on something you love.</div><div class="controls-heading">A FEW FRIENDLY DIRECTIONS</div><div class="controls-grid"><span>Accelerate / brake</span><b>W / S or ↑ / ↓</b><span>Steer</span><b>A / D or ← / →</b><span>Handbrake</span><b>Hold Shift</b><span>Look around / recenter</span><b>Drag / double-click</b><span>Return to road</span><b>R</b><span>Autodrive</span><b>F</b><span>Camera / day & night</span><b>C / N</b><span>Pause / hide interface</span><b>Space / H</b></div><div class="gamepad-note" id="gamepad-note">${icon('gamepad-2')} Gamepad ready · stick + triggers · X camera</div><button class="primary-button dialog-done" data-close="settings-modal">Back to the open road ${icon('arrow-up-right')}</button></section></div>
  <div class="modal-backdrop" id="seed-modal" hidden><section class="dialog seed-dialog" role="dialog" aria-modal="true" aria-labelledby="seed-title"><div class="dialog-heading"><div class="eyebrow">A ROAD TO REMEMBER</div><button class="icon-button" data-close="seed-modal" aria-label="Close seed dialog">${icon('x')}</button></div><h2 id="seed-title">Same road.<br>New state of mind.</h2><p>A seed creates your landscape. Keep it, change it, or share it with a friend.</p><label class="seed-label" for="seed-input">YOUR ROAD SEED</label><input id="seed-input" maxlength="64" autocomplete="off" spellcheck="false" value="slow-sunday"><button class="primary-button" id="apply-seed">Find this road ${icon('arrow-up-right')}</button><button class="copy-button" id="copy-seed">${icon('link')} Copy shareable link</button></section></div>
  <div class="pause-overlay" id="pause-overlay" hidden><span class="eyebrow">THERE’S NO HURRY</span><h2>A moment to breathe.</h2><button id="resume-btn" class="primary-button">Keep wandering ${icon('play')}</button></div>
  <div class="touch-controls" id="touch-controls"><div><button data-control="left" aria-label="Steer left">${icon('arrow-left')}</button><button data-control="right" aria-label="Steer right">${icon('arrow-right')}</button></div><div><button data-control="brake" aria-label="Brake">${icon('chevron-down')}</button><button data-control="throttle" aria-label="Accelerate">${icon('chevrons-up')}</button></div></div>
  <div id="toast" class="toast" role="status"></div>
  <div id="loading" class="loading"><span class="loading-road"></span> Finding a little nowhere…</div>
  `;
  refreshIcons();
}
