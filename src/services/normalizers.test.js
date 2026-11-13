import { describe, it, expect } from 'vitest';
import { normalizeStreetTree, normalizeFamousForest } from './normalizers';

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

  it('기호·공백만 있는 값은 비우고, 앞뒤 공백은 걷어 낸다', () => {
    expect(normalizeStreetTree({ ...base, sttreeStretNm: '×' }).roadName).toBe('');
    expect(normalizeStreetTree({ ...base, sttreeStretNm: '?' }).roadName).toBe('');
    expect(normalizeStreetTree({ ...base, sttreeStretNm: '  12  ' }).roadName).toBe('');
    expect(normalizeStreetTree({ ...base, sttreeStretNm: '  테헤란로  ' }).roadName).toBe('테헤란로');
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

  it('pltngCo가 있으면 sttreeCo보다 우선하고, 숫자가 아니면 0이다', () => {
    const preferred = normalizeStreetTree({ ...base, pltngCo: '5', sttreeCo: '9', sttreeKnd: '은행나무' });
    expect(preferred.treeCount).toBe(5);
    expect(preferred.plantCount).toBe(5);
    const invalid = normalizeStreetTree({ ...base, sttreeCo: '많음', sttreeKnd: '은행나무' });
    expect(invalid.treeCount).toBe(0);
    expect(invalid.plantCount).toBe(0);
  });

  it('qualityFlags 필드를 빈 배열로 준비한다', () => {
    const r = normalizeStreetTree({ ...base, sttreeKnd: '은행나무' });
    expect(r.qualityFlags).toEqual([]);
  });
});

describe('normalizeFamousForest — 도시명', () => {
  const forest = (address, species = '') => normalizeFamousForest({
    id: 'f', name: '숲', address, species, latitude: 1, longitude: 2, hasCoords: true,
    areaHa: 3, management: '청',
  });

  it('약칭과 옛 도명을 정식 시도명으로 바꾼다', () => {
    expect(forest('서울 종로구').city).toBe('서울특별시');
    expect(forest('경기 가평군').city).toBe('경기도');
    expect(forest('강원도 평창군').city).toBe('강원특별자치도');
    expect(forest('제주도 제주시').city).toBe('제주특별자치도');
    expect(forest('전라북도 진안군').city).toBe('전북특별자치도');
  });

  it('이미 정식명이면 그대로 두고, 모르는 토큰은 바꾸지 않는다', () => {
    expect(forest('경기도 가평군').city).toBe('경기도');
    expect(forest('미상 어딘가').city).toBe('미상');
    expect(forest('').city).toBe('');
  });

  it('쉼표로 적힌 수종을 분해하고 extra에 면적·기관을 복사한다', () => {
    const r = forest('부산 기장군', '가문비나무, 낙엽송');
    expect(r.city).toBe('부산광역시');
    expect(r.species).toBe('가문비나무, 낙엽송');
    expect(r.speciesList).toEqual(['가문비나무', '낙엽송']);
    expect(r.sourceType).toBe('famousForest');
    expect(r.extra).toEqual({ area: 3, management: '청' });
  });
});
