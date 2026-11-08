// Stage 5 battle configs (engine: ../battle.js runBattle, rules: ../battle/sim.js). See stage1/battles.js for the pattern helpers.
// Gravity rule (중력 규칙): cfg.phaseRules[i].gravityRule = { period, warn, dur, pull }. An arrow shows in the warning, then for `dur` s the player is pulled that way at `pull` px/s (always slower than walking); walk against it. Boss cycles shorten and the pull grows each phase.
// Flow: s5_pages (mooks, plain) -> s5_index (gravity rule, long cycle) -> s5_librarian (boss, gravity rule, stronger each phase). Party stays PARTY4 (nobody joins here).

SPEAKERS.librarian = { name: "사서", pitch: 170, spin: .7, shape: "book", color: "#a9b8e0", close: 0 };   // 이름 없는 도서관의 주인. 이름을 지키려고 모두 가둔 자. 낮고 정중한 존댓말
SPEAKERS.scrap = { name: "쪽지", pitch: 330, spin: 1.4, shape: "page", color: "#d8d0b8", close: 0 };       // 책에서 떨어져 나온 낱장 (잡몹). "이름"만 되뇐다

// ---- 1) 쪽지 무리: 보통 전투 ----
BATTLES.s5_pages = { stage: 5,
  ...PARTY4, speaker: "scrap", hp: 420, bgm: "battle", color: "#c9c0a8", cuts: [.5], playerHp: 24,
  names: ["쪽지 「찢어진 낱장」", "쪽지 「흩날리는 낱장」"],
  moves: [{ x: "sway", amp: 60, spd: 1 }, { x: "chase", speed: 85, dash: 9 }],
  phases: [
    h => { h.rain(.45, 120); h.aim(1.5, 145); },
    h => { h.wave(1.8, 85); h.fan(1.7, 7, .28, 115); h.side(.9, 135); },
  ],
  talks: { 1: [{ who: "scrap", t: "...가지 마... 여기... 있어줘..." }, { who: "lumi", t: "종이가 날아다니면서 매달려! 그래도 하나도 안 무서워!" }] },
};

// ---- 2) 색인 서랍: 중력 규칙 입문. 주기가 길고 끌림이 약하다 ----
BATTLES.s5_index = { stage: 5,
  ...PARTY4, speaker: "scrap", hp: 420, bgm: "battle", color: "#b8b4d8", cuts: [.5], playerHp: 22,
  winText: "중력을 이겨 냈다!",
  names: ["쪽지 「가라앉는 낱장」", "쪽지 「기울어진 낱장」"],
  moves: [{ x: "sway", amp: 60, spd: 1 }, { x: "sway", amp: 80, spd: 1.1, dash: 9 }],
  phases: [
    h => { h.rain(.55, 105); h.side(1.2, 115); },
    h => { h.wave(1.8, 85); h.side(.9, 125); h.fan(1.9, 5, .3, 100); },
  ],
  phaseRules: [{ gravityRule: { period: 10, warn: 2, dur: 3, pull: 45 } }, { gravityRule: { period: 9, warn: 1.8, dur: 3, pull: 55 } }],   // 1~2: 중력, 긴 주기, 약한 끌림
  talks: {
    0: [{ who: "voice", t: "화살표가 뜨면 곧 그쪽으로 몸이 끌려가요! 끌려가는 힘보다 걷는 게 빠르니까, 화살표 반대쪽으로 걸어서 버텨요!" }, { who: "lumi", t: "벽까지 밀려가면 위험하겠네! 화살표가 보이면 바로 버틸게!" }],
    1: [{ who: "hexa", t: "끌림은 매번 다른 쪽에서 온다. 화살표를 보고 자리를 먼저 잡아라." }],
  },
};

// ---- 3) 사서: 4페이즈. 중력 규칙, 페이즈가 오를수록 주기가 짧고 끌림이 세다 ----
BATTLES.s5_librarian = { stage: 5,
  ...PARTY4, speaker: "librarian", hp: 930, bgm: "s5_boss", color: "#a9b8e0", cuts: [.75, .5, .25], playerHp: 28, ew: 90,
  winText: "이름이 풀려난다!",
  names: ["사서 「가벼운 서가」", "사서 「기우는 서가」", "사서 「무거운 서가」", "사서 「가라앉은 서가」"],
  moves: [{ x: "sway", amp: 70, spd: .9 }, { x: "sway", amp: 90, spd: 1.1, dash: 8 }, { x: "chase", speed: 90 }, { x: "sway", amp: 90, spd: 1.3, dash: 6.5 }],
  phases: [
    h => { h.rain(.6, 105); h.side(1, 120); },                                                                                  // 1: 위에서 쏟아지는 탄
    h => { h.ring(2.2, 13, 85, 7); h.aim(1.6, 125, 10, { split: { t: 1.1, n: 8, sp: 85, size: 6 } }); h.burster(3.2, 4); },                       // 2: 갈라져 퍼지는 탄
    h => { h.spiral(.13, 3, .45, 95, 7, { w: .2 }); h.wall(3.6, 90, 6); h.laser(4, false); },                                 // 3: 나선과 벽
    h => { h.spiral(.11, 4, .35, 100, 7); h.ring(1.7, 15, 90, 8); h.wall(3.4, 90, 6); h.aim(1.9, 125, 12, { split: { t: 1, n: 10, sp: 85, size: 6 } }); },   // 4: 모든 탄이 한꺼번에
  ],
  phaseRules: [
    { gravityRule: { period: 9, warn: 1.8, dur: 3, pull: 60 } }, { gravityRule: { period: 8, warn: 1.6, dur: 2.8, pull: 75 } },
    { gravityRule: { period: 7, warn: 1.5, dur: 2.6, pull: 90 } }, { gravityRule: { period: 6, warn: 1.4, dur: 2.4, pull: 105 } },
  ],   // 중력 주기가 9 -> 6초로 짧아지고 끌림이 60 -> 105로 세진다
  talks: {
    0: [{ who: "librarian", t: "이 서가는 모든 것을 끌어당깁니다. 이름도, 발걸음도요. 버티는 법부터 보여 드리지요." }, { who: "voice", t: "화살표가 뜨면 몸이 그쪽으로 끌려가요! 반대쪽으로 걸으면 버틸 수 있어요!" }],
    1: [{ who: "lumi", t: "끌어당기는 힘이 점점 세지고 빨라져! 화살표를 눈으로 먼저 찾자!" }, { who: "librarian", t: "대출 중입니다. 돌아올 사람이 있는 한, 서가는 여러분을 끌어당겨서라도 붙잡아 둘 겁니다." }],
    2: [{ who: "hexa", t: "탄만 보지 마라. 끌어당기는 화살표가 뜨는 때를 읽어라." }],
    3: [{ who: "librarian", t: "마지막 장입니다. ......이 서가가 끌어당기는 걸 놓을 수만 있다면, 이름들은 제 손을 떠납니다." }, { who: "voice", t: "떠나도 괜찮아요! 불러 주는 사람이 있을 거예요!" }],
  },
};
