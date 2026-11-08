// Battle view: canvas drawing, keyboard/mouse, sound and DOM around the rules in battle/sim.js (createBattle).
// Needs: $, sweep, noise, retrigger, bgm, hush, hushLayer, sfxBus (index.html, from audio.js), stage/act/myShape/drawShape/HITBOX (game.js),
// SPEAKERS/TAU (script.js), setPortrait/kickPortrait (portraits.js), createBattle (battle/sim.js).
//
// cfg = {
//   speaker, hp, bgm, color,            enemy portrait key, enemy HP, music name, bullet colour
//   cuts: [.75, .5, .25],               HP ratios where the next phase starts
//   names: ["..."],                     phase (spell) names shown at the start of each phase
//   phases: [h => {...}, ...],          one pattern per phase, built from the helpers h.* (battle/sim.js)
//   moves: [{ x, amp, spd, speed, dash }, ...]   enemy movement per phase: x = "none" | "sway" | "chase", dash = seconds
//                                       between warned body-slams down into the box (0 = never)
//   talks: { 3: [{ who, t }, ...] },    dialogue shown when phase N starts (0 = before the first pattern)
//   ally: "lumi",                       optional companion; strength grows with the bond (유대), see BOND
//   allies: ["lumi", "hexa"],           optional: A swaps the companion (교대); each has its own kit, bond is shared (see KIT in sim.js)
//   invuln, survive: 30,                escape battle: hits deal 0 (팅) and surviving 30s wins; bgm: null = silence, beat = heartbeat
//   silent: true,                       no bgm and no sound effects at all for the whole fight (restored afterwards)
//   fade: .2,                           each phase turns the bgm / enemy-shot volume down by this much
//   playerHp, winText, ew, gauge0 }
// Controls: arrows (+W/S/D) move, Z toggles shooting (ON at start), A swaps companion, Space/Enter/Z/click advance dialogue.
//
// BOND (유대): BOND.base is the story-given level (scenes raise it). In battle, grazing bullets fills the bond gauge;
// a full gauge unleashes "유대의 빛" and raises the level by one (max 4). See battle/sim.js for the exact numbers.
// The level reached is kept (BOND.base) when a battle is won; a lost battle is retried from the level it started with.

const BATTLES = {};
const BOND = { base: 0, lv: 1, xp: 0 };   // lv/xp: level and exp, kept on a win; a loss retries from the values the battle started with

// ---- 첫 전투: 글리치 ----
BATTLES.glitch = {
  speaker: "glitch", hp: 510, bgm: "battle", color: "#ff3b5c",
  names: ["균열 「떨어지는 장벽」", "균열 「겨냥하는 파편」", "균열 「광란의 부채」", "균열 「붕괴의 나선」"],
  moves: [{ x: "sway", amp: 40, spd: .8 }, { x: "sway", amp: 80, spd: 1 }, { x: "sway", amp: 90, spd: 1.2, dash: 9 }, { x: "chase", speed: 70, dash: 7 }],
  phases: [
    h => { h.wall(2.8, 95); h.aim(1.3, 150); },
    h => { h.rain(.5); h.aimFan(1.2, 3, .28, 165); h.wave(2.4, 85); },
    h => { h.fan(1.5, 7, .3, 120, 6, { w: .35 }); h.side(.55); h.laser(3.6, false); },
    h => { h.spiral(.08, 3, .4, 110, 6); h.laser(3, true); h.aim(1, 170, 6); h.ring(2.2, 15, 95, 7); },
  ],
  talks: { 3: [{ who: "glitch", t: "크윽... 아직이야... 아직 끝나지 않았어!" }, { who: "glitch", t: "이 형태... 왜 지워지지 않는 거지...!" }, { who: "glitch", t: "좋아. 남은 전부를, 한꺼번에 쏟아주마!" }] },
};
ACTS.battle = done => runBattle(BATTLES.glitch, done);

