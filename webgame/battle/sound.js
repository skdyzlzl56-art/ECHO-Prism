// What a battle sounds like: sim events in -> sweeps / noise out. The rules live here (volley merging, throttles, enemy-shot volume "quiet"), not in the view.
//
//   const snd = createBattleSound({ sweep, noise, bus, hurtTier, fade, beat });
//   snd.event(v)             one sim event (battle.step() returns them); enemy shots are only counted here
//   snd.flush()              once per frame, after all events: turns the counted shots into ONE sound (a ring / wall is one thud, not 30 blips)
//   snd.heartbeat(dt, on)    cfg.beat battles: the one sound left in a silent world
//   snd.quiet                enemy-shot volume 0..1 (cfg.fade: every phase swallows more); the view also gives it to the music
//
// Adapters: sweep(f0, f1, dur, type, vol) / noise(dur, vol) are the real WebAudio in the game and recorders in tests.
// bus(name) is optional (silent fights): enemy attack sounds ride the "shot" bus and everything else the "sfx" bus.
// hurtTier(dmg) -> 0|1|2 sound strength of a hit on the player. now / later / rand default to the clock, setTimeout and Math.random.
(function (root) {
  function createBattleSound({ sweep, noise, bus = null, hurtTier = () => 1, fade = 0, beat = false, now = () => performance.now(), later = (f, ms) => setTimeout(f, ms), rand = Math.random }) {
    let quiet = 1, volley = { n: 0, pw: 0 }, lastTing = 0, lastGraze = 0, lastShot = 0, lastBig = 0, beatT = 0;
    const asShot = f => bus ? (...a) => { bus("shot"); try { return f(...a); } finally { bus("sfx"); } } : f;

    const boom = (v = 1, low = 90) => { const q = quiet * v; sweep(low * 1.6, low * .4, .55, "sine", .6 * q); sweep(low * 2.4, low * .5, .35, "sawtooth", .3 * q); noise(.3, .45 * q); };
    const charge = (dur, v = 1, f = 120) => { const q = quiet * v; sweep(f, f * 8, dur, "sawtooth", .16 * q); sweep(f / 2, f * 4, dur, "sine", .3 * q); sweep(f * 12, f * 28, dur, "square", .035 * q); };

    // enemy shots of one frame: heavy single orbs boom, short volleys thump, rings / walls are one heavy thud
    const flush = asShot(() => {
      const { n, pw } = volley; volley = { n: 0, pw: 0 }; if (!n) return;
      const t = now();
      if (n >= 6) { if (t - lastBig < 250) return; lastBig = t; boom(1, 80); sweep(70, 40, .5, "triangle", .35 * quiet); return; }
      if (n >= 2) { if (t - lastBig < 150) return; lastBig = t; sweep(240, 70, .2, "sine", .45 * quiet); sweep(500, 120, .14, "sawtooth", .16 * quiet); noise(.1, .3 * quiet); return; }
      if (pw >= 1) { if (t - lastBig < 300) return; lastBig = t; charge(.18, .8, 300); later(asShot(() => boom(.8, 110)), 150); return; }          // wind-up, then boom
      if (pw < .3) { if (t - lastShot < 90) return; lastShot = t; sweep(1100 + rand() * 300, 450, .1, "triangle", .18 * quiet); noise(.03, .1 * quiet); return; }
      if (t - lastBig < 200) return; lastBig = t;
      sweep(900 - 300 * pw, 300, .14 + .2 * pw, "sawtooth", (.2 + .15 * pw) * quiet); noise(.08 + .1 * pw, .3 * quiet);
    });

    function event(v) {
      switch (v.type) {
        case "enemyShot": volley.n++; volley.pw = Math.max(volley.pw, (v.size - 6) / 8 + (v.speed - 150) / 400); break;
        case "playerShot": sweep(1000, 700, .05, "triangle", .05); break;
        case "allyShot": sweep(1400, 900, .06, "sine", .05); break;
        case "enemyHit":
          if (v.dmg) { const f = 450 + Math.min(v.combo, 16) * 40; sweep(f, f * 1.6, .08, "square", .13); noise(.04, .2); }
          else { const n = now(); if (n - lastTing > 80) { lastTing = n; sweep(2600, 2500, .3, "sine", .22); sweep(3900, 3800, .2, "sine", .1); } }   // 팅! it can't be hurt
          break;
        case "graze": { const n = now(); if (n - lastGraze > 70) { lastGraze = n; sweep(2200, 3000, .04, "sine", .06); } break; }
        case "playerHurt": {
          const tier = hurtTier(v.dmg);
          if (tier === 0) { noise(.08, .4); sweep(400, 150, .12, "square", .22); }
          else if (tier === 1) { noise(.14, .6); sweep(300, 80, .2, "square", .35); }
          else { noise(.3, .8); sweep(220, 40, .4, "sawtooth", .45); boom(.8, 60); }
          break;
        }
        case "shieldBlock": sweep(900, 1800, .25, "sine", .25); noise(.08, .3); break;
        case "shieldReady": sweep(500, 1200, .3, "sine", .12); break;
        case "heal": sweep(600, 1400, .25, "sine", .12); break;
        case "burst":
          if (!v.dmg) sweep(2600, 2500, .5, "sine", .25);
          sweep(400, 2000, .8, "sine", .3); sweep(200, 1000, .8, "triangle", .2); noise(.3, .4); break;
        case "jointLight": v.allies.forEach((id, i) => later(() => sweep(300 * (1 + i * .25), 2400, 1.1, "sine", .22), i * 120)); noise(.5, .5); break;   // every ally at once: a rising chord
        case "rewind": sweep(1400, 300, .35, "sawtooth", .16); break;
        case "signature": sweep(500, 1800, .4, "sine", .2); break;
        case "dash": sweep(900, 300, .12, "sawtooth", .12); noise(.08, .15); break;
        case "swap": sweep(700, 1500, .15, "sine", .2); break;
        case "phase":
          if (fade) quiet = Math.max(.15, 1 - fade * v.level);                      // each phase swallows more of the sound
          if (v.name) sweep(300, 900, .35, "sawtooth", .18);
          if (!v.start) { noise(.3, .5); sweep(100, 600, .5, "sawtooth", .25); }
          break;
        case "laserWarn": asShot(charge)(v.warn || 1, 1, 110); break;
        case "laserFire": asShot(() => { boom(1.2, 70); sweep(1500, 60, .9, "sawtooth", .3 * quiet); })(); break;
        case "blast": boom(.9, 70); break;
        case "break": noise(.12, .4 * quiet); sweep(500, 90, .22, "square", .2 * quiet); break;
        case "split": noise(.18, .45 * quiet); sweep(900, 100, .3, "sawtooth", .3 * quiet); sweep(2400, 600, .12, "square", .1 * quiet); break;
        case "dashWarn": charge(.9, 1, 90); break;
        case "dashStart": sweep(900, 60, .6, "sawtooth", .35); noise(.35, .4); break;
        case "dashEnd": boom(1.3, 60); break;
        case "lose": noise(.5, .5); sweep(400, 40, 1, "sawtooth", .3); break;
        case "win": noise(.6, .7); sweep(80, 1600, .9, "sawtooth", .3); sweep(200, 40, .6, "sine", .6); break;
      }
    }

    function heartbeat(dt, on) {
      if (beat && on && (beatT -= dt) <= 0) { beatT = .7; sweep(85, 45, .22, "sine", .45); later(() => sweep(70, 40, .2, "sine", .3), 170); }
    }

    return { event, flush, heartbeat, get quiet() { return quiet; } };
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { createBattleSound };
  else root.createBattleSound = createBattleSound;
})(typeof window !== "undefined" ? window : globalThis);
