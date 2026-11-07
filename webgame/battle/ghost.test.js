// Ghost HP: the lost chunk lingers, then drains. Run: npm test
const test = require("node:test"), assert = require("node:assert");
const { createBattle } = require("./sim.js");
const quiet = { hp: 1000, playerHp: 100, phases: [() => {}], names: [] };
const run = (b, secs) => { for (let t = 0; t < secs; t += 1 / 60) b.step(1 / 60, {}); };

test("enemy ghost holds after damage, then drains to the real hp", () => {
  const b = createBattle(quiet, { rng: () => .5 }), s = b.state; s.auto = false;
  assert.equal(s.eGhost, s.eMax);
  s.eHp -= 200; run(b, .2);
  assert.equal(s.eGhost, s.eMax, "still held");
  run(b, 3);
  assert.equal(s.eGhost, s.eMax - 200, "drained to eHp");
});

test("a second hit while the ghost is held stacks onto the same white chunk", () => {
  const b = createBattle(quiet, { rng: () => .5 }), s = b.state; s.auto = false;
  s.eHp -= 100; run(b, .3); s.eHp -= 100; run(b, .2);
  assert.equal(s.eGhost, s.eMax, "chunk from both hits still shown");
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

test("the white chunk starts draining ~1s after the first hit even while hits keep coming", () => {
  const b = createBattle(quiet, { rng: () => .5 }), s = b.state; s.auto = false;
  for (let i = 0; i < 12; i++) { s.eHp -= 10; run(b, .1); }   // 1.2s of continuous hits
  assert.ok(s.eGhost < s.eMax, "started draining");
  assert.ok(s.eGhost > s.eHp, "still trailing the real hp");
});
