// STAGE 2 - 소리 없는 정원. Appended to SCRIPT after stage 1 (stage1/story.js).
// Flow: 도착(워프, 배경 전환) -> 소리 없는 파편 -> 침묵 등장·전투(한 번 쓰러뜨림) -> 침묵이 다시 일어남 -> 도주 전투 -> 탈출
// `theme` switches the background mood on that line (night | lantern | silence | flee, see portraits.js); `bgm: "off"` stops the music.

FX.stage2 = { shout: "STAGE 2", flash: 1, warp: "silence", shake: 1, wait: 2200, sfx: () => { sweep(600, 120, 1.6, "sine", .3); sweep(900, 200, 1.6, "triangle", .15); } };
FX.revive = { shake: 1, flash: 1, wait: 1400, sfx: () => { noise(.6, .6); sweep(300, 30, 1.2, "sawtooth", .4); } };
FX.escape = { shout: "ESCAPE", flash: 1, wait: 1600, sfx: () => { sweep(200, 1400, 1, "sine", .3); sweep(100, 700, 1, "triangle", .2); } };

const STAGE2 = [
  // ---- 1. 도착 ----
  { who: "voice", text: "문 너머로 길이 이어져 있어요. 모두, 제 날개 곁에 붙어 있어요." },
  { who: "voice", fx: "stage2", bgm: "s2_field", text: "......도착했어요. 여기는 두 번째 길, '소리 없는 정원'이에요." },
  { who: "lumi", text: "어... 뭐야, 너무 조용해. 내 발소리도 안 들려." },
  { who: "hexa", text: "소리가 먹히고 있다. 문 너머에서 스며 나온 것이... 이곳까지 닿았군." },
  { who: "voice", text: "이 정원은 원래 종소리로 가득했대요. 지금은 바람 소리조차 없네요." },
  { who: "voice", text: "이제부터는 X키로 루미와 헥사를 번갈아 부를 수 있어요. 유대 레벨은 둘이 함께 쌓아 가요." },
  { who: "voice", text: "루미는 빠르게 쏘고 상처를 치료해 줘요. 헥사는 느리지만 강하게 쏘고, 방패로 한 번의 공격을 막아 줘요. 방패는 시간이 지나면 다시 생겨요." },
  { who: "voice", fx: "alert", text: "조심해요! 소리 없이 다가오는 게 있어요!" },
  { who: "fragment", text: "......(입은 움직이는데, 아무 소리도 나지 않는다)......" },
  { act: "s2_mooks", bgm: "battle" },

  // ---- 2. 침묵 ----
  { who: "hexa", bgm: "s2_field", text: "......끝났나. 아니, 이건 시작에 불과하다." },
  { who: "lumi", text: "쟤네, 전부 소리도 없이 덤볐어. 하나도 안 들렸다고!" },
  { who: "silence", fx: "shake", text: "......." },
  { who: "voice", text: "저건... 균열이 아니에요. 균열을 만들어 낸 뿌리, '침묵'이에요." },
  { who: "hexa", text: "문을 가르고 나온 놈이다. ...기억한다. 이 고요를." },
  { who: "lumi", text: "헥사를 괴롭힌 게 쟤야? 가만 안 둬!" },
  { who: "silence", text: "......이름... 소리... 빛... 전부... 내놓아라......" },
  { who: "voice", fx: "alert", text: "함께 유대를 모아서 맞서요! 지금의 우리라면 쓰러뜨릴 수 있을지도 몰라요!" },
  { act: "s2_silence", bgm: "s2_boss" },

  // ---- 3. 쓰러뜨렸지만, 이길 수 없다 ----
  { who: "lumi", bgm: "s2_field", text: "해, 해냈다! 쓰러뜨렸어! 소리가 돌아왔어!" },
  { who: "hexa", text: "......아니다. 문 너머의 기척이 조금도 줄지 않았다." },
  { who: "voice", text: "잠깐... 소리가... 다시 사라지고 있어요." },
  { who: "silence", fx: "revive", bgm: "off", text: "......한 번... 쓰러졌을 뿐이다. 나는... 소리가 없는 곳에, 언제나 있다." },
  { who: "voice", text: "안 돼... 기억이 부족해요! 지금의 우리로는 이길 수 없어요!" },
  { who: "hexa", text: "......내가 시간을 벌겠다. 너희는 먼저 가라." },
  { who: "lumi", text: "바보야! 혼자 남는 건 이제 안 돼! 같이 간다고 약속했잖아!" },
  { who: "voice", fx: "alert", theme: "flee", text: "도망쳐요! 어디든 좋아요, 이 정원을 벗어나는 게 먼저예요! 지금은 맞서면 안 돼요!" },
  { who: "silence", text: "......도망... 소리 없이... 쫓는다......" },
  { act: "s2_flee" },

  // ---- 4. 탈출 ----
  { who: "voice", theme: "night", fx: "escape", bgm: "intro", text: "......여기까지 오면 괜찮아요. 침묵은 더 따라오지 못해요." },
  { who: "lumi", text: "하아, 하아...! 살았다... 다리가 다 풀렸어." },
  { who: "hexa", text: "......내가 약했다. 한 번 쓰러뜨려 놓고도, 끝내지 못했다." },
  { who: "voice", text: "아니에요. 침묵은 쓰러졌다가 다시 일어났어요. 지금의 우리로는 끝낼 수 없다는 뜻이에요." },
  { who: "voice", text: "하지만 유대는 쌓여 가고 있어요. 세 사람의 빛이 더 커지면, 그때는 분명 이길 수 있어요." },
  { who: "lumi", text: "좋아! 다음엔 꼭 이긴다! 그러니까 우선... 쉴 곳부터 찾자!" },
  { who: "voice", text: "두 번째 길은 이렇게 끝났지만, 침묵은 아직 우리를 기억하고 있어요. ...다음 길로 가요." },
];

SCRIPT.push(...STAGE2);
