// Abstract motion-graphic portraits on a canvas. Called from index.html:
// setPortrait(speaker) on each line, pulsePortrait() on each blip, kickPortrait() on fx.
const cv = document.getElementById("portrait"), c = cv.getContext("2d");
const SZ = 300; cv.width = cv.height = SZ;
let cur = null, pulse = 0, kick = 0;
let ph = 0, last = 0, talk = 0;   // ph: animation phase; advances faster while talking

let cast = null;                  // battle conversation: list of speakers shown side by side (null = single portrait)
const setCast = list => { cast = list; };
const setPortrait = sp => { cur = sp; };
const pulsePortrait = () => { pulse = 1; };
const kickPortrait = () => { kick = 1; };

function orb(t, col) {
  c.strokeStyle = col; c.lineWidth = 2;                                              // expanding ripples
  for (let i = 0; i < 3; i++) { const p = (ph / 1500 + i / 3) % 1; c.globalAlpha = (1 - p) * .5; c.beginPath(); c.arc(0, 0, 40 + 110 * p, 0, 7); c.stroke(); }
  c.globalAlpha = 1;
  const r = 70 + 6 * pulse + 5 * Math.sin(ph / 150);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, r * 1.8);
  g.addColorStop(0, "#fff"); g.addColorStop(.25, col); g.addColorStop(1, "transparent");
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, r * 1.8, 0, 7); c.fill();
  c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 30;
  for (let i = 0; i < 3; i++) {                       // orbiting satellites
    const a = ph / 350 + i * 2.09;
    c.beginPath(); c.arc(Math.cos(a) * r * 1.4, Math.sin(a) * r * .5, 6, 0, 7); c.fill();
  }
}

// Cold & analytical: sharp diamond on a rigid rod swinging like a pendulum, leaving afterimages.
// Talking = wider, faster swing.
function prism(t, col) {
  c.strokeStyle = col; c.shadowColor = col; c.shadowBlur = 20; c.lineWidth = 3;
  c.beginPath(); c.arc(0, -125, 6, 0, 7); c.stroke();                                   // pivot
  for (let k = 4; k >= 0; k--) {                                                         // k>0 = fading ghosts
    const ang = (.45 + .25 * talk) * Math.sin((ph - k * 45) / 420);
    c.save(); c.translate(0, -125); c.rotate(ang); c.globalAlpha = k ? .15 : 1;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 150); c.stroke();                         // rod
    c.translate(0, 150);
    c.beginPath(); c.moveTo(0, -34); c.lineTo(26, 0); c.lineTo(0, 62); c.lineTo(-26, 0); c.closePath();
    c.fillStyle = "rgba(79,195,255,.2)"; c.fill(); c.stroke();
    c.beginPath(); c.moveTo(0, -34); c.lineTo(0, 62); c.moveTo(-26, 0); c.lineTo(26, 0); c.stroke();  // facets
    c.restore();
  }
  c.globalAlpha = 1;
}

// Heavy & stoic: fixed hexagons pulsing outward like a slow heartbeat, whole body swaying slightly. No rotation.
function rings(t, col) {
  c.strokeStyle = col; c.shadowColor = col; c.shadowBlur = 20; c.lineWidth = 4;
  c.translate(Math.sin(ph / 900) * 8, 0);
  for (let i = 0; i < 4; i++) {
    const p = (ph / 1800 + i / 4) % 1, r = 25 + 100 * p * (1 + .08 * pulse);
    c.globalAlpha = Math.min(1, (1 - p) * 1.5); c.beginPath();
    for (let j = 0; j <= 6; j++) c.lineTo(Math.cos(j * 1.047 + .52) * r, Math.sin(j * 1.047 + .52) * r);
    c.stroke();
  }
  c.globalAlpha = 1; c.fillStyle = col; c.beginPath();
  for (let j = 0; j < 6; j++) c.lineTo(Math.cos(j * 1.047 + .52) * 22, Math.sin(j * 1.047 + .52) * 22);
  c.fill();                                                                              // solid core
}

