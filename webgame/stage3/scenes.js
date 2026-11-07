// Stage 3 non-battle scenes: painting restoration (s3_explore) and the party card (s3_party).
// Needs (stage1/scenes.js): drawBlossom, drawHexa, drawFairy, wrap. Globals: $, sweep, noise, retrigger, stage, act, myShape, drawShape, TAU, SPEAKERS, BOND.

const PAINTS = [   // x, y, restored colours, memory shown when restored
  { x: 210, y: 330, c: ["#3a6fd8", "#9ad0ff"], mem: "새벽의 바다. 파도가 오기 전부터 물빛을 알아보던 누군가의 눈." },
  { x: 480, y: 270, c: ["#ff7a45", "#ffd36b"], mem: "옥상의 석양. 부르는 사람 없이도 올라가 앉던 자리." },
  { x: 750, y: 350, c: ["#ff6fa8", "#ffe4a0"], mem: "웃는 얼굴 하나. 아무도 앞에 없는데, 누군가 앞에 있다고 믿으며 그린." },
];

ACTS.s3_explore = done => {
  stage.classList.add("pick"); act.hidden = false;
  act.innerHTML = `<canvas id="ex" width="960" height="540"></canvas>`;
  const g = $("ex").getContext("2d"), keys = {}, FL = { x: 30, y: 210, w: 900, h: 250 };
  const pics = PAINTS.map(o => ({ ...o, lit: 0, ch: 0 }));
  const blots = Array.from({ length: 3 }, (_, i) => ({ x: 200 + i * 250, y: 260 + i * 40, vx: i % 2 ? 110 : -110, vy: 70 + i * 20, r: 13 }));
  const p = { x: 90, y: 340 }, lu = { x: 50, y: 340 }, fa = { x: 120, y: 310 };
  let t = 0, last = performance.now(), raf, msg = null, inv = 0, fin = false;
  const kd = e => { keys[e.code] = true; if (e.code.startsWith("Arrow") || e.code === "Space") e.preventDefault(); };
  const ku = e => { keys[e.code] = false; };
  const end = () => {
    cancelAnimationFrame(raf); removeEventListener("keydown", kd); removeEventListener("keyup", ku);
    BOND.base = Math.max(BOND.base, 2);                                                // restoring the colours together = bond Lv.2 at least
    act.hidden = true; act.innerHTML = ""; stage.classList.remove("pick"); done();
  };
  const hurt = () => {                                                                 // a grey blot: the colour you were gathering fades again
    if (inv > 0) return; inv = 1.2; for (const o of pics) if (!o.lit) o.ch = 0;
    noise(.15, .6); sweep(300, 80, .25, "square", .3); retrigger($("flash"), "on", 300); retrigger(stage, "shake", 300);
    msg = { s: "잿빛 얼룩에 닿았다! 모아 둔 색이 바랬다.", age: 3.8 };
  };
  function update(dt) {
    const dx = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
    const dy = (keys.ArrowDown || keys.KeyS ? 1 : 0) - (keys.ArrowUp || keys.KeyW ? 1 : 0), n = Math.hypot(dx, dy) || 1;
    inv -= dt;
    if (!fin) { p.x = Math.min(FL.x + FL.w - 14, Math.max(FL.x + 14, p.x + dx / n * 190 * dt)); p.y = Math.min(FL.y + FL.h - 14, Math.max(FL.y + 14, p.y + dy / n * 190 * dt)); }
    lu.x += (p.x - 46 - lu.x) * Math.min(1, dt * 4); lu.y += (p.y + 6 - lu.y) * Math.min(1, dt * 4);
    fa.x += (p.x + 30 - fa.x) * Math.min(1, dt * 5); fa.y += (p.y - 34 - fa.y) * Math.min(1, dt * 5);
    if (!fin) for (const b of blots) {
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < FL.x + b.r || b.x > FL.x + FL.w - b.r) { b.vx *= -1; b.x = Math.min(FL.x + FL.w - b.r, Math.max(FL.x + b.r, b.x)); }
      if (b.y < FL.y + b.r || b.y > FL.y + FL.h - b.r) { b.vy *= -1; b.y = Math.min(FL.y + FL.h - b.r, Math.max(FL.y + b.r, b.y)); }
      if (Math.hypot(b.x - p.x, b.y - p.y) < b.r + 9) hurt();
    }
    pics.forEach((o, i) => {
      if (o.lit) { o.lit += dt; return; }
      o.ch = Math.hypot(o.x - p.x, o.y - p.y) < 56 && inv <= 0 ? Math.min(1, o.ch + dt / 1.3) : Math.max(0, o.ch - dt * .7);
      if (o.ch >= 1) {
        o.lit = .001; sweep(520 + i * 160, 1040 + i * 320, .6, "sine", .16); msg = { s: o.mem, age: 0 };
        if (pics.every(q => q.lit)) { fin = true; setTimeout(end, 1800); }
      }
    });
    if (msg && (msg.age += dt) > 5.5) msg = null;
  }
  function draw() {
    g.fillStyle = "#14171c"; g.fillRect(0, 0, 960, 540);
    g.fillStyle = "#23282f"; g.fillRect(FL.x, FL.y, FL.w, FL.h); g.strokeStyle = "#4a5360"; g.lineWidth = 2; g.strokeRect(FL.x, FL.y, FL.w, FL.h);
    for (const o of pics) {                                                           // frames: grey until restored, then colour blooms
      const r = o.lit ? Math.min(1, o.lit * 1.5) : 0, y = 120;
      g.fillStyle = "#3a3f47"; g.fillRect(o.x - 60, y - 40, 120, 90);
      if (r) { const gr = g.createLinearGradient(o.x, y - 40, o.x, y + 50); gr.addColorStop(0, o.c[0]); gr.addColorStop(1, o.c[1]); g.globalAlpha = r; g.fillStyle = gr; g.fillRect(o.x - 60, y - 40, 120, 90); g.globalAlpha = 1; }
      g.strokeStyle = r ? "#ffe9a8" : "#7c8591"; g.lineWidth = 4; g.strokeRect(o.x - 60, y - 40, 120, 90);
      if (!o.lit) {
        g.strokeStyle = "rgba(220,230,240,.25)"; g.lineWidth = 2; g.setLineDash([6, 8]); g.beginPath(); g.arc(o.x, o.y, 56, 0, TAU); g.stroke(); g.setLineDash([]);
        if (o.ch > 0) { g.strokeStyle = o.c[1]; g.lineWidth = 5; g.shadowColor = o.c[1]; g.shadowBlur = 14; g.beginPath(); g.arc(o.x, o.y, 56, -Math.PI / 2, -Math.PI / 2 + TAU * o.ch); g.stroke(); g.shadowBlur = 0; }
      }
    }
    for (const b of blots) {                                                          // grey blots: spinning diamonds
      g.save(); g.translate(b.x, b.y); g.rotate(t * 2); g.fillStyle = "#9aa5b1"; g.shadowColor = "#cfd8e0"; g.shadowBlur = 12;
      g.beginPath(); g.moveTo(0, -b.r - 4); g.lineTo(b.r * .7, 0); g.lineTo(0, b.r + 4); g.lineTo(-b.r * .7, 0); g.closePath(); g.fill(); g.restore();
    }
    drawBlossom(g, lu.x, lu.y, t, SPEAKERS.lumi.color);
    drawFairy(g, fa.x, fa.y, t, SPEAKERS.voice.color);
    if (inv <= 0 || Math.floor(inv * 12) % 2) { g.save(); g.translate(p.x, p.y); drawShape(g, myShape, 13); g.restore(); }
    g.font = "bold 22px Pretendard,'Malgun Gothic'"; g.fillStyle = "#fff"; g.textAlign = "left"; g.textBaseline = "top";
    g.fillText(`그림 ${pics.filter(o => o.lit).length} / 3`, 30, 24);
    g.font = "16px Pretendard,'Malgun Gothic'"; g.fillStyle = "#9ad0ff"; g.fillText("이동: 방향키 · 그림 앞에 서 있으면 색이 돌아와요 · 잿빛 얼룩을 피하세요!", 30, 56);
    if (msg) {
      g.globalAlpha = Math.max(0, Math.min(1, (5.5 - msg.age) * 2, msg.age * 4 + .2));
      g.fillStyle = "#0b1026"; g.fillRect(60, 84, 840, 110); g.strokeStyle = "#fff"; g.lineWidth = 4; g.strokeRect(60, 84, 840, 110);
      g.font = "22px Pretendard,'Malgun Gothic'"; g.fillStyle = "#ffe9a8"; wrap(msg.s, 36).slice(0, 3).forEach((s, i) => g.fillText(s, 84, 100 + i * 32));
      g.globalAlpha = 1;
    }
  }
  function step(now) { const dt = Math.min((now - last) / 1000, .05); last = now; t += dt; update(dt); draw(); raf = requestAnimationFrame(step); }
  addEventListener("keydown", kd); addEventListener("keyup", ku); raf = requestAnimationFrame(step);
};

