// Stage 1 non-battle scenes: lamp exploration (s1_explore) and the party card (s1_party).
// Needs: $, sweep, noise, retrigger, stage, act, myShape, drawShape, TAU, SPEAKERS.

function drawBlossom(g, x, y, t, col, k = 1) {                                         // companion look: rotating petals
  g.save(); g.translate(x, y); g.scale(k, k); g.strokeStyle = col; g.shadowColor = col; g.shadowBlur = 14; g.lineWidth = 2;
  for (let i = 0; i < 6; i++) { const a = t * 1.5 + i * Math.PI / 3; g.beginPath(); g.arc(Math.cos(a) * 9, Math.sin(a) * 9, 7, 0, TAU); g.stroke(); }
  g.fillStyle = "#fff"; g.beginPath(); g.arc(0, 0, 3, 0, TAU); g.fill(); g.restore();
}
function drawHexa(g, x, y, t, col, k = 1) {                                             // guardian look: pulsing hexagons
  g.save(); g.translate(x, y); g.strokeStyle = col; g.shadowColor = col; g.shadowBlur = 16; g.lineWidth = 3 * k;
  for (let i = 0; i < 3; i++) {
    const q = (t / 2 + i / 3) % 1, r = (10 + 24 * q) * k; g.globalAlpha *= 1 - q; g.beginPath();
    for (let j = 0; j < 6; j++) g.lineTo(Math.cos(j * 1.047 + .52) * r, Math.sin(j * 1.047 + .52) * r);
    g.closePath(); g.stroke(); g.globalAlpha /= 1 - q || 1;
  }
  g.fillStyle = col; g.beginPath(); for (let j = 0; j < 6; j++) g.lineTo(Math.cos(j * 1.047 + .52) * 9 * k, Math.sin(j * 1.047 + .52) * 9 * k); g.fill(); g.restore();
}
function drawFairy(g, x, y, t, col, k = 1) {                                            // guide look: tiny glowing fairy with fluttering wings
  g.save(); g.translate(x, y + Math.sin(t * 3) * 3); g.scale(k, k); g.shadowColor = col; g.shadowBlur = 14; g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 1.5;
  const f = Math.sin(t * 22) * .25;
  for (const s of [-1, 1]) for (const [len, rot] of [[15, -.6], [10, .5]]) {
    g.save(); g.scale(s, 1); g.rotate(rot * (1 + f)); g.translate(len / 2 + 2, 0); g.globalAlpha = .25; g.beginPath(); g.ellipse(0, 0, len / 2, 5, 0, 0, TAU); g.fill();
    g.globalAlpha = .8; g.stroke(); g.restore();
  }
  g.globalAlpha = 1; g.fillStyle = "#fff"; g.beginPath(); g.arc(0, 0, 3.5, 0, TAU); g.fill(); g.restore();
}
const wrap = (s, n) => { const o = []; for (let i = 0; i < s.length; i += n) o.push(s.slice(i, i + n)); return o; };