// Soft & feminine: overlapping circles blooming like a rosette, counter-rotating, breathing
function bloom(t, col) {
  c.strokeStyle = c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 25; c.lineWidth = 3;
  for (let L = 0; L < 2; L++) for (let k = 0; k < 6; k++) {
    const a = ph / 500 * (L ? -1 : 1) + k * Math.PI / 3, d = (L ? 30 : 55) + 8 * Math.sin(ph / 300 + L), r = L ? 30 : 42;
    c.beginPath(); c.arc(Math.cos(a) * d, Math.sin(a) * d, r, 0, 7);
    c.globalAlpha = L ? .3 : 1; L ? c.fill() : c.stroke();
  }
  c.globalAlpha = 1;
  const r = 26 + 5 * pulse, g = c.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, "#fff"); g.addColorStop(1, "transparent");
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill();
  c.fillStyle = col;                                                                 // sparkles drifting up
  for (let i = 0; i < 10; i++) {
    const p = (ph / 2500 + i * .1) % 1;
    c.globalAlpha = Math.sin(p * Math.PI); c.beginPath(); c.arc(Math.sin(i * 12.9) * 100, 120 - 240 * p, 2 + i % 3, 0, 7); c.fill();
  }
  c.globalAlpha = 1;
}

// Sharp & aggressive: slowly turning shard + glitch art (RGB split, horizontal slices jump). Talking = more glitching.
const SHARD = [105, 40, 88, 30, 112, 45, 78, 36, 100];
const rnd = n => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
function shardPath(dx) {
  c.beginPath();
  SHARD.forEach((R, j) => { const a = ph / 900 + j * Math.PI * 2 / 9; c.lineTo(Math.cos(a) * R + dx, Math.sin(a) * R); });
  c.closePath();
}
function shard(t, col) {
  c.lineWidth = 3;
  const split = 3 + 10 * talk;
  c.globalCompositeOperation = "lighter"; c.globalAlpha = .7;                       // RGB split ghosts
  for (const [dx, color] of [[-split, "#f00"], [split, "#0ff"]]) { c.strokeStyle = color; shardPath(dx); c.stroke(); }
  c.globalCompositeOperation = "source-over"; c.globalAlpha = 1;
  c.shadowColor = col; c.shadowBlur = 20 + 14 * kick;                              // outline glows on hit
  const n = Math.floor(t / 100), thr = talk > .1 ? .45 : .85, amp = talk > .1 ? 30 : 12;
  for (let i = 0; i < 7; i++) {                                                     // slice bands, some jump sideways
    const y0 = -112 + i * 32, v = rnd(n * 7 + i), dx = v > thr ? (rnd(n + i * 3) - .5) * 2 * amp : 0;
    c.save(); c.beginPath(); c.rect(-160, y0, 320, 32); c.clip();
    c.strokeStyle = c.fillStyle = col; shardPath(dx); c.stroke(); c.globalAlpha = .2; c.fill();
    c.restore();
  }
}

