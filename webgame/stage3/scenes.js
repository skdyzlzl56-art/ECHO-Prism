// Stage 3 non-battle scenes: painting restoration (s3_explore) and the party card (s3_party).
// Needs (stage1/scenes.js): drawBlossom, drawHexa, drawFairy, wrap. Globals: $, sweep, noise, retrigger, stage, act, myShape, drawShape, TAU, SPEAKERS, BOND.

// 화랑: 긴 복도(화면 3배)를 걸으며 잿빛 그림 세 점의 색을 되살린다. 얼룩에 닿으면 체력이 줄고, 대화는 아래 상자 (explore.js). 그림은 벽(위)에, 서는 자리는 바닥(아래)에 있어 대화창에 가려지지 않는다.
ACTS.s3_explore = done => runExplore({
  worldW: 3200, bond: 2, label: "그림", hint: "이동: 방향키 · 그림 앞 바닥에 서 있으면 색이 돌아와요 · 잿빛 얼룩을 피하세요!",
  floor: { bg: "#14171c", fill: "#23282f", stroke: "#4a5360" },
  spots: [
    { x: 800, y: 300, c: ["#3a6fd8", "#9ad0ff"], mem: "새벽의 바다. 파도가 오기 전부터 물빛을 알아보던 누군가의 눈." },
    { x: 1650, y: 330, c: ["#ff7a45", "#ffd36b"], mem: "옥상의 석양. 부르는 사람 없이도 올라가 앉던 자리." },
    { x: 2500, y: 290, c: ["#ff6fa8", "#ffe4a0"], mem: "웃는 얼굴 하나. 아무도 앞에 없는데, 누군가 앞에 있다고 믿으며 그린." },
  ],
  door: null, wisps: { n: 6, color: "#9aa5b1", speed: 100 }, beams: false,
  talks: [
    { x: 150, who: "voice", text: "여기가 화랑이에요. 벽에 걸린 그림마다 누군가의 기억이 들어 있었어요." },
    { x: 450, who: "lumi", text: "그림들이 전부 잿빛이야... 색이 있던 자리가 텅 비어 버렸어." },
    { x: 650, who: "hexa", text: "......얼룩이 떠다닌다. 닿으면 모아 둔 색이 바랜다. 조심해라." },
    { x: 1050, who: "voice", text: "빈 액자들은 아직 주인을 기다리는 거예요. 그림이 돌아오면 같이 채워질지도 몰라요." },
    { x: 1300, who: "lumi", text: "화가는 왜 색을 지웠을까? 그림을 이렇게나 좋아했는데..." },
    { x: 1500, who: "hexa", text: "......그린 이의 손이 떨린 흔적이 있다. 지운 것이 아니라 숨긴 것일지도 모른다." },
    { x: 1950, who: "voice", text: "남은 색이 아주 희미하게 느껴져요. 그림 앞에 서서 가만히 기다려 주세요." },
    { x: 2250, who: "lumi", text: "바닥에 물감 얼룩이 있어! 발자국도... 누가 여기서 오래 서 있었나 봐." },
    { x: 2800, who: "hexa", text: "......끝이 가깝다. 마지막 그림이 가장 오래 걸릴지도 모른다." },
  ],
  allLit: [{ who: null, text: "세 점의 그림에 색이 돌아왔다. 벽 끝에서 누군가의 기척이 느껴진다." }],
  revive: { who: "voice", text: "괜찮아요? 마지막으로 색을 되살린 그림 곁으로 돌아왔어요. 천천히 다시 가요." },
  hurtLine: { who: "lumi", text: "많이 다쳤어! 그림 하나를 되살리면 힘이 조금 돌아와!" },
  wall(g, t, cam, spots) {                                                             // back wall (y 70-190): frames hang here, well above the dialogue box
    g.fillStyle = "#1b1f26"; g.fillRect(30, 70, 3140, 120);
    for (let x = 100; x < 3200; x += 120) { g.fillStyle = "#14171c"; g.fillRect(x, 70, 6, 120); }
    for (let x = 340; x < 3100; x += 420) { g.fillStyle = "#2d333b"; g.fillRect(x - 40, 95, 80, 60); g.strokeStyle = "#566070"; g.lineWidth = 3; g.strokeRect(x - 40, 95, 80, 60); }   // empty frames
    for (const o of spots) {
      const r = o.lit ? Math.min(1, o.lit * 1.5) : 0, y = 130;
      g.fillStyle = "#3a3f47"; g.fillRect(o.x - 60, y - 45, 120, 90);
      if (r) { const gr = g.createLinearGradient(o.x, y - 45, o.x, y + 45); gr.addColorStop(0, o.c[0]); gr.addColorStop(1, o.c[1]); g.globalAlpha = r; g.fillStyle = gr; g.fillRect(o.x - 60, y - 45, 120, 90); g.globalAlpha = 1; }
      g.strokeStyle = r ? "#ffe9a8" : "#7c8591"; g.lineWidth = 4; g.strokeRect(o.x - 60, y - 45, 120, 90);
    }
  },
  drawSpot(g, o, t) {                                                                   // ring on the floor in front of the picture
    if (o.lit) return;
    g.strokeStyle = "rgba(220,230,240,.25)"; g.lineWidth = 2; g.setLineDash([6, 8]); g.beginPath(); g.arc(o.x, o.y, 56, 0, TAU); g.stroke(); g.setLineDash([]);
    if (o.ch > 0) { g.strokeStyle = o.c[1]; g.lineWidth = 5; g.shadowColor = o.c[1]; g.shadowBlur = 14; g.beginPath(); g.arc(o.x, o.y, 56, -Math.PI / 2, -Math.PI / 2 + TAU * o.ch); g.stroke(); g.shadowBlur = 0; }
  },
}, done);

