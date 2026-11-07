// Ghost HP: the lost chunk lingers, then drains. Run: npm test
const test = require("node:test"), assert = require("node:assert");
const { createBattle } = require("./sim.js");
const quiet = { hp: 1000, playerHp: 100, phases: [() => {}], names: [] };
const run = (b, secs) => { for (let t = 0; t < secs; t += 1 / 60) b.step(1 / 60, {}); };

test("enemy ghost holds after damage, then drains to the real hp", () => {
  const b = createBattle(quiet, { rng: () => .5 }), s = b.state; s.auto = false;
  assert.equal(s.eGhost, 1000);
  s.eHp -= 200; run(b, .2);
  assert.equal(s.eGhost, 1000, "still held");
  run(b, 3);
  assert.equal(s.eGhost, 800, "drained to eHp");
});

test("a second hit while the ghost is held stacks onto the same white chunk", () => {
  const b = createBattle(quiet, { rng: () => .5 }), s = b.state; s.auto = false;
  s.eHp -= 100; run(b, .3); s.eHp -= 100; run(b, .2);
  assert.equal(s.eGhost, 1000, "chunk from both hits still shown");
});

test("player ghost behaves the same; healing pulls it up", () => {
  const b = createBattle(quiet, { rng: () => .5 }), s = b.state; s.auto = false;
  assert.equal(s.pGhost, 100);
  s.hp -= 30; run(b, .2);
  assert.equal(s.pGhost, 100);
  run(b, 3);
  assert.equal(s.pGhost, 70);
  s.hp += 10; run(b, .1);
  assert.equal(s.pGhost, 80);
});