function drawShardAlly(g, x, y, t, col, k = 1) {                                        // 글리치 look: jittering shard
  g.save(); g.translate(x, y); g.rotate(t * .8); g.scale(k, k); g.strokeStyle = col; g.shadowColor = col; g.shadowBlur = 14; g.lineWidth = 2.5;
  g.beginPath(); [14, 5, 12, 4, 15, 5, 11].forEach((R, j, a) => g.lineTo(Math.cos(j * TAU / a.length) * R + (Math.random() - .5), Math.sin(j * TAU / a.length) * R)); g.closePath(); g.stroke();
  g.fillStyle = "#fff"; g.beginPath(); g.arc(0, 0, 2.5, 0, TAU); g.fill(); g.restore();
}

function drawTomoeAlly(g, x, y, t, col, k = 1) {                                        // 글리치 new look: three crescent blades circling a sharp core, a crackle of lightning
  g.save(); g.translate(x, y); g.scale(k, k); g.strokeStyle = g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 14; g.lineWidth = 2.5;
  for (let i = 0; i < 3; i++) { const a = t * 2.2 + i * TAU / 3; g.beginPath(); g.arc(Math.cos(a) * 11, Math.sin(a) * 11, 6, a + 1, a + 4.6); g.stroke(); }
  g.beginPath(); g.moveTo(0, -7); g.lineTo(4, 0); g.lineTo(0, 7); g.lineTo(-4, 0); g.closePath(); g.fill();
  g.lineWidth = 1.2; g.beginPath(); g.moveTo(-18, -2); for (let j = 1; j <= 4; j++) g.lineTo(-18 + j * 9, (Math.random() - .5) * 10); g.stroke();
  g.restore();
}

