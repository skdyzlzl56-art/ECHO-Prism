# 음악 목록 (music/)

게임용 파일은 `webgame/audio/bgm_<이름>.ogg` (끊김 없는 반복 재생). 듣기용은 mp3.

| 곡 | 분위기 | BPM / 길이 | 쓰는 장면 (bgm 이름) | 듣기용 | 게임용 (loop) |
|---|---|---|---|---|---|
| **Intro Dream** | 몽환적·신비로움. 신과 만나는 공간. D 리디안, 첼레스타·하프·코러스·벨, 드럼 없음, 깊은 리버브 | 60 / 32초 | 오프닝, 도형 고르기, 3막 (`intro`) | `Intro_Dream_preview.mp3` | `Intro_Dream_loop.ogg` |
| **Battle Rock** | 록 + 일본풍. 8비트 리드·샤미센·태고·디스토션 기타 | 170 / 22.6초 | 첫 전투 (`battle`) | `Battle_Rock_preview.mp3` | `Battle_Rock_loop.ogg` |

## 곡 바꾸기
- `webgame/script.js` 대사 줄에 `bgm: "이름"` → 그 줄에서 곡 변경 (같은 곡이면 이어짐).
- 새 곡: `webgame/audio/bgm_새이름.ogg` 를 두고 `bgm: "새이름"`.

## 파일
- `*.mid` : REAPER 편곡용 (악기 지정 포함)
- `intro_dream.py`, `battle_rock.py` : 곡 생성 → `python 파일명` (music21, mido, pydub, numpy, ffmpeg 필요)
- `tools/` : FluidSynth + 사운드폰트 (git 제외)

## 스테이지 1 곡 (생성: `stage1_music.py`)

| 곡 | 분위기 | BPM / 길이 | 쓰는 장면 (bgm 이름) | 듣기용 | 게임용 (loop) |
|---|---|---|---|---|---|
| **Stage1 Field** | 따뜻하고 잔잔함, 오르골 + 기타 아르페지오 + 패드 | 84 / 22.9초 | 회랑 탐색·대화 (`s1_field`) | `Stage1_Field_preview.mp3` | `Stage1_Field_loop.ogg` |
| **Stage1 Boss** | 무겁고 웅장함, 브라스 + 디스토션 기타 + 태고 + 합창(후반) | 150 / 25.6초 | 헥사 보스전 (`s1_boss`) | `Stage1_Boss_preview.mp3` | `Stage1_Boss_loop.ogg` |

## 스테이지 2 곡 (생성: `stage2_music.py`)

| 곡 | 분위기 | BPM / 길이 | 쓰는 장면 (bgm 이름) |
|---|---|---|---|
| **Stage2 Field** | 소리 없는 정원. 오르골·하프·합창·크리스털, 음 사이 공백이 많음 | 66 / 29초 | 도착·대화 (`s2_field`) |
| **Stage2 Boss** | 침묵전. 현악 16분 오스티나토 + 신스 베이스 + 오케스트라 히트, 후반 합창 | 144 / 26.7초 | 침묵 보스전 (`s2_boss`) |

## 스테이지 3 곡 (생성: `stage3_music.py`)

| 곡 | 분위기 | BPM / 길이 | 쓰는 장면 (bgm 이름) |
|---|---|---|---|
| **Stage3 Field** | 색 바랜 미술관의 심야 재즈. 피아노 트리오(스윙 컴핑, 워킹 베이스, 라이드) + 비브라폰, D단조 ii-V-i | 92 / 20.9초 | 도착·탐색·대화 (`s3_field`) |
| **Stage3 Boss** | 화가전. 거친 현악 16분 톱질 + 디스토션 기타 팜뮤트 + 8비트 드럼, C단조, 후반 브라스 히트 | 160 / 24.0초 | 화가 보스전 (`s3_boss`) |

> 청취 판단은 사용자 몫: 코드로 생성만 했고 실제로 들어보고 판단한 것이 아님. 마음에 안 들면 `stage3_music.py`의 음/악기/BPM을 고쳐 다시 실행.
