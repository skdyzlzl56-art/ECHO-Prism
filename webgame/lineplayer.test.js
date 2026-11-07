// lineplayer.js through its interface only: a recording stage, a recording audio, a manual clock. Run: npm test
const test = require("node:test"), assert = require("node:assert");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const { createLinePlayer, replayState } = require("./lineplayer.js");

function rig(script, opts = {}) {
  const log = [], timers = []; let now = 0, nid = 0, paused = false, ready = true;
  const clock = {
    after: (f, ms) => { const t = { id: ++nid, f, at: now + ms }; timers.push(t); return t.id; },
    every: (f, ms) => { const t = { id: ++nid, f, at: now + ms, ms }; timers.push(t); return t.id; },
    clear: id => { const i = timers.findIndex(t => t.id === id); if (i >= 0) timers.splice(i, 1); },
  };
  const advance = ms => { for (let end = now + ms; now < end;) { now++; for (const t of [...timers]) if (t.at <= now && timers.includes(t)) { t.ms ? (t.at += t.ms) : timers.splice(timers.indexOf(t), 1); t.f(); } } };
  const speakers = { a: { name: "A", color: "#f00", pitch: 300 }, b: { name: "?", color: "#0f0", pitch: 200 } };
  const stage = {
    header: s => log.push("head:" + s.name), text: s => log.push("text:" + s), next: v => log.push("next:" + v), spoke: () => log.push("spoke"),
    fx: n => { log.push("fx:" + n); return { alert: 800 }[n] || 0; }, theme: t => log.push("theme:" + t), end: () => log.push("end"),
    restore: r => { log.push("restore"); restored.push(r); }, skipTitle: () => log.push("skipTitle"),
  };
  const audio = { bgm: { play: n => log.push("bgm:" + n), stop: () => log.push("bgm:stop") } };
  const acts = { scene: done => { log.push("act"); acts.done = done; } };
  const restored = [];
  const player = createLinePlayer({ script, speakers, acts, stage, audio, text: l => l.text, paused: () => paused, ready: () => ready, clock, ...opts });
  return { player, log, acts, advance, restored, speakers, set paused(v) { paused = v; }, set ready(v) { ready = v; }, texts: () => log.filter(x => x.startsWith("text:")).map(x => x.slice(5)) };
}
const S = [{ who: "a", text: "안녕" }, { who: "a", text: "둘째." }, { who: "a", text: "끝" }];

test("a press shows the first line and types it one character per 45 ms", () => {
  const r = rig(S); r.player.advance();
  assert.deepEqual(r.log.slice(0, 3), ["head:A", "text:", "next:false"]); assert.equal(r.player.idx, 0);
  r.advance(45); assert.equal(r.texts().at(-1), "안"); assert.ok(r.log.includes("spoke"));
  r.advance(45); assert.equal(r.texts().at(-1), "안녕"); assert.equal(r.log.at(-1), "next:true"); assert.equal(r.player.typing, false);
});

test("pressing mid-typing finishes the line; only the next press goes on", () => {
  const r = rig(S); r.player.advance(); r.advance(45);
  r.player.advance(); assert.equal(r.texts().at(-1), "안녕"); assert.equal(r.player.idx, 0);
  r.player.advance(); assert.equal(r.player.idx, 1);
});

test("holding fast types five characters per tick", () => {
  const r = rig([{ who: "a", text: "가나다라마바사" }]); r.player.advance(); r.player.fast = true; r.advance(45); assert.equal(r.texts().at(-1), "가나다라마");
});

test("punctuation is typed silently, spoken characters blip", () => {
  const r = rig([{ who: "a", text: ".가" }]); r.player.advance(); r.log.length = 0;
  r.advance(45); assert.ok(!r.log.includes("spoke")); r.advance(45); assert.ok(r.log.includes("spoke"));
});

test("an fx line blocks input for its wait, then types", () => {
  const r = rig([{ who: "a", text: "쾅" }, { who: "a", text: "다음", fx: "alert" }]);
  r.player.advance(); r.player.advance(); r.player.advance();   // line 0, finish it, go to line 1 (fx)
  assert.equal(r.player.idx, 1); assert.ok(r.log.includes("fx:alert")); assert.equal(r.player.busy, true);
  r.player.advance(); r.advance(790); assert.equal(r.player.busy, true); assert.equal(r.texts().at(-1), "");
  r.advance(10); assert.equal(r.player.busy, false); r.advance(45); assert.equal(r.texts().at(-1), "다");
});

test("a scene (act) blocks input until it calls done, then the story goes on", () => {
  const r = rig([{ who: "a", text: "x" }, { act: "scene" }, { who: "a", text: "후" }]);
  r.player.advance(); r.player.advance(); r.player.advance();
  assert.equal(r.player.acting, true); r.player.advance(); assert.equal(r.player.idx, 1);
  r.acts.done(); assert.equal(r.player.acting, false); assert.equal(r.player.idx, 2); assert.ok(r.log.includes("head:A"));
});

test("bgm and theme on a line are applied; bgm 'off' stops the music", () => {
  const r = rig([{ who: "a", text: "x", bgm: "s1_field", theme: "night" }, { who: "a", text: "y", bgm: "off" }]);
  r.player.advance(); assert.ok(r.log.includes("bgm:s1_field") && r.log.includes("theme:night"));
  r.player.advance(); r.player.advance(); assert.ok(r.log.includes("bgm:stop"));
});

test("a rename reveals the speaker's name from that line on", () => {
  const r = rig([{ who: "b", text: "x", rename: "리라" }]); r.player.advance(); assert.equal(r.speakers.b.name, "리라"); assert.ok(r.log.includes("head:리라"));
});

