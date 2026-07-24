import { describe, it, expect } from 'vitest';
import { compareTimeline, compareRoadName } from './roadviewCheck.js';

describe('compareTimeline', () => {
  it('네이버가 실제로 주는 photodate 형식을 파싱한다', () => {
    // 실측값: naver.maps.Panorama#getLocation().photodate
    const r = compareTimeline({ photodate: '2026-04-14 14:06:41', referenceDate: '2025-06-30' });
    expect(r.pano).toBe('2026-04');
    expect(r.data).toBe('2025-06');
  });

  it('로드뷰가 더 최신이면 조사 이후 변경 가능성을 알린다', () => {
    const r = compareTimeline({ photodate: '2026-04-14 14:06:41', referenceDate: '2025-06-30' });
    expect(r.note).toContain('로드뷰가 데이터보다 최신');
  });

  it('데이터가 더 최신이면 촬영 이후 식재 가능성을 알린다', () => {
    const r = compareTimeline({ photodate: '2023-05-01 10:00:00', referenceDate: '2026-01-31' });
    expect(r.note).toContain('데이터가 로드뷰보다 최신');
  });

  it('같은 달이면 시점이 같다고 알린다', () => {
    const r = compareTimeline({ photodate: '2025-06-14 14:06:41', referenceDate: '2025-06-30' });
    expect(r.note).toContain('시점이 같습니다');
  });

  it('photodate가 없으면 null을 반환한다', () => {
    expect(compareTimeline({ photodate: null, referenceDate: '2025-06-30' })).toBeNull();
    expect(compareTimeline({ photodate: '', referenceDate: '2025-06-30' })).toBeNull();
  });

  it('기준일자가 없으면 촬영월만 주고 해설은 생략한다', () => {
    const r = compareTimeline({ photodate: '2026-04-14 14:06:41', referenceDate: '' });
    expect(r.pano).toBe('2026-04');
    expect(r.data).toBeNull();
    expect(r.note).toBeNull();
  });

  it('ISO 형식 기준일자도 파싱한다', () => {
    // 서울 소스의 referenceDate는 generatedAt(ISO)이 들어온다
    const r = compareTimeline({ photodate: '2026-04-14 14:06:41', referenceDate: '2026-04-12T06:16:24.422Z' });
    expect(r.data).toBe('2026-04');
    expect(r.note).toContain('시점이 같습니다');
  });
});

describe('compareRoadName', () => {
  it('한글 주소에 도로명이 있으면 일치로 본다', () => {
    const r = compareRoadName({ roadName: '테헤란로', address: '서울특별시 강남구 테헤란로 152' });
    expect(r.state).toBe('match');
  });

  it('한글 주소에 도로명이 없으면 불일치로 본다', () => {
    const r = compareRoadName({ roadName: '서해로', address: '경기도 화성시 향남읍 구문천리' });
    expect(r.state).toBe('mismatch');
    expect(r.road).toBe('서해로');
  });

  it('N번길 접미는 떼고 비교한다', () => {
    const r = compareRoadName({ roadName: '금강로59번길', address: '부산광역시 동래구 금강로 100' });
    expect(r.state).toBe('match');
  });

  it('로마자 주소는 판정하지 않는다', () => {
    // 브라우저 로케일에 따라 실제로 이렇게 온다 — 억지 비교는 오판을 만든다
    const r = compareRoadName({
      roadName: '세종대로',
      address: 'Taepyeongno 1(il)-ga, Jung-gu, Seoul',
    });
    expect(r.state).toBe('unknown');
    expect(r.romanized).toBe(true);
    expect(r.address).toBe('Taepyeongno 1(il)-ga, Jung-gu, Seoul');
  });

  it('도로명이 비어 있으면 판정하지 않는다', () => {
    // 원본 도로명이 '3', '6' 같은 무효값이면 정규화 단계에서 비워진다
    const r = compareRoadName({ roadName: '', address: '서울특별시 강남구 테헤란로 152' });
    expect(r.state).toBe('unknown');
  });

  it('주소가 없으면 판정하지 않는다', () => {
    expect(compareRoadName({ roadName: '테헤란로', address: null }).state).toBe('unknown');
  });

  it('한 글자 도로명은 오탐 위험이 커서 판정하지 않는다', () => {
    const r = compareRoadName({ roadName: '로', address: '서울특별시 강남구 테헤란로 152' });
    expect(r.state).toBe('unknown');
  });
});
