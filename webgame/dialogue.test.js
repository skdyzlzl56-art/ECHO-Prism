const test = require("node:test"), assert = require("node:assert");
const { createTyper, talkRate, KEYS } = require("./dialogue.js");

test("holding X types much faster and never advances the line", () => {
  assert.ok(talkRate(true) >= 3 * talkRate(false));
  const t = createTyper(); t.add(1, true, 100); assert.ok(t.pos >= 3 && t.pos <= 100);
});
test("press: first finishes typing, second asks for the next line", () => {
  const t = createTyper(); t.add(2, false, 10);
  assert.strictEqual(t.press(10), false); assert.strictEqual(t.pos, 10);
  assert.strictEqual(t.press(10), true);
});
test("holding Ctrl finishes then advances, one step per 90ms", () => {
  const t = createTyper(); t.add(1, false, 10);
  assert.strictEqual(t.hold(.05, 10), false, "too soon");
  assert.strictEqual(t.hold(.05, 10), false); assert.strictEqual(t.pos, 10, "finished the line");
  assert.strictEqual(t.hold(.1, 10), true, "next line");
});
test("key definitions", () => {
  assert.deepStrictEqual(KEYS.advance, ["Space", "Enter", "KeyZ"]); assert.strictEqual(KEYS.fast, "KeyX"); assert.strictEqual(KEYS.skip, "Control");
});
