// Damage-scaled hit feedback: damage fraction -> tier and strengths (pure). Run: npm test
const test = require("node:test"), assert = require("node:assert");
const { hitFeel, isLowHp } = require("./sim.js");

test("tiers step up with the fraction of max hp lost", () => {
  assert.deepEqual([hitFeel(1, 100).tier, hitFeel(10, 100).tier, hitFeel(30, 100).tier], [0, 1, 2]);
});

test("bigger hits shake and freeze longer and harder, and redden more", () => {
  const a = hitFeel(2, 100), b = hitFeel(15, 100), c = hitFeel(40, 100);
  for (const k of ["shakeMs", "shakeAmp", "stop", "vignette"]) assert.ok(a[k] < b[k] && b[k] < c[k], k);
});

test("strength stays bounded for absurd damage or zero max hp", () => {
  const h = hitFeel(9999, 1), z = hitFeel(5, 0);
  assert.equal(h.tier, 2); assert.ok(h.stop <= .2 && h.vignette <= 1);
  assert.equal(z.tier, 2);
});

test("low hp warning at a quarter of max hp or less", () => {
  assert.ok(isLowHp(25, 100)); assert.ok(!isLowHp(26, 100)); assert.ok(!isLowHp(0, 100));
});
