import { describe, it, expect } from 'vitest';
import {
  upiToLevel,
  isInKorea,
  snapCoord,
  kstDate,
  cacheKey,
  parseKmaItem,
  parseGoogleGrass,
  buildResponse,
} from './pollen-core.js';
import kmaOakInseason from './__fixtures__/kma-oak-inseason.json';
import kmaWeedInseason from './__fixtures__/kma-weed-inseason.json';
import kmaPineInseason from './__fixtures__/kma-pine-inseason.json';
import kmaOffseason from './__fixtures__/kma-offseason.json';
import googleGrass from './__fixtures__/google-grass.json';
import googleGrassOffseason from './__fixtures__/google-grass-offseason.json';

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

describe('parseKmaItem', () => {
  it('시즌 중 참나무 → level 2, status ok', () => {
    expect(parseKmaItem(kmaOakInseason)).toEqual({ level: 2, status: 'ok' });
  });
  it('시즌 중 잡초류 실응답(2026-08-02 캡처, today:"0") → level 0, status ok', () => {
    expect(parseKmaItem(kmaWeedInseason)).toEqual({ level: 0, status: 'ok' });
  });
  it('비시즌(실응답: body 없음 + resultCode 99) → level null, status offseason', () => {
    expect(parseKmaItem(kmaOffseason)).toEqual({ level: null, status: 'offseason' });
  });
  it('시즌 중 today 빈값 → status offseason', () => {
    expect(parseKmaItem({ response: { body: { items: { item: { today: '' } } } } }))
      .toEqual({ level: null, status: 'offseason' });
  });
  it('resultCode 99라도 제공기간 메시지가 아니면 error', () => {
    expect(parseKmaItem({ response: { header: { resultCode: '99', resultMsg: 'APPLICATION ERROR' } } }))
      .toEqual({ level: null, status: 'error' });
  });
  it('아이템 없음 → level null, status error', () => {
    expect(parseKmaItem({})).toEqual({ level: null, status: 'error' });
  });
  it('today:"2" → level 2 (변경 없음)', () => {
    expect(parseKmaItem({ response: { body: { items: { item: { today: '2' } } } } }))
      .toEqual({ level: 2, status: 'ok' });
  });
  it('today:"1.5" → level 2 (반올림)', () => {
    expect(parseKmaItem({ response: { body: { items: { item: { today: '1.5' } } } } }))
      .toEqual({ level: 2, status: 'ok' });
  });
});

describe('parseGoogleGrass', () => {
  it('UPI 3 → level 1 (접힘), status ok', () => {
    expect(parseGoogleGrass(googleGrass)).toEqual({ level: 1, status: 'ok' });
  });
  it('GRASS 없음 → status error', () => {
    const noGrass = { dailyInfo: [{ pollenTypeInfo: [{ code: 'TREE' }] }] };
    expect(parseGoogleGrass(noGrass)).toEqual({ level: null, status: 'error' });
  });
  it('GRASS는 있으나 indexInfo 없음 → status offseason', () => {
    const noIndex = { dailyInfo: [{ pollenTypeInfo: [{ code: 'GRASS', inSeason: false }] }] };
    expect(parseGoogleGrass(noIndex)).toEqual({ level: null, status: 'offseason' });
  });
  it('비시즌 실응답(2026-07-29 캡처: indexInfo·inSeason 자체 없음) → status offseason', () => {
    expect(parseGoogleGrass(googleGrassOffseason)).toEqual({ level: null, status: 'offseason' });
  });
});

describe('buildResponse', () => {
  it('4개 카테고리 통합 모델', () => {
    const out = buildResponse({
      region: '서울특별시 강남구',
      regionCode: '1168000000',
      oakJson: kmaOakInseason,
      pineJson: kmaPineInseason,
      weedJson: kmaOffseason,
      googleJson: googleGrass,
      updatedAt: '2026-07-26T06:00:00+09:00',
      kstDateStr: '2026-07-26',
    });
    expect(out.categories.map((c) => c.key)).toEqual(['oak', 'pine', 'weed', 'grass']);
    expect(out.regionCode).toBe('1168000000');
    expect(out.generatedForKstDate).toBe('2026-07-26');

    const oak = out.categories.find((c) => c.key === 'oak');
    expect(oak.level).toBe(2);
    expect(oak.status).toBe('ok');

    const weed = out.categories.find((c) => c.key === 'weed');
    expect(weed.status).toBe('offseason');

    const grass = out.categories.find((c) => c.key === 'grass');
    expect(grass.level).toBe(1);
  });
});
