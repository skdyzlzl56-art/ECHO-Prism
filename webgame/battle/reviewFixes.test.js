// review fixes on the combat-feel branch: rewind vs wiped / broken bullets, dirRule vs box carry, stage attack on non-bullet damage
const test = require("node:test"), assert = require("node:assert");
const { createBattle, BOX } = require("./sim.js");

const quiet = { hp: 1e6, playerHp: 1e6, phases: [() => {}], names: [] };
const mk = cfg => { const b = createBattle({ ...quiet, ...cfg }, { rng: () => .5 }); b.state.auto = false; return b; };
const bullet = o => ({ x: BOX.x + 20, y: BOX.y + 10, vx: 0, vy: 50, r: 4, r0: 4, col: "#f00", dmg: 4, age: 0, tr: [], id: 9999, ...o });
const run = (b, secs) => { for (let t = 0; t < secs; t += 1 / 60) b.step(1 / 60); };

test("a bond-light burst that wipes the field is not undone by the next rewind", () => {
  const b = mk({ rewind: 3, ally: "lumi" }); b.state.bullets.push(bullet());
  run(b, 2); b.state.gauge = 100; b.step(1 / 60);
  assert.strictEqual(b.state.bullets.length, 0);
  run(b, 2.5);                                                            // past the rewind at t=3
  assert.strictEqual(b.state.bullets.length, 0);
});

test("a bullet the player's shot broke stays gone through a rewind", () => {
  const b = mk({ rewind: 3 }); b.state.bullets.push(bullet({ hp: 1 }));
  run(b, 2); const x = b.state.bullets[0];
  b.state.shots.push({ x: x.x, y: x.y, vx: 0, vy: 0, dmg: 5 }); b.step(1 / 60);
  assert.strictEqual(b.state.bullets.length, 0);
  run(b, 2.5);
  assert.strictEqual(b.state.bullets.length, 0);
});

test("dirRule: being carried by the box does not count as the player moving with the bullet", () => {
  const b = mk({ dirRule: { name: "x" }, boxRule: { amp: 60, period: 4 } });
  run(b, .3); const p = b.state.p;
  b.state.bullets.push(bullet({ x: p.x, y: p.y, vy: 0, vx: 100, nm: "x" }));
  const hp = b.state.hp; b.step(1 / 60);
  assert.ok(b.state.hp < hp, "a bullet on a standing player hurts");
});

test("stage attack scales zone damage like bullet damage", () => {
  const b = mk({ stage: 4, phases: [h => h.zone(.01, { warn: .01, dur: 5 })] });
  for (let i = 0; i < 600 && b.state.hp === b.state.maxHp; i++) b.step(1 / 60);   // until the first hit
  assert.strictEqual(b.state.maxHp - b.state.hp, 5);                      // 4 * 1.2 -> 5, not 4
});
