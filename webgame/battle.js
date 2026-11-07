// Battle view: canvas drawing, keyboard/mouse, sound and DOM around the rules in battle/sim.js (createBattle).
// Needs: ac, $, sweep, noise, retrigger, bgm (index.html), stage/act/myShape/drawShape/HITBOX (game.js),
// SPEAKERS/TAU (script.js), setPortrait/kickPortrait (portraits.js), createBattle (battle/sim.js).
//
// cfg = {
//   speaker, hp, bgm, color,            enemy portrait key, enemy HP, music name, bullet colour
//   cuts: [.75, .5, .25],               HP ratios where the next phase starts
//   names: ["..."],                     phase (spell) names shown at the start of each phase
//   phases: [h => {...}, ...],          one pattern per phase, built from the helpers h.* (battle/sim.js)
//   moves: [{ x, amp, spd, speed, dash }, ...]   enemy movement per phase: x = "none" | "sway" | "chase", dash = seconds
//                                       between warned body-slams down into the box (0 = never)
//   talks: { 3: [{ who, t }, ...] },    dialogue shown when phase N starts
//   ally: "lumi",                       optional companion; strength grows with the bond (유대), see BOND
//   allies: ["lumi", "hexa"],           optional: A swaps the companion (교대); each has its own kit, bond is shared (see KIT in sim.js)
//   invuln, survive: 30,                escape battle: hits deal 0 (팅) and surviving 30s wins; bgm: null = silence, beat = heartbeat
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
  speaker: "glitch", hp: 320, bgm: "battle", color: "#ff3b5c",
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
  } else {
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
  const col = cfg.color || "#ff3b5c", keys = {}; let allyCol = cfg.ally && SPEAKERS[cfg.ally].color;
  let quiet = 1, beatT = 0, lastTing = 0;                                                // quiet: enemy-shot volume x (silence eats sound); beatT: heartbeat clock
  let trail = [], floats = [], fx = [], banner = null, burstFx = 0, hitFlash = 0, typer = createTyper(), last = performance.now(), raf, look = { sx: 1, sy: 1, rot: 0 }, wake = [], prevP = null, lastShot = 0, lastBig = 0, lastGraze = 0;

  const say = (txt, x, y, c = "#9ad0ff") => floats.push({ x, y, age: 0, txt, col: c });
  const toggle = () => { const on = battle.toggleFire(); sweep(on ? 500 : 400, on ? 900 : 200, .08, "square", .1); };   // 사격 ON/OFF
  const advTalk = () => {                                               // first press finishes the typing, the next goes to the next line
    if (typer.press(lineT().length)) nextLine();
  };
  const nextLine = () => { battle.advance(); typer.reset(); if (!s.talk) setPortrait(SPEAKERS[cfg.speaker]); };
  const lineT = () => fixKeys(s.talk.lines[s.talk.i].t, MENU.keys);                 // dialogue text with the current key names
  const press = () => MENU.open ? 0 : s.talk ? advTalk() : toggle();
  const kd = ev => {
    keys[ev.code] = true; if (ev.key === KEYS.skip) keys.skip = true;
    if (ev.code.startsWith("Arrow") || ev.code === "Space") ev.preventDefault();
    if (ev.repeat) return;
    if (s.talk) { if (KEYS.advance.includes(ev.code)) advTalk(); }
    else if (ev.code === MENU.keys.fire) toggle();
    else if (ev.code === MENU.keys.swap) battle.swap();                                  // 교대
    else if (ev.code === MENU.keys.dash) battle.dash();                                  // 대시
  };
  const ku = ev => { keys[ev.code] = false; if (ev.key === KEYS.skip) keys.skip = false; };
  const cleanup = () => {
    $("portrait").style.visibility = ""; setCast(null);cancelAnimationFrame(raf); bgm.stop(); removeEventListener("keydown", kd); removeEventListener("keyup", ku);
    act.onclick = act.onmousedown = null;
  };
  const end = () => { cleanup(); act.hidden = true; act.innerHTML = ""; stage.classList.remove("battle"); done(); };

  // boss attack sounds. Shots of one frame are gathered into a volley (flushed after the step) so a ring / wall is ONE heavy thud,
  // not 30 blips; heavy single orbs get a boom, lasers and body-slams get a rising charge before they fire.
  let volley = { n: 0, pw: 0 };
  const shotSfx = (size, sp) => { volley.n++; volley.pw = Math.max(volley.pw, (size - 6) / 8 + (sp - 150) / 400); };
  const boom = (v = 1, low = 90) => { const q = quiet * v; sweep(low * 1.6, low * .4, .55, "sine", .6 * q); sweep(low * 2.4, low * .5, .35, "sawtooth", .3 * q); noise(.3, .45 * q); };
  const charge = (dur, v = 1, f = 120) => { const q = quiet * v; sweep(f, f * 8, dur, "sawtooth", .16 * q); sweep(f / 2, f * 4, dur, "sine", .3 * q); sweep(f * 12, f * 28, dur, "square", .035 * q); };
  const flushVolley = () => {
    const { n, pw } = volley; volley = { n: 0, pw: 0 }; if (!n) return;
    const t = performance.now();
    if (n >= 6) { if (t - lastBig < 250) return; lastBig = t; boom(1, 80); sweep(70, 40, .5, "triangle", .35 * quiet); return; }    // wall / ring: one heavy thump
    if (n >= 2) { if (t - lastBig < 150) return; lastBig = t; sweep(240, 70, .2, "sine", .45 * quiet); sweep(500, 120, .14, "sawtooth", .16 * quiet); noise(.1, .3 * quiet); return; }   // short volley
    if (pw >= 1) { if (t - lastBig < 300) return; lastBig = t; charge(.18, .8, 300); setTimeout(() => boom(.8, 110), 150); return; }                                              // heavy orb: wind-up, then boom
    if (pw < .3) { if (t - lastShot < 90) return; lastShot = t; sweep(1100 + Math.random() * 300, 450, .1, "triangle", .18 * quiet); noise(.03, .1 * quiet); return; }
    if (t - lastBig < 200) return; lastBig = t;
    sweep(900 - 300 * pw, 300, .14 + .2 * pw, "sawtooth", (.2 + .15 * pw) * quiet); noise(.08 + .1 * pw, .3 * quiet);
  };

  // events from the simulation -> sound and visual effects
  function onEvent(v) {
    switch (v.type) {
      case "enemyShot": shotSfx(v.size, v.speed); break;
      case "playerShot": sweep(1000, 700, .05, "triangle", .05); break;
      case "allyShot": sweep(1400, 900, .06, "sine", .05); break;
      case "enemyHit": {
        hitFlash = .08; kickPortrait();
        if (v.dmg) { const f = 450 + Math.min(v.combo, 16) * 40; sweep(f, f * 1.6, .08, "square", .13); noise(.04, .2); }
        else { const n = performance.now(); if (n - lastTing > 80) { lastTing = n; sweep(2600, 2500, .3, "sine", .22); sweep(3900, 3800, .2, "sine", .1); } }   // 팅! it can't be hurt
        say(v.dmg ? "-" + v.dmg : "0", v.x + (Math.random() - .5) * 30, v.y - 10, v.dmg ? (v.ally ? allyCol : "#fff") : "#8fa3b5");
        fx.push({ x: v.x, y: v.y, age: 0 });                                              // round burst
        for (let i = 0; i < 5; i++) { const a = Math.random() * TAU, sp = 80 + Math.random() * 140; fx.push({ x: v.x, y: v.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, age: 0, sp: true }); }
        break;
      }
      case "graze": { const n = performance.now(); if (n - lastGraze > 70) { lastGraze = n; sweep(2200, 3000, .04, "sine", .06); } break; }
      case "playerHurt": noise(.12, .6); sweep(300, 80, .2, "square", .35); break;
      case "shieldBlock": say("방패!", s.p.x, s.p.y - 20, allyCol); sweep(900, 1800, .25, "sine", .25); noise(.08, .3); break;
      case "shieldReady": sweep(500, 1200, .3, "sine", .12); break;
      case "heal": say("+" + v.amount, s.p.x, s.p.y - 20, allyCol); sweep(600, 1400, .25, "sine", .12); break;
      case "burst":
        burstFx = 1; say(v.dmg ? "-" + v.dmg : "0", s.e.x, s.e.y + 40, v.dmg ? allyCol : "#8fa3b5"); if (!v.dmg) sweep(2600, 2500, .5, "sine", .25); say("+3", s.p.x, s.p.y - 20, allyCol);
        sweep(400, 2000, .8, "sine", .3); sweep(200, 1000, .8, "triangle", .2); noise(.3, .4); retrigger($("flash"), "on", 600);
        banner = { txt: v.up ? `유대 Lv.${v.level}! 지원이 강해졌다` : "유대의 빛!", age: 0, bond: true };
        break;
      case "jointLight":   // 합동 유대의 빛: every ally at once, a bigger flash and a rising chord
        burstFx = 1.6; banner = { txt: "합동 유대의 빛!", age: 0, bond: true }; retrigger($("flash"), "on", 900);
        v.allies.forEach((id, i) => setTimeout(() => sweep(300 * (1 + i * .25), 2400, 1.1, "sine", .22), i * 120)); noise(.5, .5); break;
      case "rewind": retrigger($("flash"), "on", 250); sweep(1400, 300, .35, "sawtooth", .16); break;   // 되감기: the bullets jump back
      case "bondStart": banner = { txt: `유대 Lv.${v.level}`, age: 0, bond: true }; break;
      case "dash": sweep(900, 300, .12, "sawtooth", .12); noise(.08, .15); break;
      case "swap":allyCol = SPEAKERS[v.ally].color; banner = { txt: `교대: ${SPEAKERS[v.ally].name}`, age: 0, bond: true }; sweep(700, 1500, .15, "sine", .2); break;
      case "phase":
        if (cfg.fade) { quiet = Math.max(.15, 1 - cfg.fade * v.level); bgm.vol(quiet); }   // each phase swallows more of the sound
        if (v.name) { banner = { txt: v.name, age: 0, level: v.level }; sweep(300, 900, .35, "sawtooth", .18); }
        if (!v.start) { noise(.3, .5); sweep(100, 600, .5, "sawtooth", .25); retrigger($("flash"), "on", 600); retrigger(stage, "shake", 500); }
        if (v.talk) typer.reset();
        break;
      case "laserWarn": charge(v.warn || 1, 1, 110); break;
      case "laserFire": boom(1.2, 70); sweep(1500, 60, .9, "sawtooth", .3 * quiet); break;
      case "break": noise(.12, .4 * quiet); sweep(500, 90, .22, "square", .2 * quiet); for (let i = 0; i < 8; i++) { const a = Math.random() * TAU, sp = 80 + Math.random() * 160; fx.push({ x: v.x, y: v.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, age: 0, sp: true }); } break;
      case "split": noise(.18, .45 * quiet); sweep(900, 100, .3, "sawtooth", .3 * quiet); sweep(2400, 600, .12, "square", .1 * quiet); break;
      case "dashWarn": charge(.9, 1, 90); break;
      case "dashStart": sweep(900, 60, .6, "sawtooth", .35); noise(.35, .4); break;
      case "dashEnd": boom(1.3, 60); retrigger(stage, "shake", 300); break;
      case "lose":
        bgm.stop(); noise(.5, .5); sweep(400, 40, 1, "sawtooth", .3);
        setTimeout(() => { act.onclick = () => { cleanup(); runBattle(cfg, done); }; }, 600);
        break;
      case "win":
        BOND.lv = s.lv; BOND.xp = s.xp;
        if (cfg.ally) BOND.base = Math.max(BOND.base, s.bondLv);                         // the bond carries over to the next battle / stage
        bgm.stop(); noise(.6, .7); sweep(80, 1600, .9, "sawtooth", .3); sweep(200, 40, .6, "sine", .6);
        retrigger($("flash"), "on", 600); retrigger(stage, "shake", 500); setTimeout(end, 1600);
        break;
    }
  }

  function draw() {
    const { p, e, t } = s;
    g.clearRect(0, 0, 960, 540);
    g.save(); g.globalCompositeOperation = "lighter";
    g.lineWidth = 2; g.strokeStyle = col;                                               // enemy aura: slow rings, faster in later phases
    for (let i = 0; i < 3; i++) { const q = ((t * (.35 + .12 * s.level) + i / 3) % 1); g.globalAlpha = (1 - q) * .45; g.beginPath(); g.arc(e.x, e.y, 60 + q * 90, 0, TAU); g.stroke(); }
    g.globalAlpha = 1;
    if (hitFlash > 0) {                                                                 // hit effects: soft glow + round burst + sparks
      const gr = g.createRadialGradient(e.x, e.y, 0, e.x, e.y, 120);
      gr.addColorStop(0, `rgba(255,255,255,${hitFlash * 4})`); gr.addColorStop(1, "rgba(255,80,120,0)");
      g.fillStyle = gr; g.beginPath(); g.arc(e.x, e.y, 120, 0, TAU); g.fill();
    }
    for (const f of fx) {
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
    g.globalCompositeOperation = "lighter";
    for (const b of s.bullets) {                                                        // glowing bullets with a short trail
      g.fillStyle = b.col;
      b.tr.forEach((q, i) => { g.globalAlpha = (i + 1) / b.tr.length * .35; g.beginPath(); g.arc(q.x, q.y, b.r * (.4 + .12 * i), 0, TAU); g.fill(); });
      g.globalAlpha = .35; g.beginPath(); g.arc(b.x, b.y, b.r * 1.9, 0, TAU); g.fill();
      g.globalAlpha = 1; g.shadowColor = b.col; g.shadowBlur = b.r > 8 ? 18 : 10; g.beginPath(); g.arc(b.x, b.y, b.r, 0, TAU); g.fill();
      g.shadowBlur = 0; g.fillStyle = "#fff"; g.beginPath(); g.arc(b.x, b.y, b.r * .45, 0, TAU); g.fill();
      if (b.hp > 0) { g.globalAlpha = 1; g.strokeStyle = "#fff"; g.lineWidth = 2; g.beginPath(); g.arc(b.x, b.y, b.r + 3, 0, TAU); g.stroke(); g.fillStyle = "#fff"; g.font = "bold 11px sans-serif"; g.textAlign = "center"; g.fillText(b.hp, b.x, b.y + 4); g.fillStyle = b.col; }   // breakable: white ring + hp
      if (b.nm) { g.save(); g.globalAlpha = 1; g.font = "11px 'Malgun Gothic'"; g.textAlign = "center"; g.fillStyle = "#fff"; g.fillText(b.nm, b.x, b.y - b.r - 4); g.restore(); }   // 방향 규칙: name written on the bullet
    }
    if (burstFx > 0) {                                                                  // 유대의 빛: a ring of light sweeping out from the player
      g.globalAlpha = burstFx * .8; g.strokeStyle = allyCol; g.lineWidth = 6; g.shadowColor = allyCol; g.shadowBlur = 20;
      g.beginPath(); g.arc(p.x, p.y, (1 - burstFx) * 340, 0, TAU); g.stroke();
    }
    g.restore();
    g.shadowBlur = 12;                                                                  // player shots fly out of the box
    for (const sh of s.shots) { g.fillStyle = sh.ally ? allyCol : "#cff"; g.shadowColor = sh.ally ? allyCol : "#4fc3ff"; if (sh.ally) { g.beginPath(); g.arc(sh.x, sh.y, 5, 0, TAU); g.fill(); } else g.fillRect(sh.x - 2.5, sh.y - 9, 5, 18); }
    g.shadowBlur = 0;
    if (s.al) {                                                                         // companion: blossom that grows with the bond
      const lv = s.bondLv, al = s.al;
      if (s.allyId === "hexa") drawHexa(g, al.x, al.y, t, allyCol, .55 + .1 * lv);          // guardian: pulsing hexagons (scenes.js)
      else if (s.allyId === "glitch") drawShardAlly(g, al.x, al.y, t, allyCol, .8 + .12 * lv);   // fallen crack: jittering shard (stage3/scenes.js)
      else if (s.allyId === "keeper") drawGearAlly(g, al.x, al.y, t, allyCol, .8 + .12 * lv);   // freed clock keeper: ticking gear (stage4/scenes.js)
      else {
        g.save(); g.translate(al.x, al.y); g.scale(1 + .15 * lv, 1 + .15 * lv); g.strokeStyle = allyCol; g.shadowColor = allyCol; g.shadowBlur = 14 + 4 * lv; g.lineWidth = 2;
        for (let k = 0; k < 6; k++) { const a = t * 1.5 + k * Math.PI / 3; g.beginPath(); g.arc(Math.cos(a) * 9, Math.sin(a) * 9, 7, 0, TAU); g.stroke(); }
        g.fillStyle = "#fff"; g.beginPath(); g.arc(0, 0, 3, 0, TAU); g.fill(); g.restore();
      }
      g.font = "bold 13px 'Malgun Gothic'"; g.fillStyle = allyCol; g.textAlign = "center"; g.fillText(`유대 Lv.${lv}`, al.x, al.y + 30 + 3 * lv);
    }
    if (s.dashT > 0) trail.push({ x: p.x, y: p.y, a: .6 });                            // 잔상: fading copies of the ship
    for (const q of trail) { g.save(); g.globalAlpha = q.a; g.translate(q.x, q.y); g.strokeStyle = "#9ad0ff"; drawShape(g, myShape, 11); g.restore(); q.a -= .04; }
    trail = trail.filter(q => q.a > 0);
    if (s.over !== "lose" && (s.inv <= 0 || s.dashT > 0 || Math.floor(s.inv * 12) % 2)) {
      g.save(); g.globalCompositeOperation = "lighter"; g.fillStyle = allyCol || "#4fc3ff";   // faint trail of recent positions
      wake.forEach((q, i) => { g.globalAlpha = (i + 1) / wake.length * .18; g.beginPath(); g.arc(q.x, q.y, 3 + 5 * (i + 1) / wake.length, 0, TAU); g.fill(); }); g.restore();
      g.save(); g.translate(p.x, p.y); g.rotate(look.rot); g.scale(look.sx, look.sy); g.rotate(-look.rot); drawShape(g, myShape, 11); g.fillStyle = "#fff"; g.beginPath(); g.arc(0, 0, 2.5, 0, TAU); g.fill();
      if (s.shieldOn) { g.strokeStyle = allyCol; g.lineWidth = 3; g.shadowColor = allyCol; g.shadowBlur = 14; g.globalAlpha = .6 + .3 * Math.sin(t * 6); g.beginPath(); g.arc(0, 0, 19, 0, TAU); g.stroke(); }
      g.restore();
    }
    if (s.split) {                                                                      // 판 분할: unsafe half red (hatched pulse while warning, solid once live), safe half green, divider down the middle
      const hw = BOX.w / 2, ux = s.split.safe > 0 ? BOX.x : BOX.x + hw, sx = s.split.safe > 0 ? BOX.x + hw : BOX.x;
      g.save(); g.fillStyle = "#3f6"; g.globalAlpha = .18; g.fillRect(sx, BOX.y, hw, BOX.h);
      g.fillStyle = "#f33"; g.globalAlpha = s.split.active ? .45 : .15 + .15 * Math.abs(Math.sin(t * 10)); g.fillRect(ux, BOX.y, hw, BOX.h);
      g.globalAlpha = 1; g.strokeStyle = "#fff"; g.lineWidth = 3; g.setLineDash([8, 6]); g.beginPath(); g.moveTo(BOX.x + hw, BOX.y); g.lineTo(BOX.x + hw, BOX.y + BOX.h); g.stroke(); g.restore();
    }
    if (s.invertWarn || s.inverted) { g.save(); g.font = "bold 22px sans-serif"; g.textAlign = "center"; g.fillStyle = s.inverted ? "#f6f" : "#ff0"; g.globalAlpha = .6 + .4 * Math.abs(Math.sin(t * 12)); g.fillText(s.inverted ? "조작 반전!" : "조작 반전 경고", BOX.x + BOX.w / 2, BOX.y - 24); g.restore(); }
    g.strokeStyle = "#fff"; g.lineWidth = 4; g.strokeRect(BOX.x, BOX.y, BOX.w, BOX.h);

    g.fillStyle = "#333"; g.fillRect(BOX.x, 168, BOX.w, 10);
    if (cfg.survive) {                                                                  // escape battle: the enemy can't be hurt, so show the clock instead of its HP
      g.fillStyle = "#7dd3ff"; g.fillRect(BOX.x, 168, BOX.w * (1 - s.surviveLeft / cfg.survive), 10);
      g.font = "bold 16px 'Malgun Gothic'"; g.textAlign = "right"; g.fillStyle = "#7dd3ff"; g.fillText(`탈출까지 ${Math.ceil(s.surviveLeft)}초`, BOX.x + BOX.w, 164); g.textAlign = "left";
    } else { g.fillStyle = s.level > 1 ? "#ff3b5c" : "#ffd84f"; g.fillRect(BOX.x, 168, BOX.w * Math.max(s.eHp, 0) / s.eMax, 10); }   // enemy HP bar
    g.font = "bold 16px 'Malgun Gothic'"; g.textAlign = "left"; g.textBaseline = "bottom"; g.fillStyle = SPEAKERS[cfg.speaker].color; g.fillText(SPEAKERS[cfg.speaker].name, BOX.x, 164);
    g.font = "bold 26px 'Malgun Gothic'"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#fff";
    for (const f of floats) { g.globalAlpha = 1 - f.age / .6; g.fillStyle = f.col || "#fff"; g.fillText(f.txt, f.x, f.y - f.age * 60); }
    g.globalAlpha = 1;
    if (s.combo > 2) { g.font = "bold 22px 'Malgun Gothic'"; g.fillStyle = "#9ad0ff"; g.textAlign = "left"; g.fillText(`${s.combo} HIT`, BOX.x + BOX.w + 20, 215); }

    g.font = "20px 'Malgun Gothic'"; g.textAlign = "left"; g.fillStyle = "#fff"; g.fillText(`HP ${Math.max(s.hp, 0)} / ${s.maxHp}`, BOX.x, 485);
    g.fillStyle = "#333"; g.fillRect(BOX.x + 130, 475, 170, 20); g.fillStyle = "#4fc3ff"; g.fillRect(BOX.x + 130, 475, 170 * Math.max(s.hp, 0) / s.maxHp, 20);
    g.font = "bold 18px 'Malgun Gothic'"; g.textAlign = "left"; g.fillStyle = "#ffd36b"; g.fillText(`Lv.${s.lv}`, 20, 485);   // level + exp bar, bottom-left, clear of HP and the controls hint
    g.fillStyle = "#333"; g.fillRect(80, 475, 200, 12); g.fillStyle = "#ffd36b"; g.fillRect(80, 475, 200 * s.xp / 100, 12);
    g.font = "bold 20px 'Malgun Gothic'"; g.textAlign = "left"; g.fillStyle = s.auto ? "#7dffb0" : "#889"; g.fillText(s.auto ? "사격 ON" : "사격 OFF", BOX.x + BOX.w + 20, 250);
    if (s.hasAlly) {                                                                    // bond gauge: fills by grazing bullets
      g.font = "bold 15px 'Malgun Gothic'"; g.fillStyle = allyCol; g.fillText(`유대 Lv.${s.bondLv}${s.shieldOn ? " · 방패" : ""}`, BOX.x + BOX.w + 20, 276);
      g.fillStyle = "#333"; g.fillRect(BOX.x + BOX.w + 20, 288, 120, 8); g.fillStyle = allyCol; g.fillRect(BOX.x + BOX.w + 20, 288, 120 * s.gauge / 100, 8);
      g.font = "12px 'Malgun Gothic'"; g.fillStyle = "#9ab"; g.fillText("탄을 아슬하게 스치면 충전", BOX.x + BOX.w + 20, 308);
    }
    g.font = "16px 'Malgun Gothic'"; g.fillStyle = "#9ad0ff"; g.textAlign = "right"; g.fillText(`이동: 방향키 · 사격 ON/OFF: ${keyLabel(MENU.keys.fire)} 또는 클릭 · 대시: ${keyLabel(MENU.keys.dash)}` + (cfg.allies ? ` · 교대: ${keyLabel(MENU.keys.swap)}` : "") + " · 메뉴: C", BOX.x + BOX.w, 515);
    if (banner) {                                                                       // phase (spell) name / bond announcement
      const k = banner.age, a = Math.min(1, k * 4, (3 - k) * 2), sx = BOX.x + BOX.w + 20 + (1 - Math.min(1, k * 4)) * 30;
      g.globalAlpha = Math.max(0, a); g.textAlign = "left"; g.textBaseline = "middle";
      g.font = "bold 14px 'Malgun Gothic'"; g.fillStyle = banner.bond ? allyCol : col;
      if (!banner.bond) g.fillText(`PHASE ${banner.level + 1}`, sx, 340);
      g.font = "bold 20px 'Malgun Gothic'"; g.fillStyle = banner.bond ? allyCol : "#fff"; g.fillText(banner.txt, sx, banner.bond ? 370 : 366);
      g.globalAlpha = 1;
    }
    if (s.talk) {
      const L = { ...s.talk.lines[s.talk.i], t: lineT() }, sp = SPEAKERS[L.who];
      g.fillStyle = "rgba(0,0,0,.7)"; g.fillRect(0, 0, 960, 540);
      g.fillStyle = "#0b1026"; g.fillRect(60, 400, 840, 120); g.strokeStyle = "#fff"; g.lineWidth = 4; g.strokeRect(60, 400, 840, 120);
      g.textAlign = "left"; g.textBaseline = "top"; g.font = "bold 24px 'Malgun Gothic'"; g.fillStyle = sp.color; g.fillText(sp.name, 84, 414);
      g.font = "28px 'Malgun Gothic'"; g.fillStyle = "#fff"; g.fillText(L.t.slice(0, typer.pos | 0), 84, 456);
      if (typer.pos >= L.t.length) { g.textAlign = "right"; g.fillText("▼", 880, 480); }
      g.textBaseline = "middle";
    }
    if (s.over) {
      if (s.over === "lose") { g.fillStyle = "rgba(0,0,0,.65)"; g.fillRect(0, 270, 960, 150); }
      g.textAlign = "center"; g.font = "bold 56px 'Malgun Gothic'"; g.fillStyle = s.over === "win" ? "#9ad0ff" : "#ff3b5c";
      g.fillText(s.over === "win" ? (cfg.winText || "격파!") : "GAME OVER", 480, 320);
      if (s.over === "lose" && act.onclick) { g.font = "22px 'Malgun Gothic'"; g.fillStyle = "#fff"; g.fillText("클릭하여 재도전", 480, 375); }
    }
    g.textAlign = "left";
  }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, .05); last = now;
    if (MENU.open) { raf = requestAnimationFrame(frame); return; }                       // menu open: everything stops (the menu is a DOM overlay)
    $("portrait").style.visibility = s.talk ? "visible" : "hidden";                     // the enemy body is drawn on the field; the portrait only shows while someone talks
    if (s.talk) { typer.add(dt * 25, keys[KEYS.fast], lineT().length); if (keys.skip && typer.hold(dt, lineT().length)) nextLine(); setPortrait(SPEAKERS[s.talk.lines[s.talk.i].who]); setCast([...new Set(s.talk.lines.map(l => l.who))].map(w => SPEAKERS[w])); }
    else {
      setCast(null);
      const input = { dx: (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft ? 1 : 0), dy: (keys.ArrowDown || keys.KeyS ? 1 : 0) - (keys.ArrowUp || keys.KeyW ? 1 : 0) };
      for (const v of battle.step(dt, input)) onEvent(v);
      if (prevP && dt > 0) moveLook(look, (s.p.x - prevP.x) / dt, (s.p.y - prevP.y) / dt, dt);   // display only: reads the position, never writes it
      if (prevP && (s.p.x !== prevP.x || s.p.y !== prevP.y)) wake.push({ x: prevP.x, y: prevP.y });
      else if (wake.length) wake.shift();
      if (wake.length > 6) wake.shift();
      prevP = { x: s.p.x, y: s.p.y };
      flushVolley();
      if (cfg.beat && !s.over && s.t > 0 && (beatT -= dt) <= 0) { beatT = .7; sweep(85, 45, .22, "sine", .45); setTimeout(() => sweep(70, 40, .2, "sine", .3), 170); }   // all that is left of the sound: a heartbeat
      hitFlash -= dt; burstFx = Math.max(0, burstFx - dt * 1.5);
      if (banner && (banner.age += dt) > 3) banner = null;
      for (const f of floats) f.age += dt; floats = floats.filter(f => f.age < .6);
      for (const f of fx) { f.age += dt; if (f.sp) { f.x += f.vx * dt; f.y += f.vy * dt; } } fx = fx.filter(f => f.age < (f.sp ? .35 : .3));
    }
    draw(); raf = requestAnimationFrame(frame);
  }
  addEventListener("keydown", kd); addEventListener("keyup", ku); act.onmousedown = press;
  if (cfg.bgm) bgm.play(cfg.bgm); else bgm.stop(); raf = requestAnimationFrame(frame);
}
