const test = require("node:test"), assert = require("node:assert");
const { createMenu, keyLabel, fixKeys } = require("./menu.js");
const press = (m, ...codes) => codes.map(c => m.key(c)).pop();

test("fixKeys rewrites every Z키 / A키 in a line", () => {
  assert.strictEqual(fixKeys("Z키로 켜고 Z키로 끄고 A키 A키", { fire: "KeyX", swap: "KeyQ" }), "X키로 켜고 X키로 끄고 Q키 Q키");
});

test("C opens and closes the menu; Escape on the top list closes too", () => {
  const m = createMenu();
  assert.strictEqual(m.open, false);
  m.toggle(); assert.strictEqual(m.open, true);
  m.key("KeyC"); assert.strictEqual(m.open, false);
  m.toggle(); m.key("Escape"); assert.strictEqual(m.open, false);
});

test("menu is a list with key settings and quit (items can be appended later)", () => {
  const m = createMenu();
  assert.ok(m.items.some(i => i.id === "keys") && m.items.some(i => i.id === "quit"));
});

test("rebinding applies at once; a key already used in the same context is refused", () => {
  const m = createMenu();
  assert.strictEqual(m.rebind("swap", "KeyQ"), true);
  assert.strictEqual(m.keys.swap, "KeyQ");
  assert.strictEqual(m.rebind("fire", "KeyQ"), false, "Q is swap now");
  assert.strictEqual(m.keys.fire, "KeyZ");
  assert.strictEqual(m.rebind("dash", "ArrowLeft"), false, "movement keys are reserved");
  assert.strictEqual(m.rebind("dash", "KeyC"), false, "C belongs to the menu");
  assert.strictEqual(m.rebind("fast", "KeyZ"), false, "Z advances dialogue");
});

test("dash and fast typing may share X (different situations)", () => {
  const m = createMenu();
  assert.strictEqual(m.keys.dash, "KeyX"); assert.strictEqual(m.keys.fast, "KeyX");
});

test("changing a key through the menu screens works, and the hint text follows", () => {
  const m = createMenu();
  m.toggle();
  press(m, "Enter");                       // 키 설정
  press(m, "ArrowDown", "Enter");          // 교대 -> capture
  press(m, "KeyQ");
  assert.strictEqual(m.keys.swap, "KeyQ");
  assert.strictEqual(keyLabel(m.keys.swap), "Q");
  assert.strictEqual(fixKeys("A키로 교대", m.keys), "Q키로 교대");
  assert.strictEqual(fixKeys("Z키로 끄고", m.keys), "Z키로 끄고");
});

test("quit needs a confirmation; declining returns to the list", () => {
  const m = createMenu();
  m.toggle();
  const quit = m.items.findIndex(i => i.id === "quit");
  for (let i = 0; i < quit; i++) m.key("ArrowDown");
  assert.strictEqual(press(m, "Enter"), undefined, "first press only asks");
  assert.strictEqual(m.page, "confirm");
  assert.strictEqual(press(m, "Enter"), undefined, "default answer is No");
  assert.strictEqual(m.page, "list");
  press(m, "Enter"); m.key("ArrowLeft");
  assert.strictEqual(press(m, "Enter"), "quit");
});

test("save/load are menu items; choosing one is reported to the caller, which owns the slot", () => {
  const m = createMenu();
  m.toggle();
  const at = id => { const n = m.items.findIndex(i => i.id === id); assert.ok(n >= 0, id + " item"); m.page = "list"; m.sel = n; return press(m, "Enter"); };
  assert.strictEqual(at("save"), "save");
  assert.strictEqual(at("load"), "load");
});

test("a save point restores the scene, bond, level and exp; mid-battle it is the battle's start line", () => {
  const { makeSave, readSave } = require("./menu.js");
  const raw = makeSave(7, { base: 2, lv: 3, xp: 40 });
  assert.deepStrictEqual(readSave(raw), { idx: 7, bond: { base: 2, lv: 3, xp: 40 } });
});

test("no save, or a broken one, loads nothing", () => {
  const { readSave } = require("./menu.js");
  assert.strictEqual(readSave(null), null);
  assert.strictEqual(readSave("{oops"), null);
  assert.strictEqual(readSave('{"idx":"x"}'), null);
});

test("replaying lines before the save point recovers speaker names, theme and bgm", () => {
  const { replayState } = require("./menu.js");
  const S = [{ who: "a", rename: "리라", bgm: "intro" }, { theme: "night" }, { bgm: "off" }, { theme: "lantern", bgm: "battle" }];
  assert.deepStrictEqual(replayState(S, 3), { renames: { a: "리라" }, forms: {}, theme: "night", bgm: "off" });
  assert.deepStrictEqual(replayState(S, 0), { renames: {}, forms: {}, theme: undefined, bgm: undefined });
});

test("volume page: bgm and sfx adjust separately in 10% steps, clamp at 0 and 1, and persist through the store", () => {
  const data = {}, store = { get: k => data[k], set: (k, v) => { data[k] = v; } };
  const m = createMenu(undefined, store);
  assert.deepStrictEqual(m.vol, { bgm: 1, sfx: 1 });
  m.toggle(); m.sel = m.items.findIndex(i => i.id === "volume");
  press(m, "Enter"); assert.strictEqual(m.page, "volume");
  press(m, "ArrowLeft", "ArrowLeft"); assert.strictEqual(m.vol.bgm, 0.8);
  press(m, "ArrowDown", "ArrowRight"); assert.strictEqual(m.vol.sfx, 1, "clamped at max");
  for (let i = 0; i < 12; i++) press(m, "ArrowLeft"); assert.strictEqual(m.vol.sfx, 0, "0 = fully off");
  assert.strictEqual(m.vol.bgm, 0.8, "bgm untouched");
  const again = createMenu(undefined, store);
  assert.deepStrictEqual(again.vol, { bgm: 0.8, sfx: 0 }, "survives a reload");
  press(m, "Escape"); assert.strictEqual(m.page, "list");
});

test("a broken or missing stored volume falls back to full", () => {
  const m = createMenu(undefined, { get: () => "junk", set() {} });
  assert.deepStrictEqual(m.vol, { bgm: 1, sfx: 1 });
});

test("X goes back like Esc, except while binding a key", () => {
  const { createMenu } = require("./menu.js");
  const m = createMenu(); m.toggle(); m.key("Enter"); assert.strictEqual(m.page, "keys");
  m.key("KeyX"); assert.strictEqual(m.page, "list");
  m.key("Enter"); m.key("Enter"); assert.strictEqual(m.page, "capture");
  m.key("KeyX"); assert.strictEqual(m.page, "capture", "X is a key to bind here (taken by dash), not Back");
});
