// All sound of the game behind one module: sound effects, music, the volume menu and the silent-fight "hush" layers.
//
//   const audio = createAudio({ volume, makeCtx, fetchBuf, makeAudio, later });
//   audio.unlock()            first user gesture: creates the AudioContext, starts the music asked for before it. Until then every sound is a no-op.
//   audio.sweep / noise / blip(freq)   effects; they play on the "sfx" bus, or on the "shot" bus after audio.sfxBus("shot")
//   audio.bgm.play(name) / stop() / vol(k 0..1) / sync()     music: audio/bgm_<name>.ogg, seamless loop; play() before unlock() is remembered
//   audio.hush(on) / hushLayer(n)    battle with 침묵: every bus reads 0 until the layer lets it back (1 enemy attacks, 2 music, 4 everything else; 3 is the sky)
//   audio.syncVolumes()       the volume menu changed: applies at once. audio.hushed / audio.layer / audio.unlocked are read-only state.
//
// Adapters: volume(kind) -> 0..1 for "bgm" | "sfx" (MENU.vol in the game); makeCtx / fetchBuf / makeAudio are WebAudio, fetch and <audio> in the game, fakes in tests.
(function (root) {
  const LAYER_AT = { shot: 1, bgm: 2, sfx: 4 };
  const TRACK_VOL = { intro: .18 }, TRACK_DEFAULT = .2;   // per-track volume, kept below the sound effects

  function createAudio({ volume, makeCtx = () => new AudioContext(), fetchBuf = n => fetch(`audio/bgm_${n}.ogg`).then(r => r.arrayBuffer()), makeAudio = n => new Audio(`audio/bgm_${n}.ogg`), later = (f, ms) => setTimeout(f, ms) }) {
    let ac = null, hushed = false, layer = 0, sfxKind = "sfx";
    const buses = {};
    // "shot" has no volume of its own: it follows sfx (an undefined gain would throw in hush(false) and freeze the end of the fight)
    const mv = k => { const v = volume(k === "shot" ? "sfx" : k); return !hushed || layer >= LAYER_AT[k] ? v : 0; };
    const out = k => { if (!buses[k]) { buses[k] = ac.createGain(); buses[k].gain.value = mv(k); buses[k].connect(ac.destination); } return buses[k]; };

    function blip(freq) {
      if (!ac) return;
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = "square"; o.frequency.value = freq * (1 + (Math.random() - .5) * .06);
      g.gain.setValueAtTime(.08, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + .06);
      o.connect(g).connect(out("sfx"));
      o.start(); o.stop(ac.currentTime + .06);
    }
    // sweep = pitch slide, noise = burst (thud / crash)
    function sweep(f0, f1, dur, type = "sawtooth", vol = .25) {
      if (!ac) return;
      const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
      o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
      o.connect(g).connect(out(sfxKind)); o.start(); o.stop(t + dur);
    }
    function noise(dur, vol = .4) {
      if (!ac) return;
      const n = ac.sampleRate * dur, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const s = ac.createBufferSource(), g = ac.createGain(); s.buffer = b; g.gain.value = vol;
      s.connect(g).connect(out(sfxKind)); s.start();
    }

    // music: Web Audio buffer; <audio> fallback (e.g. opened via file://)
    const bgm = (() => {
      const bufs = {}; let cur = null, name = null, kk = 1;   // kk = 0..1 of the track's normal volume (battles that swallow sound)
      const base = n => TRACK_VOL[n] ?? TRACK_DEFAULT;
      const load = n => bufs[n] ||= fetchBuf(n).then(b => ac.decodeAudioData(b));
      const stop = () => {
        name = null; if (!cur) return; const c = cur; cur = null;
        if (c.g) { c.g.gain.setTargetAtTime(0, ac.currentTime, .5); later(() => c.s.stop(), 3000); } else c.a.pause();
      };
      async function play(n) {
        if (name === n) return; stop(); name = n; kk = 1;
        if (!ac) return;                                      // before the first gesture: unlock() starts it
        try {
          const buf = await load(n); if (name !== n) return;
          const s = ac.createBufferSource(), g = ac.createGain(); s.buffer = buf; s.loop = true; g.gain.value = 0; g.gain.setTargetAtTime(base(n) * kk, ac.currentTime, .6);   // fade in while the old track fades out
          s.connect(g).connect(out("bgm")); s.start(); cur = { s, g };
        } catch {
          if (name !== n) return;
          const a = makeAudio(n); a.loop = true; a.volume = base(n) * mv("bgm"); a.play().catch(() => {}); cur = { a };
        }
      }
      const sync = () => { if (cur && cur.a) cur.a.volume = Math.min(1, base(name) * kk * mv("bgm")); };
      const vol = k => { kk = k; if (!cur || !name) return; const v = base(name) * k; if (cur.g) cur.g.gain.setTargetAtTime(v, ac.currentTime, .4); else cur.a.volume = Math.min(1, v * mv("bgm")); };
      const pending = () => name;
      return { play, stop, vol, sync, pending };
    })();

    const syncVolumes = () => { for (const k in buses) buses[k].gain.value = mv(k); bgm.sync(); };   // <audio> fallback has no bus
    const hushLayer = n => { layer = n; syncVolumes(); };
    const hush = on => { hushed = on; hushLayer(0); };
    const sfxBus = k => { sfxKind = k; };                      // sweep / noise play on this bus ("shot" = the enemy's attacks)
    function unlock() {
      if (ac) return;
      ac = makeCtx();
      const n = bgm.pending(); if (n) { bgm.stop(); bgm.play(n); }   // asked for before the gesture
    }

    return { unlock, sweep, noise, blip, bgm, hush, hushLayer, sfxBus, syncVolumes, get hushed() { return hushed; }, get layer() { return layer; }, get unlocked() { return !!ac; } };
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { createAudio };
  else root.createAudio = createAudio;
})(typeof window !== "undefined" ? window : globalThis);
