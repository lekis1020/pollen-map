import { describe, it, expect, vi } from 'vitest';
import { fetchPollen } from './pollen.js';

describe('fetchPollen', () => {
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
