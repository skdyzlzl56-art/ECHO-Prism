// Headless tests for the battle rules. Run: node --test webgame/battle
const test = require("node:test"), assert = require("node:assert");
const { createBattle, BOX } = require("./sim.js");

// seeded rng (mulberry32) so every run is the same
const seeded = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const run = (b, secs, input = {}, dt = 1 / 60) => { const ev = []; for (let t = 0; t < secs; t += dt) ev.push(...b.step(dt, input)); return ev; };
const quiet = { hp: 1e6, playerHp: 1e6, phases: [() => {}], names: [] };   // a battle that spawns nothing by itself

test("every wall has a gap wide enough to slip through", () => {
  const b = createBattle({ ...quiet, phases: [h => h.wall(.5, 95)] }, { rng: seeded(1) });
  b.state.auto = false;
  run(b, 1.6);                                                            // 1s grace + first wall
  const row = b.state.bullets.filter(x => x.age < .2);
  assert.ok(row.length > 5, "a wall was spawned");
  const xs = [BOX.x, ...row.map(x => x.x).sort((a, c) => a - c), BOX.x + BOX.w];
  const widest = Math.max(...xs.slice(1).map((x, i) => x - xs[i]));
  assert.ok(widest >= 80, `widest gap ${widest}`);
});

test("phase changes at the cut and a phase talk freezes the world until advanced", () => {
  const cfg = { ...quiet, hp: 100, cuts: [.5], names: ["a", "b"], phases: [() => {}, () => {}], talks: { 1: [{ who: "x", t: "1" }, { who: "x", t: "2" }] } };
  const b = createBattle(cfg, { rng: seeded(2) });
  b.state.auto = false; run(b, .2);
  b.state.eHp = 49;
  const ev = run(b, .1);
  const ph = ev.find(v => v.type === "phase");
  assert.ok(ph && ph.level === 1 && ph.talk && ph.name === "b");
  assert.strictEqual(b.state.level, 1);
  const t0 = b.state.t; run(b, .5);
  assert.strictEqual(b.state.t, t0, "time does not advance during dialogue");
  b.advance(); assert.ok(b.state.talk); b.advance(); assert.strictEqual(b.state.talk, null);
  run(b, .1); assert.ok(b.state.t > t0);
});

test("a full bond gauge bursts: clears bullets, hurts the enemy and raises the bond level", () => {
  const cfg = { ...quiet, hp: 1000, ally: "lumi", gauge0: 100 };
  const b = createBattle(cfg, { rng: seeded(3), bondBase: 1 });
  b.state.auto = false;
  const ev = b.step(1 / 60);
  const burst = ev.find(v => v.type === "burst");
  assert.ok(burst && burst.up && burst.level === 2);
  assert.strictEqual(b.state.bondLv, 2);
  assert.strictEqual(b.state.eHp, 1000 - (8 + 4 * 2));
  assert.strictEqual(b.state.gauge, 0);
});

test("a body-slam is warned before it dives, and the enemy comes back", () => {
  const cfg = { ...quiet, hp: 1e6, moves: [{ x: "sway", amp: 50, spd: 1, dash: 1 }] };
  const b = createBattle(cfg, { rng: seeded(4) });
  b.state.auto = false;
  const times = {}; let t = 0;
  for (let i = 0; i < 60 * 8; i++) { t += 1 / 60; for (const v of b.step(1 / 60, { dx: 0, dy: 1 })) if (v.type.startsWith("dash") && !times[v.type]) times[v.type] = t; }
  assert.ok(times.dashWarn && times.dashStart && times.dashEnd, JSON.stringify(times));
  assert.ok(times.dashStart - times.dashWarn >= .85, "warning lasts about a second");
  assert.ok(times.dashWarn < times.dashStart && times.dashStart < times.dashEnd);
});

