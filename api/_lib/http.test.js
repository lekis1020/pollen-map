import { describe, it, expect } from 'vitest';
import { resolveCors, applyCors } from './http.js';

describe('resolveCors', () => {
  it('프로덕션 도메인 허용', () => {
    process.env.ALLOWED_ORIGINS = 'https://pollen.example.com';
    expect(resolveCors('https://pollen.example.com')).toBe('https://pollen.example.com');
  });
  it('vercel 프리뷰 허용', () => {
    expect(resolveCors('https://pollen-map-abc123.vercel.app')).toBe('https://pollen-map-abc123.vercel.app');
  });
  it('타 도메인 거부', () => {
    expect(resolveCors('https://evil.com')).toBeNull();
  });
});

// 브라우저는 same-origin GET에 Origin 헤더를 붙이지 않는다. 이 앱 자신의
// 요청이 정확히 그 경우인데, 헤더가 없다고 막는 바람에 2026-07-26부터
// 프로덕션 꽃가루 패널이 통째로 403이었다("일시적으로 불러올 수 없습니다.").
// 기존 테스트는 전부 Origin을 붙여 호출해서 이 경로를 한 번도 밟지 않았다.
describe('applyCors', () => {
  function mockRes() {
    const res = {
      statusCode: null,
      body: null,
      headers: {},
      status(c) { this.statusCode = c; return this; },
      json(b) { this.body = b; return this; },
      setHeader(k, v) { this.headers[k] = v; },
    };
    return res;
  }

  it('Origin 헤더가 없으면(same-origin) 통과시킨다', () => {
    const res = mockRes();
    expect(applyCors({ headers: {} }, res)).toBe(true);
    expect(res.statusCode).toBeNull();
  });

  it('허용 Origin은 통과시키고 ACAO를 붙인다', () => {
    const res = mockRes();
    const origin = 'https://pollen-map-abc.vercel.app';
    expect(applyCors({ headers: { origin } }, res)).toBe(true);
    expect(res.headers['Access-Control-Allow-Origin']).toBe(origin);
  });

  it('허용되지 않은 Origin은 403으로 막는다', () => {
    const res = mockRes();
    expect(applyCors({ headers: { origin: 'https://evil.com' } }, res)).toBe(false);
    expect(res.statusCode).toBe(403);
  });

  // 캐시가 Origin 유무를 구분하지 못하면 ACAO 없는 응답이 교차 출처 요청에
  // 재사용되거나 그 반대가 된다.
  it('어느 경로든 Vary: Origin을 남긴다', () => {
    const a = mockRes();
    applyCors({ headers: {} }, a);
    expect(a.headers.Vary).toBe('Origin');

    const b = mockRes();
    applyCors({ headers: { origin: 'https://pollen-map-abc.vercel.app' } }, b);
    expect(b.headers.Vary).toBe('Origin');
  });
});
