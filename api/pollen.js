import { isInKorea, snapCoord, kstDate, cacheKey, buildResponse } from './_lib/pollen-core.js';
import { parseNaverGc, lookupRegionCode } from './_lib/region.js';
import { getRedis } from './_lib/redis.js';
import { getLimiter } from './_lib/ratelimit.js';
import { applyCors } from './_lib/http.js';

const KMA_BASE = 'https://apis.data.go.kr/1360000/HealthWthrIdxServiceV3';

async function fetchNaverGc(lat, lng) {
  const url = `https://maps.apigw.ntruss.com/map-reversegeocode/v2/gc?coords=${lng},${lat}&output=json&orders=admcode`;
  const r = await fetch(url, {
    headers: {
      'X-NCP-APIGW-API-KEY-ID': process.env.NAVER_GEOCODE_ID,
      'X-NCP-APIGW-API-KEY': process.env.NAVER_GEOCODE_KEY,
    },
  });
  if (!r.ok) throw new Error(`naver gc ${r.status}`);
  return r.json();
}

async function fetchKmaOp(op, regionCode, time) {
  const url = `${KMA_BASE}/${op}?serviceKey=${encodeURIComponent(process.env.KMA_POLLEN_KEY)}&areaNo=${regionCode}&time=${time}&dataType=JSON&pageNo=1&numOfRows=10`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`kma ${op} ${r.status}`);
  return r.json();
}

function fetchOak(regionCode, time) {
  return fetchKmaOp('getOakPollenRiskIdxV3', regionCode, time);
}
function fetchPine(regionCode, time) {
  return fetchKmaOp('getPinePollenRiskIdxV3', regionCode, time);
}
function fetchWeed(regionCode, time) {
  return fetchKmaOp('getWeedsPollenRiskndxV3', regionCode, time);
}

async function fetchGoogle(lat, lng) {
  const url = `https://pollen.googleapis.com/v1/forecast:lookup?location.latitude=${lat}&location.longitude=${lng}&days=1&key=${process.env.GOOGLE_POLLEN_KEY}`;
  const r = await fetch(url, { method: 'GET' });
  if (!r.ok) throw new Error(`google ${r.status}`);
  return r.json();
}

export default async function handler(req, res) {
  if (!applyCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  const lat = Number(req.query?.lat);
  const lng = Number(req.query?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isInKorea(lat, lng)) {
    return res.status(400).json({ error: 'invalid or out-of-area coordinates' });
  }

  const limiter = getLimiter();
  if (limiter) {
    const ip = (req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
    const { success } = await limiter.limit(ip);
    if (!success) return res.status(429).json({ error: 'too many requests' });
  }

  const sLat = snapCoord(lat), sLng = snapCoord(lng);

  let gc;
  try {
    gc = await fetchNaverGc(sLat, sLng);
  } catch {
    return res.status(502).json({ error: 'geocode failed' });
  }

  const { area1, area2 } = parseNaverGc(gc);
  const { regionCode, region } = lookupRegionCode(area1, area2);
  if (!regionCode) {
    res.setHeader('Cache-Control', 's-maxage=1800');
    return res.status(200).json({ region, regionCode: null, categories: [], status: 'unmapped' });
  }

  const now = new Date();
  const kstDateStr = kstDate(now);
  const key = cacheKey(regionCode, kstDateStr);

  const redis = getRedis();
  let cached = null;
  if (redis) {
    try { cached = await redis.get(key); } catch { /* fail-open */ }
  }
  if (cached) {
    res.setHeader('Cache-Control', 's-maxage=1800');
    return res.status(200).json(cached);
  }

  const ymd = kstDateStr.replaceAll('-', '');
  const time = `${ymd}06`;

  const [oakR, pineR, weedR, googleR] = await Promise.allSettled([
    fetchOak(regionCode, time),
    fetchPine(regionCode, time),
    fetchWeed(regionCode, time),
    fetchGoogle(sLat, sLng),
  ]);

  const out = buildResponse({
    region,
    regionCode,
    oakJson: oakR.status === 'fulfilled' ? oakR.value : null,
    pineJson: pineR.status === 'fulfilled' ? pineR.value : null,
    weedJson: weedR.status === 'fulfilled' ? weedR.value : null,
    googleJson: googleR.status === 'fulfilled' ? googleR.value : null,
    updatedAt: now.toISOString(),
    kstDateStr,
  });

  if (redis) {
    try { await redis.set(key, out, { ex: 6 * 3600 }); } catch { /* fail-open */ }
  }

  res.setHeader('Cache-Control', 's-maxage=1800');
  return res.status(200).json(out);
}
