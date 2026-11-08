// 시계지기 late phases layer the split rule (판 분할) on the rewind rule. Run: node --test webgame/stage4/keeper-rules.test.js
const test = require("node:test"), assert = require("node:assert"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const { createBattle } = require("../battle/sim.js");
const rd = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const files = ["script.js", "stage1/battles.js", "stage2/battles.js", "stage3/battles.js", "stage4/battles.js"];
const D = vm.runInNewContext("const BATTLES = {}, ACTS = {}, FX = {}, sweep = () => {}, noise = () => {};\n" + files.map(rd).join("\n") + "\n({ BATTLES });");
const cfg = D.BATTLES.s4_keeper;

// start the boss at a given phase (0-based), run 40 s, count rule events
const events = lv => {
  const b = createBattle({ ...cfg, playerHp: 1e6, hp: 1e6, talks: {} }, { rng: Math.random }); b.state.auto = false;
  b.state.eHp = b.state.eMax * (1 - lv * .25 - .01);
  const n = { rewind: 0, splitWarn: 0, boxSplit: 0 };
  for (let t = 0; t < 40; t += 1 / 60) for (const v of b.step(1 / 60, {})) if (v.type in n) n[v.type]++;
  return { n, level: b.state.level };
};

test("phases 1-2 only rewind; phases 3-4 rewind and split the board", () => {
  for (const lv of [0, 1]) { const { n } = events(lv); assert.ok(n.rewind >= 1 && n.splitWarn === 0, `phase ${lv + 1}: ${JSON.stringify(n)}`); }
  for (const lv of [2, 3]) { const { n, level } = events(lv); assert.strictEqual(level, lv); assert.ok(n.rewind >= 1 && n.splitWarn >= 1 && n.boxSplit >= 1, `phase ${lv + 1}: ${JSON.stringify(n)}`); }
});

test("the phase 3 and 4 openers (talks[2], talks[3]) announce the board split", () => {
  for (const lv of [2, 3]) assert.ok(cfg.talks[lv].some(l => /판/.test(l.t)), `talks[${lv}] mentions 판`);
});
