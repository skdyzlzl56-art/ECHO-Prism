// Stage 6 non-battle scene: the ending (s6_title). Motion-graphic credits roll over drifting rings, then the scene fades out to black and reloads to the title.
// Holding click / SPACE / Enter / Z rolls the credits faster (no skip); release returns to normal speed. A fresh load shows the start screen.
// ACTS.s6_reveal: the fairy "Lira" dissolves into light and the four places she guided through flash up as her body (about 6.5s, auto-advances).
// Globals: $, stage, act, openScene, TAU.

ACTS.s6_title = done => {
  const roll = 22, fade = 3;                                                       // seconds: credits scroll, then black
  const credit = [["ECHO PRISM", 52], ["잃어버린 이름을 찾는 여정이 끝났습니다.", 20], ["", 0], ["에코", 26], ["루미  ·  헥사  ·  키퍼  ·  글리치  ·  목소리", 17], ["", 0], ["정원  ·  미술관  ·  도서관  ·  시계탑  ·  코어", 17], ["", 0], ["Thank you for playing", 22]];
  act.hidden = false;
  act.innerHTML = `<style>
    @keyframes creditsRoll { from { transform: translateY(100%) } to { transform: translateY(-115%) } }
    @keyframes ringPulse { from { transform: translate(-50%,-50%) scale(.2); opacity: .8 } to { transform: translate(-50%,-50%) scale(2.6); opacity: 0 } }
    @keyframes fadeOut { from { opacity: 0 } to { opacity: 1 } }
    .cr-ring { position: absolute; left: 50%; top: 50%; width: 400px; height: 400px; border: 2px solid #9a7bff; border-radius: 50%; animation: ringPulse 6s linear infinite }
    .cr-line { opacity: 0; animation: lineIn 1.2s ease-out forwards }
    @keyframes lineIn { from { opacity: 0; letter-spacing: 14px; filter: blur(6px) } to { opacity: 1; letter-spacing: 3px; filter: none } }
  </style>
  <div style="position:relative;overflow:hidden;height:100%;background:#06030f;color:#e6dcff;font-family:Galmuri11,'Malgun Gothic';text-align:center">
    ${[0, 2, 4].map(d => `<div class="cr-ring" style="animation-delay:-${d}s"></div>`).join("")}
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;gap:22px;animation:creditsRoll ${roll}s linear forwards">
      ${credit.map(([t, px], i) => `<div class="cr-line" style="font-size:${px}px;font-weight:bold;min-height:${px || 24}px;animation-delay:${i * .35}s">${t}</div>`).join("")}</div>
    <div id="fadeout" style="position:absolute;inset:0;background:#000;opacity:0;animation:fadeOut ${fade}s ease-in ${roll}s forwards"></div></div>`;
  let fin = false;
  const go = () => { if (fin) return; fin = true; location.reload(); };
  const rate = r => { if (act.getAnimations) for (const a of act.getAnimations({ subtree: true })) a.playbackRate = r; };   // credits keep their order, just faster
  const fast = e => { if (e.type === "keydown" && !(e.code === "Space" || e.code === "Enter" || e.code === "KeyZ")) return; if (e.type === "keydown") e.preventDefault(); rate(6); };
  const slow = () => rate(1);
  setTimeout(() => { act.onmousedown = fast; act.onmouseup = act.onmouseleave = slow; addEventListener("keydown", fast); addEventListener("keyup", slow); }, 1000);   // hold click / Space / Enter / Z = credits roll faster, release = normal speed
  setTimeout(go, (roll + fade + 1) * 1000);                                         // normal speed: the fade has finished, back to the title
  setTimeout(() => { const f = $("fadeout"); if (f && f.getAnimations) f.getAnimations().forEach(a => a.finished.then(go)); }, 0);   // fast speed: reload as soon as the fade is done
};

ACTS.s6_reveal = done => {
  const places = [["정원", "#7be08a"], ["미술관", "#ff9ad0"], ["도서관", "#ffd27a"], ["시계탑", "#8fb4ff"]];
  let g, t = 0;
  const scene = openScene({ html: `<canvas id="rv" width="960" height="540"></canvas>`, done, step(dt) {
    t += dt;
    g.globalAlpha = 1; g.fillStyle = "#06030f"; g.fillRect(0, 0, 960, 540); g.textAlign = "center"; g.textBaseline = "middle";
    const melt = Math.min(1, Math.max(0, (t - 1) / 1.5));                                  // 1s..2.5s: the fairy comes apart
    if (melt < 1) {                                                                        // small fairy: glowing body + two wings
      g.globalAlpha = 1 - melt; g.fillStyle = "#e6dcff"; g.beginPath(); g.arc(480, 270, 14, 0, TAU); g.fill();
      for (const d of [-1, 1]) { g.beginPath(); g.ellipse(480 + d * 22, 262 + Math.sin(t * 14) * 4, 18, 9, d * .5, 0, TAU); g.fill(); }
    }
    for (let k = 0; k < 24; k++) {                                                         // sparks drift out and become the ring
      const a = k * TAU / 24 + t * .2, r = 14 + melt * (60 + t * 40);
      g.globalAlpha = melt * Math.max(0, 1 - Math.max(0, t - 5) / 1.5); g.fillStyle = "#9a7bff"; g.beginPath(); g.arc(480 + Math.cos(a) * r, 270 + Math.sin(a) * r * .6, 3, 0, TAU); g.fill();
    }
    places.forEach(([name, col], i) => {                                                   // 2.5s..: each place lights up in turn, around the core
      const at = 2.5 + i * .8, k = Math.min(1, Math.max(0, (t - at) / .6));
      if (!k) return;
      const x = 160 + i * 213, y = 270 + Math.sin(t * 2 + i) * 8;
      g.globalAlpha = k * Math.max(0, 1 - Math.max(0, t - 5.5) / 1); g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 40 * k, 0, TAU); g.stroke();
      g.fillStyle = col; g.font = "bold 24px Galmuri11,'Malgun Gothic'"; g.fillText(name, x, y + 70);
    });
    if (t > 6.5) scene.close();
  } });
  g = $("rv").getContext("2d");
};
