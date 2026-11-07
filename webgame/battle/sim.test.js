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

test("invulnerable enemy: hits and the bond burst deal 0; surviving the clock wins", () => {
  const cfg = { ...quiet, hp: 100, ally: "lumi", invuln: true, survive: 3, gauge0: 100 };
  const b = createBattle(cfg, { rng: seeded(7), bondBase: 1 });
  const ev = run(b, 2.5);
  assert.ok(ev.some(v => v.type === "burst" && v.dmg === 0));
  const hits = ev.filter(v => v.type === "enemyHit"); assert.ok(hits.length > 0 && hits.every(v => v.dmg === 0));
  assert.strictEqual(b.state.eHp, 100); assert.ok(!b.state.over, "not won before the clock runs out");
  const ev2 = run(b, 2); assert.ok(ev2.some(v => v.type === "win") && b.state.over === "win");
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
