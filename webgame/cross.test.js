// Cross-chapter data checks: bgm/speakers exist, battle configs are consistent, index.html loads every stage file. Run: npm test
const test = require("node:test"), assert = require("node:assert"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const rd = f => fs.readFileSync(path.join(__dirname, f), "utf8");
const files = ["script.js", ...[1, 2, 3, 4, 5, 6].flatMap(n => [`stage${n}/battles.js`, `stage${n}/story.js`])];
const D = vm.runInNewContext("const BATTLES = {}, ACTS = {}, FX = {}, sweep = () => {}, noise = () => {};\n" + files.map(rd).join("\n") + "\n({ SCRIPT, SPEAKERS, BATTLES });");
const bgms = new Set(fs.readdirSync(path.join(__dirname, "audio")).map(f => f.replace(/^bgm_|\.ogg$/g, "")));

test("swap key is A, not X; no 'X키' text left in the game", () => {
  const b = rd("battle.js");
  assert.match(b, /ev\.code === MENU\.keys\.swap\) battle\.swap\(\)/);
  assert.doesNotMatch(b, /keys\.KeyA/, "A must not also move left");
  for (const f of [...files, "battle.js", "stage4/scenes.js"]) assert.doesNotMatch(rd(f), /X키|교대: X/, f);
});

test("battle bgm files and speakers exist; script bgm/speakers exist", () => {
  assert.ok(Object.keys(D.BATTLES).length >= 15);
  for (const [k, b] of Object.entries(D.BATTLES)) {
    assert.ok(b.bgm === null || bgms.has(b.bgm), `${k} bgm ${b.bgm}`);
    assert.ok(D.SPEAKERS[b.speaker], `${k} speaker ${b.speaker}`);
  }
  for (const l of D.SCRIPT) {
    if (l.bgm && l.bgm !== "off") assert.ok(bgms.has(l.bgm), `script bgm ${l.bgm}`);
    if (l.who) assert.ok(D.SPEAKERS[l.who], `script speaker ${l.who}`);
  }
});

test("battle configs are structurally valid", () => {
  const RULES = ["colorRule", "rewind", "boxRule", "invertRule", "splitRule", "pageRule", "darkRule", "finale"];
  for (const [k, b] of Object.entries(D.BATTLES)) {
    if (b.cuts && b.phases) assert.strictEqual(b.phases.length, b.cuts.length + 1, `${k}: phases must be cuts+1`);
    for (const pr of b.phaseRules || []) {
      for (const key of Object.keys(pr)) assert.ok(RULES.includes(key), `${k}: unknown phase rule ${key}`);
    }
    if (b.phaseRules) assert.ok(b.phaseRules.length <= b.phases.length, `${k}: more phaseRules than phases`);
  }
});

test("every new bullet helper and rule is placed in some battle config", () => {
  const src = Object.values(D.BATTLES).flatMap(b => b.phases || []).map(f => f.toString()).join(" ");
  for (const h of ["breakable", "toggle", "bounce", "stall", "homing", "zone", "swell"]) assert.match(src, new RegExp("h\\." + h + "\\("), `h.${h} unused`);
  const rules = new Set(Object.values(D.BATTLES).flatMap(b => [b, ...(b.phaseRules || [])]).flatMap(o => Object.keys(o)));
  for (const r of ["boxRule", "invertRule", "splitRule"]) assert.ok(rules.has(r), `${r} unused`);
});

test("GAME OVER draws a dark backdrop (lose only) before the text", () => {
  const src = rd("battle.js"), i = src.indexOf("if (s.over) {"), blk = src.slice(i, src.indexOf('g.textAlign = "left";', i));
  const m = blk.match(/if \(s\.over === "lose"\)[^\n]*fillRect\([^\n]*\)/);
  assert.ok(m, "no lose-only backdrop fillRect");
  assert.ok(blk.indexOf(m[0]) < blk.indexOf("GAME OVER"), "backdrop must precede text");
});

test("index.html loads every stage script and every loaded file exists", () => {
  const html = rd("index.html"), srcs = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
  for (const s of srcs) assert.ok(fs.existsSync(path.join(__dirname, s)), `missing ${s}`);
  for (const d of fs.readdirSync(__dirname).filter(n => /^stage\d+$/.test(n)))
    for (const f of fs.readdirSync(path.join(__dirname, d)).filter(n => n.endsWith(".js") && !n.endsWith(".test.js")))
      assert.ok(srcs.includes(`${d}/${f}`), `${d}/${f} not loaded by index.html`);
});

test("X dashes in battle and the hint says so", () => {
  const b = rd("battle.js");
  assert.match(b, /ev\.code === MENU\.keys\.dash\) battle\.dash\(\)/);
  assert.ok(b.includes("대시: ${keyLabel(MENU.keys.dash)}"));
});

test("every act in the story is a battle or a scene that exists (a typo would only fail when the player gets there)", () => {
  const scenes = new Set(["game.js", "battle.js", ...[1, 2, 3, 4, 5, 6].map(n => `stage${n}/scenes.js`)].filter(f => fs.existsSync(path.join(__dirname, f))).flatMap(f => [...rd(f).matchAll(/^ACTS\.(\w+) =/gm)].map(m => m[1])));
  const acts = D.SCRIPT.filter(l => l.act).map(l => l.act);
  assert.ok(acts.length > 15);
  for (const a of acts) assert.ok(D.BATTLES[a] || scenes.has(a), `act "${a}" is neither a BATTLES entry nor an ACTS scene`);
  for (const b in D.BATTLES) assert.ok(!scenes.has(b), `${b} is both a battle and a scene`);
});
