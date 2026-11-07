// Battle simulation: the rules only. No DOM, canvas, audio, clock or global Math.random (rng is injected),
// so it runs in the browser (global createBattle) and in Node (require) alike. The view lives in ../battle.js.
//
// const battle = createBattle(cfg, { rng, bondBase, hitbox });
//   battle.state            plain object for drawing (read-only for the view)
//   battle.step(dt, {dx, dy})  advance the world; returns the events of this step (plain data)
//   battle.toggleFire()     shooting ON/OFF -> returns the new value
//   battle.advance()        next dialogue line (state.talk becomes null after the last one)
//
// cfg: see ../battle.js. Events: start-of-phase, enemyShot{size,speed}, enemyHit{x,y,dmg,ally,combo}, playerShot, allyShot,
//   graze, playerHurt{dmg}, shieldBlock, shieldReady, heal{amount}, burst{dmg,level,up}, bondStart{level},
//   rewind, invertWarn, splitWarn, boxSplit, laserWarn, laserFire, split, dashWarn, dashStart, dashEnd, phase{level,name,talk,start}, win, lose.
(function (root) {
  "use strict";
  const TAU = Math.PI * 2, BOX0 = { x: 330, y: 190, w: 300, h: 260 }, EX = 480, E_R = 26, BOND_MAX = 4;
  // companion kits when cfg.allies lets the player swap (교대): cd = shot interval x, dm = shot damage x, heal / shield = abilities.
  // A single cfg.ally keeps the old all-round companion (KIT.all).
  const KIT = { all: { cd: 1, dm: 1, heal: 1, shield: 1 }, lumi: { cd: .8, dm: 1, heal: 1, shield: 0 }, hexa: { cd: 1.6, dm: 2, heal: 0, shield: 1 } };
  // Growth curves. Player level (display Lv.) adds HP at battle start and shot damage; stage scales enemy HP and bullet damage (index = stage - 1);
  // ally: per bond level 0..4 shot interval, shots per volley and damage. Ally dps stays 1.5 -> 7.5, under the player's own 8.3 (growth.test.js).
  const GROWTH = {
    playerHp: lv => Math.floor((lv - 1) * .75), shotDmg: lv => Math.round((1 + .06 * (lv - 1)) * 10) / 10,
    stage: { hp: [1, 1.1, 1.2, 1.3, 1.4, 1.5], atk: [1, 1, 1.1, 1.2, 1.2, 1.3] },
    ally: { cd: [1.3, 1.05, .9, .8, .8], hits: [1, 1, 2, 2, 2], dmg: [2, 2.5, 2, 2.5, 3] },
  };
    // Signature moves (cfg.allies only): the ally out fires its own move when cool[id].sig runs out. power by bond level 0..4.
  const SIG_CD = [18, 16, 14, 12, 10], SIG = {
    lumi: { kind: "ward", call: "내 등불 뒤로 숨어!", power: [1, 1.5, 2, 2.5, 3] },   // invulnerable for power s
    hexa: { kind: "blast", call: "......비켜라. 일격이다.", power: [6, 9, 12, 15, 18] },                  // damage to the enemy
    glitch: { kind: "reflect", call: "흥, 도로 가져가!", power: [100, 140, 180, 220, 260] },       // bullets within power px fly back
    keeper: { kind: "clear", call: "정각입니다. 탄막을 정리하겠습니다.", power: [140, 180, 230, 300, 9999] },        // 시계지기: bullets within power px vanish
  };
  const XP_PHASE = 20, XP_LV = 100, DASH_T = .2, DASH_D = 120, DASH_CD = 1.5, HEAL_IV = [10, 8.5, 7, 6, 5], SHIELD_CD = [0, 22, 18, 14, 10], SWAP_CD = 1.5, REWIND_BACK = 1.5;

  function createBattle(cfg, opts = {}) {
    const rng = opts.rng || Math.random, HITBOX = opts.hitbox == null ? 4 : opts.hitbox, bondBase = opts.bondBase || 0;
    const plv = opts.lv || 1, st = Math.min(6, Math.max(1, cfg.stage || 1)) - 1, atkK = GROWTH.stage.atk[st];
    const MAX_HP = (cfg.playerHp || 20) + GROWTH.playerHp(plv), E_MAX = cfg.invuln ? cfg.hp : Math.round(cfg.hp * GROWTH.stage.hp[st]), E_W = cfg.ew || 75, cuts = cfg.cuts || [.75, .5, .25], col = cfg.color || "#ff3b5c";
    const BOX = { ...BOX0 };   // the box is battle state: move s.BOX and everything follows
    const cx = BOX.x + BOX.w / 2, allies = cfg.allies, SHIELD_LV = allies ? 1 : 2;   // a shield-bearer swapped in guards from bond Lv.1
    const s = {
      BOX, t: 0, hp: MAX_HP, maxHp: MAX_HP, eHp: E_MAX, eMax: E_MAX, eGhost: E_MAX, pGhost: MAX_HP, level: 0, lv: opts.lv || 1, xp: opts.xp || 0, phaseName: "", over: null, auto: true, inv: 0, combo: 0,
      p: { x: cx, y: BOX.y + BOX.h * .75 }, e: { x: EX, y: 85, mode: "idle", tt: 0, dashT: 0, lx: EX },     // enemy mode: idle | warn | dive | back
      al: cfg.ally ? { x: BOX.x - 38, y: BOX.y + BOX.h * .75 } : null,
      bullets: [], lasers: [], zones: [], shots: [], gauge: cfg.gauge0 || 0, bondLv: 0, shieldOn: false, talk: null, hasAlly: !!cfg.ally,
      allyId: allies ? allies[0] : cfg.ally, swapCd: 0, dashT: 0, dashCd: 0, dashDir: null, lastIn: null, surviveLeft: cfg.survive || 0,
      cool: {},   // per companion { heal, shield }: seconds left; every companion's timers run whether or not they are out
    };
    const p = s.p, e = s.e, al = s.al;
    // cfg.phaseRules[level] = { colorRule, rewind, dirRule, boxRule, invertRule, splitRule, finale }: per-phase rules (chapter 6 mixes all three). Without phaseRules the cfg-level options apply as before.
    // finale: shots deal 0 and only the joint light (bond full, cfg.jointLight) ends the fight.
    const rl = k => { const pr = cfg.phaseRules && cfg.phaseRules[Math.min(s.level, cfg.phaseRules.length - 1)]; return pr && k in pr ? pr[k] : cfg[k]; };   // a key absent from the phase entry falls back to the cfg-level option
    const kit = () => allies ? (cfg.kits && cfg.kits[s.allyId]) || KIT[s.allyId] : KIT.all;
    const light = () => cfg.lights && cfg.lights[s.allyId];   // bond-light effect of the ally out now: heal | shield | power (no cfg.lights = the old all-round light)
    for (const id of allies || [cfg.ally]) s.cool[id] = { heal: HEAL_IV[0], shield: 0, sig: 8 };
    s.shieldOn = !!(cfg.ally && bondBase >= SHIELD_LV && kit().shield);
    // one `let` per line: parallel tickets add state here, and a shared line conflicts on every merge
    let ev = [];
    let tm = {};
    let dtc = 0;
    let ang = 0;
    let side = 1;
    let cd = 0;
    let comboT = 0;
    let allyCd = 1.2;
    let bonus = 0;
    let started = false;
    let hist = [];
    let rev = null;
    let spent = new Set();
    let nextRw = rl("rewind") || 0;
    let uid = 0;
    let slid = false;
    let dwSide = -1;
    const blv = () => Math.min(BOND_MAX, bondBase + bonus);
    const emit = (type, o) => ev.push(o ? { type, ...o } : { type });

    // bullet colour = the battle colour's hue; saturation / lightness set by pattern kind so patterns read apart at a glance
    const hue = (() => { const n = parseInt(col.slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx === mn) return 0; const d = mx - mn; return 60 * (mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4); })();
    const TONE = { rain: [.45, .5], wall: [.55, .84], wave: [.9, .58], aim: [1, .62], aimFan: [1, .77], fan: [.85, .5], ring: [.6, .72], side: [.3, .62], spiral: [1, .44], bounce: [.75, .66], stall: [.95, .8], homing: [.7, .38], swell: [.8, .55], door: [.65, .3], bloom: [.5, .8], closing: [.35, .46], shelf: [.4, .66], hush: [.25, .9] };   // [saturation, lightness]
    const C = (k, o) => ({ col: `hsl(${hue},${TONE[k][0] * 100}%,${TONE[k][1] * 100}%)`, ...o });

    // o = { col, w (curve rad/s), acc (speed change per s), split: {t, n, sp, size}, sa/sf (sine amplitude / freq) }
    const add = (x, y, a, sp, size = 6, o = {}) => {
      s.bullets.push({ x, y, bx: x, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: size, dmg: Math.round((size >= 10 ? 6 : 4) * atkK), col: o.col || col, nm: rl("dirRule") && rl("dirRule").name,   // 방향 규칙: name written on the bullet
        id: uid++, hp: o.hp, w: o.w || 0, acc: o.acc || 0, split: o.split, sa: o.sa || 0, sf: o.sf || 3, ph: o.ph || 0, bn: o.bn || 0, stall: o.stall, home: o.home, gr: o.gr, r0: size, age: 0, tr: [] });
      if (!s.over) emit("enemyShot", { size, speed: sp });
    };
    const laser = (x, y, a, w, warn, dur) => { s.lasers.push({ x, y, a, w, warn, dur, age: 0, ping: false, boom: false }); };

    const zone = (x, y, r, warn, dur) => { s.zones.push({ x, y, r, warn, dur, age: 0 }); };

    // pattern helpers handed to cfg.phases[i](h); bullets leave from the enemy's current position (e.x, e.y + 55)
    const every = (k, iv, fn) => { tm[k] = (tm[k] || 0) + dtc; if (tm[k] > iv) { tm[k] = 0; fn(); } };
    const h = {
      rain: (iv, sp = 130, size = 6, o) => every("r", iv, () => add(BOX.x + rng() * BOX.w, BOX.y - 12, Math.PI / 2, sp + rng() * 40, size, C("rain", o))),
      aim: (iv, sp = 170, size = 6, o) => every("a", iv, () => add(e.x, e.y + 55, Math.atan2(p.y - e.y - 55, p.x - e.x), sp, size, C("aim", o))),
      aimFan: (iv, n, gap, sp, size = 6, o) => every("af", iv, () => { const a0 = Math.atan2(p.y - e.y - 55, p.x - e.x); for (let i = 0; i < n; i++) add(e.x, e.y + 55, a0 + (i - (n - 1) / 2) * gap, sp, size, C("aimFan", o)); }),
      fan: (iv, n, gap, sp, size = 6, o) => every("f", iv, () => { for (let i = 0; i < n; i++) add(e.x, e.y + 55, Math.PI / 2 + (i - (n - 1) / 2) * gap, sp, size, C("fan", o)); }),
      ring: (iv, n, sp, size = 7, o) => every("g", iv, () => { const off = (rng() - .5) * .2; for (let i = 0; i < n; i++) add(e.x, e.y + 55, .08 + off + i * (Math.PI - .16) / (n - 1), sp, size, C("ring", o)); }),
      side: (iv, sp = 150, size = 6, o) => every("s", iv, () => { side = -side; const y = BOX.y + 20 + rng() * (BOX.h - 40); add(side > 0 ? BOX.x - 10 : BOX.x + BOX.w + 10, y, side > 0 ? 0 : Math.PI, sp, size, C("side", o)); }),
      spiral: (iv, arms, step, sp = 110, size = 6, o) => every("p", iv, () => { ang += step; for (let k = 0; k < arms; k++) add(e.x, e.y + 55, ang + k * TAU / arms, sp, size, C("spiral", o)); }),
      wall: (iv, sp = 95, size = 6, o) => every("w", iv, () => {                         // full-width row with one gap to slip through
        const gap = BOX.x + 50 + rng() * (BOX.w - 100);
        for (let x = BOX.x + 8; x < BOX.x + BOX.w; x += 22) if (Math.abs(x - gap) > 42) add(x, BOX.y - 12, Math.PI / 2, sp, size, C("wall", o));
      }),
      wave: (iv, sp = 85, size = 6, o = {}) => every("v", iv, () => { for (let i = 0; i < 5; i++) add(BOX.x + 30 + i * (BOX.w - 60) / 4, BOX.y - 12, Math.PI / 2, sp, size, { ...C("wave", o), sa: 38, sf: 3, ph: i * .9 }); }),
      breakable: (iv, sp = 40, size = 14, o = {}) => every("k", iv, () => add(p.x, BOX.y - 12, Math.PI / 2, sp, size, { ...C("rain", o), hp: o.hp || 5 })),   // big bullet that player/ally shots wear down; hp 0 = gone
      // bullet that hangs above the player and flips state on every player/ally hit: o.states = [{vx, vy, col}] cycled in order (default still <-> sideways)
      toggle: (iv, size = 12, o = {}) => every("t", iv, () => {
        const c0 = C("rain", o).col, st = o.states || [{ vx: 0, vy: 0, col: c0 }, { vx: 90, vy: 0, col: `hsl(${(hue + 180) % 360},100%,70%)` }];
        add(p.x, BOX.y + 40, 0, 0, size, { col: st[0].col }); const b = s.bullets[s.bullets.length - 1]; b.tg = st; b.st = 0; b.life = o.life || 8;   // expires, so still ones cannot pile up and block shots
      }),
      // 방향 벽: a full-height column with no gap sweeps the box sideways, alternating sides; under a dirRule only moving WITH it is safe (sp must beat the player's speed so it overtakes)
      dirWall: (iv, sp = 260, size = 8, o) => every("dw", iv, () => { dwSide = -dwSide; for (let y = BOX.y + 6; y < BOX.y + BOX.h; y += 14) add(dwSide > 0 ? BOX.x - 10 : BOX.x + BOX.w + 10, y, dwSide > 0 ? 0 : Math.PI, sp, size, C("wall", o)); }),
      // boss-only barrages. door: a full-height row from alternating sides with one gap; bloom: ring whose bullets curve alternately left / right (petals);
      // closing: ring drawn around the player's position with one gap, bullets converge slowly
      door: (iv, sp = 150, size = 7, o) => every("dr", iv, () => { dwSide = -dwSide; const gap = BOX.y + 40 + rng() * (BOX.h - 80); for (let y = BOX.y + 6; y < BOX.y + BOX.h; y += 16) if (Math.abs(y - gap) > 34) add(dwSide > 0 ? BOX.x - 10 : BOX.x + BOX.w + 10, y, dwSide > 0 ? 0 : Math.PI, sp, size, C("door", o)); }),
      bloom: (iv, n = 12, sp = 90, size = 6, o) => every("bl", iv, () => { const off = rng() * TAU; for (let i = 0; i < n; i++) add(e.x, e.y + 55, off + i * TAU / n, sp, size, C("bloom", { w: i % 2 ? 1.1 : -1.1, ...o })); }),
      closing: (iv, n = 16, r = 70, sp = 45, size = 6, o) => every("cl", iv, () => { const off = rng() * TAU, g = Math.floor(rng() * n); for (let i = 0; i < n; i++) if (i !== g && i !== (g + 1) % n) { const a = off + i * TAU / n; add(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, a + Math.PI, sp, size, C("closing", o)); } }),
      // stage 5-6 boss barrages. shelf: three pages slide in from alternating sides, stop mid-box, then rush on; hush: bullets creep in from the whole rim of the box toward its centre (final fight)
      shelf: (iv, sp = 150, size = 8, o) => every("sh", iv, () => { dwSide = -dwSide; for (let i = 0; i < 3; i++) add(dwSide > 0 ? BOX.x - 10 : BOX.x + BOX.w + 10, BOX.y + 30 + rng() * (BOX.h - 60), dwSide > 0 ? 0 : Math.PI, sp, size, C("shelf", { stall: { t: .6, d: .7, sp: sp * 1.8 }, ...o })); }),
      hush: (iv, n = 18, sp = 40, size = 6, o) => every("hu", iv, () => { const off = rng(); for (let i = 0; i < n; i++) { const u = (off + i / n) % 1 * 2 * (BOX.w + BOX.h), x = u < BOX.w ? BOX.x + u : u < BOX.w + BOX.h ? BOX.x + BOX.w : u < 2 * BOX.w + BOX.h ? BOX.x + 2 * BOX.w + BOX.h - u : BOX.x, y = u < BOX.w ? BOX.y : u < BOX.w + BOX.h ? BOX.y + u - BOX.w : u < 2 * BOX.w + BOX.h ? BOX.y + BOX.h : BOX.y + 2 * (BOX.w + BOX.h) - u; add(x, y, Math.atan2(BOX.y + BOX.h / 2 - y, BOX.x + BOX.w / 2 - x), sp, size, C("hush", o)); } }),
      // new motions: bounce (reflects off the side walls bn times), stall (stops at t for d s, then leaves at speed sp), homing (steers toward the player for t s)
      bounce: (iv, sp = 170, size = 6, o) => every("bn", iv, () => add(e.x, e.y + 55, Math.PI / 2 + (rng() < .5 ? -.8 : .8), sp, size, C("bounce", { bn: 3, ...o }))),
      stall: (iv, sp = 130, size = 6, o) => every("st", iv, () => add(e.x, e.y + 55, Math.atan2(p.y - e.y - 55, p.x - e.x), sp, size, C("stall", { stall: { t: .5, d: .6, sp: sp * 2 }, ...o }))),
      homing: (iv, sp = 130, size = 6, o) => every("hm", iv, () => add(e.x, e.y + 55, Math.PI / 2, sp, size, C("homing", { home: { t: 1.2, w: 1.6 }, ...o }))),
      // lasting threats: zone = floor patch under the player, harmless for warn s then hurting for dur s; swell = orb that grows to k x its size over t s, then bursts into a ring of n
      zone: (iv, o = {}) => every("z", iv, () => zone(p.x, p.y, o.r || 50, o.warn || 1, o.dur || 2)),
      swell: (iv, sp = 40, size = 8, o = {}) => every("sw", iv, () => add(e.x, e.y + 55, Math.atan2(p.y - e.y - 55, p.x - e.x), sp, size, { ...C("swell", o), gr: o.k || 2.5, split: { t: o.t || 1.5, n: o.n || 10, sp: o.ringSp || 110, size: 5 } })),
      laser: (iv, aimed, o = {}) => every("l", iv, () => {                                // telegraphed beam: aimed at the player, or a straight drop
        if (aimed) laser(e.x, e.y + 55, Math.atan2(p.y - e.y - 55, p.x - e.x), o.w || 26, o.warn || 1, o.dur || .5);
        else laser(rng() < .6 ? p.x : BOX.x + 20 + rng() * (BOX.w - 40), e.y + 55, Math.PI / 2, o.w || 34, o.warn || 1, o.dur || .5);
      }),
    };

    const hit = d => hurt(Math.round(d * atkK));   // non-bullet damage (zone, laser, touch, split, box) scales with the stage like bullets do
    const wipe = () => { hist = []; rev = null; };   // the field was cleared / rewritten: a rewind must not bring the old bullets back
    function hurt(d) {
      if (s.shieldOn) { s.shieldOn = false; s.cool[s.allyId].shield = SHIELD_CD[blv()]; s.inv = .6; emit("shieldBlock"); return; }
      s.hp -= d; s.inv = 1; emit("playerHurt", { dmg: d });
    }

    // 유대의 빛: clears the field, hurts the enemy, heals, and the bond (ally strength) rises one level
    function burst() {
      s.gauge = 0; const was = blv(); bonus++;
      const lt = light(), dmg = cfg.invuln ? 0 : Math.round((8 + 4 * blv()) * (lt === "power" ? 1.5 : 1)); s.bullets = []; wipe(); s.lasers = []; if (!lt || lt === "heal")   s.hp = Math.min(MAX_HP, s.hp + 3);
      if (lt === "clock") s.swapCd = 0;                                   // 시계의 빛: the swap cooldown is wound back
      const full = blv() >= BOND_MAX, fin = rl("finale"), joint = cfg.jointLight && full;
      s.eHp = fin ? (full ? 0 : Math.max(1, s.eHp - dmg)) : s.eHp - dmg;   // finale: only a full-bond burst can finish (with or without cfg.jointLight)
      emit("burst", { dmg, level: blv(), up: blv() > was, light: lt });
      if (joint && (fin || !(cfg.phaseRules && cfg.phaseRules.some(x => x.finale)))) emit("jointLight", { allies: cfg.allies || [cfg.ally] });   // 합동 유대의 빛: bond full, everyone bursts
      if ((!lt || lt === "shield") && blv() >= SHIELD_LV && kit().shield && !s.shieldOn && s.cool[s.allyId].shield <= 0) s.shieldOn = true;
    }

    const gT = {}, gP = {};   // ghost hp bar: the white chunk waits 1s after the first hit (later hits don't extend it), then drains at 40% of max per second
    function trail(k, v, max, dt) {
      if (v < (gP[k] ?? s[k]) && !(gT[k] > 0)) gT[k] = 1;
      gP[k] = v;
      if (v >= s[k]) s[k] = v;
      else if ((gT[k] -= dt) <= 0) s[k] = Math.max(v, s[k] - max * .4 * dt);
    }
    function update(dt, input) {
      // 조작 반전 규칙 / 판 분할 규칙: cycles of `period` s; the last `warn` s of each cycle is the warning, the first `dur` s the effect
      const ir = rl("invertRule"), sr = rl("splitRule"), cyc = r => { const c = s.t % r.period; return c >= r.period - r.warn ? "warn" : c < r.dur && s.t >= r.period ? "on" : null; };
      if (ir) { const ph = cyc(ir); if (ph === "warn" && !s.invertWarn) emit("invertWarn"); s.invertWarn = ph === "warn"; s.inverted = ph === "on"; } else s.invertWarn = s.inverted = false;
      if (sr) {
        const ph = cyc(sr);
        if (ph === "warn" && !(s.split && !s.split.active)) { s.split = { safe: rng() < .5 ? -1 : 1, active: false }; emit("splitWarn", { safe: s.split.safe }); }
        else if (ph === "on" && s.split && !s.split.active) { s.split.active = true; emit("boxSplit", { safe: s.split.safe }); }
        else if (!ph) s.split = null;
        if (s.split && s.split.active && s.inv <= 0 && (p.x < BOX.x + BOX.w / 2 ? -1 : 1) !== s.split.safe) hit(sr.dmg || 4);
      } else s.split = null;
      let ox = p.x, oy = p.y; const firing = s.auto, spd = firing ? 150 : 210, sg = s.inverted ? -1 : 1, dx = sg * (input.dx || 0), dy = sg * (input.dy || 0), n = Math.hypot(dx, dy) || 1, m = 10;
      s.lastIn = dx || dy ? { dx: dx / n, dy: dy / n } : null; s.dashCd -= dt;
      const dashing = s.dashT > 0, vx = dashing ? s.dashDir.dx * DASH_D / DASH_T : dx / n * spd, vy = dashing ? s.dashDir.dy * DASH_D / DASH_T : dy / n * spd;
      if (dashing) { s.dashT -= dt; s.inv = Math.max(s.inv, .02); }                  // 대시: untouchable while it lasts
      const br = rl("boxRule");   // 판 규칙: the box slides about its home spot and drags the player; the arena walls stay put, and being carried into one hurts
      if (br) {
        const nx = BOX0.x + br.amp * Math.sin(TAU * s.t / br.period), carried = p.x + nx - BOX.x, wall = Math.min(BOX0.x + BOX0.w - m, Math.max(BOX0.x + m, carried));
        BOX.x = nx; p.x = wall;
        if (wall !== carried && s.inv <= 0) hit(br.dmg || 4);
        slid = true;
      } else if (slid) { BOX.x = BOX0.x; slid = false; }   // the rule ended with the phase: the box settles home
      ox = p.x;   // dirRule compares the player's own displacement: the box carry above does not count
      p.x = Math.min(BOX.x + BOX.w - m, Math.max(BOX.x + m, p.x + vx * dt));
      p.y = Math.min(BOX.y + BOX.h - m, Math.max(BOX.y + m, p.y + vy * dt));
      s.t += dt; s.inv -= dt; s.swapCd -= dt; cd -= dt; comboT -= dt; dtc = dt; if (comboT <= 0) s.combo = 0;
      if (!started && s.t > 1) {
        started = true; const l0 = cfg.talks && cfg.talks[0];                  // talks[0]: spoken before the first pattern
        emit("phase", { level: 0, name: (cfg.names && cfg.names[0]) || "", talk: !!l0, start: true });
        if (l0) s.talk = { lines: l0, i: 0 };
        if (cfg.ally && blv()) emit("bondStart", { level: blv() });
      }

      // ---- enemy movement: sway / chase along the top, plus warned body-slams down into the box ----
      const mv = (cfg.moves && cfg.moves[Math.min(s.level, cfg.moves.length - 1)]) || {};
      if (s.t > 1) {
        const clampX = x => Math.min(BOX.x + BOX.w - 30, Math.max(BOX.x + 30, x));
        if (e.mode === "idle" || e.mode === "back") {
          const tx = clampX(mv.x === "sway" ? EX + (mv.amp || 60) * Math.sin(s.t * (mv.spd || 1)) : mv.x === "chase" ? p.x : EX), mx = (mv.speed || 150) * dt;
          e.x += Math.max(-mx, Math.min(mx, tx - e.x));
          if (e.mode === "back") { e.y -= 280 * dt; if (e.y <= 85) { e.y = 85; e.mode = "idle"; e.dashT = 0; } }
          else if (mv.dash && (e.dashT += dt) > mv.dash) { e.mode = "warn"; e.tt = 0; e.lx = clampX(p.x); emit("dashWarn"); }
        } else if (e.mode === "warn") {
          e.lx += (clampX(p.x) - e.lx) * Math.min(1, dt * 1.2);            // slowly tracks the player, then locks
          if ((e.tt += dt) > .9) { e.mode = "dive"; emit("dashStart"); }
        } else if (e.mode === "dive") {
          const tx = e.lx, ty = BOX.y + BOX.h - 30, d = Math.hypot(tx - e.x, ty - e.y) || 1, v = 520 * dt;
          e.x += (tx - e.x) / d * Math.min(v, d); e.y += (ty - e.y) / d * Math.min(v, d);
          if (d < 8) { e.mode = "back"; emit("dashEnd"); }
        }
        if (e.mode !== "idle" && s.inv <= 0 && Math.hypot(e.x - p.x, e.y - p.y) < E_R + HITBOX + 6) hit(6);   // touching the enemy hurts
      }

      if (firing && cd <= 0) { cd = .12; s.shots.push({ x: p.x, y: p.y - 12, vx: 0, vy: -560, dmg: GROWTH.shotDmg(s.lv) }); emit("playerShot"); }
      if (cfg.ally) {                                                      // companion: strength follows the bond level
        const lv = blv();
        al.y += (p.y - al.y) * Math.min(1, dt * 3); allyCd -= dt; for (const c of Object.values(s.cool)) { c.heal = Math.max(0, c.heal - dt); c.shield = Math.max(0, c.shield - dt); c.sig = Math.max(0, c.sig - dt); }
        if (allyCd <= 0 && s.t > 1) {
          allyCd = GROWTH.ally.cd[lv] * kit().cd; const a = Math.atan2(e.y - al.y, e.x - al.x), dmg = GROWTH.ally.dmg[lv] * kit().dm, n = GROWTH.ally.hits[lv];
          for (let i = 0; i < n; i++) { const aa = a + (i ? .12 : n > 1 ? -.12 : 0); s.shots.push({ x: al.x, y: al.y, vx: Math.cos(aa) * 460, vy: Math.sin(aa) * 460, dmg, ally: true }); }
          emit("allyShot");
        }
        const me = s.cool[s.allyId], ha = lv >= 3 ? 3 : 2;
        if (me.heal <= 0) { me.heal = HEAL_IV[lv]; if (kit().heal && s.hp < MAX_HP) { s.hp = Math.min(MAX_HP, s.hp + ha); emit("heal", { amount: ha }); } }
        if (allies && SIG[s.allyId] && me.sig <= 0 && s.t > 1) {            // signature move: a different action per companion, stronger with the bond
          const g = SIG[s.allyId], pw = g.power[lv]; me.sig = SIG_CD[lv];
          if (g.kind === "ward") s.inv = Math.max(s.inv, pw);
          else if (g.kind === "blast") s.eHp = cfg.invuln ? s.eHp : rl("finale") ? Math.max(1, s.eHp - pw) : s.eHp - pw;
          else if (g.kind === "reflect") for (const b of s.bullets) { if (Math.hypot(b.x - p.x, b.y - p.y) <= pw) { b.vx = -b.vx; b.vy = -b.vy; b.acc = 0; b.w = 0; b.home = null; } wipe(); }
          else { s.bullets = s.bullets.filter(b => Math.hypot(b.x - p.x, b.y - p.y) > pw); wipe(); }
          emit("signature", { ally: s.allyId, kind: g.kind, power: pw, call: g.call });
        }
        // shield: blocks one hit, then regrows after shieldT seconds (the timer only runs while a shield-bearer is out)
        if (lv >= SHIELD_LV && kit().shield && !s.shieldOn && me.shield <= 0) { s.shieldOn = true; emit("shieldReady"); }
        for (const b of s.bullets) {                                       // graze: slipping past a bullet fills the bond gauge
          if (b.gz || s.inv > 0) continue;
          const d = Math.hypot(b.x - p.x, b.y - p.y);
          if (d > b.r + HITBOX && d < b.r + HITBOX + 16) { b.gz = true; s.gauge = Math.min(100, s.gauge + 4); emit("graze"); }
        }
        if (s.gauge >= 100) burst();
      }
      for (const sh of s.shots) { sh.x += sh.vx * dt; sh.y += sh.vy * dt; }
      const hitTargets = s.bullets.some(b => b.hp > 0 || b.tg);              // most frames have none: skip the shots x bullets passes
      if (hitTargets) for (const sh of s.shots) for (const b of s.bullets) if (b.hp > 0 && !b.dead && !sh.dead && Math.hypot(b.x - sh.x, b.y - sh.y) < b.r + 4) {   // breakable bullet absorbs the shot
        sh.dead = true; b.hp -= sh.dmg;
        if (b.hp <= 0) { b.dead = true; spent.add(b.id); emit("break", { x: b.x, y: b.y }); }
      }
      if (hitTargets) for (const sh of s.shots) for (const b of s.bullets) if (b.tg && !b.dead && !sh.dead && Math.hypot(b.x - sh.x, b.y - sh.y) < b.r + 4) {   // toggle bullet: a hit absorbs the shot and flips its state
        sh.dead = true; b.st = (b.st + 1) % b.tg.length; const t = b.tg[b.st]; b.vx = t.vx; b.vy = t.vy; b.col = t.col;
      }
      for (const b of s.bullets) if (b.tg && (b.x < BOX.x + b.r && b.vx < 0 || b.x > BOX.x + BOX.w - b.r && b.vx > 0)) b.vx = -b.vx;   // sway turns at the walls
      for (const sh of s.shots) if (!sh.dead && sh.y < e.y + 65 && sh.y > e.y - 80 && Math.abs(sh.x - e.x) < E_W) {   // shot lands wherever the enemy is
        const d = cfg.invuln || rl("finale") ? 0 : sh.dmg;                                 // invuln enemy: hits land (ting!) but deal 0
        sh.dead = true; s.eHp -= d; s.combo++; comboT = .5;
        emit("enemyHit", { x: sh.x, y: sh.y, dmg: d, ally: !!sh.ally, combo: s.combo });
      }
      s.shots = s.shots.filter(sh => !sh.dead && sh.y > -20 && sh.x > -20 && sh.x < 980);

      const r = s.eHp / E_MAX, lv2 = cuts.filter(c => r <= c).length;      // each phase has its own pattern
      if (lv2 > s.level) {
        s.level = lv2; s.xp += XP_PHASE; if (s.xp >= XP_LV) { s.xp -= XP_LV; s.lv++; }   // exp per phase broken; level is display only
        s.bullets = []; s.lasers = []; s.zones = []; tm = {}; hist = []; rev = null; nextRw = rl("rewind") ? s.t + rl("rewind") : 0; e.mode = "idle"; e.y = 85; e.dashT = 0;
        const lines = cfg.talks && cfg.talks[lv2];
        emit("phase", { level: lv2, name: (cfg.names && cfg.names[lv2]) || "", talk: !!lines });
        if (lines) s.talk = { lines, i: 0 };
      }

      if (s.t > 1 && !s.talk && !rev && (e.mode === "idle" || e.mode === "warn")) cfg.phases[Math.min(s.level, cfg.phases.length - 1)](h);   // 1s grace; the enemy rests its guns while diving
      for (const b of rev ? [] : s.bullets) {                              // bullets stand still in the sim while a rewind replays them
        b.age += dt; if (b.life && b.age > b.life) b.dead = true;
        if (b.gr) b.r = b.r0 * (1 + (b.gr - 1) * Math.min(1, b.age / b.split.t));
        if (b.sa) { b.y += b.vy * dt; b.x = b.bx + b.sa * Math.sin(b.sf * b.age + b.ph); }
        else {
          if (b.home && b.age < b.home.t) { const cur = Math.atan2(b.vy, b.vx), t = Math.atan2(p.y - b.y, p.x - b.x), d = Math.atan2(Math.sin(t - cur), Math.cos(t - cur)), a = cur + Math.max(-b.home.w * dt, Math.min(b.home.w * dt, d)), v = Math.hypot(b.vx, b.vy); b.vx = Math.cos(a) * v; b.vy = Math.sin(a) * v; }
          const st = b.stall;
          if (st && !b.sg && b.age > st.t) { b.sg = 1; b.sa0 = Math.atan2(b.vy, b.vx); b.vx = b.vy = 0; }
          else if (st && b.sg === 1 && b.age > st.t + st.d) { b.sg = 2; b.vx = Math.cos(b.sa0) * st.sp; b.vy = Math.sin(b.sa0) * st.sp; }
          if (b.w) { const c = Math.cos(b.w * dt), sn = Math.sin(b.w * dt), vx = b.vx * c - b.vy * sn; b.vy = b.vx * sn + b.vy * c; b.vx = vx; }
          if (b.acc) { const k = Math.max(.2, 1 + b.acc * dt); b.vx *= k; b.vy *= k; }
          b.x += b.vx * dt; b.y += b.vy * dt;
          if (b.bn > 0 && (b.x < BOX.x || b.x > BOX.x + BOX.w)) { b.bn--; b.vx = -b.vx; b.x = Math.min(BOX.x + BOX.w, Math.max(BOX.x, b.x)); }
        }
        b.tr.push({ x: b.x, y: b.y }); if (b.tr.length > 5) b.tr.shift();
        if (b.split && b.age > b.split.t) {                                // heavy orb bursts into a ring
          const sp = b.split, off = rng() * TAU; b.dead = true; emit("split");
          for (let i = 0; i < sp.n; i++) add(b.x, b.y, off + i * TAU / sp.n, sp.sp, sp.size, { col: b.col });
        }
      }
      s.bullets = s.bullets.filter(b => !b.dead && b.y < BOX.y + BOX.h + 20 && b.y > BOX.y - 120 && b.x > BOX.x - 40 && b.x < BOX.x + BOX.w + 40);
      if (rl("rewind")) {                                                    // 되감기 규칙: every cfg.rewind seconds the bullets fly back along their path for REWIND_BACK s
        if (rev) {
          const sn = rev.snaps, tgt = sn[sn.length - 1].t - (s.t - rev.t0);
          if (tgt <= sn[0].t) { s.bullets = sn[0].b.filter(b => !spent.has(b.id)); rev = null; }   // arrived at the spot of REWIND_BACK s ago
          else {
            let k = sn.length - 2; while (k > 0 && sn[k].t > tgt) k--;
            const a = sn[k], c = sn[k + 1], f = (tgt - a.t) / (c.t - a.t), cm = new Map(c.b.map(b => [b.id, b]));
            s.bullets = a.b.filter(b => !spent.has(b.id)).map(b => { const n = cm.get(b.id); return n ? { ...b, x: b.x + (n.x - b.x) * f, y: b.y + (n.y - b.y) * f } : { ...b }; });   // lerp between 50ms snapshots
          }
        } else {
          if (!hist.length || s.t - hist[hist.length - 1].t >= .05) hist.push({ t: s.t, b: s.bullets.map(b => ({ ...b, tr: b.tr.slice() })) });   // ponytail: 50ms snapshots, not every frame
          while (hist[0].t < s.t - REWIND_BACK) hist.shift();
          if (s.t >= nextRw) { nextRw += rl("rewind"); hist.push({ t: s.t, b: s.bullets.map(b => ({ ...b, tr: b.tr.slice() })) }); if (hist.length > 1) rev = { snaps: hist, t0: s.t }; hist = []; emit("rewind"); }
        }
      }
      for (const l of s.lasers) {
        l.age += dt;
        if (!l.ping) { l.ping = true; emit("laserWarn", { warn: l.warn, w: l.w }); }
        if (!l.boom && l.age >= l.warn) { l.boom = true; emit("laserFire"); }
        if (l.boom && l.age < l.warn + l.dur && s.inv <= 0) {
          const ddx = p.x - l.x, ddy = p.y - l.y, along = ddx * Math.cos(l.a) + ddy * Math.sin(l.a), perp = Math.abs(-ddx * Math.sin(l.a) + ddy * Math.cos(l.a));
          if (along > 0 && perp < l.w / 2 + HITBOX) hit(5);
        }
      }
      for (const z of s.zones) {
        z.age += dt;
        if (z.age >= z.warn && z.age < z.warn + z.dur && s.inv <= 0 && Math.hypot(p.x - z.x, p.y - z.y) < z.r + HITBOX) hit(4);
      }
      s.zones = s.zones.filter(z => z.age < z.warn + z.dur);
      s.lasers = s.lasers.filter(l => l.age < l.warn + l.dur + .15);
      if (s.inv <= 0) {
        const i = s.bullets.findIndex(b => (!rl("colorRule") || b.col === rl("colorRule")) && !(b.nm && (p.x - ox) * b.vx + (p.y - oy) * b.vy > 0) && Math.hypot(b.x - p.x, b.y - p.y) < b.r + HITBOX);
        if (i >= 0) { const d = s.bullets[i].dmg; spent.add(s.bullets[i].id); s.bullets.splice(i, 1); hurt(d); }
      }
      if (cfg.survive) s.surviveLeft = Math.max(0, cfg.survive - Math.max(0, s.t - 1));   // escape battle: outlast the clock after the 1s grace
      trail("eGhost", s.eHp, E_MAX, dt); trail("pGhost", s.hp, MAX_HP, dt);
      if (s.hp <= 0) { s.over = "lose"; emit("lose"); }
      else if (s.eHp <= 0 || (cfg.survive && s.surviveLeft <= 0)) { s.over = "win"; s.bullets = []; s.lasers = []; s.zones = []; emit("win"); }
      s.bondLv = blv(); s.phaseName = (cfg.names && cfg.names[s.level]) || "";
    }

    return {
      state: s, BOX,
      step(dt, input = {}) { dt = Math.min(dt, .05); if (!s.over && !s.talk) update(dt, input); const out = ev; ev = []; return out; },
      cooldownRings() {                                                      // display: fill 0..1 per ring, 1 = ready (companion rings follow the one out now)
        const f = (left, total) => total > 0 ? Math.max(0, Math.min(1, 1 - left / total)) : 1, c = s.cool[s.allyId] || { heal: 0, shield: 0, sig: 0 }, lv = blv();
        const k = kit();                                                     // null = this companion has no such ability (yet): the view draws no ring
        return { dash: f(s.dashCd, DASH_CD), heal: k.heal ? f(c.heal, HEAL_IV[lv]) : null, shield: s.shieldOn ? 1 : k.shield && lv >= SHIELD_LV ? f(c.shield, SHIELD_CD[lv]) : null, sig: SIG[s.allyId] ? f(c.sig, SIG_CD[lv]) : null };
      },
      toggleFire() { s.auto = !s.auto; return s.auto; },
      swap() {                                                               // 교대: hand the support role to the next companion; bond level and gauge are shared
        if (!allies || s.over || s.talk || s.swapCd > 0) return false;
        s.allyId = allies[(allies.indexOf(s.allyId) + 1) % allies.length]; s.swapCd = SWAP_CD;
        if (!kit().shield) s.shieldOn = false;
        emit("swap", { ally: s.allyId }); return true;
      },
      dash() {                                                               // 대시: burst in the held direction, invulnerable, with a cooldown
        if (s.over || s.talk || s.dashCd > 0 || s.dashT > 0 || !s.lastIn) return false;
        s.dashDir = s.lastIn; s.dashT = DASH_T; s.dashCd = DASH_CD; s.inv = Math.max(s.inv, DASH_T + .02);
        emit("dash", { dx: s.dashDir.dx, dy: s.dashDir.dy }); return true;
      },
      advance() { if (s.talk && ++s.talk.i >= s.talk.lines.length) s.talk = null; },
    };
  }

  // Display only (never read by the rules): squash & stretch of the player sprite. v = velocity in px/s; look = {sx, sy, rot} is eased in place.
  function moveLook(look, vx, vy, dt) {
    const r = Math.min(1, Math.hypot(vx, vy) / 210), k = 1 - Math.exp(-dt * 14);
    if (r > .05) look.rot = Math.atan2(vy, vx);
    look.sx += (1 + .35 * r - look.sx) * k; look.sy += (1 - .25 * r - look.sy) * k;
    return look;
  }

  // every number drawn on screen goes through this: 3 significant figures (>= 100 stays whole), no 3.5999999
  const fmtNum = x => String(Math.abs(x) >= 100 ? Math.round(x) : Math.round(x * 10) / 10 || 0);   // at most one decimal

  // damage -> hit feedback: tier 0/1/2 (weak/medium/strong) by the share of max hp lost, strengths rise smoothly up to a 40% hit
  const hitFeel = (dmg, max) => {
    const f = max > 0 ? dmg / max : 1, t = Math.min(1, f / .4);
    return { tier: f < .08 ? 0 : f < .2 ? 1 : 2, shakeMs: 150 + 350 * t, shakeAmp: .4 + 1.2 * t, stop: .02 + .14 * t, vignette: .2 + .8 * t };
  };
  const isLowHp = (hp, max) => hp > 0 && hp <= max * .25;
  // one name per line: parallel tickets add exports here, and a shared line conflicts on every merge
  const PUBLIC = {
    createBattle,
    GROWTH,
    moveLook,
    fmtNum,
    hitFeel,
    isLowHp,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = { ...PUBLIC, BOX: BOX0 };
  else Object.assign(root, PUBLIC);
})(typeof window !== "undefined" ? window : globalThis);
