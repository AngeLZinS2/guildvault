/**
 * GTA: VICE CITY KAKKANAD (ഗ്രാൻഡ് തെഫ്റ്റ് ഓട്ടോ: കാക്കനാട്)
 * DOMAIN 7: WEB AUDIO SYNTHESIZER & 3 RADIO STATIONS
 * Recorded Audi acceleration with Web Audio engine, effects and original radio.
 */

class AudioRadioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.volume = .55;
    this.paused = false;
    this.radioEnabled = false;
    this.inVehicle = false;
    this.stepDistance = 0;
    this.initialized = false;
    this.currentStation = 0; // 0, 1, 2

    // Radio Sequencer State
    this.radioTimer = null;
    this.radioStep = 0;
    this.masterGain = null;
    this.radioGain = null;

    // Engine Nodes
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineFilter = null;
    this.engineGain = null;
    this.accelerationBuffer = null;
    this.accelerationVoice = null;
    this.accelerating = false;
    this.engineStartBuffer = null;
    this.engineStartVoice = null;
    this.engineStartPending = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      const limiter = this.ctx.createDynamicsCompressor();
      limiter.threshold.value = -12; limiter.knee.value = 12; limiter.ratio.value = 8;
      this.masterGain.connect(limiter); limiter.connect(this.ctx.destination);

      this.radioGain = this.ctx.createGain();
      this.radioGain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      this.radioGain.connect(this.masterGain);

      this.setupEngineSound();
      this.setupWorldSound();
      this.setupPoliceSiren();
      this.startRadio();

      this.initialized = true;
      this.loadAcceleration();
      this.loadEngineStart();
      this.loadPoliceSirens();
    } catch (e) {
      console.warn("Web Audio initialization error:", e);
    }
  }

  async resume() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === "suspended") {
      try { await this.ctx.resume(); } catch (error) { console.warn('Audio unlock',error); }
    }
    this.reportState();
    this.maybeStartEngine();
  }

  reportState() {
    const state = { enabled: !this.isMuted && this.ctx?.state === 'running', volume: this.volume,
      radio: this.radioEnabled, paused: this.paused };
    window.dispatchEvent(new CustomEvent('guildvault-audio-state',{detail:state}));
  }
  setVolume(value) {
    this.volume = Math.max(0,Math.min(1,Number(value) || 0)); this.syncMaster(); this.reportState();
  }
  setMuted(muted) { this.isMuted = !!muted; this.syncMaster(); this.reportState(); }
  setPaused(paused) { this.paused = !!paused; if (this.paused) { this.stopAcceleration(); this.stopEngineStart(); this.accelerating = false; } this.syncMaster(); }
  syncMaster() {
    if (this.masterGain && this.ctx) this.masterGain.gain.setTargetAtTime(this.isMuted || this.paused ? 0 : this.volume,this.ctx.currentTime,.03);
  }

  toggleMute() {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  // --- 1. Vehicle Engine Synthesizer ---
  async loadEngineStart() {
    if (typeof fetch !== 'function') return;
    try {
      const response = await fetch('/audio/car-engine-starting.mp3');
      if (!response.ok) throw new Error('Engine start audio: '+response.status);
      this.engineStartBuffer = await this.ctx.decodeAudioData(await response.arrayBuffer());
      this.maybeStartEngine();
    } catch (error) { this.engineStartPending=false; console.warn('Engine start recording unavailable.',error); }
  }
  playEngineStart() {
    if (!this.initialized) this.init();
    this.stopEngineStart();
    if (this.isMuted || this.paused) return;
    this.stopAcceleration(); this.accelerating=false;
    this.engineStartPending=true; this.maybeStartEngine();
  }
  maybeStartEngine() {
    if (!this.engineStartPending || !this.engineStartBuffer || this.ctx?.state!=='running' || this.isMuted || this.paused) return;
    this.engineStartPending=false;
    const source=this.ctx.createBufferSource(),gain=this.ctx.createGain(),now=this.ctx.currentTime;
    source.buffer=this.engineStartBuffer;
    gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.65,now+.035);
    gain.gain.setTargetAtTime(0,now+Math.max(.05,source.buffer.duration-.15),.04);
    source.connect(gain);gain.connect(this.masterGain);
    const voice={source,gain};this.engineStartVoice=voice;
    source.onended=()=>{source.disconnect();gain.disconnect();if(this.engineStartVoice===voice)this.engineStartVoice=null;};
    source.start();
  }
  stopEngineStart() {
    this.engineStartPending=false;
    const voice=this.engineStartVoice;if(!voice)return;
    const now=this.ctx.currentTime;voice.gain.gain.cancelScheduledValues(now);voice.gain.gain.setTargetAtTime(0,now,.035);
    voice.source.stop(now+.18);this.engineStartVoice=null;
  }
  async loadAcceleration() {
    if (typeof fetch !== 'function') return;
    try {
      const response = await fetch('/audio/audi-v8-acceleration.mp3');
      if (!response.ok) throw new Error('Acceleration audio: ' + response.status);
      this.accelerationBuffer = await this.ctx.decodeAudioData(await response.arrayBuffer());
    } catch (error) { console.warn('Recorded engine unavailable; synthesized engine remains active.', error); }
  }
  startAcceleration() {
    if (!this.accelerationBuffer || this.engineStartVoice || this.engineStartPending || this.paused || this.ctx.state !== 'running') return;
    this.stopAcceleration();
    const source = this.ctx.createBufferSource(), gain = this.ctx.createGain(), now = this.ctx.currentTime;
    source.buffer = this.accelerationBuffer;
    gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(.65, now + .12);
    source.connect(gain); gain.connect(this.masterGain);
    const voice = { source, gain }; this.accelerationVoice = voice;
    source.onended = () => { source.disconnect(); gain.disconnect(); if (this.accelerationVoice === voice) this.accelerationVoice = null; };
    source.start();
  }
  stopAcceleration() {
    const voice = this.accelerationVoice;
    if (!voice) return;
    const now = this.ctx.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setTargetAtTime(0, now, .06);
    voice.source.stop(now + .3); this.accelerationVoice = null;
  }
  setupEngineSound() {
    this.engineOsc1 = this.ctx.createOscillator();
    const real = new Float32Array(17), imaginary = new Float32Array(17);
    for(let i=1;i<17;i++) imaginary[i] = (i % 2 ? .7 : 1) / Math.pow(i,1.3);
    this.engineOsc1.setPeriodicWave(this.ctx.createPeriodicWave(real,imaginary));
    this.engineOsc1.frequency.setValueAtTime(50, this.ctx.currentTime);

    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = "triangle";
    this.engineOsc2.frequency.setValueAtTime(100, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = "lowpass";
    this.engineFilter.frequency.setValueAtTime(400, this.ctx.currentTime);

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.engineOsc1.start();
    this.engineOsc2.start();
  }

  updateEngine(rpmRatio, isAuto = false) {
    if (!this.initialized) return;
    const now = this.ctx.currentTime;

    if (rpmRatio < 0) { this.engineGain.gain.setTargetAtTime(0,now,.12); return; }
    if (rpmRatio <= 0.01) {
      this.engineOsc1.frequency.setTargetAtTime(45,now,.08);
      this.engineOsc2.frequency.setTargetAtTime(90,now,.08);
      this.engineGain.gain.setTargetAtTime(this.engineStartVoice ? .005 : .02, now, 0.05);
      return;
    }

    const baseFreq = isAuto ? (85 + rpmRatio * 320) : (50 + rpmRatio * 220);
    this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.04);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.5, now, 0.04);

    const filterCutoff = 350 + rpmRatio * 1500;
    this.engineFilter.frequency.setTargetAtTime(filterCutoff, now, 0.04);

    this.engineGain.gain.setTargetAtTime(this.engineStartVoice ? .005 : this.accelerationVoice ? .025 : .12, now, 0.05);
  }

  setupWorldSound() {
    const buffer = this.ctx.createBuffer(1,this.ctx.sampleRate*2,this.ctx.sampleRate);
    const data = buffer.getChannelData(0); let pink = 0;
    for(let i=0;i<data.length;i++){ pink=.97*pink+.03*(Math.random()*2-1);data[i]=pink*4; }
    this.noiseBuffer=buffer;
    const layer=(frequency,type,gain)=>{
      const source=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),level=this.ctx.createGain();
      source.buffer=buffer;source.loop=true;filter.type=type;filter.frequency.value=frequency;level.gain.value=gain;
      source.connect(filter);filter.connect(level);level.connect(this.masterGain);source.start();return level;
    };
    this.ambientGain=layer(450,'lowpass',.035);
    this.roadGain=layer(1200,'lowpass',0);
    this.tyreGain=layer(2200,'bandpass',0);
  }
  setupPoliceSiren() {
    this.sirenGain=this.ctx.createGain();this.sirenGain.gain.value=0;
    this.sirenPan=this.ctx.createStereoPanner?.();
    if(this.sirenPan){this.sirenGain.connect(this.sirenPan);this.sirenPan.connect(this.masterGain);}
    else this.sirenGain.connect(this.masterGain);
    this.sirenLayers={};
  }
  async loadPoliceSirens() {
    if(typeof fetch!=='function')return;
    await Promise.all(['near','far','backup'].map(async name=>{
      try {
        const response=await fetch('/audio/police-siren-'+name+'.mp3');
        if(!response.ok)throw new Error(response.status);
        const buffer=await this.ctx.decodeAudioData(await response.arrayBuffer());
        // Match recording loudness and soften the loop boundary without altering pitch.
        let energy=0,peak=0;
        for(let c=0;c<buffer.numberOfChannels;c++){
          const data=buffer.getChannelData(c);
          for(const sample of data){energy+=sample*sample;peak=Math.max(peak,Math.abs(sample));}
        }
        const rms=Math.sqrt(energy/(buffer.length*buffer.numberOfChannels));
        const scale=Math.min(3,.22/Math.max(.001,rms),.95/Math.max(.001,peak));
        const fade=Math.min(Math.floor(buffer.sampleRate*.02),Math.floor(buffer.length/4));
        for(let c=0;c<buffer.numberOfChannels;c++){
          const data=buffer.getChannelData(c);
          for(let i=0;i<data.length;i++)data[i]*=scale*Math.min(1,i/Math.max(1,fade),(data.length-1-i)/Math.max(1,fade));
        }
        const gain=this.ctx.createGain();gain.gain.value=0;gain.connect(this.sirenGain);
        this.sirenLayers[name]={buffer,gain,source:null};
      }catch(error){console.warn('Police recording unavailable: '+name,error);}
    }));
  }
  updatePoliceSiren(player,units=[]) {
    const now=this.ctx.currentTime,position=player.position||{x:0,z:0};let nearest=null,distance=Infinity;
    for(const unit of units){
      if(!unit.isActive)continue;
      const d=Math.hypot(unit.position.x-position.x,unit.position.z-position.z);
      if(d<distance){nearest=unit;distance=d;}
    }
    this.sirenDistance=distance;
    this.sirenLevel=nearest ? .95*Math.pow(Math.max(0,1-distance/200),1.3) : 0;
    this.sirenGain.gain.setTargetAtTime(this.sirenLevel,now,.12);
    const blend=Math.max(0,Math.min(1,(distance-25)/70));
    const hasNear=!!this.sirenLayers.near,hasFar=!!this.sirenLayers.far;
    const weights={near:hasFar ? Math.cos(blend*Math.PI/2) : 1,
      far:hasNear ? Math.sin(blend*Math.PI/2) : 1,backup:hasNear||hasFar ? 0 : 1};
    for(const [name,layer] of Object.entries(this.sirenLayers)){
      const audible=this.sirenLevel>0&&!this.paused&&!this.isMuted&&this.ctx.state==='running';
      layer.gain.gain.setTargetAtTime(audible ? weights[name] : 0,now,.2);
      if(audible&&weights[name]>.001&&!layer.source){
        const source=this.ctx.createBufferSource();source.buffer=layer.buffer;source.loop=true;
        source.connect(layer.gain);layer.source=source;source.start();
      }
      if(audible)layer.silentSince=null;
      else if(layer.source){
        if(layer.silentSince==null)layer.silentSince=now;
        if(now-layer.silentSince>.8){layer.source.stop();layer.source.disconnect();layer.source=null;}
      }
    }
    if(nearest&&this.sirenPan){
      const heading=player.heading||0,dx=nearest.position.x-position.x,dz=nearest.position.z-position.z;
      this.sirenPan.pan.setTargetAtTime(Math.max(-.85,Math.min(.85,(dx*Math.cos(heading)-dz*Math.sin(heading))/Math.max(1,distance))),now,.1);
    }
  }
  updateWorld(dt,player,policeUnits=[]) {
    if (!this.initialized) return;
    const now=this.ctx.currentTime,speed=Math.hypot(player.velocity.x,player.velocity.z);
    this.inVehicle=player.state==='IN_VEHICLE';
    this.updatePoliceSiren(player,policeUnits);
    const accelerating = this.inVehicle && !!player.keys?.up && !this.paused;
    if (accelerating && (!this.accelerating || this.waitingForRecording)) this.startAcceleration();
    this.waitingForRecording = accelerating && (!this.accelerationBuffer || !!this.engineStartVoice || this.engineStartPending);
    if (!accelerating && this.accelerating) this.stopAcceleration();
    this.accelerating = accelerating;
    if (!this.inVehicle) this.updateEngine(-1);
    this.radioGain.gain.setTargetAtTime(this.radioEnabled && this.inVehicle ? .16 : 0,now,.2);
    this.roadGain.gain.setTargetAtTime(this.inVehicle ? Math.min(.22,speed*.006) : 0,now,.08);
    const dynamics=player.currentVehicle?.dynamics;
    const slip=this.inVehicle && dynamics ? Math.abs(dynamics.vl || 0) : 0;
    this.tyreGain.gain.setTargetAtTime(speed>4 ? Math.min(.3,Math.max(0,slip-.8)*.065) : 0,now,.06);
    if (!this.inVehicle && player.isGrounded && speed>.3) {
      this.stepDistance+=speed*dt;
      if(this.stepDistance>(speed>6 ? 1.4 : .95)){this.stepDistance=0;this.playFootstep(speed);}
    } else this.stepDistance=0;
  }
  playFootstep(speed) {
    if(this.isMuted || this.paused) return;
    const now=this.ctx.currentTime,source=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),gain=this.ctx.createGain();
    source.buffer=this.noiseBuffer;filter.type='lowpass';filter.frequency.value=800;
    gain.gain.setValueAtTime(speed>6 ? .35 : .22,now);gain.gain.exponentialRampToValueAtTime(.001,now+.09);
    source.connect(filter);filter.connect(gain);gain.connect(this.masterGain);source.start(now);source.stop(now+.1);
    source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
  }

  // --- 2. Vehicle Horns & Sirens ---
  playHorn(type = "car") {
    if (!this.initialized || this.isMuted) return;
    const now = this.ctx.currentTime;

    if (type === "auto") {
      this.playTone(660, 0.09, now, 0.35);
      this.playTone(880, 0.09, now + 0.11, 0.35);
    } else if (type === "bus") {
      [523.25, 659.25, 783.99, 1046.5].forEach((f) => {
        this.playTone(f, 0.45, now, 0.25);
      });
    } else if (type === "siren") {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.linearRampToValueAtTime(950, now + 0.25);
      osc.frequency.linearRampToValueAtTime(450, now + 0.5);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.52);
    } else {
      this.playTone(440, 0.25, now, 0.3);
      this.playTone(554.37, 0.25, now, 0.3);
    }
  }

  // --- 3. Melee Punch & Hit Combat Sounds ---
  playPunchWhoosh() {
    if (!this.initialized || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.14);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  playPunchImpact() {
    if (!this.initialized || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Melee smack transient
    const bufferSize = this.ctx.sampleRate * 0.12;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const out = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) out[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(150, now + 0.12);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);

    // Deep chest thud
    const osc = this.ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.15);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.5, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  playVehicleDoor() {
    if (!this.initialized || this.isMuted) return;
    const now = this.ctx.currentTime;
    // Heavy car door slam / latch
    this.playTone(180, 0.08, now, 0.35);
    this.playTone(85, 0.15, now + 0.08, 0.45);
  }

  playCashPickup() {
    if (!this.initialized || this.isMuted) return;
    const now = this.ctx.currentTime;
    // Retro cha-ching chime
    this.playTone(987.77, 0.08, now, 0.25);
    this.playTone(1318.51, 0.18, now + 0.07, 0.3);
  }

  playPedestrianScream() {
    if (!this.initialized || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.3);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  playCrash(intensity = 1.0) {
    if (!this.initialized || this.isMuted) return;
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.35;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const out = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) out[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(900 * intensity, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.7 * intensity, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
  }

  playTone(freq, dur, time, vol) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + dur);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + dur + 0.05);
  }

  // --- 4. Three Radio Stations ---
  nextStation() {
    if (!this.radioEnabled) { this.radioEnabled=true; this.currentStation=0; }
    else if (this.currentStation===window.KAKKANAD_CONFIG.RADIO.length-1) this.radioEnabled=false;
    else this.currentStation++;
    this.showRadioBanner();
    this.reportState();
  }

  showRadioBanner() {
    const banner = document.getElementById("radio-banner");
    const stName = document.getElementById("radio-station-name");
    const stGenre = document.getElementById("radio-genre");
    const station = window.KAKKANAD_CONFIG.RADIO[this.currentStation];

    if (stName) stName.textContent = this.radioEnabled ? station.name : 'Rádio desligado';
    if (stGenre) stGenre.textContent = this.radioEnabled ? station.genre.toUpperCase() : 'R PARA LIGAR / TROCAR';

    if (banner) {
      banner.style.transform = "translateX(0)";
      banner.style.opacity = "1";
      setTimeout(() => {
        banner.style.opacity = "0.7";
      }, 3500);
    }
  }

  startRadio() {
    if (this.radioTimer) return;
    const tempo = 124;
    const intervalMs = (60 / tempo / 4) * 1000;

    const waveBass = [73.42, 73.42, 87.31, 98.0, 110.0, 98.0, 87.31, 65.41];
    const waveLead = [293.66, 349.23, 440.0, 523.25, 587.33, 523.25, 440.0, 349.23];

    const kochiBass = [110.0, 110.0, 130.81, 146.83, 164.81, 146.83, 130.81, 98.0];
    const kochiLead = [440.0, 523.25, 659.25, 523.25, 659.25, 783.99, 659.25, 523.25];

    const chillBass = [87.31, 87.31, 103.83, 116.54, 87.31, 77.78, 87.31, 103.83];
    const chillLead = [349.23, 392.0, 440.0, 523.25, 440.0, 392.0, 349.23, 293.66];

    this.radioTimer = setInterval(() => {
      if (this.isMuted || this.paused || !this.radioEnabled || !this.inVehicle || this.ctx?.state !== 'running') return;
      const now = this.ctx.currentTime;

      let bassNote, leadNote;
      if (this.currentStation === 0) {
        bassNote = waveBass[Math.floor(this.radioStep / 2) % waveBass.length];
        leadNote = waveLead[this.radioStep % waveLead.length];
      } else if (this.currentStation === 1) {
        bassNote = kochiBass[Math.floor(this.radioStep / 2) % kochiBass.length];
        leadNote = kochiLead[this.radioStep % kochiLead.length];
      } else {
        bassNote = chillBass[Math.floor(this.radioStep / 4) % chillBass.length];
        leadNote = chillLead[this.radioStep % chillLead.length];
      }

      if (this.radioStep % 2 === 0) {
        this.playSynthNote(bassNote, "sawtooth", 0.12, 0.14, now, 600);
      }

      if (this.radioStep % 4 !== 3) {
        this.playSynthNote(leadNote, "triangle", 0.08, 0.12, now, 1800);
      }

      this.radioStep = (this.radioStep + 1) % 64;
    }, intervalMs);
  }

  playSynthNote(freq, type, duration, volume, time, filterCutoff) {
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(filterCutoff, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.radioGain);

    osc.start(time);
    osc.stop(time + duration + 0.05);
  }
}

window.soundEngine = new AudioRadioEngine();

