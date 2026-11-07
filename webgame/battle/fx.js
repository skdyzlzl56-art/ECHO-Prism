// What a battle looks like around the action: sim events in -> floating numbers, sparks, banners, flashes, hit-stop out. The rules live here, not in the view.
//
//   const vfx = createBattleFx({ hitFeel, fmtNum, allyCol, ally, rand });
//   vfx.event(v, s)      one sim event (s = battle state). Returns the cues the view must play on the page: { type: "flash", ms } | { type: "kick" } | { type: "shake", ms, amp? }
//   vfx.frozen(dt)       once per frame: true while the world is held after a heavy hit (hit-stop), counting it down
//   vfx.step(dt)         once per frame (not during talk): ages and drops floats, sparks, banner, flashes and the red vignette
//   vfx.floats / particles / banner / burst / hitFlash / vignette   what to draw (read-only)
//
// Adapters: hitFeel(dmg, maxHp) -> { tier, stop, vignette, shakeAmp, shakeMs } and fmtNum(x) are sim.js; allyCol() -> the companion's colour now;
// ally(id) -> { name, color } for the swap banner; rand defaults to Math.random.
(function (root) {
  function createBattleFx({ hitFeel, fmtNum, allyCol, ally, rand = Math.random }) {
    let floats = [], particles = [], banner = null, burst = 0, hitFlash = 0, stopT = 0, vigT = 0;
    const say = (txt, x, y, c = "#9ad0ff") => floats.push({ x, y, age: 0, txt, col: c });
    const sparks = (x, y, n, min, range) => { for (let i = 0; i < n; i++) { const a = rand() * Math.PI * 2, sp = min + rand() * range; particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, age: 0, sp: true }); } };
    const bond = txt => { banner = { txt, age: 0, bond: true }; };
    const flash = ms => ({ type: "flash", ms }), shake = (ms, amp) => ({ type: "shake", ms, amp });

    function event(v, s) {
      const cues = [], ac = allyCol();
      switch (v.type) {
        case "enemyHit":
          hitFlash = .08; cues.push({ type: "kick" });
          say(v.dmg ? "-" + fmtNum(v.dmg) : "0", v.x + (rand() - .5) * 30, v.y - 10, v.dmg ? (v.ally ? ac : "#fff") : "#8fa3b5");
          particles.push({ x: v.x, y: v.y, age: 0 });                                  // round burst
          sparks(v.x, v.y, 5, 80, 140); break;
        case "playerHurt": {   // damage-scaled: shake, hit-stop, red vignette, number and sparks
          const h = hitFeel(v.dmg, s.maxHp);
          cues.push(shake(h.shakeMs, h.shakeAmp)); stopT = h.stop; vigT = h.vignette;
          say("-" + fmtNum(v.dmg), s.p.x, s.p.y - 20, "#ff5a5a"); sparks(s.p.x, s.p.y, 3 + 4 * h.tier, 80, 140); break;
        }
        case "shieldBlock": say("방패!", s.p.x, s.p.y - 20, ac); break;
        case "heal": say("+" + v.amount, s.p.x, s.p.y - 20, ac); break;
        case "burst":
          burst = 1; say(v.dmg ? "-" + fmtNum(v.dmg) : "0", s.e.x, s.e.y + 40, v.dmg ? ac : "#8fa3b5"); say("+3", s.p.x, s.p.y - 20, ac);
          cues.push(flash(600)); bond(v.up ? `유대 Lv.${v.level}! 지원이 강해졌다` : "유대의 빛!"); break;
        case "jointLight": burst = 1.6; bond("합동 유대의 빛!"); cues.push(flash(900)); break;   // every ally at once: a bigger flash
        case "rewind": cues.push(flash(250)); break;                                    // the bullets jump back
        case "bondStart": bond(`유대 Lv.${v.level}`); break;
        case "signature":
          if (v.call) { const a = s.al || s.p; say(v.call, a.x, a.y - 40, ac); }
          bond({ mend: "치유", blast: "일격", reflect: "반사", clear: "탄막 소거" }[v.kind]); cues.push(flash(300)); break;
        case "swap": bond(`교대: ${ally(v.ally).name}`); break;
        case "phase":
          if (v.name) banner = { txt: v.name, age: 0, level: v.level };
          if (!v.start) cues.push(flash(600), shake(500)); break;
        case "blast": cues.push(shake(250)); say("폭발!", v.x, v.y, "#ff5a5a"); sparks(v.x, v.y, 10, 100, 180); break;
        case "break": sparks(v.x, v.y, 8, 80, 160); break;
        case "dashEnd": cues.push(shake(300)); break;
        case "win": cues.push(flash(600), shake(500)); break;
      }
      return cues;
    }

    const frozen = dt => stopT > 0 && ((stopT -= dt), true);   // hit-stop: the world freezes for a moment after a heavy hit
    function step(dt) {
      vigT = Math.max(0, vigT - dt * 1.5); hitFlash -= dt; burst = Math.max(0, burst - dt * 1.5);
      if (banner && (banner.age += dt) > 3) banner = null;
      for (const f of floats) f.age += dt; floats = floats.filter(f => f.age < .6);
      for (const f of particles) { f.age += dt; if (f.sp) { f.x += f.vx * dt; f.y += f.vy * dt; } } particles = particles.filter(f => f.age < (f.sp ? .35 : .3));
    }

    return { event, frozen, step, get floats() { return floats; }, get particles() { return particles; }, get banner() { return banner; }, get burst() { return burst; }, get hitFlash() { return hitFlash; }, get vignette() { return vigT; } };
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { createBattleFx };
  else root.createBattleFx = createBattleFx;
})(typeof window !== "undefined" ? window : globalThis);
