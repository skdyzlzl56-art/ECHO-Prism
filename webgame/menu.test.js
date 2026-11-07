const test = require("node:test"), assert = require("node:assert");
const { createMenu, keyLabel, fixKeys } = require("./menu.js");
const press = (m, ...codes) => codes.map(c => m.key(c)).pop();

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
  assert.deepStrictEqual(replayState(S, 3), { renames: { a: "리라" }, theme: "night", bgm: "off" });
  assert.deepStrictEqual(replayState(S, 0), { renames: {}, theme: undefined, bgm: undefined });
});
