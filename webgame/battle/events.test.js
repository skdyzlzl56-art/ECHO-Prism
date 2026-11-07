// Event backdrops (ticket 17): the name-spreading ripple, the 침묵 battle's hush wiring, and the atelier background after the painter. Run: npm test
const test = require("node:test"), assert = require("node:assert"), fs = require("node:fs"), path = require("node:path");
const { rippleRings, LAYERS } = require("./backdrop.js");
const rd = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");

test("name ripple: rings expand and fade, then vanish", () => {
  assert.deepEqual(rippleRings(-1), []);
  assert.deepEqual(rippleRings(10), []);
  const a = rippleRings(.5), b = rippleRings(1.5);
  assert.ok(a.length >= 2 && a.length === b.length);
  assert.ok(b[0].r > a[0].r && b[0].alpha < a[0].alpha);
  for (const R of [...a, ...b]) assert.ok(R.alpha > 0 && R.alpha <= .5 && R.r > 0);
});

test("the 'name' fx spreads a ripple through the background", () => {
  assert.match(rd("stage5/story.js"), /FX\.name = \{[^\n]*\bripple: 1/);
  assert.match(rd("index.html"), /fx\.ripple/);
});

test("only the final 침묵 battle is fully silent", () => {
  assert.match(rd("stage6/battles.js"), /BATTLES\.s6_silence = \{[^]*?silent: true/);
});

test("atelier: a theme with layers, applied right after the painter battle", () => {
  assert.match(rd("portraits.js"), /^  atelier: \{ sky:/m);
  assert.ok(LAYERS.atelier.length >= 2);
  const lines = rd("stage3/story.js").split("\n"), i = lines.findIndex(l => l.includes('act: "s3_painter"'));
  const next = lines.slice(i + 1).find(l => l.includes("{ who:"));
  assert.match(next, /theme: "atelier"/);
});
