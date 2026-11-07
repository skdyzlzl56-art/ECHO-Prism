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

test("talkRows: wraps by measured width, keeps every character, reveals by pos", () => {
  const { talkRows } = require("./dialogue.js"), w = s => s.length * 10;      // fake font: 10px per char
  const all = talkRows(w, "aaaa bbbb cccc", 100, 999);
  assert.deepEqual(all, ["aaaa bbbb ", "cccc"]);                                // breaks at the last space
  assert.equal(talkRows(w, "abcdefghijkl", 50, 999).join(""), "abcdefghijkl");   // no space: break anywhere, nothing lost
  assert.ok(talkRows(w, "x".repeat(40), 100, 999).every(r => w(r) <= 100));
  assert.deepEqual(talkRows(w, "aaaa bbbb cccc", 100, 12), ["aaaa bbbb ", "cc"]);       // typewriter position spans rows
  assert.deepEqual(talkRows(w, "aaaa bbbb cccc", 100, 3), ["aaa", ""]);                 // later rows stay in place, empty
});
