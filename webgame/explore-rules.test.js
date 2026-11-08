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

test("dash: a .18 s burst at 700 px/s in the held direction (the last one if none), then a .9 s cooldown", () => {
  const ex = rig(); ex.step(.1, { ArrowRight: true }); const x0 = ex.p.x;
  assert.equal(ex.dash({ ArrowDown: true }), true); assert.ok(ex.dashing); ex.step(.1, {});
  assert.ok(Math.abs(ex.p.y - ex.FL.y - ex.FL.h / 2 - 70) < 1e-9 || ex.p.y > ex.FL.y + ex.FL.h / 2, "dashed down"); assert.equal(ex.p.x, x0);
  assert.equal(ex.dash({}), false, "already dashing"); ex.step(.1, {}); assert.ok(!ex.dashing); assert.equal(ex.dash({}), false, "cooling down"); assert.ok(ex.dashReady < 1);
  ex.step(1, {}); assert.equal(ex.dashReady, 1); const x1 = ex.p.x; assert.equal(ex.dash({}), true); ex.step(.1, {}); assert.ok(ex.p.x - x1 > 60, "no keys held: dashes the way it last faced");
});

test("nothing can hurt you during a dash", () => {
  const ex = rig({ wisps: { n: 1, color: "#f00", speed: .001 } }), w = ex.wisps[0];
  ex.p.x = w.x - 35; ex.p.y = w.y; ex.dash({ ArrowRight: true });
  assert.deepEqual(types(ex.step(.05, {})), []); assert.equal(ex.hp, ex.MAXHP);   // the burst carries you through the crack
  assert.deepEqual(types(ex.step(.2, {})), ["hurt"], "once it is over, the crack you stopped in hurts");
});

test("barrage: a fan of shots appears ahead and flies at you; standing still gets you hit, a dash passes through", () => {
  const b = { every: 1.7, n: 5, speed: 100 };
  const ex = rig({ barrage: b, door: null }, () => .5); ex.p.x = 500; const seen = [];
  ex.step(2.1, {}); assert.ok(ex.bullets.length >= 3 && ex.bullets.length <= 5); assert.ok(ex.bullets.every(s => s.vx < 0), "they fly toward you");
  for (let i = 0; i < 160; i++) seen.push(...types(ex.step(.05, {})));
  assert.ok(seen.includes("barrage")); assert.ok(seen.includes("hurt"), "stood still, got hit");
  const ex2 = rig({ door: null }); ex2.bullets.push({ x: ex2.p.x, y: ex2.p.y, vx: 0, vy: 0, age: 0, r: 7 });
  const quick = rig({ barrage: b, door: null }); quick.bullets.push({ x: quick.p.x, y: quick.p.y, vx: 0, vy: 0, age: 0, r: 7 });
  quick.dash({ ArrowDown: true }); assert.deepEqual(types(quick.step(.02, {})), [], "inside the dash nothing lands");
});

test("after a fall you go on from the last lamp, and the talk points after it are heard again", () => {
  const talks = [{ x: 200, who: "lumi", text: "처음 말" }, { x: 700, who: "voice", text: "나중 말" }];
  const ex = rig({ talks, spots: [{ x: 400, y: 300, mem: "첫 기억" }, { x: 950, y: 300, mem: "둘째 기억" }], wisps: { n: 1, color: "#f00", speed: .001 }, door: null }), w = ex.wisps[0];   // a second lamp stays dark, so the scene goes on
  ex.p.x = 210; ex.step(.01, {}); lightSpot(ex); ex.p.x = 710; ex.step(.01, {});   // heard 200, lit the lamp at 400, heard 700
  const touch = () => { ex.p.x = w.x; ex.p.y = w.y; return ex.step(0, {}); };
  for (let i = 0; i < 10 && ex.p.x !== 330; i++) { touch(); ex.step(.05, {}); ex.step(1.4, {}); }   // stand in the crack until you fall
  assert.equal(ex.hp, ex.MAXHP); assert.equal(ex.p.x, 330, "back at the lamp, not at the start");
  assert.deepEqual(said(ex), ["괜찮아요?"]);
  ex.p.x = 710; ex.step(.01, {}); assert.ok(said(ex).includes("나중 말"), "the later talk point is heard again");
  ex.p.x = 330; ex.step(1.4, {}); assert.ok(!said(ex).includes("처음 말"), "the one before the lamp is not");
});

test("only the dot at the centre is hit: grazing a crack's edge is safe, touching it with the dot is not", () => {
  const ex = rig({ wisps: { n: 1, color: "#f00", speed: .001 } }), w = ex.wisps[0];
  ex.p.x = w.x + w.r + 6; ex.p.y = w.y; assert.deepEqual(types(ex.step(0, {})), [], "the body overlaps, the dot does not");   // the old 9 px body radius would have been hurt here
  ex.p.x = w.x + w.r + 2; assert.deepEqual(types(ex.step(0, {})), ["hurt"]);
  const big = createExplore(cfg({ wisps: { n: 1, color: "#f00", speed: .001 } }), { view, rand: () => 0, hitbox: 10 }), v = big.wisps[0];
  big.p.x = v.x + v.r + 6; big.p.y = v.y; assert.deepEqual(types(big.step(0, {})), ["hurt"], "the dot size is a parameter");
});
