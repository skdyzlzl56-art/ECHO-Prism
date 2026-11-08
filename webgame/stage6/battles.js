// Stage 6 battle configs (engine: ../battle.js runBattle, rules: ../battle/sim.js). See stage1/battles.js for the pattern helpers.
// Per-phase rules: cfg.phaseRules[level] = { colorRule | rewind | darkRule | gravityRule | stillRule | invertRule | splitRule | finale } picks the rule of each phase (chapter 1-5 rules mixed; no direction rule).
// finale: the last phase of 침묵. Shots deal 0; once the bond is full (Lv.4) the bond light bursts as the 합동 유대의 빛 (cfg.jointLight) and ends the fight.
// Flow: s6_echoes (mooks, plain) -> s6_trial (three rules, one per phase) -> s6_silence (boss). Party stays PARTY4.

// ---- 1) 메아리 조각: 보통 전투 ----
BATTLES.s6_echoes = { stage: 6,
  ...PARTY4, speaker: "fragment", hp: 450, bgm: "battle", color: "#c9b8ff", cuts: [.5], playerHp: 24,
  names: ["균열 「돌아온 소리」", "균열 「겹쳐진 소리」"],
  moves: [{ x: "sway", amp: 60, spd: 1 }, { x: "chase", speed: 85, dash: 9 }],
  phases: [
    h => { h.rain(.45, 120); h.aim(1.5, 150); },
    h => { h.wave(1.8, 85); h.fan(1.6, 7, .28, 115); h.side(.9, 140); },
  ],
  talks: { 1: [{ who: "lumi", t: "이 조각들, 우리가 지나온 길의 소리를 흉내 내! 하나도 안 무서워!" }, { who: "voice", t: "코어에 모인 소리가 조각이 되어 흘러나오는 거예요!" }] },
};

// ---- 2) 세 갈래 시험: 색 → 되감기 → 어둠. 침묵 전의 총연습 ----
BATTLES.s6_trial = { stage: 6,
  ...PARTY4, speaker: "fragment", hp: 530, bgm: "battle", color: "#b8a8ff", cuts: [.67, .34], playerHp: 24,
  phaseRules: [{ colorRule: RED }, { rewind: 5 }, { darkRule: { radius: 130 } }],
  winText: "세 갈래를 읽었다!",
  names: ["균열 「붉은 메아리」", "균열 「되감긴 메아리」", "균열 「이름 없는 메아리」"],
  moves: [{ x: "sway", amp: 60, spd: 1 }, { x: "sway", amp: 80, spd: 1.1, dash: 9 }, { x: "sway", amp: 80, spd: 1.1 }],
  phases: [
    h => { h.rain(.35, 120); h.aim(1.8, 140, 8, { col: RED }); },
    h => { h.rain(.5, 110); h.aim(1.6, 140); h.wave(2, 85); },
    h => { h.rain(.6, 105); h.side(1.1, 120); h.fan(2, 5, .3, 100); },
  ],
  talks: {
    0: [{ who: "voice", t: "붉은 탄만 맞아요! 미술관에서 배운 그대로예요!" }],
    1: [{ who: "keeper", t: "5초마다 되감깁니다. 한 번 본 궤적은 두 번째가 쉽습니다." }],
    2: [{ who: "hexa", t: "불이 꺼진다. 네 곁의 탄만 보인다. 보이지 않는 탄도 맞으니 방심하지 마라." }],
  },
};

