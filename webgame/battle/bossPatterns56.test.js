// Ticket 15: stage 5-6 bosses have barrages of their own (shelf, hush); the final fight's hush is used by no earlier boss. Run: npm test
const test = require("node:test"), assert = require("node:assert"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const { createBattle } = require("./sim.js");
const rd = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const B = vm.runInNewContext("const BATTLES = {}, ACTS = {}, SPEAKERS = {}, runBattle = () => {};\n" + [1, 2, 3, 4, 5, 6].map(i => rd(`stage${i}/battles.js`)).join("\n") + "\nBATTLES;");

const solo = fn => ({ hp: 1000, playerHp: 1000, phases: [fn], names: ["x"], color: "#ffb347", cuts: [] });
const spawn = (fn, secs) => { const b = createBattle(solo(fn), { rng: () => .3 }); b.state.auto = false; for (let t = 0; t < secs; t += 1 / 60) { b.state.hp = b.state.maxHp; b.step(1 / 60, {}); } return b.state; };
const used = (id, name) => B[id].phases.some(p => p.toString().includes("h." + name + "("));

test("shelf: pages slide in from the sides, stop mid-box, then rush on", () => {
  const s = spawn(h => h.shelf(.5), 1.8);
  assert.ok(s.bullets.length >= 3 && s.bullets.every(b => b.stall), "stalling bullets");
});

test("hush: slow bullets close in from every edge of the box", () => {
  const s = spawn(h => h.hush(.5, 16), 1.8);
  const cx = s.BOX.x + s.BOX.w / 2;
  assert.ok(s.bullets.length >= 16 && s.bullets.some(b => b.x < cx) && s.bullets.some(b => b.x > cx));
});

test("사서 uses no book-themed shelf bullets (gravity chapter); 침묵 uses hush in the finale only, and no earlier boss uses it", () => {
  assert.ok(!used("s5_librarian", "shelf"));
  assert.ok(B.s6_silence.phases[4].toString().includes("h.hush("));
  for (const id of Object.keys(B)) if (id !== "s6_silence") assert.ok(!used(id, "hush"), id);
});
