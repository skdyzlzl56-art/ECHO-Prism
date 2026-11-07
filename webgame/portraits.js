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

const SHAPES = { orb, prism, rings, bloom, shard, fairy, easel, gear };

// Starfield background
const bg = document.getElementById("bg").getContext("2d");
const stars = Array.from({ length: 90 }, () => ({ x: Math.random() * 960, y: Math.random() * 540, v: .1 + Math.random() * .4, p: Math.random() * 7 }));
// Stage 1 swaps to a warm lantern sky (embers rise) via warp(): stars streak out from the centre, then the theme flips mid-flash.
// vx / vy: star drift per frame (x star speed); streak: draw stars as trails of that length. "flee" rushes everything leftwards, as if running right.
const THEMES = {
  night:   { sky: "linear-gradient(#1b2a5a,#0b1026)", rgb: "190,220,255", vx: 0,   vy: 1 },
  lantern: { sky: "linear-gradient(#5a2e1b,#140a0a)", rgb: "255,196,110", vx: 0,   vy: -1 },
  silence: { sky: "linear-gradient(#1c2a33,#06090d)", rgb: "170,190,205", vx: .25, vy: .6 },          // cold, still, slow snow
  gallery: { sky: "linear-gradient(#2b2f35,#0c0d10)", rgb: "190,195,205", vx: .1, vy: .3 },            // washed-out grey, slow drifting dust
  clocktower: { sky: "linear-gradient(#3a2d17,#0d0a06)", rgb: "230,200,130", vx: 0, vy: .15 },     // stopped brass hours, dust hanging in the air
  flee:    { sky: "linear-gradient(#3d0f1c,#0a0306)", rgb: "255,120,130", vx: -22, vy: 0, streak: 5 }, // red alarm sky, stars streak past
};
let theme = THEMES.night, warpMs = 0, lastBg = 0;
function setTheme(to) { theme = THEMES[to]; document.getElementById("stage").style.background = theme.sky; }
function warp(to = "lantern") { warpMs = 1800; setTimeout(() => setTheme(to), 900); }
function drawBg(t) {
  const dt = Math.min(t - lastBg, 50); lastBg = t;
  bg.clearRect(0, 0, 960, 540);
  const w = warpMs > 0 ? Math.sin(Math.PI * warpMs / 1800) : 0;   // 0 -> 1 (mid-warp) -> 0
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

function frame(t) {
  drawBg(t);
  talk = Math.max(talk * .97, pulse);
  ph += Math.min(t - last, 50) * (1 + 3 * talk) * (cur ? cur.spin : 1); last = t;   // idle = 1x, talking up to 4x
  const W = cast ? 960 : SZ; if (cv.width !== W) cv.width = W;
  c.clearRect(0, 0, W, SZ);
  if (cast) {                                                  // conversation: closer characters stand further left, the active speaker is big and bright
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
