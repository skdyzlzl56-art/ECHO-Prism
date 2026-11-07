// scene.js through its interface only: the page globals are stubs (vm), frames are run by hand. Run: npm test
const test = require("node:test"), assert = require("node:assert"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");

function rig() {
  const log = [], rafs = [], listeners = new Set(), canvas = new Proxy({}, { get: (_, k) => k === "measureText" ? () => ({ width: 0 }) : (...a) => { log.push(k + ":" + a.join(",")); }, set: () => true });
  const cls = new Set(), act = { hidden: true, innerHTML: "", onclick: null };
  const ctx = vm.createContext({
    stage: { classList: { add: c => cls.add(c), remove: c => cls.delete(c) } }, act, $: () => ({ getContext: () => canvas }), performance: { now: () => 0 },
    requestAnimationFrame: f => rafs.push(f), cancelAnimationFrame: () => { rafs.length = 0; },
    addEventListener: (k, f) => listeners.add(k + f), removeEventListener: (k, f) => listeners.delete(k + f),
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, "scene.js"), "utf8") + "\n;globalThis.__api = { openScene, partyCard, wrap };", ctx);
  let now = 0; const frame = ms => { now += ms; const f = rafs.shift(); f(now); };
  return { api: ctx.__api, act, cls, listeners, log, rafs, frame };
}

test("openScene puts the scene up, steps it with dt capped at .05 s, and close() takes everything down and calls done once", () => {
  const r = rig(), dts = []; let done = 0;
  const scene = r.api.openScene({ html: "<canvas></canvas>", step: dt => dts.push(dt), key: () => {}, keyup: () => {}, done: () => done++ });
  assert.ok(r.cls.has("pick") && !r.act.hidden && r.act.innerHTML === "<canvas></canvas>" && r.listeners.size === 2);
  r.frame(16); r.frame(500); assert.deepEqual(dts.map(d => Math.round(d * 1000)), [16, 50]);
  scene.close(); scene.close();
  assert.ok(!r.cls.has("pick") && r.act.hidden && r.act.innerHTML === "" && r.listeners.size === 0 && r.act.onclick === null); assert.equal(done, 1);
});

test("a scene can close itself from inside its step and no further frame is asked for", () => {
  const r = rig(); let scene, done = 0; scene = r.api.openScene({ html: "", step: () => scene.close(), done: () => done++ });
  r.frame(16); assert.equal(done, 1); assert.equal(r.rafs.length, 0);
});

test("partyCard: members are read when the scene starts; input is ignored for the first 1.5 s, then a press (or click) moves on", () => {
  const r = rig(); let made = 0, done = 0;
  const run = r.api.partyCard({ title: "동료 합류!", members: () => (made++, [{ x: 100, name: "루미", role: "등불지기", c: "#fff", draw: () => {} }]) });
  assert.equal(made, 0); run(() => done++); assert.equal(made, 1);
  r.act.onclick(); assert.equal(done, 0); r.frame(16);
  for (let i = 0; i < 9; i++) r.frame(50); r.act.onclick(); assert.equal(done, 0, "1.5 s not yet"); for (let i = 0; i < 25; i++) r.frame(50);
  r.act.onclick(); assert.equal(done, 1); assert.ok(r.log.some(l => l.startsWith("fillText:동료 합류!")));
});

test("wrap splits a string into rows of n characters", () => {
  const { api } = rig(); assert.deepEqual([...api.wrap("가나다라마", 2)], ["가나", "다라", "마"]);
});
