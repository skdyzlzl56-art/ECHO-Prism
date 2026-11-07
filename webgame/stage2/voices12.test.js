// Voice sheet check for stages 1-2 (CHARACTERS.md "말투 시트"): speech level per speaker and where the kit is introduced.
// Run: node --test webgame/stage2/voices12.test.js
const test = require("node:test"), assert = require("node:assert"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const dir = path.join(__dirname, ".."), rd = f => fs.readFileSync(path.join(dir, f), "utf8");
const files = ["script.js", "stage1/battles.js", "stage1/story.js", "stage2/battles.js", "stage2/story.js"];
const src = "const BATTLES = {}, ACTS = {}, FX = {}, sweep = () => {}, noise = () => {};\n" + files.map(rd).join("\n") + "\n({ STAGE1, STAGE2, BATTLES });";
const D = vm.runInNewContext(src);
const talks = Object.values(D.BATTLES).flatMap(b => Object.values(b.talks || {}).flat().map(t => ({ who: t.who, text: t.t })));
const lines = who => [...D.STAGE1, ...D.STAGE2, ...talks].filter(l => l.who === who).map(l => l.text);
const polite = /(요|니다|세요)[.!?…\s]*$/;

test("lumi (informal), hexa (해라체) and silence (flat 반말) keep their speech level", () => {
  for (const who of ["lumi", "hexa", "silence"]) for (const t of lines(who)) assert.doesNotMatch(t, polite, `${who}: ${t}`);
  for (const t of lines("silence")) assert.doesNotMatch(t, /아라|어라/, `silence is flat, not commanding: ${t}`);
});

test("hexa never calls lumi 등불지기 or silence 놈, and does say 루미", () => {
  for (const t of lines("hexa")) assert.doesNotMatch(t, /등불지기|놈/, t);
  assert.ok(lines("hexa").some(t => /루미/.test(t)));
});

test("join scenes introduce heal, shield and swap", () => {
  const s1 = D.STAGE1.map(l => l.text || "").join("\n"), s2 = D.STAGE2.map(l => l.text || "").join("\n");
  assert.match(s1, /치료|회복/); assert.match(s1, /방패/); assert.match(s2, /교대/);
});

test("stages keep their line counts", () => {
  assert.ok(D.STAGE1.filter(l => l.who).length >= 56 && D.STAGE2.filter(l => l.who).length >= 33);
});
