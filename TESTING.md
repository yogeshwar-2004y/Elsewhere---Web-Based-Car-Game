# Validation

Run `npm test` for the automated checks. The eight tests cover:

- Seed reproducibility, including negative and very large road coordinates.
- Continuous road and terrain heights in all three environments.
- Twelve simulated minutes of autodrive per car and seed (nine combinations).
- Handling consistency at 60 Hz and 120 Hz, braking, and reverse.
- Off-road driving without a terminal state.
- Matching geometry along adjacent terrain chunk boundaries.
- A simulated 20 km journey with bounded live chunks and disposal of old geometry.
- Distant off-road terrain streaming and cleanup on returning to the road.

`npm run build` creates the production output. Its main JavaScript bundle is about 153 KB compressed; the build may display Vite's advisory warning about the uncompressed Three.js bundle exceeding 500 KB. This is not a build failure.

Browser checks performed in the Codex in-app browser:

- All three environment choices and all three car models render.
- Day/night switching, stars, and working spotlight headlights.
- Autodrive moves the car and increments distance.
- Car and environment switching during a drive.
- Pause preserves the vehicle's exact position and distance; resume continues.
- Return-to-road resets speed and alignment without ending the journey.
- Chase, wide, and bonnet camera views.
- Seed entry updates the route and shareable URL.
- High and low quality settings change resource use (13 versus 9 terrain chunks).
- A 390 × 844 layout shows the car, controls, speed, and accessible journey menu.
- No application errors were reported in the browser console during these checks.

The observed desktop high-quality frame rate was about 60 FPS in this browser. This is not a cross-device performance guarantee. Physical gamepad hardware and separate installations of Chrome, Firefox, Safari, and Edge were not available for this smoke test.