// enemy body drawn at its current position (it moves like the player does)
function drawEnemyBody(g, key, x, y, t, warn) {
  const sp = SPEAKERS[key], col = sp.color;
  g.save(); g.translate(x + (warn ? (Math.random() - .5) * 6 : 0), y);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, 60); gr.addColorStop(0, col + "aa"); gr.addColorStop(1, "transparent");
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 60, 0, TAU); g.fill();
  g.strokeStyle = warn ? "#fff" : col; g.shadowColor = col; g.shadowBlur = 18; g.lineWidth = 3;
  if (sp.shape === "rings") {
    for (let i = 0; i < 3; i++) { const q = (t / 2 + i / 3) % 1, r = 12 + 22 * q; g.globalAlpha = 1 - q; g.beginPath(); for (let j = 0; j < 6; j++) g.lineTo(Math.cos(j * 1.047 + .52) * r, Math.sin(j * 1.047 + .52) * r); g.closePath(); g.stroke(); }
    g.globalAlpha = 1; g.fillStyle = col; g.beginPath(); for (let j = 0; j < 6; j++) g.lineTo(Math.cos(j * 1.047 + .52) * 11, Math.sin(j * 1.047 + .52) * 11); g.fill();
  } else if (sp.shape === "orb") {                                                      // silence: a hollow disc, ripples that collapse inward without a sound
    g.fillStyle = "#05080c"; g.beginPath(); g.arc(0, 0, 20, 0, TAU); g.fill(); g.stroke();
    for (let i = 0; i < 3; i++) { const q = (t / 2 + i / 3) % 1; g.globalAlpha = q; g.beginPath(); g.arc(0, 0, 62 - 44 * q, 0, TAU); g.stroke(); }
    g.globalAlpha = 1;
  } else if (sp.shape === "gear") {                                                     // keeper / tick: a toothed wheel turning in steps, one hand fixed up
    g.save(); g.rotate(Math.floor(t * 2) * .26 + Math.min(1, (t * 2 % 1) * 5) * .26); g.fillStyle = col + "33"; g.beginPath();
    for (let i = 0; i < 16; i++) { const R = i % 2 ? 20 : 29, q = i * Math.PI / 8; g.lineTo(Math.cos(q) * R, Math.sin(q) * R); }
    g.closePath(); g.fill(); g.stroke(); g.beginPath(); g.arc(0, 0, 11, 0, TAU); g.stroke(); g.restore();
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -16); g.stroke();
  } else if (sp.shape === "easel") {                                                    // painter: a canvas on a tripod, a grey smear brushed across it
    g.fillStyle = col + "22"; g.beginPath(); g.rect(-20, -26, 40, 32); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(-14, 6); g.lineTo(-24, 28); g.moveTo(14, 6); g.lineTo(24, 28); g.moveTo(0, 6); g.lineTo(0, 24); g.stroke();
    g.globalAlpha = .6 + .3 * Math.sin(t * 3); g.beginPath(); g.moveTo(-14, -10); g.quadraticCurveTo(0, -22, 14, -6); g.stroke(); g.globalAlpha = 1;
  } else if (sp.shape === "page") {                                                     // scrap: a torn sheet tumbling, ruled lines on it
    g.rotate(Math.sin(t * 2) * .5); g.fillStyle = col + "33"; g.beginPath(); g.moveTo(-16, -22); g.lineTo(10, -22); g.lineTo(18, -14); g.lineTo(18, 20); g.lineTo(6, 24); g.lineTo(-6, 18); g.lineTo(-18, 24); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); for (let i = 0; i < 3; i++) { g.moveTo(-10, -10 + i * 9); g.lineTo(i % 2 ? 4 : 10, -10 + i * 9); } g.stroke();
  } else if (sp.shape === "book") {                                                     // librarian: an open book, one page swinging over
    g.fillStyle = col + "22"; g.beginPath(); g.moveTo(0, -18); g.quadraticCurveTo(-18, -26, -34, -16); g.lineTo(-34, 16); g.quadraticCurveTo(-18, 8, 0, 22); g.quadraticCurveTo(18, 8, 34, 16); g.lineTo(34, -16); g.quadraticCurveTo(18, -26, 0, -18); g.fill(); g.stroke();
    const w = Math.cos((t / 1.6 % 1) * Math.PI); g.beginPath(); g.moveTo(0, -18); g.quadraticCurveTo(w * 18, -26, w * 34, -16); g.lineTo(w * 34, 16); g.stroke();
  } else {                                                                              // shard: the glitch's own jagged crystal (and fragment / blot)
    g.rotate(t * .8); g.fillStyle = col + "55"; g.beginPath();
    [26, 10, 22, 8, 28, 11, 20, 9, 24].forEach((R, j) => g.lineTo(Math.cos(j * TAU / 9) * R, Math.sin(j * TAU / 9) * R));
    g.closePath(); g.fill(); g.stroke();
  }
  g.restore();
}

