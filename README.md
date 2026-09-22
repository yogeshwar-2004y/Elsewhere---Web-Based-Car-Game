# elsewhere

A free, peaceful, browser-based endless driving game. No accounts, advertising, trackers, scores, or finish lines. Built with Three.js, WebGL 2, Vite, Web Audio, and an optional Node.js WebSocket server.

URL : https://elsewhere-gules.vercel.app/

## Run

Use Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

This starts the game and the multiplayer server together. Open the Vite URL printed in the terminal. `npm run dev:solo` starts only Vite; `npm run dev:server` starts only the room server on port 5175. The Vite proxy connects `/room` to that server.

## Solo or multiplayer

Choose **Drive solo** for a private drive. Solo never opens a multiplayer connection.

To drive together:

1. Open **Or drive with friends** or the people icon in the toolbar.
2. Enter a display name, choose a map and road seed, and create a room.
3. Share the six-character session code or invite link. Friends choose **Join with a code**.
4. Up to eight people can drive together. Everyone chooses their own car, camera, audio, graphics, and autodrive settings.

The host controls the map, road seed, and day/night. Changing the map moves everyone onto the new road with spaced starting positions. **Meet the group** brings your own car back near a companion. Pausing affects only your car. Player cars can pass through each other, preserving the relaxed experience. Leaving a room continues your solo journey; the next remaining driver becomes host. Rooms disappear when empty or when the server restarts. A disconnected player can rejoin using the code while the room still exists.

Maps currently include **Alpine Hills**, **Desert Canyon**, and **Coastal Cliffs**. Each seed creates another reproducible route within that environment. Map choices live in `src/multiplayer-ui.js`; terrain and scenery live in `src/dynamics.js` and `src/world.js`. There is no map editor or user-uploaded map format.

For friends on the same Wi-Fi, share Vite’s **Network** URL, not localhost. Keep the development servers running. Internet play requires hosting the WebSocket server at an address all players can reach.

## Production hosting

```sh
npm run build
npm start
```

The Node server serves `dist/` and `/room` together on `PORT` (default 5175). Deploy it as a persistent Node process behind HTTPS with WebSocket upgrades enabled. `/health` provides a health check. Use one server instance: rooms are held in memory and are not shared between replicas.

Static hosting alone supports solo. For a separately hosted multiplayer backend, set `VITE_MULTIPLAYER_URL=wss://your-server/room` **before building** the frontend, and set the backend’s `ALLOWED_ORIGINS` to the frontend’s exact HTTPS origin (comma-separated for multiple sites). See `.env.example`. `VITE_` values are public configuration, not secrets. The server reads environment variables provided by the hosting environment; `.env.example` is documentation rather than an automatically loaded server configuration.

The room server validates payloads, caps room size and message size, throttles updates, checks browser origins, removes disconnected peers, and isolates rooms by code. It relays client-simulated cars with interpolated rendering, not an authoritative competitive physics simulation. No accounts, persistent player history, chat, or telemetry are added.

### Vercel game + free Render multiplayer

The Vercel site is a static frontend. Vite's development `/room` proxy does not run there. A connection to `wss://elsewhere-gules.vercel.app/room` without a deployed room backend will fail. Keep the existing Vercel frontend and deploy the room server separately:

1. Commit and push these changes (including `render.yaml`) to the GitHub repository used for deployment.
2. In [Render](https://dashboard.render.com), choose **New → Blueprint**, connect this repository, and use `render.yaml`. It creates a **Free** Node web service with `npm ci --omit=dev`, `npm start`, and `/health` as its health check. It does not build or host another copy of the game.
3. Wait for the service to become **Live**. Open its actual Render URL with `/health` appended; it must return `{"ok":true,"service":"elsewhere-rooms"}`. Copy the assigned hostname; do not assume the service name is its hostname.
4. In Vercel → **elsewhere → Settings → Environment Variables**, set `VITE_MULTIPLAYER_URL` to `wss://<actual-render-hostname>/room` for **Production**. Redeploy the frontend: Vite embeds this setting at build time.
5. The Blueprint already sets `ALLOWED_ORIGINS=https://elsewhere-gules.vercel.app`. If you change the frontend domain, update that value in Render. Add exact preview origins only when needed, separated by commas.
6. Open the Vercel game in two browsers: create a session, join its code, and confirm both players appear and share map changes.

The client checks the room server before opening its socket, allows up to 90 seconds for it to wake, and keeps solo play available. [Render's free services](https://render.com/docs/free) sleep after inactivity, so the first connection may take about a minute. Rooms disappear on sleep, restart, or deploy; this free setup does not preserve sessions. Keep a single service instance because rooms live in memory.

Although [Vercel now offers WebSocket Functions](https://vercel.com/docs/functions/websockets), adding a rewrite alone would not deploy this backend, and separate function instances would not share its in-memory rooms. This configuration deliberately runs the existing room server as one persistent process on Render.

## Controls

- **WASD / arrows:** accelerate, brake/reverse, steer
- **Shift:** handbrake
- **R:** return to road
- **F:** autodrive; manual input takes over
- **C:** chase, cockpit, bonnet, and wide cameras
- **Drag / double-click:** look around / recenter in exterior views
- **N:** day / night; host-controlled in multiplayer
- **Space / Escape:** pause
- **M:** mute audio
- **H:** hide interface
- **Gamepad:** left stick, triggers, A reset, B handbrake, X camera, Y autodrive, Start pause
- **Touch:** steering and pedal buttons appear on mobile

## Cars, physics, and scenery

Exactly three original, optimized stylized interpretations: Lamborghini, BMW 2002, and Porsche 911. Each has its own bodywork, wheels, cabin, instruments, suspension tuning, power, mass, grip, steering, gearing, and synthesized engine voice. Cockpits include animated steering wheels, live speed/RPM instruments, and a rendered rear-view mirror. Bonnet cameras sit ahead of the windshield. These are geometric interpretations, not licensed manufacturer assets or exact engineering models.

The driving model includes traction-limited acceleration, automatic gear changes, braking before reverse, speed-sensitive Ackermann steering, road-slope gravity, four tire contacts, damped body roll/pitch, and off-road drag. Tree trunks respond to the vehicle footprint; cacti yield on impact and spring back. Water adds resistance and deep water returns the car to the road without a game-over state.

Deterministic terrain streams in bounded chunks with a moving coordinate origin. Tire contacts and vegetation placement sample the rendered terrain triangles. Coastal water uses one continuous sea level with ripples and shoreline surf. Alpine routes include bridges over river channels and occasional tunnels; coastal routes include lighthouses. Lighting transitions smoothly between daylight and moonlit fog with spotlight headlights.

Everything except multiplayer state stays local. Audio is synthesized in the browser, fonts are bundled, and preferences use local storage. Lower graphics settings reduce resolution, shadows, and scenery range. The 60 FPS target depends on hardware and the number of nearby drivers.

## Validation

```sh
npm test
npm run test:multiplayer
npm run build
```

The multiplayer integration tests open temporary loopback ports. See `TESTING.md` for coverage and browser checks.
