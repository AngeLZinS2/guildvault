import * as THREE from "three";
import { createWorkshopDetails } from "./createWorkshopDetails";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { Reflector } from "three/addons/objects/Reflector.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

export type GarageView = "hero" | "front" | "side";

export interface GarageSceneController {
  setView: (view: GarageView) => void;
  setHeadlights: (enabled: boolean) => void;
  setExplore: (enabled: boolean) => void;
  resetCamera: () => void;
  dispose: () => void;
}

function disposeObjects(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    const surfaces = Array.isArray(object.material) ? object.material : [object.material];
    surfaces.forEach((material) => {
      materials.add(material);
      Object.values(material).forEach((value) => { if (value instanceof THREE.Texture) textures.add(value); });
    });
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => {
    if (typeof ImageBitmap !== "undefined" && texture.image instanceof ImageBitmap) texture.image.close();
    texture.dispose();
  });
}

export function createGarageScene(host: HTMLDivElement, onReady: () => void, onError?: () => void): GarageSceneController {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 700 ? 1 : 1.35));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute("aria-label", "Garagem 3D: arraste para girar e use a roda do mouse para aproximar");
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x080e18);
  scene.fog = new THREE.Fog(0x101824, 16, 32);
  const camera = new THREE.PerspectiveCamera(47, 1, 0.1, 70);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enabled = false;
  controls.enablePan = false;
  controls.enableDamping = false;
  controls.minDistance = 4;
  controls.maxDistance = 12;
  controls.minAzimuthAngle = -Math.PI * 0.26;
  controls.maxAzimuthAngle = Math.PI * 0.48;
  controls.minPolarAngle = Math.PI * 0.38;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.6;
  controls.target.set(-2, 0.9, 1);
  RectAreaLightUniformsLib.init();
  const environment = new RoomEnvironment();
  const environmentGenerator = new THREE.PMREMGenerator(renderer);
  const environmentTarget = environmentGenerator.fromScene(environment, 0.04);
  scene.environment = environmentTarget.texture;
  scene.environmentIntensity = 0.5;
  environment.dispose();
  environmentGenerator.dispose();
  scene.add(new THREE.HemisphereLight(0xb9d9ff, 0x111b22, 0.2));
  const panel = (color: number, intensity: number, width: number, height: number, position: number[], target: number[]) => {
    const light = new THREE.RectAreaLight(color, intensity, width, height);
    light.position.set(position[0], position[1], position[2]);
    light.lookAt(target[0], target[1], target[2]);
    scene.add(light);
  };
  panel(0xdfeaff, 3, 5, 3, [-2, 5.3, 1], [-2, 0, 1]);
  panel(0x63e4cb, 3, 3, 2, [-7, 2.7, 1], [-2, 0.9, 1]);
  panel(0xff8142, 4, 3, 2, [5, 3, -3], [-2, 1, 1]);
  panel(0xc1d7ff, 2, 4, 2, [0, 3, 7], [-2, 1, 1]);
  const keyLight = new THREE.SpotLight(0xd7e4ff, 220, 25, Math.PI / 3.4, 0.85, 2);
  keyLight.position.set(-2, 5.4, 1);
  keyLight.target.position.set(-2, 0, 1);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.bias = -0.0001;
  keyLight.shadow.normalBias = 0.025;
  scene.add(keyLight, keyLight.target);
  const mirror = new Reflector(new THREE.PlaneGeometry(22, 22), { textureWidth: 512, textureHeight: 512, color: 0x777f87, multisample: 0 });
  mirror.rotation.x = -Math.PI / 2;
  mirror.position.y = 0.003;
  const mirrorMaterial = mirror.material as THREE.ShaderMaterial;
  mirrorMaterial.transparent = true;
  mirrorMaterial.depthWrite = false;
  mirrorMaterial.fragmentShader = mirrorMaterial.fragmentShader
    .replace("vec4 base = texture2DProj( tDiffuse, vUv );", "vec2 projected = vUv.xy / vUv.w; vec2 blur = vec2(0.003); vec4 base = texture2D(tDiffuse, projected) * 0.4 + texture2D(tDiffuse, projected + blur) * 0.15 + texture2D(tDiffuse, projected - blur) * 0.15 + texture2D(tDiffuse, projected + vec2(blur.x, -blur.y)) * 0.15 + texture2D(tDiffuse, projected + vec2(-blur.x, blur.y)) * 0.15;")
    .replace("gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );", "gl_FragColor = vec4( blendOverlay( base.rgb, color ), 0.32 );");
  scene.add(mirror);
  const sceneTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, sceneTarget);
  const renderPass = new RenderPass(scene, camera);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.22, 0.6, 1.5);
  const output = new OutputPass();
  composer.addPass(renderPass);
  composer.addPass(bloom);
  composer.addPass(output);
  const draco = new DRACOLoader().setDecoderPath("/draco/").setWorkerLimit(2);
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const headlights: THREE.SpotLight[] = [];
  const headlightMaterials: THREE.MeshStandardMaterial[] = [];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const desiredPosition = new THREE.Vector3();
  const desiredTarget = new THREE.Vector3(-2, 0.9, 1);
  const pointer = new THREE.Vector2();
  const renderPosition = new THREE.Vector3();
  let view: GarageView = "hero";
  let exploring = false;
  let headlightsEnabled = true;
  let ready = false;
  let disposed = false;
  let frame = 0;
  let lastFrame = 0;

  const motionAllowed = () => document.documentElement.dataset.motion !== "paused" && !reducedMotion.matches;
  const render = () => { if (!disposed && ready && !document.hidden) composer.render(); };
  const applyView = () => {
    const mobile = host.clientWidth < 700;
    if (view === "front") desiredPosition.set(-2, 1.5, mobile ? 10.5 : 8.2);
    else if (view === "side") desiredPosition.set(mobile ? 8 : 6.8, 2.3, 1.3);
    else desiredPosition.set(mobile ? 7.5 : 3.3, mobile ? 4 : 2.4, mobile ? 12 : 7.5);
    desiredTarget.set(-2, mobile ? 1 : 0.85, 1);
    desiredPosition.sub(desiredTarget).clampLength(4, 12).add(desiredTarget);
    controls.target.copy(desiredTarget);
    camera.filmOffset = exploring || mobile ? 0 : 5;
    camera.updateProjectionMatrix();
    if (!motionAllowed() || exploring || !ready) {
      camera.position.copy(desiredPosition);
      camera.lookAt(desiredTarget);
      controls.update();
      render();
    }
  };
  const schedule = () => {
    if (disposed || !ready || exploring || document.hidden || !motionAllowed() || frame) return;
    frame = requestAnimationFrame(animate);
  };
  const animate = (time: number) => {
    frame = 0;
    if (disposed || document.hidden || !motionAllowed()) return;
    if (time - lastFrame >= 1000 / 30) {
      lastFrame = time;
      if (!exploring) {
        renderPosition.copy(desiredPosition);
        renderPosition.x += pointer.x * 0.65;
        renderPosition.y += pointer.y * 0.18;
        camera.position.lerp(renderPosition, 0.09);
        camera.lookAt(desiredTarget);
      }
      render();
      if (camera.position.distanceToSquared(renderPosition) < 0.00001) return;
    }
    schedule();
  };
  const synchronizeMotion = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    pointer.set(0, 0);
    render();
    schedule();
  };
  const resize = () => {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    camera.aspect = width / height;
    camera.fov = width < 700 ? 52 : 47;
    camera.updateProjectionMatrix();
    if (!exploring) applyView();
    render();
  };
  const pointerMove = (event: PointerEvent) => {
    if (exploring || !motionAllowed() || event.pointerType !== "mouse") return;
    pointer.set((event.clientX / window.innerWidth - 0.5) * 2, (0.5 - event.clientY / window.innerHeight) * 2);
    schedule();
  };
  const contextLost = (event: Event) => {
    event.preventDefault();
    cancelAnimationFrame(frame);
    frame = 0;
    ready = false;
    if (!disposed) onError?.();
  };
  const resizeObserver = new ResizeObserver(resize);
  const motionObserver = new MutationObserver(synchronizeMotion);
  resizeObserver.observe(host);
  motionObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
  reducedMotion.addEventListener("change", synchronizeMotion);
  document.addEventListener("visibilitychange", synchronizeMotion);
  window.addEventListener("pointermove", pointerMove, { passive: true });
  renderer.domElement.addEventListener("webglcontextlost", contextLost);
  controls.addEventListener("change", render);
  resize();
  applyView();
  camera.position.copy(desiredPosition);
  camera.lookAt(desiredTarget);

  const updateHeadlights = () => {
    headlights.forEach((light) => { light.visible = headlightsEnabled; });
    headlightMaterials.forEach((material) => { material.emissiveIntensity = headlightsEnabled ? 4 : 0; });
    render();
  };
  void loader.loadAsync("/models/guildvault-garage-v1.glb").then(async (gltf) => {
    if (disposed) { disposeObjects(gltf.scene); return; }
    scene.add(gltf.scene);
    const audi = await loader.loadAsync("/models/guildvault-audi-r8.glb");
    if (disposed) { disposeObjects(audi.scene); return; }
    const previousCar = gltf.scene.getObjectByName("CarConcept");
    if (previousCar) { previousCar.removeFromParent(); disposeObjects(previousCar); }
    audi.scene.name = "GuildVaultAudiR8";
    audi.scene.position.set(-2, 0.002, 1);
    gltf.scene.add(audi.scene);
    gltf.scene.add(createWorkshopDetails());
    gltf.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.receiveShadow = true;
      object.castShadow = object.name !== "GarageFloor" && object.name !== "GarageShell";
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        if (!(material instanceof THREE.MeshStandardMaterial)) return;
        if (material.name === "Headlight") headlightMaterials.push(material);
        if (material.name === "Glass") material.envMapIntensity = 1.3;
      });
    });
    const lightMesh = gltf.scene.getObjectByName("BodyHeadlights");
    {
      const center = lightMesh ? new THREE.Box3().setFromObject(lightMesh).getCenter(new THREE.Vector3()) : new THREE.Vector3(-2, 0.65, 3.1);
      for (const side of [-1, 1]) {
        const light = new THREE.SpotLight(0xdaf1ff, 45, 12, 0.4, 0.65, 2);
        light.position.set(center.x + side * 0.85, center.y, center.z + 0.08);
        light.target.position.set(light.position.x, 0, light.position.z + 8);
        headlights.push(light);
        scene.add(light, light.target);
      }
    }
    await renderer.compileAsync(scene, camera);
    if (disposed) return;
    ready = true;
    updateHeadlights();
    render();
    onReady();
    schedule();
  }).catch(() => { if (!disposed) onError?.(); });

  return {
    setView(next) { view = next; applyView(); schedule(); },
    setHeadlights(enabled) { headlightsEnabled = enabled; updateHeadlights(); },
    setExplore(enabled) {
      exploring = enabled;
      controls.enabled = enabled;
      camera.filmOffset = enabled || host.clientWidth < 700 ? 0 : 5;
      camera.updateProjectionMatrix();
      cancelAnimationFrame(frame);
      frame = 0;
      renderer.domElement.style.touchAction = enabled ? "none" : "auto";
      if (!enabled) applyView();
      render();
      schedule();
    },
    resetCamera() { pointer.set(0, 0); applyView(); camera.position.copy(desiredPosition); controls.update(); render(); },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      motionObserver.disconnect();
      reducedMotion.removeEventListener("change", synchronizeMotion);
      document.removeEventListener("visibilitychange", synchronizeMotion);
      window.removeEventListener("pointermove", pointerMove);
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      controls.dispose();
      draco.dispose();
      keyLight.shadow.map?.dispose();
      mirror.getRenderTarget().dispose();
      disposeObjects(scene);
      environmentTarget.dispose();
      bloom.dispose();
      output.dispose();
      composer.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