// ---- 3) 침묵: 5페이즈. 색+정지 → 되감기+판 분할 → 어둠+중력 → 색+되감기+조작 반전 → 마지막은 합동 유대의 빛 ----
BATTLES.s6_silence = { stage: 6,
  ...PARTY4, speaker: "silence", hp: 1120, bgm: "s6_boss", color: "#9fb4c7", cuts: [.8, .6, .4, .2], playerHp: 32, ew: 90, jointLight: true, silent: true,
  phaseRules: [{ colorRule: RED, stillRule: { period: 12, warn: 2, dur: 2.5, dmg: 3 } }, { rewind: 5, splitRule: { period: 14, warn: 2, dur: 4 } }, { darkRule: { radius: 140 }, gravityRule: { period: 8, warn: 1.6, dur: 2.6, pull: 90 } }, { colorRule: RED, rewind: 5, invertRule: { period: 12, warn: 2, dur: 4 } }, { finale: true }],
  winText: "침묵이 돌아간다!",
  names: ["침묵 「붉게 번지는 소리」", "침묵 「되돌아오는 소리」", "침묵 「이름을 찾는 소리」", "침묵 「겹쳐 우는 소리」", "침묵 「처음의 기억」"],
  moves: [{ x: "sway", amp: 70, spd: .9 }, { x: "sway", amp: 90, spd: 1.1, dash: 8 }, { x: "chase", speed: 90 }, { x: "sway", amp: 90, spd: 1.3, dash: 7 }, { x: "sway", amp: 60, spd: .7 }],
  phases: [
    h => { h.ring(1.9, 13, 90, 7, { col: RED }); h.rain(.7, 110); },                                                            // 1: 색 규칙 + 정지 규칙. 붉은 고리만 위험, 멈춰! 동안은 가만히
    h => { h.ring(2, 13, 85, 7); h.aim(1.4, 130, 10, { split: { t: 1.1, n: 8, sp: 90, size: 6 } }); h.bomb(7); },                          // 2: 되감기 + 판 분할. 분열탄이 두 번 온다
    h => { h.spiral(.13, 3, .45, 100, 7, { w: .2 }); h.side(.9, 125); h.laser(4, false); },                    // 3: 어둠 + 중력. 끌어당기는 화살표는 어둠 속에서도 보인다
    h => { h.spiral(.12, 3, .4, 105, 7, { col: RED }); h.wall(3.2, 90, 6, { col: RED }); h.aim(1.6, 130, 12, { col: RED, split: { t: 1, n: 10, sp: 90, size: 6 } }); h.rain(.6, 100); },   // 4: 붉은 탄 + 되감기 + 조작 반전
    h => { h.rain(.55, 95); h.aim(1.6, 110, 8); h.hush(2.6, 18); },                                                      // 5: 규칙 없음. 스치며 유대를 채워 합동의 빛을 터뜨린다
  ],
  talks: {
    0: [{ who: "silence", t: "......붉은... 것만... 남겨." }, { who: "voice", t: "붉은 탄만 맞아요! 다른 색은 믿어요!" }, { who: "voice", t: "그리고 '멈춰!'가 뜨면 움직이지 마세요! 그 동안 움직이거나 대시하면 아파요. 가만히 있으면 괜찮아요!" }],
    1: [{ who: "silence", t: "......돌아와... 돌아와......" }, { who: "keeper", t: "되감깁니다. 이 소리는 돌아오고 싶어 하는군요. 판이 반으로 갈라질 때는 안전한 쪽으로 가세요." }],
    2: [{ who: "lumi", t: "앗, 깜깜해졌어! 주변밖에 안 보여! 화살표 방향으로 몸이 끌려간대! 반대로 버티자!" }, { who: "silence", t: "......이름... 내 이름... 어디......" }],
    3: [{ who: "hexa", t: "색과 시간이 한꺼번에 온다. 붉은 것만 보고, 되감기 직전의 자리를 기억해라. 조작이 거꾸로 뒤집히는 때도 온다." }, { who: "glitch", t: "......합쳐서 덤비냐. 나도 그래 주마." }],
    4: [{ who: "silence", t: "......아파... 외로워... 불러... 줘......" }, { who: "voice", t: "이제 공격은 닿지 않아요! 탄을 스치며 유대를 가득 채워요. 모두의 빛이 하나로 터질 때까지!" }, { who: "lumi", t: "다 같이! 우리 넷이서 한 번에!" }],
  },
};
