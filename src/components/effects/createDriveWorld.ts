import * as THREE from "three";

export interface DriveCollider { minX: number; maxX: number; minZ: number; maxZ: number }

/** Original, procedural coastal district. Coordinates and collision boxes are in metres. */
export function createDriveWorld(): { group: THREE.Group; colliders: DriveCollider[] } {
  const group = new THREE.Group();
  group.name = "GuildVault — Orla Vault";
  const colliders: DriveCollider[] = [];
  const stone = new THREE.MeshStandardMaterial({ color: 0xb1a496, roughness: 0.88 });
  const asphalt = new THREE.MeshStandardMaterial({ color: 0x303944, roughness: 0.94 });
  const roadCanvas = document.createElement("canvas"); roadCanvas.width = roadCanvas.height = 256;
  const roadContext = roadCanvas.getContext("2d");
  if (roadContext) {
    const pixels = roadContext.createImageData(256, 256);
    let seed = 731;
    for (let i = 0; i < pixels.data.length; i += 4) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const shade = 155 + seed % 45;
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = shade; pixels.data[i + 3] = 255;
    }
    roadContext.putImageData(pixels, 0, 0);
    const roadTexture = new THREE.CanvasTexture(roadCanvas);
    roadTexture.wrapS = roadTexture.wrapT = THREE.RepeatWrapping; roadTexture.repeat.set(45, 50); roadTexture.colorSpace = THREE.SRGBColorSpace;
    asphalt.map = roadTexture;
  }
  const concrete = new THREE.MeshStandardMaterial({ color: 0x747f85, roughness: 0.9 });
  const terracotta = new THREE.MeshStandardMaterial({ color: 0xae7564, roughness: 0.85 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x465f72, roughness: 0.64 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x243d50, roughness: 0.24, metalness: 0 });
  const warm = new THREE.MeshStandardMaterial({ color: 0xfbd6a0, emissive: 0xffb769, emissiveIntensity: 0.85, roughness: 0.5 });
  const mint = new THREE.MeshStandardMaterial({ color: 0x91ded2, emissive: 0x44a899, emissiveIntensity: 0.75, roughness: 0.55 });
  const paint = new THREE.MeshStandardMaterial({ color: 0xe7cf9c, roughness: 0.9 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x56606a, metalness: 1, roughness: 0.55 });
  const bark = new THREE.MeshStandardMaterial({ color: 0x665644, roughness: 1 });
  const leaves = new THREE.MeshStandardMaterial({ color: 0x335e51, roughness: 0.85, side: THREE.DoubleSide });
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  type Batch = { geometry: THREE.BufferGeometry; material: THREE.Material; matrices: THREE.Matrix4[] };
  const batches = new Map<string, Batch>();
  const dummy = new THREE.Object3D();
  function instance(key: string, geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number, ry = 0, rz = 0) {
    let batch = batches.get(key);
    if (!batch) { batch = { geometry, material, matrices: [] }; batches.set(key, batch); }
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, ry, rz);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();
    batch.matrices.push(dummy.matrix.clone());
  }
  function box(key: string, material: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number) {
    instance(key, boxGeometry, material, x, y, z, sx, sy, sz);
  }
  function obstacle(x: number, z: number, width: number, depth: number) {
    colliders.push({ minX: x - width / 2, maxX: x + width / 2, minZ: z - depth / 2, maxZ: z + depth / 2 });
  }
  box("ground", asphalt, -2, -0.16, 78, 184, 0.3, 208);
  // Continuous avenues, with cross streets at 20, 80, 140 and a northern turning loop.
  for (const x of [-60, 0, 60]) {
    for (let z = -12; z < 172; z += 7) {
      if ([20, 80, 140, 170].some(cross => Math.abs(z - cross) < 10)) continue;
      box("lane", paint, x - 0.16, 0.013, z, 0.1, 0.025, 3);
      box("lane", paint, x + 0.16, 0.013, z, 0.1, 0.025, 3);
    }
  }
  for (const z of [20, 80, 140, 170]) {
    for (let x = -83; x < 82; x += 7) {
      if ([-60, 0, 60].some(avenue => Math.abs(x - avenue) < 10)) continue;
      box("lane", paint, x, 0.013, z, 3, 0.025, 0.14);
    }
    for (const x of [-60, 0, 60]) {
      for (const side of [-1, 1]) for (let stripe = -3; stripe <= 3; stripe++) {
        box("crosswalk", paint, x + stripe * 1.25, 0.015, z + side * 10, 0.55, 0.03, 2.6);
      }
    }
  }
  // Sidewalk blocks carry collision volumes, keeping the full road grid clear.
  for (const x of [-30, 30]) for (const z of [50, 110]) {
    box("sidewalk", concrete, x, 0.12, z, 42, 0.26, 42);
    obstacle(x, z, 40, 40);
    for (const offset of [-10, 10]) {
      const h = 10 + ((x + z + offset + 200) % 23);
      const bx = x + offset;
      const bz = z + (offset < 0 ? -3 : 3);
      const mat = x < 0 ? terracotta : stone;
      box(x < 0 ? "stucco" : "limestone", mat, bx, h / 2 + 0.3, bz, 16, h, 29);
      box("roof", concrete, bx, h + 0.6, bz, 16.6, 0.65, 29.6);
      box("roof-unit", metal, bx - 2, h + 1.3, bz + 6, 4, 1.5, 3);
      for (let level = 2; level < h - 1; level += 3.2) {
        for (let w = -5; w <= 5; w += 3.3) {
          for (const side of [-1, 1]) {
            const lit = Math.floor(level + w + z + offset) % 4 === 0;
            box(lit ? "windows-lit" : "windows-dark", lit ? warm : glass, bx + w, level, bz + side * 14.53, 1.8, 1.5, 0.05);
          }
        }
        for (let w = -10; w <= 10; w += 4) for (const side of [-1, 1]) {
          box("windows-dark", glass, bx + side * 8.03, level, bz + w, 0.05, 1.5, 2);
        }
      }
      box("shopfront", glass, bx, 1.8, bz - 14.55, 12, 2.7, 0.08);
      box("awning", x < 0 ? terracotta : blue, bx, 3.4, bz - 15.1, 13, 0.25, 1.6);
    }
  }
  // Low promenade buildings at the far end leave a visible return route.
  for (const x of [-30, 30]) {
    box("sidewalk", concrete, x, 0.12, 155, 42, 0.26, 12);
    box("limestone", stone, x, 2.7, 155, 32, 5.2, 9);
    box("trim", mint, x, 5.25, 150.45, 31, 0.18, 0.12);
    box("shopfront", glass, x, 2.2, 150.44, 28, 3.3, 0.08);
    obstacle(x, 155, 42, 12);
  }
  // Entrance pavilion behind spawn. Door opening remains clear at x=0.
  for (const x of [-8, 8]) {
    box("garage", blue, x, 3.8, -9, 7, 7.6, 13);
    obstacle(x, -9, 7, 13);
  }
  box("garage", blue, 0, 7.4, -9, 23, 1.2, 13);
  box("trim", mint, 0, 6.55, -2.44, 22, 0.15, 0.1);
  box("garage", blue, 0, 3, -15.5, 23, 6, 0.4);
  obstacle(0, -15.5, 23, 0.4);

  const trunkGeometry = new THREE.CylinderGeometry(0.15, 0.26, 1, 7);
  const frondGeometry = new THREE.BufferGeometry();
  const frondVertices: number[] = [];
  for (let section = 0; section < 6; section++) {
    const a = section / 6, b = (section + 1) / 6;
    const widthA = Math.sin(a * Math.PI) * .38 + .02, widthB = Math.sin(b * Math.PI) * .38;
    const bend = (t: number) => -.25 * t * t;
    frondVertices.push(-widthA, a, bend(a), widthA, a, bend(a), -widthB, b, bend(b), widthA, a, bend(a), widthB, b, bend(b), -widthB, b, bend(b));
  }
  frondGeometry.setAttribute("position", new THREE.Float32BufferAttribute(frondVertices, 3)); frondGeometry.computeVertexNormals();
  for (const x of [-76, -10, 10, 76]) for (let z = 5; z < 166; z += 18) {
    if ([20, 80, 140].some(cross => Math.abs(z - cross) < 12)) continue;
    const height = 6 + ((z + 2 * x + 200) % 4) * 0.3;
    instance("palms", trunkGeometry, bark, x, height / 2, z, 1, height, 1);
    for (let n = 0; n < 7; n++) {
      const angle = n * Math.PI * 2 / 7;
      instance("fronds", frondGeometry, leaves, x + Math.cos(angle) * 1.2, height, z + Math.sin(angle) * 1.2, 1.2, 3.4, 0.35, -angle, 1.18);
    }
    obstacle(x, z, 0.65, 0.65);
  }
  for (const x of [-69, 69]) for (let z = 0; z < 173; z += 24) {
    box("lamp-poles", metal, x, 3.6, z, 0.13, 7.2, 0.13);
    box("lamp-poles", metal, x + (x < 0 ? 1 : -1), 7.15, z, 2.1, 0.1, 0.12);
    box("lamp-glow", warm, x + (x < 0 ? 1.7 : -1.7), 7.1, z, 0.75, 0.08, 0.5);
  }
  // Coast is bounded by a visible seawall; ocean and skyline are scenery only.
  box("promenade", concrete, 82, 0.1, 78, 12, 0.25, 204);
  box("seawall", stone, 88.8, 0.65, 78, 0.7, 1.3, 204);
  const sea = new THREE.MeshStandardMaterial({ color: 0x356879, roughness: 0.3, metalness: 0 });
  box("ocean", sea, 299, -0.7, 90, 420, 0.2, 540);
  for (let i = 0; i < 24; i++) {
    box("sea-ripples", mint, 104 + i * 7.5, -0.57, 15 + (i * 37 % 180), 10 + i % 4 * 3, 0.01, 0.07);
  }
  for (let i = 0; i < 20; i++) {
    const x = -170 + i * 12;
    const height = 12 + (i * 17 % 43);
    box("skyline", blue, x, height / 2, 223 + i % 4 * 8, 8 + i % 3 * 3, height, 10);
  }
  // Explicit perimeter matches the controller's advertised driving area.
  for (const [x, z, w, d] of [[-90, 80, 1, 202], [90, 80, 1, 202], [0, -20, 181, 1], [0, 180, 181, 1]]) {
    box("barrier", stone, x, 0.6, z, w, 1.2, d);
    obstacle(x, z, w, d);
  }
  function sign(text: string, subtitle: string, x: number, y: number, z: number, width: number, rotation = 0) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024; canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#172d3b"; ctx.fillRect(0, 0, 1024, 256);
    ctx.fillStyle = "#a4e5d7"; ctx.fillRect(35, 34, 7, 188);
    ctx.fillStyle = "#f1eee5"; ctx.font = "600 72px sans-serif"; ctx.fillText(text, 70, 115);
    ctx.fillStyle = "#a9c1c8"; ctx.font = "32px sans-serif"; ctx.fillText(subtitle, 73, 183);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width / 4), new THREE.MeshBasicMaterial({ map: texture }));
    mesh.position.set(x, y, z); mesh.rotation.y = rotation; group.add(mesh);
  }
  sign("GuildVault", "Garagem · retorno ao login", 0, 5.55, -2.35, 8.8);
  sign("Orla Vault", "Distrito costeiro · circuito livre", -30, 6.3, 150.35, 12, Math.PI);
  sign("GuildVault", "Explore. Construa. Compartilhe.", 30, 6.3, 150.35, 12, Math.PI);
  for (const [name, batch] of batches) {
    const mesh = new THREE.InstancedMesh(batch.geometry, batch.material, batch.matrices.length);
    mesh.name = name;
    batch.matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = !["ocean", "ground", "lane", "crosswalk", "sea-ripples", "skyline"].includes(name);
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  return { group, colliders };
}
