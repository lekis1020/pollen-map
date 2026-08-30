import { describe, it, expect } from 'vitest';
import { naverPanoramaUrl } from './naverLinks.js';

// 이 형식은 map.naver.com에서 실제 panoId로 열어 확인했다 (2026-08-30).
// p= 없이 c=만 주면 파노라마가 아니라 '거리뷰 선택 모드 지도'가 뜬다.
describe('naverPanoramaUrl', () => {
  const base = {
    panoId: '6_XH7ynPhSmJkdQrPCKLMA',
    lat: 37.5699122,
    lng: 126.9768465,
  };

  it('panoId와 좌표로 파노라마 딥링크를 만든다', () => {
    expect(naverPanoramaUrl(base)).toBe(
      'https://map.naver.com/p?c=126.9768465,37.5699122,17,0,0,0,adh' +
        '&p=6_XH7ynPhSmJkdQrPCKLMA,0,0,80,Float'
    );
  });

  // 사용자가 보던 방향 그대로 이어 봐야 '이어 보기'가 된다.
  it('현재 시점(pov)을 반영한다', () => {
    const url = naverPanoramaUrl({ ...base, pan: 123.456, tilt: -7.8, fov: 90.2 });
    expect(url).toContain('&p=6_XH7ynPhSmJkdQrPCKLMA,123,-8,90,Float');
  });

  // panoId를 못 얻은 경우까지 링크를 띄우면 엉뚱한 곳이 열린다.
  it('panoId가 없으면 null을 돌려준다', () => {
    expect(naverPanoramaUrl({ ...base, panoId: null })).toBeNull();
    expect(naverPanoramaUrl({ ...base, panoId: '' })).toBeNull();
  });

  it('좌표가 없으면 null을 돌려준다', () => {
    expect(naverPanoramaUrl({ panoId: 'abc', lat: null, lng: 127 })).toBeNull();
  });
});
