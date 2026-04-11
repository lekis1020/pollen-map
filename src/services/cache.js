const CACHE_KEY = 'pollen-map-data';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export function getCachedData() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function setCachedData(items) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data: items,
      timestamp: Date.now(),
    }));
  } catch {
    // localStorage full or unavailable
  }
}
