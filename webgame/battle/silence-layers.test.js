// Final fight: sound and sky return one layer per phase. The volumes themselves are tested in audio.test.js; this pins the wiring. Run: npm test
const test = require("node:test"), assert = require("node:assert"), fs = require("node:fs"), path = require("node:path");
const rd = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");

test("phase events of a silent battle raise the layer, and the layers come back in order: attacks, music, sky, rest", () => {
  assert.match(rd("battle.js"), /case "phase":\s*if \(cfg\.silent\) \{ hushLayer\(v\.level\)/);
  assert.match(rd("audio.js"), /LAYER_AT = \{ shot: 1, bgm: 2, sfx: 4 \}/);
  assert.match(rd("portraits.js"), /audio\.layer < 3/);   // sky appears at layer 3
});
