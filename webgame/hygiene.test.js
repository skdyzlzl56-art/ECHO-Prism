// Repo hygiene checks (see docs/agents/chapters.md "Merging"). Run: npm test
const test = require("node:test"), assert = require("node:assert"), fs = require("node:fs"), path = require("node:path");
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? (e.name === "audio" ? [] : walk(path.join(d, e.name))) : [path.join(d, e.name)]);
const src = walk(__dirname).filter(f => /\.(js|html)$/.test(f));

test("no merge conflict markers left in source", () => {
  for (const f of src) assert.doesNotMatch(fs.readFileSync(f, "utf8"), /^(<<<<<<< |=======$|>>>>>>> )/m, path.relative(__dirname, f));
});

test("story text uses no male-gendered reference (only 헥사 is male; others are female, see CHARACTERS.md)", () => {
  // 헥사 is never referred to in the third person today; if that changes, allow-list the line here.
  const male = /소년|청년|남자|사나이|(^|[^가-힣])그(가|는|의|를|에게)(?![가-힣])/m;
  for (const f of src.filter(f => /(script|story|scenes)\.js$/.test(f))) assert.doesNotMatch(fs.readFileSync(f, "utf8"), male, path.relative(__dirname, f));
});

test("battle text does not name WASD (A is the swap key; left is arrows only)", () => {
  for (const f of src.filter(f => /(script|battles)\.js$/.test(f))) assert.doesNotMatch(fs.readFileSync(f, "utf8"), /WASD/, path.relative(__dirname, f));
});
