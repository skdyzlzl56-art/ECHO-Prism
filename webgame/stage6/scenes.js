// Stage 6 non-battle scene: the ending (s6_title). Motion-graphic credits roll over drifting rings, then the scene fades out to black and reloads to the title.
// Holding click / SPACE / Enter / Z rolls the credits faster (no skip); release returns to normal speed. A fresh load shows the start screen.
// Globals: $, stage, act.

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
  <div style="position:relative;overflow:hidden;height:100%;background:#06030f;color:#e6dcff;font-family:Pretendard,'Malgun Gothic';text-align:center">
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
