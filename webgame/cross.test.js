// Cross-chapter check: every battle bgm has an audio file (or is null/silence), every speaker exists. Run: node --test webgame/cross.test.js
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
