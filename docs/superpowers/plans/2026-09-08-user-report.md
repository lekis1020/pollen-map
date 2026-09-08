# 사용자 제보 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 지도에서 데이터 오류를 발견한 사용자가 메일·X·GitHub로 제보할 때, 위치와 표시된 정보가 자동으로 채워지게 한다.

**Architecture:** 순수 함수 모듈(`src/utils/reportLinks.js`)이 레코드를 받아 창구별 URL을 만든다. 팝업·로드뷰 모달은 그 URL을 `<a>`로 심기만 한다. 서버·저장소·상태를 추가하지 않는다.

**Tech Stack:** React 19 · Vite 8 · Vitest 4 · @testing-library/react · GitHub Issue Forms

**Spec:** `docs/superpowers/specs/2026-09-08-user-report-design.md`

## Global Constraints

- 커밋 메시지·주석·UI 문구는 **한국어**. "무엇을"보다 "왜"를 쓴다
- 팝업은 문자열 HTML로 조립된다. 데이터 값은 반드시 `escapeHtml`을 거친다 (`src/components/Map.jsx:12`)
- **URL 인코딩과 HTML 이스케이프를 섞지 않는다.** `reportLinks.js`는 URL만 만들고(`encodeURIComponent`), HTML 삽입 시점에 `escapeHtml`을 한 번 더 건다
- 원본 데이터 파일(`public/data/*.json`)은 읽기만 한다. 수정 금지
- 테스트는 **실제 데이터에서 뽑은 레코드**를 쓴다. 손으로 만든 목은 실제 경로를 밟지 않는다
- 지도 관련 브라우저 실측은 프로덕션에서만 가능하다(네이버 클라이언트 ID 도메인 잠금). PR 본문에 "브라우저 검증은 머지 후"를 명시한다
- 베이스라인: 235 테스트 / 21 파일 통과. 각 태스크 종료 시 이 수가 줄지 않아야 한다

## 설계 결정 하나 — 팝업 UI 형태

spec §4는 "`.report-btn`을 단다"고만 적었다. 구현 형태를 여기서 확정한다.

**버튼 + JS 리스너가 아니라 `<a>` 링크 세 개를 한 줄에 놓는다.**

- 네이버 InfoWindow는 내부 클릭의 **전파**를 끊지만 **기본 동작**은 막지 않는다. 순수 `<a href>`는 리스너 없이 그대로 동작한다 → `openInfoWindow`의 리스너 배선을 건드릴 필요가 없다
- 창구가 하나여선 안 된다. `ContactPanel.test.jsx`가 이미 그 이유를 고정해 두었다 — "일반 사용자는 GitHub 이슈를 발행하지 못한다". 그래서 X·메일·GitHub 셋을 같은 순서로 둔다
- `mailto:`에는 `target="_blank"`를 쓰지 않는다. 빈 탭이 남는다

---

## File Structure

| 파일 | 책임 |
|---|---|
| `src/utils/reportLinks.js` (신설) | 레코드 → 제보 문맥 → 창구별 URL. **순수 함수만.** DOM·React 의존 없음 |
| `src/utils/reportLinks.test.js` (신설) | 위 모듈의 단위 테스트. 실제 데이터 파일에서 레코드를 읽어 쓴다 |
| `src/data/contact.js` (수정) | `mailHref(suffix, body)`로 본문 인자 추가 |
| `.github/ISSUE_TEMPLATE/data-report.yml` (신설) | 제보 이슈 폼. 라벨을 frontmatter에 둔다 |
| `.github/ISSUE_TEMPLATE/config.yml` (신설) | 이슈 생성 화면에서 메일·X를 대체 창구로 안내 |
| `src/utils/issueTemplate.test.js` (신설) | 프리필 필드 id가 템플릿에 실제로 있는지 검증 |
| `src/components/Map.jsx` (수정) | 팝업 3종에 제보 줄 삽입 |
| `src/components/Map.css` (수정) | 제보 줄 스타일 |
| `src/components/StreetViewModal.jsx` (수정) | 하단 정보 바에 제보 링크 |
| `src/components/StreetViewModal.css` (수정) | 위 스타일 |
| `src/components/ContactPanel.jsx` (수정) | GitHub 링크를 이슈 템플릿으로 |

---

### Task 1: 제보 문맥 만들기 (`buildReportContext`)

레코드 한 건에서 "위치"와 "지도에 표시된 정보"를 뽑아 문자열 배열로 만든다. 창구가 셋이라 같은 재료를 세 번 만들지 않기 위해 문맥을 먼저 분리한다.

**Files:**
- Create: `src/utils/reportLinks.js`
- Create: `src/utils/reportLinks.test.js`

