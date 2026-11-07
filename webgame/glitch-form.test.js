// Ticket 12: 글리치 transforms once when joining; the new look survives save/load (replayed from the script, like renames).
const test = require("node:test"), assert = require("node:assert"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const { replayState } = require("./lineplayer.js");
const rd = f => fs.readFileSync(path.join(__dirname, f), "utf8");
const files = ["script.js", "stage1/battles.js", "stage1/story.js", "stage2/battles.js", "stage2/story.js", "stage3/battles.js", "stage3/story.js"];
const D = vm.runInNewContext("const BATTLES = {}, ACTS = {}, FX = {}, sweep = () => {}, noise = () => {};\n" + files.map(rd).join("\n") + "\n({ SCRIPT, SPEAKERS, FORMS, applyForm });");
const at = a => D.SCRIPT.findIndex(l => l.act === a);

test("the join scene has one transformation event before the party card", () => {
  assert.strictEqual(D.SCRIPT.filter(l => l.act === "s3_morph").length, 1);
  assert.ok(at("s3_morph") > 0 && at("s3_morph") < at("s3_party"));
  assert.ok(rd("stage3/scenes.js").includes("ACTS.s3_morph ="));
});
test("after the event glitch is shown in the new form; before it, not", () => {
  const i = at("s3_morph"), old = { ...D.SPEAKERS.glitch };
  assert.deepStrictEqual(replayState(D.SCRIPT, i).forms, {});
  const f = replayState(D.SCRIPT, i + 1).forms;
  assert.deepStrictEqual(Object.keys(f), ["glitch"]);
  D.applyForm("glitch", f.glitch);
  assert.notStrictEqual(D.SPEAKERS.glitch.color, old.color);
  assert.notStrictEqual(D.SPEAKERS.glitch.shape, old.shape);
  assert.strictEqual(D.SPEAKERS.glitch.name, old.name);
});
test("the new form is its own crimson shape, not a recycled one", () => {
  const f = D.FORMS.glitch.calm, [r, g, b] = [1, 3, 5].map(i => parseInt(f.color.slice(i, i + 2), 16));
  assert.strictEqual(f.shape, "tomoe");
  assert.ok(r > 150 && r > g * 3 && r > b * 3, "still red");
  assert.ok(/function tomoe\(/.test(rd("portraits.js")) && /function drawTomoeAlly\(/.test(rd("stage3/scenes.js")));
});
