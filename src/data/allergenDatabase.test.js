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
