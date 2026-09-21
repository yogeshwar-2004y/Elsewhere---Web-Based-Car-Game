export const MAX_PLAYERS = 8;
export const THEMES = ['alpine', 'desert', 'coastal'];
export const CARS = ['lamborghini', 'bmw', 'porsche'];
export const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;
export const cleanName = value => String(value || 'Wanderer').normalize('NFKC').replace(/[\p{C}<>]/gu, '').trim().slice(0, 20) || 'Wanderer';
export function settingsFrom(value) {
  if (!value || !THEMES.includes(value.theme) || typeof value.seed !== 'string' || !value.seed.trim() || value.seed.length > 64 || typeof value.night !== 'boolean') return null;
  return { theme:value.theme, seed:value.seed.trim(), night:value.night };
}
export function stateFrom(value) {
  const bounds={x:1e8,s:1e8,heading:1e9,speed:100,steeringAngle:1,pitch:1.6,roll:1.6,heave:10000,brake:1};
  if(!value || Object.entries(bounds).some(([key,bound])=>typeof value[key]!=='number'||!Number.isFinite(value[key])||Math.abs(value[key])>bound))return null;
  return Object.fromEntries([...Object.keys(bounds).map(key=>[key,value[key]]),['paused',value.paused===true]]);
}