function drawShardAlly(g, x, y, t, col, k = 1) {                                        // 글리치 look: jittering shard
  g.save(); g.translate(x, y); g.rotate(t * .8); g.scale(k, k); g.strokeStyle = col; g.shadowColor = col; g.shadowBlur = 14; g.lineWidth = 2.5;
  g.beginPath(); [14, 5, 12, 4, 15, 5, 11].forEach((R, j, a) => g.lineTo(Math.cos(j * TAU / a.length) * R + (Math.random() - .5), Math.sin(j * TAU / a.length) * R)); g.closePath(); g.stroke();
  g.fillStyle = "#fff"; g.beginPath(); g.arc(0, 0, 2.5, 0, TAU); g.fill(); g.restore();
}

// Three crescent blades on a tilted orbit (3D): far ones are smaller and fainter, near ones larger and brighter; each blade also tumbles on its own axis. Drawn far -> near.
function drawTomoeBlades(g, R, r, spin, lw) {
  const tilt = 1.0, yaw = spin * .35, blades = [0, 1, 2].map(i => {
    const a = spin + i * TAU / 3, x0 = Math.cos(a) * R, y0 = Math.sin(a) * R, y1 = y0 * Math.cos(tilt), z1 = y0 * Math.sin(tilt);
    return { x: x0 * Math.cos(yaw) + z1 * Math.sin(yaw), y: y1, z: (-x0 * Math.sin(yaw) + z1 * Math.cos(yaw)) / R, a, i };
  }).sort((p, q) => p.z - q.z);
  for (const b of blades) {
    g.save(); g.translate(b.x, b.y); g.rotate(Math.atan2(b.y, b.x)); g.scale(1 + .35 * b.z, (1 + .35 * b.z) * (.35 + .65 * Math.abs(Math.cos(b.a * 1.5 + b.i))));   // tumbling
    g.globalAlpha = .6 + .4 * (b.z + 1) / 2; g.lineWidth = lw * (1 + .3 * b.z);
    g.beginPath(); g.arc(0, 0, r, 1, 4.6); g.stroke(); g.restore();
  }
  g.globalAlpha = 1;
}
function drawTomoeAlly(g, x, y, t, col, k = 1) {                                        // 글리치 new look: three crescent blades orbiting in 3D round a sharp core
  g.save(); g.translate(x, y); g.scale(k, k); g.strokeStyle = g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 14;
  drawTomoeBlades(g, 13, 6, t * 2.2, 2.5);
  g.beginPath(); g.moveTo(0, -7); g.lineTo(4, 0); g.lineTo(0, 7); g.lineTo(-4, 0); g.closePath(); g.fill();
  g.restore();
}

