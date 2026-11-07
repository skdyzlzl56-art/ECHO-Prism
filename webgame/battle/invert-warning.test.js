// 조작 반전: the sim exposes how long the warning / the reversal still lasts (drawn as a draining bar). Run: npm test
const test = require("node:test"), assert = require("node:assert");
const { createBattle } = require("./sim.js");
const cfg = { hp: 1000, playerHp: 99, phases: [() => {}], names: [], invertRule: { period: 12, warn: 2, dur: 4 } };

test("invertLeft counts down through the warning, then through the reversal", () => {
  const b = createBattle(cfg, { rng: () => .5 }); b.state.auto = false;
  const at = sec => { while (b.state.t < sec) b.step(1 / 60, {}); return b.state; };
  let s = at(10.5); assert.ok(s.invertWarn && Math.abs(s.invertLeft - 1.5) < .1 && s.invertMax === 2);
  s = at(13); assert.ok(s.inverted && Math.abs(s.invertLeft - 3) < .1 && s.invertMax === 4);
  s = at(17); assert.ok(!s.inverted && !s.invertWarn && s.invertLeft === 0);
});
