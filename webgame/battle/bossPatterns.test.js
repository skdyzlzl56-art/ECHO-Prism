// Ticket 13: stage 1-2 bosses have their own barrages (door, bloom, closing), and every phase runs to the end. Run: npm test
const test = require("node:test"), assert = require("node:assert"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const { createBattle } = require("./sim.js");
const rd = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const D = vm.runInNewContext("const BATTLES = {}, ACTS = {}, SPEAKERS = {}, runBattle = () => {};\n" + ["stage1/battles.js", "stage2/battles.js"].map(rd).join("\n") + "\n({ BATTLES });");

const solo = (fn, o = {}) => ({ hp: 1000, playerHp: 1000, phases: [fn], names: ["x"], color: "#ffb347", ...o });
const run = (cfg, secs, level = 0) => {
  const b = createBattle(cfg, { rng: () => .3 }), s = b.state, seen = new Set(); s.auto = false;
  const hold = level ? s.eMax * cfg.cuts[level - 1] - 1 : 0; // pin the enemy hp so ally shots keep it in this phase
  for (let t = 0; t < secs; t += 1 / 60) { s.hp = s.maxHp; if (hold) s.eHp = hold; b.step(1 / 60, {}); while (s.talk) b.advance(); for (const x of s.bullets) seen.add(x.col); if (s.lasers.length) seen.add("laser"); }
  return { b, s, seen };
};

test("door: horizontal rows from one side with a gap to slip through", () => {
  const { s } = run(solo(h => h.door(.5)), 1.6);
  const row = s.bullets.filter(b => Math.abs(b.vy) < 1e-6);
  assert.ok(row.length >= 8 && row.length === s.bullets.length, "only horizontal bullets");
  const ys = [...new Set(row.filter(b => Math.abs(b.x - row[0].x) < 1).map(b => b.y))].sort((a, b) => a - b);
  assert.ok(ys.some((y, i) => i && y - ys[i - 1] > 50), "has a gap");
});

test("bloom: a ring whose petals curve both ways", () => {
  const { s } = run(solo(h => h.bloom(1, 12)), 2.1);
  assert.equal(s.bullets.length, 12);
  assert.ok(s.bullets.some(b => b.w > 0) && s.bullets.some(b => b.w < 0));
});

test("closing: a ring around the player heads inward and leaves a gap", () => {
  const { s } = run(solo(h => h.closing(1, 16, 60, 40)), 2.1);
  const bs = s.bullets, p = s.p;
  assert.ok(bs.length >= 12 && bs.length < 16, "gap in the ring");
  for (const b of bs) assert.ok((p.x - b.x) * b.vx + (p.y - b.y) * b.vy > 0, "moving toward the player");
});

for (const id of ["s1_boss", "s2_silence"]) {
  test(`${id}: every phase runs to the end and the phases differ`, () => {
    const cfg = D.BATTLES[id], sets = [];
    for (let lv = 0; lv < cfg.phases.length; lv++) {
      const { s, seen } = run(cfg, 25, lv);
      assert.equal(s.level, lv, "phase reached");
      assert.ok(seen.size > 0, `phase ${lv} fires`);
      sets.push([...seen].sort());
    }
    assert.equal(new Set(sets.map(x => x.join("|"))).size, sets.length, "no two phases share a pattern set");
    const mine = [h => h.door(1), h => h.bloom(1, 12), h => h.closing(1, 16, 60, 40)].map(f => run(solo(f, { color: cfg.color }), 2.3).seen);
    const own = sets.filter(x => mine.some(t => x.some(c => t.has(c))));
    assert.ok(own.length >= 2, "new patterns appear in 2+ phases");
  });
}
