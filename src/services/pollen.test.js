import { describe, it, expect, vi } from 'vitest';
import { fetchPollen } from './pollen.js';

describe('fetchPollen', () => {
  // Vercel 엣지 캐시는 raw URL 단위로 키를 잡는다(2026-08-30 프로덕션 실측:
  // 같은 URL 재요청은 HIT, 같은 셀이라도 소수 5자리가 흔들리면 MISS).
  // 서버가 어차피 스냅하므로 응답은 같은데, URL이 다르면 캐시가 갈라진다.
  // 그래서 클라이언트가 미리 스냅해 같은 셀 사용자끼리 캐시를 공유하게 한다.
  function urlOf(mock) {
    return mock.mock.calls[0][0];
  }

  it('GPS 원좌표를 셀 좌표로 스냅해 요청한다', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    await fetchPollen(37.57012, 126.98034);
    expect(urlOf(global.fetch)).toBe('/api/pollen?lat=37.57&lng=126.98');
  });

  it('같은 셀 안의 서로 다른 좌표는 같은 URL을 만든다', async () => {
    const urls = new Set();
    for (const [lat, lng] of [[37.5712, 126.9841], [37.5688, 126.9822], [37.5701, 126.9799]]) {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
      await fetchPollen(lat, lng);
      urls.add(urlOf(global.fetch));
    }
    expect(urls.size).toBe(1);
  });

  // 부동소수 나눗셈이 37.129999999999995 같은 값을 만들면 URL이 다시 갈라진다.
  it('URL 좌표는 소수점 두 자리를 넘지 않는다', async () => {
    for (const [lat, lng] of [[37.125, 126.985], [35.115, 129.045], [33.4999, 126.5001]]) {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
      await fetchPollen(lat, lng);
      const params = new URL(urlOf(global.fetch), 'https://x').searchParams;
      for (const v of [params.get('lat'), params.get('lng')]) {
        expect(v).toMatch(/^-?\d+(\.\d{1,2})?$/);
      }
    }
  });

  it('성공 응답 반환', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ regionCode: '1168000000', categories: [] }) });
    const r = await fetchPollen(37.5, 127.0);
    expect(r.regionCode).toBe('1168000000');
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/pollen?lat=37.5&lng=127'));
  });
  it('실패 시 throw', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    await expect(fetchPollen(37.5, 127.0)).rejects.toThrow();
  });
});