test("the player is kept inside the box", () => {
  const b = createBattle({ ...quiet }, { rng: seeded(5) });
  run(b, 5, { dx: 1, dy: 1 });
  const p = b.state.p;
  assert.ok(p.x <= BOX.x + BOX.w && p.y <= BOX.y + BOX.h && p.x >= BOX.x && p.y >= BOX.y);
});

test("swap (교대): cooldown, bond shared, kits differ (lumi heals / hexa shields)", () => {
  const cfg = { ...quiet, hp: 1000, ally: "lumi", allies: ["lumi", "hexa"], playerHp: 20 };
  const b = createBattle(cfg, { rng: seeded(6), bondBase: 2 });
  b.state.auto = false; const s = b.state;
  assert.strictEqual(s.allyId, "lumi"); assert.strictEqual(s.shieldOn, false, "lumi has no shield");
  assert.ok(b.swap(), "swap works"); assert.strictEqual(s.allyId, "hexa");
  assert.ok(!b.swap(), "swap is on cooldown");
  run(b, 1.7); assert.ok(s.shieldOn, "hexa's shield grows in"); assert.strictEqual(s.bondLv, 2, "bond is kept");
  b.swap(); assert.strictEqual(s.allyId, "lumi"); assert.strictEqual(s.shieldOn, false, "shield leaves with hexa");
  const single = createBattle({ ...quiet, ally: "lumi" }, { rng: seeded(6), bondBase: 2 });
  assert.ok(!single.swap() && single.state.shieldOn, "a lone ally keeps the old all-round kit");
});

test("swap cycles 4 allies in order, keeps cooldown, and bond is one shared value", () => {
  const ids = ["lumi", "hexa", "a3", "a4"], kits = { a3: { cd: 1, dm: 1, heal: 0, shield: 0 }, a4: { cd: 1, dm: 1, heal: 0, shield: 0 } };
  const b = createBattle({ ...quiet, hp: 1000, ally: "lumi", allies: ids, kits }, { rng: seeded(8), bondBase: 3 });
  b.state.auto = false; const s = b.state, seen = [];
  for (let i = 0; i < 5; i++) { assert.ok(b.swap(), "swap " + i); seen.push(s.allyId); assert.ok(!b.swap(), "cooldown"); run(b, 1.6); }
  assert.deepStrictEqual(seen, ["hexa", "a3", "a4", "lumi", "hexa"]);
  assert.strictEqual(s.bondLv, 3, "bond kept across swaps");
});

test("bond light is per ally: lumi heals, hexa keeps the shield, others do neither", () => {
  const lights = { lumi: "heal", hexa: "shield", a3: "power" }, kits = { a3: { cd: 1, dm: 1, heal: 0, shield: 0 } };
  const mk = id => { const b = createBattle({ ...quiet, hp: 1000, ally: "lumi", allies: [id], kits, lights, gauge0: 100 }, { rng: seeded(9), bondBase: 1 }); b.state.hp = 5; b.state.shieldOn = false; return b; };
  const lumi = mk("lumi"); lumi.step(1 / 60); assert.strictEqual(lumi.state.hp, 5 + 3);
  const hexa = mk("hexa"); const ev = hexa.step(1 / 60); assert.strictEqual(hexa.state.hp, 5); assert.ok(hexa.state.shieldOn); assert.strictEqual(ev.find(v => v.type === "burst").light, "shield");
  const a3 = mk("a3"); const e3 = a3.step(1 / 60); assert.strictEqual(a3.state.hp, 5); assert.ok(!a3.state.shieldOn);
  assert.ok(e3.find(v => v.type === "burst").dmg > hexa.state.eMax - hexa.state.eHp, "power light hits harder");
});

