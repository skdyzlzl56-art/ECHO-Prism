// Non-dialogue scenes. ACTS[name](done): run the scene, call done() when finished.
// Globals from index.html: $, sweep, noise. From portraits.js: setPortrait, kickPortrait.
const SAVE_KEY = "echoPrismShape";
const stage = $("stage"), act = $("act");
let myShape = PLAYER_SHAPES[0];
const HITBOX = 4; // same for every shape: shape is looks only

function drawShape(c, sh, r, col = "#fff") {
  c.save(); c.strokeStyle = c.fillStyle = col; c.shadowColor = "#4fc3ff"; c.shadowBlur = 16; c.lineWidth = 3;
  c.beginPath(); sh.path(c, r); c.globalAlpha = .25; c.fill(); c.globalAlpha = 1; c.stroke();
  c.restore();
}
const save = () => { try { localStorage.setItem(SAVE_KEY, myShape.id); } catch {} };
const load = () => { try { return localStorage.getItem(SAVE_KEY); } catch { return null; } };

const ACTS = {};

// ---- 도형 고르기 ----
ACTS.pick = done => {
  stage.classList.add("pick"); act.hidden = false;
  act.innerHTML = `<div class="pk"><h2>형태를 고르세요</h2><canvas id="pv" width="180" height="180"></canvas>
    <h3 id="pn"></h3><p id="pd"></p><div id="cards"></div><button id="ok">결정</button></div>`;
  let sel = Math.max(0, PLAYER_SHAPES.findIndex(s => s.id === load())), raf, fin = false;
  const cards = PLAYER_SHAPES.map((sh, i) => {
    const d = document.createElement("div"); d.className = "card";
    const cv = document.createElement("canvas"); cv.width = cv.height = 56; d.append(cv);
    const g = cv.getContext("2d"); g.translate(28, 28); drawShape(g, sh, 16);
    d.onclick = () => { select(i); sweep(500 + i * 60, 700 + i * 60, .1, "square", .08); };
    $("cards").append(d); return d;
  });
  const select = i => {
    sel = i; cards.forEach((d, k) => d.classList.toggle("on", k === i));
    $("pn").textContent = PLAYER_SHAPES[i].name; $("pd").textContent = PLAYER_SHAPES[i].desc;
  };
  const pc = $("pv").getContext("2d");
  const loop = t => {
    pc.clearRect(0, 0, 180, 180); pc.save(); pc.translate(90, 90);
    pc.rotate(Math.sin(t / 600) * .15); const s = 1 + .06 * Math.sin(t / 250); pc.scale(s, s);
    drawShape(pc, PLAYER_SHAPES[sel], 50); pc.restore(); raf = requestAnimationFrame(loop);
  };
  const confirm = () => {
    if (fin) return; fin = true; myShape = PLAYER_SHAPES[sel]; save();
    sweep(300, 1200, .5, "sine", .3); cancelAnimationFrame(raf); removeEventListener("keydown", key);
    act.hidden = true; act.innerHTML = ""; stage.classList.remove("pick"); done();
  };
  const key = e => {
    const k = e.code;
    if (k === "ArrowLeft" || k === "KeyA") select((sel + PLAYER_SHAPES.length - 1) % PLAYER_SHAPES.length);
    else if (k === "ArrowRight" || k === "KeyD") select((sel + 1) % PLAYER_SHAPES.length);
    else if (k === "Enter" || k === "Space") { e.preventDefault(); confirm(); }
  };
  $("ok").onclick = confirm; addEventListener("keydown", key); select(sel); raf = requestAnimationFrame(loop);
};

