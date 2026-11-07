// Lumi heals, never shields: heal amount is larger than the others', her signature mends instead of making her invulnerable. Run: npm test
const test = require("node:test"), assert = require("node:assert");
const { createBattle, GROWTH } = require("./sim.js");
const quiet = { hp: 1000, playerHp: 40, phases: [() => {}], names: [] };

test("Lumi (alone or in the party) has no shield, even at high bond", () => {
  for (const cfg of [{ ...quiet, ally: "lumi" }, { ...quiet, ally: "lumi", allies: ["lumi", "hexa"] }]) {
    const b = createBattle(cfg, { rng: () => .5, bondBase: 4 }); b.state.auto = false;
    for (let i = 0; i < 600; i++) b.step(1 / 60, {});
    assert.strictEqual(b.state.shieldOn, false);
  }
});

test("Lumi's heal ticks for more than the old 2-3 hp, and her signature restores hp", () => {
  const b = createBattle({ ...quiet, ally: "lumi", allies: ["lumi", "hexa"] }, { rng: () => .5, bondBase: 1 }); b.state.auto = false;
  const ev = []; b.on ? b.on(e => ev.push(e)) : 0;
  b.state.hp = 10; b.state.cool.lumi.heal = 0; b.step(1 / 60, {});
  assert.ok(b.state.hp - 10 >= 3, `healed ${b.state.hp - 10}`);
  b.state.hp = 10; b.state.cool.lumi.sig = 0; b.state.t = 5; b.step(1 / 60, {});
  assert.ok(b.state.hp > 10, "signature mend heals");
});
