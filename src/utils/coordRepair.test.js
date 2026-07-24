import { describe, it, expect } from 'vitest';
import { isInKorea, repairCoordinate, haversineKm } from './coordRepair.js';

describe('haversineKm', () => {
  it('같은 점은 0이다', () => {
    expect(haversineKm(37.5, 127.0, 37.5, 127.0)).toBe(0);
  });

  it('서울시청~강남역은 대략 7~10km다', () => {
    const d = haversineKm(37.5665, 126.9780, 37.4979, 127.0276);
    expect(d).toBeGreaterThan(7);
    expect(d).toBeLessThan(10);
  });
});

describe('isInKorea', () => {
  it('국내 좌표를 통과시킨다', () => {
    expect(isInKorea(37.5665, 126.9780)).toBe(true);  // 서울
    expect(isInKorea(33.4996, 126.5312)).toBe(true);  // 제주
  });

  it('국토 밖 좌표를 거른다', () => {
    expect(isInKorea(26.305441, 127.562409)).toBe(false); // 위도 오타
    expect(isInKorea(36.436397, 158.239748)).toBe(false); // 경도 오타
    expect(isInKorea(39.590401, 128.450201)).toBe(false); // 북한 이북
  });
});

describe('repairCoordinate — 실측 검증 케이스', () => {
  // docs/superpowers/specs/2026-07-24-data-audit.md 에서 확정 교정된 건들
  it('충북 옥천 가화길: 위도 26 → 36', () => {
    const r = repairCoordinate({
      badLat: '26.305441', badLng: '127.562409',
      anchorLat: 36.307305, anchorLng: 127.561457,
    });
    expect(r).not.toBeNull();
    expect(r.lat).toBeCloseTo(36.305441, 6);
    expect(r.field).toBe('lat');
    expect(r.distanceKm).toBeLessThan(1);
  });

  it('경북 상주: 경도 158 → 128', () => {
    const r = repairCoordinate({
      badLat: '36.436397', badLng: '158.239748',
      anchorLat: 36.435432, anchorLng: 128.246033,
    });
    expect(r).not.toBeNull();
    expect(r.lng).toBeCloseTo(128.239748, 6);
    expect(r.field).toBe('lng');
  });

  it('부산 동래구: 경도 120 → 129', () => {
    const r = repairCoordinate({
      badLat: '35.214684', badLng: '120.076932',
      anchorLat: 35.215517, anchorLng: 129.075001,
    });
    expect(r).not.toBeNull();
    expect(r.lng).toBeCloseTo(129.076932, 6);
  });
});

describe('repairCoordinate — 교정을 포기해야 하는 경우', () => {
  it('한 자리 치환으로 앵커 근처에 못 오면 null을 반환한다', () => {
    const r = repairCoordinate({
      badLat: '10.000000', badLng: '10.000000',
      anchorLat: 37.5, anchorLng: 127.0,
    });
    expect(r).toBeNull();
  });

  it('앵커 자체가 국토 밖이면 교정하지 않는다', () => {
    const r = repairCoordinate({
      badLat: '26.305441', badLng: '127.562409',
      anchorLat: 5.0, anchorLng: 5.0,
    });
    expect(r).toBeNull();
  });

  it('후보가 둘 이상이면 모호하므로 null을 반환한다', () => {
    // 경도 124.0은 한 자리만 바꿔도 125/126/127/128/129 다섯 개가 모두
    // 국내로 들어온다. 허용 반경을 넓히면 이들이 전부 후보가 되어 모호해진다.
    const r = repairCoordinate({
      badLat: '37.500000', badLng: '124.000000',
      anchorLat: 37.5, anchorLng: 127.0,
      maxDistanceKm: 2000,
    });
    expect(r).toBeNull();
  });

  it('같은 입력도 반경이 좁으면 후보가 하나로 좁혀져 교정된다', () => {
    // 위와 동일한 입력에 기본 반경(5km)을 쓰면 127.0만 남는다.
    // 앵커 근접성이 모호성을 걷어내는 장치임을 확인한다.
    const r = repairCoordinate({
      badLat: '37.500000', badLng: '124.000000',
      anchorLat: 37.5, anchorLng: 127.0,
    });
    expect(r).not.toBeNull();
    expect(r.lng).toBeCloseTo(127.0, 6);
  });

  it('이미 국내 좌표면 교정하지 않는다', () => {
    const r = repairCoordinate({
      badLat: '37.500000', badLng: '127.000000',
      anchorLat: 37.501, anchorLng: 127.001,
    });
    expect(r).toBeNull();
  });
});
