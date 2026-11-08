// 정지 규칙: cfg.stillRule = { period, warn, dur, dmg }; "멈춰!" in the last `warn` s, then for `dur` s any movement or dash hurts (at most every 0.5 s); standing still is safe
const test = require("node:test"), assert = require("node:assert");
const { createBattle } = require("./sim.js");

const run = (b, secs, input = {}, dt = 1 / 60) => { const ev = []; for (let t = 0; t < secs; t += dt) ev.push(...b.step(dt, input)); return ev; };
const still = extra => { const b = createBattle({ hp: 1e6, playerHp: 1e6, phases: [() => {}], names: [], ...extra }, { rng: () => .5 }); b.state.auto = false; return b; };
const cfg = { stillRule: { period: 4, warn: 1.5, dur: 1.5, dmg: 3 } };
const hurts = ev => ev.filter(v => v.type === "playerHurt");

test("still rule: warn then on events; moving during the warning is free, moving while it is on hurts", () => {
  const b = still(cfg), s = b.state;
  const ev = run(b, 2.6); assert.ok(ev.some(v => v.type === "stillWarn") && s.still && !s.still.active);
  assert.ok(!hurts(run(b, 1.3, { dx: 1, dy: 0 })).length, "free to move while only warned");
  const ev2 = run(b, .3); assert.ok(ev2.some(v => v.type === "stillOn") && s.still.active);
  const h = hurts(run(b, .6, { dx: -1, dy: 0 })); assert.ok(h.length >= 1 && h[0].dmg === 3);
});

test("still rule: standing still is safe, moving is hurt at most every 0.5s, a dash counts, and it ends after dur", () => {
  const b = still(cfg); run(b, 4.05);
  assert.ok(!hurts(run(b, 1)).length, "no input, no damage");
  const b2 = still({ stillRule: { period: 4, warn: 1.5, dur: 1.5, dmg: 1 } }); run(b2, 4.05);
  const h = hurts(run(b2, 1.4, { dx: 1, dy: 0 })); assert.ok(h.length >= 1 && h.length <= 3, `${h.length} hits`);
  const b3 = still(cfg); run(b3, 3.9); run(b3, .05, { dx: 1, dy: 0 }); assert.ok(b3.dash(), "dash started during the warning");
  assert.ok(hurts(run(b3, .3)).length >= 1, "a dash into the live window hurts too");
  const b4 = still(cfg); run(b4, 5.7); assert.ok(!hurts(run(b4, .2, { dx: 1, dy: 0 })).length, "dur over");
});

test("still rule: off without the option, and phaseRules switch it per phase", () => {
  const c = still({}); assert.ok(!hurts(run(c, 8, { dx: 1, dy: 0 })).length && !c.state.still);
  const d = still({ phaseRules: [{}, { stillRule: cfg.stillRule }] }); run(d, 6); assert.ok(!d.state.still);
});