// Guide fairy: a small glowing body hovering, four translucent wings that flutter (faster while talking), falling stardust.
function fairy(t, col) {
  const bob = Math.sin(ph / 420) * 12, flap = Math.sin(ph / 70) * (.12 + .1 * talk);
  c.translate(0, bob);
  c.shadowColor = col; c.shadowBlur = 22; c.lineWidth = 2;
  for (const s of [-1, 1]) for (const [len, rot, wd] of [[100, -.55, 38], [72, .5, 28]]) {         // upper pair large, lower pair small
    c.save(); c.scale(s, 1); c.rotate(rot * (1 + flap * 2)); c.translate(len * .5 + 10, 0);
    c.strokeStyle = col; c.fillStyle = col; c.globalAlpha = .18; c.beginPath(); c.ellipse(0, 0, len * .5, wd * (1 - flap * 3), 0, 0, 7); c.fill();
    c.globalAlpha = .75; c.stroke(); c.restore();
  }
  c.globalAlpha = 1;
  const r = 20 + 4 * pulse, g = c.createRadialGradient(0, 0, 0, 0, 0, r * 2.4);                       // glowing body
  g.addColorStop(0, "#fff"); g.addColorStop(.35, col); g.addColorStop(1, "transparent");
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, r * 2.4, 0, 7); c.fill();
  c.fillStyle = "#fff"; c.beginPath(); c.arc(0, 0, r * .6, 0, 7); c.fill();
  c.fillStyle = col;                                                                                  // stardust trail
  for (let i = 0; i < 16; i++) {
    const p = (ph / 1600 + i / 16) % 1, a = i * 2.4;
    c.globalAlpha = (1 - p) * .9; c.beginPath(); c.arc(Math.sin(a) * (14 + 40 * p), 10 + 120 * p, 1.5 + (i % 3), 0, 7); c.fill();
  }
  c.globalAlpha = 1;
}

// Painter's easel: a blank frame slowly turning, one red dab in the corner, grey flecks wiped off it.
function easel(t, col) {
  c.strokeStyle = c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 18; c.lineWidth = 3;
  c.save(); c.rotate(Math.sin(ph / 1400) * .12);
  c.strokeRect(-60, -80, 120, 160); c.globalAlpha = .12; c.fillRect(-60, -80, 120, 160); c.globalAlpha = 1;
  c.beginPath(); c.moveTo(-30, 80); c.lineTo(-52, 120); c.moveTo(30, 80); c.lineTo(52, 120); c.stroke();
  c.fillStyle = "#ff4d6d"; c.shadowColor = "#ff4d6d"; c.beginPath(); c.arc(34, -56, 7 + 3 * pulse, 0, 7); c.fill();
  c.restore(); c.fillStyle = col;
  for (let i = 0; i < 10; i++) { const p = (ph / 2200 + i * .1) % 1; c.globalAlpha = (1 - p) * .7; c.fillRect(Math.sin(i * 9.7) * 90, -90 + 200 * p, 3, 3 + i % 3); }
  c.globalAlpha = 1;
}

// Clock keeper's gear: a toothed wheel turning in steps (a tick, then still), one hand fixed at the top.
function gear(t, col) {
  c.strokeStyle = c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 18; c.lineWidth = 3;
  const a = Math.floor(ph / 500) * .26 + Math.min(1, (ph % 500) / 90) * .26;                      // ticks forward, then holds
  c.save(); c.rotate(a); c.beginPath();
  for (let i = 0; i < 24; i++) { const R = i % 2 ? 78 : 96, q = i * Math.PI / 12; c.lineTo(Math.cos(q) * R, Math.sin(q) * R); }
  c.closePath(); c.stroke(); c.globalAlpha = .1; c.fill(); c.globalAlpha = 1;
  c.beginPath(); c.arc(0, 0, 44, 0, 7); c.stroke(); c.restore();
  c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -38); c.moveTo(0, 0); c.lineTo(22 + 3 * pulse, 6); c.stroke();
  c.beginPath(); c.arc(0, 0, 5, 0, 7); c.fill();
}