function drawGlitch(g, x, y, t, k) {                                                    // current look: jagged shard, or (after s3_morph) crescent blades
  if (SPEAKERS.glitch.shape === "shard") drawShardAlly(g, x, y, t, SPEAKERS.glitch.color, k); else drawTomoeAlly(g, x, y, t, SPEAKERS.glitch.color, k);
}

// ---- 변신: 글리치의 각진 파편이 부서졌다가 따뜻한 새 모습으로 다시 모인다 (about 4s, auto-advances) ----
ACTS.s3_morph = done => {
  stage.classList.add("pick"); act.hidden = false;
  act.innerHTML = `<canvas id="mf" width="960" height="540"></canvas>`;
  const g = $("mf").getContext("2d"), NEW = FORMS.glitch.calm.color, OLD = SPEAKERS.glitch.color;
  let t = 0, last = performance.now(), raf, swapped = false;
  function step(now) {
    const dt = Math.min((now - last) / 1000, .05); last = now; t += dt;
    g.globalAlpha = 1; g.fillStyle = "#070b1c"; g.fillRect(0, 0, 960, 540); g.textAlign = "center"; g.textBaseline = "middle";
    if (t < 1.6) { g.globalAlpha = 1 - t / 1.6 * .3; drawShardAlly(g, 480, 250, t * (1 + t * 4), OLD, 3 + t * 2); }                  // old shard spins up and jitters
    else if (t < 2.4) {                                                                 // flash: sparks fly out
      g.globalAlpha = 1 - (t - 1.6) / .8; g.strokeStyle = "#fff"; g.lineWidth = 3;
      for (let k = 0; k < 14; k++) { const a = k * TAU / 14, r = 20 + (t - 1.6) * 420; g.beginPath(); g.moveTo(480 + Math.cos(a) * r, 250 + Math.sin(a) * r); g.lineTo(480 + Math.cos(a) * (r + 30), 250 + Math.sin(a) * (r + 30)); g.stroke(); }
    } else {
      if (!swapped) { swapped = true; applyForm("glitch", "calm"); }
      g.globalAlpha = Math.min(1, t - 2.4); drawTomoeAlly(g, 480, 250, t, NEW, 6);
      g.font = "bold 30px Pretendard,'Malgun Gothic'"; g.fillStyle = NEW; g.fillText("글리치", 480, 345);
    }
    if (t > 4.2) { cancelAnimationFrame(raf); act.hidden = true; act.innerHTML = ""; stage.classList.remove("pick"); done(); return; }
    raf = requestAnimationFrame(step);
  }
  raf = requestAnimationFrame(step);
};

