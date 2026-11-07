// Dialogue input rules shared by story scenes (index.html) and in-battle talk (battle.js).
// Ticket 07 (key remapping): change KEYS here, nothing else.
(function (root) {
  const KEYS = { advance: ["Space", "Enter", "KeyZ"], fast: "KeyX", skip: "Control" };   // advance/fast: event.code; skip: event.key
  const talkRate = fast => fast ? 5 : 1;   // typing speed multiplier while the fast key is held
  const HOLD_STEP = .09;                   // seconds between steps while the skip key is held

  // pos = characters shown. All timing/advance rules live here.
  function createTyper() {
    const t = {
      pos: 0, acc: 0,
      reset() { t.pos = 0; t.acc = 0; },
      add(chars, fast, len) { t.pos = Math.min(len, t.pos + chars * talkRate(fast)); },
      press(len) { if (t.pos < len) { t.pos = len; return false; } return true; },   // true = go to the next line
      hold(dt, len) { t.acc += dt; if (t.acc < HOLD_STEP) return false; t.acc = 0; return t.press(len); },
    };
    return t;
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { KEYS, talkRate, createTyper };
  else { root.KEYS = KEYS; root.talkRate = talkRate; root.createTyper = createTyper; }
})(typeof window !== "undefined" ? window : globalThis);
