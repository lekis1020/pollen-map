import { describe, it, expect } from 'vitest';
import {
  getAllergenInfo, getAllergenLevel, getAllergenMatch, getAllergenInfos,
  ALLERGEN_LEVELS,
} from './allergenDatabase';

describe('축약형 매칭 (회귀 방지)', () => {
  it('양버즘은 플라타너스 등급 3이어야 한다', () => {
    // 가장 위험한 false negative — 알레르기 높은 수종이 "정보 없음"으로 표시되던 버그
    expect(getAllergenLevel('양버즘')).toBe(3);
    expect(getAllergenInfo('양버즘').name).toBe('플라타너스');
  });

  it('그 밖의 축약형도 정식명과 같은 등급을 준다', () => {
    expect(getAllergenLevel('왕벚')).toBe(getAllergenLevel('왕벚나무'));
    expect(getAllergenLevel('배롱')).toBe(getAllergenLevel('배롱나무'));
    expect(getAllergenLevel('목백합')).toBe(getAllergenLevel('튤립나무'));
  });

  it('오타도 정식명과 같은 등급을 준다', () => {
    expect(getAllergenLevel('메타세콰이어')).toBe(getAllergenLevel('메타세쿼이아'));
    expect(getAllergenLevel('왕벗나무')).toBe(getAllergenLevel('왕벚나무'));
  });
});

describe('기존 부분일치 폴백 보존 (회귀 방지)', () => {
  it('부분일치로 동작하던 라벨이 계속 동작한다', () => {
    expect(getAllergenLevel('대왕참나무')).toBe(3);   // 참나무
    expect(getAllergenLevel('은단풍')).toBe(2);       // 단풍나무
    expect(getAllergenLevel('스트로브잣나무')).toBe(3); // 소나무
    expect(getAllergenLevel('중국단풍')).toBe(2);
    expect(getAllergenLevel('수양벚나무')).toBe(1);
  });

  it('부분일치로 잡힌 것은 matchType이 inferred다', () => {
    expect(getAllergenMatch('대왕참나무').matchType).toBe('inferred');
    expect(getAllergenMatch('은행나무').matchType).toBe('exact');
    expect(getAllergenMatch('양버즘').matchType).toBe('exact');
  });
});

describe('미매칭', () => {
  it('DB에 없는 수종은 null과 none을 준다', () => {
    const m = getAllergenMatch('존재하지않는수종이름');
    expect(m.info).toBeNull();
    expect(m.matchType).toBe('none');
    expect(getAllergenLevel('존재하지않는수종이름')).toBe(0);
  });

  it('빈값도 안전하게 처리한다', () => {
    expect(getAllergenInfo('')).toBeNull();
    expect(getAllergenInfo(null)).toBeNull();
    expect(getAllergenLevel(undefined)).toBe(0);
  });
});

describe('복수 수종', () => {
  it('모든 종의 정보를 반환한다', () => {
    const r = getAllergenInfos(['은행나무', '이팝나무']);
    expect(r).toHaveLength(2);
    expect(r[0].info.name).toBe('은행나무');
    expect(r[1].info.name).toBe('이팝나무');
  });

  it('일부만 매칭돼도 나머지를 버리지 않는다', () => {
    const r = getAllergenInfos(['은행나무', '존재하지않는수종']);
    expect(r).toHaveLength(2);
    expect(r[1].info).toBeNull();
    expect(r[1].matchType).toBe('none');
  });
});

describe('등급 0의 의미', () => {
  it('0은 "해당없음"이 아니라 "정보 없음"이다', () => {
    expect(ALLERGEN_LEVELS[0].label).toBe('정보 없음');
  });
});

describe('미등재 수종 커버리지', () => {
  // 감사에서 등급 0으로 떨어진 수종들.
  // 등급 근거는 docs/superpowers/specs/2026-07-24-research-allergen-species.md
  const NEWLY_COVERED = [
    '감나무', '층층나무', '살구나무', '산딸나무', '모과나무',
    '히말라야시다', '대추나무', '꽃사과', '팥배나무', '때죽나무',
    '후박나무', '먼나무', '모감주나무', '동백나무',
  ];

  it.each(NEWLY_COVERED)('%s가 DB에 정확 매칭으로 등재되어 있다', (name) => {
    const m = getAllergenMatch(name);
    expect(m.info).not.toBeNull();
    expect(m.matchType).toBe('exact');
  });

  it('히말라야시다는 풍매화 가을 개화 알레르겐이므로 등급 3이다', () => {
    // Rawat 2000 (PMID 10921460), Bist 2005 (PMID 16252835) — SPT/특이 IgE 근거
    const info = getAllergenInfo('히말라야시다');
    expect(info.level).toBe(3);
    expect(info.pollenMonths).toEqual([10, 11]);
  });

  it('히말라야시다의 표기 변이도 매칭된다', () => {
    // 실제 데이터에 '히말리야시다'(16), '개잎갈나무' 표기가 있다
    expect(getAllergenLevel('히말리야시다')).toBe(3);
    expect(getAllergenLevel('개잎갈나무')).toBe(3);
  });

  it('충매화 수종은 등급 1이다', () => {
    for (const name of ['감나무', '산딸나무', '때죽나무', '모감주나무']) {
      expect(getAllergenLevel(name)).toBe(1);
    }
  });

  it('동백나무는 조매화라 등급 1이다', () => {
    expect(getAllergenLevel('동백나무')).toBe(1);
    expect(getAllergenLevel('동백')).toBe(1);
  });
});

describe('참나무속 오분류 방지', () => {
  // '가시나무'(Quercus, 등급 3)를 등재하면 부분일치 폴백 때문에
  // 이름만 비슷한 다른 속이 참나무로 잘못 분류될 수 있다.
  // 실제 가로수 데이터에 존재하는 라벨이라 실害가 있다.
  it('진짜 참나무속은 등급 3을 받는다', () => {
    for (const name of ['가시나무', '종가시나무', '붉가시나무', '가시나무류']) {
      const m = getAllergenMatch(name);
      expect(m.info.name).toBe('가시나무');
      expect(m.info.level).toBe(3);
    }
  });

  it('홍가시나무(Photinia)는 참나무로 분류되지 않는다', () => {
    // 장미과 Photinia glabra. 데이터에 홍가시나무 12건, 홍가시 57건.
    for (const name of ['홍가시나무', '홍가시']) {
      expect(getAllergenInfo(name)?.name).not.toBe('가시나무');
      expect(getAllergenLevel(name)).not.toBe(3);
    }
  });

  it('호랑가시나무(Ilex)는 참나무로 분류되지 않는다', () => {
    // 감탕나무과 Ilex. 데이터에 호랑가시나무 1건, 완도호랑가시나무 3건.
    for (const name of ['호랑가시나무', '호랑가시', '완도호랑가시나무']) {
      expect(getAllergenInfo(name)?.name).not.toBe('가시나무');
      expect(getAllergenLevel(name)).not.toBe(3);
    }
  });
});