test("invulnerable enemy: hits and the bond burst deal 0; surviving the clock wins", () => {
  const cfg = { ...quiet, hp: 100, ally: "lumi", invuln: true, survive: 3, gauge0: 100 };
  const b = createBattle(cfg, { rng: seeded(7), bondBase: 1 });
  const ev = run(b, 2.5);
  assert.ok(ev.some(v => v.type === "burst" && v.dmg === 0));
  const hits = ev.filter(v => v.type === "enemyHit"); assert.ok(hits.length > 0 && hits.every(v => v.dmg === 0));
  assert.strictEqual(b.state.eHp, 100); assert.ok(!b.state.over, "not won before the clock runs out");
  const ev2 = run(b, 2); assert.ok(ev2.some(v => v.type === "win") && b.state.over === "win");
});

// 색 규칙: cfg.colorRule = a bullet colour; only bullets of that colour can hit the player
const bul = (p, dx, col) => ({ x: p.x + dx, y: p.y, bx: 0, vx: 0, vy: 0, r: 6, dmg: 4, col, w: 0, acc: 0, sa: 0, sf: 3, ph: 0, age: 0, tr: [] });
const still = cfg => { const b = createBattle({ ...quiet, ...cfg }, { rng: seeded(3) }); b.state.auto = false; return b; };

test("colour rule: only the chosen colour hurts; without the option every colour hurts", () => {
  for (const [rule, col, dmg] of [[undefined, "#f00", 4], ["#0f0", "#0f0", 4], ["#0f0", "#f00", 0]]) {
    const b = still({ colorRule: rule }); b.state.bullets.push(bul(b.state.p, 0, col));
    run(b, .05);
    assert.strictEqual(b.state.maxHp - b.state.hp, dmg, `rule ${rule} bullet ${col}`);
  }
});

test("colour rule: graze and the bond gauge still work", () => {
  const b = still({ ally: "lumi", colorRule: "#0f0" }); b.state.bullets.push(bul(b.state.p, 14, "#f00"));
  const ev = run(b, .02);
  assert.ok(ev.some(v => v.type === "graze") && b.state.gauge > 0 && b.state.hp === b.state.maxHp);
});

// 되감기 규칙: cfg.rewind = period in seconds; bullets jump back to where they were 1.5s earlier
const drop = (x, y, vy) => ({ ...bul({ x, y }, 0, "#f00"), vy });

test("rewind: bullets return to their earlier position at the period; without the option nothing rewinds", () => {
  const b = still({ rewind: 3 }), o = still({});
  for (const x of [b, o]) x.state.bullets.push(drop(BOX.x + 20, BOX.y + 10, 50));
  const ev = []; let at = null;
  for (let t = 0; t < 3.2; t += 1 / 60) { ev.push(...b.step(1 / 60)); if (Math.abs(t - 1.5) < 1 / 120) at = b.state.bullets[0].y; }
  assert.strictEqual(ev.filter(v => v.type === "rewind").length, 1);
  const y = b.state.bullets[0].y;                                         // 0.2s of travel after jumping back to the 1.5s position
  assert.ok(Math.abs(y - (at + 50 * .2)) < 4, `y ${y} vs ${at}`);
  const ev2 = run(o, 3.2); assert.ok(!ev2.some(v => v.type === "rewind") && o.state.bullets[0].y > BOX.y + 10 + 50 * 3);
});

test("rewind: a bullet that already hit the player is not replayed", () => {
  const b = still({ rewind: 2 }), p = b.state.p;
  b.state.bullets.push(drop(p.x, p.y - 50 * 1.2, 50));                    // hits honestly at ~1.2s, long before the rewind
  const ev = run(b, 4.5);
  assert.ok(ev.some(v => v.type === "rewind"));
  assert.strictEqual(b.state.maxHp - b.state.hp, 4);
});

