// Background layers: faint abstract silhouettes (mountain / sea / nature / artificial) scrolling in parallax under the starfield, plus a gentle
// pulsing warp amount. Pure (no DOM): portraits.js draws what this returns on the #bg canvas. Each layer is <= 25 points, so drawing is cheap.
(function (root) {
  const TAU = Math.PI * 2, W = 960, H = 540;
  // silhouette height 0..1 at u in [0,1), periodic so the scroll loops seamlessly
  const PROFILE = {
    mountain:   u => .5 + .3 * Math.sin(TAU * 2 * u) + .2 * Math.sin(TAU * 5 * u + 1),
    sea:        u => .5 + .5 * Math.sin(TAU * 3 * u),
    nature:     u => Math.sqrt(Math.abs(Math.sin(TAU * 7 * u))),                  // rounded crowns / hills
    pillar:     u => (Math.floor(u * 10) % 2 ? .35 : .95) * (.8 + .2 * Math.abs(Math.sin(TAU * 10 * u))),   // room: columns with gaps between
    shelf:      u => ((Math.floor(u * 8) * 3) % 4 + 2) / 6,                    // room: stacked shelves / cabinets
    artificial: u => ((Math.floor(u * 12) * 7) % 5 + 1) / 5,                      // blocky towers
  };
  // far layer first; later entries are nearer (faster, taller, a little brighter)
  const LAYERS = {
    night: ["mountain", "sea"], lantern: ["mountain", "nature"], silence: ["sea", "mountain"], gallery: ["pillar", "shelf"],
    clocktower: ["pillar", "pillar"], atelier: ["shelf", "pillar"], library: ["shelf", "shelf"], core: ["pillar", "shelf"], flee: ["artificial", "mountain"],
  };
  const INDOOR = new Set(["gallery", "clocktower", "atelier", "library", "core"]), isIndoor = th => INDOOR.has(th);
  const backdropLayers = (theme, t) => (LAYERS[theme] || LAYERS.night).map((kind, i) => {
    const off = (t * (8 + 14 * i)) % W, maxH = 150 + 40 * i, pts = [];
    for (let x = 0; x <= W; x += 40) pts.push([x, H - maxH * PROFILE[kind](((x + off) / W) % 1)]);
    return { kind, alpha: .08 + .06 * i, pts };
  });
  // 0 most of the time, a soft 3s swell every 14s, never above .3 (stars streak outward; shots stay readable)
  const ambientWarp = t => { const p = t % 14; return p < 3 ? .3 * Math.sin(Math.PI * p / 3) : 0; };
  // concentric rings that spread from the screen centre when a name is spoken (age in seconds since the event); [] once they have faded
  const rippleRings = age => [0, .2, .4].map(d => age - d).filter(a => a > 0 && a < 2.4).map(a => ({ r: 40 + a * 300, alpha: .5 * (1 - a / 2.4) }));
  if (typeof module !== "undefined" && module.exports) module.exports = { isIndoor, backdropLayers, ambientWarp, rippleRings, LAYERS };
  else { root.isIndoor = isIndoor; root.backdropLayers = backdropLayers; root.ambientWarp = ambientWarp; root.rippleRings = rippleRings; }
})(typeof window !== "undefined" ? window : globalThis);
