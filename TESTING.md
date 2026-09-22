# Validation

`npm test` runs automated tests covering:

- Reproducible terrain, continuous roads, bridge clearance, and matching terrain chunk edges.
- Twelve simulated minutes of autodrive per car and seed across nine combinations.
- Acceleration based on power and weight; gearbox RPM, braking, reverse, suspension, steering, and frame-rate consistency.
- Four-wheel surface sampling and a shared Ackermann turning centre.
- Off-road movement, deep-water recovery detection, tree impacts up to 85 m/s, and yielding cacti.
- Vegetation roots and physics heights matching actual rendered triangles.
- Continuous coastal water through origin shifts and bounded resources over a 20 km drive.
- Session codes, room capacity, host-only configuration, stale position rejection after map changes, name/payload validation, room isolation, host handoff, and empty-room cleanup.
- Local/separate server URL resolution, secure connection requirements, missing backend detection, static fallback rejection, and health-check cancellation.

`npm run test:multiplayer` runs three integration tests using real WebSocket clients against temporary loopback servers. They cover creation, joining, state relay, map/night synchronization, car changes, host disconnect, cleanup, invalid codes, origin rejection, and the health endpoint. A separate-host check verifies the Vercel origin can read server health and establish WebSocket connections, while unrelated origins do not receive CORS access.

`npm run build` produces the static frontend. The main bundle is approximately 175 KB compressed. Vite may report an advisory for the uncompressed Three.js bundle exceeding 500 KB; this is not a build failure.

Browser checks performed in the Codex in-app browser:

- Room creation and joining from a second browser tab using an invite URL.
- Visible remote car and name tag, independent car changes, and live movement with autodrive.
- Shared terrain seed, map switching, and day/night changes.
- Guest map controls disabled; host handoff enables them after the original host leaves.
- Returning to solo without ending the drive.
- Separate vehicle starting positions after a shared map change.
- Room dialogs, the session badge, and driving controls at a 390 × 844 viewport.
- Continuous coastal water, new vegetation, and car/camera rendering.

The two-player desktop check ran around 60 FPS on this machine with high graphics. This is not an eight-player or cross-device performance guarantee. Separate physical devices, physical gamepads, production hosting, and other browser engines require deployment testing. Rooms are intentionally ephemeral, and player-to-player collisions are disabled.
