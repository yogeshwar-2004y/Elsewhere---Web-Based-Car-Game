export const CAR_SPECS = {
  lamborghini: { name: 'Lamborghini', subtitle: 'A little more extraordinary.', era: 'MODERN SUPERCAR', color: '#d4df69', mass: 1525, power: 470, grip: 1.16, acceleration: 11.5, maxSpeed: 88, steering: 1.5, suspension: 7, cylinders: 10, note: 42 },
  bmw: { name: 'BMW 2002', subtitle: 'Old soul. Open road.', era: '1973 · CLASSIC COUPE', color: '#e88c50', mass: 1020, power: 96, grip: 0.86, acceleration: 6.4, maxSpeed: 52, steering: 1.16, suspension: 4, cylinders: 4, note: 54 },
  porsche: { name: 'Porsche 911', subtitle: 'Every curve, a conversation.', era: '1989 · AIR-COOLED ICON', color: '#d8ddd0', mass: 1260, power: 184, grip: 1.08, acceleration: 8.8, maxSpeed: 70, steering: 1.3, suspension: 6, cylinders: 6, note: 47 },
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
    seed,
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
        h = lateral < 0 ? -32 + n * 8 : 4 + n * 34 + Math.min(d * .15, 65);
      } else {
        h = 3 + n * 48 + Math.min(d * .25, 180) * (0.6 + noise2(x / 430, s / 380, seed + 300) * .55);
        // A river valley periodically passes beneath a short viaduct.
        const river = this.river(s);
        if (river < 35) h -= (1 - river / 35) * 24;
      }
      return this.y(s) - .1 + h * blend;
    },
    river(s) { return Math.abs(((s % 1800) + 1800) % 1800 - 930); },
  };
  return road;
}
export function stepVehicle(state, input, spec, road, dt) {
  const lateral = Math.abs(state.x - road.x(state.s));
  const offroad = lateral > 6;
  const drag = .11 + Math.abs(state.speed) * .0022 + (offroad ? .4 : 0);
  let force = input.throttle * spec.acceleration * Math.max(.12, 1 - Math.max(0, state.speed) / spec.maxSpeed);
  if (input.brake > 0) force -= state.speed > .5 ? input.brake * 15 : input.brake * spec.acceleration * .45;
  state.speed = clamp(state.speed + (force - state.speed * drag) * dt, -10, spec.maxSpeed);
  if (!input.throttle && !input.brake && Math.abs(state.speed) < .06) state.speed = 0;
  state.steer = damp(state.steer, input.steer, spec.steering * 5, dt);
  const yaw = state.steer * Math.min(Math.abs(state.speed) / 7, 1) * spec.steering / (1 + Math.abs(state.speed) * .028) * Math.sign(state.speed);
  state.heading += yaw * dt;
  state.travelHeading = state.travelHeading ?? state.heading;
  state.travelHeading += angleDelta(state.heading, state.travelHeading) * Math.min(1, dt * spec.grip * (offroad ? 3.4 : 7));
  const dx = Math.sin(state.travelHeading) * state.speed * dt;
  const ds = Math.cos(state.travelHeading) * state.speed * dt;
  state.x += dx;
  state.s += ds;
  state.distance += Math.hypot(dx, ds);
  state.offroad = offroad;
  return state;
}
export function cruiseInput(state, road) {
  const lookAhead = 13 + Math.max(state.speed, 0) * .72;
  const targetX = road.x(state.s + lookAhead) + 2.3;
  const desired = Math.atan2(targetX - state.x, lookAhead);
  const error = angleDelta(desired, state.heading);
  const bend = Math.abs(angleDelta(road.heading(state.s + 48), road.heading(state.s)));
  const targetSpeed = 19 - Math.min(9, bend * 32);
  return { steer: clamp(error * 2.6, -1, 1), throttle: clamp((targetSpeed - state.speed) * .25 + .39, 0, 1), brake: clamp((state.speed - targetSpeed - 2) * .18, 0, 1) };
}
