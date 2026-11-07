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

  // Canvas talk box: `text` wrapped to maxW px (measure(str) -> px width, so any font fits), with only the first `pos` characters revealed.
  // Rows keep their place while typing (not-yet-typed rows come back as ""), so the box never jumps. Breaks at the last space when there is one, else anywhere.
  function talkRows(measure, text, maxW, pos) {
    const rows = []; let row = "", lastSp = -1;
    for (const ch of text) {
      if (measure(row + ch) > maxW && row) {
        if (lastSp > 0) { rows.push(row.slice(0, lastSp + 1)); row = row.slice(lastSp + 1) + ch; } else { rows.push(row); row = ch; }
        lastSp = -1;
      } else row += ch;
      if (ch === " ") lastSp = row.length - 1;
    }
    rows.push(row);
    let shown = pos | 0;
    return rows.map(r => { const out = r.slice(0, Math.max(0, shown)); shown -= r.length; return out; });
  }

  // The whole in-battle talk box: typing, press-to-advance, skip-hold and what to draw. The sim owns the lines (talk() -> {lines, i} | null, advance() -> next line,
  // closes after the last); text(line) -> the string shown (key names filled in). press() / tick() return true when the box just closed.
  function createTalkBox({ talk, advance, text }) {
    const typer = createTyper(), line = () => { const t = talk(); return t && t.lines[t.i]; };
    const next = () => { advance(); typer.reset(); return !talk(); };
    return {
      reset: typer.reset,
      press() { const L = line(); return L && typer.press(text(L).length) ? next() : false; },          // first press finishes the typing, the next goes on
      tick(dt, fast, skip) { const L = line(); if (!L) return false; const len = text(L).length; typer.add(dt * 25, fast, len); return skip && typer.hold(dt, len) ? next() : false; },
      view(measure, maxW) { const L = line(); if (!L) return null; const t = text(L); return { who: L.who, rows: talkRows(measure, t, maxW, typer.pos), done: typer.pos >= t.length }; },
    };
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { KEYS, talkRate, createTyper, talkRows, createTalkBox };
  else { root.KEYS = KEYS; root.talkRate = talkRate; root.createTyper = createTyper; root.talkRows = talkRows; root.createTalkBox = createTalkBox; }
})(typeof window !== "undefined" ? window : globalThis);
