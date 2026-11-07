// Ticket 18: a phase's explanation comes before its pattern; the ending fades out and rolls motion-graphic credits.
const test = require("node:test"), assert = require("node:assert"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const { createBattle } = require("../battle/sim.js");
const rd = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const files = ["script.js", "stage1/battles.js", "stage2/battles.js", "stage3/battles.js", "stage4/battles.js", "stage5/battles.js", "stage6/battles.js"];
const D = vm.runInNewContext("const BATTLES = {}, ACTS = {}, FX = {}, sweep = () => {}, noise = () => {};\n" + files.map(rd).join("\n") + "\n({ BATTLES, RED });");
const boss = D.BATTLES.s6_silence;

test("a talks[0] dialogue opens the fight before the first pattern fires", () => {
  const b = createBattle({ speaker: "x", hp: 100, cuts: [], names: ["a"], moves: [{ x: "sway" }], phases: [h => h.rain(.5)], playerHp: 99, talks: { 0: [{ who: "x", t: "hi" }] } }, { rng: () => .5 });
  let shots = 0; for (let t = 0; t < 2; t += 1 / 60) shots += b.step(1 / 60, {}).filter(v => v.type === "enemyShot").length;
  assert.ok(b.state.talk, "dialogue shown"); assert.strictEqual(shots, 0, "no bullets while it is shown");
});

test("s6_silence: every phase has its explanation, keyed to its own start (the finale's too)", () => {
  assert.deepStrictEqual(Object.keys(boss.talks).map(Number).sort(), [0, 1, 2, 3, 4]);
  assert.ok(boss.talks[0].some(l => /붉은/.test(l.t)), "phase 1 explains the red rule first");
  assert.ok(boss.talks[4].some(l => /유대/.test(l.t)), "finale explains the bond light before its pattern");
});

test("ending: credits roll with motion and the scene fades out", () => {
  const act = {}, ACTS = {};
  vm.runInNewContext(rd("stage6/scenes.js"), { ACTS, act, $: () => ({}), setTimeout: () => 0, addEventListener: () => {}, location: {} });
  ACTS.s6_title(() => {});
  assert.ok(/@keyframes/.test(act.innerHTML) && /credits/i.test(act.innerHTML), "motion credits");
  assert.ok(/fadeout/i.test(act.innerHTML), "fade-out");
});
