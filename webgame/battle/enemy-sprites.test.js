// Ticket 09: each enemy shape draws its own body in battle, not the glitch shard. Records canvas calls from the real frame loop.
const test = require("node:test"), assert = require("node:assert"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const sim = require("./sim.js"), dlg = require("../dialogue.js"), menu = require("../menu.js");
const stub = () => new Proxy(function () {}, { get: (_, k) => k === Symbol.toPrimitive ? () => 0 : k === "length" ? 0 : stub(), set: () => true, apply: () => stub() });

// frames of a battle whose enemy has the given shape -> every canvas call/assignment made while drawing, as one string
function drawLog(shape) {
  const rafs = [], log = [], rec = new Proxy({}, { get: (_, k) => (...a) => (log.push(k + JSON.stringify(a)), stub()), set: (_, k, v) => (log.push(k + "=" + v), true) });
  const M = Object.create(Math); M.random = () => .5;
  const ctx = vm.createContext({
    ...sim, ...dlg, fixKeys: menu.fixKeys, keyLabel: menu.keyLabel, MENU: menu.createMenu(dlg.KEYS, { get: () => null, set: () => {} }), HITBOX: 4, console, Math: M, Set, Object, Array, String, JSON, Number, Date,
    SPEAKERS: { e: { name: "e", color: "#fff", pitch: 200, spin: 1, shape, close: 0 } },
    $: id => id === "ar" ? { getContext: () => rec } : stub(), stage: stub(), act: stub(), bgm: stub(), sweep: () => {}, noise: () => {}, retrigger: () => {}, setPortrait: () => {}, kickPortrait: () => {}, setCast: () => {},
    performance: { now: () => 0 }, requestAnimationFrame: cb => (rafs.push(cb), rafs.length), cancelAnimationFrame: () => {},
    ACTS: {}, FX: {}, TAU: Math.PI * 2, drawShape: () => {}, myShape: stub(), PLAYER_SHAPES: [stub()], addEventListener: () => {}, removeEventListener: () => {}, setTimeout: () => 0, localStorage: { getItem: () => null, setItem: () => {} },
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../battle.js"), "utf8") + "\n;globalThis.__run = runBattle;", ctx);
  ctx.__run({ speaker: "e", hp: 60, cuts: [.5], playerHp: 99, color: "#fff", names: ["a", "b"], moves: [{ x: "sway" }], phases: [h => h.rain(.5)], talks: {} }, () => {});
  for (let i = 0; i < 3; i++) rafs.pop()((i + 1) * 1000 / 60);
  return log.join("\n");
}

test("shard enemies keep the glitch shard; gear, easel, rings and orb each differ from it and from each other", () => {
  const body = Object.fromEntries(["shard", "gear", "easel", "rings", "orb"].map(s => [s, drawLog(s)]));
  assert.strictEqual(drawLog("shard"), body.shard, "draw log must be deterministic");
  for (const a of Object.keys(body)) for (const b of Object.keys(body)) if (a < b) assert.notStrictEqual(body[a], body[b], `${a} and ${b} draw the same body`);
});
