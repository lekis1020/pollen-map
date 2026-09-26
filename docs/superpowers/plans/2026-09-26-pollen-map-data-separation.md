# Pollen Forecast and Plant Map Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the daily regional pollen forecast visible at the top of the page while clearly separating it from the plant location/species map, using the approved desktop C layout and mobile C3 disclosure.

**Architecture:** Move `PollenPanel` from the map column to a page-level slot between the header and `app-body`. Keep the existing pollen API contract, add a pure summary selector plus an accessible mobile disclosure, and add a React-owned plant-data label inside the map wrapper. CSS keeps desktop details always visible and collapses only the mobile presentation.

**Tech Stack:** React 19, CSS, Vitest 4, Testing Library, Vite 8

---

## File ownership

- `src/components/PollenPanel.test.jsx` — pollen summary, disclosure, state-copy tests.
- `src/App.test.jsx` — page hierarchy and error-isolation tests.
- `src/components/Map.test.jsx` — plant-data map label test.
- `src/components/PollenPanel.jsx` — forecast presentation and summary selection.
- `src/components/PollenPanel.css` — desktop C cards and mobile C3 disclosure.
- `src/App.jsx` — page-level panel placement.
- `src/App.css` — flex sizing for persistent panel plus map workspace.
- `src/components/Map.jsx` — semantic plant-data overlay.
- `src/components/Map.css` — map data-label styling.

No API, data-loader, filter, statistics, or dependency files change.

### Task 1: Pollen summary and responsive disclosure

**Files:**
- Modify: `src/components/PollenPanel.test.jsx`
- Modify: `src/components/PollenPanel.jsx`
- Modify: `src/components/PollenPanel.css`

- [ ] **Step 1: Write failing summary and disclosure tests**

Add tests that import `getPollenSummary` and prove the approved rules:

```jsx
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import PollenPanel, { getPollenSummary } from './PollenPanel.jsx';

it('가장 높은 정상 위험을 모바일 요약으로 고른다', () => {
  expect(getPollenSummary([
    { key: 'oak', label: '참나무', level: 1, status: 'ok' },
    { key: 'pine', label: '소나무', level: 3, status: 'ok' },
    { key: 'weed', label: '잡초류', level: 2, status: 'ok' },
  ])).toBe('소나무 매우높음');
});

it('동률이면 API 배열의 앞 항목을 유지한다', () => {
  expect(getPollenSummary([
    { key: 'oak', label: '참나무', level: 2, status: 'ok' },
    { key: 'pine', label: '소나무', level: 2, status: 'ok' },
  ])).toBe('참나무 높음');
});

it('모두 비시즌이면 단일 요약을 반환한다', () => {
  expect(getPollenSummary([
    { key: 'oak', label: '참나무', level: null, status: 'offseason' },
    { key: 'pine', label: '소나무', level: null, status: 'offseason' },
  ])).toBe('주요 꽃가루 비시즌');
});

it('정상 항목 없이 오류가 있으면 부분 실패를 알린다', () => {
  expect(getPollenSummary([
    { key: 'oak', label: '참나무', level: null, status: 'offseason' },
    { key: 'pine', label: '소나무', level: null, status: 'error' },
  ])).toBe('일부 정보를 불러올 수 없음');
});

it('모바일 상세 버튼이 접근성 상태와 상세 영역을 제어한다', async () => {
  pollenModule.fetchPollen.mockResolvedValueOnce(SUCCESS_DATA);
  render(<PollenPanel coords={{ lat: 37.5, lng: 127.0 }} />);
  const toggle = await screen.findByRole('button', { name: '꽃가루 상세 펼치기' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(toggle).toHaveAccessibleName('꽃가루 상세 접기');
});
```

Keep one shared `SUCCESS_DATA` fixture with `region`, `generatedForKstDate`, `disclaimer`, and all four categories so assertions test real rendered behavior rather than mock call counts.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npx vitest run src/components/PollenPanel.test.jsx
```

Expected: FAIL because `getPollenSummary` and the disclosure button do not exist.

- [ ] **Step 3: Implement the summary selector and accessible disclosure**

Implement these rules in `PollenPanel.jsx`:

```jsx
const LEVEL_LABEL = ['낮음', '보통', '높음', '매우높음'];

export function getPollenSummary(categories = []) {
  const active = categories.filter(
    (category) => category.status === 'ok' && Number.isInteger(category.level)
  );
  if (active.length > 0) {
    const highest = active.reduce(
      (best, category) => category.level > best.level ? category : best
    );
    return `${highest.label} ${LEVEL_LABEL[highest.level] ?? '정보 없음'}`;
  }
  if (categories.length > 0 && categories.every((category) => category.status === 'offseason')) {
    return '주요 꽃가루 비시즌';
  }
  if (categories.some((category) => category.status === 'error')) {
    return '일부 정보를 불러올 수 없음';
  }
  return '정보 없음';
}
```

The component must always return the same outer structure:

```jsx
<section className="pollen-panel" aria-labelledby="pollen-panel-title">
  <div className="pollen-summary-row">
    <div>
      <h2 id="pollen-panel-title">오늘의 꽃가루 위험지수</h2>
      <p className="pollen-source">기상청 예보 · 실시간 측정 아님 / 잔디: Google</p>
    </div>
    {/* region + summary or no-location/loading/error copy */}
    {data && (
      <button
        type="button"
        className="pollen-toggle"
        aria-expanded={expanded}
        aria-controls="pollen-details"
        aria-label={expanded ? '꽃가루 상세 접기' : '꽃가루 상세 펼치기'}
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? '⌃' : '⌄'}
      </button>
    )}
  </div>
  {data && (
    <div id="pollen-details" className={`pollen-details${expanded ? ' expanded' : ''}`}>
      {/* region card + four category cards + basis date */}
    </div>
  )}
