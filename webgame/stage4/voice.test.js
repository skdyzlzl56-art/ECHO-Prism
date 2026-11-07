// Stage 4 voice (ticket 05): the join scene (after the boss fight, before s4_party) has 시계지기 introduce her bullet-clearing special move.
const test = require("node:test"), assert = require("node:assert"), fs = require("node:fs"), path = require("node:path");
const story = fs.readFileSync(path.join(__dirname, "story.js"), "utf8");
const join = story.slice(story.indexOf('act: "s4_keeper"'), story.indexOf('act: "s4_party"'));

test("join scene: 시계지기 explains her 탄막 소거 special move", () => {
  assert.match(join, /who: "keeper"[^\n]*(탄막[^\n]*소거|소거[^\n]*탄막)/);
});

test("시계지기 speaks formal honorifics: no 당신, no 반말 endings", () => {
  for (const m of story.matchAll(/who: "keeper"[^\n]*text: "([^"]*)"/g)) assert.doesNotMatch(m[1], /당신|[가-힣](야|어)[.!?…]*$/, m[1]);
});
