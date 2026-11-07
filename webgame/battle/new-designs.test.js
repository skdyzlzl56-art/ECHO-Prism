// Ticket 11: 쪽지, 사서 and 에코 (the hero) get their own shapes, distinct from 침묵 (orb), 헥사 (rings) and the pendulum prism.
const test = require("node:test"), assert = require("node:assert"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const rd = f => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const S = {}; for (const f of ["script.js", "stage1/battles.js", "stage2/battles.js", "stage5/battles.js", "stage6/story.js"]) for (const m of rd(f).matchAll(/(?:SPEAKERS\.)?(\w+)(?:\s*[:=])\s*\{[^}]*?shape: "(\w+)"/g)) S[m[1]] = { shape: m[2] };
const shapes = rd("portraits.js").match(/const SHAPES = \{([^}]*)\}/)[1].split(",").map(s => s.trim());

test("쪽지, 사서, 에코 use new shapes that exist as portraits and match no other speaker", () => {
  for (const k of ["scrap", "librarian", "self"]) {
    assert.ok(shapes.includes(S[k].shape), `${k} portrait ${S[k].shape} exists`);
    for (const o of Object.keys(S)) if (o !== k) assert.notStrictEqual(S[k].shape, S[o].shape, `${k} shares a shape with ${o}`);
  }
  assert.strictEqual(new Set(["scrap", "librarian", "self"].map(k => S[k].shape)).size, 3);
});

test("the battle body of 쪽지 and 사서 is drawn by their own branch, not the shard fallback", () => {
  const src = rd("battle.js");
  for (const k of ["scrap", "librarian"]) assert.ok(src.includes(`sp.shape === "${S[k].shape}"`), `${k} has a drawEnemyBody branch`);
});