// Loose page (쪽지): a torn sheet drifting and tilting, ruled lines, a dog-eared corner, a few bits of text falling off it.
function page(t, col) {
  c.strokeStyle = c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 18; c.lineWidth = 3;
  c.save(); c.translate(0, 6 * Math.sin(ph / 600)); c.rotate(Math.sin(ph / 900) * .25 + .1);
  c.beginPath(); c.moveTo(-55, -75); c.lineTo(35, -75); c.lineTo(55, -55); c.lineTo(55, 40); c.lineTo(40, 48); c.lineTo(25, 40); c.lineTo(10, 50); c.lineTo(-10, 42); c.lineTo(-30, 52); c.lineTo(-55, 44); c.closePath(); c.stroke();
  c.globalAlpha = .1; c.fill(); c.globalAlpha = 1; c.beginPath(); c.moveTo(35, -75); c.lineTo(35, -55); c.lineTo(55, -55); c.stroke();
  for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-40, -50 + i * 20); c.lineTo(-40 + (i % 2 ? 60 : 80 + 6 * pulse), -50 + i * 20); c.stroke(); }
  c.restore();
  for (let i = 0; i < 6; i++) { const p = (ph / 1800 + i / 6) % 1; c.globalAlpha = (1 - p) * .7; c.fillRect(-60 + i * 22 + 8 * Math.sin(i * 5 + ph / 400), 50 + 70 * p, 8, 2); }
  c.globalAlpha = 1;
}

// Librarian's book (사서): an open book, its pages turning one after another, a ribbon marker hanging from the spine.
function book(t, col) {
  c.strokeStyle = c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 18; c.lineWidth = 3;
  c.beginPath(); c.moveTo(0, -60); c.lineTo(0, 70); c.moveTo(0, -60); c.quadraticCurveTo(-60, -80, -105, -50); c.lineTo(-105, 50); c.quadraticCurveTo(-60, 30, 0, 70);
  c.moveTo(0, -60); c.quadraticCurveTo(60, -80, 105, -50); c.lineTo(105, 50); c.quadraticCurveTo(60, 30, 0, 70); c.stroke();
  c.globalAlpha = .1; c.fill(); c.globalAlpha = 1;
  const f = (ph / 1600) % 1, w = Math.cos(f * Math.PI);                                        // a page swings from right to left
  c.beginPath(); c.moveTo(0, -60); c.quadraticCurveTo(w * 55, -85 + 20 * Math.sin(f * Math.PI), w * 100, -50); c.lineTo(w * 100, 50); c.quadraticCurveTo(w * 55, 30, 0, 70); c.stroke();
  c.beginPath(); c.moveTo(0, 70); c.lineTo(-6, 100 + 4 * pulse); c.lineTo(0, 94); c.lineTo(6, 100 + 4 * pulse); c.closePath(); c.fill();
}

// Echo (에코): a voice travelling as a sine wave; each copy fainter and further out, like a call coming back from the walls.
function wave(t, col) {
  c.strokeStyle = col; c.shadowColor = col; c.shadowBlur = 18; c.lineWidth = 3;
  for (let k = 0; k < 4; k++) {
    c.globalAlpha = 1 - k * .25; c.beginPath();
    for (let x = -110; x <= 110; x += 6) { const y = Math.sin(x / 22 - ph / 250 + k * .9) * (34 + 14 * pulse) * (1 - Math.abs(x) / 150) * (1 - k * .18); x === -110 ? c.moveTo(x, y + k * 26 - 40) : c.lineTo(x, y + k * 26 - 40); }
    c.stroke();
  }
  c.globalAlpha = 1; c.fillStyle = col; c.beginPath(); c.arc(-110, -40, 5, 0, 7); c.fill();
}

const SHAPES = { orb, prism, rings, bloom, shard, fairy, easel, gear, page, book, wave };

