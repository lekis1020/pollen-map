import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { buildReportContext, reportGithubHref } from './reportLinks.js';

const TEMPLATE = fileURLToPath(
  new URL('../../.github/ISSUE_TEMPLATE/data-report.yml', import.meta.url)
);

// GitHub은 존재하지 않는 필드 id를 조용히 무시한다. 오타가 나도 화면에는
// 아무 표시가 없고 프리필만 사라진다 — 그래서 여기서 대조한다.
// yaml 파서를 새로 넣지 않는다. 우리가 쓴 템플릿이고 형식이 단순하다.
describe('이슈 템플릿', () => {
  const raw = readFileSync(TEMPLATE, 'utf-8');
  const ids = [...raw.matchAll(/^\s+id:\s*(\S+)\s*$/gm)].map((m) => m[1]);

  it('프리필에 쓰는 필드 id가 템플릿에 모두 존재한다', () => {
    const url = new URL(reportGithubHref(buildReportContext({
      sourceType: 'seoulTree', city: '서울특별시', district: '강남구',
      roadName: '테헤란로', species: '은행나무',
      latitude: 37.5, longitude: 127.0,
    })));

    const prefilled = [...url.searchParams.keys()].filter(
      (k) => k !== 'template' && k !== 'title'
    );
    expect(prefilled.length).toBeGreaterThan(0);
    for (const key of prefilled) expect(ids).toContain(key);
  });

  it('라벨을 frontmatter에 둔다 — ?labels= 쿼리는 권한 없는 제보자에게 무시된다', () => {
    expect(raw).toMatch(/^labels:/m);
  });

  it('위치를 필수 입력으로 받는다 — 마커 없는 제보도 이 폼으로 온다', () => {
    expect(raw).toMatch(/id:\s*location[\s\S]*?required:\s*true/);
  });
});
