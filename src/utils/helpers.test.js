import { describe, it, expect } from 'vitest';
import { filterData, calculateStats } from './helpers';

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