// Starfield background
const bg = document.getElementById("bg").getContext("2d"), stageEl = document.getElementById("stage");
const stars = Array.from({ length: 90 }, () => ({ x: Math.random() * 960, y: Math.random() * 540, v: .1 + Math.random() * .4, p: Math.random() * 7 }));
// Stage 1 swaps to a warm lantern sky (embers rise) via warp(): stars streak out from the centre, then the theme flips mid-flash.
// vx / vy: star drift per frame (x star speed); streak: draw stars as trails of that length. "flee" rushes everything leftwards, as if running right.
const THEMES = {
  night:   { sky: "linear-gradient(#1b2a5a,#0b1026)", rgb: "190,220,255", vx: 0,   vy: 1 },
  lantern: { sky: "linear-gradient(#5a2e1b,#140a0a)", rgb: "255,196,110", vx: 0,   vy: -1 },
  silence: { sky: "linear-gradient(#1c2a33,#06090d)", rgb: "170,190,205", vx: .25, vy: .6 },          // cold, still, slow snow
  gallery: { sky: "linear-gradient(#2b2f35,#0c0d10)", rgb: "190,195,205", vx: .1, vy: .3 },            // washed-out grey, slow drifting dust
  clocktower: { sky: "linear-gradient(#3a2d17,#0d0a06)", rgb: "230,200,130", vx: 0, vy: .15 },     // stopped brass hours, dust hanging in the air
  library: { sky: "linear-gradient(#1d2140,#07091a)", rgb: "205,195,235", vx: .05, vy: -.12 },   // ink-blue stacks, pages drifting slowly up
  core:    { sky: "linear-gradient(#26153f,#06030f)", rgb: "230,210,255", vx: 0, vy: -.3 },   // prism core: violet, light rising like breath
  atelier: { sky: "linear-gradient(#3b2a1e,#120b08)", rgb: "240,210,170", vx: 0, vy: -.05 },   // painter's studio: warm wood and lamplight, specks of pigment drifting
  flee:    { sky: "linear-gradient(#3d0f1c,#0a0306)", rgb: "255,120,130", vx: -22, vy: 0, streak: 5 }, // red alarm sky, stars streak past
};
let theme = THEMES.night, themeKey = "night", warpMs = 0, lastBg = 0;
function setTheme(to) { theme = THEMES[to]; themeKey = to; document.getElementById("stage").style.background = theme.sky; }
let rippleMs = -1;                                               // name events: rings spread through the sky (backdrop.js rippleRings)
function ripple() { rippleMs = 0; }
function warp(to = "lantern") { warpMs = 1800; setTimeout(() => setTheme(to), 900); }
function drawBg(t) {
  const dt = Math.min(t - lastBg, 50); lastBg = t;
  bg.clearRect(0, 0, 960, 540);
  for (const L of backdropLayers(themeKey, t / 1000)) {         // parallax silhouettes behind the stars (backdrop.js)
    bg.globalAlpha = L.alpha; bg.fillStyle = `rgb(${theme.rgb})`; bg.beginPath(); bg.moveTo(0, 540);
    for (const [x, y] of L.pts) bg.lineTo(x, y);
    bg.lineTo(960, 540); bg.closePath(); bg.fill();
  }
  bg.globalAlpha = 1;
  if (rippleMs >= 0) {
    rippleMs += dt; bg.lineWidth = 3;
    for (const R of rippleRings(rippleMs / 1000)) { bg.strokeStyle = `rgba(${theme.rgb},${R.alpha})`; bg.beginPath(); bg.arc(480, 270, R.r, 0, Math.PI * 2); bg.stroke(); }
    if (rippleMs > 3000) rippleMs = -1;
  }
  const w = Math.max(warpMs > 0 ? Math.sin(Math.PI * warpMs / 1800) : 0, stageEl.classList.contains("battle") ? ambientWarp(t / 1000) : 0);   // 0 -> 1 (mid-warp) -> 0; battles add a faint periodic warp
  warpMs = Math.max(0, warpMs - dt);
  for (const s of stars) {
    if (w > .02) {                                               // streak away from the centre
      const dx = s.x - 480, dy = s.y - 270, k = 1 + w * 3;
      bg.strokeStyle = `rgba(${theme.rgb},${.3 + .6 * w})`; bg.lineWidth = 2;
      bg.beginPath(); bg.moveTo(480 + dx * (k - .8 * w), 270 + dy * (k - .8 * w)); bg.lineTo(480 + dx * k, 270 + dy * k); bg.stroke();
      continue;
    }
    s.x = (s.x + s.v * theme.vx + 960) % 960; s.y = (s.y + s.v * theme.vy + 540) % 540;
    if (theme.streak) {                                          // speed lines
      bg.strokeStyle = `rgba(${theme.rgb},${.35 + .35 * s.v})`; bg.lineWidth = 1 + s.v * 3;
      bg.beginPath(); bg.moveTo(s.x, s.y); bg.lineTo(s.x - theme.vx * s.v * theme.streak, s.y); bg.stroke(); continue;
    }
    bg.fillStyle = `rgba(${theme.rgb},${.4 + .4 * Math.sin(t / 500 + s.p)})`;
    bg.fillRect(s.x, s.y, 2, 2);
  }
}

