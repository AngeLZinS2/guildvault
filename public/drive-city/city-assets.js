(function () {
  'use strict';
  const load = url => new Promise((resolve, reject) => new THREE.GLTFLoader().load(url, resolve, undefined, reject));
  const paints = [0x253947, 0xd5d1c4, 0x751e24, 0x182124, 0x536552, 0x9eabb3];
  function car(asset, index, preservePaint = false) {
    const root = new THREE.Group(), body = new THREE.Group(), model = asset.scene.clone(true);
    root.add(body); body.add(model);
    const ud = root.userData;
    Object.assign(ud, { body, bodyRestY: .55, groundedWheels: true, wheels: [], frontWheels: [], rearWheels: [] });
    const pivots = [];
    model.traverse(node => {
      if (/^Wheel_(FL|FR|RL|RR)$/.test(node.name)) pivots.push(node);
      if (node.isMesh) {
        node.castShadow = true; node.receiveShadow = true;
        const tint = m => {
          if (preservePaint) return m;
          if (!/CityCarPaint|paint/i.test(m.name)) return m;
          const copy = m.clone(); copy.color.setHex(paints[index % paints.length]); return copy;
        };
        node.material = Array.isArray(node.material) ? node.material.map(tint) : tint(node.material);
      }
    });
    root.updateMatrixWorld(true);
    pivots.forEach(p => {
      root.attach(p);
      const spin = p.getObjectByName(p.name.replace('Wheel_', 'WheelSpin_'));
      if (spin) { spin.userData.radius = spin.userData.radius || .34; ud.wheels.push(spin); }
      ud[p.name.startsWith('Wheel_F') ? 'frontWheels' : 'rearWheels'].push(p);
    });
    body.position.y = .55; model.position.y -= .55;
    window.fitVehicleCollision(root);
    return root;
  }
  const policeModels = [
    { file: 'crown-victoria', name: 'Ford Crown Victoria', roof: 1.43, barZ: -.2 },
    { file: 'peugeot-5008', name: 'Peugeot 5008 Police', roof: 1.70, barZ: -.28 },
    { file: 'police-car-8', name: 'Police Cruiser 8', roof: 1.61, barZ: -.12 },
    { file: 'lspd-cruiser', name: 'LSPD Cruiser', roof: 1.54, barZ: .12 }
  ];
  function policeCar(asset, spec) {
    const mesh = car(asset, 0, true);
    const body = mesh.userData.body;
    for (const [name,color,x] of [['strobeRed',0xff1838,-.37],['strobeBlue',0x2488ff,.37]]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(.28,.045,.16),new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:3}));
      lamp.position.set(x,spec.roof-.55,spec.barZ);body.add(lamp);mesh.userData[name]=lamp;
    }
    mesh.userData.policeModel = spec.name;
    return mesh;
  }
  window.GuildVaultPoliceAssets = { models: policeModels, load: () => Promise.allSettled(policeModels.map(s => load('/models/police/'+s.file+'.glb'))), create: policeCar };
  function person(asset, index) {
    const root = new THREE.Group();
    const model = THREE.SkeletonUtils.clone(asset.scene);
    root.add(model);
    model.traverse(n => { if (n.isMesh) {
      n.castShadow = true; n.receiveShadow = true; n.frustumCulled = false;
      const tint = m => {
        if (!/casualsuit/i.test(m.name)) return m;
        const copy = m.clone();
        copy.color.setHex([0xffffff,0xaab7bd,0x9fa9be,0xbdb0a0][index % 4]);
        return copy;
      };
      n.material = Array.isArray(n.material) ? n.material.map(tint) : tint(n.material);
    } });
    const mixer = new THREE.AnimationMixer(model);
    const actions = Object.fromEntries(asset.animations.map(c => [c.name, mixer.clipAction(c)]));
    let current, punchTime = 0, landingTime = 0;
    const hand = model.getObjectByName('upperarm_r');
    const gait = {
      update(dt, speed) {
        const name = speed > 3 ? 'Run' : speed > .1 ? 'Walk' : 'Idle';
        if (name !== current) {
          if (actions[current]) actions[current].fadeOut(.2);
          actions[name]?.reset().fadeIn(.2).play(); current = name;
        }
        if (actions[current]) actions[current].timeScale = current === 'Walk' ? Math.max(.6, Math.min(1.4, speed / 1.5)) : 1;
        mixer.update(dt);
        if (punchTime > 0 && hand) { punchTime = Math.max(0, punchTime - dt); hand.rotateX(-Math.sin(punchTime / .3 * Math.PI) * 1.1); }
        landingTime = Math.max(0, landingTime - dt);
        model.position.y = -Math.sin(landingTime / .2 * Math.PI) * .035;
      }, land() { landingTime = .2; }, punch() { punchTime = .3; }
    };
    gait.update((index % 9) * .11, 1.5);
    return { root, gait };
  }
  window.loadCityAssets = async game => {
    const results = await Promise.allSettled([
      load('/models/city/concept-traffic.glb'), load('/models/guildvault-audi-r8.glb'),
      load('/models/city/human-aa-man.glb'), load('/models/city/human-aa-woman.glb')
    ]);
    const assets = results.map(r => r.status === 'fulfilled' ? r.value : null);
    results.forEach(r => { if (r.status === 'rejected') console.warn('City asset fallback', r.reason); });
    let cars = 0, people = 0;
    game.trafficManager.vehicles.forEach((v, i) => {
      const asset = assets[i % 3 === 0 ? 1 : 0] || assets[0] || assets[1];
      if (!asset) return;
      const old = v.mesh; v.mesh = car(asset, i);
      v.mesh.position.copy(v.position); v.mesh.position.y = .1; v.mesh.rotation.y = v.heading;
      v.mesh.visible = old.visible; game.scene.remove(old); game.scene.add(v.mesh);
      v.archetype = { ...v.archetype, ...v.mesh.userData.collision, name: i % 3 === 0 ? 'Audi R8' : 'Concept GT' };
      v._near = undefined; v.suspension = null; cars++;
    });
    game.trafficManager.pedestrians.forEach((p, i) => {
      const asset = assets[2 + i % 2] || assets[2] || assets[3]; if (!asset) return;
      const { root, gait } = person(asset, i), old = p.group;
      root.position.copy(p.position); root.position.y += .1; root.rotation.copy(old.rotation); root.visible = old.visible;
      game.scene.remove(old); game.scene.add(root); p.group = root; p.gait = gait; p.realisticAsset = true; people++;
    });
    if (assets[2] || assets[3]) {
      const p = game.player, { root, gait } = person(assets[2] || assets[3], 0);
      root.position.copy(p.position); root.rotation.y = p.heading; root.visible = p.state === 'ON_FOOT';
      game.scene.remove(p.characterMesh); game.scene.add(root); p.characterMesh = root; p.gait = gait;
    }
    const policeResults = await window.GuildVaultPoliceAssets.load();
    let police = 0;
    game.policeManager.policeUnits.forEach((v, i) => {
      const result = policeResults[i % policeModels.length];
      if (result.status !== 'fulfilled') { console.warn('Police asset fallback',result.reason); return; }
      const spec = policeModels[i % policeModels.length];
      const old = v.mesh; v.mesh = policeCar(result.value, spec);
      v.mesh.position.copy(v.position); v.mesh.position.y = .1; v.mesh.rotation.y = v.heading; v.mesh.visible = old.visible;
      v.archetype = { ...v.archetype, ...v.mesh.userData.collision, name: spec.name };
      window.TrafficManager?.trimShadowCasters(v.mesh);
      game.scene.remove(old); game.scene.add(v.mesh); v._near = undefined; v.suspension = null; police++;
    });
    return { cars, people, police };
  };
})();
