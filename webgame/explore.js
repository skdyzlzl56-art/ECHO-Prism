// Walking scenes (stage 1 lamp corridor, stage 3 gallery): one engine, a scrolling map several screens wide, HP, hazards, charge-spots and talk points.
// Dialogue shows in a box at the bottom of the scene (never over the floor or the wall). Lines are queued as you pass talk points; Space / Enter / Z / click moves on.
// cfg: { worldW, bond, label, hint, floor:{bg,fill,stroke}, wall(g,t,cam,spots), spots:[{x,y,mem,...}], drawSpot(g,s,t), wisps:{n,color,speed}, beams:bool,
//        talks:[{x,who,text}], allLit:[{who,text}], door:{x,y} | null, revive:{who,text}, hurtLine:{who,text} }
// The rules live in explore-rules.js (createExplore), the scene lifecycle in scene.js (openScene); this draws them and plays their sounds.
// Globals: $, sweep, noise, retrigger, stage, myShape, drawShape, HITBOX, TAU, SPEAKERS, BOND, wrap, drawBlossom, drawFairy, openScene, createExplore.
const EXPLORE_VIEW = { w: 960, h: 540, floorY: 190, floorH: 210, boxY: 412 };

function runExplore(cfg, done) {
  const V = EXPLORE_VIEW, W = cfg.worldW, keys = {};
  const ex = createExplore(cfg, { view: V, hitbox: HITBOX }), { p, lu, fa, hx, spots, wisps, beams, door, FL, MAXHP } = ex;
  const dust = Array.from({ length: 60 }, (_, i) => ({ x: (i * 197) % W, y: (i * 89) % V.h, v: 8 + (i % 5) * 4 }));
  let t = 0, g;
  const end = () => { BOND.base = Math.max(BOND.base, cfg.bond); scene.close(); };
  const play = e => {                                                                  // what the rules heard, as sound and light
    if (e.type === "hurt") { noise(.15, .6); sweep(300, 80, .25, "square", .3); retrigger($("flash"), "on", 300); retrigger(stage, "shake", 300); }
    else if (e.type === "barrage") sweep(520, 260, .12, "square", .05);
    else if (e.type === "beamWarn") sweep(1800, 2300, .15, "square", .12);
    else if (e.type === "beamBoom") { sweep(220, 40, .5, "sawtooth", .25); noise(.25, .35); }
    else if (e.type === "lit") { const i = e.i; sweep(520 + i * 160, 1040 + i * 320, .6, "sine", .16); sweep(260 + i * 80, 520 + i * 160, .6, "triangle", .1); }
    else if (e.type === "doorLocked") sweep(150, 100, .2, "square", .1);
    else if (e.type === "leave") { if (e.door) { sweep(200, 1200, .7, "sawtooth", .2); retrigger($("flash"), "on", 600); } setTimeout(end, e.delay); }
  };

  function draw() {
    const cam = Math.min(W - V.w, Math.max(0, p.x - V.w / 2));
    const vis = (x, pad) => x > cam - pad && x < cam + V.w + pad;   // is it on screen? (the map is far wider than the screen; off-screen things are not drawn)
    g.fillStyle = cfg.floor.bg; g.fillRect(0, 0, V.w, V.h);
    g.save(); g.translate(-cam, 0);
    cfg.wall(g, t, cam, spots);
    g.fillStyle = cfg.floor.fill; g.fillRect(FL.x, FL.y, FL.w, FL.h); g.strokeStyle = cfg.floor.stroke; g.lineWidth = 2; g.strokeRect(FL.x, FL.y, FL.w, FL.h);
    g.fillStyle = "rgba(190,220,255,.3)"; for (const d of dust) { d.y -= d.v / 60; if (d.y < 0) d.y = V.h; if (vis(d.x, 4)) g.fillRect(d.x, d.y, 2, 2); }
    for (const s of spots) if (vis(s.x, 200)) cfg.drawSpot(g, s, t);
    if (door && vis(door.x, 40)) {
      g.fillStyle = ex.open ? "#ffe9a8" : "#2a3358"; g.shadowColor = "#ffd87a"; g.shadowBlur = ex.open ? 24 : 0; g.fillRect(door.x - 20, door.y - 60, 40, 120); g.shadowBlur = 0;
      g.strokeStyle = "#fff"; g.lineWidth = 3; g.strokeRect(door.x - 20, door.y - 60, 40, 120);
    }
    g.save(); g.globalCompositeOperation = "lighter";
    for (const b of beams) {
      if (!vis(b.x, 60)) continue;
      if (b.age < b.warn) { g.globalAlpha = .35 + .4 * Math.abs(Math.sin(b.age * 22)); g.strokeStyle = "#ff7a9a"; g.lineWidth = 2; g.setLineDash([10, 8]); g.beginPath(); g.moveTo(b.x, 90); g.lineTo(b.x, FL.y + FL.h); g.stroke(); g.setLineDash([]); }
      else { const k = 1 - (b.age - b.warn) / b.dur; g.globalAlpha = Math.max(0, k); g.fillStyle = "#ff3b5c"; g.shadowColor = "#ff3b5c"; g.shadowBlur = 24; g.fillRect(b.x - 24 * k, 90, 48 * k, FL.y + FL.h - 90); g.fillStyle = "#fff"; g.fillRect(b.x - 8 * k, 90, 16 * k, FL.y + FL.h - 90); }
    }
    g.shadowBlur = 0; g.globalAlpha = 1;
    for (const w of wisps) {
      if (!vis(w.x, 40)) continue;
      g.save(); g.translate(w.x, w.y); g.rotate(t * 3); g.fillStyle = cfg.wisps.color; g.shadowColor = cfg.wisps.color; g.shadowBlur = 16;
      g.beginPath(); g.moveTo(0, -w.r - 4); g.lineTo(w.r * .7, 0); g.lineTo(0, w.r + 4); g.lineTo(-w.r * .7, 0); g.closePath(); g.fill();
      g.fillStyle = "#fff"; g.beginPath(); g.arc(0, 0, 3, 0, TAU); g.fill(); g.restore();
    }
    const bc = (cfg.barrage && cfg.barrage.color) || (cfg.wisps && cfg.wisps.color) || "#ff7a9a";
    for (const b of ex.bullets) { if (!vis(b.x, 20)) continue; g.fillStyle = bc; g.shadowColor = bc; g.shadowBlur = 12; g.beginPath(); g.arc(b.x, b.y, b.r, 0, TAU); g.fill(); g.shadowBlur = 0; g.fillStyle = "#fff"; g.beginPath(); g.arc(b.x, b.y, b.r * .45, 0, TAU); g.fill(); }
    g.restore();
    if (cfg.hexa) drawHexa(g, hx.x, hx.y, t, SPEAKERS.hexa.color, .8);
    drawBlossom(g, lu.x, lu.y, t, SPEAKERS.lumi.color);
    drawFairy(g, fa.x, fa.y, t, SPEAKERS.voice.color);
    if (ex.dashing) for (let k = 1; k <= 3; k++) { g.save(); g.globalAlpha = .4 / k; g.translate(p.x - ex.dashDir.x * k * 18, p.y - ex.dashDir.y * k * 18); drawShape(g, myShape, 13); g.restore(); }   // afterimages behind a dash
    if (ex.inv <= 0 || Math.floor(ex.inv * 12) % 2) { g.save(); g.translate(p.x, p.y); drawShape(g, myShape, 13); g.fillStyle = "#fff"; g.shadowColor = "#9ad0ff"; g.shadowBlur = 6; g.beginPath(); g.arc(0, 0, HITBOX, 0, TAU); g.fill(); g.restore(); }   // the white dot is what gets hit
    g.restore();

    // HUD (screen space): progress, HP bar, hint, position along the map
    const lit = spots.filter(s => s.lit).length;
    g.font = "bold 22px Galmuri11,'Malgun Gothic'"; g.fillStyle = "#fff"; g.textAlign = "left"; g.textBaseline = "top";
    g.fillText(`${cfg.label} ${lit} / ${spots.length}`, 30, 20);
    g.font = "bold 16px Galmuri11,'Malgun Gothic'"; g.fillText("HP", 30, 54);
    g.fillStyle = "#333"; g.fillRect(62, 54, 160, 16); g.fillStyle = "#fff"; g.fillRect(62, 54, 160 * Math.min(1, (ex.hp + (ex.hurtT > 0 ? 1 : 0)) / MAXHP), 16); g.fillStyle = ex.hp <= 2 ? "#ff5a5a" : "#4fc3ff"; g.fillRect(62, 54, 160 * ex.hp / MAXHP, 16);
    g.font = "bold 14px Galmuri11,'Malgun Gothic'"; g.fillStyle = ex.dashReady >= 1 ? "#9ad0ff" : "#6a7690"; g.fillText("대시 " + keyLabel(MENU.keys.dash), 30, 78);   // dash gauge: fills while it cools down
    g.fillStyle = "#333"; g.fillRect(100, 80, 122, 8); g.fillStyle = ex.dashReady >= 1 ? "#9ad0ff" : "#4a78a8"; g.fillRect(100, 80, 122 * ex.dashReady, 8);
    g.font = "15px Galmuri11,'Malgun Gothic'"; g.fillStyle = "#9ad0ff"; g.fillText(cfg.hint, 250, 22);
    g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(250, 56, 400, 4);
    for (const s of spots) { g.fillStyle = s.lit ? "#ffe9a8" : "#7c8591"; g.fillRect(250 + 400 * s.x / W - 2, 54, 4, 8); }
    g.fillStyle = "#fff"; g.fillRect(250 + 396 * Math.min(1, p.x / W), 51, 4, 14);

    // dialogue box (bottom, outside the play area)
    g.fillStyle = "rgba(5,8,24,.94)"; g.fillRect(0, V.boxY, V.w, V.h - V.boxY);
    const sp = ex.line && ex.line.who ? SPEAKERS[ex.line.who] : null, col = sp ? sp.color : "#cfd8e8";
    g.fillStyle = col; g.fillRect(0, V.boxY, V.w, 2);
    if (ex.line) {
      if (sp) { g.font = "bold 18px Galmuri11,'Malgun Gothic'"; g.fillStyle = col; g.fillText(sp.name, 36, V.boxY + 14); }
      const shown = ex.line.text.slice(0, Math.floor(ex.line.age * 40));
      g.font = (sp ? "" : "italic ") + "22px Galmuri11,'Malgun Gothic'"; g.fillStyle = sp ? "#f4f6ff" : "#ffe9a8";
      wrap(shown, 44).slice(0, 3).forEach((s, i) => g.fillText(s, 36, V.boxY + 42 + i * 28));
      if (ex.line.age > .5 && shown.length === ex.line.text.length) { g.font = "16px Galmuri11,'Malgun Gothic'"; g.fillStyle = "#9ad0ff"; g.textAlign = "right"; g.fillText(ex.q.length ? "▼ Space" : "▼", V.w - 24, V.h - 28); g.textAlign = "left"; }
    }
  }
  const scene = openScene({
    html: `<canvas id="ex" width="960" height="540"></canvas>`, done, click: () => ex.nextLine(),
    key: e => {
      keys[e.code] = true; if (e.code.startsWith("Arrow") || e.code === "Space") e.preventDefault();
      if (e.code === "Space" || e.code === "Enter" || e.code === "KeyZ") ex.nextLine();
      if (e.code === MENU.keys.dash && !e.repeat && ex.dash(keys)) { sweep(900, 300, .12, "sawtooth", .12); noise(.08, .15); }   // dash: a burst that nothing can hit
    },
    keyup: e => { keys[e.code] = false; },
    step(dt) {
      t += dt;
      if (keys[MENU.keys.dash] && (keys.ArrowLeft || keys.ArrowRight || keys.ArrowUp || keys.ArrowDown || keys.KeyW || keys.KeyA || keys.KeyS || keys.KeyD) && ex.dash(keys)) { sweep(900, 300, .12, "sawtooth", .12); noise(.08, .15); }   // 대시 키를 누른 채 이동하면 그 방향으로 대시
      ex.step(dt, keys).forEach(play); draw();
    },
  });
  g = $("ex").getContext("2d");
}
