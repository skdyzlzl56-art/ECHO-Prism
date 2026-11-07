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

// ---- 등불 켜기: 등불 곁에 머물면 충전되어 불이 붙는다. 떠도는 균열과 낙뢰를 피해야 한다. 세 개를 켜면 오른쪽 문이 열린다 ----
ACTS.s1_explore = done => {
  stage.classList.add("pick"); act.hidden = false;
  act.innerHTML = `<canvas id="ex" width="960" height="540"></canvas>`;
  const g = $("ex").getContext("2d"), keys = {}, FL = { x: 30, y: 210, w: 900, h: 250 };
  const lamps = [
    { x: 220, y: 340, lit: 0, ch: 0, mem: "비 오는 날, 문 앞에서 떨던 어린 등불지기에게 커다란 육각형이 다가와 말없이 우산이 되어 주었다." },
    { x: 480, y: 270, lit: 0, ch: 0, mem: "'나는 문을 지킬게. 너는 길을 밝혀.' 두 그림자가 나란히 서서 첫 약속을 했다." },
    { x: 730, y: 360, lit: 0, ch: 0, mem: "문이 갈라지던 밤. 육각형은 혼자 봉인을 붙든 채 말했다. '루미, 도망쳐. 불이... 꺼지지 않게...'" },
  ];
  const door = { x: 900, y: 335 }, p = { x: 90, y: 340 }, lu = { x: 50, y: 340 }, fa = { x: 120, y: 310 };
  const dust = Array.from({ length: 36 }, (_, i) => ({ x: (i * 197) % 960, y: (i * 89) % 540, v: 8 + (i % 5) * 4 }));
  const wisps = [], beams = [];
  const spawnWisp = () => { const a = Math.random() * TAU; wisps.push({ x: FL.x + 200 + Math.random() * 600, y: FL.y + 30 + Math.random() * 190, vx: Math.cos(a) * 130, vy: Math.sin(a) * 130, r: 12 }); };
  for (let i = 0; i < 3; i++) spawnWisp();
  let t = 0, last = performance.now(), raf, q = [], msg = null, open = false, fin = false, hint = 0, inv = 0, bt = 2.5, hits = 0;
  const say = s => q.push(s);
  const kd = e => { keys[e.code] = true; if (e.code.startsWith("Arrow") || e.code === "Space") e.preventDefault(); };
  const ku = e => { keys[e.code] = false; };
  const end = () => {
    cancelAnimationFrame(raf); removeEventListener("keydown", kd); removeEventListener("keyup", ku);
    BOND.base = Math.max(BOND.base, 1);                                                // lighting the lamps together = bond Lv.1
    act.hidden = true; act.innerHTML = ""; stage.classList.remove("pick"); done();
  };
  const hurt = (ax, ay) => {                                                           // knockback + the lamp charge scatters
    if (inv > 0) return; inv = 1.3; hits++;
    const d = Math.hypot(p.x - ax, p.y - ay) || 1;
    p.x = Math.min(FL.x + FL.w - 14, Math.max(FL.x + 14, p.x + (p.x - ax) / d * 70)); p.y = Math.min(FL.y + FL.h - 14, Math.max(FL.y + 14, p.y + (p.y - ay) / d * 70));
    for (const l of lamps) if (!l.lit) l.ch = 0;
    noise(.15, .6); sweep(300, 80, .25, "square", .3); retrigger($("flash"), "on", 300); retrigger(stage, "shake", 300);
    msg = { s: "균열에 부딪혔다! 모아 둔 빛이 흩어졌다.", age: 3.8 };
  };

  function update(dt) {
    const dx = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
    const dy = (keys.ArrowDown || keys.KeyS ? 1 : 0) - (keys.ArrowUp || keys.KeyW ? 1 : 0), n = Math.hypot(dx, dy) || 1;
    inv -= dt;
    if (!fin) { p.x = Math.min(FL.x + FL.w - 14, Math.max(FL.x + 14, p.x + dx / n * 190 * dt)); p.y = Math.min(FL.y + FL.h - 14, Math.max(FL.y + 14, p.y + dy / n * 190 * dt)); }
    lu.x += (p.x - 46 - lu.x) * Math.min(1, dt * 4); lu.y += (p.y + 6 - lu.y) * Math.min(1, dt * 4);
    fa.x += (p.x + 30 - fa.x) * Math.min(1, dt * 5); fa.y += (p.y - 34 - fa.y) * Math.min(1, dt * 5);
    const nLit = lamps.filter(l => l.lit).length;

    if (!open) {                                                                       // hazards: bouncing cracks + telegraphed lightning columns
      while (wisps.length < 3 + nLit) spawnWisp();
      for (const w of wisps) {
        w.x += w.vx * dt; w.y += w.vy * dt;
        if (w.x < FL.x + w.r || w.x > FL.x + FL.w - w.r) { w.vx *= -1; w.x = Math.min(FL.x + FL.w - w.r, Math.max(FL.x + w.r, w.x)); }
        if (w.y < FL.y + w.r || w.y > FL.y + FL.h - w.r) { w.vy *= -1; w.y = Math.min(FL.y + FL.h - w.r, Math.max(FL.y + w.r, w.y)); }
        if (Math.hypot(w.x - p.x, w.y - p.y) < w.r + 9) hurt(w.x, w.y);
      }
      bt -= dt;
      if (bt <= 0) {
        bt = 3.2 - .5 * nLit; const bx = Math.random() < .55 ? p.x : FL.x + 40 + Math.random() * (FL.w - 80);
        beams.push({ x: bx, age: 0, warn: 1, dur: .45, boom: false }); sweep(1800, 2300, .15, "square", .12);
      }
      for (const b of beams) {
        b.age += dt;
        if (!b.boom && b.age >= b.warn) { b.boom = true; sweep(220, 40, .5, "sawtooth", .25); noise(.25, .35); }
        if (b.boom && b.age < b.warn + b.dur && Math.abs(p.x - b.x) < 24) hurt(b.x, p.y);
      }
      for (let i = beams.length - 1; i >= 0; i--) if (beams[i].age > beams[i].warn + beams[i].dur + .1) beams.splice(i, 1);
    } else { wisps.length = 0; beams.length = 0; }

    lamps.forEach((l, i) => {
      if (l.lit) { l.lit += dt; return; }
      const near = Math.hypot(l.x - p.x, l.y - p.y) < 52 && inv <= 0;
      l.ch = near ? Math.min(1, l.ch + dt / 1.3) : Math.max(0, l.ch - dt * .7);        // stand next to it to charge
      if (l.ch >= 1) {
        l.lit = .001; sweep(520 + i * 160, 1040 + i * 320, .6, "sine", .16); sweep(260 + i * 80, 520 + i * 160, .6, "triangle", .1); say(l.mem);
        if (lamps.every(m => m.lit)) { open = true; say("끼이이이... 회랑 끝의 문이 열렸다. 균열이 물러간다. 오른쪽 끝으로 가자."); }
      }
    });
    if (!msg && q.length) msg = { s: q.shift(), age: 0 };
    if (msg && (msg.age += dt) > 5.5) msg = null;
    hint -= dt;
    if (!fin && Math.hypot(door.x - p.x, door.y - p.y) < 46) {
      if (open) { fin = true; sweep(200, 1200, .7, "sawtooth", .2); retrigger($("flash"), "on", 600); setTimeout(end, 800); }
      else if (hint <= 0) { hint = 3; msg = { s: `아직 꺼진 등불이 ${lamps.filter(l => !l.lit).length}개 남아 있다.`, age: 3.5 }; sweep(150, 100, .2, "square", .1); }
    }
  }

  function draw() {
    const lit = lamps.filter(l => l.lit).length;
    g.fillStyle = "#070b1c"; g.fillRect(0, 0, 960, 540);
    g.fillStyle = "#0e1634"; g.fillRect(FL.x, FL.y, FL.w, FL.h);                       // corridor floor
    g.strokeStyle = "#2a3a78"; g.lineWidth = 2; g.strokeRect(FL.x, FL.y, FL.w, FL.h);
    for (let i = 0; i < 6; i++) { g.strokeStyle = "#1a2552"; g.beginPath(); g.moveTo(40 + i * 160, 60); g.lineTo(40 + i * 160, 200); g.stroke(); }   // pillars
    if (!open) {
      g.globalAlpha = .5 + .3 * Math.sin(t * 7);                                        // cracks leaking pink glitch light
      g.strokeStyle = "#ff3b5c"; g.lineWidth = 2;
      [[90, 230, 130, 270, 110, 310], [380, 440, 420, 410, 470, 430], [610, 225, 650, 265, 640, 300], [820, 420, 860, 395, 880, 440]].forEach(c => { g.beginPath(); g.moveTo(c[0], c[1]); g.lineTo(c[2], c[3]); g.lineTo(c[4], c[5]); g.stroke(); });
      g.globalAlpha = 1;
    }
    g.fillStyle = "rgba(190,220,255,.35)"; for (const d of dust) { d.y -= d.v / 60; if (d.y < 0) d.y = 540; g.fillRect(d.x, d.y, 2, 2); }
    for (const l of lamps) {                                                            // lamps + charge ring
      const r = l.lit ? Math.min(1, l.lit * 2) : 0;
      if (r) { const gr = g.createRadialGradient(l.x, l.y - 30, 0, l.x, l.y - 30, 130); gr.addColorStop(0, `rgba(255,230,160,${.65 * r})`); gr.addColorStop(1, "rgba(255,200,100,0)"); g.fillStyle = gr; g.beginPath(); g.arc(l.x, l.y - 30, 130, 0, TAU); g.fill(); }
      else {
        g.strokeStyle = "rgba(255,230,160,.25)"; g.lineWidth = 2; g.setLineDash([6, 8]); g.beginPath(); g.arc(l.x, l.y, 52, 0, TAU); g.stroke(); g.setLineDash([]);
        if (l.ch > 0) { g.strokeStyle = "#ffe08a"; g.lineWidth = 5; g.shadowColor = "#ffd87a"; g.shadowBlur = 14; g.beginPath(); g.arc(l.x, l.y, 52, -Math.PI / 2, -Math.PI / 2 + TAU * l.ch); g.stroke(); g.shadowBlur = 0; }
      }
      g.strokeStyle = r ? "#ffe9a8" : "#3a4672"; g.lineWidth = 4; g.beginPath(); g.moveTo(l.x, l.y + 20); g.lineTo(l.x, l.y - 24); g.stroke();
      g.fillStyle = r ? "#fff4cf" : "#2a3358"; g.shadowColor = "#ffd87a"; g.shadowBlur = r ? 20 : 0; g.beginPath(); g.arc(l.x, l.y - 34, 11, 0, TAU); g.fill(); g.shadowBlur = 0;
    }
    g.fillStyle = open ? "#ffe9a8" : "#2a3358"; g.shadowColor = "#ffd87a"; g.shadowBlur = open ? 24 : 0;   // door
    g.fillRect(door.x - 20, door.y - 60, 40, 120); g.shadowBlur = 0;
    g.strokeStyle = "#fff"; g.lineWidth = 3; g.strokeRect(door.x - 20, door.y - 60, 40, 120);
    g.save(); g.globalCompositeOperation = "lighter";
    for (const b of beams) {                                                            // lightning columns: dashed warning, then a bright strike
      if (b.age < b.warn) { g.globalAlpha = .35 + .4 * Math.abs(Math.sin(b.age * 22)); g.strokeStyle = "#ff7a9a"; g.lineWidth = 2; g.setLineDash([10, 8]); g.beginPath(); g.moveTo(b.x, 120); g.lineTo(b.x, FL.y + FL.h); g.stroke(); g.setLineDash([]); }
      else { const k = 1 - (b.age - b.warn) / b.dur; g.globalAlpha = Math.max(0, k); g.fillStyle = "#ff3b5c"; g.shadowColor = "#ff3b5c"; g.shadowBlur = 24; g.fillRect(b.x - 24 * k, 120, 48 * k, FL.y + FL.h - 120); g.fillStyle = "#fff"; g.fillRect(b.x - 8 * k, 120, 16 * k, FL.y + FL.h - 120); }
    }
    g.shadowBlur = 0; g.globalAlpha = 1;
    for (const w of wisps) {                                                            // drifting cracks (diamonds that spin)
      g.save(); g.translate(w.x, w.y); g.rotate(t * 3); g.fillStyle = "#ff3b5c"; g.shadowColor = "#ff3b5c"; g.shadowBlur = 16;
      g.beginPath(); g.moveTo(0, -w.r - 4); g.lineTo(w.r * .7, 0); g.lineTo(0, w.r + 4); g.lineTo(-w.r * .7, 0); g.closePath(); g.fill();
      g.fillStyle = "#fff"; g.beginPath(); g.arc(0, 0, 3, 0, TAU); g.fill(); g.restore();
    }
    g.restore();
    drawBlossom(g, lu.x, lu.y, t, SPEAKERS.lumi.color);
    drawFairy(g, fa.x, fa.y, t, SPEAKERS.voice.color);
    if (inv <= 0 || Math.floor(inv * 12) % 2) { g.save(); g.translate(p.x, p.y); drawShape(g, myShape, 13); g.restore(); }
    g.font = "bold 22px Pretendard,'Malgun Gothic'"; g.fillStyle = "#fff"; g.textAlign = "left"; g.textBaseline = "top";
    g.fillText(`등불 ${lit} / 3`, 30, 24);
    g.font = "16px Pretendard,'Malgun Gothic'"; g.fillStyle = "#9ad0ff"; g.fillText(open ? "이동: 방향키" : "이동: 방향키 · 꺼진 등불 곁에 서 있으면 불이 붙어요 · 균열과 낙뢰를 피하세요!", 30, 56);
    if (msg) {
      g.globalAlpha = Math.max(0, Math.min(1, (5.5 - msg.age) * 2, msg.age * 4 + .2));
      g.fillStyle = "#0b1026"; g.fillRect(60, 84, 840, 110); g.strokeStyle = "#fff"; g.lineWidth = 4; g.strokeRect(60, 84, 840, 110);   // above the floor (FL.y = 210) so it never hides lamps or hazards
      g.font = "22px Pretendard,'Malgun Gothic'"; g.fillStyle = "#ffe9a8"; wrap(msg.s, 36).slice(0, 3).forEach((s, i) => g.fillText(s, 84, 100 + i * 32));
      g.globalAlpha = 1;
    }
  }
  function step(now) { const dt = Math.min((now - last) / 1000, .05); last = now; t += dt; update(dt); draw(); raf = requestAnimationFrame(step); }
  addEventListener("keydown", kd); addEventListener("keyup", ku); raf = requestAnimationFrame(step);
};

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
    g.font = "bold 40px Pretendard,'Malgun Gothic'"; g.fillStyle = "#fff"; g.fillText("동료 합류!", 480, 90);
    who.forEach((m, i) => {
      g.globalAlpha = Math.max(0, Math.min(1, t - .3 - i * .35)); m.draw(t);
      g.font = "bold 28px Pretendard,'Malgun Gothic'"; g.fillStyle = m.c; g.fillText(m.name, m.x, 345);
      g.font = "16px Pretendard,'Malgun Gothic'"; g.fillStyle = "#cfe"; g.fillText(m.role, m.x, 380);
    });
    g.globalAlpha = t > 1.5 ? 1 : 0; g.font = "20px Pretendard,'Malgun Gothic'"; g.fillStyle = "#9ad0ff"; g.fillText("클릭, SPACE 또는 Z로 계속", 480, 480);
    g.globalAlpha = 1; raf = requestAnimationFrame(step);
  }
  act.onclick = go; addEventListener("keydown", key); raf = requestAnimationFrame(step);
};
