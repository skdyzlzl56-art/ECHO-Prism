// explore-rules.js through its interface only: a small map, key maps in, events and state out. Run: npm test
const test = require("node:test"), assert = require("node:assert");
const { createExplore } = require("./explore-rules.js");

const view = { floorY: 190, floorH: 210 };
const cfg = (o = {}) => ({
  worldW: 1000, bond: 1, label: "등불",
  spots: [{ x: 400, y: 300, mem: "첫 기억" }], door: { x: 900, y: 300 },
  talks: [{ x: 200, who: "lumi", text: "저기야" }], allLit: [{ who: null, text: "문이 열렸다" }],
  revive: { who: "voice", text: "괜찮아요?" }, hurtLine: { who: "lumi", text: "조심해!" }, ...o,
});
const rig = (o, rand = () => 0) => createExplore(cfg(o), { view, rand });
const types = ev => ev.map(e => e.type);
const lightSpot = ex => { ex.p.x = ex.spots[0].x; ex.p.y = ex.spots[0].y; let ev = []; for (let i = 0; i < 20; i++) ev = ev.concat(ex.step(.1, {})); return ev; };
const said = ex => [ex.line, ...ex.q].filter(Boolean).map(l => l.text);

test("arrow keys and WASD move the player at 200 px/s, diagonals no faster; the floor stops it", () => {
  const ex = rig(); const x0 = ex.p.x; ex.step(.5, { ArrowRight: true }); assert.equal(ex.p.x - x0, 100);
  const y0 = ex.p.y; ex.step(.5, { KeyD: true, KeyS: true }); assert.ok(Math.abs(Math.hypot(ex.p.x - x0 - 100, ex.p.y - y0) - 100) < 1e-9);
  for (let i = 0; i < 20; i++) ex.step(.5, { ArrowLeft: true, KeyW: true }); assert.equal(ex.p.x, ex.FL.x + 14); assert.equal(ex.p.y, ex.FL.y + 14);
});

test("passing a talk point queues its line once; a press moves on only after the line has shown for half a second", () => {
  const ex = rig(); ex.p.x = 210; ex.step(.01, {}); assert.equal(ex.line.text, "저기야");
  ex.nextLine(); assert.ok(ex.line, "too early"); ex.step(.6, {}); ex.nextLine(); assert.equal(ex.line, null);
  ex.step(.01, {}); assert.equal(ex.line, null, "the talk point does not fire twice");
});

test("standing at a spot for 1.3 s lights it: sound event, a memory line, the spot becomes a checkpoint; the last one opens the door", () => {
  const ex = rig(), ev = lightSpot(ex), all = [];
  assert.deepEqual(ev.filter(e => e.type === "lit"), [{ type: "lit", i: 0 }]); assert.ok(ex.spots[0].lit > 0); assert.ok(ex.open);
  for (let i = 0; i < 12; i++) { all.push(...said(ex)); ex.step(1, {}); }
  assert.ok(all.includes("첫 기억") && all.includes("문이 열렸다"));
});

test("walking through the open door ends the scene after .8 s, once; a scene without a door ends 6.5 s after the last lamp", () => {
  const ex = rig(); lightSpot(ex); ex.p.x = ex.door.x; ex.p.y = ex.door.y;
  assert.deepEqual(ex.step(.01, {}).filter(e => e.type === "leave"), [{ type: "leave", delay: 800, door: true }]); assert.deepEqual(ex.step(.01, {}).filter(e => e.type === "leave"), []);
  const nd = rig({ door: null }); assert.deepEqual(lightSpot(nd).filter(e => e.type === "leave"), [{ type: "leave", delay: 6500, door: false }]);
});

test("the closed door says how many lamps are left, at most once every 3 s", () => {
  const ex = rig(); ex.p.x = ex.door.x; ex.p.y = ex.door.y;
  assert.deepEqual(types(ex.step(.01, {})).filter(t => t === "doorLocked"), ["doorLocked"]); assert.ok(said(ex).includes("아직 1곳이 남아 있다."));
  assert.deepEqual(types(ex.step(1, {})).filter(t => t === "doorLocked"), []); assert.deepEqual(types(ex.step(2.5, {})).filter(t => t === "doorLocked"), ["doorLocked"]);
});

test("a crack hurts: -1 HP, knockback, 1.3 s of safety; the 3rd hit speaks up; at 0 you are back at the last lamp with full HP", () => {
  const ex = rig({ wisps: { n: 1, color: "#f00" } }), w = ex.wisps[0], touch = () => { ex.p.x = w.x; ex.p.y = w.y; return ex.step(0, {}); };
  assert.deepEqual(types(touch()), ["hurt"]); assert.equal(ex.hp, 4); assert.ok(ex.inv > 1);
  assert.deepEqual(types(touch()), [], "safe while blinking"); ex.step(1.4, {});
  touch(); assert.equal(ex.hp, 3); ex.step(1.4, {}); touch(); assert.equal(ex.hp, 2); assert.ok(said(ex).includes("조심해!")); ex.step(1.4, {});
  touch(); ex.step(1.4, {}); touch();
  assert.equal(ex.hp, ex.MAXHP); assert.equal(ex.p.x, 90); assert.equal(ex.line.text, "괜찮아요?");   // nothing lit yet: back at the start
});

test("lightning: a warning, then 1 s later the strike; standing in it hurts", () => {
  const ex = rig({ beams: true, door: null }); ex.p.x = 500; const seen = [];
  for (let i = 0; i < 90; i++) seen.push(...types(ex.step(.05, {})).map(t => t + "@" + i));   // frames of 50 ms
  const at = n => +seen.find(e => e.startsWith(n))?.split("@")[1];
  assert.ok(at("beamWarn") > 0); assert.ok(at("beamBoom") - at("beamWarn") >= 19 && at("beamBoom") - at("beamWarn") <= 21, "the strike comes 1 s after the warning");
  assert.ok(seen.some(e => e.startsWith("hurt")), "standing in the strike hurts");
});

test("a hit scatters the charge you were gathering", () => {
  const ex = rig({ wisps: { n: 1, color: "#f00" }, door: null }); ex.p.x = ex.spots[0].x; ex.p.y = ex.spots[0].y; ex.step(.65, {}); assert.ok(ex.spots[0].ch > .4);
  ex.p.x = ex.wisps[0].x; ex.p.y = ex.wisps[0].y; ex.step(0, {}); assert.equal(ex.spots[0].ch, 0);
});