function runBattle(cfg, done) {
  stage.classList.add("battle"); act.hidden = false; setPortrait(SPEAKERS[cfg.speaker]);
  act.innerHTML = `<canvas id="ar" width="960" height="540"></canvas>`;
  const g = $("ar").getContext("2d"), battle = createBattle(cfg, { bondBase: BOND.base, hitbox: HITBOX, lv: BOND.lv, xp: BOND.xp }), s = battle.state, BOX = s.BOX;
  const ALLY_SHOT = { hexa: 6, glitch: 3, keeper: 4 };                              // ally bullet = n-gon (lumi: dot), so companions read apart by their shots too
  const col = cfg.color || "#ff3b5c", keys = {}; let allyCol = cfg.ally && SPEAKERS[cfg.ally].color;
  if (cfg.silent) hush(true);
  const snd = createBattleSound({ sweep, noise, bus: cfg.silent ? sfxBus : null, hurtTier: dmg => hitFeel(dmg, s.maxHp).tier, fade: cfg.fade, beat: cfg.beat });   // battle/sound.js: every sound of the fight
  let trail = [], last = performance.now(), raf, look = { sx: 1, sy: 1, rot: 0, lead: 0 }, wake = [], wk = 0, fdt = 1 / 60, prevP = null;
  const vfx = createBattleFx({ hitFeel, fmtNum, allyCol: () => allyCol, ally: id => SPEAKERS[id] });   // battle/fx.js: floats, sparks, banners, hit-stop, vignette

  const toggle = () => { const on = battle.toggleFire(); sweep(on ? 500 : 400, on ? 900 : 200, .08, "square", .1); };   // 사격 ON/OFF
  const box = createTalkBox({ talk: () => s.talk, advance: () => battle.advance(), text: L => fixKeys(L.t, MENU.keys) });   // typing, advance, skip-hold, wrapping
  const advTalk = () => { if (box.press()) setPortrait(SPEAKERS[cfg.speaker]); };
  const press = () => MENU.open ? 0 : s.talk ? advTalk() : toggle();
  const kd = ev => {
    keys[ev.code] = true; if (ev.key === KEYS.skip) keys.skip = true;
    if (ev.code.startsWith("Arrow") || ev.code === "Space") ev.preventDefault();
    if (ev.repeat) return;
    if (s.over === "lose" && act.onclick) { if (ev.code === "KeyZ" || ev.code === MENU.keys.fire) act.onclick(); return; }   // GAME OVER: Z retries like a click
    if (s.talk) { if (KEYS.advance.includes(ev.code)) advTalk(); }
    else if (ev.code === MENU.keys.fire) toggle();
    else if (ev.code === MENU.keys.swap) battle.swap();                                  // 교대
    else if (ev.code === MENU.keys.dash) battle.dash();                                  // 대시
  };
  const ku = ev => { keys[ev.code] = false; if (ev.key === KEYS.skip) keys.skip = false; };
  const cleanup = () => {
    $("portrait").style.visibility = ""; setCast(null);cancelAnimationFrame(raf); bgm.stop(); if (cfg.silent) hush(false); removeEventListener("keydown", kd); removeEventListener("keyup", ku);
    act.onclick = act.onmousedown = null;
  };
  const end = () => { cleanup(); act.hidden = true; act.innerHTML = ""; stage.classList.remove("battle"); done(); };

  // events from the simulation -> sound (battle/sound.js), looks (battle/fx.js) and the battle's own flow (here)
  const playCue = c => {
    if (c.type === "kick") kickPortrait();
    else if (c.type === "flash") retrigger($("flash"), "on", c.ms);
    else if (c.amp != null) { const st = $("stage"); st.style.setProperty("--a", c.amp); st.style.setProperty("--ms", c.ms + "ms"); retrigger(st, "shake", c.ms); setTimeout(() => { st.style.removeProperty("--a"); st.style.removeProperty("--ms"); }, c.ms + 50); }   // damage-scaled shake
    else retrigger(stage, "shake", c.ms);
  };
  function onEvent(v) {
    snd.event(v);
    if (v.type === "swap") allyCol = SPEAKERS[v.ally].color;
    vfx.event(v, s).forEach(playCue);
    switch (v.type) {
      case "phase":
        if (cfg.silent) { hushLayer(v.level); if (v.level >= 3) ripple(); }   // each phase gives one more thing back: attacks, music, sky, the rest
        if (cfg.fade) bgm.vol(snd.quiet);   // each phase swallows more of the sound
        if (v.talk) box.reset();
        break;
      case "lose":
        bgm.stop();
        setTimeout(() => { act.onclick = () => { cleanup(); runBattle(cfg, done); }; }, 600);
        break;
      case "win":
        BOND.lv = s.lv; BOND.xp = s.xp;
        if (cfg.ally) BOND.base = Math.max(BOND.base, s.bondLv);                         // the bond carries over to the next battle / stage
        bgm.stop();
        setTimeout(end, 1600);
        break;
    }
  }

  // cooldown ring (display only): k 0..1, 1 = ready (bright, thick); null = no such ability, nothing drawn
  const ring = (x, y, r, k, col) => { if (k == null) return; g.save(); g.lineWidth = k >= 1 ? 3 : 2; g.strokeStyle = col; g.shadowColor = col; g.shadowBlur = k >= 1 ? 10 : 0; g.globalAlpha = k >= 1 ? .55 + .35 * Math.abs(Math.sin(s.t * 5)) : .22; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
    if (k > 0 && k < 1) { g.globalAlpha = .9; g.beginPath(); g.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + k * TAU); g.stroke(); } g.restore(); };

  // HUD bar: dark track, optional white "ghost" (what was just lost), the value, a soft highlight on top and a thin outline
  const bar = (x, y, w, h, frac, col, ghost) => {
    g.save(); g.fillStyle = "rgba(10,14,40,.85)"; g.fillRect(x, y, w, h);
    if (ghost) { g.fillStyle = "#fff"; g.fillRect(x, y, w * ghost, h); }
    g.fillStyle = col; g.fillRect(x, y, w * frac, h); g.fillStyle = "rgba(255,255,255,.28)"; g.fillRect(x, y, w * frac, Math.max(1, h * .3));
    g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 1; g.strokeRect(x + .5, y + .5, w - 1, h - 1); g.restore();
  };

  function draw() {
    const { p, e, t } = s, hud = battle.hud();
    g.clearRect(0, 0, 960, 540);
    g.save(); g.globalCompositeOperation = "lighter";
    g.lineWidth = 2; g.strokeStyle = col;                                               // enemy aura: slow rings, faster in later phases
    for (let i = 0; i < 3; i++) { const q = ((t * (.35 + .12 * s.level) + i / 3) % 1); g.globalAlpha = (1 - q) * .45; g.beginPath(); g.arc(e.x, e.y, 60 + q * 90, 0, TAU); g.stroke(); }
    g.globalAlpha = 1;
    if (vfx.hitFlash > 0) {                                                                 // hit effects: soft glow + round burst + sparks
      const gr = g.createRadialGradient(e.x, e.y, 0, e.x, e.y, 120);
      gr.addColorStop(0, `rgba(255,255,255,${vfx.hitFlash * 4})`); gr.addColorStop(1, "rgba(255,80,120,0)");
      g.fillStyle = gr; g.beginPath(); g.arc(e.x, e.y, 120, 0, TAU); g.fill();
    }
    for (const f of vfx.particles) {
      if (f.sp) { g.fillStyle = `rgba(255,220,230,${1 - f.age / .35})`; g.beginPath(); g.arc(f.x, f.y, 3, 0, TAU); g.fill(); continue; }
      const k = f.age / .3, r = 12 + 50 * k, gr = g.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
      gr.addColorStop(0, `rgba(255,255,255,${.9 * (1 - k)})`); gr.addColorStop(.6, `rgba(255,90,120,${.5 * (1 - k)})`); gr.addColorStop(1, "rgba(255,60,100,0)");
      g.fillStyle = gr; g.beginPath(); g.arc(f.x, f.y, r, 0, TAU); g.fill();
      g.strokeStyle = `rgba(255,255,255,${1 - k})`; g.lineWidth = 2; g.beginPath(); g.arc(f.x, f.y, r * .9, 0, TAU); g.stroke();
    }
    for (const l of s.lasers) {                                                         // lasers: thin flickering warning, then a wide beam
      g.save(); g.translate(l.x, l.y); g.rotate(l.a);
      if (l.age < l.warn) {
        g.globalAlpha = .35 + .4 * Math.abs(Math.sin(l.age * 22)); g.strokeStyle = "#fff"; g.lineWidth = 2; g.setLineDash([10, 8]);
        g.beginPath(); g.moveTo(0, 0); g.lineTo(700, 0); g.stroke();
        g.fillStyle = col; g.globalAlpha = .9; g.beginPath(); g.arc(0, 0, 6 + 12 * l.age / l.warn, 0, TAU); g.fill();
      } else {
        const k = 1 - (l.age - l.warn) / l.dur, w = l.w * (.5 + .5 * Math.min(1, k * 3));
        g.globalAlpha = Math.max(0, Math.min(1, k * 2)); g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 24; g.fillRect(0, -w / 2, 700, w);
        g.fillStyle = "#fff"; g.fillRect(0, -w * .22, 700, w * .44);
      }
      g.restore();
    }
    if (e.mode === "warn") {                                                            // body-slam warning: dashed line down to where it will land
      g.globalAlpha = .4 + .5 * Math.abs(Math.sin(e.tt * 20)); g.strokeStyle = "#fff"; g.lineWidth = 3; g.setLineDash([12, 8]);
      g.beginPath(); g.moveTo(e.x, e.y); g.lineTo(e.lx, BOX.y + BOX.h - 30); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
    }
    g.restore();
    drawEnemyBody(g, cfg.speaker, e.x, e.y, t, e.mode === "warn");
    g.fillStyle = "rgba(0,0,20,.7)"; g.fillRect(BOX.x, BOX.y, BOX.w, BOX.h);
    g.save(); g.beginPath(); g.rect(BOX.x, BOX.y, BOX.w, BOX.h); g.clip();
    if (e.y > BOX.y - 40) drawEnemyBody(g, cfg.speaker, e.x, e.y, t, false);           // the enemy is visible inside the box while diving
    for (const z of s.zones) {                                                          // hazard zones: dashed ring while warning, filled pulsing disc once active
      g.save(); g.fillStyle = col; g.strokeStyle = "#fff";
      if (z.age < z.warn) { g.globalAlpha = .35 + .4 * Math.abs(Math.sin(z.age * 14)); g.lineWidth = 2; g.setLineDash([8, 6]); g.beginPath(); g.arc(z.x, z.y, z.r, 0, TAU); g.stroke(); }
      else { g.globalAlpha = .45 + .15 * Math.sin(z.age * 20); g.beginPath(); g.arc(z.x, z.y, z.r, 0, TAU); g.fill(); }
      g.restore();
    }
    g.globalCompositeOperation = "lighter";
    for (const b of s.bullets) {                                                        // glowing bullets with a short trail
      const vis = battle.bulletAlpha(b); if (vis <= 0) continue;                        // 어둠 규칙: beyond the lit radius the bullet is not drawn
      g.fillStyle = b.col;
      b.tr.forEach((q, i) => { g.globalAlpha = (i + 1) / b.tr.length * .35 * vis; g.beginPath(); g.arc(q.x, q.y, b.r * (.4 + .12 * i), 0, TAU); g.fill(); });
      g.globalAlpha = .35 * vis; g.beginPath(); g.arc(b.x, b.y, b.r * 1.9, 0, TAU); g.fill();
      g.globalAlpha = vis; g.shadowColor = b.col; g.shadowBlur = b.r > 8 ? 18 : 10; g.beginPath(); g.arc(b.x, b.y, b.r, 0, TAU); g.fill();
      g.shadowBlur = 0; g.fillStyle = "#fff"; g.beginPath(); g.arc(b.x, b.y, b.r * .45, 0, TAU); g.fill();
      if (b.det && b.hp > 0) { g.save(); g.globalAlpha = (.3 + .25 * Math.sin(t * 9)) * vis; g.strokeStyle = "#ff5a5a"; g.lineWidth = 2; g.setLineDash([6, 6]); g.beginPath(); g.arc(b.x, b.y, b.det, 0, TAU); g.stroke(); g.restore(); }   // bomb: the blast radius
      if (b.hp > 0) { g.globalAlpha = vis; g.strokeStyle = "#fff"; g.lineWidth = 2; g.beginPath(); g.arc(b.x, b.y, b.r + 3, 0, TAU); g.stroke(); g.fillStyle = "#fff"; g.font = "bold 11px sans-serif"; g.textAlign = "center"; g.fillText(fmtNum(b.hp), b.x, b.y + 4); g.fillStyle = b.col; }   // breakable: white ring + hp
      if (b.tg) { g.globalAlpha = vis; g.strokeStyle = "#fff"; g.lineWidth = 2; g.setLineDash(b.st % 2 ? [] : [4, 4]); g.beginPath(); g.arc(b.x, b.y, b.r + 3, 0, TAU); g.stroke(); g.setLineDash([]); }   // toggle: dashed ring = state 0, solid = state 1 (plus colour per state)
    }
    if (vfx.burst > 0) {                                                                  // 유대의 빛: a ring of light sweeping out from the player
      g.globalAlpha = vfx.burst * .8; g.strokeStyle = allyCol; g.lineWidth = 6; g.shadowColor = allyCol; g.shadowBlur = 20;
      g.beginPath(); g.arc(p.x, p.y, Math.max(0, 1 - vfx.burst) * 340, 0, TAU); g.stroke();
    }
    g.restore();
    g.shadowBlur = 12;                                                                  // player shots fly out of the box
    for (const sh of s.shots) { g.fillStyle = sh.ally ? allyCol : "#cff"; g.shadowColor = sh.ally ? allyCol : "#4fc3ff"; if (sh.ally) { g.beginPath(); const n = ALLY_SHOT[s.allyId]; if (n) for (let j = 0; j < n; j++) g.lineTo(sh.x + Math.cos(j * TAU / n + .5) * 7, sh.y + Math.sin(j * TAU / n + .5) * 7); else g.arc(sh.x, sh.y, 5, 0, TAU); g.fill(); } else g.fillRect(sh.x - 2.5, sh.y - 9, 5, 18); }
    g.shadowBlur = 0;
    if (s.al) {                                                                         // companion: blossom that grows with the bond
      const lv = s.bondLv, al = s.al;
      if (s.allyId === "hexa") drawHexa(g, al.x, al.y, t, allyCol, .55 + .1 * lv);          // guardian: pulsing hexagons (scenes.js)
      else if (s.allyId === "glitch") drawGlitch(g, al.x, al.y, t, .8 + .12 * lv);   // shard before s3_morph, crescent blades after (stage3/scenes.js)
      else if (s.allyId === "keeper") drawGearAlly(g, al.x, al.y, t, allyCol, .8 + .12 * lv);   // freed clock keeper: ticking gear (stage4/scenes.js)
      else {
        g.save(); g.translate(al.x, al.y); g.scale(1 + .15 * lv, 1 + .15 * lv); g.strokeStyle = allyCol; g.shadowColor = allyCol; g.shadowBlur = 14 + 4 * lv; g.lineWidth = 2;
        for (let k = 0; k < 6; k++) { const a = t * 1.5 + k * Math.PI / 3; g.beginPath(); g.arc(Math.cos(a) * 9, Math.sin(a) * 9, 7, 0, TAU); g.stroke(); }
        g.fillStyle = "#fff"; g.beginPath(); g.arc(0, 0, 3, 0, TAU); g.fill(); g.restore();
      }
      g.font = "bold 13px Galmuri11,'Malgun Gothic'"; g.fillStyle = allyCol; g.textAlign = "center"; g.fillText(`유대 Lv.${lv}`, al.x, al.y + 30 + 3 * lv);
    }
    if (s.dashT > 0) trail.push({ x: p.x, y: p.y, a: .6 });                            // 잔상: fading copies of the ship
    for (const q of trail) { g.save(); g.globalAlpha = q.a; g.translate(q.x, q.y); g.strokeStyle = "#9ad0ff"; drawShape(g, myShape, 11); g.restore(); q.a -= .04 * fdt * 60; }
    trail = trail.filter(q => q.a > 0);
    if (s.over !== "lose" && (s.inv <= 0 || s.dashT > 0 || Math.floor(s.inv * 12) % 2)) {
      g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = allyCol || "#4fc3ff";   // faint trail of recent positions
      wake.forEach((q, i) => { g.globalAlpha = (i + 1) / wake.length * .18; g.beginPath(); g.arc(q.x, q.y, 3 + 5 * (i + 1) / wake.length, 0, TAU); g.fill(); }); g.restore();
      g.save(); g.translate(p.x + Math.cos(look.rot) * look.lead, p.y + Math.sin(look.rot) * look.lead); g.rotate(look.rot); g.scale(look.sx, look.sy); g.rotate(-look.rot); drawShape(g, myShape, 11); g.fillStyle = "#fff"; g.beginPath(); g.arc(0, 0, 2.5, 0, TAU); g.fill();
      if (s.shieldOn) { g.strokeStyle = allyCol; g.lineWidth = 3; g.shadowColor = allyCol; g.shadowBlur = 14; g.globalAlpha = .6 + .3 * Math.sin(t * 6); g.beginPath(); g.arc(0, 0, 19, 0, TAU); g.stroke(); }
      g.restore();
    }
    if (s.split) {                                                                      // 판 분할: unsafe half red (hatched pulse while warning, solid once live), safe half green, divider down the middle
      const hw = BOX.w / 2, ux = s.split.safe > 0 ? BOX.x : BOX.x + hw, sx = s.split.safe > 0 ? BOX.x + hw : BOX.x;
      g.save(); g.fillStyle = "#3f6"; g.globalAlpha = .18; g.fillRect(sx, BOX.y, hw, BOX.h);
      g.fillStyle = "#f33"; g.globalAlpha = s.split.active ? .45 : .15 + .15 * Math.abs(Math.sin(t * 10)); g.fillRect(ux, BOX.y, hw, BOX.h);
      g.globalAlpha = 1; g.strokeStyle = "#fff"; g.lineWidth = 3; g.setLineDash([8, 6]); g.beginPath(); g.moveTo(BOX.x + hw, BOX.y); g.lineTo(BOX.x + hw, BOX.y + BOX.h); g.stroke(); g.restore();
    }
    if (s.gravity) {                                                                    // 중력 규칙: arrows on the box showing the pull (blinking while warning, edge glow + drifting arrows once live)
      const gv = s.gravity, on = gv.active, cx = BOX.x + BOX.w / 2, cy = BOX.y + BOX.h / 2, ang = Math.atan2(gv.dy, gv.dx);
      g.save(); g.strokeStyle = "#7df"; g.fillStyle = "#7df"; g.lineWidth = 4;
      if (on) { g.globalAlpha = .5; g.shadowColor = "#7df"; g.shadowBlur = 24; g.beginPath(); if (gv.dx) { const x = gv.dx > 0 ? BOX.x + BOX.w : BOX.x; g.moveTo(x, BOX.y); g.lineTo(x, BOX.y + BOX.h); } else { const y = gv.dy > 0 ? BOX.y + BOX.h : BOX.y; g.moveTo(BOX.x, y); g.lineTo(BOX.x + BOX.w, y); } g.stroke(); g.shadowBlur = 0; }
      for (let i = 0; i < 3; i++) {
        const o = on ? (t * 90 + i * 70) % 210 - 105 : (i - 1) * 70;
        g.save(); g.translate(cx + gv.dx * o + gv.dy * (i - 1) * 90 * (on ? 1 : 0), cy + gv.dy * o + gv.dx * (i - 1) * 90 * (on ? 1 : 0)); g.rotate(ang);
        g.globalAlpha = on ? .55 : .15 + .45 * Math.abs(Math.sin(t * 8)); g.beginPath(); g.moveTo(-22, -20); g.lineTo(22, 0); g.lineTo(-22, 20); g.lineTo(-10, 0); g.closePath(); g.fill(); g.restore();
      }
      g.restore();
    }
    if (s.still) {                                                                      // 정지 규칙: "멈춰!" banner; red frame once live (any move hurts)
      const on = s.still.active;
      g.save(); g.textAlign = "center"; g.textBaseline = "middle"; g.font = "bold 44px Galmuri11,'Malgun Gothic'"; g.fillStyle = on ? "#f55" : "#ff0"; g.globalAlpha = on ? .9 : .4 + .5 * Math.abs(Math.sin(t * 10));
      g.fillText(on ? "멈춰!" : "멈춰! 곧 움직이면 아파요", BOX.x + BOX.w / 2, BOX.y + 50);
      g.strokeStyle = on ? "#f33" : "#ff0"; g.lineWidth = 6; g.globalAlpha = on ? .7 : .3; g.strokeRect(BOX.x - 3, BOX.y - 3, BOX.w + 6, BOX.h + 6); g.restore();
    }
    if (hud.invert) {                                                     // 조작 반전: a side panel left of the box with a draining bar (bigger than the old label, which sat on the enemy HP bar), plus a pulsing frame
      const on = hud.invert.on, c = on ? "#f6f" : "#ff0", pu = .6 + .4 * Math.abs(Math.sin(t * (on ? 8 : 14))), px = 40, py = BOX.y + 40, pw = BOX.x - 70, fr = hud.invert.frac;
      g.save(); g.fillStyle = "rgba(10,5,30,.88)"; g.fillRect(px, py, pw, 130); g.strokeStyle = c; g.lineWidth = 4; g.globalAlpha = pu; g.strokeRect(px, py, pw, 130); g.globalAlpha = 1;
      g.textAlign = "center"; g.fillStyle = c; g.font = "bold 30px Galmuri11,'Malgun Gothic'"; g.fillText(on ? "조작 반전!" : "조작 반전 경고", px + pw / 2, py + 40);
      g.font = "bold 40px Galmuri11,'Malgun Gothic'"; g.fillText(on ? "← → ⇄" : "⇄", px + pw / 2, py + 84);   // arrows mirrored
      g.fillStyle = "#333"; g.fillRect(px + 14, py + 100, pw - 28, 16); g.fillStyle = c; g.fillRect(px + 14, py + 100, (pw - 28) * fr, 16);   // time left: until it starts (warning) / until it ends
      g.font = "14px Galmuri11,'Malgun Gothic'"; g.fillStyle = "#fff"; g.fillText(`${on ? "끝날 때까지" : "시작까지"} ${hud.invert.left.toFixed(1)}초`, px + pw / 2, py + 125);
      g.strokeStyle = c; g.lineWidth = 6; g.globalAlpha = pu * .8; g.strokeRect(BOX.x - 3, BOX.y - 3, BOX.w + 6, BOX.h + 6); g.restore();
    }
    g.strokeStyle = "#fff"; g.lineWidth = 4; g.strokeRect(BOX.x, BOX.y, BOX.w, BOX.h);

    if (hud.enemy.survive) {                                                            // escape battle: the enemy can't be hurt, so show the clock instead of its HP
      bar(BOX.x, 168, BOX.w, 10, hud.enemy.frac, "#7dd3ff");
      g.font = "bold 16px Galmuri11,'Malgun Gothic'"; g.textAlign = "right"; g.fillStyle = "#7dd3ff"; g.fillText(`탈출까지 ${Math.ceil(hud.enemy.left)}초`, BOX.x + BOX.w, 164); g.textAlign = "left";
    } else bar(BOX.x, 168, BOX.w, 10, hud.enemy.frac, hud.enemy.enraged ? "#ff3b5c" : "#ffd84f", hud.enemy.ghost);   // enemy HP bar
    g.font = "bold 16px Galmuri11,'Malgun Gothic'"; g.textAlign = "left"; g.textBaseline = "bottom"; g.fillStyle = SPEAKERS[cfg.speaker].color; g.fillText(SPEAKERS[cfg.speaker].name, BOX.x, 164);
    g.font = "bold 26px Galmuri11,'Malgun Gothic'"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#fff";
    for (const f of vfx.floats) { g.globalAlpha = 1 - f.age / .6; g.fillStyle = f.col || "#fff"; const hw = (+g.measureText(f.txt).width || 0) / 2 + 8; g.fillText(f.txt, Math.max(hw, Math.min(960 - hw, f.x)), f.y - f.age * 60); }   // long lines stay inside the canvas
    g.globalAlpha = 1;
    if (hud.combo > 2) { g.font = "bold 22px Galmuri11,'Malgun Gothic'"; g.fillStyle = "#9ad0ff"; g.textAlign = "left"; g.fillText(`${fmtNum(hud.combo)} HIT`, BOX.x + BOX.w + 20, 215); }

    g.font = "20px Galmuri11,'Malgun Gothic'"; g.textAlign = "left"; g.fillStyle = "#fff"; g.fillText(`HP ${fmtNum(hud.player.hp)} / ${fmtNum(hud.player.max)}`, BOX.x, 485);
    bar(BOX.x + 130, 475, 170, 20, hud.player.frac, hud.player.frac <= .25 ? "#ff5a5a" : "#4fc3ff", hud.player.ghost);   // turns red when low
    g.font = "bold 18px Galmuri11,'Malgun Gothic'"; g.textAlign = "left"; g.fillStyle = "#ffd36b"; g.fillText(`Lv.${hud.lv}`, 20, 485);   // level + exp bar, bottom-left, clear of HP and the controls hint
    bar(80, 475, 200, 12, hud.xp, "#ffd36b");
    g.font = "bold 20px Galmuri11,'Malgun Gothic'"; g.textAlign = "left"; g.fillStyle = hud.auto ? "#7dffb0" : "#889"; g.fillText(hud.auto ? "사격 ON" : "사격 OFF", BOX.x + BOX.w + 20, 250);
    if (hud.bond) {                                                                     // bond gauge: fills by grazing bullets
      g.font = "bold 15px Galmuri11,'Malgun Gothic'"; g.fillStyle = allyCol; g.fillText(`유대 Lv.${hud.bond.lv}${hud.bond.shield ? " · 방패" : ""}`, BOX.x + BOX.w + 20, 276);
      bar(BOX.x + BOX.w + 20, 288, 120, 8, hud.bond.gauge, allyCol);
      g.font = "12px Galmuri11,'Malgun Gothic'"; g.fillStyle = "#9ab"; g.fillText("탄을 아슬하게 스치면 충전", BOX.x + BOX.w + 20, 308);
    }
    {                                                                                   // cooldown rings: dash around the player, heal / shield / special around the companion out now; bright + thick when ready
      const cr = battle.cooldownRings();
      if (s.over !== "lose") ring(p.x, p.y, 25, cr.dash, "#9ad0ff");
      if (s.hasAlly && s.al && s.over !== "lose") { ring(s.al.x, s.al.y, 21, cr.heal, "#7f7"); ring(s.al.x, s.al.y, 26, cr.shield, allyCol || "#4fc3ff"); if (cfg.allies) ring(s.al.x, s.al.y, 31, cr.sig, "#fd6"); }
    }
    g.font = "16px Galmuri11,'Malgun Gothic'"; g.fillStyle = "#9ad0ff"; g.textAlign = "right"; g.fillText(`이동: 방향키 · 사격 ON/OFF: ${keyLabel(MENU.keys.fire)} 또는 클릭 · 대시: ${keyLabel(MENU.keys.dash)}` + (cfg.allies ? ` · 교대: ${keyLabel(MENU.keys.swap)}` : "") + " · 메뉴: C", BOX.x + BOX.w, 515);
    const ban = vfx.banner;
    if (ban) {                                                                       // phase (spell) name / bond announcement
      const k = ban.age, a = Math.min(1, k * 4, (3 - k) * 2), sx = BOX.x + BOX.w + 20 + (1 - Math.min(1, k * 4)) * 30;
      g.globalAlpha = Math.max(0, a); g.textAlign = "left"; g.textBaseline = "middle";
      g.font = "bold 14px Galmuri11,'Malgun Gothic'"; g.fillStyle = ban.bond ? allyCol : col;
      if (!ban.bond) g.fillText(`PHASE ${ban.level + 1}`, sx, 340);
      g.font = "bold 20px Galmuri11,'Malgun Gothic'"; g.fillStyle = ban.bond ? allyCol : "#fff"; g.fillText(ban.txt, sx, ban.bond ? 370 : 366);
      g.globalAlpha = 1;
    }
    if (s.talk) {
      const T = box.view(w => g.measureText(w).width, 740), sp = SPEAKERS[T.who];
      g.fillStyle = "rgba(0,0,0,.7)"; g.fillRect(0, 0, 960, 540);
      g.fillStyle = "#0b1026"; g.fillRect(60, 400, 840, 120); g.strokeStyle = "#fff"; g.lineWidth = 4; g.strokeRect(60, 400, 840, 120);
      g.textAlign = "left"; g.textBaseline = "top"; g.font = "bold 24px Galmuri11,'Malgun Gothic'"; g.fillStyle = sp.color; g.fillText(sp.name, 84, 414);
      g.font = "24px Galmuri11,'Malgun Gothic'"; g.fillStyle = "#fff";                    // the whole line is wrapped to the box (measured, so any font fits); the typewriter reveals it in place
      let ly = 446;
      for (const row of T.rows) { g.fillText(row, 84, ly); ly += 34; }
      if (T.done) { g.textAlign = "right"; g.fillText("▼", 880, 480); }
      g.textBaseline = "middle";
    }
    if (s.over) {
      if (s.over === "lose") { g.fillStyle = "rgba(0,0,0,.65)"; g.fillRect(0, 270, 960, 150); }
      g.textAlign = "center"; g.font = "bold 56px Galmuri11,'Malgun Gothic'"; g.fillStyle = s.over === "win" ? "#9ad0ff" : "#ff3b5c";
      g.fillText(s.over === "win" ? (cfg.winText || "격파!") : "GAME OVER", 480, 320);
      if (s.over === "lose" && act.onclick) { g.font = "22px Galmuri11,'Malgun Gothic'"; g.fillStyle = "#fff"; g.fillText("클릭하여 재도전", 480, 375); }
    }
    g.textAlign = "left";
  }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, .05); last = now; fdt = dt;
    if (MENU.open) { raf = requestAnimationFrame(frame); return; }                       // menu open: everything stops (the menu is a DOM overlay)
    $("portrait").style.visibility = s.talk ? "visible" : "hidden";                     // the enemy body is drawn on the field; the portrait only shows while someone talks
    if (s.talk) { if (box.tick(dt, keys[KEYS.fast], keys.skip)) setPortrait(SPEAKERS[cfg.speaker]); if (s.talk) { setPortrait(SPEAKERS[s.talk.lines[s.talk.i].who]); setCast([...new Set(s.talk.lines.map(l => l.who))].map(w => SPEAKERS[w])); } }   // nextLine() on the last line clears s.talk
    else {
      setCast(null);
      const input = { dx: (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft ? 1 : 0), dy: (keys.ArrowDown || keys.KeyS ? 1 : 0) - (keys.ArrowUp || keys.KeyW ? 1 : 0) };
      if (keys[MENU.keys.dash] && (input.dx || input.dy)) battle.dash();                // 대시 키를 누른 채 이동하면 그 방향으로 대시 (쿨다운 끝나면 자동 재발동)
      if (!vfx.frozen(dt)) for (const v of battle.step(dt, input)) onEvent(v);           // hit-stop: the world freezes for a moment after a heavy hit
      if (prevP && dt > 0) moveLook(look, (s.p.x - prevP.x) / dt, (s.p.y - prevP.y) / dt, dt);   // display only: reads the position, never writes it
      for (wk += dt * 60; wk >= 1; wk--) {                                               // wake ticks at 60 steps/s whatever the frame rate
        if (prevP && (s.p.x !== prevP.x || s.p.y !== prevP.y)) wake.push({ x: prevP.x, y: prevP.y });
        else if (wake.length) wake.shift();
        if (wake.length > 6) wake.shift();
      }
      prevP = { x: s.p.x, y: s.p.y };
      snd.flush();
      snd.heartbeat(dt, !s.over && s.t > 0);
      vfx.step(dt);
      const low = isLowHp(s.hp, s.maxHp); $("vig").style.opacity = Math.max(vfx.vignette, low ? .25 + .2 * Math.sin(s.t * 6) : 0);   // red edge: hit flash, plus a heartbeat pulse at low hp
    }
    draw(); raf = requestAnimationFrame(frame);
  }
  addEventListener("keydown", kd); addEventListener("keyup", ku); act.onmousedown = press;
  if (cfg.bgm) bgm.play(cfg.bgm); else bgm.stop(); raf = requestAnimationFrame(frame);
}