// ---- 첫 전투: 탄막 회피 30초 ----
ACTS.battle = done => {
  stage.classList.add("battle"); act.hidden = false; setPortrait(SPEAKERS.glitch);
  act.innerHTML = `<canvas id="ar" width="960" height="540"></canvas>`;
  const g = $("ar").getContext("2d"), BOX = { x: 330, y: 190, w: 300, h: 260 }, WIN_T = 30, MAX_HP = 20;
  const cx = BOX.x + BOX.w / 2, ox = cx, oy = BOX.y - 50;           // bullet origin: above the box top edge
  const keys = {}, p = { x: cx, y: BOX.y + BOX.h * .75 };
  let bullets = [], hp = MAX_HP, inv = 0, t = 0, a1 = 0, a2 = 0, a3 = 0, last = performance.now(), raf, over = null;

  const kd = e => { keys[e.code] = true; if (e.code.startsWith("Arrow")) e.preventDefault(); };
  const ku = e => { keys[e.code] = false; };
  const cleanup = () => { cancelAnimationFrame(raf); removeEventListener("keydown", kd); removeEventListener("keyup", ku); act.onclick = null; };
  const end = () => { cleanup(); act.hidden = true; act.innerHTML = ""; stage.classList.remove("battle"); done(); };

  const add = (x, y, ang, sp) => bullets.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: 6 });

  function update(dt) {
    const dx = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
    const dy = (keys.ArrowDown || keys.KeyS ? 1 : 0) - (keys.ArrowUp || keys.KeyW ? 1 : 0);
    const n = Math.hypot(dx, dy) || 1, m = 10;
    p.x = Math.min(BOX.x + BOX.w - m, Math.max(BOX.x + m, p.x + dx / n * 190 * dt));
    p.y = Math.min(BOX.y + BOX.h - m, Math.max(BOX.y + m, p.y + dy / n * 190 * dt));
    t += dt; inv -= dt;
    if (t > 1) {                                                       // 1s grace, then three overlapping patterns
      a1 += dt; if (a1 > (t < 10 ? .22 : .4)) { a1 = 0; add(BOX.x + Math.random() * BOX.w, BOX.y - 12, Math.PI / 2, 130 + Math.random() * 40); }
      if (t > 10) { a2 += dt; if (a2 > .7) { a2 = 0; add(ox, oy, Math.atan2(p.y - oy, p.x - ox), 170); } }
      if (t > 20) { a3 += dt; if (a3 > 1.2) { a3 = 0; for (let i = -3; i <= 3; i++) add(ox, oy, Math.PI / 2 + i * .3, 120); } }
    }
    for (const b of bullets) { b.x += b.vx * dt; b.y += b.vy * dt; }
    bullets = bullets.filter(b => b.y < BOX.y + BOX.h + 20 && b.y > BOX.y - 120 && b.x > BOX.x - 40 && b.x < BOX.x + BOX.w + 40);
    if (inv <= 0) {
      const i = bullets.findIndex(b => Math.hypot(b.x - p.x, b.y - p.y) < b.r + HITBOX);
      if (i >= 0) { bullets.splice(i, 1); hp -= 4; inv = 1; noise(.1, .5); sweep(300, 80, .2, "square", .3); kickPortrait(); }
    }
    if (hp <= 0) { over = "lose"; noise(.5, .5); sweep(400, 40, 1, "sawtooth", .3); setTimeout(() => { act.onclick = () => { cleanup(); ACTS.battle(done); }; }, 600); }
    else if (t >= WIN_T) { over = "win"; sweep(300, 1500, .8, "sine", .3); setTimeout(end, 1200); }
  }

  function draw() {
    g.clearRect(0, 0, 960, 540); g.fillStyle = "rgba(0,0,20,.7)"; g.fillRect(BOX.x, BOX.y, BOX.w, BOX.h);
    g.save(); g.beginPath(); g.rect(BOX.x, BOX.y, BOX.w, BOX.h); g.clip();
    g.fillStyle = "#ff3b5c"; g.shadowColor = "#ff3b5c"; g.shadowBlur = 10;
    for (const b of bullets) { g.beginPath(); g.arc(b.x, b.y, b.r, 0, TAU); g.fill(); }
    g.restore();
    if (over !== "lose" && (inv <= 0 || Math.floor(inv * 12) % 2)) {   // blink while invulnerable
      g.save(); g.translate(p.x, p.y); drawShape(g, myShape, 11); g.fillStyle = "#fff"; g.beginPath(); g.arc(0, 0, 2.5, 0, TAU); g.fill(); g.restore();
    }
    g.strokeStyle = "#fff"; g.lineWidth = 4; g.strokeRect(BOX.x, BOX.y, BOX.w, BOX.h);
    g.fillStyle = "#fff"; g.font = "20px 'Malgun Gothic'"; g.textBaseline = "middle";
    g.fillText(`HP ${Math.max(hp, 0)} / ${MAX_HP}`, BOX.x, 485);
    g.fillStyle = "#333"; g.fillRect(BOX.x + 130, 475, 170, 20); g.fillStyle = "#ffd84f"; g.fillRect(BOX.x + 130, 475, 170 * Math.max(hp, 0) / MAX_HP, 20);
    g.fillStyle = "#9ad0ff"; g.textAlign = "right"; g.fillText(`버티기 ${Math.min(Math.ceil(t), WIN_T)} / ${WIN_T}`, BOX.x + BOX.w, 515); g.textAlign = "left";
    if (over) {
      g.textAlign = "center"; g.font = "bold 56px 'Malgun Gothic'"; g.fillStyle = over === "win" ? "#9ad0ff" : "#ff3b5c";
      g.fillText(over === "win" ? "버텼다!" : "GAME OVER", 480, 320);
      if (over === "lose" && act.onclick) { g.font = "22px 'Malgun Gothic'"; g.fillStyle = "#fff"; g.fillText("클릭하여 재도전", 480, 375); }
      g.textAlign = "left";
    }
  }

  function step(now) {
    const dt = Math.min((now - last) / 1000, .05); last = now;
    if (!over) update(dt);
    draw(); raf = requestAnimationFrame(step);
  }
  addEventListener("keydown", kd); addEventListener("keyup", ku); raf = requestAnimationFrame(step);
};
