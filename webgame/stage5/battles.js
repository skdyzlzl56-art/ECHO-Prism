// Stage 5 battle configs (engine: ../battle.js runBattle, rules: ../battle/sim.js). See stage1/battles.js for the pattern helpers.
// Page rule (쪽 넘김 규칙): cfg.phaseRules[i].pageRule = { period, warn, dur, dmg, width }. A narrow safe strip shows in the warning, then the page turns; outside the strip hurts. Boss cycles shrink each phase.
// Flow: s5_pages (mooks, plain) -> s5_index (page rule, long cycle) -> s5_librarian (boss, page rule, shorter each phase). Party stays PARTY4 (nobody joins here).

SPEAKERS.librarian = { name: "사서", pitch: 170, spin: .7, shape: "book", color: "#a9b8e0", close: 0 };   // 이름 없는 도서관의 주인. 이름을 지키려고 모두 가둔 자. 낮고 정중한 존댓말
SPEAKERS.scrap = { name: "쪽지", pitch: 330, spin: 1.4, shape: "page", color: "#d8d0b8", close: 0 };       // 책에서 떨어져 나온 낱장 (잡몹). "이름"만 되뇐다

// ---- 1) 쪽지 무리: 보통 전투 ----
BATTLES.s5_pages = { stage: 5,
  ...PARTY4, speaker: "scrap", hp: 420, bgm: "battle", color: "#c9c0a8", cuts: [.5], playerHp: 24,
  names: ["쪽지 「찢어진 낱장」", "쪽지 「흩날리는 문장」"],
  moves: [{ x: "sway", amp: 60, spd: 1 }, { x: "chase", speed: 85, dash: 9 }],
  phases: [
    h => { h.rain(.45, 120); h.aim(1.5, 145); },
    h => { h.wave(1.8, 85); h.fan(1.7, 7, .28, 115); h.side(.9, 135); },
  ],
  talks: { 1: [{ who: "scrap", t: "이름... 이름... 이름을 내놔..." }, { who: "lumi", t: "종이가 날아다니면서 협박해! 그래도 하나도 안 무서워!" }] },
};

// ---- 2) 색인 서랍: 쪽 넘김 규칙 입문. 주기가 길다 ----
BATTLES.s5_index = { stage: 5,
  ...PARTY4, speaker: "scrap", hp: 420, bgm: "battle", color: "#b8b4d8", cuts: [.5], playerHp: 22,
  winText: "이름을 읽었다!",
  names: ["쪽지 「첫 번째 색인」", "쪽지 「엇갈린 색인」"],
  moves: [{ x: "sway", amp: 60, spd: 1 }, { x: "sway", amp: 80, spd: 1.1, dash: 9 }],
  phases: [
    h => { h.rain(.55, 105); h.side(1.2, 115); },
    h => { h.wave(1.8, 85); h.side(.9, 125); h.fan(1.9, 5, .3, 100); },
  ],
  phaseRules: [{ pageRule: { period: 9, warn: 1.8, dur: 3, dmg: 3, width: 90 } }, { pageRule: { period: 8, warn: 1.6, dur: 3, dmg: 3, width: 80 } }],   // 1~2: 쪽 넘김, 느린 주기
  talks: {
    1: [{ who: "voice", t: "책장이 넘어가기 전에 좁은 띠가 환하게 보여요! 쪽이 넘어가면 그 띠 안에 서 있어야 안전해요!" }, { who: "lumi", t: "띠 밖에 있으면 맞는 거지?! 보이면 바로 뛰어갈게!" }],
    2: [{ who: "hexa", t: "쪽이 넘어가기 전에 띠를 읽어라. 넘어간 뒤엔 늦다." }],
  },
};

// ---- 3) 사서: 4페이즈. 쪽 넘김 규칙, 페이즈가 오를수록 주기가 짧다 ----
BATTLES.s5_librarian = { stage: 5,
  ...PARTY4, speaker: "librarian", hp: 930, bgm: "s5_boss", color: "#a9b8e0", cuts: [.75, .5, .25], playerHp: 28, ew: 90,
  winText: "이름이 풀려난다!",
  names: ["사서 「첫 장」", "사서 「대출 중」", "사서 「열람 금지」", "사서 「마지막 장」"],
  moves: [{ x: "sway", amp: 70, spd: .9 }, { x: "sway", amp: 90, spd: 1.1, dash: 8 }, { x: "chase", speed: 90 }, { x: "sway", amp: 90, spd: 1.3, dash: 6.5 }],
  phases: [
    h => { h.rain(.6, 105); h.side(1, 120); },                                                                                  // 1: 책장에서 쏟아지는 이름
    h => { h.ring(2.2, 13, 85, 7); h.aim(1.6, 125, 10, { split: { t: 1.1, n: 8, sp: 85, size: 6 } }); h.burster(3.2, 4); },                       // 2: 이름이 갈라져 퍼진다
    h => { h.spiral(.13, 3, .45, 95, 7, { w: .2 }); h.shelf(3.6); h.laser(4, false); },                                       // 3: 책장을 넘기는 나선
    h => { h.spiral(.11, 4, .35, 100, 7); h.ring(1.7, 15, 90, 8); h.shelf(3.4); h.aim(1.9, 125, 12, { split: { t: 1, n: 10, sp: 85, size: 6 } }); },   // 4: 마지막 장
  ],
  phaseRules: [
    { pageRule: { period: 8, warn: 1.6, dur: 3, dmg: 3, width: 80 } }, { pageRule: { period: 7, warn: 1.4, dur: 2.6, dmg: 3, width: 75 } },
    { pageRule: { period: 6, warn: 1.2, dur: 2.2, dmg: 4, width: 70 } }, { pageRule: { period: 5, warn: 1, dur: 1.9, dmg: 4, width: 65 } },
  ],   // 쪽이 넘어가는 주기가 8 -> 5초로 짧아진다
  talks: {
    1: [{ who: "librarian", t: "읽히는 이름은 삼켜집니다. 그러니 읽는 법부터 가르쳐 드리지요." }, { who: "voice", t: "책장이 넘어가요! 쪽이 넘어가면 환하게 비친 띠 안에만 안전해요!" }],
    2: [{ who: "lumi", t: "쪽 넘어가는 게 점점 빨라져! 띠를 눈으로 먼저 찾자!" }, { who: "librarian", t: "대출 중입니다. 돌아올 사람이 있는 한, 이 책은 반납되지 않습니다." }],
    3: [{ who: "hexa", t: "나선만 보지 마라. 쪽이 넘어가는 소리를 읽어라." }],
    4: [{ who: "librarian", t: "마지막 장입니다. ......이 장만 넘기면, 이름들은 제 손을 떠납니다." }, { who: "voice", t: "떠나도 괜찮아요! 불러 주는 사람이 있을 거예요!" }],
  },
};
