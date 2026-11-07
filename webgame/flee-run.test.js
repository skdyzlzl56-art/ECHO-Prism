// Real s2_flee (30s escape) played to the end on the stubbed frame loop: it must win and call done. Run: npm test
const test = require("node:test"), assert = require("node:assert"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const sim = require("./battle/sim.js"), dlg = require("./dialogue.js"), menu = require("./menu.js");
const rd = f => fs.readFileSync(path.join(__dirname, f), "utf8");
const stub = () => new Proxy(function () {}, { get: (_, k) => k === Symbol.toPrimitive ? () => 0 : k === "length" ? 0 : stub(), set: () => true, apply: () => stub() });

test("s2_flee: after 30 seconds the battle ends in a win and hands control back", () => {
  const D = vm.runInNewContext("const BATTLES = {}, ACTS = {}, FX = {}, sweep = () => {}, noise = () => {}, runBattle = () => {};\n" + ["script.js", "stage1/battles.js", "stage2/battles.js"].map(rd).join("\n") + "\n({ BATTLES });");
  const rafs = [], timers = [], MENU = menu.createMenu(dlg.KEYS, { get: () => null, set: () => {} });
  const ctx = vm.createContext({
    ...sim, ...dlg, fixKeys: menu.fixKeys, keyLabel: menu.keyLabel, MENU, HITBOX: 4, console, Math, Set, Object, Array, String, JSON, Number, Date,
    SPEAKERS: new Proxy({}, { get: (t, k) => t[k] || (t[k] = { name: String(k), color: "#fff", pitch: 200, spin: 1, shape: "bloom", close: 0 }) }),
    $: () => stub(), stage: stub(), act: stub(), bgm: stub(), sweep: () => {}, noise: () => {}, retrigger: () => {}, setPortrait: () => {}, kickPortrait: () => {}, setCast: () => {},
    performance: { now: () => 0 }, requestAnimationFrame: cb => (rafs.push(cb), rafs.length), cancelAnimationFrame: () => {},
    ACTS: {}, FX: {}, TAU: Math.PI * 2, drawShape: () => {}, myShape: stub(), PLAYER_SHAPES: [stub()], addEventListener: () => {}, removeEventListener: () => {}, setTimeout: f => (timers.push(f), 0), hush: () => {}, hushLayer: () => {}, ripple: () => {}, sfxBus: () => {}, localStorage: { getItem: () => null, setItem: () => {} },
  });
  vm.runInContext(rd("battle.js") + "\n;globalThis.__run = runBattle;", ctx);
  let done = false; ctx.__run({ ...D.BATTLES.s2_flee, playerHp: 99999 }, () => { done = true; });
  for (let i = 0; i < 60 * 33; i++) { const cb = rafs.pop(); assert.ok(cb, `loop stopped at frame ${i}`); cb((i + 1) * 1000 / 60); }
  timers.forEach(f => f());
  assert.ok(done, "done() was called");
});
