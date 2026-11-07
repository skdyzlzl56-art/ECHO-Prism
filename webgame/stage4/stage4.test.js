// Data check for stage 4 (and the whole script so far) + the 4-ally party. Run: node --test webgame/stage4/stage4.test.js
const test = require("node:test"), assert = require("node:assert"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const { createBattle } = require("../battle/sim.js");
const dir = path.join(__dirname, ".."), rd = f => fs.readFileSync(path.join(dir, f), "utf8");

const files = ["script.js", "stage1/battles.js", "stage1/story.js", "stage2/battles.js", "stage2/story.js", "stage3/battles.js", "stage3/story.js", "stage4/battles.js", "stage4/story.js"];
const src = "const BATTLES = {}, ACTS = {}, FX = {}, sweep = () => {}, noise = () => {};\n" + files.map(rd).join("\n") + "\n({ SCRIPT, SPEAKERS, BATTLES, FX, STAGE4, PARTY4 });";
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
});

test("stage 4 speakers have a drawable shape and about 150 lines", () => {
  for (const id of ["keeper", "tick"]) assert.ok(shapes.includes(D.SPEAKERS[id].shape), id);
  const n = D.STAGE4.filter(l => l.who).length;
  assert.ok(n >= 130 && n <= 180, `${n} lines`);
});

test("stage 4 battles: bgm exists, boss and mooks rewind, rewinds actually fire", () => {
  for (const id of ["s4_ticks", "s4_keeper", "s4_exit"]) {
    const cfg = D.BATTLES[id]; assert.ok(bgms.has(cfg.bgm), id); assert.strictEqual(cfg.phases.length, cfg.names.length, id);
    assert.ok(cfg.rewind > 0, `${id} uses the rewind rule`);
    const b = createBattle({ ...cfg, playerHp: 1e6, hp: 1e6, talks: {} }, { rng: Math.random }); b.state.auto = false;
    let n = 0; for (let t = 0; t < 12; t += 1 / 60) n += b.step(1 / 60, {}).filter(v => v.type === "rewind").length;
    assert.ok(n >= 1, `${id} rewound`);
  }
});

test("4 allies cycle with X: lumi -> hexa -> glitch -> keeper -> lumi, each with a kit and a bond light", () => {
  const P = D.PARTY4; assert.deepStrictEqual([...P.allies], ["lumi", "hexa", "glitch", "keeper"]);
  for (const id of P.allies) assert.ok(P.lights[id], `light for ${id}`);
  assert.strictEqual(new Set(Object.values(P.lights)).size, 4, "four distinct lights");
  assert.strictEqual(D.BATTLES.s4_exit.allies.length, 4);
  const b = createBattle({ ...D.BATTLES.s4_exit, playerHp: 1e6, hp: 1e6, talks: {} }, { rng: Math.random }); b.state.auto = false;
  const seen = [b.state.allyId];
  for (let i = 0; i < 4; i++) { for (let t = 0; t < 1.6; t += 1 / 60) b.step(1 / 60, {}); assert.ok(b.swap()); seen.push(b.state.allyId); }
  assert.deepStrictEqual(seen, ["lumi", "hexa", "glitch", "keeper", "lumi"]);
});
