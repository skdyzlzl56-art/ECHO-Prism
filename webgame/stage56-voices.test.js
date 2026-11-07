// Ticket 06: stage 5-6 dialogue follows the voice sheet in CHARACTERS.md (speech level, address terms).
const test = require("node:test"), assert = require("node:assert"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const rd = f => fs.readFileSync(path.join(__dirname, f), "utf8");
const files = ["script.js", ...[1, 2, 3, 4, 5, 6].flatMap(n => [`stage${n}/battles.js`, `stage${n}/story.js`])];
const D = vm.runInNewContext("const BATTLES = {}, ACTS = {}, FX = {}, sweep = () => {}, noise = () => {};\n" + files.map(rd).join("\n") + "\n({ STAGE5, STAGE6, BATTLES });");
const talks = b => Object.values(D.BATTLES[b].talks).flat().map(l => ({ who: l.who, text: l.t }));
const lines = [...D.STAGE5, ...D.STAGE6, ...talks("s5_librarian"), ...talks("s6_silence")].filter(l => l.who);
const by = who => lines.filter(l => l.who === who).map(l => l.text);
const polite = /(요|니다|세요)[.…!?\s]*$/;

test("침묵 and 글리치 speak banmal: no polite endings", () => {
  for (const who of ["silence", "glitch"]) for (const t of by(who)) assert.doesNotMatch(t, polite, `${who}: ${t}`);
});
test("리라 addresses the individual politely, never 개체야 or 네", () => {
  for (const t of by("voice")) assert.doesNotMatch(t.replace(/'[^']*'/g, ""), /개체야|네 첫|네가 처음|아니, 에코/, t);
});
test("female characters are not called 아저씨", () => assert.doesNotMatch(lines.map(l => l.text).join("\n"), /아저씨|아줌마/));
test("address terms: 사서 says 손님, 글리치 says 꽃잎 and 덩치", () => {
  assert.ok(by("librarian").some(t => /손님/.test(t)), "손님");
  assert.ok(by("glitch").some(t => /꽃잎/.test(t)), "꽃잎");
  assert.ok(by("glitch").some(t => /덩치/.test(t)), "덩치");
});
