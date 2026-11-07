// Ticket 14: stage 3 and 4 bosses each have a pattern of their own that works with their rule.
const test = require("node:test"), assert = require("node:assert"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const { createBattle } = require("./sim.js");
const rd = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const src = "const BATTLES = {}, ACTS = {}, SPEAKERS = {};\n" + ["stage1/battles.js", "stage2/battles.js", "stage3/battles.js", "stage4/battles.js"].map(rd).join("\n") + "\nBATTLES;";
const B = vm.runInNewContext(src);
const RED = "#ff4d6d";

// every special bullet a boss phase spawns within 8 s (player parked, enemy cannot die)
const kinds = (id, level) => {
  const b = createBattle({ ...B[id], hp: 1e6, playerHp: 1e6 }, { rng: () => .5 }); b.state.auto = false; b.state.level = level;
  const seen = { home: 0, stall: 0, bn: 0 };
  for (let t = 0; t < 8; t += 1 / 60) { b.step(1 / 60, {}); for (const x of b.state.bullets) for (const k in seen) if (x[k]) seen[k]++; }
  return seen;
};

test("화가: red homing dots in phase 3, bouncing shots in phase 4 (colour rule)", () => {
  assert.strictEqual(B.s3_painter.colorRule, RED);
  assert.ok(kinds("s3_painter", 2).home, "homing");
  assert.ok(kinds("s3_painter", 3).bn, "bounce");
});

test("시계지기: stalling bullets in phase 3, homing in phase 4 (rewind rule)", () => {
  assert.ok(B.s4_keeper.rewind);
  assert.ok(kinds("s4_keeper", 2).stall, "stall");
  assert.ok(kinds("s4_keeper", 3).home, "homing");
});
