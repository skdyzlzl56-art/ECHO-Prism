// Walking scenes (stage 1 lamp corridor, stage 3 gallery): one engine, a scrolling map several screens wide, HP, hazards, charge-spots and talk points.
// Dialogue shows in a box at the bottom of the scene (never over the floor or the wall). Lines are queued as you pass talk points; Space / Enter / Z / click moves on.
// cfg: { worldW, bond, label, hint, floor:{bg,fill,stroke}, wall(g,t,cam,spots), spots:[{x,y,mem,...}], drawSpot(g,s,t), wisps:{n,color,speed}, beams:bool,
//        talks:[{x,who,text}], allLit:[{who,text}], door:{x,y} | null, revive:{who,text}, hurtLine:{who,text} }
// Globals: $, sweep, noise, retrigger, stage, act, myShape, drawShape, TAU, SPEAKERS, BOND, wrap, drawBlossom, drawFairy.
const EXPLORE_VIEW = { w: 960, h: 540, floorY: 190, floorH: 210, boxY: 412 };

function runExplore(cfg, done) {
  const V = EXPLORE_VIEW, W = cfg.worldW, MAXHP = 5;
  stage.classList.add("pick"); act.hidden = false;
  act.innerHTML = `<canvas id="ex" width="960" height="540"></canvas>`;
  const g = $("ex").getContext("2d"), keys = {}, FL = { x: 30, y: V.floorY, w: W - 60, h: V.floorH };
  const spots = cfg.spots.map(o => ({ ...o, lit: 0, ch: 0 }));
  const door = cfg.door || null, p = { x: 90, y: FL.y + FL.h / 2 }, lu = { x: 50, y: p.y }, fa = { x: 120, y: p.y - 30 };
  const wn = cfg.wisps ? cfg.wisps.n : 0, wisps = Array.from({ length: wn }, (_, i) => {   // each crack patrols its own stretch of the floor
    const x0 = 360 + i * (W - 520) / wn, a = i * 2.4, sp = cfg.wisps.speed || 120;
    return { x0, x1: x0 + 520, x: x0 + 260, y: FL.y + 30 + (i * 53) % (FL.h - 60), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 13 };
  });
  const beams = [], dust = Array.from({ length: 60 }, (_, i) => ({ x: (i * 197) % W, y: (i * 89) % V.h, v: 8 + (i % 5) * 4 }));
  const talks = cfg.talks.map(o => ({ ...o, done: false }));
  let t = 0, last = performance.now(), raf, q = [], line = null, open = false, fin = false, hint = 0, inv = 0, hp = MAXHP, bt = 3, check = 90, hurtT = 0;
  const say = (who, text) => q.push({ who, text });
  const nextLine = () => { if (line && line.age > .5) line = q.length ? { ...q.shift(), age: 0 } : null; };
  const kd = e => {
    keys[e.code] = true; if (e.code.startsWith("Arrow") || e.code === "Space") e.preventDefault();
    if (e.code === "Space" || e.code === "Enter" || e.code === "KeyZ") nextLine();
  };
  const ku = e => { keys[e.code] = false; };
  act.onclick = nextLine;
  const end = () => {
    cancelAnimationFrame(raf); removeEventListener("keydown", kd); removeEventListener("keyup", ku); act.onclick = null;
    BOND.base = Math.max(BOND.base, cfg.bond);
    act.hidden = true; act.innerHTML = ""; stage.classList.remove("pick"); done();
  };
  const clampP = () => { p.x = Math.min(FL.x + FL.w - 14, Math.max(FL.x + 14, p.x)); p.y = Math.min(FL.y + FL.h - 14, Math.max(FL.y + 14, p.y)); };
  const hurt = (ax, ay) => {                                                           // knockback, -1 HP, the charge you were gathering scatters
    if (inv > 0 || fin) return; inv = 1.3; hp--; hurtT = .6;
    const d = Math.hypot(p.x - ax, p.y - ay) || 1; p.x += (p.x - ax) / d * 70; p.y += (p.y - ay) / d * 70; clampP();
    for (const s of spots) if (!s.lit) s.ch = 0;
    noise(.15, .6); sweep(300, 80, .25, "square", .3); retrigger($("flash"), "on", 300); retrigger(stage, "shake", 300);
    if (hp <= 0) {                                                                     // fall: back to the last lit spot with full HP (no game over)
      hp = MAXHP; inv = 2; p.x = check; p.y = FL.y + FL.h / 2; q.length = 0; line = null; say(cfg.revive.who, cfg.revive.text);
    } else if (hp === 2) say(cfg.hurtLine.who, cfg.hurtLine.text);
  };

  function update(dt) {
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
        if (bt <= 0 && p.x > 300) { bt = 3.4 - .4 * nLit; beams.push({ x: Math.random() < .55 ? p.x : p.x - 380 + Math.random() * 760, age: 0, warn: 1, dur: .45, boom: false }); sweep(1800, 2300, .15, "square", .12); }
        for (const b of beams) {
          b.age += dt;
          if (!b.boom && b.age >= b.warn) { b.boom = true; sweep(220, 40, .5, "sawtooth", .25); noise(.25, .35); }
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
        sweep(520 + i * 160, 1040 + i * 320, .6, "sine", .16); sweep(260 + i * 80, 520 + i * 160, .6, "triangle", .1); say(null, s.mem);
        if (spots.every(m => m.lit)) { cfg.allLit.forEach(l => say(l.who, l.text)); if (door) open = true; else { fin = true; setTimeout(end, 6500); } }
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
      if (open) { fin = true; sweep(200, 1200, .7, "sawtooth", .2); retrigger($("flash"), "on", 600); setTimeout(end, 800); }
      else if (hint <= 0) { hint = 3; say(null, `아직 ${spots.filter(s => !s.lit).length}곳이 남아 있다.`); sweep(150, 100, .2, "square", .1); }
    }
  }

  function draw() {
    const cam = Math.min(W - V.w, Math.max(0, p.x - V.w / 2));
    g.fillStyle = cfg.floor.bg; g.fillRect(0, 0, V.w, V.h);
    g.save(); g.translate(-cam, 0);
    cfg.wall(g, t, cam, spots);
    g.fillStyle = cfg.floor.fill; g.fillRect(FL.x, FL.y, FL.w, FL.h); g.strokeStyle = cfg.floor.stroke; g.lineWidth = 2; g.strokeRect(FL.x, FL.y, FL.w, FL.h);
    g.fillStyle = "rgba(190,220,255,.3)"; for (const d of dust) { d.y -= d.v / 60; if (d.y < 0) d.y = V.h; g.fillRect(d.x, d.y, 2, 2); }
    for (const s of spots) cfg.drawSpot(g, s, t);
    if (door) {
      g.fillStyle = open ? "#ffe9a8" : "#2a3358"; g.shadowColor = "#ffd87a"; g.shadowBlur = open ? 24 : 0; g.fillRect(door.x - 20, door.y - 60, 40, 120); g.shadowBlur = 0;
      g.strokeStyle = "#fff"; g.lineWidth = 3; g.strokeRect(door.x - 20, door.y - 60, 40, 120);
    }
    g.save(); g.globalCompositeOperation = "lighter";
    for (const b of beams) {
      if (b.age < b.warn) { g.globalAlpha = .35 + .4 * Math.abs(Math.sin(b.age * 22)); g.strokeStyle = "#ff7a9a"; g.lineWidth = 2; g.setLineDash([10, 8]); g.beginPath(); g.moveTo(b.x, 90); g.lineTo(b.x, FL.y + FL.h); g.stroke(); g.setLineDash([]); }
      else { const k = 1 - (b.age - b.warn) / b.dur; g.globalAlpha = Math.max(0, k); g.fillStyle = "#ff3b5c"; g.shadowColor = "#ff3b5c"; g.shadowBlur = 24; g.fillRect(b.x - 24 * k, 90, 48 * k, FL.y + FL.h - 90); g.fillStyle = "#fff"; g.fillRect(b.x - 8 * k, 90, 16 * k, FL.y + FL.h - 90); }
    }
    g.shadowBlur = 0; g.globalAlpha = 1;
    for (const w of wisps) {
      g.save(); g.translate(w.x, w.y); g.rotate(t * 3); g.fillStyle = cfg.wisps.color; g.shadowColor = cfg.wisps.color; g.shadowBlur = 16;
      g.beginPath(); g.moveTo(0, -w.r - 4); g.lineTo(w.r * .7, 0); g.lineTo(0, w.r + 4); g.lineTo(-w.r * .7, 0); g.closePath(); g.fill();
      g.fillStyle = "#fff"; g.beginPath(); g.arc(0, 0, 3, 0, TAU); g.fill(); g.restore();
    }
    g.restore();
    drawBlossom(g, lu.x, lu.y, t, SPEAKERS.lumi.color);
    drawFairy(g, fa.x, fa.y, t, SPEAKERS.voice.color);
    if (inv <= 0 || Math.floor(inv * 12) % 2) { g.save(); g.translate(p.x, p.y); drawShape(g, myShape, 13); g.restore(); }
    g.restore();

    // HUD (screen space): progress, HP bar, hint, position along the map
    const lit = spots.filter(s => s.lit).length;
    g.font = "bold 22px Galmuri11,'Malgun Gothic'"; g.fillStyle = "#fff"; g.textAlign = "left"; g.textBaseline = "top";
    g.fillText(`${cfg.label} ${lit} / ${spots.length}`, 30, 20);
    g.font = "bold 16px Galmuri11,'Malgun Gothic'"; g.fillText("HP", 30, 54);
    g.fillStyle = "#333"; g.fillRect(62, 54, 160, 16); g.fillStyle = "#fff"; g.fillRect(62, 54, 160 * Math.min(1, (hp + (hurtT > 0 ? 1 : 0)) / MAXHP), 16); g.fillStyle = hp <= 2 ? "#ff5a5a" : "#4fc3ff"; g.fillRect(62, 54, 160 * hp / MAXHP, 16);
    g.font = "15px Galmuri11,'Malgun Gothic'"; g.fillStyle = "#9ad0ff"; g.fillText(cfg.hint, 250, 22);
    g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(250, 56, 400, 4);
    for (const s of spots) { g.fillStyle = s.lit ? "#ffe9a8" : "#7c8591"; g.fillRect(250 + 400 * s.x / W - 2, 54, 4, 8); }
    g.fillStyle = "#fff"; g.fillRect(250 + 396 * Math.min(1, p.x / W), 51, 4, 14);

    // dialogue box (bottom, outside the play area)
    g.fillStyle = "rgba(5,8,24,.94)"; g.fillRect(0, V.boxY, V.w, V.h - V.boxY);
    const sp = line && line.who ? SPEAKERS[line.who] : null, col = sp ? sp.color : "#cfd8e8";
    g.fillStyle = col; g.fillRect(0, V.boxY, V.w, 2);
    if (line) {
      if (sp) { g.font = "bold 18px Galmuri11,'Malgun Gothic'"; g.fillStyle = col; g.fillText(sp.name, 36, V.boxY + 14); }
      const shown = line.text.slice(0, Math.floor(line.age * 40));
      g.font = (sp ? "" : "italic ") + "22px Galmuri11,'Malgun Gothic'"; g.fillStyle = sp ? "#f4f6ff" : "#ffe9a8";
      wrap(shown, 44).slice(0, 3).forEach((s, i) => g.fillText(s, 36, V.boxY + 42 + i * 28));
      if (line.age > .5 && shown.length === line.text.length) { g.font = "16px Galmuri11,'Malgun Gothic'"; g.fillStyle = "#9ad0ff"; g.textAlign = "right"; g.fillText(q.length ? "▼ Space" : "▼", V.w - 24, V.h - 28); g.textAlign = "left"; }
    }
  }
  function step(now) { const dt = Math.min((now - last) / 1000, .05); last = now; t += dt; update(dt); draw(); raf = requestAnimationFrame(step); }
  addEventListener("keydown", kd); addEventListener("keyup", ku); raf = requestAnimationFrame(step);
}