// Title screen = the story's opening. Lira (the world itself) drifts alone; the empty seat is where the unnamed one will stand, its outline cycling
// through the shapes they can choose. Memories are lights that glow when she passes; the seat splits light into a prism (the echo of a first cry);
// now and then a crack (균열) tears through the sky and fades. Click: the seat flares and swallows the screen (cast.goAt). Stage CSS (.title) stretches this canvas over the stage.
const ss0 = x => x * x * (3 - 2 * x);
const trail = [], PRISM = ["255,90,120", "255,170,70", "255,235,110", "110,230,150", "90,190,255", "180,130,255"];
const memories = Array.from({ length: 40 }, () => ({ x: Math.random() * 960, y: Math.random() * 540, v: .1 + Math.random() * .35, r: 2 + Math.random() * 3.5, col: PRISM[Math.random() * 6 | 0], p: Math.random() * 7 }));
function titleScene(t) {
    const SEAT = [480, 410], p = (t % 15000) / 15000;
  const w = ss0(p < .6 ? 0 : p < .72 ? (p - .6) / .12 : p < .9 ? 1 : 1 - (p - .9) / .1);              // 0 = wandering, 1 = keeping watch over the seat
  const wx = 480 + 320 * Math.sin(t / 3300), wy = 150 + 70 * Math.sin(t / 2100 + 1);
  const x = wx + (SEAT[0] + 70 * Math.cos(t / 900) - wx) * w, y = wy + (SEAT[1] - 70 + 22 * Math.sin(t / 900) - wy) * w;
  c.save(); c.globalCompositeOperation = "lighter";
  for (const m of memories) {                                                                         // memories: lights that rise, and glow where Lira passes
    m.y -= m.v; m.x += Math.sin(t / 1500 + m.p) * .2; if (m.y < -10) { m.y = 550; m.x = Math.random() * 960; }
    const near = Math.max(0, 1 - Math.hypot(m.x - x, m.y - y) / 130), r = m.r * (1 + 2 * near), g = c.createRadialGradient(m.x, m.y, 0, m.x, m.y, r * 3);
    g.addColorStop(0, `rgba(${m.col},${.35 + .6 * near})`); g.addColorStop(1, `rgba(${m.col},0)`);
    c.fillStyle = g; c.beginPath(); c.arc(m.x, m.y, r * 3, 0, 7); c.fill();
  }
  c.restore();
  const n = Math.floor(t / 9000), k = (t % 9000) / 900;                                                // a crack tears through the sky, flickers, fades
  if (n > 0 && k < 1) {
    let px = 120 + rnd(n) * 720, py = 0; c.save(); c.strokeStyle = `rgba(255,70,110,${(1 - k) * (Math.sin(t / 40) > -.3 ? 1 : .25)})`; c.lineWidth = 2; c.shadowColor = "#f36"; c.shadowBlur = 12; c.beginPath(); c.moveTo(px, py);
    for (let i = 1; i < 9 * Math.min(1, k * 4); i++) { px += (rnd(n * 9 + i) - .5) * 90; py += 24 + rnd(n * 7 + i) * 36; c.lineTo(px, py); }
    c.stroke(); c.restore();
  }
  for (let i = 0; i < 3; i++) {                                                                       // echo rings from the empty seat
    const q = ((t / 3200) + i / 3) % 1;
    c.strokeStyle = `rgba(255,255,255,${(1 - q) * (.25 + .3 * w)})`; c.lineWidth = 2; c.beginPath(); c.ellipse(SEAT[0], SEAT[1], 30 + 150 * q, 8 + 40 * q, 0, 0, 7); c.stroke();
  }
  c.save(); c.translate(SEAT[0], SEAT[1]); c.setLineDash([6, 8]); c.lineDashOffset = -t / 80; c.lineWidth = 3; c.shadowColor = "#fff"; c.shadowBlur = 10 + 20 * w;   // the empty seat: outline of the shapes one can become
  const si = Math.floor(t / 2200), f = ss0(Math.min(1, Math.max(0, ((t % 2200) - 1700) / 500)));
  [[si, 1 - f], [si + 1, f]].forEach(([i, a]) => { c.strokeStyle = `rgba(255,255,255,${a * (.45 + .4 * w)})`; c.beginPath(); PLAYER_SHAPES[i % PLAYER_SHAPES.length].path(c, 34); c.closePath(); c.stroke(); });
  c.restore();
  trail.push([x, y]); if (trail.length > 36) trail.shift();
  trail.forEach(([tx, ty], i) => { c.fillStyle = `rgba(255,255,255,${i / trail.length * .4})`; c.beginPath(); c.arc(tx, ty, 1 + i / 9, 0, 7); c.fill(); });
  c.save(); c.translate(x, y); c.scale(.7, .7); SHAPES.fairy(t, cast[0].color); c.restore();
  if (cast.goAt) {                                                                                    // the click: the seat flares
    const q = Math.min(1, (performance.now() - cast.goAt) / 800), g = c.createRadialGradient(SEAT[0], SEAT[1], 0, SEAT[0], SEAT[1], 40 + 900 * q * q);
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(.5, `rgba(255,255,255,${.6 * q})`); g.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = g; c.fillRect(0, 0, 960, 540);
  }
}

