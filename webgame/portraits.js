// Abstract motion-graphic portraits on a canvas. Called from index.html:
// setPortrait(speaker) on each line, pulsePortrait() on each blip, kickPortrait() on fx.
const cv = document.getElementById("portrait"), c = cv.getContext("2d");
const SZ = 300; cv.width = cv.height = SZ;
let cur = null, pulse = 0, kick = 0;
let ph = 0, last = 0, talk = 0;   // ph: animation phase; advances faster while talking

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
  c.shadowColor = col; c.shadowBlur = 20;
  const n = Math.floor(t / 100), thr = talk > .1 ? .45 : .85, amp = talk > .1 ? 30 : 12;
  for (let i = 0; i < 7; i++) {                                                     // slice bands, some jump sideways
    const y0 = -112 + i * 32, v = rnd(n * 7 + i), dx = v > thr ? (rnd(n + i * 3) - .5) * 2 * amp : 0;
    c.save(); c.beginPath(); c.rect(-160, y0, 320, 32); c.clip();
    c.strokeStyle = c.fillStyle = col; shardPath(dx); c.stroke(); c.globalAlpha = .2; c.fill();
    c.restore();
  }
}

const SHAPES = { orb, prism, rings, bloom, shard };

// Starfield background
const bg = document.getElementById("bg").getContext("2d");
const stars = Array.from({ length: 90 }, () => ({ x: Math.random() * 960, y: Math.random() * 540, v: .1 + Math.random() * .4, p: Math.random() * 7 }));
function drawBg(t) {
  bg.clearRect(0, 0, 960, 540);
  for (const s of stars) {
    s.y = (s.y + s.v) % 540;
    bg.fillStyle = `rgba(190,220,255,${.4 + .4 * Math.sin(t / 500 + s.p)})`;
    bg.fillRect(s.x, s.y, 2, 2);
  }
}

function frame(t) {
  drawBg(t);
  talk = Math.max(talk * .97, pulse);
  ph += Math.min(t - last, 50) * (1 + 3 * talk) * (cur ? cur.spin : 1); last = t;   // idle = 1x, talking up to 4x
  c.clearRect(0, 0, SZ, SZ);
  if (cur) {
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
