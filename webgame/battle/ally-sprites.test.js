// Ticket 10: each companion looks different in battle. Body draw helpers are stubbed to nothing, so any difference left is the ally's shots.
const test = require("node:test"), assert = require("node:assert"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const sim = require("./sim.js"), snd = require("./sound.js"), dlg = require("../dialogue.js"), menu = require("../menu.js");
const stub = () => new Proxy(function () {}, { get: (_, k) => k === Symbol.toPrimitive ? () => 0 : k === "length" ? 0 : stub(), set: () => true, apply: () => stub() });

function shotLog(allyId) {
  const rafs = [], log = [], rec = new Proxy({}, { get: (_, k) => (...a) => (log.push(k + JSON.stringify(a.map(v => typeof v === "number" ? 0 : v))), stub()), set: (_, k, v) => (log.push(k + "=" + v), true) });
  const M = Object.create(Math); M.random = () => .5;
  const sp = { name: "x", color: "#fff", pitch: 200, spin: 1, shape: "shard", close: 0 };
  const ctx = vm.createContext({
    ...sim, ...snd, ...dlg, fixKeys: menu.fixKeys, keyLabel: menu.keyLabel, MENU: menu.createMenu(dlg.KEYS, { get: () => null, set: () => {} }), HITBOX: 4, console, Math: M, Set, Object, Array, String, JSON, Number, Date,
    SPEAKERS: { e: sp, lumi: sp, hexa: sp, glitch: sp, keeper: sp },
    $: id => id === "ar" ? { getContext: () => rec } : stub(), stage: stub(), act: stub(), bgm: stub(), sweep: () => {}, noise: () => {}, retrigger: () => {}, setPortrait: () => {}, kickPortrait: () => {}, setCast: () => {},
    performance: { now: () => 0 }, requestAnimationFrame: cb => (rafs.push(cb), rafs.length), cancelAnimationFrame: () => {},
    ACTS: {}, FX: {}, TAU: Math.PI * 2, drawShape: () => {}, myShape: stub(), PLAYER_SHAPES: [stub()], addEventListener: () => {}, removeEventListener: () => {}, setTimeout: () => 0, localStorage: { getItem: () => null, setItem: () => {} },
    drawHexa: () => {}, drawGlitch: () => {}, drawGearAlly: () => {},
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../battle.js"), "utf8") + "\n;globalThis.__run = runBattle;", ctx);
  ctx.__run({ speaker: "e", hp: 600, cuts: [.5], playerHp: 99, color: "#fff", names: ["a", "b"], moves: [{ x: "sway" }], phases: [h => h.rain(.5)], talks: {},
    ally: allyId, allies: [allyId], kits: { [allyId]: { cd: .5, dm: 1, heal: 0, shield: 0 } } }, () => {});
  for (let i = 0; i < 200; i++) { const r = rafs.pop(); if (!r) break; r((i + 1) * 1000 / 60); }
  return log.join("\n");
}

test("companion shots differ per ally, not one shared dot", () => {
  const ids = ["lumi", "hexa", "glitch", "keeper"], out = Object.fromEntries(ids.map(i => [i, shotLog(i)]));
  for (const a of ids) for (const b of ids) if (a < b) assert.notStrictEqual(out[a], out[b], `${a} and ${b} draw the same`);
});
