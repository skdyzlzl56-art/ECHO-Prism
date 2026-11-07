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
