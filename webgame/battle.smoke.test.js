// Smoke test for the battle view (battle.js): runs the real frame loop against stubbed DOM/canvas/audio and checks it keeps running.
// Catches view-level crashes the sim tests cannot see (e.g. reading s.talk after the last line cleared it). Looks are not checked.
const test = require("node:test"), assert = require("node:assert"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const rd = f => fs.readFileSync(path.join(__dirname, f), "utf8");
const sim = require("./battle/sim.js"), snd = { ...require("./battle/sound.js"), ...require("./battle/fx.js") }, dlg = require("./dialogue.js"), menu = require("./menu.js");

// anything-goes stub: reads return another stub (callable), writes are accepted
const stub = () => new Proxy(function () {}, { get: (_, k) => k === Symbol.toPrimitive ? () => 0 : k === "length" ? 0 : stub(), set: () => true, apply: () => stub() });

function load() {
  const rafs = [], handlers = {}, hushLog = [], timers = [], MENU = menu.createMenu(dlg.KEYS, { get: () => null, set: () => {} });
  const ctx = vm.createContext({
    ...sim, ...snd, ...dlg, fixKeys: menu.fixKeys, keyLabel: menu.keyLabel, MENU, HITBOX: 4, console, Math, Set, Object, Array, String, JSON, Number, Date,
    SPEAKERS: new Proxy({}, { get: (t, k) => t[k] || (t[k] = { name: String(k), color: "#fff", pitch: 200, spin: 1, shape: "bloom", close: 0 }) }),
    $: () => stub(), stage: stub(), act: stub(), bgm: stub(), sweep: () => {}, noise: () => {}, retrigger: () => {}, setPortrait: () => {}, kickPortrait: () => {}, setCast: () => {},
    performance: { now: () => 0 }, requestAnimationFrame: cb => (rafs.push(cb), rafs.length), cancelAnimationFrame: () => {},
    ACTS: {}, FX: {}, TAU: Math.PI * 2, drawShape: () => {}, myShape: stub(), PLAYER_SHAPES: [stub()], addEventListener: (k, f) => { handlers[k] = f; }, removeEventListener: () => {}, setTimeout: f => (timers.push(f), 0), hush: on => hushLog.push(on), hushLayer: n => hushLog.push("L" + n), ripple: () => {}, sfxBus: () => {}, localStorage: { getItem: () => null, setItem: () => {} },
  });
  vm.runInContext(rd("battle.js") + "\n;globalThis.__run = runBattle; globalThis.__bond = BOND;", ctx);
  return { ctx, rafs, handlers, hushLog, timers };
}

// drive n frames of 1/60 s; every frame must schedule the next one until the battle ends
function drive(rafs, n, t0 = 0) {
  for (let i = 0; i < n; i++) {
    const cb = rafs.pop(); assert.ok(cb, `frame loop stopped after ${i} frames`);
    cb(t0 + (i + 1) * 1000 / 60);
  }
}

const cfg = (extra = {}) => ({
  speaker: "glitch", hp: 60, cuts: [.5], playerHp: 99, color: "#ff3b5c", names: ["a", "b"],
  moves: [{ x: "sway" }], phases: [h => h.rain(.5), h => h.fan(1, 5, .3, 100)],
  talks: { 1: [{ who: "glitch", t: "첫 줄" }, { who: "glitch", t: "마지막 줄" }] }, ...extra,
});

test("frame loop survives a plain battle", () => {
  const { ctx, rafs } = load(); ctx.__run(cfg(), () => {});
  drive(rafs, 300);
});

test("frame loop survives the 중력 / 정지 overlays (warning and live)", () => {
  for (const rule of [{ gravityRule: { period: 3, warn: 1.2, dur: 1, pull: 50 } }, { stillRule: { period: 3, warn: 1.2, dur: 1, dmg: 1 } }]) {
    const { ctx, rafs } = load(); ctx.__run(cfg({ ...rule, playerHp: 1e6 }), () => {});
    drive(rafs, 600);
  }
});

test("holding Ctrl (skip) through the last dialogue line keeps the loop alive", () => {
  const { ctx, rafs, handlers } = load();
  ctx.__run(cfg({ hp: 100, cuts: [.99], talks: { 1: [{ who: "glitch", t: "첫 줄" }, { who: "glitch", t: "마지막 줄" }] } }), () => {});
  drive(rafs, 90);                                                   // past the 1s grace: the first shot lands and the phase talk opens
  handlers.keydown({ code: "ControlLeft", key: dlg.KEYS.skip, repeat: false, preventDefault() {} });
  drive(rafs, 600, 1500);                                            // skip walks through every line; the loop must outlive the last one
});

test("a silent battle (cfg.silent) hushes all sound while it runs and restores it afterwards", () => {
  const plain = load(); plain.ctx.__run(cfg(), () => {}); assert.deepEqual(plain.hushLog, []);   // other battles never touch the sound
  const { ctx, rafs, hushLog, timers } = load(); let done = false;
  ctx.__run(cfg({ silent: true, invuln: true, survive: 1, hp: 999, cuts: [] }), () => { done = true; });
  assert.deepEqual(hushLog.filter(x => x === true || x === false), [true]);
  drive(rafs, 200);                                                  // past the 1s grace + the 1s survive clock: win
  timers.forEach(f => f());                                          // the win outro timer runs end()
  assert.ok(done); assert.deepEqual(hushLog.filter(x => x === true || x === false), [true, false]);
});