// 방향 규칙: cfg.dirRule = {name}; a named bullet is harmless to a player moving the way it moves
test("direction rule: moving with a named bullet is safe; standing still or moving against it hurts; off by default", () => {
  for (const [rule, dx, dmg] of [[{ name: "동쪽" }, 1, 0], [{ name: "동쪽" }, 0, 4], [{ name: "동쪽" }, -1, 4], [undefined, 1, 4]]) {
    const b = still({ dirRule: rule }); const bl = bul(b.state.p, 0, "#f00"); bl.vx = 120; bl.nm = rule && rule.name; b.state.bullets.push(bl);
    run(b, .05, { dx });
    assert.strictEqual(b.state.maxHp - b.state.hp, dmg, `rule ${!!rule} dx ${dx}`);
  }
});

test("direction rule: bullets carry the configured name for display", () => {
  const b = createBattle({ ...quiet, dirRule: { name: "동쪽" }, phases: [h => h.rain(.2)] }, { rng: seeded(4) });
  b.state.auto = false; run(b, 1.5);
  assert.ok(b.state.bullets.length > 0 && b.state.bullets.every(x => x.nm === "동쪽"));
});

// 합동 유대의 빛: cfg.jointLight - the burst that fills the bond to the top becomes a joint light of all allies
test("joint bond light: only when enabled and the bond reaches full; otherwise no event", () => {
  const go = (jointLight, bondBase) => run(createBattle({ ...quiet, hp: 1000, ally: "lumi", allies: ["lumi", "hexa"], gauge0: 100, jointLight }, { rng: seeded(9), bondBase }), .1);
  const ev = go(true, 3), j = ev.find(v => v.type === "jointLight");
  assert.ok(j && j.allies.join() === "lumi,hexa");
  assert.ok(!go(false, 3).some(v => v.type === "jointLight"), "off by default");
  assert.ok(!go(true, 1).some(v => v.type === "jointLight"), "bond not full yet");
});

// 페이즈별 규칙: cfg.phaseRules[level] switches colour / rewind / direction rule per phase; no phaseRules = cfg-level options as before
test("phaseRules: colour rule in phase 0 only, direction rule name on bullets in phase 1 only", () => {
  const cfg = { ...quiet, hp: 100, cuts: [.5], names: ["a", "b"], phaseRules: [{ colorRule: "#ff4d6d" }, { dirRule: { name: "x" } }],
    phases: [h => h.aim(.3, 120, 8, { col: "#00ff00" }), h => h.aim(.3, 120, 8, { col: "#00ff00" })] };
  const b = createBattle(cfg, { rng: seeded(3) }); b.state.auto = false;
  const hp0 = b.state.hp; run(b, 3); assert.strictEqual(b.state.hp, hp0, "non-red bullets pass in phase 0");
  assert.ok(b.state.bullets.every(x => !x.nm));
  b.state.eHp = 40; run(b, .1); assert.strictEqual(b.state.level, 1);
  run(b, 3); assert.ok(b.state.bullets.length && b.state.bullets.every(x => x.nm === "x"), "phase 1 bullets carry the name");
  assert.ok(b.state.hp < hp0, "the colour rule is off in phase 1: green bullets hurt");
});

test("phaseRules: rewind only runs in the phase that asks for it, and restarts its period at the phase change", () => {
  const cfg = { ...quiet, hp: 100, cuts: [.5], names: ["a", "b"], phaseRules: [{}, { rewind: 3 }], phases: [h => h.rain(.3, 100), h => h.rain(.3, 100)] };
  const b = createBattle(cfg, { rng: seeded(4) }); b.state.auto = false;
  assert.ok(!run(b, 8).some(v => v.type === "rewind"), "no rewind in phase 0");
  b.state.eHp = 40; const t0 = b.state.t; const ev = run(b, 4);
  assert.strictEqual(ev.filter(v => v.type === "rewind").length, 1, `one rewind within 3-4 s of the phase change (t0 ${t0})`);
});

