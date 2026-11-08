// 화가 보스: 후반 페이즈에서 색 규칙 위에 판 규칙(4)과 조작 반전(5)을 겹치고, 대사로 예고한다.
const test = require("node:test"), assert = require("node:assert"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const rd = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const src = "const BATTLES = {}, ACTS = {}, sweep = () => {}, noise = () => {};\n" + ["script.js", "stage3/battles.js"].map(rd).join("\n") + "\n({ BATTLES, RED });";
const D = vm.runInNewContext(src);
const cfg = D.BATTLES.s3_painter;

test("painter layers box rule (phase 4) and invert rule (phase 5) over the colour rule", () => {
  assert.strictEqual(cfg.phaseRules.length, cfg.phases.length);
  assert.ok(cfg.phaseRules[3].boxRule && !cfg.phaseRules[3].invertRule);
  assert.ok(cfg.phaseRules[4].invertRule);
  cfg.phaseRules.forEach(r => assert.ok(!("colorRule" in r)));   // colour rule stays from cfg level
  assert.strictEqual(cfg.colorRule, D.RED);
});

test("the layered phases announce the new rule in their talk", () => {
  assert.match(cfg.talks[4].map(l => l.t).join(" "), /판/);
  assert.match(cfg.talks[5].map(l => l.t).join(" "), /반대|거꾸로|뒤집/);
});

test("ordinary fights are untouched", () => {
  assert.ok(!D.BATTLES.s3_blots.phaseRules && !D.BATTLES.s3_study.phaseRules);
});
