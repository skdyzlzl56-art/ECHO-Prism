// Stage 2 battle configs (engine: ../battle.js runBattle, rules: ../battle/sim.js). See stage1/battles.js for the pattern helpers.
// Both companions are available here: A swaps 루미 <-> 헥사 (allies). The bond level is shared and carries over from earlier battles.
// Flow: s2_mooks -> s2_silence (can be beaten once) -> it rises again -> s2_flee (unbeatable: hits deal 0, survive to escape).

SPEAKERS.silence = { name: "침묵", pitch: 70, spin: 0.5, shape: "orb", color: "#9fb4c7", close: 0 };   // 소리·빛·이름을 삼키는 것. 말수가 적고 끊긴다

const PARTY = { ally: "lumi", allies: ["lumi", "hexa"] };

// ---- 1) 소리 없는 파편: 침묵에 먹힌 균열 조각 ----
BATTLES.s2_mooks = { stage: 2,
  ...PARTY, speaker: "fragment", hp: 350, bgm: "battle", color: "#7fb8d6", cuts: [.5], playerHp: 24,
  names: ["균열 「무음의 파편」", "균열 「가라앉는 종소리」"],
  moves: [{ x: "sway", amp: 60, spd: 1 }, { x: "chase", speed: 85, dash: 9 }],
  phases: [
    h => { h.rain(.45, 120); h.aim(1.4, 150); },
    h => { h.wave(1.8, 85); h.fan(1.6, 7, .28, 115); h.side(.9, 140); h.homing(2); },
  ],
  talks: { 1: [{ who: "hexa", t: "소리가 없는 만큼, 눈으로 봐라. 탄은 거짓말을 하지 않는다." }, { who: "lumi", t: "알았어! 내가 앞을 비출게!" }] },
};
ACTS.s2_mooks = done => runBattle(BATTLES.s2_mooks, done);

// ---- 2) 침묵: 페이즈가 오를수록 BGM과 탄 소리가 줄어든다 (fade). 체력을 0으로 만들 수 있다 ----
BATTLES.s2_silence = { stage: 2,
  ...PARTY, speaker: "silence", hp: 900, bgm: "s2_boss", color: "#9fb4c7", cuts: [.8, .6, .4, .2], playerHp: 26, ew: 90, fade: .2,
  phaseRules: [{}, {}, { splitRule: { period: 12, warn: 2, dur: 4 } }, { invertRule: { period: 12, warn: 2, dur: 4 } }, {}],   // 3: 판 분할, 4: 입력 반전
  winText: "쓰러뜨렸다...?",
  names: ["침묵 「소거」", "침묵 「잔향 지우기」", "침묵 「이름 삼키기」", "침묵 「빛의 소멸」", "침묵 「완전한 고요」"],
  moves: [{ x: "sway", amp: 70, spd: .9 }, { x: "sway", amp: 90, spd: 1.1, dash: 8 }, { x: "chase", speed: 90 },
          { x: "sway", amp: 90, spd: 1.3, dash: 6.5 }, { x: "chase", speed: 110, dash: 5.5 }],
  phases: [
    h => { h.ring(1.9, 13, 90, 7); h.rain(.8, 110); },                                                              // 1: 소거
    h => { h.aim(1.5, 130, 12, { split: { t: 1.1, n: 10, sp: 90, size: 6 } }); h.closing(2.6, 16, 75); h.stall(1.5); },                  // 2: 잔향 지우기
    h => { h.spiral(.12, 3, .45, 105, 7, { w: .2 }); h.closing(3, 18, 80); h.laser(4, false); },                      // 3: 이름 삼키기 (판 분할)
    h => { h.laser(2.5, true); h.fan(1.5, 5, .35, 110, 12); h.aim(.7, 220, 5, { col: "#fff" }); },                  // 4: 빛의 소멸
    h => { h.spiral(.1, 4, .35, 112, 7); h.bloom(2, 14, 95); h.closing(3.2, 20, 85); h.zone(3.5); h.aim(1.8, 130, 14, { split: { t: 1, n: 12, sp: 95, size: 6 } }); },   // 5: 완전한 고요
  ],
  talks: {
    1: [{ who: "silence", t: "......소리부터... 지운다." }, { who: "voice", t: "음악이 작아지고 있어요! 눈과 손끝에 집중해요!" }],
    2: [{ who: "hexa", t: "방패로 막을 수 있다. 내가 곁에 있을 때는 한 번은 버틴다." }, { who: "lumi", t: "다치면 내가 고쳐 줄게! 필요하면 A로 불러 줘!" }],
    3: [{ who: "silence", t: "......이름. 너의 이름. 들려줘." }, { who: "lumi", t: "안 돼! 내 이름은 내 거야!" }, { who: "voice", t: "조심해요! 이제 가끔 방향키가 거꾸로 움직여요. 노란 경고가 뜨면 곧 반전이에요. 옆의 막대가 남은 시간이에요!" }],
    4: [{ who: "silence", t: "......빛이 시끄러워. 이제 꺼." }, { who: "hexa", t: "마지막 힘이다. 밀어붙여라!" }],
  },
};
ACTS.s2_silence = done => runBattle(BATTLES.s2_silence, done);

// ---- 3) 도망: 침묵은 쓰러지지 않는다. 팅팅 튕겨 나가는 공격, 30초만 버티면 탈출한다. BGM 없이 심장 소리만 ----
BATTLES.s2_flee = { stage: 2,
  ...PARTY, speaker: "silence", hp: 999, bgm: null, beat: true, invuln: true, survive: 30, color: "#ff8aa0", cuts: [], playerHp: 28, ew: 90, winText: "탈출!",
  names: ["침묵 「무음의 추격」"],
  moves: [{ x: "chase", speed: 100, dash: 6 }],
  phases: [h => { h.spiral(.11, 3, .4, 112, 7); h.aim(1.1, 170, 6); h.wall(2.8, 105); h.laser(2.6, true); h.side(.8, 150, 7); }],
};
ACTS.s2_flee = done => runBattle(BATTLES.s2_flee, done);
