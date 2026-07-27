import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
