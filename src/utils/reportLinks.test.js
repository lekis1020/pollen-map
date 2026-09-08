import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { buildReportContext, reportMailHref, reportGithubHref, reportXHref, X_MAX } from './reportLinks.js';

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
      sourceType: 'streetTree',
      count: 12,
      species: '은행나무',
      roadName: '테헤란로',
      city: '서울특별시',
      district: '강남구',
      representative: { latitude: 37.5228, longitude: 127.0202, institution: '강남구청' },
    };
    const ctx = buildReportContext(group);

    expect(ctx.coords).toEqual({ lat: 37.5228, lng: 127.0202 });
    expect(ctx.shown.join('\n')).toContain('구분: 가로수길');
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

describe('창구별 링크', () => {
  const ctx = buildReportContext({
    sourceType: 'seoulTree',
    sourceLabel: '서울 가로수 (개별)',
    roadName: '테헤란로', city: '서울특별시', district: '강남구',
    species: '은행나무', plantCount: 1,
    latitude: 37.522895, longitude: 127.020205,
    referenceDate: '2026-04-29',
  });

  it('메일 링크에 위치와 표시 정보를 본문으로 채운다', () => {
    const body = decodeURIComponent(reportMailHref(ctx).split('&body=')[1]);

    expect(body).toContain('좌표: 37.522895, 127.020205');
    expect(body).toContain('구분: 서울 가로수 (개별)');
    expect(body).toContain('무엇이 틀렸나요:');
  });

  it('GitHub 링크는 이슈 폼 템플릿을 지정하고 필드를 프리필한다', () => {
    const url = new URL(reportGithubHref(ctx));

    expect(url.pathname).toBe('/lekis1020/pollen-map/issues/new');
    expect(url.searchParams.get('template')).toBe('data-report.yml');
    expect(url.searchParams.get('location')).toContain('37.522895');
    expect(url.searchParams.get('shown')).toContain('은행나무');
    expect(url.searchParams.get('title')).toContain(ctx.headline);
  });

  // X는 String.length가 아니라 코드포인트 가중치 합으로 280자를 센다.
  // 대부분의 코드포인트(한글 음절 포함)는 가중치 2다. 여기서 앱 코드와
  // 별도로 그 규칙을 다시 계산해, 구현이 진짜로 X의 한도를 지키는지 본다.
  function xWeightedLength(text) {
    let total = 0;
    for (const ch of text) {
      const cp = ch.codePointAt(0);
      const light =
        (cp >= 0x0000 && cp <= 0x10ff) ||
        (cp >= 0x2000 && cp <= 0x200d) ||
        (cp >= 0x2010 && cp <= 0x201f) ||
        (cp >= 0x2032 && cp <= 0x2037);
      total += light ? 1 : 2;
    }
    return total;
  }

  // 280자(가중치 기준)를 넘기면 X가 본문을 통째로 버린다. 잘라서라도 링크는 살아야 한다.
  it('X 링크는 가중 글자수 280 안으로 자른다', () => {
    const long = buildReportContext({
      sourceType: 'streetTree',
      sourceLabel: '전국 가로수길',
      city: '강원특별자치도', district: '삼척시',
      roadName: '가'.repeat(300), species: '나'.repeat(300),
      latitude: 37.4, longitude: 129.1,
    });
    const text = decodeURIComponent(new URL(reportXHref(long)).searchParams.get('text'));

    expect(xWeightedLength(text)).toBeLessThanOrEqual(X_MAX);
    expect(text).toContain('37.4');   // 좌표는 잘려나가면 안 된다
  });

  // 공공데이터 원본에 &, 따옴표, # 이 그대로 들어 있다.
  // 인코딩이 깨지면 링크가 본문 중간에서 잘린다.
  it('특수문자가 든 값을 인코딩해 링크를 깨뜨리지 않는다', () => {
    const dirty = buildReportContext({
      sourceType: 'seoulTree',
      roadName: 'A&B "가로수" #1', city: '서울특별시', district: '중구',
      species: '느티나무', latitude: 37.5, longitude: 127.0,
    });

    const mail = reportMailHref(dirty);
    const gh = reportGithubHref(dirty);
    const x = reportXHref(dirty);

    for (const href of [mail, gh, x]) {
      expect(href).not.toContain(' ');
      expect(href).not.toContain('"');
    }
    expect(decodeURIComponent(mail)).toContain('A&B "가로수" #1');
    expect(decodeURIComponent(x)).toContain('A&B "가로수" #1');

    const ghUrl = new URL(gh);
    expect(ghUrl.searchParams.get('location')).toContain('A&B "가로수" #1');
  });
});
