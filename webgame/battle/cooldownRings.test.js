// Cooldown ring fill: b.cooldownRings() -> { dash, heal, shield, sig }, each 0..1 (1 = ready).
const test = require("node:test"), assert = require("node:assert");
const { createBattle } = require("./sim.js");
const run = (b, secs, input = {}) => { for (let t = 0; t < secs; t += 1 / 60) b.step(1 / 60, input); };
const quiet = { hp: 1e6, playerHp: 1e6, phases: [() => {}], names: [] };
const mk = () => createBattle({ ...quiet, ally: "lumi", allies: ["lumi", "hexa"] }, { rng: () => .5, bondBase: 1 });

test("dash ring is full when ready, empties on dash, refills in 1.5s", () => {
  const b = mk();
  assert.strictEqual(b.cooldownRings().dash, 1);
  run(b, .1, { dx: 1 }); assert.ok(b.dash());
  assert.ok(b.cooldownRings().dash < .1);
  run(b, .75, { dx: 1 }); assert.ok(Math.abs(b.cooldownRings().dash - .5) < .1, `${b.cooldownRings().dash}`);
  run(b, 1, { dx: 1 }); assert.strictEqual(b.cooldownRings().dash, 1);
});

test("heal/sig rings follow the companion out now; swapping switches to the other's timers", () => {
  const b = mk();
  run(b, 5);
  const lumi = b.cooldownRings();                    // heal starts at 10s, sig at 8s: partly filled
  assert.ok(lumi.heal > 0 && lumi.heal < 1 && lumi.sig > 0 && lumi.sig < 1);
  b.state.cool.hexa.heal = 0; b.swap();
  assert.strictEqual(b.cooldownRings().heal, 1);
});

test("shield ring is full while the shield is up", () => {
  const b = mk(); b.swap(); run(b, 1.6);
  assert.ok(b.state.shieldOn); assert.strictEqual(b.cooldownRings().shield, 1);
});
