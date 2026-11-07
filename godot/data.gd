extends RefCounted
# Same content as ../webgame/script.js. Keep in sync with ../CHARACTERS.md.
# Shape = personality. pitch: blip Hz, spin: motion speed multiplier.

const SPEAKERS := {
	"voice":  {"name": "???",    "pitch": 380.0, "spin": 0.8,  "shape": "orb",    "color": "#9ad0ff"},
	"prism":  {"name": "프리즘", "pitch": 260.0, "spin": 1.0,  "shape": "prism",  "color": "#4fc3ff"},
	"warden": {"name": "감시자", "pitch": 150.0, "spin": 0.55, "shape": "rings",  "color": "#ffb347"},
	"lia":    {"name": "리아",   "pitch": 600.0, "spin": 1.3,  "shape": "bloom",  "color": "#ff9ad5"},
	"glitch": {"name": "글리치", "pitch": 90.0,  "spin": 1.0,  "shape": "shard",  "color": "#ff3b5c"},
}

const SCRIPT := [
	# 1막 - 눈을 뜨다
	{"who": "voice",  "text": "......들리나요? 아직 꺼지지 않았군요."},
	{"who": "voice",  "text": "괜찮아요. 천천히... 빛을 따라 눈을 떠 보세요."},
	{"who": "voice",  "text": "여기는 모든 기억이 빛으로 남는 곳, 에코 프리즘."},
	{"who": "prism",  "text": "의식 신호 확인. 신규 개체 한 명 각성."},
	{"who": "prism",  "text": "나는 프리즘. 이 세계의 기록을 관리한다. 먼저 묻겠다. 너의 이름은?"},
	{"who": "voice",  "text": "...기억나지 않나요? 괜찮아요. 이곳에 오면 다들 처음엔 그래요."},
	{"who": "prism",  "text": "비효율적이군. 기억 없는 개체는 생존 확률이 낮다."},

	# 2막 - 감시자
	{"who": "warden", "text": "...프리즘. 또 새 얼굴이냐."},
	{"who": "warden", "text": "난 감시자다. 이 구역의 균열을 막는 게 내 일이지."},
	{"who": "warden", "text": "겁먹지 마라. 내 곁에 있으면 최소한 지워지진 않는다."},
	{"who": "prism",  "text": "감시자, 감정적인 발언은 자제해라. 불필요한 안심은 판단을 흐린다."},
	{"who": "warden", "text": "넌 늘 그 모양이지. 숫자만 보다 사람을 놓친다."},

	# 3막 - 균열
	{"who": "prism",  "fx": "alert",  "text": "경고! 균열 접근! 거리 40, 급속 접근 중!"},
	{"who": "glitch", "fx": "shake",  "text": "기억... 냄새가 난다... 신선한 기억!"},
	{"who": "glitch", "text": "내놔. 전부 내놔. 이름도, 얼굴도, 추억도... 전부 지워주마!"},
	{"who": "warden", "fx": "impact", "text": "뒤로 물러서라! 이놈은 내가 막는다!"},
	{"who": "glitch", "fx": "shake",  "text": "크하하! 늙은 감시자 따위가 언제까지 버틸 것 같아?!"},
	{"who": "warden", "text": "크윽... 방어막이... 오래 못 버틴다..."},

	# 4막 - 리아
	{"who": "lia",    "fx": "impact", "text": "거기까지예요!"},
	{"who": "lia",    "text": "빛이여, 모여라... 흩어진 기억의 조각들이여!"},
	{"who": "glitch", "text": "크아악! 이 따뜻한 빛은... 싫어... 싫어!!"},
	{"who": "lia",    "text": "후우... 이제 괜찮아요. 다치신 데는 없으세요?"},
	{"who": "lia",    "text": "저는 리아! 흩어진 기억의 조각을 모으는 일을 하고 있어요."},
	{"who": "prism",  "text": "무모한 행동이다. 단독으로 균열에 맞서는 건 확률상 자살에 가깝다."},
	{"who": "lia",    "text": "그래도 모른 척할 순 없잖아요. 누군가의 소중한 기억인걸요."},
	{"who": "warden", "text": "...허허. 겁 없는 건 여전하구나, 꼬마."},
	{"who": "lia",    "text": "자, 이거 받으세요. 방금 모은 당신의 기억 한 조각이에요."},
	{"who": "voice",  "text": "푸른 하늘... 누군가의 손... 그리고 약속 하나가 떠올랐다."},

	# 5막 - 진실
	{"who": "glitch", "text": "잊지 마라... 나도... 한때는 누군가의 기억이었다..."},
	{"who": "lia",    "text": "...그 아이도 외로웠던 거예요. 잊혀진 기억이 균열이 된 거죠."},
	{"who": "prism",  "text": "이론상 가능하다. 그렇다면 균열의 근원은 세계 중심, 프리즘 코어에 있다."},
	{"who": "warden", "text": "가는 길은 험할 거다. 그래도 가겠나?"},
	{"who": "lia",    "text": "같이 가요! 우리가 함께라면, 분명 모두의 기억을 되찾을 수 있어요."},
	{"who": "voice",  "fx": "title",  "text": "잃어버린 이름을 찾는 여정이, 지금 시작됩니다."},
]
