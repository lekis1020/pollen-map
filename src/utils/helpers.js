import { getAllergenLevel, ALLERGEN_LEVELS } from '../data/allergenDatabase';
import { DATA_SOURCES } from '../services/dataSources';

// 데이터에서 고유한 시도 목록 추출
export function getUniqueCities(data) {
  const cities = new Set(data.map((item) => item.city).filter(Boolean));
  return [...cities].sort();
}

// 데이터에서 고유한 수종 목록 추출
export function getUniqueSpecies(data) {
  const species = new Set(data.map((item) => item.species).filter(Boolean));
  return [...species].sort();
}

// 데이터에서 고유한 소스 타입 목록 추출
export function getUniqueSources(data) {
  const sources = new Set(data.map((item) => item.sourceType).filter(Boolean));
  return [...sources];
}

// 필터 적용
export function filterData(data, filters) {
  return data.filter((item) => {
    // 유효한 좌표가 있는 데이터만
    if (!item.latitude || !item.longitude) return false;

    // 데이터 소스 필터
    if (filters.sourceTypes && filters.sourceTypes.length > 0) {
      if (!filters.sourceTypes.includes(item.sourceType)) return false;
    }

    // 지역 필터
    if (filters.city && item.city !== filters.city) return false;

    // 수종 필터
    if (filters.species && item.species !== filters.species) return false;

    // 알레르기 등급 필터
    if (filters.allergenLevels && filters.allergenLevels.length > 0) {
      const level = getAllergenLevel(item.species);
      if (!filters.allergenLevels.includes(level)) return false;
    }

    // 알레르기 유발 수종만 보기
    if (filters.allergenOnly) {
      const level = getAllergenLevel(item.species);
      if (level === 0) return false;
    }

    return true;
  });
}

// 수종별 통계 계산
export function calculateStats(data) {
  const speciesMap = {};
  const levelCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  const sourceCounts = {};

  for (const item of data) {
    const species = item.species || '미확인';
    if (!speciesMap[species]) {
      speciesMap[species] = { count: 0, treeCount: 0 };
    }
    speciesMap[species].count += 1;
    speciesMap[species].treeCount += item.treeCount || item.plantCount || 0;

    const level = getAllergenLevel(species);
    levelCounts[level] += 1;

    // 소스별 카운트
    const st = item.sourceType || 'unknown';
    sourceCounts[st] = (sourceCounts[st] || 0) + 1;
  }

  const speciesStats = Object.entries(speciesMap)
    .map(([name, stats]) => ({
      name,
      count: stats.count,
      treeCount: stats.treeCount,
      level: getAllergenLevel(name),
    }))
    .sort((a, b) => b.count - a.count);

  const levelStats = Object.entries(levelCounts).map(([level, count]) => ({
    level: parseInt(level, 10),
    label: ALLERGEN_LEVELS[level]?.label || '미확인',
    color: ALLERGEN_LEVELS[level]?.color || '#999',
    count,
  }));

  const sourceStats = Object.entries(sourceCounts).map(([sourceType, count]) => ({
    sourceType,
    label: DATA_SOURCES[sourceType]?.label || sourceType,
    color: DATA_SOURCES[sourceType]?.color || '#999',
    count,
  }));

  return { speciesStats, levelStats, sourceStats, total: data.length };
}
