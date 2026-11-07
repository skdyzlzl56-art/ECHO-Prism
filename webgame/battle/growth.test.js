// Level / bond / stage growth curves. Run: npm test
const test = require("node:test"), assert = require("node:assert"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const { createBattle, GROWTH } = require("./sim.js");
const rd = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const files = ["script.js", ...[1, 2, 3, 4, 5, 6].flatMap(n => [`stage${n}/battles.js`, `stage${n}/story.js`])];
const { BATTLES } = vm.runInNewContext("const BATTLES = {}, ACTS = {}, FX = {}, sweep = () => {}, noise = () => {};\n" + files.map(rd).join("\n") + "\n({ BATTLES });");
const quiet = { hp: 1e6, playerHp: 20, phases: [() => {}], names: [] };
const steps = (b, secs, input = {}) => { const ev = []; for (let t = 0; t < secs; t += 1 / 60) ev.push(...b.step(1 / 60, input)); return ev; };

const hitDmg = lv => {                                                   // damage of one player shot, seen through the real battle
  const b = createBattle(quiet, { lv, rng: () => .5 });
  return steps(b, 3, { fire: true }).find(v => v.type === "enemyHit").dmg;
};

test("a higher level means more HP and stronger shots, without runaway", () => {
  const hp = lv => createBattle(quiet, { lv }).state.maxHp;
  assert.ok(hp(5) > hp(1) && hp(10) > hp(5), "hp rises with level");
  assert.ok(hitDmg(5) > hitDmg(1) && hitDmg(10) > hitDmg(5), "shot damage rises with level");
  assert.ok(hitDmg(10) <= 2 * hitDmg(1), "level 10 stays under double the damage");
  assert.strictEqual(hitDmg(1), 1);
});

test("later stages: tougher enemy HP and bullets", () => {
  const mk = stage => createBattle({ ...quiet, hp: 100, stage }, {}).state.eMax;
  assert.ok(mk(6) > mk(3) && mk(3) > mk(1) && mk(1) === 100);
  const hurt = stage => { const b = createBattle({ ...quiet, stage, phases: [h => h.aim(.1, 300)] }, { rng: () => .5 }); b.state.auto = false; return steps(b, 6).find(v => v.type === "playerHurt").dmg; };
  assert.ok(hurt(6) > hurt(1), "stage 6 bullets hit harder");
});

test("ally output rises with bond level but stays under the player's own DPS", () => {
  const A = GROWTH.ally, dps = A.cd.map((cd, lv) => A.hits[lv] * A.dmg[lv] / cd);
  dps.forEach((d, i) => i && assert.ok(d > dps[i - 1], `bond ${i} stronger than ${i - 1}`));
  assert.ok(dps[4] <= 1 / .12, `bond 4 ally dps ${dps[4]}`);
  assert.ok(dps[4] / dps[0] <= 6, "no more than 6x from bond 0 to 4");
});

test("stages 1-6 stay clearable: kill time and hits-to-die are in range", () => {
  const ids = Object.keys(BATTLES).filter(k => k !== "s2_flee"), A = GROWTH.ally;   // file order = story order; the flee scene is invulnerable
  assert.ok(ids.length >= 14);
  let xp = 0;
  for (const k of ids) {
    const c = BATTLES[k], st = +k[1], lv = 1 + Math.floor(xp / 100), bond = c.ally ? Math.min(4, st - 1) : 0;
    assert.strictEqual(c.stage, st, `${k} has stage`);
    const dps = (GROWTH.shotDmg(lv) / .12 + (c.ally ? A.hits[bond] * A.dmg[bond] / A.cd[bond] : 0)) * .5;   // half the shots land
    const secs = c.hp * GROWTH.stage.hp[st - 1] / dps, hits = ((c.playerHp || 20) + GROWTH.playerHp(lv)) / Math.round(4 * GROWTH.stage.atk[st - 1]);
    assert.ok(secs >= 15 && secs <= 150, `${k} kill time ${secs.toFixed(0)}s at Lv.${lv}`);
    assert.ok(hits >= 4, `${k} survives ${hits} hits`);
    xp += 20 * (c.cuts || [.75, .5, .25]).length;
  }
});
