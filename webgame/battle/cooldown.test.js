// Cooldown HUD data: s.cool[id] = { heal, shield } seconds left per companion; dash / swap cooldowns are s.dashCd / s.swapCd.
const test = require("node:test"), assert = require("node:assert");
const { createBattle } = require("./sim.js");
const seeded = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const run = (b, secs, dt = 1 / 60) => { for (let t = 0; t < secs; t += dt) b.step(dt, {}); };
const quiet = { hp: 1e6, playerHp: 1e6, phases: [() => {}], names: [] };
const mk = () => createBattle({ ...quiet, ally: "lumi", allies: ["lumi", "hexa"] }, { rng: seeded(1), bondBase: 1 });

test("heal cooldown of an ally off the field keeps counting down; swapping neither resets nor freezes it", () => {
  const b = mk(), s = b.state;
  run(b, 3);
  const before = s.cool.lumi.heal;
  assert.ok(before > 0 && before < 10, `lumi heal ${before}`);
  b.swap(); run(b, 2);
  assert.ok(s.cool.lumi.heal < before - 1.9, `lumi heal kept falling off-field: ${s.cool.lumi.heal}`);
});

test("shield cooldown of hexa keeps counting down while lumi is out", () => {
  const b = mk(), s = b.state;
  b.swap(); run(b, 1.6);                                                  // hexa out, shield grown in
  assert.ok(s.shieldOn);
  s.bullets.push({ x: s.p.x, y: s.p.y, vx: 0, vy: 0, r: 20, age: 1, col: "#fff", dmg: 4, tr: [] });
  run(b, .1);                                                             // blocked
  const t0 = s.cool.hexa.shield;
  assert.ok(t0 > 0, "shield on cooldown after the block");
  b.swap(); run(b, 3);                                                    // lumi out
  assert.ok(s.cool.hexa.shield < t0 - 2.9, `hexa shield cd kept falling: ${t0} -> ${s.cool.hexa.shield}`);
});
