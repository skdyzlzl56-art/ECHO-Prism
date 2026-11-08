// Data check for stage 5 (and the whole script so far). Run: node --test webgame/stage5/stage5.test.js
const test = require("node:test"), assert = require("node:assert"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const { createBattle } = require("../battle/sim.js");
const dir = path.join(__dirname, ".."), rd = f => fs.readFileSync(path.join(dir, f), "utf8");

const files = ["script.js", "stage1/battles.js", "stage1/story.js", "stage2/battles.js", "stage2/story.js", "stage3/battles.js", "stage3/story.js", "stage4/battles.js", "stage4/story.js", "stage5/battles.js", "stage5/story.js"];
const src = "const BATTLES = {}, ACTS = {}, FX = {}, sweep = () => {}, noise = () => {};\n" + files.map(rd).join("\n") + "\n({ SCRIPT, SPEAKERS, BATTLES, FX, STAGE5 });";
const D = vm.runInNewContext(src);
const all = files.map(rd).join("\n") + rd("game.js") + rd("battle.js") + rd("stage1/scenes.js") + rd("stage3/scenes.js") + rd("stage4/scenes.js");
const acts = new Set([...all.matchAll(/(?:ACTS|BATTLES)\.(\w+) =/g)].map(m => m[1]));
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

test("stage 5 boss and practice fight use the gravity rule (no direction rule), and keep the 4-ally party", () => {
  for (const id of ["s5_pages", "s5_index", "s5_librarian"]) {
    const cfg = D.BATTLES[id]; assert.ok(bgms.has(cfg.bgm), id); assert.strictEqual(cfg.phases.length, cfg.names.length, id);
    assert.strictEqual(cfg.allies.length, 4, id);
    assert.ok(!(cfg.phaseRules || []).some(r => r.darkRule), id);
  }
  assert.strictEqual(D.BATTLES.s5_pages.gravityRule, undefined);
  const periods = id => D.BATTLES[id].phaseRules.map(r => r.gravityRule.period);
  const idx = periods("s5_index"), lib = periods("s5_librarian");
  assert.strictEqual(idx.length, 2); assert.strictEqual(lib.length, 4);
  assert.ok(lib.every((p, i) => !i || p < lib[i - 1]), "librarian gravity cycles shorten each phase");
  assert.ok(Math.min(...idx) >= Math.max(...lib), "practice cycle is longer than any boss cycle");
  for (const id of ["s5_index", "s5_librarian"]) {
    const b = createBattle({ ...D.BATTLES[id], playerHp: 1e6, hp: 1e6, talks: {} }, { rng: Math.random }); b.state.auto = false;
    const ev = []; for (let t = 0; t < 12; t += 1 / 60) ev.push(...b.step(1 / 60, {}));
    assert.ok(ev.some(v => v.type === "gravityWarn") && ev.some(v => v.type === "gravityOn"), id);
  }
  const pulls = D.BATTLES.s5_librarian.phaseRules.map(r => r.gravityRule.pull);
  assert.ok(pulls.every((p, i) => !i || p > pulls[i - 1]), "librarian pull grows each phase");
  const text = JSON.stringify([D.BATTLES.s5_index.talks, D.BATTLES.s5_librarian.talks, D.BATTLES.s5_librarian.names]);
  assert.ok(!/방향|가는 쪽|같은 방향|탄에 「/.test(text), "no direction-rule wording left");
  assert.ok(!/쪽 넘김|넘어가|페이지|띠/.test(text + JSON.stringify(D.STAGE5.map(l => l.text))), "no page-turn wording left");
  for (const l of D.STAGE5) assert.ok(!/방향|같이 움직|거슬러|따라가는 법|탄의 흐름/.test(l.text || ""), `story still teaches the direction rule: ${l.text}`);
});

test("stage 5 has its own music: librarian boss uses s5_boss and no stage 5 line uses stage 2 tracks", () => {
  assert.strictEqual(D.BATTLES.s5_librarian.bgm, "s5_boss");
  for (const l of D.STAGE5) if (l.bgm) assert.ok(!/^s2_/.test(l.bgm), `${l.bgm}: ${l.text || l.act}`);
});