test("finale phase: shots deal 0, an ordinary burst cannot kill, and the joint light (bond full) wins", () => {
  const mk = (bondBase, finale = true) => { const b = createBattle({ ...quiet, hp: 100, cuts: [.5], names: ["a", "b"], ally: "lumi", allies: ["lumi", "hexa"], jointLight: true, phaseRules: [{}, { finale }], phases: [() => {}, () => {}] }, { rng: seeded(5), bondBase }); b.state.auto = true; b.state.eHp = 30; return b; };
  const b = mk(0); run(b, 3); assert.strictEqual(b.state.eHp, 30, "shots do nothing in the finale"); assert.ok(!b.state.over);
  b.state.gauge = 100; run(b, .1); assert.ok(b.state.eHp >= 1 && !b.state.over, "bond Lv.1 burst: the enemy lives");
  const w = mk(3); run(w, 3); w.state.gauge = 100; const ev = run(w, .1);
  assert.ok(ev.some(v => v.type === "jointLight") && w.state.over === "win", "bond full: joint light wins");
});

test("clock light (시계의 빛) winds back the swap cooldown; other lights do not", () => {
  const go = light => { const b = createBattle({ ...quiet, ally: "lumi", allies: ["lumi", "keeper"], kits: { keeper: { cd: 1, dm: 1, heal: 0, shield: 0 } }, lights: { keeper: light }, gauge0: 100 }, { rng: seeded(6) }); b.swap(); b.step(1 / 60); return b.state.swapCd; };
  assert.ok(go("clock") <= 0 && go("heal") > 0);
});

// ---- the real stage 1 configs: every phase actually fires, with the player standing still and a huge HP pool ----
global.SPEAKERS = {}; global.BATTLES = {}; global.ACTS = {}; global.runBattle = () => {};
require("../stage1/battles.js"); require("../stage2/battles.js");

for (const name of ["s1_fragments", "s1_boss", "s2_mooks", "s2_silence", "s2_flee"]) {
  const base = global.BATTLES[name];
  base.phases.forEach((phase, i) => test(`${name} phase ${i + 1} fires bullets and does not crash`, () => {
    const cfg = { ...base, hp: 1e6, playerHp: 1e6, cuts: [], phases: [phase], moves: [base.moves[i]], talks: {} };
    const b = createBattle(cfg, { rng: seeded(10 + i), bondBase: 1 });
    b.state.auto = false;
    const ev = run(b, 14);
    assert.ok(ev.filter(v => v.type === "enemyShot").length > 10, "enemy shoots");
    assert.ok(b.state.hp > 0 && !b.state.over);
  }));
}

test("stage 2: 침묵 can be beaten once (5 phases), but the flee battle cannot be won by damage", () => {
  const { s2_silence: sil, s2_flee: flee } = global.BATTLES;
  assert.strictEqual(sil.phases.length, 5); assert.strictEqual(sil.names.length, 5); assert.ok(!sil.invuln);
  assert.ok(flee.invuln && flee.survive === 30 && flee.bgm === null && flee.allies.length === 2);
  const b = createBattle({ ...flee, playerHp: 1e6 }, { rng: seeded(20), bondBase: 2 });
  run(b, 31);                                                             // firing at the whole time: still 0 damage, and the clock ends it
  assert.strictEqual(b.state.eHp, flee.hp); assert.strictEqual(b.state.over, "win");
});

test("stage 1 boss: HP is doubled and has six named phases", () => {
  const boss = global.BATTLES.s1_boss;
  assert.strictEqual(boss.hp, 460);
  assert.strictEqual(boss.names.length, 6);
  assert.strictEqual(boss.phases.length, 6);
});

// ---- code-review fixes ----
test("rewind: a phase change drops the old history even without phaseRules", () => {
  const b = still({ hp: 100, cuts: [.5], rewind: 3 }); b.state.bullets.push(drop(BOX.x + 20, BOX.y + 10, 5));
  run(b, 2); b.state.eHp = 40; run(b, 1.3);                               // phase change at ~2s, rewind due at 3s
  assert.strictEqual(b.state.level, 1); assert.strictEqual(b.state.bullets.length, 0, "no bullets from before the phase change");
});

