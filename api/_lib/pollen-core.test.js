import { describe, it, expect } from 'vitest';
import { upiToLevel, isInKorea, snapCoord, kstDate, cacheKey } from './pollen-core.js';

describe('upiToLevel', () => {
  it.each([[0,0],[1,0],[2,1],[3,1],[4,2],[5,3]])('UPI %i → %i', (u, l) => {
    expect(upiToLevel(u)).toBe(l);
  });
  it('범위 밖은 clamp', () => {
    expect(upiToLevel(-1)).toBe(0);
    expect(upiToLevel(9)).toBe(3);
  });
});

describe('isInKorea', () => {
  it('서울은 true', () => expect(isInKorea(37.5, 127.0)).toBe(true));
  it('도쿄는 false', () => expect(isInKorea(35.68, 139.69)).toBe(false));
});

describe('snapCoord', () => {
  it('소수 2자리 반올림', () => expect(snapCoord(37.50123)).toBe(37.5));
  it('반올림 경계', () => expect(snapCoord(127.005)).toBe(127.01));
});

describe('kstDate', () => {
  it('UTC 자정 직후도 KST 날짜', () => {
    // 2026-07-26T15:30:00Z == 2026-07-27 00:30 KST
    expect(kstDate(new Date('2026-07-26T15:30:00Z'))).toBe('2026-07-27');
  });
});

describe('cacheKey', () => {
  it('형식', () => expect(cacheKey('1168000000', '2026-07-26')).toBe('pollen:1168000000:2026-07-26'));
});
