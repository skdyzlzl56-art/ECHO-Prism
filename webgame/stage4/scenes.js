// Stage 4 non-battle scenes: the party card (s4_party) for 시계지기's arrival, plus his in-battle look.
// Needs: drawBlossom, drawHexa (stage1/scenes.js), drawShardAlly (stage3/scenes.js), wrap. Globals: $, stage, act, myShape, drawShape, TAU, SPEAKERS.

function drawGearAlly(g, x, y, t, col, k = 1) {                                          // 시계지기 look: a small gear that ticks in steps
  g.save(); g.translate(x, y); g.rotate(Math.floor(t * 2) * .26 + Math.min(1, (t * 2 % 1) * 6) * .26); g.scale(k, k);
  g.strokeStyle = col; g.shadowColor = col; g.shadowBlur = 14; g.lineWidth = 2.5; g.beginPath();
  for (let i = 0; i < 16; i++) { const R = i % 2 ? 9 : 14, q = i * TAU / 16; g.lineTo(Math.cos(q) * R, Math.sin(q) * R); }
  g.closePath(); g.stroke(); g.beginPath(); g.arc(0, 0, 4, 0, TAU); g.stroke(); g.fillStyle = "#fff"; g.beginPath(); g.arc(0, 0, 1.8, 0, TAU); g.fill(); g.restore();
}

ACTS.s4_party = partyCard({
  title: "동료 합류! 총 4명", nameSize: 24, roleSize: 14, wrapAt: 11, stagger: .3, hintY: 490, hint: () => fixKeys("A키로 루미 → 헥사 → 글리치 → 시계지기 순환 · 클릭, SPACE 또는 Z로 계속", MENU.keys),
  members: () => { const S = SPEAKERS; return [
    { x: 100, name: "개체", role: "형태를 고른 자", c: "#9ad0ff", draw: g => { g.save(); g.translate(100, 250); drawShape(g, myShape, 26); g.restore(); } },
    { x: 290, name: "루미", role: "빠른 추격탄 · 회복", c: S.lumi.color, draw: (g, t) => drawBlossom(g, 290, 250, t, S.lumi.color, 1.9) },
    { x: 480, name: "헥사", role: "느리고 강한 사격 · 방패", c: S.hexa.color, draw: (g, t) => drawHexa(g, 480, 250, t, S.hexa.color, 1.3) },
    { x: 670, name: "글리치", role: "빠르고 강한 사격 · 유대의 빛 = 공격력 상승", c: S.glitch.color, draw: (g, t) => drawGlitch(g, 670, 250, t, 2.6) },
    { x: 860, name: "시계지기", role: "새로운 동료 · 가볍게 많이 쏘는 사격 · 유대의 빛 = 시계의 빛", fresh: true, c: S.keeper.color, draw: (g, t) => drawGearAlly(g, 860, 250, t, S.keeper.color, 3.2) },
  ]; },
});
