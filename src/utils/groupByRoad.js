// 같은 도로·수종의 개별 가로수들을 연속 경로(폴리라인)로 묶어 렌더 부하를 줄인다.
// - 키: district || roadName || species
// - 각 그룹 내부는 최근접 이웃(NN) 순회로 정렬
// - 인접 점 사이 거리가 임계값을 넘으면 별도 구간으로 분리 (교차 도로 건너뛰기 방지)

const LAT_METERS = 111000; // 1° lat ≈ 111km
const LNG_METERS_AT_37N = 88000; // 1° lng at ~37°N ≈ 88km

function sqDistMeters(a, b) {
  const dLat = (a.latitude - b.latitude) * LAT_METERS;
  const dLng = (a.longitude - b.longitude) * LNG_METERS_AT_37N;
  return dLat * dLat + dLng * dLng;
}

function orderByNearestNeighbor(items) {
  if (items.length <= 2) return items.slice();
  // 가장 서쪽 점에서 출발
  const sorted = items.slice().sort((a, b) => a.longitude - b.longitude);
  const remaining = sorted.slice();
  const path = [remaining.shift()];
  while (remaining.length) {
    const last = path[path.length - 1];
    let minD = Infinity;
    let minI = 0;
    for (let i = 0; i < remaining.length; i++) {
      const d = sqDistMeters(remaining[i], last);
      if (d < minD) {
        minD = d;
        minI = i;
      }
    }
    path.push(remaining.splice(minI, 1)[0]);
  }
  return path;
}

function splitOnGaps(ordered, maxGapMeters) {
  if (ordered.length <= 1) return [ordered];
  const maxSq = maxGapMeters * maxGapMeters;
  const segments = [];
  let current = [ordered[0]];
  for (let i = 1; i < ordered.length; i++) {
    if (sqDistMeters(ordered[i - 1], ordered[i]) > maxSq) {
      segments.push(current);
      current = [ordered[i]];
    } else {
      current.push(ordered[i]);
    }
  }
  segments.push(current);
  return segments;
}

/**
 * 도로 + 수종 단위로 묶어 폴리라인 세그먼트를 만든다.
 *
 * @param {Array} items - 정규화된 트리 데이터
 * @param {Object} opts
 * @param {number} opts.minGroupSize - 이 크기 이상인 그룹만 폴리라인으로 변환 (그 미만은 개별 마커)
 * @param {number} opts.maxGapMeters - 인접 점 허용 거리 (넘으면 구간 분리)
 * @returns {{ polylines: Array, markers: Array }}
 */
export function groupByRoadSpecies(items, { minGroupSize = 3, maxGapMeters = 80 } = {}) {
  const groups = new Map();
  const markers = [];

  for (const it of items) {
    if (!it.latitude || !it.longitude) continue;
    const road = (it.roadName || '').trim();
    const species = (it.species || '').trim();
    if (!road || !species) {
      markers.push(it);
      continue;
    }
    const key = `${it.district}||${road}||${species}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(it);
  }

  const polylines = [];
  for (const [key, arr] of groups) {
    if (arr.length < minGroupSize) {
      markers.push(...arr);
      continue;
    }
    const ordered = orderByNearestNeighbor(arr);
    const segments = splitOnGaps(ordered, maxGapMeters);
    for (const seg of segments) {
      if (seg.length < minGroupSize) {
        markers.push(...seg);
        continue;
      }
      const first = seg[0];
      const lats = seg.map((s) => s.latitude);
      const lngs = seg.map((s) => s.longitude);
      polylines.push({
        id: `pl_${key}_${first.id}`,
        path: seg.map((s) => ({ lat: s.latitude, lng: s.longitude })),
        count: seg.length,
        species: first.species,
        roadName: first.roadName,
        city: first.city,
        district: first.district,
        sourceType: first.sourceType,
        representative: first,
        bounds: {
          minLat: Math.min(...lats),
          maxLat: Math.max(...lats),
          minLng: Math.min(...lngs),
          maxLng: Math.max(...lngs),
        },
      });
    }
  }

  return { polylines, markers };
}
