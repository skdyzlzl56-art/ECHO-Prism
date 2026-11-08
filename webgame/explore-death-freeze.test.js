// Dying in the lamp corridor while a fan of shots is in the air must not throw (a throw stops the frame loop = frozen game).
const test = require("node:test"), assert = require("node:assert");
const { createExplore } = require("./explore-rules.js");

test("dying with several shots in the air does not throw, and revives", () => {
  const cfg = { worldW: 4000, spots: [{ x: 3000, y: 300, mem: "m" }], talks: [], allLit: [], revive: { who: null, text: "r" }, hurtLine: { who: null, text: "h" },
    barrage: { every: 99, n: 5, speed: 0 } };
  const ex = createExplore(cfg, { view: { floorY: 190, floorH: 210 }, rand: () => .5 });
  let revived = false;
  for (let k = 0; k < 400 && !revived; k++) {
    if (ex.inv <= 0) for (let i = 0; i < 5; i++) ex.bullets.push({ x: ex.p.x + i, y: ex.p.y, vx: 0, vy: 0, age: 0, r: 7 });
    const before = ex.hp;
    assert.doesNotThrow(() => ex.step(.05, {}));
    revived = before === 1 && ex.hp === ex.MAXHP;
  }
  assert.ok(revived);
});
