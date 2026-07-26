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
