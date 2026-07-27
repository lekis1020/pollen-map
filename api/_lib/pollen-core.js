const UPI_MAP = { 0: 0, 1: 0, 2: 1, 3: 1, 4: 2, 5: 3 };

export function upiToLevel(upi) {
  if (upi <= 0) return 0;
  if (upi >= 5) return 3;
  return UPI_MAP[upi] ?? 0;
}

export function isInKorea(lat, lng) {
  return lat >= 33.0 && lat <= 38.7 && lng >= 124.5 && lng <= 132.0;
}

export function snapCoord(n) {
  return Math.round(n * 100) / 100;
}

export function kstDate(date) {
  // en-CA 로케일은 YYYY-MM-DD 포맷을 준다.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(date);
}

export function cacheKey(regionCode, kstDateStr) {
  return `pollen:${regionCode}:${kstDateStr}`;
}

export function parseKmaItem(kmaJson) {
  const items = kmaJson?.response?.body?.items?.item;
  const item = Array.isArray(items) ? items[0] : items;
  if (item == null) return { level: null, status: 'error' };

  const today = item.today;
  if (today === '' || today === '-' || today == null) {
    return { level: null, status: 'offseason' };
  }
  const n = Number(today);
  if (Number.isNaN(n)) return { level: null, status: 'error' };
  return { level: Math.max(0, Math.min(3, n)), status: 'ok' };
}

export function parseGoogleGrass(googleJson) {
  const plants = googleJson?.dailyInfo?.[0]?.pollenTypeInfo ?? [];
  const grass = plants.find((p) => p.code === 'GRASS');
  if (!grass) return { level: null, status: 'error' };
  if (grass.indexInfo?.value == null) return { level: null, status: 'offseason' };
  return { level: upiToLevel(Number(grass.indexInfo.value)), status: 'ok' };
}

export function buildResponse({
  region,
  regionCode,
  oakJson,
  pineJson,
  weedJson,
  googleJson,
  updatedAt,
  kstDateStr,
}) {
  return {
    region,
    regionCode,
    updatedAt,
    categories: [
      { key: 'oak', label: '참나무', ...parseKmaItem(oakJson), source: '기상청' },
      { key: 'pine', label: '소나무', ...parseKmaItem(pineJson), source: '기상청' },
      { key: 'weed', label: '잡초류', ...parseKmaItem(weedJson), source: '기상청' },
      { key: 'grass', label: '잔디', ...parseGoogleGrass(googleJson), source: 'Google' },
    ],
    disclaimer: '기상청 예보 위험지수 · 지역 단위 · 시즌제',
    generatedForKstDate: kstDateStr,
  };
}