</section>
```

Preserve the existing fetch lifecycle. Render `offseason` as `비시즌` and all other non-`ok` category states as `정보 없음`. Format `generatedForKstDate` by replacing `-` with `.`; do not invent an issue time.

In `PollenPanel.css`:

- use a white surface with a teal bottom border;
- render `.pollen-card-grid` as `grid-template-columns: 1.25fr repeat(4, minmax(0, 1fr))` above 768px;
- keep `.pollen-details` visible and `.pollen-toggle` hidden above 768px;
- at 768px and below, show the toggle, hide non-expanded details, and render expanded category cards as a 2×2 grid;
- preserve text labels in addition to risk colors;
- keep the outer panel present for no-location, loading, and error states.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
npx vitest run src/components/PollenPanel.test.jsx
```

Expected: all PollenPanel tests pass.

- [ ] **Step 5: Commit Task 1**

```bash
git add src/components/PollenPanel.jsx src/components/PollenPanel.css src/components/PollenPanel.test.jsx
git commit -m "feat(pollen): add responsive forecast dashboard"
```

### Task 2: Page hierarchy and plant-map identity

**Files:**
- Modify: `src/App.test.jsx`
- Modify: `src/App.jsx`
- Modify: `src/App.css`
- Modify: `src/components/Map.test.jsx`
- Modify: `src/components/Map.jsx`
- Modify: `src/components/Map.css`

- [ ] **Step 1: Write failing placement and identity tests**

In `App.test.jsx`, mock `PollenPanel` with a named region and assert DOM order:

```jsx
vi.mock('./components/PollenPanel.jsx', () => ({
  default: () => <section aria-label="오늘의 꽃가루 위험지수" data-testid="pollen-panel" />,
}));

it('꽃가루 예보를 지도 작업공간보다 앞에 둔다', () => {
  render(<App />);
  const panel = screen.getByTestId('pollen-panel');
  const body = screen.getByTestId('app-body');
  expect(panel.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
```

Add `data-testid="app-body"` to the intended app body in the implementation.

In `Map.test.jsx`, use the existing Naver map setup and add:

```jsx
it('지도 위에 식물 데이터의 성격을 명시한다', async () => {
  render(<Map data={[]} geo={idleGeo} />);
  expect(await screen.findByText('식물 위치·수종 지도')).toBeInTheDocument();
  expect(screen.getByText('지자체 등록 데이터 스냅샷')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
npx vitest run src/App.test.jsx src/components/Map.test.jsx
```

Expected: FAIL because the page hierarchy marker and plant-data label are missing.

- [ ] **Step 3: Move the panel and add the React-owned map label**

In `App.jsx`, render the panel directly after `</header>` and before `.app-body`:

```jsx
</header>
<PollenPanel coords={geo.coords} />
<div className="app-body" data-testid="app-body">
```

Remove the previous `PollenPanel` instance from `.main-content` so there is exactly one panel.

Keep `.app` as `height: 100vh` and ensure both `.app-body` and `.main-content` include `min-height: 0` so the map receives only the remaining viewport height.

In the React-owned `map-wrapper`, add before `.map-controls`:

```jsx
<div className="plant-map-label" aria-label="지도 데이터 안내">
  <strong>식물 위치·수종 지도</strong>
  <span>지자체 등록 데이터 스냅샷</span>
</div>
```

Style `.plant-map-label` as a top-left absolute white/opaque overlay with a border, 8px radius, readable slate text, and a z-index below modal/toast controls but above the map canvas. Set `pointer-events: none` so it cannot block map interaction.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
npx vitest run src/App.test.jsx src/components/Map.test.jsx
```

Expected: all App and Map tests pass.

- [ ] **Step 5: Run the full repository gate**

Run in order:

```bash
npm run lint
npm test
npm run build
```

Expected: ESLint exits 0; all Vitest files pass; Vite production build and PWA injection complete successfully. The known third-party `inlineDynamicImports` deprecation warning may remain, but no new warning is acceptable.

- [ ] **Step 6: Commit Task 2**

```bash
git add src/App.jsx src/App.css src/App.test.jsx src/components/Map.jsx src/components/Map.css src/components/Map.test.jsx
git commit -m "feat(ui): separate pollen forecast from plant map"
```

### Task 3: Independent review and final proof

**Files:**
- Inspect: all Task 1 and Task 2 files
- Compare against: `DESIGN.md`
- Compare against: `docs/superpowers/specs/2026-09-26-pollen-map-data-separation-design.md`

- [ ] **Step 1: Spec compliance review**

Confirm every acceptance criterion in the approved spec is present and no API/data-loader behavior or dependency was added. Any gap returns to the executor; the coordinator does not patch production code.

- [ ] **Step 2: Code quality review**

Review semantics, accessibility, responsive CSS, React state lifecycle, duplicate rendering, map pointer blocking, and unnecessary abstractions. Critical or important issues return to the executor and are reviewed again.

- [ ] **Step 3: Fresh verifier run**

Run:

```bash
npx vitest run src/components/PollenPanel.test.jsx src/App.test.jsx src/components/Map.test.jsx
npm run lint
npm test
npm run build
git diff --check HEAD~2..HEAD
git status --short
```

Expected: focused and full tests pass, lint/build exit 0, no whitespace errors, and the only untracked path is the local `.superpowers/` mockup directory.
