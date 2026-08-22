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

describe('복수 수종 기록의 알레르기 등급', () => {
  // 레코드의 등급은 팝업(Map.jsx buildAllergenRows)이 이미 "포함된 종 중 최댓값"으로
  // 계산한다. 필터·통계는 원본 문자열을 getAllergenLevel에 그대로 넘겨 "첫 매칭"
  // 등급을 썼고, 그래서 실측 1,243건에서 팝업보다 낮은 등급이 나왔다.
  // 알레르기 위험을 실제보다 낮게 표시하는 방향이라 최댓값으로 맞춘다.
  const mixed = () => tree({
    species: '은행나무+양버즘나무',
    speciesList: ['은행나무', '양버즘나무'],
  });

  it('등급 필터는 포함된 종 중 최댓값으로 판정한다', () => {
    // 은행나무=2, 양버즘나무=3 → 레코드 등급은 3
    expect(filterData([mixed()], { allergenLevels: [3] })).toHaveLength(1);
  });

  it('첫 번째 종의 등급만으로 걸러내지 않는다', () => {
    expect(filterData([mixed()], { allergenLevels: [2] })).toHaveLength(0);
  });

  it('통계 등급 집계도 최댓값을 쓴다', () => {
    const byLevel = Object.fromEntries(
      calculateStats([mixed()]).levelStats.map((l) => [l.level, l.count])
    );
    expect(byLevel[3]).toBe(1);
    expect(byLevel[2]).toBe(0);
  });

  it('수종별 통계 행의 등급도 최댓값을 쓴다', () => {
    const row = calculateStats([mixed()]).speciesStats[0];
    expect(row.level).toBe(3);
  });

  it('알레르기 유발 수종만 보기는 어느 종이든 등재돼 있으면 통과시킨다', () => {
    // 핑크벨벳은 미등재(등급 0)지만 이팝나무가 등재돼 있으므로 남아야 한다.
    const data = [tree({
      species: '이팝나무+무궁화+핑크벨벳',
      speciesList: ['이팝나무', '무궁화', '핑크벨벳'],
    })];
    expect(filterData(data, { allergenOnly: true })).toHaveLength(1);
  });

  it('전 종이 미등재면 등급 0으로 남는다', () => {
    const data = [tree({ species: '핑크벨벳', speciesList: ['핑크벨벳'] })];
    expect(filterData(data, { allergenOnly: true })).toHaveLength(0);
    expect(filterData(data, { allergenLevels: [0] })).toHaveLength(1);
  });
});
