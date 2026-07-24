// 공공데이터 좌표의 한 자리 숫자 오타를 결정론적으로 교정한다.
//
// 근거: 국토 밖으로 튄 좌표 9건을 조사한 결과 전부 한 자리 오타였다.
//   36.307305 → 26.305441 (3→2), 128.239748 → 158.239748 (2→5) 등
// 잘못된 끝점의 각 자릿수를 0~9로 치환한 후보 중, 정상 끝점(앵커) 근처로
// 들어오는 것이 정확히 하나일 때만 교정한다. 둘 이상이면 모호하므로 포기한다.
//
// 측정: 대상 9건 중 5건 확정 교정, 모호 0건.
// docs/superpowers/specs/2026-07-24-data-audit.md 참조.

const KOREA_BOUNDS = { latMin: 33.0, latMax: 38.7, lngMin: 124.5, lngMax: 132.0 };
const EARTH_RADIUS_KM = 6371;
const DEFAULT_MAX_DISTANCE_KM = 5;

export function isInKorea(lat, lng) {
  return (
    Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= KOREA_BOUNDS.latMin && lat <= KOREA_BOUNDS.latMax &&
    lng >= KOREA_BOUNDS.lngMin && lng <= KOREA_BOUNDS.lngMax
  );
}

const toRad = (deg) => (deg * Math.PI) / 180;

export function haversineKm(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

// 문자열의 각 숫자 자리를 0~9로 한 번씩 치환한 모든 변형을 만든다.
function digitVariants(numStr) {
  const out = new Set();
  for (let i = 0; i < numStr.length; i++) {
    if (!/[0-9]/.test(numStr[i])) continue;
    for (let d = 0; d <= 9; d++) {
      const ch = String(d);
      if (ch === numStr[i]) continue;
      out.add(numStr.slice(0, i) + ch + numStr.slice(i + 1));
    }
  }
  return [...out];
}

export function repairCoordinate({
  badLat, badLng, anchorLat, anchorLng,
  maxDistanceKm = DEFAULT_MAX_DISTANCE_KM,
}) {
  const badLatNum = Number(badLat);
  const badLngNum = Number(badLng);

  // 앵커가 신뢰할 수 없으면 기준이 없으므로 교정하지 않는다.
  if (!isInKorea(anchorLat, anchorLng)) return null;
  // 이미 정상이면 교정 대상이 아니다.
  if (isInKorea(badLatNum, badLngNum)) return null;

  const candidates = [];
  for (const variant of digitVariants(String(badLat))) {
    const lat = Number(variant);
    if (isInKorea(lat, badLngNum)) candidates.push({ lat, lng: badLngNum, field: 'lat' });
  }
  for (const variant of digitVariants(String(badLng))) {
    const lng = Number(variant);
    if (isInKorea(badLatNum, lng)) candidates.push({ lat: badLatNum, lng, field: 'lng' });
  }

  const near = candidates
    .map((c) => ({ ...c, distanceKm: haversineKm(anchorLat, anchorLng, c.lat, c.lng) }))
    .filter((c) => c.distanceKm <= maxDistanceKm);

  // 같은 좌표로 수렴한 후보는 하나로 본다.
  const unique = [...new Map(near.map((c) => [`${c.lat},${c.lng}`, c])).values()];

  return unique.length === 1 ? unique[0] : null;
}
