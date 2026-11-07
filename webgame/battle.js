// First battle + procedural battle music. Needs: ac, $, sweep, noise, retrigger (index.html),
// stage/act/myShape/drawShape/HITBOX (game.js), setPortrait/kickPortrait (portraits.js).

// ---- 배경음악: 132bpm, A minor (Am-F-C-G). level(0~2)이 오를수록 악기가 늘어난다 ----
const music = (() => {
  const SD = 60 / 132 / 4, ROOTS = [55, 43.65, 65.41, 49], ARP = [0, 3, 7, 12];
  let timer, mg, nbuf, step, nextT;
  const env = (g, t, v, d) => { g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d); };
  const tone = (type, f0, f1, t, d, v) => {
    const o = ac.createOscillator(), g = ac.createGain(); o.type = type;
    o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + d);
    env(g, t, v, d); o.connect(g).connect(mg); o.start(t); o.stop(t + d);
  };
  const tick = (t, d, v, hp) => {                                      // filtered noise: hat / snare
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = nbuf; f.type = "highpass"; f.frequency.value = hp; env(g, t, v, d);
    s.connect(f).connect(g).connect(mg); s.start(t, Math.random() * .5); s.stop(t + d);
  };
  function play(s, t) {
    const lv = music.level, r = ROOTS[(s >> 3) & 3], p = s & 7;
    if (s % 4 === 0) tone("sine", 160, 45, t, .2, 1);                                  // kick, four on the floor
    if (lv > 0 && s % 8 === 4) { tick(t, .14, .6, 1500); tone("triangle", 230, 120, t, .08, .35); }   // snare
    if (s % (lv > 1 ? 1 : 2) === 0) tick(t, .04, s % 4 === 2 ? .3 : .14, 7000);                      // hats
    if (p === 0 || p === 3 || p === 6) tone("square", r * (p === 6 ? 2 : 1), r * (p === 6 ? 2 : 1), t, .17, .2);  // bass
    if (lv > 0 && s % (lv > 1 ? 1 : 2) === 0) { const f = r * 4 * 2 ** (ARP[(s >> (lv > 1 ? 0 : 1)) % 4] / 12); tone("triangle", f, f, t, .1, .13); } // arp
  }
  return {
    level: 0,
    start() {
      if (timer) return;
      mg = ac.createGain(); mg.gain.value = .3; mg.connect(ac.destination);
      nbuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); nbuf.getChannelData(0).forEach((_, i, d) => d[i] = Math.random() * 2 - 1);
      step = 0; nextT = ac.currentTime + .1;
      timer = setInterval(() => { while (nextT < ac.currentTime + .15) { play(step++, nextT); nextT += SD; } }, 30);
    },
    stop() { clearInterval(timer); timer = null; if (mg) mg.gain.setTargetAtTime(0, ac.currentTime, .08); },
  };
})();

