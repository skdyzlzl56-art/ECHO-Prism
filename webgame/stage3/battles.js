// Stage 3 battle configs (engine: ../battle.js runBattle, rules: ../battle/sim.js). See stage1/battles.js for the pattern helpers.
// Colour rule (색 규칙): cfg.colorRule = RED. Only RED bullets hurt; every other colour passes through harmlessly.
// Flow: s3_blots (ordinary) -> s3_study (colour rule, gentle) -> s3_painter (boss). 글리치 joins after the boss.

SPEAKERS.painter = { name: "화가", pitch: 210, spin: .6, shape: "easel", color: "#d8d2c4", close: 0 };   // 색을 먼저 지워 버린 미술관의 주인. 조용하고 정중하다
SPEAKERS.blot = { name: "얼룩", pitch: 160, spin: 1.2, shape: "shard", color: "#9aa5b1", close: 0 };       // 화가의 붓끝에서 떨어진 잿빛 얼룩

const RED = "#ff4d6d";
const PARTY3_PRE = { ally: "lumi", allies: ["lumi", "hexa"] };     // before 글리치 is freed
// full party from here on (chapter 4+ spread this): 글리치 = fast, hard-hitting, no heal/shield; bond light = power
const PARTY3 = { ally: "lumi", allies: ["lumi", "hexa", "glitch"], kits: { glitch: { cd: .7, dm: 1.2, heal: 0, shield: 0 } }, lights: { lumi: "heal", hexa: "shield", glitch: "power" } };

// ---- 1) 잿빛 얼룩: 보통 전투 ----
BATTLES.s3_blots = { stage: 3,
  ...PARTY3_PRE, speaker: "blot", hp: 240, bgm: "battle", color: "#8fa0b5", cuts: [.5], playerHp: 24,
  names: ["얼룩 「번지는 잿빛」", "얼룩 「떨어지는 물감」"],
  moves: [{ x: "sway", amp: 60, spd: 1 }, { x: "chase", speed: 85, dash: 9 }],
  phases: [
    h => { h.rain(.45, 120); h.aim(1.4, 150); },
    h => { h.wave(1.8, 85); h.fan(1.6, 7, .28, 115); h.side(.9, 140); h.swell(2.5); },
  ],
  talks: { 1: [{ who: "blot", t: "색... 닦는다... 닦는다..." }, { who: "lumi", t: "이 얼룩들, 닦는 소리만 내! 으스스해!" }] },
};
ACTS.s3_blots = done => runBattle(BATTLES.s3_blots, done);

// ---- 2) 붉은 얼룩: 색 규칙 연습. 붉은 탄만 맞는다. 푸른 탄은 몸을 지나간다 ----
BATTLES.s3_study = { stage: 3,
  ...PARTY3_PRE, speaker: "blot", hp: 260, bgm: "battle", color: "#7f9cc4", colorRule: RED, cuts: [.5], playerHp: 22,
  winText: "색을 읽었다!",
  names: ["얼룩 「붉은 한 방울」", "얼룩 「엇갈린 색」"],
  moves: [{ x: "sway", amp: 60, spd: 1 }, { x: "sway", amp: 80, spd: 1.1, dash: 9 }],
  phases: [
    h => { h.rain(.3, 120); h.aim(1.8, 140, 8, { col: RED }); },
    h => { h.rain(.4, 125, 6, { col: RED }); h.wave(1.6, 85); h.fan(1.6, 7, .28, 110); h.aim(1.4, 150, 8, { col: RED }); },
  ],
  talks: {
    1: [{ who: "voice", t: "잘 보세요! 붉은 탄만 맞아요. 푸른 탄은 그냥 지나가요!" }, { who: "lumi", t: "그럼 파란 건 뚫고 가도 돼?! 신기하다!" }],
    2: [{ who: "hexa", t: "방패는 붉은 것만 신경 쓰면 된다. 눈을 속이지 마라." }],
  },
};
ACTS.s3_study = done => runBattle(BATTLES.s3_study, done);

// ---- 3) 화가: 페이즈마다 이름이 있다. 붉은 탄만 맞는다 (색 규칙). 5페이즈 ----
BATTLES.s3_painter = { stage: 3,
  ...PARTY3_PRE, speaker: "painter", hp: 600, bgm: "s3_boss", color: "#8aa4c8", colorRule: RED, cuts: [.8, .6, .4, .2], playerHp: 26, ew: 90,
  winText: "색이 돌아온다!",
  names: ["화가 「밑그림 지우기」", "화가 「한 점의 붉은색」", "화가 「번지는 수채」", "화가 「마지막 덧칠」", "화가 「텅 빈 캔버스」"],
  moves: [{ x: "sway", amp: 70, spd: .9 }, { x: "sway", amp: 90, spd: 1.1, dash: 8 }, { x: "chase", speed: 90 },
          { x: "sway", amp: 90, spd: 1.3, dash: 6.5 }, { x: "chase", speed: 105, dash: 5.5 }],
  phases: [
    h => { h.ring(1.9, 13, 90, 7, { col: RED }); h.rain(.7, 110); },                                                          // 1: 붉은 아치, 푸른 비는 무해
    h => { h.aim(1.4, 130, 10, { col: RED, split: { t: 1.1, n: 10, sp: 90, size: 6 } }); h.wave(1.8, 85); h.rain(.5, 110); },  // 2: 분열탄도 붉다
    h => { h.spiral(.12, 3, .45, 105, 7, { w: .2 }); h.side(.8, 140, 7, { col: RED }); h.laser(4, false); h.homing(2.2, 120, 7, { col: RED }); },   // 3: 푸른 나선 속 붉은 옆탄, 붉은 한 점이 쫓아온다
    h => { h.fan(1.5, 5, .35, 110, 12, { col: RED }); h.wall(3, 95, 6, { col: RED }); h.aim(.8, 200, 5); h.bounce(1.6, 150, 7, { col: RED }); },   // 4: 붉은 벽, 벽에 튕기는 붉은 탄
    h => { h.spiral(.1, 4, .35, 112, 7, { col: RED }); h.ring(1.5, 17, 100, 8); h.wall(3, 95); h.aim(1.8, 130, 14, { col: RED, split: { t: 1, n: 12, sp: 95, size: 6 } }); },   // 5: 텅 빈 캔버스
  ],
  talks: {
    1: [{ who: "painter", t: "......붉은 것만 남겨 두었습니다. 나머지는 이미 지웠으니까요." }, { who: "voice", t: "붉은 탄만 맞아요! 다른 색은 믿어도 돼요!" }],
    2: [{ who: "lumi", t: "붉은 거 한 점이 제일 위험해! 색이 더 선명해졌어!" }, { who: "painter", t: "이 한 점을... 빼앗기지 않으려 했을 뿐입니다." }],
    3: [{ who: "hexa", t: "푸른 나선은 뚫고 지나가라. 붉은 옆탄만 보면 된다." }],
    4: [{ who: "painter", t: "덧칠하면 사라지지 않습니다. 그래서... 덮어 버렸습니다." }, { who: "lumi", t: "덮는다고 사라지는 게 아니잖아!" }],
    5: [{ who: "painter", t: "아무것도 그리지 않으면, 아무것도 잃지 않아요." }, { who: "voice", t: "그 빈 캔버스에도 색이 있었어요. 지금 되돌려 줘요!" }],
  },
};
ACTS.s3_painter = done => runBattle(BATTLES.s3_painter, done);
