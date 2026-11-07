// 탄막 with HP: burster bursts into a ring when shot dead; bomb detonates near the player unless shot dead first. Run: npm test
const test = require("node:test"), assert = require("node:assert");
const { createBattle } = require("./sim.js");
const mk = phase => { const b = createBattle({ hp: 9999, playerHp: 99, phases: [phase], names: [] }, { rng: () => .5 }); b.state.auto = false; return b; };
const run = (b, secs, input = {}) => { const ev = []; for (let t = 0; t < secs; t += 1 / 60) ev.push(...b.step(1 / 60, input)); return ev; };

test("burster: a hit bullet with hp; shot to death it scatters 8 small bullets", () => {
  const b = mk(h => h.burster(.1, 3)), s = b.state; run(b, 1.3);
  const m = s.bullets.find(x => x.hp > 0); assert.ok(m && m.hp === 3 && m.burst);
  const before = s.bullets.length;
  s.shots.push({ x: m.x, y: m.y, vx: 0, vy: 0, dmg: 5 }); const ev = run(b, 1 / 30);
  assert.ok(ev.some(e => e.type === "break"));
  assert.ok(s.bullets.filter(x => x.r === 6 && x.col === "#ffd36b").length >= 8, "ring of small bullets");
  assert.ok(before > 0);
});

test("bomb: unshot, it detonates into a ring near the player; shot dead first, it just pops", () => {
  const b = mk(h => h.bomb(.1, 8)), s = b.state; s.p.x = s.BOX.x + s.BOX.w / 2; s.p.y = s.BOX.y + 200;
  let ev = run(b, 12);
  assert.ok(ev.some(e => e.type === "blast"), "detonated");
  const c = mk(h => h.bomb(.1, 8)), t = c.state; t.p.x = t.BOX.x + t.BOX.w / 2; t.p.y = t.BOX.y + 230; run(c, 1.2);   // a bomb or two, still far from the player
  const m = t.bullets.find(x => x.det); assert.ok(m, "bomb exists");
  t.shots.push({ x: m.x, y: m.y, vx: 0, vy: 0, dmg: 20 }); ev = run(c, 1 / 30);
  assert.ok(ev.some(e => e.type === "break") && !ev.some(e => e.type === "blast"), "popped quietly");
});
