// Data check for stage 3 (and the whole script so far): every line's speaker, bgm, fx, theme and act must exist; battles must be playable.
// Run: node --test webgame/stage3
const test = require("node:test"), assert = require("node:assert"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const { createBattle } = require("../battle/sim.js");
const dir = path.join(__dirname, ".."), rd = f => fs.readFileSync(path.join(dir, f), "utf8");

const files = ["script.js", "stage1/battles.js", "stage1/story.js", "stage2/battles.js", "stage2/story.js", "stage3/battles.js", "stage3/story.js"];
const src = "const BATTLES = {}, ACTS = {}, FX = {}, sweep = () => {}, noise = () => {};\n" + files.map(rd).join("\n") + "\n({ SCRIPT, SPEAKERS, BATTLES, FX, STAGE3, RED });";
const D = vm.runInNewContext(src);
const all = files.map(rd).join("\n") + rd("game.js") + rd("battle.js") +rd("stage1/scenes.js") + rd("stage3/scenes.js");
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
    if (l.act) { assert.ok(acts.has(l.act), `act ${l.act}`); if (D.BATTLES[l.act]) assert.ok(!l.bgm || bgms.has(l.bgm)); }
    assert.ok(l.who || l.act, at);
  }
});

test("stage 3 speakers have a drawable shape and about 150 lines", () => {
  for (const id of ["painter", "blot", "glitch"]) assert.ok(shapes.includes(D.SPEAKERS[id].shape), id);
  const n = D.STAGE3.filter(l => l.who).length;
  assert.ok(n >= 130 && n <= 180, `${n} lines`);
});

test("stage 3 battles use the colour rule with both hurting and harmless bullets, and bgm exists", () => {
  for (const id of ["s3_blots", "s3_study", "s3_painter"]) {
    const cfg = D.BATTLES[id]; assert.ok(bgms.has(cfg.bgm), id); assert.strictEqual(cfg.phases.length, cfg.names.length, id);
    const b = createBattle({ ...cfg, playerHp: 1e6, hp: 1e6, talks: {} }, { rng: Math.random }); b.state.auto = false;
    const cols = new Set(); for (let t = 0; t < 30; t += 1 / 60) { b.step(1 / 60, {}); b.state.bullets.forEach(x => cols.add(x.col)); }
    if (cfg.colorRule) { assert.strictEqual(cfg.colorRule, D.RED); assert.ok(cols.has(D.RED) && cols.size > 1, `${id} mixes colours`); }
  }
});