// ---- 동료 카드: 글리치 합류 ----
ACTS.s3_party = done => {
  stage.classList.add("pick"); act.hidden = false;
  act.innerHTML = `<canvas id="pt" width="960" height="540"></canvas>`;
  const g = $("pt").getContext("2d"), S = SPEAKERS, who = [
    { x: 150, name: "개체", role: "형태를 고른 자", c: "#9ad0ff", draw: () => { g.save(); g.translate(150, 250); drawShape(g, myShape, 30); g.restore(); } },
    { x: 380, name: "루미", role: "빠른 추격탄 · 회복", c: S.lumi.color, draw: t => drawBlossom(g, 380, 250, t, S.lumi.color, 2.2) },
    { x: 610, name: "헥사", role: "느리고 강한 사격 · 방패", c: S.hexa.color, draw: t => drawHexa(g, 610, 250, t, S.hexa.color, 1.5) },
    { x: 830, name: "글리치", role: "새로운 동료 · 빠르고 강한 사격 · 유대의 빛 = 공격력 상승", c: S.glitch.color, draw: t => drawGlitch(g, 830, 250, t, 3) },
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
    g.font = "bold 40px Pretendard,'Malgun Gothic'"; g.fillStyle = "#fff"; g.fillText("동료 합류!", 480, 90);
    who.forEach((m, i) => {
      g.globalAlpha = Math.max(0, Math.min(1, t - .3 - i * .35)); m.draw(t);
      g.font = "bold 26px Pretendard,'Malgun Gothic'"; g.fillStyle = m.c; g.fillText(m.name, m.x, 345);
      g.font = "14px Pretendard,'Malgun Gothic'"; g.fillStyle = "#cfe"; wrap(m.role, 12).forEach((s, k) => g.fillText(s, m.x, 380 + k * 20));
    });
    g.globalAlpha = t > 1.5 ? 1 : 0; g.font = "20px Pretendard,'Malgun Gothic'"; g.fillStyle = "#9ad0ff"; g.fillText("클릭, SPACE 또는 Z로 계속", 480, 490);
    g.globalAlpha = 1; raf = requestAnimationFrame(step);
  }
  act.onclick = go; addEventListener("keydown", key); raf = requestAnimationFrame(step);
};
