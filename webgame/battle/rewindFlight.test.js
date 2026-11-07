// 되감기 역주행: during the rewind the bullets fly back along their path instead of teleporting
const test = require("node:test"), assert = require("node:assert");
const { createBattle, BOX } = require("./sim.js");

const quiet = { hp: 1e6, playerHp: 1e6, phases: [() => {}], names: [] };
const mk = cfg => { const b = createBattle({ ...quiet, ...cfg }, { rng: () => .5 }); b.state.auto = false; b.state.p.x = BOX.x + BOX.w - 5; return b; };
const bullet = () => ({ x: BOX.x + 20, y: BOX.y + 10, vx: 0, vy: 50, r: 4, r0: 4, col: "#f00", dmg: 4, age: 0, tr: [], id: 9999, hp: 1 });
const ys = (b, from, to) => { const out = []; for (let t = from; t < to; t += 1 / 60) { b.step(1 / 60); if (b.state.bullets[0]) out.push(b.state.bullets[0].y); } return out; };

test("rewind: bullets retrace their path backwards over the rewind span and end at the 1.5s-ago spot", () => {
  const b = mk({ rewind: 3 }); b.state.bullets.push(bullet());
  ys(b, 0, 1.5); const at15 = b.state.bullets[0].y;
  ys(b, 1.5, 3.05);                                                       // forward until the rewind has just begun
  const start = b.state.bullets[0].y;
  const seq = ys(b, 3.05, 4.4);
  assert.ok(seq.every((y, i) => i === 0 || y < seq[i - 1]), "moves strictly backwards");
  assert.ok(start - seq[0] < 5, `no teleport: ${start} -> ${seq[0]}`);
  ys(b, 4.4, 4.6);
  assert.ok(Math.abs(b.state.bullets[0].y - at15) < 8, `ends near ${at15}, got ${b.state.bullets[0].y}`);
});
