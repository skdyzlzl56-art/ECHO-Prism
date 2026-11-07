// Stage 4 battle configs (engine: ../battle.js runBattle, rules: ../battle/sim.js). See stage1/battles.js for the pattern helpers.
// Rewind rule (되감기 규칙): cfg.rewind = 5. Every 5 s the bullets jump back to where they were 1.5 s earlier, so a pattern repeats once.
// Flow: s4_ticks (mooks, rewind intro) -> s4_keeper (boss) -> 시계지기 joins -> s4_exit (4 allies, A-cycling in real play).
// Party: PARTY3 (stage3/battles.js) is the three-ally config. PARTY4 adds the 시계지기: rapid, light shots, no heal/shield.
// His bond light is "clock": the sim has a dedicated 'clock' light branch (winds the swap cooldown back; no heal, no power), so his role is volume of fire.

SPEAKERS.keeper = { name: "시계지기", pitch: 130, spin: .8, shape: "gear", color: "#e0b86a", close: 0 };   // 멈춘 시계탑의 관리인. 같은 순간을 되풀이하는 자. 차분하고 정확한 말투
SPEAKERS.tick = { name: "째깍이", pitch: 300, spin: 1.5, shape: "gear", color: "#c9a45a", close: 0 };          // 시계지기의 톱니에서 떨어져 나온 작은 부품 (잡몹)

const PARTY4 = { ...PARTY3, allies: ["lumi", "hexa", "glitch", "keeper"], kits: { ...PARTY3.kits, keeper: { cd: .55, dm: .6, heal: 0, shield: 0 } }, lights: { ...PARTY3.lights, keeper: "clock" } };

// ---- 1) 째깍이 무리: 되감기 규칙 입문 (5초마다 탄이 되감긴다) ----
BATTLES.s4_ticks = { stage: 4,
  ...PARTY3, speaker: "tick", hp: 450, bgm: "battle", color: "#d6b46a", rewind: 5, cuts: [.5], playerHp: 24,
  names: ["째깍이 「한 걸음 앞」", "째깍이 「같은 자리」"],
  moves: [{ x: "sway", amp: 60, spd: 1 }, { x: "sway", amp: 80, spd: 1.1, dash: 9 }],
  phases: [
    h => { h.rain(.45, 115); h.aim(1.6, 140); },
    h => { h.wave(1.8, 85); h.fan(1.7, 7, .28, 110); h.side(.9, 130); },
  ],
  talks: {
    1: [{ who: "voice", t: "탄이 거꾸로 감겨요! 5초마다 방금 지나간 길로 되돌아와요!" }, { who: "lumi", t: "어? 방금 피한 탄이 또 와! 시계가 거꾸로 도는 것 같아!" }],
    2: [{ who: "hexa", t: "한 번 본 궤적이다. 되감기 직전에 자리를 봐 두면 같은 길로 피할 수 있다." }],
  },
};
ACTS.s4_ticks = done => runBattle(BATTLES.s4_ticks, done);

// ---- 2) 시계지기: 4페이즈. 되감기마다 같은 궤적을 한 번 더 지나간다 ----
BATTLES.s4_keeper = { stage: 4,
  ...PARTY3, speaker: "keeper", hp: 900, bgm: "s4_boss", color: "#e0b86a", rewind: 5, cuts: [.75, .5, .25], playerHp: 26, ew: 90,
  winText: "시간이 흐른다!",
  names: ["시계지기 「정각의 종」", "시계지기 「되풀이되는 오후」", "시계지기 「멈춘 초침」", "시계지기 「마지막 한 분」"],
  moves: [{ x: "sway", amp: 70, spd: .9 }, { x: "sway", amp: 90, spd: 1.1, dash: 8 }, { x: "chase", speed: 90 }, { x: "sway", amp: 90, spd: 1.3, dash: 6.5 }],
  phases: [
    h => { h.ring(2, 13, 85, 7); h.rain(.7, 105); },                                                                            // 1: 종소리 같은 고리, 되감기로 두 번 온다
    h => { h.aim(1.4, 130, 10, { split: { t: 1.1, n: 8, sp: 90, size: 6 } }); h.wave(1.8, 85); },                             // 2: 분열탄
    h => { h.spiral(.12, 3, .45, 100, 7, { w: .2 }); h.side(.9, 130); h.laser(4, false); h.stall(1.8, 120, 7); },   // 3: 초침처럼 도는 나선, 멈췄다 달리는 초침탄 (되감기와 겹친다)
    h => { h.spiral(.1, 4, .35, 108, 7); h.ring(1.6, 15, 95, 8); h.wall(3, 90); h.aim(1.8, 130, 12, { split: { t: 1, n: 10, sp: 90, size: 6 } }); h.homing(2.4, 110, 7); },   // 4: 마지막 한 분
  ],
  talks: {
    1: [{ who: "keeper", t: "정각입니다. 이 종소리를 아직 한 번도 끝까지 울린 적이 없지요." }, { who: "voice", t: "5초마다 되감겨요! 한 번 본 탄은 같은 길로 한 번 더 와요!" }],
    2: [{ who: "lumi", t: "또 같은 탄이야! 그런데 두 번째엔 어디로 올지 알겠어!" }, { who: "keeper", t: "같은 오후를 몇 번이나 보냈는지... 저도 세다가 잊었습니다." }],
    3: [{ who: "hexa", t: "나선이 돌아온다. 되감기 직전의 자리를 기억해라." }],
    4: [{ who: "keeper", t: "이 한 분만 지나가면 내일이 옵니다. ...그게 무서워서 멈춰 세웠는데." }, { who: "voice", t: "내일은 와도 괜찮아요! 지금 흐르게 해 줘요!" }],
  },
};
ACTS.s4_keeper = done => runBattle(BATTLES.s4_keeper, done);

// ---- 3) 풀려난 시간: 동료 4명으로 A키 교대를 체험하는 마무리 전투 ----
BATTLES.s4_exit = { stage: 4,
  ...PARTY4, speaker: "tick", hp: 480, bgm: "battle", color: "#e0b86a", rewind: 5, cuts: [.5], playerHp: 24,
  winText: "시계가 다시 움직인다!",
  names: ["째깍이 「밀려드는 시간」", "째깍이 「쏟아지는 오후」"],
  moves: [{ x: "sway", amp: 70, spd: 1 }, { x: "chase", speed: 85, dash: 9 }],
  phases: [
    h => { h.rain(.4, 115); h.aim(1.5, 145); h.wave(2, 85); },
    h => { h.fan(1.5, 7, .28, 115); h.side(.8, 135); h.ring(2, 13, 90, 7); },
  ],
  talks: {
    1: [{ who: "voice", t: "A키로 네 분을 번갈아 불러 봐요! 루미, 헥사, 글리치, 시계지기 순서예요!" }, { who: "keeper", t: "저는 가볍게, 많이 쏩니다. 위급하면 '탄막 소거'로 둘레의 탄을 지우겠습니다." }],
    2: [{ who: "glitch", t: "또 되감기냐. 두 번 오는 탄이면 두 번 피하면 된다." }],
  },
};
ACTS.s4_exit = done => runBattle(BATTLES.s4_exit, done);
