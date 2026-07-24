import { describe, it, expect } from 'vitest';
import { filterData, calculateStats, getUniqueSpecies } from './helpers';

const tree = (over = {}) => ({
  latitude: 37.5, longitude: 127.0, city: '서울특별시', district: '강남구',
  species: '은행나무', speciesKind: 'tree', speciesList: ['은행나무'],
  sourceType: 'streetTree', treeCount: 10, qualityFlags: [], ...over,
});

describe('filterData', () => {
  it('결주·고사는 걸러낸다', () => {
    const data = [tree(), tree({ species: '결주', speciesKind: 'not-a-tree' })];
    expect(filterData(data, {})).toHaveLength(1);
  });

  it('좌표 없는 항목은 걸러낸다', () => {
    expect(filterData([tree({ latitude: 0 })], {})).toHaveLength(0);
  });

  it('지역 필터가 동작한다', () => {
    const data = [tree(), tree({ city: '부산광역시' })];
    expect(filterData(data, { city: '부산광역시' })).toHaveLength(1);
  });

  it('hideFlagged가 켜지면 플래그 있는 항목을 숨긴다', () => {
    const data = [tree(), tree({ qualityFlags: ['COORD_WRONG_REGION'] })];
    expect(filterData(data, { hideFlagged: true })).toHaveLength(1);
    expect(filterData(data, { hideFlagged: false })).toHaveLength(2);
  });

  it('기본값에서는 플래그 있는 항목도 보여준다', () => {
    const data = [tree({ qualityFlags: ['COUNT_ZERO'] })];
    expect(filterData(data, {})).toHaveLength(1);
  });
});

describe('getUniqueSpecies', () => {
  it('숫자·기호 같은 무효 수종명을 선택지에서 뺀다', () => {
    // 원본에 '1111', '×', '?' 같은 값이 수종명 칸에 들어있어
    // 드롭다운 선택지로 노출되고 있었다.
    const data = [
      tree(),
      tree({ species: '1111', speciesKind: 'unknown', speciesList: [] }),
      tree({ species: '×', speciesKind: 'unknown', speciesList: [] }),
      tree({ species: '결주', speciesKind: 'not-a-tree', speciesList: [] }),
    ];
    expect(getUniqueSpecies(data)).toEqual(['은행나무']);
  });

  it('복수 수종은 개별 항목으로 펼친다', () => {
    const data = [tree({ species: '은행나무+이팝나무', speciesList: ['은행나무', '이팝나무'] })];
    expect(getUniqueSpecies(data)).toEqual(['은행나무', '이팝나무']);
  });

  it('오타·축약형 대신 정규화된 이름을 보여준다', () => {
    const data = [tree({ species: '양버즘', speciesList: ['양버즘나무'] })];
    expect(getUniqueSpecies(data)).toEqual(['양버즘나무']);
  });
});

describe('수종 필터', () => {
  it('복수 수종 기록도 개별 수종으로 필터된다', () => {
    const data = [
      tree({ species: '은행나무+이팝나무', speciesList: ['은행나무', '이팝나무'] }),
      tree({ species: '느티나무', speciesList: ['느티나무'] }),
    ];
    expect(filterData(data, { species: '이팝나무' })).toHaveLength(1);
    expect(filterData(data, { species: '느티나무' })).toHaveLength(1);
    expect(filterData(data, { species: '소나무' })).toHaveLength(0);
  });

  it('축약형 원본도 정규화된 이름으로 필터된다', () => {
    const data = [tree({ species: '양버즘', speciesList: ['양버즘나무'] })];
    expect(filterData(data, { species: '양버즘나무' })).toHaveLength(1);
  });
});

describe('calculateStats', () => {
  it('결주·고사를 통계에서 뺀다', () => {
    const data = [tree(), tree({ species: '결주', speciesKind: 'not-a-tree' })];
    expect(calculateStats(data).total).toBe(1);
  });

  it('제외된 개수를 따로 보고한다', () => {
    const data = [tree(), tree({ species: '결주', speciesKind: 'not-a-tree' })];
    expect(calculateStats(data).excludedNotATree).toBe(1);
  });

  it('수종별·등급별 집계가 그대로 동작한다', () => {
    const stats = calculateStats([tree(), tree()]);
    expect(stats.total).toBe(2);
    expect(stats.speciesStats[0].name).toBe('은행나무');
    expect(stats.speciesStats[0].count).toBe(2);
  });
});
