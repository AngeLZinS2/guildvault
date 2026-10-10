# GuildVault — Los Santos playground

This direction replaces the violet corporate dashboard in MASTER.md for the portfolio presentation.

- Audience: GTA V roleplay guilds and portfolio visitors.
- Palette: asphalt `#101c23`, panel `#1b2c35`, sunset `#ff9970`, mint `#9ce7cd`, mission yellow `#ffce76`, paper `#fff3dd`.
- Typography: Barlow Condensed for expressive titles; Chakra Petch for forms and data.
- Layout: illustrated city and headline on the left, access ticket on the right. Stack on mobile. Internal pages share the navigation and the city scene becomes an operational launcher.
- Visual signature: original SVG city with skyline, palms, sports car, sunset and selectable locations. This is a thematic illustration, not a geographical map or live property locations.
- Interaction: scene hotspots reveal contextual descriptions; authenticated hotspots link to real sections; day/night changes the illustration; operation buttons open existing routes and the goal form.
- Motion: title entrance, staggered stars, car arrival, palm sway, cloud drift, contextual panel transitions, route progress and button feedback. User can disable motion; system reduced-motion is respected.
- Data: all administrative data remains sourced from the existing API. Decorative graphics make no claims about live server or financial status.

## Validation

Production build; desktop and 390px login inspection; hotspot selection, day/night control and animation toggle checked in browser.

## Cinematic garage login

This direction supersedes the video login and the earlier procedural city. The supplied Gemini/Veo footage is visual inspiration only: the garage is an original 3D recreation of its mood and subject, not a faithful reconstruction of the filmed environment, a geographical Los Santos location, or an official GTA/Rockstar asset or experience. The dashboard retains the illustrated map described above. There is no video element or video playback in this login component.

### Design direction

Preserve the established asphalt `#101c23`, panel `#1b2c35`, sunset `#ff9970`, mint `#9ce7cd`, mission yellow `#ffce76` and paper `#fff3dd` palette. Barlow Condensed carries the expressive headings; Chakra Petch carries forms and controls. The garage is the single visual focal point, behind the existing left-hand presentation and right-hand access ticket; mobile stacks the login content. The smaller heading leaves the actual vehicle visible. Plain, sentence-case control labels describe camera and lighting actions. Shade and grain do not intercept pointer input; immersive mode places the canvas above the background and below its controls.

### Assets and attribution

- Editable Blender source: `workbench/3d/guildvault-garage.blend`.
- Web model: `public/models/guildvault-garage-v1.glb`, served at `/models/guildvault-garage-v1.glb`.
- Static loading/fallback poster: `public/models/guildvault-garage-v1.webp`, served at `/models/guildvault-garage-v1.webp`.
- The vehicle uses CarConcept by Eric Chadwick and Darmstadt Graphics Group, licensed under Creative Commons Attribution 4.0 International (CC-BY-4.0). Attribute the source model and record any Blender/export modifications in the shipped credits; do not present this third-party vehicle as original GuildVault authorship. Its license excludes logos and associated trademarks.
- A small `Créditos 3D` link points to `/licenses/guildvault-3d.txt`. The source and exports were built and rendered with Blender 5.2.2 LTS in a separate background CLI process. The GLB is approximately 3.7 MB after Draco compression; bundled decoders and all asset licenses are served locally. See `workbench/3d/README.md` for regeneration.

### Component and runtime contract

`CinematicCity` preserves `cinema: boolean` and `onToggleCinema: () => void` for the existing Login. It dynamically imports `./createGarageScene`, whose named export must have this signature:

```ts
export function createGarageScene(
  host: HTMLDivElement,
  onReady: () => void,
  onError?: () => void,
): GarageSceneController;

type GarageSceneController = {
  setView(view: 'hero' | 'front' | 'side'): void;
  setHeadlights(enabled: boolean): void;
  setExplore(enabled: boolean): void;
  resetCamera(): void;
  dispose(): void;
};
```

The runtime mounts its canvas in `div.cinematic-canvas` inside `.cinematic-city`; the background is aria-hidden in login mode and exposed with a descriptive image label in immersive mode. Status, controls and credits remain outside it. Visibility is gated until GLB load, shader compilation and rendering complete. `onError` reports asynchronous GLTF failures and WebGL context loss. Guards handle cancelled imports and late callbacks; unmount disposes renderer, controls, textures, geometries, reflection/postprocessing targets and listeners. Loading and fallback retain a static poster, never footage. Failed scenes disable unavailable 3D actions but preserve the login and an active immersive-exit control.

### Real interactions and motion

- States are `loading`, `ready` and `fallback`. Loading displays the poster and inline GameLoader; only `onReady` permits a “Cena 3D pronta” status and enabled 3D controls. Fallback explicitly reports that a static image is being displayed. The image is not a draggable pseudo-3D scene.
- `Perspectiva`, `Frente` and `Lateral` call the real `hero`, `front` and `side` camera presets through `setView`; they do not seek footage or merely change captions. `Faróis` sends a boolean to `setHeadlights` to switch actual vehicle lights. Both controls expose their selected state with `aria-pressed`.
- `Explorar em 3D` / `Voltar ao login` preserves the existing cinema toggle and exposes `aria-pressed`. The effect depends on both `cinema` and readiness, so `setExplore(cinema)` also runs when loading completes. OrbitControls must be enabled by the runtime only while cinema mode is active; login mode must not capture scene drag/zoom gestures.
- Hints explain mouse dragging/wheel zoom and touch dragging/two-finger zoom. Exposed preset/light/exit buttons provide the keyboard interface. `Recentrar câmera` resets the currently selected preset. The existing Login owns form hiding, field preservation and `Escape`; this update does not change form mounting.
- The runtime must respect the existing global pause state (`document.documentElement.dataset.motion === 'paused'`), `prefers-reduced-motion` and hidden tabs. Suspend automatic camera movement, decorative animation and continuous background work as appropriate; presets, headlights, camera reset and entering/exiting cinema must never clear the user's pause preference. Explicit camera and light changes may render a still frame while paused; reduced-motion must avoid animated preset transitions. Drag/zoom is deliberate user interaction, not permission to resume automatic motion.
- The controller has no `play` or `setPaused` method: observing motion preferences, visibility, resize and disposing Three.js/OrbitControls resources belong to the runtime, not a replacement video implementation. CSS must keep shade/grain from blocking cinema pointer input and provide a measurable canvas layout plus readable mouse/touch hints on mobile.

### Validation scope

Integrated assets/runtime/component QA: actual GLB readiness, desktop and 390px layouts without horizontal overflow, changing camera presets, camera rotation by pointer drag, headlight light changes, explicit camera changes while paused and Escape exit were checked in the browser. No video elements are present. Context-loss, missing-file fallback, system reduced motion and hidden-tab handling are implemented but have not been simulated during this browser QA.

Focused ESLint and production build passed. The full TypeScript check retains the existing errors in `useAdminCheck`, `Finances` and `propertyService`. The dynamic 3D chunk exceeds Vite's 500 kB warning threshold; it is loaded only on the login route.

The shared button sweep is adapted from cssbuttons-io/slippery-jellyfish-67 and the loading indicator from Shoh2008/yellow-dolphin-16 on Uiverse. Sources and MIT notices are shipped at `/licenses/uiverse.txt`.
