// 방향 벽: h.dirWall = a full-height column of named bullets with no gap, sweeping the box sideways. Under a dirRule only moving with it is safe.
const test = require("node:test"), assert = require("node:assert");
const { createBattle, BOX } = require("./sim.js");

const run = (b, secs, input = {}, dt = 1 / 60) => { for (let t = 0; t < secs; t += dt) b.step(dt, input); };
const mk = rule => { const b = createBattle({ hp: 1e6, playerHp: 100, names: [], dirRule: rule, phases: [h => h.dirWall(5)] }, { rng: () => .5 }); b.state.auto = false; return b; };

test("dirWall: spans the whole box height with no gap, every bullet carries the rule name", () => {
  const b = mk({ name: "동쪽" }); run(b, 6.2);
  const col = b.state.bullets.filter(x => x.age < .3), ys = col.map(x => x.y).sort((a, c) => a - c);
  assert.ok(ys.length > 8, "a wall was spawned");
  assert.ok(col.every(x => x.nm === "동쪽") && ys[0] <= BOX.y + 12 && ys[ys.length - 1] >= BOX.y + BOX.h - 12);
  assert.ok(Math.max(...ys.slice(1).map((y, i) => y - ys[i])) <= 24, "no gap to slip through");
});

test("dirWall: moving with the wall is safe, standing still or going against it hurts", () => {
  for (const [dx, dmg] of [[1, 0], [0, 4], [-1, 4]]) {
    const b = mk({ name: "동쪽" }); run(b, 5.9);                       // the walls come from the left (moving right), then from the right
    b.state.p.x = BOX.x + 40; b.state.hp = 100; b.state.inv = 0;
    run(b, 1, { dx });
    assert.strictEqual(100 - b.state.hp, dmg, `dx ${dx}`);
  }
});
