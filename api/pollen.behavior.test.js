import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// /api/pollen 핸들러의 현재 계약. 리팩터 전에 상태 코드, 본문, 헤더,
// 외부 호출 URL을 고정한다. 업스트림은 모두 목이다.

const state = vi.hoisted(() => ({
  limiter: { limit: vi.fn(async () => ({ success: true })) },
  redis: {
    get: vi.fn(async () => null),
    set: vi.fn(async () => 'OK'),
  },
}));

vi.mock('./_lib/redis.js', () => ({
  getRedis: () => state.redis,
}));
vi.mock('./_lib/ratelimit.js', () => ({
  getLimiter: () => state.limiter,
}));

import handler from './pollen.js';

const FROZEN = '2026-07-26T15:30:00.000Z'; // KST 2026-07-27 00:30
const KST_DAY = '2026-07-27';
const KMA_TIME = '2026072706';

function mockRes() {
  return {
    statusCode: 0,
    body: null,
    headers: {},
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
    setHeader(k, v) { this.headers[k] = v; },
  };
}

function req(options = {}) {
  const {
    query = { lat: '37.49794', lng: '127.02761' },
    method = 'GET',
  } = options;
  const headers = {};
  if ('origin' in options) {
    if (options.origin != null) headers.origin = options.origin;
  } else {
    headers.origin = 'https://pollen.example.com';
  }
  if ('forwardedFor' in options) {
    if (options.forwardedFor != null) headers['x-forwarded-for'] = options.forwardedFor;
  } else {
    headers['x-forwarded-for'] = '203.0.113.9, 10.0.0.1';
  }
  return { method, query, headers };
}

function installFetch({
  naver = {
    results: [{ region: { area1: { name: '서울특별시' }, area2: { name: '강남구' } } }],
  },
  naverOk = true,
  kmaToday = '2',
  kmaByOp = {},
  google = { dailyInfo: [{ pollenTypeInfo: [{ code: 'GRASS', indexInfo: { value: 3 } }] }] },
  googleOk = true,
} = {}) {
  const calls = [];
  vi.stubGlobal('fetch', vi.fn(async (url, init) => {
    const href = String(url);
    calls.push({ url: href, init });
    if (href.includes('reversegeocode')) {
      if (!naverOk) return { ok: false, status: 500, json: async () => ({}) };
      return { ok: true, json: async () => naver };
    }
    if (href.includes('HealthWthrIdxService')) {
      const op = href.split('/').find((part) => part.startsWith('get'))?.split('?')[0];
      const body = kmaByOp[op] ?? {
        response: { body: { items: { item: [{ today: kmaToday }] } } },
      };
      return { ok: true, json: async () => body };
    }
    if (href.includes('pollen.googleapis')) {
      if (!googleOk) return { ok: false, status: 503, json: async () => ({}) };
      return { ok: true, json: async () => google };
    }
    throw new Error(`unexpected fetch url: ${href}`);
  }));
  return calls;
}

