import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createDriveWorld } from "./createDriveWorld";
import { newDriveState, stepDrive, type DriveInput } from "./drivePhysics";
export type { DriveInput } from "./drivePhysics";
export interface DriveTelemetry { speed: number; distance: number; x: number; z: number }
export interface DriveSceneController { setInput: (input: DriveInput, pressed: boolean) => void; reset: () => void; dispose: () => void }

function disposeTree(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => {
      materials.add(material);
      Object.values(material).forEach(value => { if (value instanceof THREE.Texture) textures.add(value); });
    });
  });
  geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose());
  textures.forEach(item => { if (typeof ImageBitmap !== "undefined" && item.image instanceof ImageBitmap) item.image.close(); item.dispose(); });
}

export function createDriveScene(host: HTMLDivElement, onReady: () => void, onError: () => void, onTelemetry: (data: DriveTelemetry) => void): DriveSceneController {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 700 ? 1 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute("aria-label", "Circuito urbano 3D. Dirija com WASD ou setas; espaço freia e R reinicia.");
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xb9cddd); scene.fog = new THREE.Fog(0xb9cddd, 65, 210);
  const camera = new THREE.PerspectiveCamera(54, 1, 0.15, 280);
  const world = createDriveWorld(); scene.add(world.group);
  scene.add(new THREE.HemisphereLight(0xd9eeff, 0x997256, 2.2));
  const sun = new THREE.DirectionalLight(0xffe0af, 3.6); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -28; sun.shadow.camera.right = 28;
  sun.shadow.camera.top = 28; sun.shadow.camera.bottom = -28; sun.shadow.camera.near = 1; sun.shadow.camera.far = 130;
  sun.shadow.normalBias = 0.06; sun.shadow.bias = -0.0002; scene.add(sun, sun.target);
  const room = new RoomEnvironment(); const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(room, 0.04); scene.environment = environment.texture; scene.environmentIntensity = 0.65;
  room.dispose(); pmrem.dispose();
  const vehicle = new THREE.Group(); scene.add(vehicle);
  const draco = new DRACOLoader().setDecoderPath("/draco/").setWorkerLimit(1);
  let loadedScene: THREE.Object3D | undefined;
  let disposed = false, failed = false, ready = false, raf = 0, lastTime = 0, accumulator = 0, reportTimer = 0;
  let state = newDriveState();
  const keyboard = new Set<DriveInput>(); const touch = new Set<DriveInput>(); const inputs = new Set<DriveInput>();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const desiredCamera = new THREE.Vector3(), lookAt = new THREE.Vector3();
  const reset = () => {
    state = newDriveState(); keyboard.clear(); touch.clear(); accumulator = 0;
    vehicle.position.set(0, 0.05, 0); vehicle.rotation.y = 0;
    camera.position.set(0, 4.7, -9); camera.lookAt(0, 1, 4);
    onTelemetry({ speed: 0, distance: 0, x: 0, z: 0 });
  };
  reset();
  const fail = () => { failed = true; cancelAnimationFrame(raf); onError(); };
  new GLTFLoader().setDRACOLoader(draco).load("/models/guildvault-garage-v1.glb", gltf => {
    if (disposed || failed) { disposeTree(gltf.scene); return; }
    loadedScene = gltf.scene;
    const car = gltf.scene.getObjectByName("CarConcept");
    if (!car) { fail(); return; }
    vehicle.add(car); car.position.set(0, 0, 0); car.updateMatrixWorld(true);
    let bounds = new THREE.Box3().setFromObject(car);
    const front = car.getObjectByName("BodyHeadlights");
    if (front && new THREE.Box3().setFromObject(front).getCenter(new THREE.Vector3()).z < bounds.getCenter(new THREE.Vector3()).z) {
      car.rotation.y += Math.PI; car.updateMatrixWorld(true); bounds = new THREE.Box3().setFromObject(car);
    }
    const width = bounds.max.x - bounds.min.x;
    car.scale.multiplyScalar(2 / Math.max(width, 0.01)); car.updateMatrixWorld(true);
    bounds = new THREE.Box3().setFromObject(car);
    car.position.x -= (bounds.min.x + bounds.max.x) / 2;
    car.position.z -= (bounds.min.z + bounds.max.z) / 2;
    car.position.y -= bounds.min.y;
    car.traverse(object => { if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; } });
    ready = true; onReady();
  }, undefined, () => { if (!disposed) fail(); });
  const resize = () => { const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight); renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); };
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  const keyMap: Record<string, DriveInput> = { KeyW: "forward", ArrowUp: "forward", KeyS: "backward", ArrowDown: "backward", KeyA: "left", ArrowLeft: "left", KeyD: "right", ArrowRight: "right", Space: "brake" };
  const heldCodes = new Set<string>();
  const rebuildKeyboard = () => { keyboard.clear(); heldCodes.forEach(code => { if (keyMap[code]) keyboard.add(keyMap[code]); }); };
  const keydown = (event: KeyboardEvent) => {
    if (event.target instanceof Element && event.target.closest("input,textarea,select,button,a,[contenteditable=true],[role=button]")) return;
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    if (event.code === "KeyR") { event.preventDefault(); heldCodes.clear(); reset(); return; }
    if (keyMap[event.code]) { event.preventDefault(); heldCodes.add(event.code); rebuildKeyboard(); }
  };
  const keyup = (event: KeyboardEvent) => { heldCodes.delete(event.code); rebuildKeyboard(); };
  const clear = () => { heldCodes.clear(); keyboard.clear(); touch.clear(); state.speed = 0; lastTime = 0; accumulator = 0; };
  const contextLost = (event: Event) => { event.preventDefault(); clear(); fail(); };
  window.addEventListener("keydown", keydown); window.addEventListener("keyup", keyup); window.addEventListener("blur", clear);
  document.addEventListener("visibilitychange", clear); renderer.domElement.addEventListener("webglcontextlost", contextLost);
  const animate = (time: number) => {
    if (disposed || failed) return;
    raf = requestAnimationFrame(animate);
    if (document.hidden) { lastTime = 0; return; }
    const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0; lastTime = time;
    inputs.clear(); keyboard.forEach(key => inputs.add(key)); touch.forEach(key => inputs.add(key));
    accumulator += dt;
    while (accumulator >= 1 / 120) { if (ready) stepDrive(state, inputs, world.colliders, 1 / 120); accumulator -= 1 / 120; }
    vehicle.position.set(state.x, 0.05, state.z); vehicle.rotation.y = state.heading;
    desiredCamera.set(state.x - Math.sin(state.heading) * 9, 4.7, state.z - Math.cos(state.heading) * 9);
    // Pull the camera forward before its path enters a solid block.
    for (let step = 1; step <= 18; step++) {
      const t = step / 18;
      const x = state.x + (desiredCamera.x - state.x) * t;
      const z = state.z + (desiredCamera.z - state.z) * t;
      if (world.colliders.some(box => x > box.minX - .3 && x < box.maxX + .3 && z > box.minZ - .3 && z < box.maxZ + .3)) {
        desiredCamera.x = state.x + (desiredCamera.x - state.x) * Math.max(.2, t - .12);
        desiredCamera.z = state.z + (desiredCamera.z - state.z) * Math.max(.2, t - .12);
        camera.position.copy(desiredCamera);
        break;
      }
    }
    camera.position.lerp(desiredCamera, reducedMotion ? 1 : 1 - Math.exp(-7 * dt));
    lookAt.set(state.x + Math.sin(state.heading) * 4, 1, state.z + Math.cos(state.heading) * 4); camera.lookAt(lookAt);
    sun.position.set(state.x - 24, 48, state.z - 18); sun.target.position.set(state.x, 0, state.z);
    reportTimer += dt; if (reportTimer >= 0.12) { onTelemetry({ speed: Math.abs(state.speed) * 3.6, distance: state.distance, x: state.x, z: state.z }); reportTimer = 0; }
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(animate);
  return { setInput: (input, pressed) => { if (pressed) touch.add(input); else touch.delete(input); }, reset: () => { heldCodes.clear(); reset(); }, dispose: () => {
    disposed = true; cancelAnimationFrame(raf); observer.disconnect(); clear();
    window.removeEventListener("keydown", keydown); window.removeEventListener("keyup", keyup); window.removeEventListener("blur", clear);
    document.removeEventListener("visibilitychange", clear); renderer.domElement.removeEventListener("webglcontextlost", contextLost);
    if (loadedScene) scene.add(loadedScene);
    disposeTree(scene); environment.dispose(); sun.shadow.dispose(); draco.dispose(); renderer.dispose(); renderer.domElement.remove();
  } };
}

