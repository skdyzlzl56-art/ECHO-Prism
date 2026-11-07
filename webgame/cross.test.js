// Cross-chapter data checks: bgm/speakers exist, battle configs are consistent, index.html loads every stage file. Run: npm test
const test = require("node:test"), assert = require("node:assert"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const rd = f => fs.readFileSync(path.join(__dirname, f), "utf8");
const files = ["script.js", ...[1, 2, 3, 4, 5, 6].flatMap(n => [`stage${n}/battles.js`, `stage${n}/story.js`])];
const D = vm.runInNewContext("const BATTLES = {}, ACTS = {}, FX = {}, sweep = () => {}, noise = () => {};\n" + files.map(rd).join("\n") + "\n({ SCRIPT, SPEAKERS, BATTLES });");
const bgms = new Set(fs.readdirSync(path.join(__dirname, "audio")).map(f => f.replace(/^bgm_|\.ogg$/g, "")));

test("battle bgm files and speakers exist; script bgm/speakers exist", () => {
  assert.ok(Object.keys(D.BATTLES).length >= 15);
  for (const [k, b] of Object.entries(D.BATTLES)) {
    assert.ok(b.bgm === null || bgms.has(b.bgm), `${k} bgm ${b.bgm}`);
    assert.ok(D.SPEAKERS[b.speaker], `${k} speaker ${b.speaker}`);
  }
  for (const l of D.SCRIPT) {
    if (l.bgm && l.bgm !== "off") assert.ok(bgms.has(l.bgm), `script bgm ${l.bgm}`);
    if (l.who) assert.ok(D.SPEAKERS[l.who], `script speaker ${l.who}`);
  }
});

test("battle configs are structurally valid", () => {
  const RULES = ["colorRule", "rewind", "dirRule", "finale"];
  for (const [k, b] of Object.entries(D.BATTLES)) {
    if (b.cuts && b.phases) assert.strictEqual(b.phases.length, b.cuts.length + 1, `${k}: phases must be cuts+1`);
    for (const pr of b.phaseRules || []) {
      for (const key of Object.keys(pr)) assert.ok(RULES.includes(key), `${k}: unknown phase rule ${key}`);
      if (pr.dirRule) assert.ok(pr.dirRule.name, `${k}: dirRule needs name`);
    }
    if (b.phaseRules) assert.ok(b.phaseRules.length <= b.phases.length, `${k}: more phaseRules than phases`);
    if (b.dirRule) assert.ok(b.dirRule.name, `${k}: dirRule needs name`);
  }
});

test("index.html loads every stage script and every loaded file exists", () => {
  const html = rd("index.html"), srcs = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
  for (const s of srcs) assert.ok(fs.existsSync(path.join(__dirname, s)), `missing ${s}`);
  for (const d of fs.readdirSync(__dirname).filter(n => /^stage\d+$/.test(n)))
    for (const f of fs.readdirSync(path.join(__dirname, d)).filter(n => n.endsWith(".js") && !n.endsWith(".test.js")))
      assert.ok(srcs.includes(`${d}/${f}`), `${d}/${f} not loaded by index.html`);
});
