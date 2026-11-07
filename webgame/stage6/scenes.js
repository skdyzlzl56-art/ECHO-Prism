// Stage 6 non-battle scene: the ending card (s6_title). Click / SPACE / Enter / Z returns to the title (a fresh load shows the start screen).
// Globals: $, stage, act.

ACTS.s6_title = done => {
  act.hidden = false;
  act.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;background:#06030f;color:#e6dcff;font-family:'Malgun Gothic';text-align:center;gap:14px">
    <div style="font-size:56px;font-weight:bold;letter-spacing:6px">ECHO PRISM</div>
    <div style="font-size:20px">잃어버린 이름을 찾는 여정이 끝났습니다.</div>
    <div style="font-size:15px;color:#9ad0ff;margin-top:24px">클릭, SPACE 또는 Z로 타이틀로 돌아갑니다</div></div>`;
  let fin = false;
  const go = () => { if (fin) return; fin = true; location.reload(); };
  const key = e => { if (e.code === "Space" || e.code === "Enter" || e.code === "KeyZ") { e.preventDefault(); go(); } };
  setTimeout(() => { act.onclick = go; addEventListener("keydown", key); }, 1500);
};
