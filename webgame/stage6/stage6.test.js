// Data check for stage 6 (and the whole script) + the chapter 6 finale battles. Run: node --test webgame/stage6/stage6.test.js
const test = require("node:test"), assert = require("node:assert"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const { createBattle } = require("../battle/sim.js");
const dir = path.join(__dirname, ".."), rd = f => fs.readFileSync(path.join(dir, f), "utf8");

const files = ["script.js", "stage1/battles.js", "stage1/story.js", "stage2/battles.js", "stage2/story.js", "stage3/battles.js", "stage3/story.js", "stage4/battles.js", "stage4/story.js", "stage5/battles.js", "stage5/story.js", "stage6/battles.js", "stage6/story.js"];
const src = "const BATTLES = {}, ACTS = {}, FX = {}, sweep = () => {}, noise = () => {};\n" + files.map(rd).join("\n") + "\n({ SCRIPT, SPEAKERS, BATTLES, FX, STAGE6, RED });";
const D = vm.runInNewContext(src);
const all = files.map(rd).join("\n") + rd("game.js") + rd("battle.js") + ["stage1", "stage3", "stage4", "stage6"].map(s => rd(s + "/scenes.js")).join("\n");
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
  assert.ok(themes.has(D.FX.stage6.warp), "warp theme");
});

test("stage 6 is about 150 lines, ends on the title, and the individual speaks exactly one line (the last one)", () => {
  for (const l of D.STAGE6) assert.ok(!/방향/.test(l.text || ""), `story names the removed direction rule: ${l.text}`);
  const n = D.STAGE6.filter(l => l.who).length;
  assert.ok(n >= 130 && n <= 180, `${n} lines`);
  assert.strictEqual(D.SCRIPT[D.SCRIPT.length - 1].act, "s6_title");
  const own = D.SCRIPT.filter(l => l.who === "self"); assert.strictEqual(own.length, 1);
  assert.strictEqual(own[0].rename, "에코");
  assert.ok(shapes.includes(D.SPEAKERS.self.shape));
  assert.strictEqual(D.SCRIPT.slice(0, D.SCRIPT.indexOf(own[0])).filter(l => l.who === "self").length, 0);
  assert.ok(D.STAGE6.some(l => /에코/.test(l.text || "")), "the name 에코 is given here");
  const prior = D.SCRIPT.slice(0, D.SCRIPT.length - D.STAGE6.length);
  assert.ok(prior.every(l => !/에코(?! 프리즘)/.test(l.text || "")), "에코 is never spoken before chapter 6");
});

test("stage 6 battles: per-phase rules mix colour, rewind, dark, page, invert and split (no direction rule); the last phase is the joint-light finale", () => {
  for (const id of ["s6_echoes", "s6_trial", "s6_silence"]) {
    const cfg = D.BATTLES[id]; assert.ok(bgms.has(cfg.bgm), id); assert.strictEqual(cfg.phases.length, cfg.names.length, id);
    assert.strictEqual(cfg.allies.length, 4, id);
  }
  const rules = id => D.BATTLES[id].phaseRules.map(r => Object.keys(r).join("+"));
  assert.deepStrictEqual([...rules("s6_trial")], ["colorRule", "rewind", "darkRule"]);
  const boss = D.BATTLES.s6_silence, last = boss.phaseRules[boss.phaseRules.length - 1];
  assert.strictEqual(boss.phaseRules.length, boss.phases.length);
  for (const k of ["colorRule", "rewind", "darkRule", "gravityRule", "stillRule", "invertRule", "splitRule"]) assert.ok(boss.phaseRules.some(r => r[k]), `boss uses ${k}`);
  assert.ok(boss.phaseRules[0].colorRule && boss.phaseRules[0].stillRule && boss.talks[0].some(l => /멈춰/.test(l.t)), "phase 1: colour + still rule, announced");
  assert.ok(boss.phaseRules[2].darkRule && boss.phaseRules[2].gravityRule, "phase 3: dark + gravity");
  assert.ok(boss.jointLight && last.finale, "last phase ends with the joint light");
  assert.ok(boss.phaseRules.slice(0, -1).every(r => r.colorRule || r.rewind || r.darkRule || r.gravityRule), "every earlier phase has a rule");
});

test("stage 6 boss: every phase fires bullets under its own rule, and the finale is won by the joint light at full bond", () => {
  const boss = D.BATTLES.s6_silence;
  boss.phases.forEach((_, lv) => {
    const b = createBattle({ ...boss, playerHp: 1e6, hp: 1e6, talks: {} }, { rng: Math.random }); b.state.auto = false;
    b.state.eHp = b.state.eMax * (lv ? boss.cuts[lv - 1] - .001 : 1);
    let n = 0, rw = 0; for (let t = 0; t < 12; t += 1 / 60) { const ev = b.step(1 / 60, {}); rw += ev.filter(v => v.type === "rewind").length; n = Math.max(n, b.state.bullets.length); }
    assert.strictEqual(b.state.level, lv); assert.ok(n > 0, `phase ${lv} fires`);
    assert.strictEqual(rw > 0, !!boss.phaseRules[lv].rewind, `phase ${lv} rewind`);
  });
  const b = createBattle({ ...boss, playerHp: 1e6, talks: {}, gauge0: 100 }, { rng: Math.random, bondBase: 3 }); b.state.auto = false;
  b.state.eHp = b.state.eMax * .1; for (let t = 0; t < 2; t += 1 / 60) b.step(1 / 60, {});
  assert.strictEqual(b.state.level, 4); assert.ok(!b.state.over || b.state.over === "win");
  b.state.gauge = 100; const ev = b.step(1 / 60, {});
  assert.ok(ev.some(v => v.type === "jointLight")); assert.strictEqual(b.state.over, "win");
});

test("stage 6 has its own music: core field and final boss use s6_field / s6_boss, not stage 1 tracks", () => {
  assert.strictEqual(D.BATTLES.s6_silence.bgm, "s6_boss");
  for (const l of D.STAGE6) if (l.bgm) assert.ok(!/^s1_/.test(l.bgm), `${l.bgm}: ${l.text || l.act}`);
  assert.ok(D.STAGE6.some(l => l.bgm === "s6_field") && D.STAGE6.some(l => l.act === "s6_silence" && l.bgm === "s6_boss"));
});
