// Retry bonus: opts.bonusHp adds to max HP (battle.js gives +5 per 5 losses).
const test = require("node:test"), assert = require("node:assert");
test("bonusHp raises max HP", () => {
  const { createBattle } = require("./sim.js");
  const a = createBattle({ hp: 100 }, {}), b = createBattle({ hp: 100 }, { bonusHp: 10 });
  assert.strictEqual(b.state.maxHp - a.state.maxHp, 10);
});
