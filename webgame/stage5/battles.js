// Stage 5 battle configs (engine: ../battle.js runBattle, rules: ../battle/sim.js). See stage1/battles.js for the pattern helpers.
// Direction rule (방향 규칙): cfg.dirRule = { name }. Bullets carry that name; moving the way a named bullet moves is safe, standing still or going against it hurts.
// Flow: s5_pages (mooks, plain) -> s5_index (direction rule, gentle) -> s5_librarian (boss, direction rule). Party stays PARTY4 (nobody joins here).

SPEAKERS.librarian = { name: "사서", pitch: 170, spin: .7, shape: "rings", color: "#a9b8e0", close: 0 };   // 이름 없는 도서관의 주인. 이름을 지키려고 모두 가둔 자. 낮고 정중한 존댓말
SPEAKERS.scrap = { name: "쪽지", pitch: 330, spin: 1.4, shape: "orb", color: "#d8d0b8", close: 0 };       // 책에서 떨어져 나온 낱장 (잡몹). "이름"만 되뇐다

// ---- 1) 쪽지 무리: 보통 전투 ----
BATTLES.s5_pages = { stage: 5,
  ...PARTY4, speaker: "scrap", hp: 260, bgm: "battle", color: "#c9c0a8", cuts: [.5], playerHp: 24,
  names: ["쪽지 「찢어진 낱장」", "쪽지 「흩날리는 문장」"],
  moves: [{ x: "sway", amp: 60, spd: 1 }, { x: "chase", speed: 85, dash: 9 }],
  phases: [
    h => { h.rain(.45, 120); h.aim(1.5, 145); },
    h => { h.wave(1.8, 85); h.fan(1.7, 7, .28, 115); h.side(.9, 135); },
  ],
  talks: { 1: [{ who: "scrap", t: "이름... 이름... 이름을 내놔..." }, { who: "lumi", t: "종이가 날아다니면서 협박해! 그래도 하나도 안 무서워!" }] },
};
ACTS.s5_pages = done => runBattle(BATTLES.s5_pages, done);

// ---- 2) 색인 서랍: 방향 규칙 입문. 탄에 「책」이 적혀 있다 ----
BATTLES.s5_index = { stage: 5,
  ...PARTY4, speaker: "scrap", hp: 260, bgm: "battle", color: "#b8b4d8", dirRule: { name: "책" }, cuts: [.5], playerHp: 22,
  winText: "이름을 읽었다!",
  names: ["쪽지 「첫 번째 색인」", "쪽지 「엇갈린 색인」"],
  moves: [{ x: "sway", amp: 60, spd: 1 }, { x: "sway", amp: 80, spd: 1.1, dash: 9 }],
  phases: [
    h => { h.rain(.55, 105); h.side(1.2, 115); },
    h => { h.wave(1.8, 85); h.side(.9, 125); h.fan(1.9, 5, .3, 100); },
  ],
  talks: {
    1: [{ who: "voice", t: "탄에 「책」이라고 적혀 있어요! 탄이 가는 쪽으로 같이 움직이면 안전해요!" }, { who: "lumi", t: "서 있으면 맞는 거지?! 계속 움직일게!" }],
    2: [{ who: "hexa", t: "탄과 같은 방향으로 걸어라. 멈추는 것도, 거스르는 것도 안 된다." }],
  },
};
ACTS.s5_index = done => runBattle(BATTLES.s5_index, done);

// ---- 3) 사서: 4페이즈. 모든 탄에 「이름」이 적혀 있다 (방향 규칙) ----
BATTLES.s5_librarian = { stage: 5,
  ...PARTY4, speaker: "librarian", hp: 580, bgm: "s5_boss", color: "#a9b8e0", dirRule: { name: "이름" }, cuts: [.75, .5, .25], playerHp: 28, ew: 90,
  winText: "이름이 풀려난다!",
  names: ["사서 「조용히 해 주십시오」", "사서 「대출 중」", "사서 「열람 금지」", "사서 「마지막 장」"],
  moves: [{ x: "sway", amp: 70, spd: .9 }, { x: "sway", amp: 90, spd: 1.1, dash: 8 }, { x: "chase", speed: 90 }, { x: "sway", amp: 90, spd: 1.3, dash: 6.5 }],
  phases: [
    h => { h.rain(.6, 105); h.side(1, 120); },                                                                                  // 1: 책장에서 쏟아지는 이름
    h => { h.ring(2.2, 13, 85, 7); h.aim(1.6, 125, 10, { split: { t: 1.1, n: 8, sp: 85, size: 6 } }); },                       // 2: 이름이 갈라져 퍼진다
    h => { h.spiral(.13, 3, .45, 95, 7, { w: .2 }); h.side(.9, 125); h.laser(4, false); },                                       // 3: 책장을 넘기는 나선
    h => { h.spiral(.11, 4, .35, 100, 7); h.ring(1.7, 15, 90, 8); h.wall(3.2, 85); h.aim(1.9, 125, 12, { split: { t: 1, n: 10, sp: 85, size: 6 } }); },   // 4: 마지막 장
  ],
  talks: {
    1: [{ who: "librarian", t: "읽히는 이름은 삼켜집니다. 그러니 읽는 법부터 가르쳐 드리지요." }, { who: "voice", t: "「이름」이 적힌 탄이에요! 탄이 가는 쪽으로 같이 가면 안전해요!" }],
    2: [{ who: "lumi", t: "갈라진 탄도 같은 이름이야! 방향만 맞추면 돼!" }, { who: "librarian", t: "대출 중입니다. 돌아올 사람이 있는 한, 이 책은 반납되지 않습니다." }],
    3: [{ who: "hexa", t: "나선이 도는 쪽을 읽어라. 멈추면 책장에 눌린다." }],
    4: [{ who: "librarian", t: "마지막 장입니다. ......이 장만 넘기면, 이름들은 제 손을 떠납니다." }, { who: "voice", t: "떠나도 괜찮아요! 불러 주는 사람이 있을 거예요!" }],
  },
};
ACTS.s5_librarian = done => runBattle(BATTLES.s5_librarian, done);
