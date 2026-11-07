// Data check for stage 5 (and the whole script so far) + the direction-rule battles. Run: node --test webgame/stage5/stage5.test.js
const test = require("node:test"), assert = require("node:assert"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const { createBattle } = require("../battle/sim.js");
const dir = path.join(__dirname, ".."), rd = f => fs.readFileSync(path.join(dir, f), "utf8");

const files = ["script.js", "stage1/battles.js", "stage1/story.js", "stage2/battles.js", "stage2/story.js", "stage3/battles.js", "stage3/story.js", "stage4/battles.js", "stage4/story.js", "stage5/battles.js", "stage5/story.js"];
const src = "const BATTLES = {}, ACTS = {}, FX = {}, sweep = () => {}, noise = () => {};\n" + files.map(rd).join("\n") + "\n({ SCRIPT, SPEAKERS, BATTLES, FX, STAGE5 });";
const D = vm.runInNewContext(src);
const all = files.map(rd).join("\n") + rd("game.js") + rd("battle.js") + rd("stage1/scenes.js") + rd("stage3/scenes.js") + rd("stage4/scenes.js");
const acts = new Set([...all.matchAll(/ACTS\.(\w+) =/g)].map(m => m[1]));
const themes = new Set([...rd("portraits.js").matchAll(/^\s+(\w+):\s+\{ sky:/gm)].map(m => m[1]));
const bgms = new Set(fs.readdirSync(path.join(dir, "audio")).map(f => f.replace(/^bgm_|\.ogg$/g, "")));
const shapes = rd("portraits.js").match(/const SHAPES = \{([^}]*)\}/)[1].split(",").map(s => s.trim());

test("every script line references existing speakers, bgm, fx, themes and acts", () => {
  for (const [i, l] of D.SCRIPT.entries()) {
    const at = `line ${i}: ${l.text || l.act}`;
    if (l.who) assert.ok(D.SPEAKERS[l.who], `speaker ${l.who} (${at})`);
    if (l.bgm && l.bgm !== "off") assert.ok(bgms.has(l.bgm), `bgm ${l.bgm} (${at})`);
    if (l.fx) assert.ok(D.FX[l.fx] || ["alert", "title", "shake", "impact"].includes(l.fx), `fx ${l.fx} (${at})`);
    if (l.theme) assert.ok(themes.has(l.theme), `theme ${l.theme} (${at})`);
    if (l.act) assert.ok(acts.has(l.act), `act ${l.act}`);
    assert.ok(l.who || l.act, at);
  }
  assert.ok(themes.has(D.FX.stage5.warp), "warp theme");
});

test("stage 5 speakers have a drawable shape, about 150 lines, and the finale name is not spoken yet", () => {
  for (const id of ["librarian", "scrap"]) assert.ok(shapes.includes(D.SPEAKERS[id].shape), id);
  const n = D.STAGE5.filter(l => l.who).length;
  assert.ok(n >= 130 && n <= 180, `${n} lines`);
  assert.ok(D.STAGE5.every(l => !(l.text || "").includes("에코")), "name 에코 is saved for chapter 6");
  assert.ok(D.STAGE5.some(l => /메아리/.test(l.text || "")), "echo hint planted");
});

test("stage 5 boss and practice fight use the direction rule, named bullets, and keep the 4-ally party", () => {
  for (const id of ["s5_pages", "s5_index", "s5_librarian"]) {
    const cfg = D.BATTLES[id]; assert.ok(bgms.has(cfg.bgm), id); assert.strictEqual(cfg.phases.length, cfg.names.length, id);
    assert.strictEqual(cfg.allies.length, 4, id);
  }
  assert.strictEqual(D.BATTLES.s5_pages.dirRule, undefined);
  for (const id of ["s5_index", "s5_librarian"]) {
    const cfg = D.BATTLES[id]; assert.ok(cfg.dirRule && cfg.dirRule.name, `${id} names its bullets`);
    const b = createBattle({ ...cfg, playerHp: 1e6, hp: 1e6, talks: {} }, { rng: Math.random }); b.state.auto = false;
    for (let t = 0; t < 6; t += 1 / 60) b.step(1 / 60, {});
    assert.ok(b.state.bullets.length > 0 && b.state.bullets.every(x => x.nm === cfg.dirRule.name), id);
  }
});
