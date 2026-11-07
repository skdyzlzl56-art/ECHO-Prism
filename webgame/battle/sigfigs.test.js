const test = require("node:test"), assert = require("node:assert");
const { fmtNum } = require("./sim.js");

test("fmtNum shows 3 significant figures, no float noise", () => {
  assert.strictEqual(fmtNum(3.5999999), "3.6");
  assert.strictEqual(fmtNum(0.1 + 0.2), "0.3");
  assert.strictEqual(fmtNum(12.3456), "12.3");
  assert.strictEqual(fmtNum(320), "320");
  assert.strictEqual(fmtNum(1234.5), "1235");
  assert.strictEqual(fmtNum(-0.0000001), "0");
});
