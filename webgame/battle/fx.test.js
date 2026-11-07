// battle/fx.js through its interface only: sim events in, cues and drawable state out; fake hitFeel / colours, fixed random. Run: npm test
const test = require("node:test"), assert = require("node:assert");
const { createBattleFx } = require("./fx.js");

const S = { maxHp: 100, p: { x: 10, y: 20 }, e: { x: 300, y: 50 }, al: { x: 40, y: 60 } };
const rig = (opts = {}) => createBattleFx({ hitFeel: d => ({ tier: d > 10 ? 2 : 0, stop: .05, vignette: .8, shakeAmp: 6, shakeMs: 200 }), fmtNum: String, allyCol: () => "#7f7", ally: id => ({ name: id.toUpperCase() }), rand: () => .5, ...opts });

test("a hit on the enemy: number, round burst, 5 sparks, white flash and a portrait kick", () => {
  const fx = rig(), cues = fx.event({ type: "enemyHit", x: 300, y: 50, dmg: 7, ally: true }, S);
  assert.deepEqual(cues, [{ type: "kick" }]);
  assert.deepEqual([fx.floats[0].txt, fx.floats[0].col], ["-7", "#7f7"]);   // an ally's shot is numbered in the ally's colour
  assert.equal(fx.particles.length, 6); assert.equal(fx.particles.filter(p => p.sp).length, 5); assert.equal(fx.hitFlash, .08);
  fx.event({ type: "enemyHit", x: 0, y: 0, dmg: 0 }, S); assert.deepEqual([fx.floats[1].txt, fx.floats[1].col], ["0", "#8fa3b5"]);   // can't be hurt: grey zero
});

test("a hit on the player scales with the damage: shake cue, hit-stop, vignette, more sparks at a higher tier", () => {
  const weak = rig(), strong = rig(), tierOf = d => d > 10 ? 2 : 0;
  const c = weak.event({ type: "playerHurt", dmg: 1 }, S); strong.event({ type: "playerHurt", dmg: 50 }, S);
  assert.deepEqual(c, [{ type: "shake", ms: 200, amp: 6 }]); assert.equal(weak.vignette, .8);
  assert.equal(weak.floats[0].txt, "-1"); assert.equal(tierOf(50), 2);
  assert.equal(weak.frozen(.03), true); assert.equal(weak.frozen(.03), true); assert.equal(weak.frozen(.03), false);   // .05 s of hit-stop, then the world goes on
});

test("a harder hit makes more sparks (3 + 4 per tier)", () => {
  const hf = d => ({ tier: d > 10 ? 2 : 0, stop: 0, vignette: 0, shakeAmp: 1, shakeMs: 1 }), a = rig({ hitFeel: hf }), b = rig({ hitFeel: hf });
  a.event({ type: "playerHurt", dmg: 1 }, S); b.event({ type: "playerHurt", dmg: 50 }, S);
  assert.deepEqual([a.particles.length, b.particles.length], [3, 11]);
});

test("bond events raise banners; a burst flashes and sweeps a ring; the swap banner names the new companion", () => {
  const fx = rig();
  assert.deepEqual(fx.event({ type: "burst", dmg: 0 }, S), [{ type: "flash", ms: 600 }]); assert.equal(fx.burst, 1); assert.equal(fx.banner.txt, "유대의 빛!");
  fx.event({ type: "burst", dmg: 5, up: true, level: 3 }, S); assert.match(fx.banner.txt, /Lv\.3/);
  fx.event({ type: "jointLight" }, S); assert.equal(fx.burst, 1.6);
  fx.event({ type: "swap", ally: "hexa" }, S); assert.equal(fx.banner.txt, "교대: HEXA");
  fx.event({ type: "signature", kind: "mend" }, S); assert.equal(fx.banner.txt, "치유");
});

test("a phase shows its name; a phase change (not the first) flashes and shakes the stage", () => {
  const fx = rig();
  assert.deepEqual(fx.event({ type: "phase", name: "벽", level: 0, start: true }, S), []); assert.deepEqual([fx.banner.txt, fx.banner.bond], ["벽", undefined]);
  assert.deepEqual(fx.event({ type: "phase", level: 1, start: false }, S), [{ type: "flash", ms: 600 }, { type: "shake", ms: 500, amp: undefined }]);
});

test("things age out: sparks and the round burst after .35 s, floats after .6 s, the banner after 3 s; the burst ring and vignette fade", () => {
  const fx = rig(); fx.event({ type: "enemyHit", x: 0, y: 0, dmg: 1 }, S); fx.event({ type: "burst", dmg: 1 }, S); fx.event({ type: "playerHurt", dmg: 1 }, S);
  fx.step(.4); assert.equal(fx.particles.length, 0); assert.equal(fx.floats.length, 4);
  fx.step(.3); assert.equal(fx.floats.length, 0); assert.equal(fx.burst, 0); assert.equal(fx.vignette, 0);
  assert.ok(fx.banner); fx.step(2.5); assert.equal(fx.banner, null);
});

test("sparks fly: they move by their velocity while they live", () => {
  const fx = rig({ rand: () => 0 }); fx.event({ type: "break", x: 5, y: 5 }, S);   // rand 0: angle 0, speed 80 -> straight right
  fx.step(.1); assert.ok(Math.abs(fx.particles[0].x - 13) < 1e-9); assert.equal(fx.particles[0].y, 5);
});
