import { getAllergenMatch, ALLERGEN_LEVELS } from '../data/allergenDatabase';
import { DATA_SOURCES } from '../services/dataSources';

// 데이터에서 고유한 시도 목록 추출
export function getUniqueCities(data) {
  const cities = new Set(data.map((item) => item.city).filter(Boolean));
  return [...cities].sort();
}

// 레코드에 포함된 수종 목록. 정규화된 speciesList가 있으면 그것을 쓴다.
// speciesList가 빈 배열이면 원본이 숫자·기호·결주 같은 무효값이라는 뜻이다.
function speciesOf(item) {
  if (item.speciesList) return item.speciesList;
  return item.species ? [item.species] : [];
}

// 레코드의 알레르기 등급 = 포함된 수종 중 최댓값.
// Map.jsx의 팝업(buildAllergenRows)과 같은 규칙이다. 원본 문자열을 그대로
// getAllergenLevel에 넘기면 "첫 매칭"이 나와서, "은행나무+양버즘나무"가
// 팝업에는 높음(3)인데 필터·통계에는 보통(2)으로 잡혔다(실측 1,243건).
// 위험을 실제보다 낮게 표시하는 방향의 오차라 최댓값으로 맞춘다.
function maxAllergenLevel(item) {
  const levels = speciesOf(item).map((name) => {
    const { info } = getAllergenMatch(name);
    return info ? info.level : 0;
  });
  return Math.max(0, ...levels);
}

// 데이터에서 고유한 수종 목록 추출.
// 원본에는 '1111', '×', '?' 같은 값이 수종명 칸에 들어있어 그대로 쓰면
// 필터 드롭다운에 선택지로 노출된다. 정규화 결과를 써서 걸러낸다.
export function getUniqueSpecies(data) {
  const species = new Set();
  for (const item of data) {
    for (const name of speciesOf(item)) {
      if (name) species.add(name);
    }
  }
  return [...species].sort();
}

// 필터 적용
export function filterData(data, filters) {
  return data.filter((item) => {
    // 유효한 좌표가 있는 데이터만
    if (!item.latitude || !item.longitude) return false;

    // 원본에 결주·고사로 기재된 항목은 나무가 아니므로 지도에 표시하지 않는다.
    if (item.speciesKind === 'not-a-tree') return false;

    // 품질 이슈가 있는 기록 숨기기. 기본값은 표시(off)다 —
    // 기본으로 숨기면 사용자가 데이터가 왜 적은지 알 수 없다.
    if (filters.hideFlagged && item.qualityFlags?.length) return false;

    // 지역 필터
    if (filters.city && item.city !== filters.city) return false;

    // 수종 필터. 복수 수종 기록도 포함된 종 중 하나가 맞으면 통과시킨다 —
    // "은행나무+이팝나무"는 이팝나무로 걸러도 나와야 한다.
    if (filters.species && !speciesOf(item).includes(filters.species)) return false;

    // 알레르기 등급 필터
    if (filters.allergenLevels && filters.allergenLevels.length > 0) {
      if (!filters.allergenLevels.includes(maxAllergenLevel(item))) return false;
    }

    // 알레르기 유발 수종만 보기
    if (filters.allergenOnly) {
      if (maxAllergenLevel(item) === 0) return false;
    }

    return true;
  });
}

// 수종별 통계 계산
export function calculateStats(data) {
  const speciesMap = {};
  const levelCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  const sourceCounts = {};
  let excludedNotATree = 0;

  for (const item of data) {
    // 결주·고사는 나무가 아니므로 통계에서도 뺀다.
    if (item.speciesKind === 'not-a-tree') {
      excludedNotATree += 1;
      continue;
    }
    const species = item.species || '미확인';
    if (!speciesMap[species]) {
      speciesMap[species] = { count: 0, treeCount: 0, level: 0 };
    }
    speciesMap[species].count += 1;
    speciesMap[species].treeCount += item.treeCount || item.plantCount || 0;

    const level = maxAllergenLevel(item);
    // 라벨의 등급은 레코드에서 모은다. 라벨 문자열을 다시 조회하면
    // getAllergenMatch가 첫 매칭만 돌려줘 복수 수종 라벨에서 등급이 낮아진다.
    speciesMap[species].level = Math.max(speciesMap[species].level, level);
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
      level: stats.level,
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

  return {
    speciesStats,
    levelStats,
    sourceStats,
    total: data.length - excludedNotATree,
    excludedNotATree,
  };
}
