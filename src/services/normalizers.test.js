import { describe, it, expect } from 'vitest';
import { normalizeStreetTree } from './normalizers';

const base = {
  sttreeStretNm: '테스트로',
  startLatitude: '37.5', startLongitude: '127.0',
  endLatitude: '37.51', endLongitude: '127.01',
};

describe('normalizeStreetTree — 수종 정규화', () => {
  it('복수 수종을 배열로 분해한다', () => {
    const r = normalizeStreetTree({ ...base, sttreeKnd: '은행나무+이팝나무' });
    expect(r.speciesList).toEqual(['은행나무', '이팝나무']);
    expect(r.speciesKind).toBe('tree');
  });

  it('축약형을 정식명으로 바꾼다', () => {
    const r = normalizeStreetTree({ ...base, sttreeKnd: '양버즘' });
    expect(r.speciesList).toEqual(['양버즘나무']);
  });

  it('결주는 not-a-tree로 표시한다', () => {
    const r = normalizeStreetTree({ ...base, sttreeKnd: '결주' });
    expect(r.speciesKind).toBe('not-a-tree');
  });

  it('species 필드는 원본을 보존한다', () => {
    const r = normalizeStreetTree({ ...base, sttreeKnd: '양버즘' });
    expect(r.species).toBe('양버즘');
  });
});

describe('normalizeStreetTree — 도로명 정제', () => {
  it('도로명이 숫자면 빈 문자열로 만든다', () => {
    const r = normalizeStreetTree({ ...base, sttreeStretNm: '3', sttreeKnd: '은행나무' });
    expect(r.roadName).toBe('');
    expect(r.locationName).toBe('');
  });

  it('정상 도로명은 유지한다', () => {
    const r = normalizeStreetTree({ ...base, sttreeKnd: '은행나무' });
    expect(r.roadName).toBe('테스트로');
  });
});

describe('normalizeStreetTree — 기존 필드 회귀 방지', () => {
  it('좌표·그루수·기관 필드가 그대로 산출된다', () => {
    const r = normalizeStreetTree({
      ...base, sttreeKnd: '은행나무', sttreeCo: '32',
      insttNm: '충청북도 충주시', referenceDate: '2025-06-30',
    });
    expect(r.latitude).toBeCloseTo(37.505, 5);
    expect(r.longitude).toBeCloseTo(127.005, 5);
    expect(r.treeCount).toBe(32);
    expect(r.plantCount).toBe(32);
    expect(r.institution).toBe('충청북도 충주시');
    expect(r.referenceDate).toBe('2025-06-30');
    expect(r.sourceType).toBe('streetTree');
  });

  it('qualityFlags 필드를 빈 배열로 준비한다', () => {
    const r = normalizeStreetTree({ ...base, sttreeKnd: '은행나무' });
    expect(r.qualityFlags).toEqual([]);
  });
});
