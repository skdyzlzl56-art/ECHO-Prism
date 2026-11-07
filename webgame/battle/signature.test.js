// Ally signature abilities (ticket 08): each companion has a different special move on its own cooldown (s.cool[id].sig); power rises with the bond.
const test = require("node:test"), assert = require("node:assert");
const { createBattle } = require("./sim.js");
const run = (b, secs, dt = 1 / 60) => { const ev = []; for (let t = 0; t < secs; t += dt) ev.push(...b.step(dt, {})); return ev; };
const quiet = { hp: 1e6, playerHp: 1e6, phases: [() => {}], names: [] };
const mute = { cd: 99, dm: 1, heal: 0, shield: 0 };
const PARTY = { ally: "lumi", allies: ["lumi", "hexa", "glitch", "keeper"], kits: { lumi: mute, hexa: mute, glitch: mute, keeper: mute } };
const mk = (ally, bond = 1) => { const b = createBattle({ ...quiet, ...PARTY }, { rng: () => .5, bondBase: bond }); run(b, 1.1); while (b.state.allyId !== ally) { run(b, 1.6); b.swap(); } return b; };
const bullet = (s, x, y) => s.bullets.push({ x, y, vx: 0, vy: 0, r: 5, age: 1, col: "#fff", dmg: 4, tr: [] });
const sigOf = (id, bond) => { const b = mk(id, bond), s = b.state; s.cool[id].sig = 0; bullet(s, s.p.x + 10, s.p.y - 150); const e = b.step(.016, {}).find(x => x.type === "signature"); return { b, s, e }; };

test("keeper signature clears bullets", () => {
  const { s, e } = sigOf("keeper", 1);
  assert.ok(e && e.ally === "keeper"); assert.equal(s.bullets.length, 0);
});
test("other allies do not clear bullets, and each signature is a different move", () => {
  const kinds = new Set();
  for (const id of ["lumi", "hexa", "glitch", "keeper"]) { const { e } = sigOf(id, 1); assert.ok(e, id); kinds.add(e.kind); }
  assert.equal(kinds.size, 4);
  assert.equal(sigOf("lumi", 1).s.bullets.length, 1);
  assert.equal(sigOf("hexa", 1).s.bullets.length, 1);
});
test("signature goes on cooldown shown in s.cool and fires again when it ends", () => {
  const { b, s } = sigOf("keeper", 1);
  assert.ok(s.cool.keeper.sig > 5);
  assert.equal(run(b, 2).filter(x => x.type === "signature").length, 0);
  s.cool.keeper.sig = 0; assert.equal(run(b, .1).filter(x => x.type === "signature").length, 1);
});
test("an ally off the field does not fire its signature", () => {
  const b = mk("lumi", 1); b.state.cool.keeper.sig = 0;
  assert.equal(run(b, .1).filter(x => x.type === "signature" && x.ally === "keeper").length, 0);
});
test("signature power and cooldown improve with bond", () => {
  for (const id of ["lumi", "hexa", "glitch", "keeper"]) {
    const lo = sigOf(id, 0), hi = sigOf(id, 4);
    assert.ok(hi.e.power > lo.e.power, `${id} power ${lo.e.power} -> ${hi.e.power}`);
    assert.ok(hi.s.cool[id].sig < lo.s.cool[id].sig, `${id} cooldown`);
  }
});
test("keeper clears further at higher bond", () => {
  const far = bond => { const b = mk("keeper", bond), s = b.state; s.cool.keeper.sig = 0; bullet(s, s.p.x - 145, s.p.y); b.step(.016, {}); return s.bullets.length; };
  assert.equal(far(0), 1); assert.equal(far(4), 0);
});
test("hexa blast hurts the enemy", () => {
  const b = mk("hexa", 1), s = b.state; s.cool.hexa.sig = 0; const hp = s.eHp; run(b, .05);
  assert.ok(s.eHp < hp);
});
