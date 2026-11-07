// The story's line-by-line player: which line is showing, typing it out, press-to-advance, hold-to-skip, scenes (acts) and the saved point.
// Everything it draws goes through the stage adapter, so the rules run (and are tested) without a DOM.
//
//   const player = createLinePlayer({ script, speakers, acts, stage, audio, text, replay, paused, ready, clock });
//   player.advance()          a press: finishes the typing, or goes to the next line. Ignored while paused, an effect or a scene plays.
//   player.restore(save)      a loaded save: shows the saved line fully typed (or just sets the position before a scene). -> { bgm, direct }
//   player.fast / player.skip held-key flags (hold fast: type faster, hold skip: fast-forward lines)
//   player.idx / busy / acting / typing   read-only state ("typing": the current line is still being typed)
//
// stage (adapter): header(speaker) name + colour + portrait · text(str) · next(visible) · fx(name) -> ms to wait, 0 if no such effect · spoke(speaker) blip + pulse
//                  theme(name) · end() "TO BE CONTINUED" · restore({renames, forms, theme}) · skipTitle()
// audio: bgm.play / bgm.stop. text(line) -> the string shown (key names filled in).
// replayState(script, n) -> { renames, forms, theme, bgm }: what lines 0..n-1 left behind (a save stores only the line number).
// paused() -> true while the menu is open; ready() -> false until the title is dismissed and audio is unlocked (skip does nothing before).
// clock: { after(f, ms), every(f, ms) -> id, clear(id) }: setTimeout / setInterval in the game, a manual clock in tests.
(function (root) {
  const CHAR_MS = 45, SKIP_MS = 90;
  const { createTyper } = typeof require === "function" ? require("./dialogue.js") : root;
  const realClock = { after: (f, ms) => setTimeout(f, ms), every: (f, ms) => setInterval(f, ms), clear: id => clearInterval(id) };

  // What a line changes besides its text. The one place the line schema is read: live play (below) and replayState both use it.
  const lineEffects = l => ({ rename: l.rename && { who: l.who, name: l.rename }, form: l.form, theme: l.theme, bgm: l.bgm });
  // What lines 0..idx-1 left behind (not stored in a save): speaker renames, looks (forms), background theme, music
  const replayState = (script, idx) => {
    const r = { renames: {}, forms: {}, theme: undefined, bgm: undefined };
    for (const l of script.slice(0, idx)) {
      const e = lineEffects(l);
      if (e.rename) r.renames[e.rename.who] = e.rename.name; if (e.form) r.forms[e.form.who] = e.form.to; if (e.theme) r.theme = e.theme; if (e.bgm) r.bgm = e.bgm;
    }
    return r;
  };

  function createLinePlayer({ script, speakers, acts, stage, audio, text, paused = () => false, ready = () => true, clock = realClock }) {
    const typer = createTyper(), p = { fast: false, skip: false };
    let idx = -1, busy = false, acting = false, timer = null, full = "", speaker = null;

    function finish() { typer.pos = full.length; clock.clear(timer); timer = null; stage.text(full); stage.next(true); }

    function tick() {
      if (paused()) return;
      typer.add(1, p.fast, full.length); const pos = typer.pos, ch = full[pos - 1];
      stage.text(full.slice(0, pos));
      if (ch && ch.trim() && !/[.,!?…]/.test(ch)) stage.spoke(speaker);   // sound + pulse only on spoken chars
      if (pos >= full.length) finish();
    }

    function show(i, instant) {
      const line = script[i]; speaker = speakers[line.who];
      const { rename } = lineEffects(line); if (rename) speakers[rename.who].name = rename.name;   // reveal a speaker's real name from this line on
      stage.header(speaker);
      full = text(line); typer.reset(); stage.text(""); stage.next(false);
      if (instant) return finish();
      const wait = line.fx && stage.fx(line.fx);
      if (wait) { busy = true; clock.after(() => { busy = false; timer = clock.every(tick, CHAR_MS); }, wait); }
      else timer = clock.every(tick, CHAR_MS);
    }

    function next() {
      if (idx >= script.length - 1) { idx = script.length; stage.end(); return; }   // end of script
      const l = script[++idx], e = lineEffects(l);
      if (e.bgm === "off") audio.bgm.stop(); else if (e.bgm) audio.bgm.play(e.bgm);
      if (e.theme) stage.theme(e.theme);
      if (l.act) { acting = true; acts[l.act](() => { acting = false; next(); }); }
      else show(idx);
    }

    function advance() {
      if (paused() || busy || acting) return;
      if (!typer.press(full.length)) return finish();   // first press completes the typing
      next();
    }

    // hold skip: fast-forward dialogue (stops at scenes/effects, which block input anyway)
    clock.every(() => {
      if (paused() || !p.skip || !ready() || busy || acting || idx >= script.length) return;
      if (typer.hold(SKIP_MS / 1000, full.length)) next(); else if (timer) finish();
    }, SKIP_MS);

    function restore(sv) {
      const L = script[sv.idx], direct = !!(L && !L.act && L.text);   // saved on a dialogue line: show that very line, no title
      const r = replayState(script, sv.idx + (direct ? 1 : 0));
      idx = direct ? sv.idx : Math.min(sv.idx, script.length - 1) - 1;
      stage.restore(r);
      if (direct) { stage.skipTitle(); show(idx, true); }   // audio needs a click, so the line is shown already, fully typed
      return { bgm: r.bgm, direct };
    }

    return Object.defineProperties(Object.assign(p, { advance, restore }), {
      idx: { get: () => idx }, busy: { get: () => busy }, acting: { get: () => acting }, typing: { get: () => !!timer },
    });
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { createLinePlayer, replayState };
  else { root.createLinePlayer = createLinePlayer; root.replayState = replayState; }
})(typeof window !== "undefined" ? window : globalThis);
