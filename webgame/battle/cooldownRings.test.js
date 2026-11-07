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
  b.state.cool.hexa.sig = 0; b.swap();
  assert.strictEqual(b.cooldownRings().sig, 1);
});

test("shield ring is full while the shield is up", () => {
  const b = mk(); b.swap(); run(b, 1.6);
  assert.ok(b.state.shieldOn); assert.strictEqual(b.cooldownRings().shield, 1);
});

test("abilities the companion lacks (or has not unlocked) report null, not a ready 1", () => {
  const b = mk();                                    // lumi out: no shield in her kit
  assert.strictEqual(b.cooldownRings().shield, null); assert.ok(b.cooldownRings().heal !== null);
  b.swap();                                          // hexa out: no heal
  assert.strictEqual(b.cooldownRings().heal, null);
  const b0 = createBattle({ ...quiet, ally: "hexa", allies: ["hexa", "lumi"] }, { rng: () => .5, bondBase: 0 });   // bond 0: shield not unlocked yet
  assert.strictEqual(b0.cooldownRings().shield, null);
});

test("shield ring fills on the real cooldown after a block", () => {
  const b = createBattle({ ...quiet, ally: "hexa", allies: ["hexa", "lumi"] }, { rng: () => .5, bondBase: 1 });
  b.state.shieldOn = false; b.state.cool.hexa.shield = 11;      // bond 1 cooldown is 22s
  assert.ok(Math.abs(b.cooldownRings().shield - .5) < .01, `${b.cooldownRings().shield}`);
});
