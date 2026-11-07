// Stage 1 battle configs (engine: ../battle.js runBattle). Scenes in story.js call these by BATTLES name (index.html turns every BATTLES entry into an ACTS entry).
// Bullet size: 6 = normal, 12+ = heavy orb (louder, longer shot sound, 6 damage).
// Pattern helpers (h.*): rain wall wave aim aimFan fan ring side spiral laser (boss-only: door bloom closing). Options: { col, w, acc, split, sa, sf }.
// Each helper has its own bullet tone (same hue, different saturation/lightness) so patterns are told apart by colour.
// moves: enemy movement per phase (sway / chase, optional dash = seconds between warned body-slams).

SPEAKERS.fragment = { name: "균열 조각", pitch: 140, spin: 1.4, shape: "shard", color: "#ff7a9a", close: 0 };   // 떼로 몰려오는 작은 균열
SPEAKERS.lumi = { name: "루미", pitch: 560, spin: 0.6, shape: "bloom", color: "#ffa6d9", close: 2 };            // 등불지기, 동료
SPEAKERS.hexa = { name: "헥사", pitch: 110, spin: 0.7, shape: "rings", color: "#ffb347", close: 1 };            // 문지기, 보스 -> 아군

// ---- 1) 균열 조각 무리: 루미를 구한다 (루미는 아직 동료가 아님) ----
BATTLES.s1_fragments = { stage: 1,
  speaker: "fragment", hp: 260, bgm: "battle", color: "#ff7a9a", cuts: [.5],
  names: ["균열 「조각의 장벽」", "균열 「파도치는 파편」"],
  moves: [{ x: "sway", amp: 60, spd: 1 }, { x: "chase", speed: 80, dash: 10 }],
  phases: [
    h => { h.wall(3, 90); h.rain(.5); },
    h => { h.wave(2, 85); h.aimFan(1.3, 3, .3, 150); h.rain(.6); h.bounce(1.8); },
  ],
  talks: { 1: [{ who: "lumi", t: "더 와! 하지만 내 등불엔 손대지 마!" }, { who: "fragment", t: "빛... 내놔... 전부... 내놔..." }] },
};

// ---- 2) 문지기 헥사: 루미가 곁에서 돕는다. 무거운 구슬(size 12~14)일수록 소리도 크고 길다 ----
BATTLES.s1_boss = { stage: 1,
  speaker: "hexa", hp: 740, bgm: "s1_boss", color: "#ffb347", cuts: [.83, .66, .5, .33, .16],
  phaseRules: [{}, {}, { boxRule: { amp: 40, period: 6 } }, {}, {}, {}],   // 3페이즈: 판이 미끄러진다
  ally: "lumi", playerHp: 24, ew: 90, winText: "해방!",
  moves: [{ x: "sway", amp: 70, spd: .9 }, { x: "sway", amp: 90, spd: 1.1, dash: 8 }, { x: "chase", speed: 90 },
          { x: "sway", amp: 80, spd: 1.3, dash: 6.5 }, { x: "chase", speed: 110, dash: 6 }, { x: "sway", amp: 100, spd: 1.6, dash: 5 }],
  names: ["문 「육각 방벽」", "문 「조준 철퇴」", "문 「삼중 나선」", "문 「붕괴의 빛」", "문 「침묵의 비명」", "문 「최후의 문」"],
  phases: [
    h => { h.ring(1.7, 13, 95, 8); h.wall(3.2, 85); h.rain(.9, 110); },                                             // 1: 육각 방벽
    h => { h.aim(1.6, 120, 14, { split: { t: 1.1, n: 10, sp: 90, size: 6 } }); h.door(2.6); h.breakable(3.5); }, // 2: 조준 철퇴 (분열탄) + 문 닫기(옆에서 닫히는 문, 틈으로). 큰 탄은 쏴서 깎는다
    h => { h.spiral(.1, 3, .5, 105, 7, { w: .25 }); h.side(.7, 140, 7); h.laser(4.2, false); h.toggle(4); },                      // 3: 삼중 나선 + 낙뢰
    h => { h.laser(2.4, true); h.bloom(1.8, 12); h.aim(.6, 240, 5, { col: "#fff" }); },                   // 4: 붕괴의 빛 (조준 광선 + 휘는 꽃잎)
    h => { h.ring(1.4, 17, 100, 9, { w: .4 }); h.spiral(.13, 2, .4, 110, 7); h.aim(1.6, 130, 14, { split: { t: 1, n: 12, sp: 95, size: 6 } }); }, // 5: 침묵의 비명
    h => { h.spiral(.09, 4, .35, 115, 7); h.laser(2, true); h.door(3); h.bloom(2.2, 14); h.aim(1.7, 130, 14, { split: { t: 1, n: 14, sp: 100, size: 6 } }); }, // 6: 최후의 문
  ],
  talks: {
    1: [{ who: "lumi", t: "헥사! 나야, 루미야! 나 기억 안 나?" }, { who: "hexa", t: "루미...? 그 이름은... 아니다. 지운다!" }],
    2: [{ who: "lumi", t: "비 오던 밤을 떠올려 봐! 네가 우산이 되어 줬잖아!" }, { who: "hexa", t: "비...? 닥쳐... 닥쳐라!" }],
    3: [{ who: "hexa", t: "머리가... 갈라진다... 문을... 지켜야... 하는데..." }, { who: "lumi", t: "그 문은 우리를 지키려던 거잖아! 우릴 막으려던 게 아니야!" }],
    4: [{ who: "hexa", t: "빛이... 눈이 부시다... 이건 내가 지키려던... 빛이었나?" }],
    5: [{ who: "hexa", t: "나는... 대체 누구를 지키려 했던 거지...?" }, { who: "lumi", t: "지금 네 앞에 있는 우리! 그리고... 너 자신도 지켜, 바보야!" }, { who: "hexa", t: "크아아아아--- 마지막이다! 전부 받아라!" }],
  },
};
