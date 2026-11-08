// 어둠 규칙: cfg.darkRule = { radius }; bullets beyond `radius` of the player are not drawn (hits are unchanged). Run: npm test
const test = require("node:test"), assert = require("node:assert");
const { createBattle } = require("./sim.js");
const quiet = { hp: 1e6, playerHp: 1e6, phases: [() => {}], names: [] };
const mk = cfg => { const b = createBattle({ ...quiet, ...cfg }, { rng: () => .5 }); b.state.auto = false; return b; };
const run = (b, secs) => { for (let t = 0; t < secs; t += 1 / 60) b.step(1 / 60, {}); };
const bulletAt = (b, dx) => ({ x: b.state.p.x + dx, y: b.state.p.y, r: 5 });

test("dark rule: a bullet outside the lit radius is hidden, and shows once it is inside", () => {
  const b = mk({ darkRule: { radius: 100 } }); run(b, .1);
  assert.strictEqual(b.bulletAlpha(bulletAt(b, 160)), 0);
  assert.strictEqual(b.bulletAlpha(bulletAt(b, 20)), 1);
  assert.ok(b.bulletAlpha(bulletAt(b, 95)) > 0, "inside the edge still shows");
});

test("dark rule: without the option every bullet is drawn", () => {
  const b = mk({}); run(b, .1);
  assert.strictEqual(b.bulletAlpha(bulletAt(b, 500)), 1);
});

test("dark rule: phaseRules turn it on and off per phase", () => {
  const b = mk({ hp: 100, cuts: [.5], names: ["a", "b"], phases: [() => {}, () => {}], phaseRules: [{ darkRule: { radius: 100 } }, { darkRule: null }] }); run(b, .1);
  assert.strictEqual(b.bulletAlpha(bulletAt(b, 160)), 0);
  b.state.eHp = 40; run(b, .2);
  assert.strictEqual(b.state.level, 1);
  assert.strictEqual(b.bulletAlpha(bulletAt(b, 160)), 1);
});

test("dark rule: a hidden bullet still hits", () => {
  const b = mk({ darkRule: { radius: 30 } }); run(b, .1);
  const p = b.state.p; b.state.bullets.push({ id: 99, x: p.x, y: p.y, vx: 0, vy: 0, r: 8, dmg: 5, col: "#fff", tr: [], age: 0 });
  const hp = b.state.hp; run(b, .1);
  assert.ok(b.state.hp < hp);
});
