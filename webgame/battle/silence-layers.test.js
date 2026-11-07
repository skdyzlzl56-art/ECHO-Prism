// Final fight: sound and sky return one layer per phase. Display/audio is not testable headless; this pins the wiring. Run: npm test
const test = require("node:test"), assert = require("node:assert"), fs = require("node:fs"), path = require("node:path");
const rd = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");

test("phase events of a silent battle raise the layer, and the layers come back in order: attacks, music, sky, rest", () => {
  assert.match(rd("battle.js"), /case "phase":\s*if \(cfg\.silent\) \{ hushLayer\(v\.level\)/);
  assert.match(rd("index.html"), /LAYER_AT = \{ shot: 1, bgm: 2, sfx: 4 \}/);
  assert.match(rd("portraits.js"), /silenceLayer < 3/);   // sky appears at layer 3
});

test("the 'shot' bus follows the sfx volume, so hush(false) at the end of the fight never sets a non-finite gain (it froze the game after the final win)", () => {
  const html = rd("index.html"), src = ["let hushed", "let silenceLayer", "const LAYER_AT", "const mv"].map(k => html.split("\n").find(l => l.startsWith(k))).join("\n");
  const run = (hushed, layer) => new Function("MENU", `${src.replace("let hushed = false;", `let hushed = ${hushed};`).replace("let silenceLayer = 0", `let silenceLayer = ${layer}`)}\nreturn ["shot", "sfx", "bgm"].map(mv);`)({ vol: { bgm: .5, sfx: .7 } });
  assert.deepStrictEqual(run(false, 0), [.7, .7, .5]);                 // not hushed (after the battle): every bus has a finite volume
  assert.deepStrictEqual(run(true, 1), [.7, 0, 0]);                    // layer 1: only the enemy's attacks
  assert.deepStrictEqual(run(true, 4), [.7, .7, .5]);
});
