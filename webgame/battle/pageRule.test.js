// 쪽 넘김 규칙: cfg.pageRule = { period, warn, dur, dmg, width }; a narrow safe strip, shown in the warning, jumps to another slot each cycle
const test = require("node:test"), assert = require("node:assert");
const { createBattle, BOX } = require("./sim.js");

const run = (b, secs, input = {}, dt = 1 / 60) => { const ev = []; for (let t = 0; t < secs; t += dt) ev.push(...b.step(dt, input)); return ev; };
const still = extra => { const b = createBattle({ hp: 1e6, playerHp: 1e6, phases: [() => {}], names: [], ...extra }, { rng: () => .5 }); b.state.auto = false; return b; };
const cfg = { pageRule: { period: 4, warn: 1, dur: 1.5, dmg: 3, width: 60 } };

test("page rule: warning shows the strip, the flip announces it, and standing outside hurts", () => {
  const b = still(cfg);
  const ev = run(b, 3.2); assert.ok(ev.some(v => v.type === "pageWarn"));
  const pg = b.state.page; assert.ok(pg && !pg.active && pg.w === 60 && pg.x - 30 >= BOX.x && pg.x + 30 <= BOX.x + BOX.w);
  b.state.p.x = pg.x > BOX.x + BOX.w / 2 ? BOX.x + 10 : BOX.x + BOX.w - 10; b.state.hp = 100;
  const ev2 = run(b, 1);
  assert.ok(b.state.page.active && ev2.some(v => v.type === "pageTurn") && ev2.some(v => v.type === "playerHurt" && v.dmg === 3));
});

test("page rule: inside the strip is safe, and the strip moves to a new place each page", () => {
  const b = still(cfg); run(b, 3.9);
  const x1 = b.state.page.x; b.state.p.x = x1; b.state.hp = 100;
  assert.ok(!run(b, .5).some(v => v.type === "playerHurt") && b.state.page.active);
  run(b, 3); const x2 = b.state.page && b.state.page.x; assert.ok(x2 !== undefined && x2 !== x1, "next page, another strip");
});

test("page rule: off without the option, and phaseRules switch it per phase", () => {
  const c = still({}); c.state.p.x = BOX.x + 5; assert.ok(!run(c, 6).some(v => v.type === "playerHurt") && !c.state.page);
  const d = still({ phaseRules: [{}, { pageRule: cfg.pageRule }] }); run(d, 6); assert.ok(!d.state.page);
});

test("page rule: layered on a sliding box, the strip stays inside the box", () => {
  const b = still({ boxRule: { amp: 40, period: 6 }, pageRule: { period: 4, warn: 1, dur: 1.5, dmg: 3, width: 60 } });
  let seen = 0;
  for (let t = 0; t < 30; t += 1 / 60) { b.step(1 / 60, {}); const pg = b.state.page; if (pg) { seen++; assert.ok(pg.x - 30 >= b.BOX.x - 1 && pg.x + 30 <= b.BOX.x + b.BOX.w + 1, `t=${t.toFixed(1)} strip ${pg.x} outside box ${b.BOX.x}`); } }
  assert.ok(seen > 60);
});
