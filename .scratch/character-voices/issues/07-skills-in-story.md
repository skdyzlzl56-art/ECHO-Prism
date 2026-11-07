# 07: 스킬을 스토리에 녹이기

**What to build:** 새 쿨타임 원과 보조 캐릭터 특수기를 이야기 안에서 짚는다. 처음 전투 안내에서 원이 무엇인지 알려 주고, 각 동료의 특수기를 전투 중 대사 한 줄로 부른다. s6_trial의 3페이즈 대사가 나오지 않는 어긋남(키 0~2로 이동)도 함께 고친다.

**Blocked by:** 01-cooldown-rings, 03-dialogue-stage1-2, 04-dialogue-stage3, 05-dialogue-stage4, 06-dialogue-stage5-6

**Status:** resolved

- [ ] 첫 전투 안내가 대시 원과 보조 원을 설명한다
- [ ] 동료별 특수기 호출 대사가 전투 중 나온다
- [ ] s6_trial의 3페이즈 대사가 실제로 나온다 (테스트로 검증)
- [ ] 키 이름이 바뀐 곳은 없는지 hygiene 통과, npm test 통과