**Interfaces:**
- Consumes: 없음
- Produces:
  ```
  buildReportContext(item) → {
    headline: string,          // 제목 한 줄. 예 '서울특별시 강남구 테헤란로'
    location: string[],        // 예 ['좌표: 37.522895, 127.020205', '지역: ...', '도로명: ...']
    shown: string[],           // 예 ['구분: 서울 가로수 (개별)', '수종: 은행나무', ...]
    coords: { lat: number, lng: number } | null,
  }
  ```

레코드 형태는 셋이다. `sourceType`으로 갈린다.

| sourceType | 나오는 곳 | 좌표 |
|---|---|---|
| `seoulTree` · `streetTree` | 개별 마커 팝업 | `item.latitude` / `item.longitude` |
| `famousForest` | 명품숲 마커 팝업 | 같음 |
| (폴리라인 그룹) | 가로수길 구간 팝업 | 최상위에 없음 → `item.representative`에서 |

폴리라인 그룹은 `src/utils/groupByRoad.js:98-105`가 만든다: `{ path, count, species, roadName, city, district, representative }`. `sourceType`이 없고 `latitude`도 없다.

- [ ] **Step 0: 브랜치를 구현용으로 바꾼다**

spec 커밋이 `docs/user-report-design`에 있다. 코드가 같은 PR에 담기므로 이름을 맞춘다.

```bash
git branch -m docs/user-report-design feat/user-report
git status   # 워킹 트리가 clean인지 확인
```

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/utils/reportLinks.test.js`:

```js
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { buildReportContext } from './reportLinks.js';

// 손으로 만든 목은 실제 경로를 밟지 않는다. 실제 스냅샷에서 레코드를 꺼내 쓴다.
// (메모리 test-the-real-request-shape: 테스트 헬퍼 기본값이 5주 장애를 가렸다)
const DATA = fileURLToPath(new URL('../../public/data/', import.meta.url));
const readJson = (f) => JSON.parse(readFileSync(DATA + f, 'utf-8'));

