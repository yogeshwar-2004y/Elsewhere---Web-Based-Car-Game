export const MAPS=[
  {id:'alpine',name:'Alpine Hills',description:'Forest roads & mountain passes',seed:'alpine-sunday'},
  {id:'desert',name:'Desert Canyon',description:'Red mesas & wide-open skies',seed:'red-mesa'},
  {id:'coastal',name:'Coastal Cliffs',description:'Ocean roads & quiet beaches',seed:'pacific-morning'},
];
const mapOptions=MAPS.map(m=>`<option value="${m.id}">${m.name}</option>`).join('');
export function multiplayerMarkup(icon){return `
  <button id="session-badge" class="session-badge" hidden aria-label="Open multiplayer room">${icon('users')}<span id="session-summary"></span><span class="live-dot"></span></button>
  <div class="modal-backdrop" id="multiplayer-modal" hidden><section class="dialog multiplayer-dialog" role="dialog" aria-modal="true" aria-labelledby="multiplayer-title">
    <div class="dialog-heading"><div class="eyebrow">GOOD COMPANY. OPEN ROADS.</div><button class="icon-button" data-close="multiplayer-modal" aria-label="Close multiplayer">${icon('x')}</button></div>
    <h2 id="multiplayer-title">A road to share.</h2>
    <p id="room-intro">Drive alone, or invite a little company. Up to 8 drivers can wander together.</p>
    <div id="room-connect">
      <label class="room-label" for="driver-name">YOUR NAME ON THE ROAD</label><input id="driver-name" class="room-input" maxlength="20" autocomplete="nickname" placeholder="Wanderer">
      <div class="room-tabs" role="group" aria-label="Multiplayer mode"><button id="room-create-mode" aria-pressed="true">Create a room</button><button id="room-join-mode" aria-pressed="false">Join with a code</button></div>
      <form id="create-room-form">
        <label class="room-label" for="create-map">CHOOSE A MAP</label><select id="create-map" class="room-input">${mapOptions}</select>
        <div id="create-map-description" class="map-description">Forest roads & mountain passes</div>
        <label class="room-label" for="create-seed">ROAD SEED</label><input id="create-seed" class="room-input" maxlength="64" value="slow-sunday" required autocomplete="off" spellcheck="false">
        <button id="create-room" class="primary-button room-primary" type="submit">Create session code ${icon('arrow-up-right')}</button>
      </form>
      <form id="join-room-form" hidden><label class="room-label" for="join-code">YOUR FRIEND’S SESSION CODE</label><input id="join-code" class="room-input code-input" maxlength="6" minlength="6" required autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABC234"><button id="join-room" class="primary-button room-primary" type="submit">Join their road ${icon('arrow-up-right')}</button></form>
      <button id="solo-choice" class="copy-button">Just drive solo ${icon('arrow-up-right')}</button>
    </div>
    <div id="room-active" hidden>
      <div class="room-code-card"><span class="room-label">YOUR SESSION CODE</span><strong id="room-code"></strong><span id="room-occupancy"></span><div class="room-copy-row"><button id="copy-room-code">${icon('copy')} Copy code</button><button id="copy-room-link">${icon('link')} Invite link</button></div></div>
      <div class="room-roster-title"><span class="room-label">ON THIS ROAD</span><span id="room-role"></span></div><ul id="room-roster" class="room-roster"></ul>
      <form id="room-map-form"><label class="room-label" for="session-map">SESSION MAP</label><select id="session-map" class="room-input">${mapOptions}</select><label class="room-label" for="session-seed">ROAD SEED</label><input id="session-seed" class="room-input" maxlength="64" required autocomplete="off" spellcheck="false"><button id="apply-room-map" class="secondary-button" type="submit">Explore this map together ${icon('mountain-snow')}</button></form>
      <p id="room-map-note" class="room-note">The host chooses the map, road seed, and time of day. Changing the map starts everyone on the new road.</p>
      <div class="room-actions"><button id="catch-up" class="secondary-button">Meet the group ${icon('route')}</button><button id="room-drive" class="primary-button">Keep driving ${icon('arrow-up-right')}</button></div>
      <button id="leave-room" class="copy-button">Leave room & continue solo</button>
    </div>
    <div id="room-message" class="room-message" role="status" aria-live="polite"></div>
  </section></div>`;}
