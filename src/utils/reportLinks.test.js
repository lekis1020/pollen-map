import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { buildReportContext } from './reportLinks.js';

// 손으로 만든 목은 실제 경로를 밟지 않는다. 실제 스냅샷에서 레코드를 꺼내 쓴다.
// (메모리 test-the-real-request-shape: 테스트 헬퍼 기본값이 5주 장애를 가렸다)
const DATA = fileURLToPath(new URL('../../public/data/', import.meta.url));
const readJson = (f) => JSON.parse(readFileSync(DATA + f, 'utf-8'));

// 7.4MB 파일을 모듈 스코프에서 한 번만 읽는다
const SEOUL = readJson('seoul-trees.json');

// 서울 컬럼형 스냅샷에서 i번째 그루를 화면 레코드 형태로 되살린다.
// src/services/api.js의 loadSeoulTrees와 같은 조립이다.
function seoulRecord(i) {
  const d = SEOUL;
  return {
    id: `st_${i}`,
    sourceType: 'seoulTree',
    sourceLabel: '서울 가로수 (개별)',
    roadName: d.dicts.road[d.road[i]],
    city: '서울특별시',
    district: d.dicts.gu[d.gu[i]],
    species: d.dicts.sp[d.sp[i]],
    plantCount: 1,
    latitude: d.lat[i],
    longitude: d.lng[i],
    institution: '',
    referenceDate: d.generatedAt || '',
  };
}

describe('buildReportContext', () => {
  it('서울 개별 가로수의 위치와 표시 정보를 뽑는다', () => {
    const ctx = buildReportContext(seoulRecord(0));

    expect(ctx.headline).toContain('서울특별시');
    expect(ctx.coords).toEqual({ lat: expect.any(Number), lng: expect.any(Number) });
    expect(ctx.location.join('\n')).toContain('좌표: ');
    expect(ctx.shown.join('\n')).toContain('구분: 서울 가로수 (개별)');
    expect(ctx.shown.join('\n')).toContain('수종: ');
  });

  it('명품숲은 도로명 대신 주소를 쓴다', () => {
    const forest = readJson('famous-forests.json').items[0];
    const ctx = buildReportContext({ ...forest, locationName: forest.name });

    expect(ctx.headline).toBe(forest.name);
    expect(ctx.location.join('\n')).toContain(`주소: ${forest.address}`);
    expect(ctx.location.join('\n')).not.toContain('도로명');
  });

  it('폴리라인 그룹은 대표 레코드에서 좌표를 가져온다', () => {
    const group = {
      count: 12,
      species: '은행나무',
      roadName: '테헤란로',
      city: '서울특별시',
      district: '강남구',
      representative: { latitude: 37.5228, longitude: 127.0202, institution: '강남구청' },
    };
    const ctx = buildReportContext(group);

    expect(ctx.coords).toEqual({ lat: 37.5228, lng: 127.0202 });
    expect(ctx.shown.join('\n')).toContain('식재본수: 12본');
  });

  // 도로명 칸이 숫자·기호뿐이라 sanitizeRoadName이 비운 레코드가 서울에만
  // 7,130그루 있다. 여기서 링크가 깨지면 그만큼이 제보 불가가 된다.
  it('도로명이 비어도 "미상"으로 채우고 깨지지 않는다', () => {
    const ctx = buildReportContext({ ...seoulRecord(0), roadName: '' });

    expect(ctx.headline).toContain('도로명 미상');
    expect(ctx.location.join('\n')).toContain('도로명: 미상');
  });

  it('좌표가 0이면 coords는 null이고 "미상"으로 표시한다', () => {
    const ctx = buildReportContext({ ...seoulRecord(0), latitude: 0, longitude: 0 });

    expect(ctx.coords).toBeNull();
    expect(ctx.location.join('\n')).toContain('좌표: 미상');
  });
});
