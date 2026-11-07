// battle/sound.js through its interface only: recording adapters for sweep / noise / bus, an injected clock and timer.
const test = require("node:test"), assert = require("node:assert");
const { createBattleSound } = require("./sound.js");

function rig(opts = {}) {
  const log = [], t = { now: 1000 }, timers = [];
  const snd = createBattleSound({
    sweep: (f0, f1, d, type, vol) => log.push({ k: "sweep", f0, type, vol }), noise: (d, vol) => log.push({ k: "noise", vol }),
    bus: opts.bus && (n => log.push({ k: "bus", n })), now: () => t.now, later: (f, ms) => timers.push({ f, ms }), rand: () => 0, ...opts.cfg,
  });
  return { snd, log, t, timers, sounds: () => log.filter(x => x.k !== "bus") };
}
const shot = (size = 6, speed = 150) => ({ type: "enemyShot", size, speed });

test("30 shots in one frame make ONE heavy thud, not 30 sounds", () => {
  const r = rig(); for (let i = 0; i < 30; i++) r.snd.event(shot()); assert.equal(r.sounds().length, 0);   // counted, not played
  r.snd.flush(); const n = r.sounds().length; assert.ok(n > 0 && n < 8);
  r.snd.flush(); assert.equal(r.sounds().length, n, "flush empties the count");
});

test("big thuds throttle: a second ring 100 ms later is silent, 300 ms later it sounds", () => {
  const r = rig(); const ring = () => { for (let i = 0; i < 8; i++) r.snd.event(shot()); r.snd.flush(); };
  ring(); const a = r.sounds().length; r.t.now = 1100; ring(); assert.equal(r.sounds().length, a);
  r.t.now = 1300; ring(); assert.ok(r.sounds().length > a);
});

test("a heavy orb winds up, then booms 150 ms later", () => {
  const r = rig(); r.snd.event(shot(14, 300)); r.snd.flush();
  assert.equal(r.timers.length, 1); assert.equal(r.timers[0].ms, 150);
  const before = r.sounds().length; r.timers[0].f(); assert.ok(r.sounds().length > before);
});

test("the 'ting' of an unhurtable enemy is throttled to one per 80 ms", () => {
  const r = rig(), hit = { type: "enemyHit", dmg: 0 };
  r.snd.event(hit); const a = r.sounds().length; r.t.now = 1050; r.snd.event(hit); assert.equal(r.sounds().length, a);
  r.t.now = 1100; r.snd.event(hit); assert.equal(r.sounds().length, a * 2);
});

test("fade: every phase swallows more enemy-shot volume, floor .15", () => {
  const r = rig({ cfg: { fade: .2 } }); assert.equal(r.snd.quiet, 1);
  r.snd.event({ type: "phase", level: 2, start: true }); assert.ok(Math.abs(r.snd.quiet - .6) < 1e-9);
  r.snd.event({ type: "phase", level: 9, start: false }); assert.equal(r.snd.quiet, .15);
  const q = r.snd.quiet; r.log.length = 0; r.snd.event({ type: "split" }); assert.ok(r.log.every(x => x.vol <= .45 * q + 1e-9));
});

test("silent fights: enemy attack sounds ride the shot bus and the sfx bus is restored; other sounds do not touch it", () => {
  const r = rig({ bus: true }); r.snd.event({ type: "laserFire" });
  assert.deepEqual(r.log.filter(x => x.k === "bus").map(x => x.n), ["shot", "sfx"]);
  r.log.length = 0; r.snd.event({ type: "dash" }); assert.ok(!r.log.some(x => x.k === "bus"));
  r.snd.event(shot()); r.snd.event(shot()); r.log.length = 0; r.snd.flush(); assert.deepEqual(r.log.filter(x => x.k === "bus").map(x => x.n), ["shot", "sfx"]);
});

test("a hit on the player is louder at a higher tier", () => {
  const r = rig({ cfg: { hurtTier: d => d > 10 ? 2 : 0 } });
  r.snd.event({ type: "playerHurt", dmg: 1 }); const weak = r.sounds().length;
  r.log.length = 0; r.snd.event({ type: "playerHurt", dmg: 20 }); assert.ok(r.sounds().length > weak);
});

test("heartbeat beats every .7 s only in cfg.beat battles while it is on", () => {
  const off = rig(); off.snd.heartbeat(1, true); assert.equal(off.sounds().length, 0);
  const r = rig({ cfg: { beat: true } }); r.snd.heartbeat(.1, true); assert.equal(r.sounds().length, 1);
  r.snd.heartbeat(.3, true); assert.equal(r.sounds().length, 1); r.snd.heartbeat(.5, true); assert.equal(r.sounds().length, 2);
  r.snd.heartbeat(5, false); assert.equal(r.sounds().length, 2);
});