// ---- 첫 전투: 피하면서 쏴서 균열을 쓰러뜨린다 ----
ACTS.battle = done => {
  stage.classList.add("battle"); act.hidden = false; setPortrait(SPEAKERS.glitch);
  act.innerHTML = `<canvas id="ar" width="960" height="540"></canvas>`;
  const g = $("ar").getContext("2d"), BOX = { x: 330, y: 190, w: 300, h: 260 }, MAX_HP = 20, E_MAX = 80;
  const EX = 480, E_Y = 150, E_W = 75;                                  // enemy hit zone: |x-EX|<E_W and y<E_Y
  const cx = BOX.x + BOX.w / 2, oy = BOX.y - 50;                        // enemy bullets start above the box
  const keys = {}, p = { x: cx, y: BOX.y + BOX.h * .75 };
  let bullets = [], shots = [], floats = [], hp = MAX_HP, eHp = E_MAX, inv = 0, t = 0, cd = 0, combo = 0, comboT = 0, hitFlash = 0;
  let a1 = 0, a2 = 0, a3 = 0, level = 0, last = performance.now(), raf, over = null, auto = false, fx = [];

  const toggle = () => { auto = !auto; sweep(auto ? 500 : 400, auto ? 900 : 200, .08, "square", .1); };   // 사격 ON/OFF
  const kd = e => {
    keys[e.code] = true;
    if (e.code.startsWith("Arrow") || e.code === "Space") e.preventDefault();
    if (e.code === "Space" && !e.repeat) toggle();
  };
  const ku = e => { keys[e.code] = false; };
  const cleanup = () => {
    cancelAnimationFrame(raf); music.stop(); removeEventListener("keydown", kd); removeEventListener("keyup", ku);
    act.onclick = act.onmousedown = null;
  };
  const end = () => { cleanup(); act.hidden = true; act.innerHTML = ""; stage.classList.remove("battle"); done(); };
  const add = (x, y, ang, sp) => bullets.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: 6 });

  function update(dt) {
    const firing = auto && !over, spd = firing ? 130 : 200;             // shooting slows you down
    const dx = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
    const dy = (keys.ArrowDown || keys.KeyS ? 1 : 0) - (keys.ArrowUp || keys.KeyW ? 1 : 0);
    const n = Math.hypot(dx, dy) || 1, m = 10;
    p.x = Math.min(BOX.x + BOX.w - m, Math.max(BOX.x + m, p.x + dx / n * spd * dt));
    p.y = Math.min(BOX.y + BOX.h - m, Math.max(BOX.y + m, p.y + dy / n * spd * dt));
    t += dt; inv -= dt; cd -= dt; comboT -= dt; hitFlash -= dt; if (comboT <= 0) combo = 0;

    if (firing && cd <= 0) { cd = .12; shots.push({ x: p.x, y: p.y - 12 }); sweep(1000, 700, .05, "triangle", .05); }
    for (const s of shots) s.y -= 560 * dt;
    for (const s of shots) if (s.y < E_Y && Math.abs(s.x - EX) < E_W) {            // shot lands
      s.dead = true; eHp--; combo++; comboT = .5; hitFlash = .08; kickPortrait();
      const f = 450 + Math.min(combo, 16) * 40; sweep(f, f * 1.6, .08, "square", .13); noise(.04, .2);
      floats.push({ x: s.x + (Math.random() - .5) * 30, y: E_Y - 10, age: 0 });
      fx.push({ x: s.x, y: E_Y, age: 0 });                                          // round burst
      for (let i = 0; i < 5; i++) { const a = Math.random() * TAU, v = 80 + Math.random() * 140; fx.push({ x: s.x, y: E_Y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, age: 0, sp: true }); }
    }
    for (const f of fx) { f.age += dt; if (f.sp) { f.x += f.vx * dt; f.y += f.vy * dt; } }
    fx = fx.filter(f => f.age < (f.sp ? .35 : .3));
    shots = shots.filter(s => !s.dead && s.y > -20);
    for (const f of floats) f.age += dt; floats = floats.filter(f => f.age < .6);

    const r = eHp / E_MAX, lv = r > .66 ? 0 : r > .33 ? 1 : 2;                       // enemy gets angrier as it weakens
    if (lv > level) { level = lv; bullets = []; noise(.3, .5); sweep(100, 600, .5, "sawtooth", .25); retrigger($("flash"), "on", 600); retrigger(stage, "shake", 500); }
    music.level = level;

    if (t > 1) {                                                                      // 1s grace
      a1 += dt; if (a1 > (level ? .4 : .25)) { a1 = 0; add(BOX.x + Math.random() * BOX.w, BOX.y - 12, Math.PI / 2, 130 + Math.random() * 40); }
      if (level > 0) { a2 += dt; if (a2 > (level > 1 ? .9 : .7)) { a2 = 0; add(EX, oy, Math.atan2(p.y - oy, p.x - EX), 170); } }
      if (level > 1) { a3 += dt; if (a3 > 1.4) { a3 = 0; for (let i = -3; i <= 3; i++) add(EX, oy, Math.PI / 2 + i * .3, 120); } }
    }
    for (const b of bullets) { b.x += b.vx * dt; b.y += b.vy * dt; }
    bullets = bullets.filter(b => b.y < BOX.y + BOX.h + 20 && b.y > BOX.y - 120 && b.x > BOX.x - 40 && b.x < BOX.x + BOX.w + 40);
    if (inv <= 0) {
      const i = bullets.findIndex(b => Math.hypot(b.x - p.x, b.y - p.y) < b.r + HITBOX);
      if (i >= 0) { bullets.splice(i, 1); hp -= 4; inv = 1; noise(.1, .5); sweep(300, 80, .2, "square", .3); }
    }
    if (hp <= 0) {
      over = "lose"; music.stop(); noise(.5, .5); sweep(400, 40, 1, "sawtooth", .3);
      setTimeout(() => { act.onclick = () => { cleanup(); ACTS.battle(done); }; }, 600);
    } else if (eHp <= 0) {
      over = "win"; bullets = []; music.stop(); noise(.6, .7); sweep(80, 1600, .9, "sawtooth", .3); sweep(200, 40, .6, "sine", .6);
      retrigger($("flash"), "on", 600); retrigger(stage, "shake", 500); setTimeout(end, 1600);
    }
  }

  function draw() {
    g.clearRect(0, 0, 960, 540);
    g.save(); g.globalCompositeOperation = "lighter";                                  // hit effects: soft glow + round burst + sparks
    if (hitFlash > 0) {
      const gr = g.createRadialGradient(EX, 85, 0, EX, 85, 120);
      gr.addColorStop(0, `rgba(255,255,255,${hitFlash * 4})`); gr.addColorStop(1, "rgba(255,80,120,0)");
      g.fillStyle = gr; g.beginPath(); g.arc(EX, 85, 120, 0, TAU); g.fill();
    }
    for (const f of fx) {
      if (f.sp) { g.fillStyle = `rgba(255,220,230,${1 - f.age / .35})`; g.beginPath(); g.arc(f.x, f.y, 3, 0, TAU); g.fill(); continue; }
      const k = f.age / .3, r = 12 + 50 * k, gr = g.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
      gr.addColorStop(0, `rgba(255,255,255,${.9 * (1 - k)})`); gr.addColorStop(.6, `rgba(255,90,120,${.5 * (1 - k)})`); gr.addColorStop(1, "rgba(255,60,100,0)");
      g.fillStyle = gr; g.beginPath(); g.arc(f.x, f.y, r, 0, TAU); g.fill();
      g.strokeStyle = `rgba(255,255,255,${1 - k})`; g.lineWidth = 2; g.beginPath(); g.arc(f.x, f.y, r * .9, 0, TAU); g.stroke();
    }
    g.restore();
    g.fillStyle = "rgba(0,0,20,.7)"; g.fillRect(BOX.x, BOX.y, BOX.w, BOX.h);
    g.save(); g.beginPath(); g.rect(BOX.x, BOX.y, BOX.w, BOX.h); g.clip();
    g.fillStyle = "#ff3b5c"; g.shadowColor = "#ff3b5c"; g.shadowBlur = 10;
    for (const b of bullets) { g.beginPath(); g.arc(b.x, b.y, b.r, 0, TAU); g.fill(); }
    g.restore();
    g.fillStyle = "#cff"; g.shadowColor = "#4fc3ff"; g.shadowBlur = 12;                // player shots fly out of the box
    for (const s of shots) g.fillRect(s.x - 2.5, s.y - 9, 5, 18);
    g.shadowBlur = 0;
    if (over !== "lose" && (inv <= 0 || Math.floor(inv * 12) % 2)) {
      g.save(); g.translate(p.x, p.y); drawShape(g, myShape, 11); g.fillStyle = "#fff"; g.beginPath(); g.arc(0, 0, 2.5, 0, TAU); g.fill(); g.restore();
    }
    g.strokeStyle = "#fff"; g.lineWidth = 4; g.strokeRect(BOX.x, BOX.y, BOX.w, BOX.h);

    g.fillStyle = "#333"; g.fillRect(BOX.x, 168, BOX.w, 10);                            // enemy HP bar
    g.fillStyle = level > 1 ? "#ff3b5c" : "#ffd84f"; g.fillRect(BOX.x, 168, BOX.w * Math.max(eHp, 0) / E_MAX, 10);
    g.font = "bold 26px 'Malgun Gothic'"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#fff";
    for (const f of floats) { g.globalAlpha = 1 - f.age / .6; g.fillText("-1", f.x, f.y - f.age * 60); }
    g.globalAlpha = 1;
    if (combo > 2) { g.font = "bold 22px 'Malgun Gothic'"; g.fillStyle = "#9ad0ff"; g.textAlign = "left"; g.fillText(`${combo} HIT`, BOX.x + BOX.w + 20, 215); }

    g.font = "20px 'Malgun Gothic'"; g.textAlign = "left"; g.fillStyle = "#fff"; g.fillText(`HP ${Math.max(hp, 0)} / ${MAX_HP}`, BOX.x, 485);
    g.fillStyle = "#333"; g.fillRect(BOX.x + 130, 475, 170, 20); g.fillStyle = "#4fc3ff"; g.fillRect(BOX.x + 130, 475, 170 * Math.max(hp, 0) / MAX_HP, 20);
    g.font = "bold 20px 'Malgun Gothic'"; g.textAlign = "left"; g.fillStyle = auto ? "#7dffb0" : "#889"; g.fillText(auto ? "사격 ON" : "사격 OFF", BOX.x + BOX.w + 20, 250);
    g.font = "16px 'Malgun Gothic'"; g.fillStyle = "#9ad0ff"; g.textAlign = "right"; g.fillText("이동: 방향키/WASD · 사격 ON/OFF: SPACE 또는 클릭", BOX.x + BOX.w, 515);
    if (over) {
      g.textAlign = "center"; g.font = "bold 56px 'Malgun Gothic'"; g.fillStyle = over === "win" ? "#9ad0ff" : "#ff3b5c";
      g.fillText(over === "win" ? "격파!" : "GAME OVER", 480, 320);
      if (over === "lose" && act.onclick) { g.font = "22px 'Malgun Gothic'"; g.fillStyle = "#fff"; g.fillText("클릭하여 재도전", 480, 375); }
    }
    g.textAlign = "left";
  }

  function step(now) {
    const dt = Math.min((now - last) / 1000, .05); last = now;
    if (!over) update(dt);
    draw(); raf = requestAnimationFrame(step);
  }
  addEventListener("keydown", kd); addEventListener("keyup", ku); act.onmousedown = toggle;
  music.level = 0; music.start(); raf = requestAnimationFrame(step);
};
