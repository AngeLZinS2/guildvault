import * as THREE from "three";

export type CityView = "boulevard" | "skyline";

export function createCityScene(host: HTMLDivElement) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 700 ? 1 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xc47783, 48, 145);
  const camera = new THREE.PerspectiveCamera(48, 1, .1, 240);
  const target = new THREE.Vector3(-3, 3, -13);
  const desiredPosition = new THREE.Vector3(15, 7, 27);
  camera.position.copy(desiredPosition);
  camera.lookAt(target);
  const hemisphere = new THREE.HemisphereLight(0xffc8b0, 0x263d50, 2.5);
  const sunlight = new THREE.DirectionalLight(0xffbc8a, 3.6);
  sunlight.position.set(-30, 26, -25);
  const rim = new THREE.DirectionalLight(0x82e5f7, 2);
  rim.position.set(10, 10, 20);
  scene.add(hemisphere, sunlight, rim);

  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const material = (color: number, roughness = .7, metalness = .05) => {
    const result = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    materials.add(result);
    return result;
  };
  const glowMaterial = (color: number) => {
    const result = new THREE.MeshBasicMaterial({ color });
    materials.add(result);
    return result;
  };
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  geometries.add(boxGeometry);
  const box = (parent: THREE.Object3D, size: number[], position: number[], surface: THREE.Material) => {
    const mesh = new THREE.Mesh(boxGeometry, surface);
    mesh.scale.set(size[0], size[1], size[2]);
    mesh.position.set(position[0], position[1], position[2]);
    parent.add(mesh);
    return mesh;
  };
  const asphalt = material(0x192b39, .38);
  const sidewalk = material(0x55717a);
  const concrete = material(0x345967);
  const trunkMaterial = material(0x574345);
  const leafMaterial = material(0x174d46, .8);
  leafMaterial.side = THREE.DoubleSide;
  const yellow = glowMaterial(0xffda83);
  const cyan = glowMaterial(0x72e9e1);
  const pink = glowMaterial(0xff77b0);
  const darkGlass = material(0x12313e, .1, .65);
  const warmWindow = glowMaterial(0xffbd83);
  const roadMarking = material(0xb7c4c1);
  const crosswalk = material(0xc9b9a2);

  box(scene, [260, .1, 200], [0, -.25, -45], material(0x243d44));
  box(scene, [19, .1, 175], [0, -.1, -47], asphalt);
  box(scene, [4, .25, 175], [-11.5, -.05, -47], sidewalk);
  box(scene, [4, .25, 175], [11.5, -.05, -47], sidewalk);
  for (let index = 0; index < 34; index++) {
    box(scene, [.12, .025, 2.2], [-.18, -.025, 20 - index * 4.5], yellow);
    box(scene, [.12, .025, 2.2], [.18, -.025, 20 - index * 4.5], yellow);
    for (const side of [-1, 1]) box(scene, [.08, .025, 2.2], [side * 5, -.025, 20 - index * 4.5], roadMarking);
  }
  for (let stripe = 0; stripe < 8; stripe++) box(scene, [1.5, .03, 3], [-7 + stripe * 2, -.01, -7], crosswalk);

  const buildingMaterials = [material(0x304c61), material(0x486879), material(0x697880), material(0x3e596b)];
  const windowGeometry = new THREE.BoxGeometry(.35, .62, .045);
  geometries.add(windowGeometry);
  const windowMesh = new THREE.InstancedMesh(windowGeometry, warmWindow, 2500);
  let windowCount = 0;
  const transform = new THREE.Object3D();
  for (let index = 0; index < 46; index++) {
    const side = index % 2 === 0 ? -1 : 1;
    const row = Math.floor(index / 2);
    const width = 4 + (index * 7 % 5);
    const height = 7 + (index * 13 % 26);
    const depth = 5 + (index * 3 % 6);
    const horizontal = side * (18 + (row % 3) * 9);
    const distance = -26 - row * 4.5;
    box(scene, [width, height, depth], [horizontal, height / 2, distance], buildingMaterials[index % 4]);
    box(scene, [width + .2, .25, depth + .2], [horizontal, height + .15, distance], concrete);
    if (index % 4 === 0) box(scene, [width * .45, height * .12, depth * .5], [horizontal, height * 1.06, distance], buildingMaterials[index % 4]);
    for (let floor = 1; floor < Math.min(height, 25); floor += 1.5) {
      for (let column = .8; column < width - .4; column += 1.25) {
        if ((index + Math.floor(floor) + Math.floor(column)) % 4 === 0) continue;
        transform.position.set(horizontal - width / 2 + column, floor, distance + depth / 2 + .03);
        transform.updateMatrix();
        windowMesh.setMatrixAt(windowCount++, transform.matrix);
      }
    }
    if (index % 6 === 0) box(scene, [width, .1, .13], [horizontal, height - .4, distance + depth / 2 + .1], index % 12 === 0 ? pink : cyan);
  }
  windowMesh.count = windowCount;
  windowMesh.instanceMatrix.needsUpdate = true;
  scene.add(windowMesh);

  const tower = new THREE.Group();
  tower.position.set(-6, 0, -85);
  box(tower, [7, 44, 7], [0, 22, 0], material(0x4b667d, .3, .3));
  box(tower, [5.5, 8, 5.5], [0, 47, 0], material(0x68849a, .3));
  box(tower, [.16, 10, .16], [0, 56, 0], yellow);
  for (let floor = 3; floor < 44; floor += 1.6) box(tower, [7.05, .075, 7.05], [0, floor, 0], cyan);
  scene.add(tower);

  const palmCrowns: THREE.Group[] = [];
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, 0);
  leafShape.quadraticCurveTo(1.3, .75, 5.5, -.45);
  leafShape.quadraticCurveTo(1.7, -.2, 0, -.15);
  const leafGeometry = new THREE.ShapeGeometry(leafShape, 8);
  geometries.add(leafGeometry);
  for (let index = 0; index < 20; index++) {
    const side = index % 2 === 0 ? -1 : 1;
    const distance = 13 - Math.floor(index / 2) * 10;
    const height = 8.5 + index % 3;
    const tree = new THREE.Group();
    tree.position.set(side * 12, 0, distance);
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(.2 * side, height * .5, 0), new THREE.Vector3(.8 * side, height, .3)]);
    const trunkGeometry = new THREE.TubeGeometry(curve, 10, .2, 6, false);
    geometries.add(trunkGeometry);
    tree.add(new THREE.Mesh(trunkGeometry, trunkMaterial));
    const crown = new THREE.Group();
    crown.position.set(.8 * side, height, .3);
    for (let leaf = 0; leaf < 9; leaf++) {
      const frond = new THREE.Mesh(leafGeometry, leafMaterial);
      frond.rotation.y = leaf * Math.PI * 2 / 9;
      frond.rotation.z = .1 + (leaf % 3) * .11;
      crown.add(frond);
    }
    tree.add(crown);
    palmCrowns.push(crown);
    scene.add(tree);
  }

  const lightPoleGeometry = new THREE.CylinderGeometry(.06, .1, 6, 6);
  geometries.add(lightPoleGeometry);
  for (let index = 0; index < 16; index++) {
    const side = index % 2 === 0 ? -1 : 1;
    const distance = 8 - Math.floor(index / 2) * 14;
    const pole = new THREE.Mesh(lightPoleGeometry, concrete);
    pole.position.set(side * 10, 3, distance);
    scene.add(pole);
    box(scene, [2.2, .13, .15], [side * 9, 5.9, distance], concrete);
    box(scene, [.7, .08, .35], [side * 8, 5.85, distance], warmWindow);
  }

  const car = new THREE.Group();
  car.position.set(3, .45, 10);
  car.scale.setScalar(1.45);
  car.rotation.y = -.38;
  const paint = material(0xe85b68, .22, .55);
  const trim = material(0x17262e, .3, .25);
  const bodyShape = new THREE.Shape();
  bodyShape.moveTo(-1.1, -2.35);
  bodyShape.quadraticCurveTo(-1.3, -2.35, -1.3, -2.05);
  bodyShape.lineTo(-1.3, 1.95);
  bodyShape.quadraticCurveTo(-1.3, 2.35, -.95, 2.35);
  bodyShape.lineTo(.95, 2.35);
  bodyShape.quadraticCurveTo(1.3, 2.35, 1.3, 1.95);
  bodyShape.lineTo(1.3, -2.05);
  bodyShape.quadraticCurveTo(1.3, -2.35, 1.1, -2.35);
  bodyShape.closePath();
  const bodyGeometry = new THREE.ExtrudeGeometry(bodyShape, { depth: .48, bevelEnabled: true, bevelThickness: .09, bevelSize: .12, bevelSegments: 3, steps: 1, curveSegments: 6 });
  bodyGeometry.rotateX(-Math.PI / 2);
  geometries.add(bodyGeometry);
  const body = new THREE.Mesh(bodyGeometry, paint);
  body.position.y = .23;
  car.add(body);
  box(car, [2.45, .17, 4.9], [0, .16, 0], trim);
  box(car, [2.12, .16, 1.5], [0, .77, -1.4], paint);
  const cabinGeometry = new THREE.BufferGeometry();
  cabinGeometry.setAttribute("position", new THREE.Float32BufferAttribute([
    -.94, .77, -.95, .94, .77, -.95, .94, .77, 1.05, -.94, .77, 1.05,
    -.8, 1.18, -.35, .8, 1.18, -.35, .8, 1.18, .68, -.8, 1.18, .68,
  ], 3));
  cabinGeometry.setIndex([0, 4, 5, 0, 5, 1, 1, 5, 6, 1, 6, 2, 2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0, 4, 7, 6, 4, 6, 5]);
  cabinGeometry.computeVertexNormals();
  geometries.add(cabinGeometry);
  car.add(new THREE.Mesh(cabinGeometry, darkGlass));
  box(car, [1.7, .055, 1.06], [0, 1.2, .17], paint);
  for (const side of [-1, 1]) box(car, [.16, .035, 1.6], [side * .22, .87, -1.45], material(0xf0d9b2, .4));
  box(car, [1.9, .13, .12], [0, 1.05, 2.1], trim);
  for (const side of [-1, 1]) {
    box(car, [.5, .15, .08], [side * .8, .5, -2.43], glowMaterial(0xffeecc));
    box(car, [.65, .12, .08], [side * .75, .55, 2.43], glowMaterial(0xff234b));
    box(car, [.26, .15, .4], [side * 1.23, .95, -.35], paint);
    box(car, [.04, .055, .3], [side * 1.22, .64, .5], cyan);
  }
  const wheelGeometry = new THREE.CylinderGeometry(.48, .48, .28, 18);
  const hubGeometry = new THREE.CylinderGeometry(.26, .26, .295, 12);
  geometries.add(wheelGeometry);
  geometries.add(hubGeometry);
  for (const side of [-1, 1]) {
    for (const distance of [-1.55, 1.5]) {
      const wheel = new THREE.Mesh(wheelGeometry, trim);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(side * 1.14, .25, distance);
      const hub = new THREE.Mesh(hubGeometry, material(0xb3d0d2, .15, .8));
      hub.rotation.z = Math.PI / 2;
      hub.position.copy(wheel.position);
      car.add(wheel, hub);
    }
  }
  const underglow = new THREE.PointLight(0xff56ac, 12, 8);
  underglow.position.set(0, .05, .4);
  car.add(underglow);
  scene.add(car);

  const sunGeometry = new THREE.SphereGeometry(12, 32, 20);
  geometries.add(sunGeometry);
  const sunSurface = glowMaterial(0xffcf87);
  sunSurface.fog = false;
  const sun = new THREE.Mesh(sunGeometry, sunSurface);
  sun.position.set(-33, 25, -125);
  scene.add(sun);

  const billboardCanvas = document.createElement("canvas");
  billboardCanvas.width = 768;
  billboardCanvas.height = 256;
  const context = billboardCanvas.getContext("2d");
  if (context) {
    context.fillStyle = "#132b37";
    context.fillRect(0, 0, 768, 256);
    context.strokeStyle = "#ffae85";
    context.lineWidth = 14;
    context.strokeRect(12, 12, 744, 232);
    context.textAlign = "center";
    context.fillStyle = "#ffecc9";
    context.font = "bold 76px sans-serif";
    context.fillText("LOS SANTOS", 384, 115);
    context.font = "22px sans-serif";
    context.fillStyle = "#9ce7cd";
    context.fillText("YOUR CITY. YOUR STORY.", 384, 178);
  }
  const billboardTexture = new THREE.CanvasTexture(billboardCanvas);
  billboardTexture.colorSpace = THREE.SRGBColorSpace;
  textures.add(billboardTexture);
  const billboardMaterial = new THREE.MeshBasicMaterial({ map: billboardTexture });
  materials.add(billboardMaterial);
  box(scene, [8, 2.7, .25], [-15, 7, -15], billboardMaterial);
  box(scene, [.3, 7, .3], [-17, 3.5, -15], concrete);
  box(scene, [.3, 7, .3], [-13, 3.5, -15], concrete);

  const traffic: THREE.Group[] = [];
  for (let index = 0; index < 7; index++) {
    const vehicle = new THREE.Group();
    box(vehicle, [1.6, .55, 3], [0, .4, 0], material(index % 2 ? 0xd6b4aa : 0x618da0, .3, .4));
    box(vehicle, [1.3, .45, 1.3], [0, .8, 0], darkGlass);
    for (const side of [-1, 1]) box(vehicle, [.3, .1, .1], [side * .5, .5, index % 2 ? 1.55 : -1.55], index % 2 ? pink : yellow);
    traffic.push(vehicle);
    scene.add(vehicle);
  }

  let disposed = false;
  let paused = false;
  let visible = !document.hidden;
  let frame = 0;
  let lastTimestamp = 0;
  let elapsed = 0;
  let lastRender = 0;
  let view: CityView = "boulevard";
  const pointer = new THREE.Vector2();
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const draw = () => {
    const mobile = host.clientWidth < 700;
    if (view === "boulevard") {
      desiredPosition.set(mobile ? 10 : 15, mobile ? 8 : 7, mobile ? 33 : 27);
      target.set(-3, 3, -13);
    } else {
      desiredPosition.set(mobile ? 23 : 29, 22, mobile ? 35 : 22);
      target.set(-2, 9, -36);
    }
    if (!paused && !reduced.matches) {
      desiredPosition.x += pointer.x * 2 + Math.sin(elapsed * .12) * .8;
      desiredPosition.y += pointer.y * .75;
    }
    camera.position.lerp(desiredPosition, paused || reduced.matches ? 1 : .045);
    camera.lookAt(target);
    palmCrowns.forEach((crown, index) => { crown.rotation.z = Math.sin(elapsed * .7 + index) * .028; });
    car.position.y = .45 + Math.sin(elapsed * 2.2) * .015;
    traffic.forEach((vehicle, index) => {
      vehicle.position.set(index % 2 ? 3 : -6, .05, -120 + ((elapsed * (index % 2 ? -3 : 3) + index * 18 + 500) % 128));
    });
    renderer.render(scene, camera);
  };
  const animate = (timestamp: number) => {
    frame = 0;
    if (disposed || paused || reduced.matches || !visible) return;
    if (timestamp - lastRender >= 32) {
      elapsed += Math.min((timestamp - (lastTimestamp || timestamp)) / 1000, .05);
      lastTimestamp = timestamp;
      lastRender = timestamp;
      draw();
    }
    frame = requestAnimationFrame(animate);
  };
  const syncMotion = () => {
    paused = document.documentElement.dataset.motion === "paused";
    visible = !document.hidden;
    cancelAnimationFrame(frame);
    lastTimestamp = 0;
    draw();
    if (!paused && !reduced.matches && visible) frame = requestAnimationFrame(animate);
  };
  const resize = () => {
    if (disposed) return;
    renderer.setSize(host.clientWidth, host.clientHeight);
    camera.aspect = host.clientWidth / Math.max(host.clientHeight, 1);
    camera.updateProjectionMatrix();
    draw();
  };
  const move = (event: PointerEvent) => {
    pointer.set((event.clientX / window.innerWidth - .5) * 2, (.5 - event.clientY / window.innerHeight) * 2);
  };
  const resetPointer = () => pointer.set(0, 0);
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  const motionObserver = new MutationObserver(syncMotion);
  motionObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
  window.addEventListener("pointermove", move, { passive: true });
  document.addEventListener("pointerleave", resetPointer);
  document.addEventListener("visibilitychange", syncMotion);
  reduced.addEventListener("change", syncMotion);
  resize();
  syncMotion();

  return {
    setNight(night: boolean) {
      scene.fog = new THREE.Fog(night ? 0x152b49 : 0xc47783, 48, 145);
      hemisphere.color.set(night ? 0x7bafff : 0xffc8b0);
      hemisphere.intensity = night ? 1.1 : 2.5;
      sunlight.color.set(night ? 0x7c9fee : 0xffbc8a);
      sunlight.intensity = night ? .7 : 3.6;
      sunSurface.color.set(night ? 0xd2e4f4 : 0xffcf87);
      renderer.toneMappingExposure = night ? 1.1 : 1.35;
      draw();
    },
    setView(nextView: CityView) { view = nextView; draw(); },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      motionObserver.disconnect();
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", resetPointer);
      document.removeEventListener("visibilitychange", syncMotion);
      reduced.removeEventListener("change", syncMotion);
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(surface => surface.dispose());
      textures.forEach(texture => texture.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