beforeEach(() => {
  process.env.ALLOWED_ORIGINS = 'https://pollen.example.com';
  process.env.NAVER_GEOCODE_ID = 'n-id';
  process.env.NAVER_GEOCODE_KEY = 'n-key';
  process.env.KMA_POLLEN_KEY = 'kma+key';
  process.env.GOOGLE_POLLEN_KEY = 'gkey';
  state.limiter = { limit: vi.fn(async () => ({ success: true })) };
  state.redis = {
    get: vi.fn(async () => null),
    set: vi.fn(async () => 'OK'),
  };
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(FROZEN));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('/api/pollen 거절 응답', () => {
  it('허용되지 않은 Origin은 403이고 업스트림을 호출하지 않는다', async () => {
    const calls = installFetch();
    const res = mockRes();
    await handler(req({ origin: 'https://evil.example' }), res);
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: 'forbidden origin' });
    expect(res.headers.Vary).toBe('Origin');
    expect(res.headers['Access-Control-Allow-Origin']).toBeUndefined();
    expect(res.headers['Cache-Control']).toBeUndefined();
    expect(calls).toHaveLength(0);
  });

  it('Origin이 없으면 same-origin으로 통과하고 ACAO는 붙이지 않는다', async () => {
    installFetch();
    const res = mockRes();
    await handler(req({ origin: undefined }), res);
    expect(res.statusCode).toBe(200);
    expect(res.headers.Vary).toBe('Origin');
    expect(res.headers['Access-Control-Allow-Origin']).toBeUndefined();
    expect(res.headers['Cache-Control']).toBe('s-maxage=1800');
  });

  it('GET이 아니면 405', async () => {
    const calls = installFetch();
    const res = mockRes();
    await handler(req({ method: 'get' }), res);
    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({ error: 'method not allowed' });
    expect(res.headers.Vary).toBe('Origin');
    expect(res.headers['Cache-Control']).toBeUndefined();
    expect(calls).toHaveLength(0);
  });

  it('숫자가 아니거나 스냅 전에 한반도 밖이면 400', async () => {
    const calls = installFetch();
    for (const query of [
      { lat: 'nope', lng: '127' },
      { lat: '32.996', lng: '127' }, // 스냅하면 33.00이지만 검사보다 앞이다
      { lat: '38.704', lng: '128' },
      { lat: '37.5', lng: '124.499' },
    ]) {
      const res = mockRes();
      await handler(req({ query }), res);
      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({ error: 'invalid or out-of-area coordinates' });
      expect(res.headers['Cache-Control']).toBeUndefined();
    }
    expect(calls).toHaveLength(0);
  });

  it('경계 좌표(포함)는 400이 아니다', async () => {
    installFetch();
    const res = mockRes();
    await handler(req({ query: { lat: '33', lng: '124.5' } }), res);
    expect(res.statusCode).not.toBe(400);
  });

  it('레이트리밋에 걸리면 429이고 업스트림을 호출하지 않는다', async () => {
    const calls = installFetch();
    const res = mockRes();
    await handler(req(), res);
    expect(state.limiter.limit).toHaveBeenCalledWith('203.0.113.9');
    expect(res.statusCode).not.toBe(429);

    state.limiter.limit.mockResolvedValueOnce({ success: false });
    const blocked = mockRes();
    await handler(req({ forwardedFor: '  198.51.100.4 , 10.1.1.1' }), blocked);
    expect(state.limiter.limit).toHaveBeenCalledWith('198.51.100.4');
    expect(blocked.statusCode).toBe(429);
    expect(blocked.body).toEqual({ error: 'too many requests' });
    expect(blocked.headers['Cache-Control']).toBeUndefined();
    expect(calls).toHaveLength(5);
  });

  it('x-forwarded-for가 없으면 unknown으로 제한한다', async () => {
    installFetch();
    await handler(req({ forwardedFor: undefined }), mockRes());
    expect(state.limiter.limit).toHaveBeenCalledWith('unknown');
  });

  it('리미터가 없으면 제한을 건너뛴다', async () => {
    installFetch();
    state.limiter = null;
    const res = mockRes();
    await handler(req(), res);
    expect(res.statusCode).toBe(200);
  });

  it('리미터가 던져도 fail-open으로 200이다', async () => {
    installFetch();
    state.limiter = { limit: vi.fn(async () => { throw new Error('redis down'); }) };
    const res = mockRes();
    await handler(req(), res);
    expect(res.statusCode).toBe(200);
  });

  it('역지오코딩 실패는 502', async () => {
    installFetch({ naverOk: false });
    const res = mockRes();
    await handler(req(), res);
    expect(res.statusCode).toBe(502);
    expect(res.body).toEqual({ error: 'geocode failed' });
    expect(res.headers['Cache-Control']).toBeUndefined();
    expect(state.redis.set).not.toHaveBeenCalled();
  });
});

