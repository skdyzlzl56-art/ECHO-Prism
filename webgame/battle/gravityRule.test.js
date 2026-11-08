// 중력 규칙: cfg.gravityRule = { period, warn, dur, pull }; the last `warn` s of a cycle shows the direction, then for `dur` s the player is dragged that way at `pull` px/s
const test = require("node:test"), assert = require("node:assert");
const { createBattle, BOX } = require("./sim.js");

const run = (b, secs, input = {}, dt = 1 / 60) => { const ev = []; for (let t = 0; t < secs; t += dt) ev.push(...b.step(dt, input)); return ev; };
const still = (extra, rng = () => .5) => { const b = createBattle({ hp: 1e6, playerHp: 1e6, phases: [() => {}], names: [], ...extra }, { rng }); b.state.auto = false; return b; };
const cfg = { gravityRule: { period: 4, warn: 1.5, dur: 1.5, pull: 100 } };

test("gravity rule: warn event shows a direction, then the on event, and the player is dragged only while it lasts", () => {
  const b = still(cfg), s = b.state, mid = () => { s.p.x = BOX.x + BOX.w / 2; s.p.y = BOX.y + BOX.h / 2; }, pos = () => [s.p.x, s.p.y];
  const ev = run(b, 2.6); assert.ok(ev.some(v => v.type === "gravityWarn") && !ev.some(v => v.type === "gravityOn"));
  const g = s.gravity; assert.ok(g && !g.active && Math.hypot(g.dx, g.dy) === 1);
  mid(); const p0 = pos(); run(b, 1.3); assert.deepStrictEqual(pos(), p0, "the warning does not move the player");
  const ev2 = run(b, .5); assert.ok(ev2.some(v => v.type === "gravityOn") && g.active);
  const d = [s.p.x - p0[0], s.p.y - p0[1]]; assert.ok(d[0] * g.dx + d[1] * g.dy > 0, "displaced along the arrow");
  assert.ok(Math.abs(d[0] * g.dy) + Math.abs(d[1] * g.dx) < 1e-6, "and only along it");
  run(b, 1.5);
  mid(); const p1 = pos(); run(b, .4); assert.deepStrictEqual(pos(), p1, "no pull after dur");
});

test("gravity rule: pull is px/s for the on window, clamped to the box", () => {
  const b = still({ gravityRule: { period: 4, warn: 1.5, dur: 1, pull: 50 } }), s = b.state;
  run(b, 4.02); const g = s.gravity; s.p.x = BOX.x + BOX.w / 2; s.p.y = BOX.y + BOX.h / 2; const x0 = s.p.x, y0 = s.p.y;
  run(b, .5); assert.ok(Math.abs((s.p.x - x0) * g.dx + (s.p.y - y0) * g.dy - 25) < 1.5);
  run(b, 6); assert.ok(s.p.x >= BOX.x && s.p.x <= BOX.x + BOX.w && s.p.y >= BOX.y && s.p.y <= BOX.y + BOX.h);
});

test("gravity rule: direction changes every cycle and is deterministic for a given rng", () => {
  const dirs = rng => { const b = still(cfg, rng), out = []; for (let t = 0; t < 40; t += 1 / 60) { for (const v of b.step(1 / 60, {})) if (v.type === "gravityWarn") out.push(`${v.dx},${v.dy}`); } return out; };
  const a = dirs(() => .5), c = dirs(() => .5); assert.deepStrictEqual(a, c);
  assert.ok(a.length >= 8 && a.every((d, i) => !i || d !== a[i - 1]), "never the same direction twice running");
  let seed = 7; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const rd = dirs(r); assert.ok(rd.every((d, i) => !i || d !== rd[i - 1]));
});

test("gravity rule: bullets are not pulled", () => {
  const b = still({ ...cfg, phases: [() => {}] }), s = b.state;
  s.bullets.push({ x: 300, y: 300, bx: 300, vx: 0, vy: 0, r: 6, dmg: 0, id: 99, w: 0, acc: 0, sa: 0, sf: 3, ph: 0, bn: 0, r0: 6, age: 0, tr: [], col: "#fff" });
  run(b, 3.9); const bl = s.bullets.find(q => q.id === 99); assert.ok(bl && bl.x === 300 && bl.y === 300);
});

test("gravity rule: off without the option, and phaseRules switch it per phase", () => {
  const c = still({}), x = c.state.p.x; run(c, 8); assert.ok(!c.state.gravity && c.state.p.x === x);
  const d = still({ phaseRules: [{}, { gravityRule: cfg.gravityRule }] }); run(d, 6); assert.ok(!d.state.gravity);
});

test("gravity rule: the pull is slower than the slowest player move speed, so it can always be countered", () => {
  const b = still({ gravityRule: { period: 4, warn: 1.5, dur: 3, pull: 100 } }), s = b.state; s.auto = true;   // auto-fire = the slow 150 px/s
  run(b, 4.02); const g = s.gravity; s.p.x = BOX.x + BOX.w / 2; s.p.y = BOX.y + BOX.h / 2; const x0 = s.p.x, y0 = s.p.y;
  run(b, 2, { dx: -g.dx, dy: -g.dy });
  assert.ok((s.p.x - x0) * g.dx + (s.p.y - y0) * g.dy < 0, "walking against it still gains ground");
});
