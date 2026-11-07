// Shape = personality. Round/soft = warm, angular/sharp = cold/aggressive.
// pitch: blip Hz (high = light, low = heavy), spin: motion speed multiplier
const SPEAKERS = {
  voice:  { name: "???",    pitch: 380, spin: 0.8, shape: "fairy", color: "#9ad0ff", close: 3 }, // 부드럽고 신비로운 안내자 (요정)
  glitch: { name: "글리치", pitch: 90,  spin: 1.0, shape: "shard", color: "#ff3b5c", close: 0 }, // 날카롭고 폭력적인 균열
};

// Player shapes (개체의 도형). path(c, r) only builds the outline; caller fills/strokes.
const TAU = Math.PI * 2;
const poly = (c, n, r, rot = -Math.PI / 2) => { for (let i = 0; i < n; i++) c.lineTo(Math.cos(rot + i * TAU / n) * r, Math.sin(rot + i * TAU / n) * r); c.closePath(); };
const PLAYER_SHAPES = [
  { id: "circle",   name: "원",     desc: "모난 곳 없는 둥그스러움. 무엇과도 부딪히지 않고 굴러간다.", path: (c, r) => c.arc(0, 0, r, 0, TAU) },
  { id: "triangle", name: "삼각형", desc: "가장 먼저 뻗는 꼭짓점. 앞으로 나아가려는 날카로운 의지.", path: (c, r) => poly(c, 3, r * 1.2) },
  { id: "square",   name: "사각형", desc: "네 모서리가 맞물린 단단함. 무너지지 않는 토대.",           path: (c, r) => poly(c, 4, r * 1.25, Math.PI / 4) },
  { id: "diamond",  name: "마름모", desc: "기울어진 채로도 서 있는 법을 아는, 균형의 형태.",           path: (c, r) => poly(c, 4, r * 1.3) },
  { id: "hexagon",  name: "육각형", desc: "벌집처럼 서로를 잇는 모양. 함께하려는 마음.",               path: (c, r) => poly(c, 6, r) },
  { id: "star",     name: "별",     desc: "닿을 수 없어도 빛나는 것. 동경, 그리고 소망.",             path: (c, r) => { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, d = i % 2 ? r * .45 : r * 1.2; c.lineTo(Math.cos(a) * d, Math.sin(a) * d); } c.closePath(); } },
  { id: "heart",    name: "하트",   desc: "사랑, 심장, 혹은... 의지.",                                 path: (c, r) => { c.moveTo(0, r * .9); c.bezierCurveTo(-r * 1.5, r * .1, -r, -r, 0, -r * .4); c.bezierCurveTo(r, -r, r * 1.5, r * .1, 0, r * .9); c.closePath(); } },
];

// act lines are not dialogue: they hand control to ACTS[act] (game.js) and resume when it calls done()
const SCRIPT = [
  // 1막 - 눈을 뜨다
  { who: "voice",  bgm: "intro", text: "......들리나요? 아직 꺼지지 않았군요." },
  { who: "voice",  text: "여기는 모든 기억이 빛으로 남는 곳, 에코 프리즘." },
  { who: "voice",  rename: "리라", text: "저는 이곳을 떠도는 작은 요정, '리라'예요. 당신을 깨우러 왔답니다." },
  { who: "voice",  text: "당신은 막 깨어났어요. 이름도, 얼굴도 흩어져 버렸지만..." },
  { who: "voice",  text: "형태만큼은 다시 고를 수 있답니다. 마음이 이끄는 모양을 골라 보세요." },
  { act: "pick" },

  // 2막 - 균열
  { who: "voice",  text: "...좋아요. 그게 지금의 당신이에요. 아주 잘 어울려요." },
  { who: "voice",  text: "잠깐... 이 기척은..." },
  { who: "voice",  fx: "alert", text: "균열이에요! 방향키로 피하고, 사격은 이미 켜져 있어요! Z키로 끄고 켤 수 있어요!" },
  { who: "glitch", fx: "shake", text: "기억... 냄새가 난다... 신선한 기억!" },
  { who: "glitch", text: "내놔. 그 형태 그대로... 전부 지워주마!" },
  { act: "battle", bgm: "battle" },

  // 3막 - 끝과 시작
  { who: "glitch", bgm: "intro", text: "크윽... 이 따뜻한 빛은... 싫어..." },
  { who: "voice",  text: "해냈어요! 하지만 균열은 이 세계 곳곳에 남아 있어요." },
  { who: "voice",  fx: "title", text: "잃어버린 이름을 찾는 여정이, 지금 시작됩니다." },
];
