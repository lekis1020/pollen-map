import { describe, it, expect } from 'vitest';
import gcGangnam from './__fixtures__/naver-gc-gangnam.json' with { type: 'json' };
import gcSejong from './__fixtures__/naver-gc-sejong.json' with { type: 'json' };
import { parseNaverGc, lookupRegionCode } from './region.js';

describe('parseNaverGc', () => {
  it('강남: area1/area2 추출', () => {
    const r = parseNaverGc(gcGangnam);
    expect(r.area1).toBe('서울특별시');
    expect(r.area2).toBe('강남구');
  });
  it('세종: area2 공백', () => {
    const r = parseNaverGc(gcSejong);
    expect(r.area1).toBe('세종특별자치시');
    expect(r.area2).toBe('');
  });
});

describe('lookupRegionCode', () => {
  it('강남 복합키', () => {
    expect(lookupRegionCode('서울특별시', '강남구').regionCode).toBe('1168000000');
  });
  it('강남 region 라벨', () => {
    expect(lookupRegionCode('서울특별시', '강남구').region).toBe('서울특별시 강남구');
  });
  it('세종 area1 단독 폴백', () => {
    const r = lookupRegionCode('세종특별자치시', '');
    expect(r.regionCode).toBeTruthy();
    expect(r.regionCode).toBe('3611000000');
    expect(r.region).toBe('세종특별자치시');
  });
  it('미매칭은 null', () => {
    expect(lookupRegionCode('없는시', '없는구').regionCode).toBeNull();
  });
});