test("the end of the script shows the end card and stops", () => {
  const r = rig([{ who: "a", text: "x" }]); r.player.advance(); r.player.advance(); r.player.advance();
  assert.ok(r.log.includes("end")); assert.equal(r.player.idx, 1);
});

test("while the menu is open nothing types and presses are ignored", () => {
  const r = rig(S); r.player.advance(); r.paused = true; r.advance(200); assert.equal(r.texts().at(-1), ""); r.player.advance(); assert.equal(r.player.idx, 0);
  r.paused = false; r.advance(45); assert.equal(r.texts().at(-1), "안");
});

test("hold skip fast-forwards lines every 180 ms, but not before the title is gone, nor in the menu", () => {
  const long = "가나다라마바사아자차카타파하".repeat(2), r = rig([0, 1, 2].map(() => ({ who: "a", text: long }))); r.player.advance(); r.player.skip = true;   // too long to type out by itself in 180 ms
  r.ready = false; r.advance(400); assert.equal(r.player.idx, 0);
  r.ready = true; r.paused = true; r.advance(400); assert.equal(r.player.idx, 0);
  r.paused = false; r.advance(180); assert.equal(r.player.idx, 1); r.advance(180); assert.equal(r.player.idx, 2);
  r.player.skip = false; r.advance(400); assert.equal(r.player.idx, 2);
});

test("restore on a dialogue line shows exactly that line, fully typed, without the title", () => {
  const r = rig([{ who: "a", text: "안녕", bgm: "bg" }, ...S.slice(1)]); const out = r.player.restore({ idx: 1 });
  assert.deepEqual(r.restored[0].bgm, "bg"); assert.deepEqual(out, { bgm: "bg", direct: true });
  assert.deepEqual(r.log, ["restore", "skipTitle", "head:A", "text:", "next:false", "text:둘째.", "next:true"]); assert.equal(r.player.idx, 1);
  r.player.advance(); assert.equal(r.player.idx, 2);
});

test("restore on a scene sets the place before it; the next press starts the scene", () => {
  const r = rig([{ who: "a", text: "x", theme: "night" }, { act: "scene" }]); const out = r.player.restore({ idx: 1 });
  assert.equal(r.restored[0].theme, "night"); assert.equal(out.direct, false); assert.ok(!r.log.includes("skipTitle")); assert.equal(r.player.idx, 0);
  r.player.advance(); assert.ok(r.log.includes("act")); assert.equal(r.player.acting, true);
});

test("replaying lines before the save point recovers speaker names, looks, theme and bgm", () => {
  const S = [{ who: "a", rename: "리라", bgm: "intro" }, { theme: "night" }, { bgm: "off" }, { theme: "lantern", bgm: "battle", form: { who: "a", to: "calm" } }];
  assert.deepStrictEqual(replayState(S, 3), { renames: { a: "리라" }, forms: {}, theme: "night", bgm: "off" });
  assert.deepStrictEqual(replayState(S, 4).forms, { a: "calm" });
  assert.deepStrictEqual(replayState(S, 0), { renames: {}, forms: {}, theme: undefined, bgm: undefined });
});

// playing lines live and replaying them must leave the same renames, theme and music (the schema is read in one place, this keeps it that way)
function drift(script, speakers) {
  const names = {}; let theme, bgm;
  const live = createLinePlayer({
    clock: { after: () => 0, every: () => 0, clear() {} },   // typing is never ticked: a press finishes the line
    script, speakers, acts: new Proxy({}, { get: () => done => done() }), text: l => l.text || "", paused: () => false,
    stage: { header() {}, text() {}, next() {}, spoke() {}, fx: () => 0, theme: t => { theme = t; }, end() {}, restore() {}, skipTitle() {} },
    audio: { bgm: { play: n => { bgm = n; }, stop: () => { bgm = "off"; } } },
  });
  for (let i = 0; i < script.length * 4 + 4 && live.idx < script.length; i++) live.advance();
  for (const k in speakers) names[k] = speakers[k].name;
  return { names, theme, bgm };
}
test("live play and replay agree on a small script", () => {
  const S = [{ who: "a", text: "x", rename: "리라", bgm: "intro", theme: "night" }, { who: "a", text: "y", bgm: "off" }, { act: "s" }, { who: "a", text: "z", theme: "lantern" }];
  const sp = { a: { name: "?" } }, d = drift(S, sp), rp = replayState(S, S.length);
  assert.deepStrictEqual({ theme: d.theme, bgm: d.bgm, names: d.names }, { theme: rp.theme, bgm: rp.bgm, names: { a: rp.renames.a } });
});
test("live play and replay agree on the real story, all six stages", () => {
  const rd = f => fs.readFileSync(path.join(__dirname, f), "utf8"), files = ["script.js", ...[1, 2, 3, 4, 5, 6].flatMap(n => [`stage${n}/battles.js`, `stage${n}/story.js`])];
  const D = vm.runInNewContext("const BATTLES = {}, ACTS = {}, FX = {}, sweep = () => {}, noise = () => {};\n" + files.map(rd).join("\n") + "\n({ SCRIPT, SPEAKERS });");
  const before = Object.fromEntries(Object.entries(D.SPEAKERS).map(([k, v]) => [k, v.name])), d = drift(D.SCRIPT, D.SPEAKERS), rp = replayState(D.SCRIPT, D.SCRIPT.length);
  assert.equal(d.theme, rp.theme); assert.equal(d.bgm, rp.bgm);
  for (const k in D.SPEAKERS) assert.equal(d.names[k], rp.renames[k] || before[k], k);
});
