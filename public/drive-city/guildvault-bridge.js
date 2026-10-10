(function () {
  'use strict';
  const send = (type, detail) => parent.postMessage({ channel: 'guildvault-city', type, detail }, location.origin);
  window.addEventListener('error', () => send('error', 'Não foi possível carregar a cidade 3D.'));
  let game, spawn, ready = false;
  let paused = false;
  const soundPanel = document.createElement('div');
  soundPanel.style.cssText='position:fixed;right:16px;bottom:16px;z-index:30;display:flex;align-items:center;gap:10px;background:#10212de8;color:#edf8f5;padding:8px 12px;border:1px solid #bed6d43b;border-radius:8px;font:12px system-ui';
  soundPanel.innerHTML='<button id="drive-audio-toggle" type="button" style="background:none;color:inherit;border:0;cursor:pointer;min-height:28px">Ativar áudio</button><label>Volume <input id="drive-audio-volume" aria-label="Volume do jogo" type="range" min="0" max="100" value="55" style="width:85px;vertical-align:middle"></label>';
  document.body.appendChild(soundPanel);
  if (parent !== window) soundPanel.style.display='none';
  const soundButton=soundPanel.querySelector('button'), volumeControl=soundPanel.querySelector('input');
  window.addEventListener('guildvault-audio-state',event=>{
    const state=event.detail;
    soundButton.textContent=state.enabled ? 'Som ligado' : 'Ativar áudio';
    soundButton.setAttribute('aria-pressed',String(state.enabled));
    volumeControl.value=String(Math.round(state.volume*100));
    parent.postMessage({channel:'guildvault-city',type:'audio-state',...state},location.origin);
  });
  soundButton.addEventListener('click',async()=>{
    const audio=window.soundEngine;
    const enabled=audio.ctx?.state==='running' && !audio.isMuted;
    audio.setMuted(enabled);if(!enabled) await audio.resume();
  });
  volumeControl.addEventListener('input',()=>window.soundEngine.setVolume(Number(volumeControl.value)/100));
  const unlockAudio=event=>{ if(!soundPanel.contains(event.target)) window.soundEngine.resume(); };
  window.addEventListener('keydown',unlockAudio);
  window.addEventListener('pointerdown',unlockAudio);
  function release() { if (game) Object.keys(game.player.keys).forEach(k => game.player.keys[k] = false); }
  function reset() {
    if (!game || !spawn) return;
    const p = game.player, v = p.starterVehicle;
    if (p.currentVehicle) p.exitVehicle();
    v.position.copy(spawn.position); v.heading = spawn.heading; v.speed = 0;
    v.mesh.position.copy(v.position); v.mesh.rotation.set(0, v.heading, 0);
    if (v.dynamics) v.dynamics.reset();
    v.suspension = null;
    p.position.copy(v.position); p.velocity.set(0, 0, 0); p.health = 100;
    p.tryEnterNearestVehicle(); game.cameraRig.snap(); release();
  }
  window.addEventListener('blur', release);
  document.addEventListener('visibilitychange', () => { if (document.hidden) release(); window.soundEngine.setPaused(document.hidden || paused); });
  window.addEventListener('keydown', e => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (e.code === 'Escape') { release(); document.exitPointerLock?.(); send('exit'); }
    if (e.code === 'KeyT') reset();
  });
  window.addEventListener('message', e => {
    if (e.origin !== location.origin || e.source !== parent || e.data?.channel !== 'guildvault-city') return;
    if (e.data.type === 'reset') reset();
    if (e.data.type === 'release') release();
    if (e.data.type === 'pause' && game) { paused = !!e.data.paused; game.guildvaultPaused = paused; game.soundEngine.setPaused(paused); release(); }
    if (e.data.type === 'input' && ready && !paused && Object.hasOwn(game.player.keys, e.data.key)) {
      game.player.keys[e.data.key] = !!e.data.pressed;
      game.soundEngine.resume();
    }
    if (e.data.type === 'camera' && game) game.cameraMode = (game.cameraMode + 1) % 3;
    if (e.data.type === 'action' && ready && !paused) game.player.onActionKey();
    if (e.data.type === 'sound' && game) { game.soundEngine.setMuted(!e.data.enabled); if(e.data.enabled) game.soundEngine.resume(); }
    if (e.data.type === 'volume' && game) game.soundEngine.setVolume(e.data.value);
    if (e.data.type === 'radio' && game) game.soundEngine.nextStation();
  });
  async function finish(modelLoaded) {
    send('progress', 'Preparando carros e pedestres…');
    const upgraded = await window.loadCityAssets(game);
    game.startGame();
    game.soundEngine.reportState();
    reset(); ready = true;
    send('ready', modelLoaded ? `Audi R8 · ${upgraded.cars} carros · ${upgraded.people} pedestres` : 'Carro de reserva: Audi indisponível');
  }
  document.addEventListener('DOMContentLoaded', () => {
    try {
      game = window.gameEngine;
      if (!game?.ready) throw new Error('Engine initialization failed');
      send('progress', 'Cidade pronta. Carregando Audi R8…');
      const p = game.player, v = p.starterVehicle;
      spawn = { position: v.position.clone(), heading: v.heading };
      game.scene.remove(v.mesh);
      v.mesh = window.vehicleModelFactory.createSportsCarMesh(0x86999f);
      v.type = 'SPORTS_CAR';
      v.archetype = { ...window.KAKKANAD_CONFIG.VEHICLE_ARCHETYPES.SPORTS_CAR,
        name: 'Audi R8', mass: 1560, accel: 11, brake: 14, handling: 14, driftFactor: 0.35 };
      v.mesh.position.copy(v.position); v.mesh.rotation.y = v.heading; game.scene.add(v.mesh);
      new THREE.GLTFLoader().load('/models/guildvault-audi-r8.glb', gltf => {
        try {
          const group = new THREE.Group(), body = new THREE.Group();
          body.add(gltf.scene); group.add(body);
          group.userData.body = body; group.userData.wheels = [];
          group.userData.frontWheels = []; group.userData.rearWheels = [];
          const wheelPivots = [];
          gltf.scene.traverse(node => {
            if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; }
            if (/^Wheel_(FL|FR|RL|RR)$/.test(node.name)) {
              wheelPivots.push(node);
              const spin = node.getObjectByName(node.name.replace('Wheel_', 'WheelSpin_'));
              if (spin) group.userData.wheels.push(spin);
              group.userData[/^Wheel_F/.test(node.name) ? 'frontWheels' : 'rearWheels'].push(node);
            }
          });
          // Wheels stay on the contact plane; only the sprung body pitches and rolls.
          group.updateMatrixWorld(true);
          wheelPivots.forEach(node => group.attach(node));
          group.userData.bodyRestY = 0.55;
          body.position.y = 0.55; gltf.scene.position.y -= 0.55;
          group.userData.groundedWheels = true;
          window.fitVehicleCollision(group);
          v.archetype = { ...v.archetype, ...group.userData.collision };
          v.position.y = 0.1;
          spawn.position.y = 0.1;
          game.scene.remove(v.mesh); v.mesh = group;
          group.position.copy(v.position); group.rotation.y = v.heading;
          game.scene.add(group); finish(true);
        } catch (error) { console.error(error); finish(false); }
      }, e => {
        if (e.total) send('progress', `Carregando Audi R8: ${Math.round(e.loaded / e.total * 100)}%`);
      }, error => { console.warn('Audi load failed', error); finish(false); });
    } catch (error) { console.error(error); send('error', 'Não foi possível inicializar a cidade 3D.'); }
  });
})();
