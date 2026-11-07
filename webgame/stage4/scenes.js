// Stage 4 non-battle scenes: the party card (s4_party) for 시계지기's arrival, plus his in-battle look.
// Needs: drawBlossom, drawHexa (stage1/scenes.js), drawShardAlly (stage3/scenes.js), wrap. Globals: $, stage, act, myShape, drawShape, TAU, SPEAKERS.

function drawGearAlly(g, x, y, t, col, k = 1) {                                          // 시계지기 look: a small gear that ticks in steps
  g.save(); g.translate(x, y); g.rotate(Math.floor(t * 2) * .26 + Math.min(1, (t * 2 % 1) * 6) * .26); g.scale(k, k);
  g.strokeStyle = col; g.shadowColor = col; g.shadowBlur = 14; g.lineWidth = 2.5; g.beginPath();
  for (let i = 0; i < 16; i++) { const R = i % 2 ? 9 : 14, q = i * TAU / 16; g.lineTo(Math.cos(q) * R, Math.sin(q) * R); }
  g.closePath(); g.stroke(); g.beginPath(); g.arc(0, 0, 4, 0, TAU); g.stroke(); g.fillStyle = "#fff"; g.beginPath(); g.arc(0, 0, 1.8, 0, TAU); g.fill(); g.restore();
}

ACTS.s4_party = done => {
  stage.classList.add("pick"); act.hidden = false;
  act.innerHTML = `<canvas id="pt" width="960" height="540"></canvas>`;
  const g = $("pt").getContext("2d"), S = SPEAKERS, who = [
    { x: 100, name: "개체", role: "형태를 고른 자", c: "#9ad0ff", draw: () => { g.save(); g.translate(100, 250); drawShape(g, myShape, 26); g.restore(); } },
    { x: 290, name: "루미", role: "빠른 추격탄 · 회복", c: S.lumi.color, draw: t => drawBlossom(g, 290, 250, t, S.lumi.color, 1.9) },
    { x: 480, name: "헥사", role: "느리고 강한 사격 · 방패", c: S.hexa.color, draw: t => drawHexa(g, 480, 250, t, S.hexa.color, 1.3) },
    { x: 670, name: "글리치", role: "빠르고 강한 사격 · 유대의 빛 = 공격력 상승", c: S.glitch.color, draw: t => drawShardAlly(g, 670, 250, t, S.glitch.color, 2.6) },
    { x: 860, name: "시계지기", role: "새로운 동료 · 가볍게 많이 쏘는 사격 · 유대의 빛 = 시계의 빛", c: S.keeper.color, draw: t => drawGearAlly(g, 860, 250, t, S.keeper.color, 3.2) },
  ];
  let t = 0, last = performance.now(), raf, fin = false;
  const go = () => {
    if (t < 1.5 || fin) return; fin = true; cancelAnimationFrame(raf); removeEventListener("keydown", key);
    act.onclick = null; act.hidden = true; act.innerHTML = ""; stage.classList.remove("pick"); done();
  };
  const key = e => { if (e.code === "Space" || e.code === "Enter" || e.code === "KeyZ") { e.preventDefault(); go(); } };
  function step(now) {
    const dt = Math.min((now - last) / 1000, .05); last = now; t += dt;
    g.fillStyle = "#070b1c"; g.fillRect(0, 0, 960, 540);
    g.globalAlpha = Math.min(1, t); g.textAlign = "center"; g.textBaseline = "middle";
    g.font = "bold 40px 'Malgun Gothic'"; g.fillStyle = "#fff"; g.fillText("동료 합류! 총 4명", 480, 90);
    who.forEach((m, i) => {
      g.globalAlpha = Math.max(0, Math.min(1, t - .3 - i * .3)); m.draw(t);
      g.font = "bold 24px 'Malgun Gothic'"; g.fillStyle = m.c; g.fillText(m.name, m.x, 345);
      g.font = "14px 'Malgun Gothic'"; g.fillStyle = "#cfe"; wrap(m.role, 11).forEach((s, k) => g.fillText(s, m.x, 380 + k * 20));
    });
    g.globalAlpha = t > 1.5 ? 1 : 0; g.font = "20px 'Malgun Gothic'"; g.fillStyle = "#9ad0ff"; g.fillText("X키로 루미 → 헥사 → 글리치 → 시계지기 순환 · 클릭, SPACE 또는 Z로 계속", 480, 490);
    g.globalAlpha = 1; raf = requestAnimationFrame(step);
  }
  act.onclick = go; addEventListener("keydown", key); raf = requestAnimationFrame(step);
};