describe('/api/pollen 성공 경로', () => {
  it('좌표를 스냅해 네이버·기상청·구글을 호출하고 응답 모양을 맞춘다', async () => {
    const calls = installFetch();
    const res = mockRes();
    await handler(req(), res);

    expect(res.statusCode).toBe(200);
    expect(res.headers['Cache-Control']).toBe('s-maxage=1800');
    expect(res.headers['Access-Control-Allow-Origin']).toBe('https://pollen.example.com');
    expect(res.body).toEqual({
      region: '서울특별시 강남구',
      regionCode: '1168000000',
      updatedAt: FROZEN,
      categories: [
        { key: 'oak', label: '참나무', level: 2, status: 'ok', source: '기상청' },
        { key: 'pine', label: '소나무', level: 2, status: 'ok', source: '기상청' },
        { key: 'weed', label: '잡초류', level: 2, status: 'ok', source: '기상청' },
        { key: 'grass', label: '잔디', level: 1, status: 'ok', source: 'Google' },
      ],
      disclaimer: '기상청 예보 위험지수 · 지역 단위 · 시즌제',
      generatedForKstDate: KST_DAY,
    });

    const naver = calls.find((c) => c.url.includes('reversegeocode'));
    expect(naver.url).toContain('coords=127.03,37.5');
    expect(naver.url).toContain('output=json');
    expect(naver.url).toContain('orders=admcode');
    expect(naver.url).not.toContain('legalcode');
    expect(naver.init.headers).toEqual({
      'X-NCP-APIGW-API-KEY-ID': 'n-id',
      'X-NCP-APIGW-API-KEY': 'n-key',
    });

    const kma = calls.filter((c) => c.url.includes('HealthWthrIdxService'));
    expect(kma.map((c) => c.url)).toEqual([
      expect.stringContaining('/getOakPollenRiskIdxV3?'),
      expect.stringContaining('/getPinePollenRiskIdxV3?'),
      expect.stringContaining('/getWeedsPollenRiskndxV3?'),
    ]);
    for (const call of kma) {
      expect(call.url).toContain('serviceKey=kma%2Bkey');
      expect(call.url).toContain('areaNo=1168000000');
      expect(call.url).toContain(`time=${KMA_TIME}`);
      expect(call.url).toContain('dataType=JSON');
      expect(call.url).toContain('pageNo=1');
      expect(call.url).toContain('numOfRows=10');
    }

    const google = calls.find((c) => c.url.includes('pollen.googleapis'));
    expect(google.url).toBe(
      'https://pollen.googleapis.com/v1/forecast:lookup?location.latitude=37.5&location.longitude=127.03&days=1&key=gkey',
    );
    expect(google.init).toEqual({ method: 'GET' });

    expect(state.redis.get).toHaveBeenCalledWith(`pollen:1168000000:${KST_DAY}`);
    expect(state.redis.set).toHaveBeenCalledWith(
      `pollen:1168000000:${KST_DAY}`,
      res.body,
      { ex: 21600 },
    );
  });

  it('한 소스가 실패해도 나머지는 합치고 캐시에 넣는다', async () => {
    installFetch({
      kmaByOp: {
        getOakPollenRiskIdxV3: null,
      },
      googleOk: false,
    });
    // oak URL은 json null로 두면 parseKmaItem이 error. 네트워크 실패와 구분하려고
    // fetch 구현을 한 번 더 덮어 oak만 throw 시킨다.
    const calls = [];
    vi.stubGlobal('fetch', vi.fn(async (url, init) => {
      const href = String(url);
      calls.push({ url: href, init });
      if (href.includes('reversegeocode')) {
        return {
          ok: true,
          json: async () => ({
            results: [{ region: { area1: { name: '서울특별시' }, area2: { name: '강남구' } } }],
          }),
        };
      }
      if (href.includes('getOakPollenRiskIdxV3')) throw new Error('oak down');
      if (href.includes('getPinePollenRiskIdxV3')) {
        return { ok: true, json: async () => ({ response: { body: { items: { item: [{ today: '1' }] } } } }) };
      }
      if (href.includes('getWeedsPollenRiskndxV3')) {
        return {
          ok: true,
          json: async () => ({
            response: { header: { resultCode: '99', resultMsg: '해당지수자료 제공기간이 아닙니다!' } },
          }),
        };
      }
      if (href.includes('pollen.googleapis')) return { ok: false, status: 503, json: async () => ({}) };
      throw new Error(href);
    }));

    const res = mockRes();
    await handler(req(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.categories).toEqual([
      { key: 'oak', label: '참나무', level: null, status: 'error', source: '기상청' },
      { key: 'pine', label: '소나무', level: 1, status: 'ok', source: '기상청' },
      { key: 'weed', label: '잡초류', level: null, status: 'offseason', source: '기상청' },
      { key: 'grass', label: '잔디', level: null, status: 'error', source: 'Google' },
    ]);
    expect(state.redis.set).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(5);
  });

  it('매핑되지 않은 지역은 200 unmapped이고 캐시·기상청을 타지 않는다', async () => {
    const calls = installFetch({
      naver: { results: [{ region: { area1: { name: '없는시' }, area2: { name: '없는구' } } }] },
    });
    const res = mockRes();
    await handler(req(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      region: '없는시 없는구',
      regionCode: null,
      categories: [],
      status: 'unmapped',
    });
    expect(res.headers['Cache-Control']).toBe('s-maxage=1800');
    expect(calls).toHaveLength(1);
    expect(state.redis.get).not.toHaveBeenCalled();
    expect(state.redis.set).not.toHaveBeenCalled();
  });

  it('캐시가 있으면 그 값을 그대로 돌려주고 기상청은 호출하지 않는다', async () => {
    const cached = { regionCode: '1168000000', categories: [{ key: 'oak' }], cached: true };
    state.redis.get.mockResolvedValueOnce(cached);
    const calls = installFetch();
    const res = mockRes();
    await handler(req(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(cached);
    expect(res.headers['Cache-Control']).toBe('s-maxage=1800');
    expect(calls.map((c) => c.url).every((url) => url.includes('reversegeocode'))).toBe(true);
    expect(calls).toHaveLength(1);
    expect(state.redis.set).not.toHaveBeenCalled();
  });

  it('redis get/set이 던져도 200이다', async () => {
    state.redis.get.mockRejectedValueOnce(new Error('get down'));
    state.redis.set.mockRejectedValueOnce(new Error('set down'));
    installFetch();
    const res = mockRes();
    await handler(req(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.regionCode).toBe('1168000000');
  });

  it('redis 클라이언트가 없으면 캐시를 건너뛴다', async () => {
    state.redis = null;
    installFetch();
    const res = mockRes();
    await handler(req(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.categories).toHaveLength(4);
  });
});
