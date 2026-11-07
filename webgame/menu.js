// C-key menu: state and rules only (no DOM / clock), so it runs in the browser (globals MENU, fixKeys, keyLabel, menuHtml) and in Node (require).
// The view lives in index.html: it pauses story/battle while MENU.open and calls MENU.key(code) for every key press.
// Menu entries are the ITEMS list: add { id, label } and handle the id in activate() to extend it.
(function (root) {
  "use strict";
  // ctx: a key may be used by only one action per context (battle vs dialogue); dash and fast typing share X by default.
  const ACTIONS = [
    { id: "fire", label: "사격 ON/OFF", ctx: "battle", def: "KeyZ" },
    { id: "swap", label: "교대", ctx: "battle", def: "KeyA" },
    { id: "dash", label: "대시", ctx: "battle", def: "KeyX" },
    { id: "fast", label: "대화 빨리 출력", ctx: "talk", def: "KeyX" },
  ];
  const ITEMS = [{ id: "keys", label: "키 설정" }, { id: "volume", label: "볼륨" }, { id: "save", label: "저장" }, { id: "load", label: "불러오기" }, { id: "quit", label: "종료" }, { id: "close", label: "닫기" }];
  // movement, the menu itself and the dialogue-advance keys cannot be bound
  const RESERVED = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyS", "KeyD", "KeyC", "Space", "Enter", "Escape"]);
  const keyLabel = c => c.replace(/^Key|^Digit/, "").replace("Numpad", "N");

  const VOLS = [{ id: "bgm", label: "배경음" }, { id: "sfx", label: "효과음" }];
  const NOSTORE = { get: () => null, set() {} };
  function createMenu(dk = { advance: ["Space", "Enter", "KeyZ"], fast: "KeyX" }, store = NOSTORE) {   // dk = dialogue.js KEYS: the "fast" binding is written through to it; store = { get(k), set(k, v) } for the volume
    const keys = Object.fromEntries(ACTIONS.map(a => [a.id, a.def])); keys.fast = dk.fast;
    const vol = Object.fromEntries(VOLS.map(v => { const n = parseFloat(store.get("vol_" + v.id)); return [v.id, n >= 0 && n <= 1 ? n : 1]; }));   // 0..1 in tenths; index.html applies it to the sound
    const m = { open: false, page: "list", sel: 0, msg: "", items: ITEMS, keys, actions: ACTIONS, vol, vols: VOLS };
    const close = () => { m.open = false; m.page = "list"; m.msg = ""; };
    m.toggle = () => { if (m.open) close(); else { m.open = true; m.page = "list"; m.sel = 0; m.msg = ""; } return m.open; };
    m.rebind = (id, code) => {
      const a = ACTIONS.find(x => x.id === id);
      if (RESERVED.has(code) || (a.ctx === "talk" && dk.advance.includes(code))) return false;   // those advance dialogue
      if (ACTIONS.some(o => o.id !== id && o.ctx === a.ctx && keys[o.id] === code)) return false;
      keys[id] = code; if (id === "fast") dk.fast = code; return true;
    };
    const go = (page, sel = 0) => { m.page = page; m.sel = sel; m.msg = ""; };
    const wrap = (n, d) => m.sel = (m.sel + d + n) % n;
    // returns "quit" once the player confirms leaving; the caller goes back to the title
    m.key = code => {
      if (!m.open) return;
      if (code === "KeyC") return close();
      const ok = code === "Enter" || code === "Space" || code === "KeyZ", d = code === "ArrowDown" ? 1 : code === "ArrowUp" ? -1 : 0;
      if (m.page === "capture") {
        if (code === "Escape") return go("keys", m.sel);
        const id = ACTIONS[m.sel].id;
        if (m.rebind(id, code)) go("keys", m.sel); else m.msg = "그 키는 쓸 수 없어요";
      } else if (m.page === "confirm") {
        if (code === "Escape") return go("list", m.items.findIndex(i => i.id === "quit"));
        if (code.startsWith("Arrow")) m.sel = 1 - m.sel;
        else if (ok) { if (m.sel === 0) return "quit"; go("list", m.items.findIndex(i => i.id === "quit")); }
      } else if (m.page === "volume") {
        const back = () => go("list", m.items.findIndex(i => i.id === "volume"));
        if (code === "Escape") return back();
        if (d) wrap(VOLS.length + 1, d);
        else if (ok && m.sel === VOLS.length) back();
        else if (m.sel < VOLS.length && (code === "ArrowLeft" || code === "ArrowRight")) {
          const id = VOLS[m.sel].id; vol[id] = Math.min(1, Math.max(0, Math.round(vol[id] * 10 + (code === "ArrowRight" ? 1 : -1)) / 10));
          store.set("vol_" + id, String(vol[id]));
        }
      } else if (m.page === "keys") {
        if (code === "Escape") return go("list");
        if (d) wrap(ACTIONS.length + 1, d);
        else if (ok) { if (m.sel === ACTIONS.length) go("list"); else m.page = "capture"; }
      } else {
        if (code === "Escape") return close();
        if (d) wrap(m.items.length, d);
        else if (ok) {
          const id = m.items[m.sel].id;
          if (id === "keys") go("keys"); else if (id === "volume") go("volume"); else if (id === "save" || id === "load") return id; else if (id === "quit") go("confirm", 1); else close();
        }
      }
    };
    return m;
  }

  // "Z키" / "A키" in story text follow the current binding
  const fixKeys = (t, k) => t.replace("Z키", keyLabel(k.fire) + "키").replace("A키", keyLabel(k.swap) + "키");

  const menuHtml = m => {
    const row = (t, on) => `<div style="padding:4px 18px;${on ? "background:#4fc3ff44;border:2px solid #fff;" : "border:2px solid transparent;"}">${t}</div>`;
    let rows;
    if (m.page === "list") rows = m.items.map((i, k) => row(i.label, k === m.sel)).join("");
    else if (m.page === "confirm") rows = `<div>타이틀로 돌아갈까요?</div>` + ["예", "아니오"].map((t, k) => row(t, k === m.sel)).join("");
    else if (m.page === "volume") rows = m.vols.map((v, k) => row(`${v.label}: ◀ ${Math.round(m.vol[v.id] * 10)}/10 ▶`, k === m.sel)).join("") + row("뒤로", m.sel === m.vols.length);
    else rows = m.actions.map((a, k) => row(`${a.label}: ${m.page === "capture" && k === m.sel ? "키를 누르세요" : keyLabel(m.keys[a.id])}`, k === m.sel)).join("") + row("뒤로", m.sel === m.actions.length);
    return `<div style="min-width:280px;text-align:center;font-size:24px;line-height:1.6"><h2 style="margin:0 0 8px">MENU</h2>${rows}<div style="font-size:16px;color:#ffd36b;min-height:22px">${m.msg}</div><div style="font-size:14px;color:#9ad0ff">↑↓ 선택 · Enter 확인 · Esc 뒤로 · C 닫기</div></div>`;
  };

  // Save slot (one): scene index to restart from + BOND values. Mid-battle the caller passes the battle's own line index and the BOND from before the battle.
  const makeSave = (idx, b) => JSON.stringify({ idx, bond: { base: b.base, lv: b.lv, xp: b.xp } });
  const readSave = raw => {
    try { const d = JSON.parse(raw), b = d && d.bond; return Number.isInteger(d.idx) && b && [b.base, b.lv, b.xp].every(Number.isFinite) ? { idx: d.idx, bond: { base: b.base, lv: b.lv, xp: b.xp } } : null; } catch { return null; }
  };
  // what lines 0..idx-1 left behind (not stored): speaker renames, background theme, music
  const replayState = (script, idx) => {
    const r = { renames: {}, theme: undefined, bgm: undefined };
    for (const l of script.slice(0, idx)) { if (l.rename) r.renames[l.who] = l.rename; if (l.theme) r.theme = l.theme; if (l.bgm) r.bgm = l.bgm; }
    return r;
  };

  const api = { makeSave, readSave, replayState, createMenu, keyLabel, fixKeys, menuHtml };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else { Object.assign(root, api); root.MENU = createMenu(root.KEYS, { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } }); }   // dialogue.js loads first
})(typeof globalThis !== "undefined" ? globalThis : this);
