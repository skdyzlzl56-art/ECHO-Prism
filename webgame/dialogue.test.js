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

test("createTalkBox: press finishes typing then advances; closing is reported; skip-hold walks the lines", () => {
  const { createTalkBox } = require("./dialogue.js");
  const mk = () => { const st = { lines: [{ who: "a", t: "hello" }, { who: "b", t: "bye" }], i: 0 }; let talk = st;
    const box = createTalkBox({ talk: () => talk, advance: () => { if (++st.i >= st.lines.length) talk = null; }, text: L => L.t.toUpperCase() });
    return { box, st, open: () => !!talk }; };
  const m = mk(); m.box.tick(.04, false, false);                                 // 1 char typed
  assert.equal(m.box.view(s => s.length, 99).rows[0], "H"); assert.equal(m.box.view(s => s.length, 99).done, false);
  assert.equal(m.box.press(), false); assert.equal(m.box.view(s => s.length, 99).done, true);   // first press: whole line
  assert.equal(m.box.press(), false); assert.equal(m.st.i, 1); assert.equal(m.box.view(s => s.length, 99).who, "b");
  assert.equal(m.box.view(s => s.length, 99).rows[0], "", "typing restarts on the new line");
  m.box.press(); assert.equal(m.box.press(), true); assert.equal(m.open(), false);   // last line done: closed
  assert.equal(m.box.view(s => s.length, 99), null); assert.equal(m.box.tick(1, false, true), false);
  const k = mk(); let closed = false; for (let i = 0; i < 80 && !closed; i++) closed = k.box.tick(.1, false, true);   // holding skip eventually closes it
  assert.ok(closed);
});
