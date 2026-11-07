// Full-screen scenes on the act layer (everything that is not dialogue or a battle). A scene says what it shows and how it reacts; this puts it up and takes it down.
//
//   const scene = openScene({ html, step(dt), key(e), keyup(e), click(), done });   -> { close() }
//     html     what goes in the act layer (usually one <canvas>); step(dt) runs every frame (dt <= .05 s); key / keyup / click are optional input handlers.
//     close()  stops the loop and the handlers, hides the layer, then calls done() (once, however many times it is called)
//   partyCard({ title, members, ... })   the "동료 합류!" card as a scene function for ACTS: members() -> [{ x, name, role, c, fresh?, draw(g, t) }] (called when the scene starts, so colours changed by the story are current)
//   wrap(str, n)                         splits a string into rows of n characters
// Globals: $, stage, act (game.js), drawShape / myShape are used by the members' draw functions, MENU / fixKeys by hint().
const wrap = (s, n) => { const o = []; for (let i = 0; i < s.length; i += n) o.push(s.slice(i, i + n)); return o; };

function openScene({ html, step, key, keyup, click, done }) {
  stage.classList.add("pick"); act.hidden = false; act.innerHTML = html;
  let raf, last = performance.now(), closed = false;
  const loop = now => { const dt = Math.min((now - last) / 1000, .05); last = now; step(dt); if (!closed) raf = requestAnimationFrame(loop); };
  const close = () => {
    if (closed) return; closed = true; cancelAnimationFrame(raf);
    if (key) removeEventListener("keydown", key); if (keyup) removeEventListener("keyup", keyup);
    act.onclick = null; act.hidden = true; act.innerHTML = ""; stage.classList.remove("pick"); done();
  };
  act.onclick = click || null; if (key) addEventListener("keydown", key); if (keyup) addEventListener("keyup", keyup);
  raf = requestAnimationFrame(loop);
  return { close };
}

// Members fade in one after another; after 1.5 s a click / Space / Enter / Z moves on.
function partyCard({ title, members, stagger = .35, nameSize = 28, roleSize = 16, wrapAt = 0, hint = () => "클릭, SPACE 또는 Z로 계속", hintY = 480 }) {
  return done => {
    let g, t = 0; const list = members();
    const go = () => { if (t >= 1.5) scene.close(); };
    const scene = openScene({
      html: `<canvas id="pt" width="960" height="540"></canvas>`, done, click: go,
      key: e => { if (e.code === "Space" || e.code === "Enter" || e.code === "KeyZ") { e.preventDefault(); go(); } },
      step(dt) {
        t += dt;
        const bg = g.createLinearGradient(0, 0, 0, 540); bg.addColorStop(0, "#0d1536"); bg.addColorStop(1, "#050818"); g.fillStyle = bg; g.fillRect(0, 0, 960, 540);
        g.globalAlpha = Math.min(1, t); g.textAlign = "center"; g.textBaseline = "middle";
        g.font = "bold 40px Galmuri11,'Malgun Gothic'"; g.fillStyle = "#fff"; g.fillText(title, 480, 90);
        const sp = g.createLinearGradient(300, 0, 660, 0); ["#ff5a78", "#ffaa46", "#ffeb6e", "#6ee696", "#5abeff", "#b482ff"].forEach((c, i) => sp.addColorStop(i / 5, c));   // the prism's spectrum under the title
        g.fillStyle = sp; g.fillRect(300, 122, 360, 3);
        list.forEach((m, i) => {
          g.globalAlpha = Math.max(0, Math.min(1, t - .3 - i * stagger));
          const halo = g.createRadialGradient(m.x, 300, 0, m.x, 300, 90); halo.addColorStop(0, m.c + "55"); halo.addColorStop(1, m.c + "00");   // a pool of the member's own colour under them
          g.fillStyle = halo; g.beginPath(); g.ellipse(m.x, 300, 90, 28, 0, 0, Math.PI * 2); g.fill();
          m.draw(g, t);
          if (m.fresh) { g.font = "bold 13px Galmuri11,'Malgun Gothic'"; g.fillStyle = m.c; g.fillRect(m.x - 22, 170, 44, 18); g.fillStyle = "#050818"; g.fillText("NEW", m.x, 180); }
          g.font = `bold ${nameSize}px Galmuri11,'Malgun Gothic'`; g.fillStyle = m.c; g.shadowColor = m.c; g.shadowBlur = 10; g.fillText(m.name, m.x, 345); g.shadowBlur = 0;
          g.fillRect(m.x - 22, 358, 44, 2);
          g.font = `${roleSize}px Galmuri11,'Malgun Gothic'`; g.fillStyle = "#cfe";
          (wrapAt ? wrap(m.role, wrapAt) : [m.role]).forEach((s, k) => g.fillText(s, m.x, 380 + k * 20));
        });
        g.globalAlpha = t > 1.5 ? 1 : 0; g.font = "20px Galmuri11,'Malgun Gothic'"; g.fillStyle = "#9ad0ff"; g.fillText(hint(), 480, hintY);
        g.globalAlpha = 1;
      },
    });
    g = $("pt").getContext("2d");
  };
}