test("direction rule: pinned against the wall gives no immunity", () => {
  const b = still({ dirRule: { name: "동쪽" } }); b.state.p.x = BOX.x + BOX.w - 10;
  const bl = bul(b.state.p, 0, "#f00"); bl.vx = 120; bl.nm = "동쪽"; b.state.bullets.push(bl);
  run(b, .05, { dx: 1 });
  assert.strictEqual(b.state.maxHp - b.state.hp, 4);
});

test("jointLight event fires only in the finale phase when phaseRules has one", () => {
  const b = createBattle({ ...quiet, hp: 100, cuts: [.5], names: ["a", "b"], ally: "lumi", allies: ["lumi", "hexa"], jointLight: true, phaseRules: [{}, { finale: true }], phases: [() => {}, () => {}] }, { rng: seeded(5), bondBase: 3 });
  b.state.gauge = 100;
  assert.ok(!run(b, .1).some(v => v.type === "jointLight"), "phase 0: ordinary burst");
  assert.ok(!b.state.over);
});

test("finale without jointLight: a full-bond burst still ends it (no soft-lock)", () => {
  const b = createBattle({ ...quiet, hp: 100, cuts: [.5], names: ["a", "b"], ally: "lumi", allies: ["lumi", "hexa"], phaseRules: [{}, { finale: true }], phases: [() => {}, () => {}] }, { rng: seeded(5), bondBase: 3 });
  b.state.eHp = 30; run(b, 1); b.state.gauge = 100; run(b, .1);
  assert.strictEqual(b.state.over, "win");
});

test("breaking a phase gives 20 exp; a full bar levels up and carries the excess", () => {
  const cfg = { ...quiet, hp: 100, cuts: [.75, .5], names: ["a", "b", "c"], phases: [() => {}, () => {}, () => {}] };
  const b = createBattle(cfg, { rng: seeded(4), lv: 1, xp: 90 });
  b.state.auto = false; run(b, .2);
  assert.deepStrictEqual([b.state.lv, b.state.xp], [1, 90]);
  b.state.eHp = 70; run(b, .1);
  assert.deepStrictEqual([b.state.lv, b.state.xp], [2, 10]);
  b.state.eHp = 45; run(b, .1);
  assert.deepStrictEqual([b.state.lv, b.state.xp], [2, 30]);
});

test("exp is a start value: a retry built from it loses the battle's gains, a next battle built from the end state keeps them", () => {
  const cfg = { ...quiet, hp: 100, cuts: [.5], names: ["a", "b"], phases: [() => {}, () => {}] };
  const b = createBattle(cfg, { rng: seeded(5), lv: 1, xp: 50 });
  b.state.auto = false; run(b, .2); b.state.eHp = 40; run(b, .1);
  assert.strictEqual(b.state.xp, 70);
  const retry = createBattle(cfg, { rng: seeded(5), lv: 1, xp: 50 });
  assert.strictEqual(retry.state.xp, 50);
  const next = createBattle(cfg, { rng: seeded(5), lv: b.state.lv, xp: b.state.xp });
  assert.deepStrictEqual([next.state.lv, next.state.xp], [1, 70]);
});

test("move motion stretches along travel and eases back to normal when stopped", () => {
  const { moveLook } = require("./sim.js");
  const look = { sx: 1, sy: 1, rot: 0 };
  for (let i = 0; i < 30; i++) moveLook(look, 210, 0, 1 / 60);
  assert.ok(look.sx > 1.2 && look.sy < .9, `stretched ${look.sx} ${look.sy}`);
  assert.ok(Math.abs(look.rot) < 1e-9, "stretch axis follows travel direction");
  for (let i = 0; i < 90; i++) moveLook(look, 0, 0, 1 / 60);
  assert.ok(Math.abs(look.sx - 1) < .01 && Math.abs(look.sy - 1) < .01, `restored ${look.sx} ${look.sy}`);
});
