// Ticket 07: cooldown rings and signature moves are named in the story; s6_trial's talks are keyed 0..2 (one per phase).
const test = require("node:test"), assert = require("node:assert"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const { createBattle } = require("./battle/sim.js");
const rd = f => fs.readFileSync(path.join(__dirname, f), "utf8");
const D = vm.runInNewContext("const BATTLES = {}, ACTS = {}, FX = {}, sweep = () => {}, noise = () => {};\n" + ["script.js", "stage1/battles.js", "stage2/battles.js", "stage3/battles.js", "stage4/battles.js", "stage5/battles.js", "stage6/battles.js"].map(rd).join("\n") + "\n({ BATTLES, SCRIPT: SCRIPT });");

test("s6_trial: each of the three phases has its own dialogue (keys 0..2)", () => {
  assert.deepStrictEqual(Object.keys(D.BATTLES.s6_trial.talks).map(Number).sort(), [0, 1, 2]);
});

test("first battle briefing explains the dash ring", () => {
  const i = D.SCRIPT.findIndex(l => l.act === "battle"), brief = D.SCRIPT.slice(0, i).map(l => l.text || "").join("\n");
  assert.match(brief, /원/); assert.match(brief, /대시/);
});

test("each ally calls its signature move in its own voice", () => {
  const mute = { cd: 99, dm: 1, heal: 0, shield: 0 }, calls = {};
  for (const id of ["lumi", "hexa", "glitch", "keeper"]) {
    const b = createBattle({ hp: 1e6, playerHp: 1e6, phases: [() => {}], names: [], ally: id, allies: [id], kits: { [id]: mute } }, { rng: () => .5, bondBase: 1 });
    for (let t = 0; t < 1.1; t += 1 / 60) b.step(1 / 60, {});
    b.state.cool[id].sig = 0; calls[id] = b.step(.016, {}).find(x => x.type === "signature").call;
  }
  for (const c of Object.values(calls)) assert.ok(c && c.length > 3);
  assert.match(calls.keeper, /습니다/, "keeper: formal");
  assert.doesNotMatch(calls.lumi, /습니다/, "lumi: banmal");
  assert.match(calls.glitch, /흥|시끄러|[냐다]/, "glitch: gruff");
  assert.match(calls.hexa, /다|\.\.\./, "hexa: terse");
});