function frame(t) {
  drawBg(t);
  talk = Math.max(talk * .97, pulse);
  ph += Math.min(t - last, 50) * (1 + 3 * talk) * (cur ? cur.spin : 1); last = t;   // idle = 1x, talking up to 4x
  const W = cast ? 960 : SZ, H = cast && cast.title ? 540 : SZ; if (cv.width !== W) cv.width = W; if (cv.height !== H) cv.height = H;
  c.clearRect(0, 0, W, H);
  if (cast && cast.title) titleScene(t);
  else if (cast) {                                                  // conversation: closer characters stand further left, the active speaker is big and bright
    const sorted = [...cast].sort((a, b) => b.close - a.close);
    sorted.forEach((sp, i) => {
      const on = sp === cur, x = (i + .5) * W / sorted.length, sv = [talk, pulse, kick];
      if (!on) talk = pulse = kick = 0;
      c.save(); c.beginPath(); c.rect(x - 160, 0, 320, SZ); c.clip();
      c.translate(x, SZ / 2); c.scale(on ? 1 : .7, on ? 1 : .7);
      SHAPES[sp.shape](t, on && kick > .3 ? "#fff" : sp.color);
      c.restore();
      if (!on) { c.save(); c.globalCompositeOperation = "source-atop"; c.fillStyle = "rgba(11,16,38,.6)"; c.fillRect(x - 160, 0, 320, SZ); c.restore(); }
      [talk, pulse, kick] = sv;
    });
  } else if (cur) {
    c.save();
    c.translate(SZ / 2 + (Math.random() - .5) * (14 * kick + 5 * talk), SZ / 2 + (Math.random() - .5) * (14 * kick + 5 * talk));
    c.scale(1 + .3 * kick, 1 + .3 * kick);
    SHAPES[cur.shape](t, kick > .3 ? "#fff" : cur.color);   // emotion hit = white glitch
    c.restore();
  }
  pulse *= .85; kick *= .93;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
