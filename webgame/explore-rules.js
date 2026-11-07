// The rules of a walking scene (explore.js draws them): movement, the cracks and lightning that hurt, HP and checkpoints, lighting the spots, the door and the talk queue.
//
//   const ex = createExplore(cfg, { view, rand });          cfg: see explore.js. view: { floorY, floorH }. rand defaults to Math.random.
//   ex.step(dt, keys)    one frame; keys = { ArrowLeft: true, KeyD: true, ... }. Returns the events the view must play (sound / flash), in order:
//                        { type: "hurt" } · { type: "beamWarn" } · { type: "beamBoom" } · { type: "lit", i } · { type: "doorLocked" }
//                        · { type: "leave", delay, door } (the scene ends after delay ms; door = walked through, else the last lamp lit in a doorless scene)
//   ex.nextLine()        a press on the dialogue box: moves to the next queued line once the current one has shown for half a second
//   ex.p / lu / fa / spots / wisps / beams / door / FL / MAXHP    positions and things to draw (read-only)
//   ex.hp / inv / hurtT / open / fin / line / q                   state to draw (read-only): line = the line being shown, q = the lines waiting
(function (root) {
  function createExplore(cfg, { view: V, rand = Math.random }) {
    const W = cfg.worldW, MAXHP = 5, FL = { x: 30, y: V.floorY, w: W - 60, h: V.floorH };
    const spots = cfg.spots.map(o => ({ ...o, lit: 0, ch: 0 }));
    const door = cfg.door || null, p = { x: 90, y: FL.y + FL.h / 2 }, lu = { x: 50, y: p.y }, fa = { x: 120, y: p.y - 30 };
    const wn = cfg.wisps ? cfg.wisps.n : 0, wisps = Array.from({ length: wn }, (_, i) => {   // each crack patrols its own stretch of the floor
      const x0 = 360 + i * (W - 520) / wn, a = i * 2.4, sp = cfg.wisps.speed || 120;
      return { x0, x1: x0 + 520, x: x0 + 260, y: FL.y + 30 + (i * 53) % (FL.h - 60), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 13 };
    });
    const beams = [], talks = cfg.talks.map(o => ({ ...o, done: false }));
    let q = [], line = null, open = false, fin = false, hint = 0, inv = 0, hp = MAXHP, bt = 3, check = 90, hurtT = 0;
    const say = (who, text) => q.push({ who, text });
    const clampP = () => { p.x = Math.min(FL.x + FL.w - 14, Math.max(FL.x + 14, p.x)); p.y = Math.min(FL.y + FL.h - 14, Math.max(FL.y + 14, p.y)); };
    const nextLine = () => { if (line && line.age > .5) line = q.length ? { ...q.shift(), age: 0 } : null; };

    function step(dt, keys) {
      const ev = [];
      const hurt = (ax, ay) => {                                                           // knockback, -1 HP, the charge you were gathering scatters
        if (inv > 0 || fin) return; inv = 1.3; hp--; hurtT = .6;
        const d = Math.hypot(p.x - ax, p.y - ay) || 1; p.x += (p.x - ax) / d * 70; p.y += (p.y - ay) / d * 70; clampP();
        for (const s of spots) if (!s.lit) s.ch = 0;
        ev.push({ type: "hurt" });
        if (hp <= 0) {                                                                     // fall: back to the last lit spot with full HP (no game over)
          hp = MAXHP; inv = 2; p.x = check; p.y = FL.y + FL.h / 2; q.length = 0; line = null; say(cfg.revive.who, cfg.revive.text);
        } else if (hp === 2) say(cfg.hurtLine.who, cfg.hurtLine.text);
      };

      const dx = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
      const dy = (keys.ArrowDown || keys.KeyS ? 1 : 0) - (keys.ArrowUp || keys.KeyW ? 1 : 0), n = Math.hypot(dx, dy) || 1;
      inv -= dt; hurtT -= dt;
      if (!fin) { p.x += dx / n * 200 * dt; p.y += dy / n * 200 * dt; clampP(); }
      lu.x += (p.x - 46 - lu.x) * Math.min(1, dt * 4); lu.y += (p.y + 6 - lu.y) * Math.min(1, dt * 4);
      fa.x += (p.x + 30 - fa.x) * Math.min(1, dt * 5); fa.y += (p.y - 34 - fa.y) * Math.min(1, dt * 5);
      const nLit = spots.filter(s => s.lit).length;
      for (const o of talks) if (!o.done && p.x >= o.x) { o.done = true; say(o.who, o.text); }

      if (!open && !fin) {
        for (const w of wisps) {
          w.x += w.vx * dt; w.y += w.vy * dt;
          if (w.x < w.x0 + w.r || w.x > w.x1 - w.r) { w.vx *= -1; w.x = Math.min(w.x1 - w.r, Math.max(w.x0 + w.r, w.x)); }
          if (w.y < FL.y + w.r || w.y > FL.y + FL.h - w.r) { w.vy *= -1; w.y = Math.min(FL.y + FL.h - w.r, Math.max(FL.y + w.r, w.y)); }
          if (Math.hypot(w.x - p.x, w.y - p.y) < w.r + 9) hurt(w.x, w.y);
        }
        if (cfg.beams) {
          bt -= dt;
          if (bt <= 0 && p.x > 300) { bt = 3.4 - .4 * nLit; beams.push({ x: rand() < .55 ? p.x : p.x - 380 + rand() * 760, age: 0, warn: 1, dur: .45, boom: false }); ev.push({ type: "beamWarn" }); }
          for (const b of beams) {
            b.age += dt;
            if (!b.boom && b.age >= b.warn) { b.boom = true; ev.push({ type: "beamBoom" }); }
            if (b.boom && b.age < b.warn + b.dur && Math.abs(p.x - b.x) < 24) hurt(b.x, p.y);
          }
          for (let i = beams.length - 1; i >= 0; i--) if (beams[i].age > beams[i].warn + beams[i].dur + .1) beams.splice(i, 1);
        }
      } else { wisps.length = 0; beams.length = 0; }

      spots.forEach((s, i) => {
        if (s.lit) { s.lit += dt; return; }
        s.ch = Math.hypot(s.x - p.x, s.y - p.y) < 56 && inv <= 0 ? Math.min(1, s.ch + dt / 1.3) : Math.max(0, s.ch - dt * .7);
        if (s.ch >= 1) {
          s.lit = .001; check = Math.max(check, s.x - 70); hp = Math.min(MAXHP, hp + 1);   // a restored spot is a checkpoint and heals one
          ev.push({ type: "lit", i }); say(null, s.mem);
          if (spots.every(m => m.lit)) { cfg.allLit.forEach(l => say(l.who, l.text)); if (door) open = true; else { fin = true; ev.push({ type: "leave", delay: 6500, door: false }); } }
        }
      });
      if (!line && q.length) line = { ...q.shift(), age: 0 };
      if (line) {
        line.age += dt;
        const need = Math.max(1.6, 2.6 + line.text.length * .045 - q.length * .5);
        if (line.age > need) line = q.length ? { ...q.shift(), age: 0 } : (line.age > need + 3 ? null : line);
      }
      hint -= dt;
      if (door && !fin && Math.hypot(door.x - p.x, door.y - p.y) < 46) {
        if (open) { fin = true; ev.push({ type: "leave", delay: 800, door: true }); }
        else if (hint <= 0) { hint = 3; say(null, `아직 ${spots.filter(s => !s.lit).length}곳이 남아 있다.`); ev.push({ type: "doorLocked" }); }
      }
      return ev;
    }

    return {
      step, nextLine, p, lu, fa, spots, wisps, beams, door, FL, MAXHP,
      get hp() { return hp; }, get inv() { return inv; }, get hurtT() { return hurtT; }, get open() { return open; }, get fin() { return fin; }, get line() { return line; }, get q() { return q; },
    };
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { createExplore };
  else root.createExplore = createExplore;
})(typeof window !== "undefined" ? window : globalThis);
