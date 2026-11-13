import { describe, it, expect } from 'vitest';
import { DATA_SOURCES, SOURCE_LIST } from './dataSources';

describe('DATA_SOURCES', () => {
  it('범례가 쓰는 id·라벨·색을 유지한다', () => {
    expect(SOURCE_LIST).toHaveLength(3);
    expect(SOURCE_LIST.map((source) => ({
      id: source.id,
      label: source.label,
      color: source.color,
    }))).toEqual([
      { id: 'streetTree', label: '가로수길', color: '#27ae60' },
      { id: 'seoulTree', label: '서울 가로수 (개별)', color: '#2ecc71' },
      { id: 'famousForest', label: '국유림 명품숲', color: '#8e44ad' },
    ]);
    expect(DATA_SOURCES.streetTree).toBe(SOURCE_LIST[0]);
    expect(DATA_SOURCES.seoulTree).toBe(SOURCE_LIST[1]);
    expect(DATA_SOURCES.famousForest).toBe(SOURCE_LIST[2]);
  });
});
