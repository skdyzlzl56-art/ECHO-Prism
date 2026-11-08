# 07: 방향 규칙 완전 제거

**What to build:** 어떤 챕터도 방향 규칙(`dirRule`)을 쓰지 않으면 엔진 코드, 탄의 이름(`nm`) 표시, 관련 테스트, GLOSSARY 항목, 챕터 3~6 스펙의 방향 규칙 문구를 모두 지운다. 게임 동작은 달라지지 않는다.

**Blocked by:** 05 (챕터 5 교체), 06 (챕터 6 섞기)

**Status:** resolved

- [ ] 코드에서 `dirRule`과 `nm`(방향 규칙용)이 사라진다
- [ ] `sim.test.js` 등의 방향 규칙 테스트가 지워지고 나머지는 통과한다
- [ ] GLOSSARY.md의 **방향 규칙** 항목과 다른 항목의 참조가 지워진다
- [ ] `.scratch/chapters-3-6/spec.md`의 방향 규칙 문구에 변경 사실이 남는다
- [ ] `npm test`와 `git diff --check`가 통과한다