// 서울 컬럼형 스냅샷에서 i번째 그루를 화면 레코드 형태로 되살린다.
// src/services/api.js의 loadSeoulTrees와 같은 조립이다.
function seoulRecord(i) {
  const d = readJson('seoul-trees.json');
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
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run src/utils/reportLinks.test.js`
Expected: FAIL — `Failed to resolve import "./reportLinks.js"`

- [ ] **Step 3: 최소 구현을 쓴다**

`src/utils/reportLinks.js`:

```js
/**
 * 제보 링크 생성.
 *
 * 사용자가 좌표를 손으로 옮겨 적어야 한다면 아무도 제보하지 않는다.
 * 그래서 지도가 아는 것은 전부 앱이 채워 보낸다.
 *
 * 이 모듈은 순수 함수만 둔다 — DOM도 React도 모른다. 팝업(문자열 HTML)과
 * 로드뷰 모달(JSX) 양쪽에서 같은 함수를 쓰기 위해서다.
 */

const UNKNOWN = '미상';

const SOURCE_LABEL = {
  streetTree: '전국 가로수길',
  seoulTree: '서울 가로수 (개별)',
  famousForest: '국유림 명품숲',
};

// 폴리라인 그룹은 최상위에 좌표가 없고 representative에만 있다
// (src/utils/groupByRoad.js). 0,0은 좌표 미상을 뜻하는 기존 관례다.
function coordsOf(item) {
  const src = Number.isFinite(item.latitude) ? item : item.representative;
  const lat = Number(src?.latitude);
  const lng = Number(src?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
}

export function buildReportContext(item) {
  const isForest = item.sourceType === 'famousForest';
  const coords = coordsOf(item);
  const road = (item.roadName || '').trim();

  const headline = isForest
    ? (item.locationName || item.name || UNKNOWN)
    : [item.city, item.district, road || '도로명 미상'].filter(Boolean).join(' ');

  const location = [`좌표: ${coords ? `${coords.lat}, ${coords.lng}` : UNKNOWN}`];
  if (isForest) {
    location.push(`주소: ${item.address || UNKNOWN}`);
  } else {
    const region = [item.city, item.district].filter(Boolean).join(' ');
    if (region) location.push(`지역: ${region}`);
    location.push(`도로명: ${road || UNKNOWN}`);
  }

  const shown = [
    `구분: ${item.sourceLabel || SOURCE_LABEL[item.sourceType] || '가로수길 구간'}`,
    `수종: ${item.species || UNKNOWN}`,
  ];
  if (isForest) {
    if (item.areaHa) shown.push(`면적: ${item.areaHa} ha`);
    if (item.management) shown.push(`관리기관: ${item.management}`);
  } else {
    // 폴리라인 그룹은 count, 개별 레코드는 plantCount를 쓴다.
    const count = item.count ?? item.plantCount;
    if (count > 0) shown.push(`식재본수: ${count.toLocaleString()}본`);
    const inst = item.institution || item.representative?.institution;
    if (inst) shown.push(`출처 기관: ${inst}`);
  }
  if (item.referenceDate) shown.push(`데이터 기준: ${item.referenceDate}`);

  return { headline, location, shown, coords };
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `npx vitest run src/utils/reportLinks.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: 커밋한다**

```bash
git add src/utils/reportLinks.js src/utils/reportLinks.test.js
git commit -m "feat(report): 레코드에서 제보 문맥을 뽑는 순수 함수

사용자가 좌표를 손으로 옮겨 적어야 한다면 아무도 제보하지 않는다.
창구가 셋이라 같은 재료를 세 번 만들지 않도록 문맥을 먼저 분리한다.
도로명이 비거나(서울 7,130그루) 좌표가 0인 실제 레코드에서 깨지지
않는지를 실제 스냅샷으로 검증한다."
```

---

### Task 2: 창구별 URL 만들기

**Files:**
- Modify: `src/utils/reportLinks.js`
- Modify: `src/utils/reportLinks.test.js`
- Modify: `src/data/contact.js`

**Interfaces:**
- Consumes: `buildReportContext(item) → { headline, location, shown, coords }` (Task 1)
- Produces:
  ```
  reportMailHref(ctx)    → string  // mailto:...?subject=...&body=...
  reportGithubHref(ctx)  → string  // https://github.com/.../issues/new?template=data-report.yml&...
  reportXHref(ctx)       → string  // https://x.com/intent/post?text=...
  mailHref(suffix, body) → string  // contact.js 확장. body는 선택
  ```
  GitHub 프리필에 쓰는 필드 id: `location`, `shown`, `source` — Task 3의 템플릿과 반드시 일치해야 한다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/utils/reportLinks.test.js` 하단에 덧붙인다:

```js
import { buildReportContext, reportMailHref, reportGithubHref, reportXHref, X_MAX } from './reportLinks.js';

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
  });

  // 280자를 넘기면 X가 본문을 통째로 버린다. 잘라서라도 링크는 살아야 한다.
  it('X 링크는 280자 안으로 자른다', () => {
    const long = buildReportContext({
      sourceType: 'streetTree',
      sourceLabel: '전국 가로수길',
      city: '강원특별자치도', district: '삼척시',
      roadName: '가'.repeat(300), species: '나'.repeat(300),
      latitude: 37.4, longitude: 129.1,
    });
    const text = decodeURIComponent(new URL(reportXHref(long)).searchParams.get('text'));

    expect(text.length).toBeLessThanOrEqual(X_MAX);
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

    for (const href of [reportMailHref(dirty), reportGithubHref(dirty), reportXHref(dirty)]) {
      expect(href).not.toContain(' ');
      expect(href).not.toContain('"');
      expect(decodeURIComponent(href)).toContain('A&B "가로수" #1');
    }
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run src/utils/reportLinks.test.js`
Expected: FAIL — `reportMailHref is not a function`

- [ ] **Step 3: 최소 구현을 쓴다**

`src/data/contact.js`의 `mailHref`를 본문까지 받게 바꾼다:

```js
/**
 * 받은 편지함에서 이 서비스 제보임을 바로 알아보려면 제목이 채워져 있어야 한다.
 * @param {string} [suffix] 제목 뒤에 붙일 맥락 (예: '데이터 로드 실패')
 * @param {string} [body] 본문. 제보 링크가 위치·표시 정보를 미리 채운다
 */
export function mailHref(suffix, body) {
  const subject = suffix
    ? `[식물 알레르기 지도] ${suffix}`
    : '[식물 알레르기 지도] 제보';
  const q = `subject=${encodeURIComponent(subject)}`;
  return body
    ? `mailto:${CONTACT_MAIL}?${q}&body=${encodeURIComponent(body)}`
    : `mailto:${CONTACT_MAIL}?${q}`;
}
```

`src/utils/reportLinks.js`에 덧붙인다:

```js
import { CONTACT_GITHUB_ISSUES, CONTACT_X_HANDLE, mailHref } from '../data/contact.js';

// X 본문 상한. 넘기면 인텐트가 본문을 통째로 버린다.
export const X_MAX = 280;

export function reportMailHref(ctx) {
  const body = [
    '■ 위치',
    ...ctx.location.map((l) => `  ${l}`),
    '',
    '■ 지도에 표시된 정보',
    ...ctx.shown.map((l) => `  ${l}`),
    '',
    '■ 제보 내용 (아래에 적어주세요)',
    '  무엇이 틀렸나요:',
    '  실제 정보:',
    '  (사진이 있으면 첨부해 주세요)',
    '',
  ].join('\n');

  return mailHref(`데이터 제보 — ${ctx.headline}`, body);
}

export function reportGithubHref(ctx) {
  // 필드 id는 .github/ISSUE_TEMPLATE/data-report.yml과 일치해야 한다.
  // 오타는 GitHub이 조용히 무시하므로 issueTemplate.test.js가 대조한다.
  const params = new URLSearchParams({
    template: 'data-report.yml',
    title: `[제보] ${ctx.headline}`,
    location: ctx.location.join('\n'),
    shown: ctx.shown.join('\n'),
  });
  return `${CONTACT_GITHUB_ISSUES}/new?${params}`;
}

export function reportXHref(ctx) {
  // 좌표가 잘려나가면 제보로서 쓸모가 없다. 그래서 좌표를 먼저 넣고
  // 뒤쪽(도로명·수종)부터 잘라낸다.
  const head = `${CONTACT_X_HANDLE} 지도 정보 오류 제보`;
  const coord = ctx.coords ? `\n좌표 ${ctx.coords.lat}, ${ctx.coords.lng}` : '';
  const tail = `\n${ctx.headline}\n${ctx.shown.join(' · ')}`;

  const fixed = head + coord;
  const room = X_MAX - fixed.length;
  const text = fixed + (room > 1 ? tail.slice(0, room) : '');

  return `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
}
```

`CONTACT_GITHUB_ISSUES`가 `https://github.com/lekis1020/pollen-map/issues`이므로 `${...}/new?`가 올바른 경로가 된다.

- [ ] **Step 4: 통과를 확인한다**

Run: `npx vitest run src/utils/reportLinks.test.js`
Expected: PASS (9 tests)

- [ ] **Step 5: 전체 테스트가 깨지지 않았는지 확인한다**

`mailHref`의 시그니처를 바꿨으므로 기존 호출부를 확인한다.

Run: `npm test`
Expected: 235 + 9 = 244 tests PASS

- [ ] **Step 6: 커밋한다**

```bash
git add src/utils/reportLinks.js src/utils/reportLinks.test.js src/data/contact.js
git commit -m "feat(report): 메일·X·GitHub 창구별 제보 링크 생성

세 창구가 받을 수 있는 모양이 서로 다르다. 메일은 본문 전체를, GitHub은
이슈 폼 필드를, X는 280자를 넘기면 본문을 통째로 버린다. X에서는 좌표를
먼저 넣고 뒤에서부터 잘라낸다 — 좌표가 없으면 제보로서 쓸모가 없다.

공공데이터 원본에 &·따옴표·#가 그대로 들어 있어 인코딩이 깨지면 링크가
중간에서 잘린다. 실제 값 모양으로 검증한다."
```

---

### Task 3: GitHub 이슈 템플릿과 ContactPanel 연결

템플릿과 프리필 필드 id는 함께 바뀌므로 한 태스크로 묶는다. `ContactPanel`의 GitHub 링크도 여기서 템플릿으로 향하게 한다.

**Files:**
- Create: `.github/ISSUE_TEMPLATE/data-report.yml`
- Create: `.github/ISSUE_TEMPLATE/config.yml`
- Create: `src/utils/issueTemplate.test.js`
- Modify: `src/components/ContactPanel.jsx`
- Modify: `src/components/ContactPanel.test.jsx`

**Interfaces:**
- Consumes: `reportGithubHref(ctx)` (Task 2) — 필드 id `location`, `shown`
- Produces: 이슈 템플릿 파일. 이후 태스크는 이 파일을 건드리지 않는다

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/utils/issueTemplate.test.js`:

```js
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
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run src/utils/issueTemplate.test.js`
Expected: FAIL — `ENOENT: no such file or directory ... data-report.yml`

- [ ] **Step 3: 템플릿을 만든다**

`.github/ISSUE_TEMPLATE/data-report.yml`:

```yaml
# 지도 데이터 오류 제보 폼.
# 필드 id는 src/utils/reportLinks.js의 reportGithubHref가 프리필에 쓴다.
# id를 바꾸면 src/utils/issueTemplate.test.js가 깨진다.
name: 데이터 제보
description: 지도의 나무 정보가 실제와 다를 때 알려주세요
title: '[제보] '
labels: [제보, 데이터]
body:
  - type: markdown
    attributes:
      value: |
        제보해 주셔서 감사합니다.

        - 제보는 **원본 공공데이터를 바꾸지 않습니다.** 확인 후 별도 교정 정보로 반영합니다
        - 반영 전 검토를 거치므로 바로 지도에 나타나지는 않습니다
        - 사진에 사람 얼굴이나 차량 번호판이 담기지 않도록 확인해 주세요

  - type: input
    id: location
    attributes:
      label: 위치
      description: 주소 또는 좌표. 지도 팝업에서 제보하면 자동으로 채워집니다
      placeholder: 서울특별시 강남구 테헤란로 / 또는 37.522895, 127.020205
    validations:
      required: true

  - type: dropdown
    id: kind
    attributes:
      label: 무엇이 틀렸나요
      options:
        - 수종이 다르다
        - 위치가 다르다
        - 여기에 나무가 없다
        - 나무가 있는데 지도에 없다
        - 기타
    validations:
      required: true

  - type: textarea
    id: actual
    attributes:
      label: 실제 정보
      description: 아는 만큼만 적어주세요. 확실하지 않은 부분은 비워두셔도 됩니다

  - type: textarea
    id: photo
    attributes:
      label: 사진
      description: 이 칸에 이미지를 끌어다 놓으면 첨부됩니다

  - type: textarea
    id: shown
    attributes:
      label: 지도에 표시된 정보
      description: 자동으로 채워집니다. 수정하지 않으셔도 됩니다
```

`.github/ISSUE_TEMPLATE/config.yml`:

```yaml
# GitHub 계정이 없는 이용자가 더 많다. 이슈만 두면 제보 길이 사실상 막힌다.
blank_issues_enabled: true
contact_links:
  - name: 메일로 제보
    url: mailto:lekis1020@gmail.com
    about: GitHub 계정 없이 제보하실 수 있습니다
  - name: X(트위터)로 제보
    url: https://x.com/lekis1020
    about: 사진과 함께 짧게 알려주셔도 됩니다
```

- [ ] **Step 4: 통과를 확인한다**

Run: `npx vitest run src/utils/issueTemplate.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: ContactPanel의 GitHub 링크를 템플릿으로 돌린다**

`src/components/ContactPanel.test.jsx`의 첫 테스트에서 GitHub href 기대값을 바꾼다:

```js
      'https://github.com/lekis1020/pollen-map/issues/new?template=data-report.yml',
```

`src/components/ContactPanel.jsx`의 GitHub `<a href>`를 바꾼다:

```jsx
          <a
            href={`${CONTACT_GITHUB_ISSUES}/new?template=data-report.yml`}
            target="_blank"
            rel="noopener noreferrer"
          >
```

`<span className="contact-value">`도 `이슈 등록` → `데이터 제보`로 바꾼다.

- [ ] **Step 6: 통과를 확인한다**

Run: `npm test`
Expected: 247 tests PASS

- [ ] **Step 7: 커밋한다**

```bash
git add .github/ISSUE_TEMPLATE src/utils/issueTemplate.test.js src/components/ContactPanel.jsx src/components/ContactPanel.test.jsx
git commit -m "feat(report): 데이터 제보 이슈 폼과 대체 창구 안내

라벨은 frontmatter에 둔다 — ?labels= 쿼리는 triage 권한이 없는 제보자에게
무시된다. 위치는 필수로 받는다. 마커 없는 제보(지도에 없는 나무)도 이 폼으로
들어오기 때문이다.

프리필 필드 id 오타는 GitHub이 조용히 무시해 화면에 아무 표시가 없다.
그래서 링크 생성기가 쓰는 id와 템플릿을 테스트로 대조한다."
```

---

### Task 4: 팝업 세 종류에 제보 줄 넣기

**Files:**
- Modify: `src/components/Map.jsx` (`buildMarkerInfo` · `buildFamousForestInfo` · `buildPolylineInfo`)
- Modify: `src/components/Map.css`
- Modify: `src/components/Map.test.jsx`

**Interfaces:**
- Consumes: `buildReportContext` · `reportMailHref` · `reportGithubHref` · `reportXHref` (Task 1·2)
- Produces: 팝업 HTML의 `.popup-report` 블록. Task 5는 이것과 무관하게 JSX로 따로 만든다

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/components/Map.test.jsx`에 덧붙인다. 기존 파일의 `installNaverMock`과 렌더 헬퍼를 그대로 쓴다.

```js
describe('제보 링크', () => {
  it('개별 가로수 팝업에 세 창구 링크가 X · 메일 · GitHub 순으로 들어간다', () => {
    // 기존 테스트와 같은 방식으로 마커를 클릭해 InfoWindow를 연다.
    const { infoWindows } = openMarkerPopup({
      id: 'st_0', sourceType: 'seoulTree', sourceLabel: '서울 가로수 (개별)',
      roadName: '테헤란로', city: '서울특별시', district: '강남구',
      species: '은행나무', plantCount: 1, latitude: 37.5228, longitude: 127.0202,
    });

    const links = [...infoWindows.at(-1).el.querySelectorAll('.popup-report a')];
    expect(links).toHaveLength(3);
    expect(links[0].getAttribute('href')).toContain('x.com/intent/post');
    expect(links[1].getAttribute('href')).toMatch(/^mailto:/);
    expect(links[2].getAttribute('href')).toContain('template=data-report.yml');
  });

  // 팝업은 문자열 HTML이다. 이스케이프가 빠지면 원본 데이터가 마크업이 된다.
  it('특수문자가 든 도로명이 링크와 마크업을 깨뜨리지 않는다', () => {
    const { infoWindows } = openMarkerPopup({
      id: 'st_1', sourceType: 'seoulTree',
      roadName: '"><img src=x> A&B', city: '서울특별시', district: '중구',
      species: '느티나무', latitude: 37.5, longitude: 127.0,
    });

    const el = infoWindows.at(-1).el;
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelectorAll('.popup-report a')).toHaveLength(3);
  });

  it('명품숲 팝업에도 제보 링크가 있다', () => {
    const { infoWindows } = openMarkerPopup({
      id: 'famousForest_0', sourceType: 'famousForest',
      locationName: '무왕리 낙엽송숲', address: '경기 양평군 지평면 무왕리 산143',
      species: '낙엽송', latitude: 37.441525, longitude: 127.670106,
    });

    expect(infoWindows.at(-1).el.querySelectorAll('.popup-report a')).toHaveLength(3);
  });
});
```

> 구현자 메모: `openMarkerPopup` 헬퍼가 기존 파일에 없으면, 기존 테스트가 마커 클릭을 발화시키는 방식(`listeners`에 기록된 `(대상, 타입)`을 찾아 호출)을 그대로 쓰는 헬퍼를 파일 상단에 만들어라. 기존 테스트를 고치지 말고 헬퍼만 추가한다.


- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run src/components/Map.test.jsx`
Expected: FAIL — `expected [] to have length 3`

- [ ] **Step 3: 팝업에 제보 줄을 넣는다**

`src/components/Map.jsx` 상단 import에 추가:

```js
import { buildReportContext, reportMailHref, reportGithubHref, reportXHref } from '../utils/reportLinks.js';
```

`escapeHtml` 아래에 공통 빌더를 둔다:

```js
// 제보 줄. 네 팝업이 공유한다.
//
// 버튼 + JS 리스너가 아니라 순수 <a>다. 네이버 InfoWindow는 내부 클릭의
// 전파를 끊지만 기본 동작은 막지 않아, 링크는 리스너 없이 그대로 열린다.
// mailto에는 target="_blank"를 쓰지 않는다 — 빈 탭이 남는다.
//
// 창구를 하나로 줄이지 않는다. 일반 이용자는 GitHub 이슈를 발행하지
// 못한다(ContactPanel.test.jsx가 같은 이유를 고정하고 있다).
function buildReportRow(item) {
  const ctx = buildReportContext(item);
  const links = [
    ['X', reportXHref(ctx), true],
    ['메일', reportMailHref(ctx), false],
    ['GitHub', reportGithubHref(ctx), true],
  ];
  const anchors = links.map(([label, href, external]) =>
    `<a href="${escapeHtml(href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${label}</a>`
  ).join('');

  return `<p class="popup-report"><span class="popup-report-label">이 정보가 틀렸나요?</span>${anchors}</p>`;
}
```

세 빌더의 `sourceNote` 바로 뒤(닫는 `</div>` 앞)에 `${buildReportRow(item)}`을 넣는다. 폴리라인 빌더는 인자명이 `pl`이므로 `${buildReportRow(pl)}`.

`src/components/Map.css`에 추가:

```css
/* 제보 줄. 팝업의 다른 정보보다 조용해야 하지만 눈에는 띄어야 한다. */
.popup-report {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0 0;
  padding-top: 8px;
  border-top: 1px solid #eceef1;
  font-size: 11px;
}
.popup-report-label { color: #8a9099; }
.popup-report a {
  color: #2f6fed;
  text-decoration: none;
}
.popup-report a:hover { text-decoration: underline; }
```

- [ ] **Step 4: 통과를 확인한다**

Run: `npm test`
Expected: 250 tests PASS

- [ ] **Step 5: lint를 확인한다**

Run: `npm run lint`
Expected: 0 errors / 0 warnings

- [ ] **Step 6: 커밋한다**

```bash
git add src/components/Map.jsx src/components/Map.css src/components/Map.test.jsx
git commit -m "feat(report): 팝업에서 바로 제보할 수 있게

버튼이 아니라 순수 <a>를 쓴다. 네이버 InfoWindow는 내부 클릭의 전파를
끊지만 기본 동작은 막지 않아, 링크는 리스너 배선 없이 그대로 열린다.

창구를 GitHub 하나로 줄이지 않는다. 일반 이용자는 이슈를 발행하지 못한다."
```

---

### Task 5: 로드뷰 모달에 제보 링크

로드뷰가 가장 중요한 진입점이다. "실제로 나무가 없다"를 발견하는 곳이 바로 여기다.

**Files:**
- Modify: `src/components/StreetViewModal.jsx` (하단 `street-view-info-bar`, 573행 부근)
- Modify: `src/components/StreetViewModal.css`
- Modify: `src/components/StreetViewModal.test.jsx`

**Interfaces:**
- Consumes: `buildReportContext` · `reportMailHref` · `reportGithubHref` · `reportXHref` (Task 1·2). `treeData` prop이 이미 레코드를 통째로 받고 있어 배선 추가가 없다
- Produces: 없음 (마지막 UI 태스크)

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/components/StreetViewModal.test.jsx`에 덧붙인다:

```js
describe('제보 링크', () => {
  it('보고 있는 지점 정보를 채운 제보 링크를 하단에 둔다', () => {
    renderModal({
      treeData: {
        sourceType: 'seoulTree', sourceLabel: '서울 가로수 (개별)',
        roadName: '테헤란로', city: '서울특별시', district: '강남구',
        species: '은행나무', latitude: 37.5228, longitude: 127.0202,
      },
    });

    const mail = screen.getByRole('link', { name: /메일로 제보/ });
    expect(decodeURIComponent(mail.getAttribute('href'))).toContain('좌표: 37.5228, 127.0202');
  });
});
```

> 구현자 메모: `renderModal` 헬퍼와 naver 목은 기존 파일에 있다. 없으면 기존 테스트가 쓰는 렌더 방식을 그대로 따른다.

- [ ] **Step 2: 실패를 확인한다**

Run: `npx vitest run src/components/StreetViewModal.test.jsx`
Expected: FAIL — `Unable to find an accessible element with the role "link" and name /메일로 제보/`

- [ ] **Step 3: 구현한다**

`src/components/StreetViewModal.jsx` import에 추가:

```js
import { buildReportContext, reportMailHref, reportGithubHref, reportXHref } from '../utils/reportLinks.js';
```

컴포넌트 본문 안(렌더 직전)에 문맥을 만든다:

```js
  // 로드뷰를 보다가 "여긴 나무가 없다"를 알게 되는 것이 가장 흔한 발견 경로다.
  const reportCtx = buildReportContext(treeData);
```

`street-view-info-bar` 블록의 `{externalPanoUrl && (...)}` 뒤에 넣는다:

```jsx
          <span className="sv-report">
            <span className="sv-report-label">정보가 다른가요?</span>
            <a href={reportXHref(reportCtx)} target="_blank" rel="noopener noreferrer">X로 제보</a>
            <a href={reportMailHref(reportCtx)}>메일로 제보</a>
            <a href={reportGithubHref(reportCtx)} target="_blank" rel="noopener noreferrer">GitHub로 제보</a>
          </span>
```

`src/components/StreetViewModal.css`에 추가:

```css
/* 제보 링크. 정보 바 오른쪽 끝, 네이버 지도 링크 다음에 온다. */
.sv-report {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  font-size: 12px;
}
.sv-report-label { opacity: 0.7; }
.sv-report a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
```

- [ ] **Step 4: 통과를 확인한다**

Run: `npm test`
Expected: 251 tests PASS

- [ ] **Step 5: lint · 빌드를 확인한다**

Run: `npm run lint && npm run build`
Expected: lint 0/0, 빌드 성공

- [ ] **Step 6: 커밋한다**

```bash
git add src/components/StreetViewModal.jsx src/components/StreetViewModal.css src/components/StreetViewModal.test.jsx
git commit -m "feat(report): 로드뷰에서 바로 제보할 수 있게

'여긴 나무가 없다'를 알게 되는 곳이 로드뷰다. treeData prop이 이미 레코드를
통째로 받고 있어 배선 추가 없이 위치 정보가 채워진다."
```

---

### Task 6: PR · 프로덕션 실측 · 네이버 지도 링크 확정

spec §9의 미확정 항목은 프로덕션에서만 확인할 수 있다.

**Files:**
- Modify: `src/utils/reportLinks.js` (실측 후 지도 링크 추가 — 형식이 확인된 경우에만)
- Modify: `src/utils/reportLinks.test.js`

- [ ] **Step 1: PR을 낸다**

```bash
git push -u origin feat/user-report
gh pr create --title "feat: 지도에서 바로 데이터 오류를 제보할 수 있게" --body "$(cat <<'BODY'
## 무엇을

지도 팝업과 로드뷰에서 메일·X·GitHub로 제보할 수 있게 한다. 위치와 표시된 정보는 앱이 채운다.

## 왜 앱 안에 폼·업로드를 만들지 않았나

설계: `docs/superpowers/specs/2026-09-08-user-report-design.md`

제보량이 0인 상태에서 업로드 파이프라인·파기 절차부터 만드는 것은 순서가 뒤바뀐다. 사진은 메일 첨부·이슈 첨부로 온다. 그 결과 파일 저장소도, 개인정보처리방침도 이 기능의 선행조건에서 빠졌다.

## 검증

| 항목 | 결과 |
|---|---|
| 테스트 | 235 → 251 |
| lint | 0 / 0 |
| 빌드 | 성공 |

**브라우저 검증은 머지 후** — 네이버 지도 클라이언트 ID가 프로덕션 도메인에만 등록돼 있어 프리뷰에서는 지도가 렌더되지 않는다.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
BODY
)"
```

- [ ] **Step 2: CI green을 확인한다**

Run: `gh pr checks --watch`
Expected: lint · test · build 전부 통과

- [ ] **Step 3: 머지·승격을 사용자에게 요청한다**

`gh pr merge`와 `vercel promote`는 auto mode classifier에 막힌다. 한 번 시도해 막히면 즉시 사용자에게 `! <명령>` 형태로 요청한다. 승격 없이는 프로덕션이 바뀌지 않는다.

- [ ] **Step 4: 프로덕션에서 실측한다**

`https://pollen-map-dun.vercel.app`에서 확인한다. 버스트 요청을 만들지 않는다 — WAF가 자기 IP를 8분 차단한다.

1. 번들 해시가 바뀌었는지 확인 (승격 반영 여부)
2. 개별 가로수 마커 클릭 → 팝업 하단 세 링크 확인
3. 메일 링크를 눌러 본문에 좌표·수종·기준일이 채워졌는지
4. GitHub 링크를 눌러 이슈 폼의 `위치`·`지도에 표시된 정보`가 채워졌는지 — **dropdown과 textarea 프리필이 실제로 동작하는지가 여기서 확정된다**
5. X 링크의 본문이 280자 안에서 잘렸는지
6. 가로수길 구간(폴리라인) · 명품숲 마커에서도 같은 확인
7. 로드뷰 모달 하단 제보 링크

- [ ] **Step 5: 네이버 일반 지도 URL 형식을 확정한다**

`map.naver.com`에서 좌표 하나를 열어 주소창 형식을 기록한다. `naverLinks.js`에 검증된 것은 파노라마 형식(`c=<lng>,<lat>,<zoom>,0,0,0,adh` + `p=`)뿐이다.

형식이 확인되면 `buildReportContext`의 반환에 `mapUrl`을 추가하고, `reportMailHref` 본문의 `■ 위치` 블록 끝에 `  지도: <url>` 한 줄을 넣는다. 테스트를 먼저 쓴다.

확인되지 않으면 **넣지 않는다.** 좌표 텍스트만으로도 검토는 가능하다.

- [ ] **Step 6: 실측 결과를 PR에 남기고 마무리한다**

실측한 값을 표로 PR에 덧붙인다. 4번에서 dropdown 프리필이 동작하지 않으면 그 사실을 spec §9에 기록한다.

---

## Self-Review

**Spec coverage:**

| spec 절 | 담당 태스크 |
|---|---|
| §2 원칙 (템플릿에 명시) | Task 3 (템플릿 markdown 블록) |
| §3 접근 — 서버·저장소 없음 | 전 태스크. 새 의존성·엔드포인트 0 |
| §4 진입점 (팝업 3종) | Task 4 |
| §4 진입점 (로드뷰 모달) | Task 5 |
| §4 진입점 (ContactPanel) | Task 3 Step 5 |
| §5 창구별 링크 · 인코딩 분리 | Task 1·2 |
| §5 네이버 지도 URL 실측 확정 | Task 6 Step 5 |
| §6 이슈 템플릿 · config.yml | Task 3 |
| §7 범위 밖 | 태스크 없음 (의도적) |
| §8 테스트 전략 전 항목 | Task 1·2(단위·결측·특수문자·280자), 3(템플릿 id), 4·5(팝업 렌더), 6(프로덕션) |
| §9 미확정 3건 | Task 6 Step 4·5 |

**타입 일관성:** `buildReportContext`의 반환 키(`headline` `location` `shown` `coords`)를 Task 2·4·5가 같은 이름으로 쓴다. GitHub 프리필 필드 id(`location` `shown`)는 Task 2가 만들고 Task 3의 템플릿이 정의하며 Task 3의 테스트가 대조한다.

**남은 위험:** GitHub Issue Forms의 dropdown 프리필 동작은 Task 6 Step 4에서만 확정된다. 동작하지 않아도 `location`·`shown`(input·textarea) 프리필은 별개로 살아 있어 기능이 무너지지는 않는다.
