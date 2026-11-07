// Background layers (abstract mountain / sea / nature / artificial silhouettes in parallax) and the gentle battle warp (pure). Run: npm test
const test = require("node:test"), assert = require("node:assert"), fs = require("node:fs"), path = require("node:path");
const { backdropLayers, ambientWarp, LAYERS } = require("./backdrop.js");

const themes = [...fs.readFileSync(path.join(__dirname, "../portraits.js"), "utf8").matchAll(/^  (\w+):\s+\{ sky:/gm)].map(m => m[1]);

test("every sky theme (stage) has 2+ background layers", () => {
  assert.ok(themes.length >= 8);
  for (const th of themes) assert.ok(LAYERS[th] && LAYERS[th].length >= 2, th);
});

test("nearer layers scroll faster than farther ones (parallax)", () => {
  const a = backdropLayers("night", 0), b = backdropLayers("night", 1);
  const shift = i => b[i].pts.reduce((s, p, k) => s + Math.abs(p[1] - a[i].pts[k][1]), 0);
  assert.ok(shift(0) > 0);
  assert.ok(shift(1) > shift(0));
});

test("layers stay faint, inside the lower canvas, and cheap to draw (shots stay readable)", () => {
  for (const th of themes) for (const L of backdropLayers(th, 123.4)) {
    assert.ok(L.alpha > 0 && L.alpha <= .25, th);
    assert.ok(L.pts.length <= 40);
    for (const [x, y] of L.pts) assert.ok(x >= 0 && x <= 960 && y >= 270 && y <= 540, `${th} ${x},${y}`);
  }
});

test("a layer's silhouette wraps: first and last point match", () => {
  for (const L of backdropLayers("lantern", 5)) assert.equal(L.pts[0][1].toFixed(6), L.pts[L.pts.length - 1][1].toFixed(6));
});

test("ambient warp pulses between 0 and a faint cap", () => {
  const v = Array.from({ length: 400 }, (_, i) => ambientWarp(i / 4));
  assert.ok(Math.max(...v) > .1 && Math.max(...v) <= .35 && Math.min(...v) === 0);
});
