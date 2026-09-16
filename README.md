# elsewhere

A free, peaceful, browser-based endless driving game. No accounts, advertising, trackers, scores, or finish lines. Built with Three.js, WebGL 2, Vite, and the Web Audio API.

URL : https://elsewhere-gules.vercel.app/

## Run

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. `npm run build` creates a static production build in `dist/`; deploy that folder to any static host. `npm run preview` serves the build locally. `npm test` checks deterministic world generation, long-duration autopilot stability, frame-rate consistency, braking, and off-road movement.

## Controls

- **WASD / arrows:** accelerate, brake/reverse, steer
- **R:** return to road
- **F:** autodrive (manual input takes over)
- **C:** chase, bonnet, and wide cameras
- **N:** day / night
- **Space / Escape:** pause
- **M:** mute all audio
- **H:** hide interface
- **Gamepad:** left stick, right trigger accelerate, left trigger brake, A reset, Y autodrive, Start pause
- **Touch:** steering and pedal controls appear on touch devices after starting

## The world

Exactly three environments: Alpine Hills, Desert Canyon, and Coastal Cliffs. Each uses different terrain, colors, vegetation, ambient sound, and landmarks. Alpine routes include occasional river bridges and stone tunnels; coastal routes include lighthouses. Deterministic value noise generates an unlimited road, and a bounded sliding window of terrain chunks is disposed and replaced as you drive. A moving coordinate origin maintains precision on long trips. Reverse travel streams scenery too.

Exactly three hand-built, optimized stylized cars: Lamborghini, BMW 2002, and Porsche 911. These are original, unbranded geometric interpretations rather than licensed manufacturer models. Each has independent acceleration, top speed, grip, steering response, suspension roll, and synthesized engine voice. The car simulation uses a smooth bicycle-inspired kinematic model with lateral grip lag, drag, road-following suspension, and off-road resistance; it is tuned for relaxation rather than simulation accuracy.

The lighting interpolates between day and night, including sky colors, fog, stars, moon, and real spotlight headlights. The medium and low graphics modes lower resolution and visible distance; low disables dynamic shadows. Rendered frames use capped simulation substeps and the game pauses on focus loss.

All sound is generated locally: engine harmonics, wind, ocean surf, forest chirps, and a gentle evolving synth chord. Turn ambient music to zero to use your own player. Sound begins only after interaction and needs no audio downloads.

Preferences are stored in local storage. Share a road using the seed dialog: links include `?seed=your-seed&theme=alpine`. The seed recreates the road from its starting point, not a saved vehicle position. Fonts are bundled locally under their included open font licenses. The production game makes no external asset requests and has no server or telemetry.

## Scope and compatibility

Designed for recent WebGL 2 browsers, including Chrome, Firefox, Safari, and Edge. Actual frame rate depends on device and graphics settings; 60 FPS is a target, not a guarantee. The bonnet camera is a simple forward view, not a detailed interior. The landscape uses a faceted art style, with no heavyweight post-processing, vehicle damage, collision walls, traffic, or race mechanics.
