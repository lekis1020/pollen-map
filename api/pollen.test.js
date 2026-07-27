import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./_lib/redis.js', () => ({
  getRedis: () => ({
    get: async () => { throw new Error('redis down'); },
    set: async () => { throw new Error('redis down'); },
  }),
}));
vi.mock('./_lib/ratelimit.js', () => ({
  getLimiter: () => null,
}));

function mockRes() {
  return {
    statusCode: 0, body: null, headers: {},
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
    setHeader(k, v) { this.headers[k] = v; },
  };
}
const req = (query, origin = 'https://x.vercel.app', method = 'GET') => ({
  method, query, headers: { origin },
});

beforeEach(() => {
  process.env.ALLOWED_ORIGINS = 'https://pollen.example.com';
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('/api/pollen 입력검증', () => {
  it('허용 안된 오리진은 403', async () => {
    const { default: handler } = await import('./pollen.js');
    const res = mockRes();
    await handler(req({ lat: '37.5', lng: '127.0' }, 'https://evil.com'), res);
    expect(res.statusCode).toBe(403);
  });

  it('GET 이외 메서드는 405', async () => {
    const { default: handler } = await import('./pollen.js');
    const res = mockRes();
    await handler(req({ lat: '37.5', lng: '127.0' }, 'https://x.vercel.app', 'POST'), res);
    expect(res.statusCode).toBe(405);
  });

  it('lat/lng 누락은 400', async () => {
    const { default: handler } = await import('./pollen.js');
    const res = mockRes();
    await handler(req({}), res);
    expect(res.statusCode).toBe(400);
  });

  it('bbox 밖(도쿄)은 400', async () => {
    const { default: handler } = await import('./pollen.js');
    const res = mockRes();
    await handler(req({ lat: '35.68', lng: '139.69' }), res);
    expect(res.statusCode).toBe(400);
  });
});

describe('/api/pollen 지역 매핑', () => {
  it('매핑 안되는 지역은 200 + status unmapped', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        results: [{ region: { area1: { name: '없는시' }, area2: { name: '없는구' } } }],
      }),
    })));

    const { default: handler } = await import('./pollen.js');
    const res = mockRes();
    await handler(req({ lat: '37.5', lng: '127.0' }), res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      region: '없는시 없는구',
      regionCode: null,
      categories: [],
      status: 'unmapped',
    });
  });
});

function mockFetchWithMappedRegion() {
  return vi.fn(async (url) => {
    if (url.includes('reversegeocode')) {
      return {
        ok: true,
        json: async () => ({
          results: [{ region: { area1: { name: '서울특별시' }, area2: { name: '강남구' } } }],
        }),
      };
    }
    if (url.includes('HealthWthrIdxService')) {
      return {
        ok: true,
        json: async () => ({ response: { body: { items: { item: [{ today: '2' }] } } } }),
      };
    }
    if (url.includes('pollen.googleapis')) {
      return {
        ok: true,
        json: async () => ({ dailyInfo: [{ pollenTypeInfo: [{ code: 'GRASS', indexInfo: { value: 3 } }] }] }),
      };
    }
    throw new Error(`unexpected fetch url: ${url}`);
  });
}

describe('/api/pollen 회복탄력성 (redis fail-open / 병합 / naver 실패)', () => {
  const koreaReq = (overrides = {}) => req({ lat: '37.4979', lng: '127.0276', ...overrides });

  it('redis get/set이 throw해도 매핑된 지역 요청은 200 (fail-open)', async () => {
    vi.stubGlobal('fetch', mockFetchWithMappedRegion());

    const { default: handler } = await import('./pollen.js');
    const res = mockRes();
    await handler(koreaReq(), res);

    expect(res.statusCode).toBe(200);
    const keys = res.body.categories.map((c) => c.key);
    expect(keys).toEqual(expect.arrayContaining(['oak', 'pine', 'weed', 'grass']));
  });

  it('정상 병합 경로: oak level 2, grass level 1 (UPI 3 -> 1)', async () => {
    vi.stubGlobal('fetch', mockFetchWithMappedRegion());

    const { default: handler } = await import('./pollen.js');
    const res = mockRes();
    await handler(koreaReq(), res);

    expect(res.statusCode).toBe(200);
    const oak = res.body.categories.find((c) => c.key === 'oak');
    const grass = res.body.categories.find((c) => c.key === 'grass');
    expect(oak.level).toBe(2);
    expect(grass.level).toBe(1);
  });

  it('네이버 역지오코딩 실패는 502', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (url.includes('reversegeocode')) {
        return { ok: false, json: async () => ({}) };
      }
      throw new Error(`unexpected fetch url: ${url}`);
    }));

    const { default: handler } = await import('./pollen.js');
    const res = mockRes();
    await handler(koreaReq(), res);

    expect(res.statusCode).toBe(502);
  });
});
