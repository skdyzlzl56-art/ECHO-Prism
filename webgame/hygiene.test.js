// Repo hygiene checks (see docs/agents/chapters.md "Merging"). Run: npm test
const test = require("node:test"), assert = require("node:assert"), fs = require("node:fs"), path = require("node:path");
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? (e.name === "audio" ? [] : walk(path.join(d, e.name))) : [path.join(d, e.name)]);
const src = walk(__dirname).filter(f => /\.(js|html)$/.test(f));

test("no merge conflict markers left in source", () => {
  for (const f of src) assert.doesNotMatch(fs.readFileSync(f, "utf8"), /^(<<<<<<< |=======$|>>>>>>> )/m, path.relative(__dirname, f));
});

test("battle text does not name WASD (A is the swap key; left is arrows only)", () => {
  for (const f of src.filter(f => /(script|battles)\.js$/.test(f))) assert.doesNotMatch(fs.readFileSync(f, "utf8"), /WASD/, path.relative(__dirname, f));
});