// ---- 등불 켜기: 긴 회랑을 걸으며(화면 3배) 등불 세 개에 불을 붙인다. 균열과 낙뢰를 피하고, 체력이 0이 되면 마지막 등불 곁에서 다시 시작. 대화는 아래 상자 (explore.js) ----
ACTS.s1_explore = done => runExplore({
  worldW: 3200, bond: 1, label: "등불", hint: "이동: 방향키 · 꺼진 등불 곁에 서 있으면 불이 붙어요 · 균열과 낙뢰를 피하세요!",
  floor: { bg: "#070b1c", fill: "#0e1634", stroke: "#2a3a78" },
  spots: [
    { x: 900, y: 290, mem: "비 오는 날, 문 앞에서 떨던 어린 등불지기에게 커다란 육각형이 다가와 말없이 우산이 되어 주었다." },
    { x: 1750, y: 330, mem: "'나는 문을 지킬게. 너는 길을 밝혀.' 두 그림자가 나란히 서서 첫 약속을 했다." },
    { x: 2550, y: 270, mem: "문이 갈라지던 밤. 육각형은 혼자 봉인을 붙든 채 말했다. '루미, 도망쳐. 불이... 꺼지지 않게...'" },
  ],
  door: { x: 3100, y: 295 }, wisps: { n: 6, color: "#ff3b5c", speed: 120 }, beams: true,
  talks: [
    { x: 150, who: "lumi", text: "여기가 등불 회랑이야. 예전에는 천장까지 불이 가득해서 밤에도 대낮 같았어." },
    { x: 420, who: "voice", text: "공기가 떨려요. 저 붉은 균열들이 아직 살아서 돌아다니고 있어요. 닿지 않게 조심해요." },
    { x: 700, who: "lumi", text: "저기 첫 번째 등불이야! 가까이 서 있으면 내 힘으로 불이 붙어!" },
    { x: 1200, who: "voice", text: "기억이 켜질 때마다 길이 조금씩 밝아져요. 처음엔 작은 불이어도 괜찮아요." },
    { x: 1450, who: "lumi", text: "헥사는 원래 이렇지 않았어. 비 오는 날엔 늘 문 앞에서 나한테 우산을 씌워 줬거든." },
    { x: 1650, who: "voice", text: "붉은 번개는 내리기 전에 줄이 먼저 깜빡여요. 줄이 보이면 옆으로 비켜요!" },
    { x: 2000, who: "lumi", text: "무서워도 괜찮아. 우리 둘이잖아. 아니, 셋이네! 요정도 있으니까!" },
    { x: 2300, who: "voice", text: "헥사의 기척이 느껴져요. ......많이 아파하고 있어요." },
    { x: 2750, who: "lumi", text: "마지막 등불이 바로 앞이야. 이걸 켜면 문이 열릴 거야. 조금만 더!" },
  ],
  allLit: [{ who: null, text: "끼이이이... 회랑 끝의 문이 열렸다. 균열이 물러간다." }, { who: "lumi", text: "다 켜졌다! 오른쪽 끝 문으로 가자. 헥사가 기다리고 있을 거야." }],
  revive: { who: "voice", text: "괜찮아요? 마지막으로 켠 등불 곁으로 돌아왔어요. 천천히, 다시 가요." },
  hurtLine: { who: "lumi", text: "많이 다쳤어! 조심해! 등불을 하나 켜면 힘이 조금 돌아와!" },
  wall(g, t, cam, spots) {                                                             // arched pillars along the whole corridor
    for (let x = 40; x < 3200; x += 160) {
      g.strokeStyle = "#1a2552"; g.lineWidth = 3; g.beginPath(); g.moveTo(x, 190); g.lineTo(x, 70); g.arc(x + 80, 70, 80, Math.PI, 0); g.lineTo(x + 160, 190); g.stroke();
    }
    g.globalAlpha = .5 + .3 * Math.sin(t * 7); g.strokeStyle = "#ff3b5c"; g.lineWidth = 2;   // cracks leaking pink glitch light on the floor
    for (let x = 300; x < 3000; x += 380) { g.beginPath(); g.moveTo(x, 230); g.lineTo(x + 40, 270); g.lineTo(x + 20, 310); g.stroke(); }
    g.globalAlpha = 1;
  },
  drawSpot(g, l, t) {                                                                   // lamp + charge ring
    const r = l.lit ? Math.min(1, l.lit * 2) : 0;
    if (r) { const gr = g.createRadialGradient(l.x, l.y - 30, 0, l.x, l.y - 30, 150); gr.addColorStop(0, `rgba(255,230,160,${.65 * r})`); gr.addColorStop(1, "rgba(255,200,100,0)"); g.fillStyle = gr; g.beginPath(); g.arc(l.x, l.y - 30, 150, 0, TAU); g.fill(); }
    else {
      g.strokeStyle = "rgba(255,230,160,.25)"; g.lineWidth = 2; g.setLineDash([6, 8]); g.beginPath(); g.arc(l.x, l.y, 56, 0, TAU); g.stroke(); g.setLineDash([]);
      if (l.ch > 0) { g.strokeStyle = "#ffe08a"; g.lineWidth = 5; g.shadowColor = "#ffd87a"; g.shadowBlur = 14; g.beginPath(); g.arc(l.x, l.y, 56, -Math.PI / 2, -Math.PI / 2 + TAU * l.ch); g.stroke(); g.shadowBlur = 0; }
    }
    g.strokeStyle = r ? "#ffe9a8" : "#3a4672"; g.lineWidth = 4; g.beginPath(); g.moveTo(l.x, l.y + 20); g.lineTo(l.x, l.y - 24); g.stroke();
    g.fillStyle = r ? "#fff4cf" : "#2a3358"; g.shadowColor = "#ffd87a"; g.shadowBlur = r ? 20 : 0; g.beginPath(); g.arc(l.x, l.y - 34, 11, 0, TAU); g.fill(); g.shadowBlur = 0;
  },
}, done);

// ---- 동료 카드: 합류한 동료를 보여준다 ----
ACTS.s1_party = done => {
  stage.classList.add("pick"); act.hidden = false;
  act.innerHTML = `<canvas id="pt" width="960" height="540"></canvas>`;
  const g = $("pt").getContext("2d"), who = [
    { x: 220, name: "개체", role: "형태를 고른 자", c: "#9ad0ff", draw: () => { g.save(); g.translate(220, 250); drawShape(g, myShape, 34); g.restore(); } },
    { x: 480, name: "루미", role: "등불지기 · 전투 지원(추격탄·회복)", c: SPEAKERS.lumi.color, draw: t => drawBlossom(g, 480, 250, t, SPEAKERS.lumi.color, 2.6) },
    { x: 740, name: "헥사", role: "문지기 · 새로운 동료", c: SPEAKERS.hexa.color, draw: t => drawHexa(g, 740, 250, t, SPEAKERS.hexa.color, 1.8) },
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
    g.font = "bold 40px Galmuri11,'Malgun Gothic'"; g.fillStyle = "#fff"; g.fillText("동료 합류!", 480, 90);
    who.forEach((m, i) => {
      g.globalAlpha = Math.max(0, Math.min(1, t - .3 - i * .35)); m.draw(t);
      g.font = "bold 28px Galmuri11,'Malgun Gothic'"; g.fillStyle = m.c; g.fillText(m.name, m.x, 345);
      g.font = "16px Galmuri11,'Malgun Gothic'"; g.fillStyle = "#cfe"; g.fillText(m.role, m.x, 380);
    });
    g.globalAlpha = t > 1.5 ? 1 : 0; g.font = "20px Galmuri11,'Malgun Gothic'"; g.fillStyle = "#9ad0ff"; g.fillText("클릭, SPACE 또는 Z로 계속", 480, 480);
    g.globalAlpha = 1; raf = requestAnimationFrame(step);
  }
  act.onclick = go; addEventListener("keydown", key); raf = requestAnimationFrame(step);
};