function drawGlitch(g, x, y, t, k) {                                                    // current look: jagged shard, or (after s3_morph) crescent blades
  if (SPEAKERS.glitch.shape === "shard") drawShardAlly(g, x, y, t, SPEAKERS.glitch.color, k); else drawTomoeAlly(g, x, y, t, SPEAKERS.glitch.color, k);
}

// ---- 변신: 글리치의 각진 파편이 부서졌다가 따뜻한 새 모습으로 다시 모인다 (about 4s, auto-advances) ----
ACTS.s3_morph = done => {
  let g, t = 0, swapped = false; const NEW = FORMS.glitch.calm.color, OLD = SPEAKERS.glitch.color;
  const scene = openScene({ html: `<canvas id="mf" width="960" height="540"></canvas>`, done, step(dt) {
    t += dt;
    g.globalAlpha = 1; g.fillStyle = "#070b1c"; g.fillRect(0, 0, 960, 540); g.textAlign = "center"; g.textBaseline = "middle";
    if (t < 1.6) { g.globalAlpha = 1 - t / 1.6 * .3; drawShardAlly(g, 480, 250, t * (1 + t * 4), OLD, 3 + t * 2); }                  // old shard spins up and jitters
    else if (t < 2.4) {                                                                 // flash: sparks fly out
      g.globalAlpha = 1 - (t - 1.6) / .8; g.strokeStyle = "#fff"; g.lineWidth = 3;
      for (let k = 0; k < 14; k++) { const a = k * TAU / 14, r = 20 + (t - 1.6) * 420; g.beginPath(); g.moveTo(480 + Math.cos(a) * r, 250 + Math.sin(a) * r); g.lineTo(480 + Math.cos(a) * (r + 30), 250 + Math.sin(a) * (r + 30)); g.stroke(); }
    } else {
      if (!swapped) { swapped = true; applyForm("glitch", "calm"); }
      g.globalAlpha = Math.min(1, t - 2.4); drawTomoeAlly(g, 480, 250, t, NEW, 6);
      g.font = "bold 30px Galmuri11,'Malgun Gothic'"; g.fillStyle = NEW; g.fillText("글리치", 480, 345);
    }
    if (t > 4.2) scene.close();
  } });
  g = $("mf").getContext("2d");
};

// ---- 동료 카드: 글리치 합류 ----
ACTS.s3_party = partyCard({
  title: "동료 합류!", nameSize: 26, roleSize: 14, wrapAt: 12, hintY: 490,
  members: () => { const S = SPEAKERS; return [
    { x: 150, name: "개체", role: "형태를 고른 자", c: "#9ad0ff", draw: g => { g.save(); g.translate(150, 250); drawShape(g, myShape, 30); g.restore(); } },
    { x: 380, name: "루미", role: "빠른 추격탄 · 회복", c: S.lumi.color, draw: (g, t) => drawBlossom(g, 380, 250, t, S.lumi.color, 2.2) },
    { x: 610, name: "헥사", role: "느리고 강한 사격 · 방패", c: S.hexa.color, draw: (g, t) => drawHexa(g, 610, 250, t, S.hexa.color, 1.5) },
    { x: 830, name: "글리치", role: "새로운 동료 · 빠르고 강한 사격 · 유대의 빛 = 공격력 상승", fresh: true, c: S.glitch.color, draw: (g, t) => drawGlitch(g, 830, 250, t, 3) },
  ]; },
});
