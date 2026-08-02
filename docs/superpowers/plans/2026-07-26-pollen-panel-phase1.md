# 오늘의 꽃가루 패널 (Phase 0 + Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 나무 지도 위에 GPS 기반 "오늘의 꽃가루" 패널을 추가한다 — 기상청 위험지수(참/솔/잡초, 0–3) + Google Pollen(잔디, UPI→0–3)을 서버리스 프록시로 병합해 보여준다.

**Architecture:** Vercel Serverless Function(`/api/pollen`)이 입력검증→좌표스냅→rate limit→Naver 역지오코딩→행정구역코드 매핑→Redis 캐시→기상청+Google 병렬 호출→통합 모델 반환을 담당한다. 프론트는 공용 `useGeolocation` 훅으로 좌표를 얻어 패널을 렌더링한다. 비공개 신규 키는 전부 서버 전용. 기존 나무 데이터 로딩(`api.js`)은 무수정.

**Tech Stack:** React 19, Vite 8, Vitest 4, Vercel Node functions(`@vercel/node@3`), `@upstash/redis`, `@upstash/ratelimit`, Naver Reverse Geocoding(gc), 기상청 꽃가루농도위험지수 3.0, Google Pollen API v1.

## Global Constraints

- 통일 척도: **0–3** (0 낮음 / 1 보통 / 2 높음 / 3 매우높음). 새 척도 발명 금지.
- Google UPI(0–5) → 접기: **`{0→0, 1→0, 2→1, 3→1, 4→2, 5→3}`**.
- 시간·날짜·캐시키·Cron은 전부 `Asia/Seoul`(UTC+9, DST 없음). Vercel 기본 UTC 주의.
- 한국 bbox: `lat 33.0–38.7`, `lng 124.5–132.0`. 밖이면 400.
- 캐시 키: `pollen:{regionCode}:{KST날짜}`. 좌표 원본 금지.
- 신규 서버 전용 env: `KMA_POLLEN_KEY`, `GOOGLE_POLLEN_KEY`, `NAVER_GEOCODE_ID/KEY`, `UPSTASH_REDIS_REST_URL/TOKEN`, `ALLOWED_ORIGINS`. 기존 `VITE_DATA_API_KEY`는 **삭제·개명 금지**(나무 지도가 `src/services/api.js:68`에서 사용).
- CORS: 프로덕션 도메인 + `*.vercel.app`(프리뷰). 단일 도메인 잠금 금지.
- data.go.kr 꽃가루 API 호스트는 `apis.data.go.kr`(기존 나무 API `api.data.go.kr`와 다름).
- 시즌 판정은 하드코딩 월 금지 — Phase 0에서 확정한 API 신호 사용.
- TDD, 잦은 커밋, DRY, YAGNI.

---

## Phase 0 — API 디스커버리 (Phase 1 게이트)

> Phase 0은 TDD가 아니라 **산출물 수집**이다. 아래 산출물이 나와야 Phase 1의 어댑터/매핑 파일을 작성할 수 있다. 산출물: 실 API 응답 fixture(JSON), `region-codes.json`, 확정 상수 문서.

### Task 0.1: 키 발급 및 API 활성화

**Files:**
- Modify: `.env` (로컬), `.env.example` (문서)

- [ ] **Step 1: data.go.kr 활용신청**
  - data.go.kr 로그인 → "기상청_꽃가루농도위험지수 조회서비스(3.0)"(데이터셋 15085289) 활용신청. 나무 API와 별개다.
  - 발급된 인증키를 `.env`에 `KMA_POLLEN_KEY=...`로 저장.
- [ ] **Step 2: Google Pollen API 키**
  - Google Cloud Console → 프로젝트 → "Pollen API" 사용 설정 → API 키 발급.
  - **예산·쿼터 캡(필수)**: 해당 키에 Pollen API "requests per day" 쿼터를 500/일로 설정. 결제 예산 알림 50/80/100% ($10) 설정.
  - `.env`에 `GOOGLE_POLLEN_KEY=...`.
- [ ] **Step 3: Naver Reverse Geocoding 활성화**
  - NCP Console → Maps → 기존 Application → **Reverse Geocoding** 서브 API 활성화 확인(기존은 정지오코딩만 켜져 있을 수 있음).
  - `.env`에 `NAVER_GEOCODE_ID`/`NAVER_GEOCODE_KEY`가 있는지 확인(기존 재사용).
- [ ] **Step 4: Upstash Redis**
  - Vercel Marketplace → Upstash → Redis DB 생성 → `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`을 `.env`에 저장.
- [ ] **Step 5: `.env.example` 갱신**
  - 위 신규 변수들을 값 없이 주석과 함께 추가. `KMA_POLLEN_KEY`가 나무용 `VITE_DATA_API_KEY`와 별도임을 주석 명기.
- [ ] **Step 6: 커밋**
  ```bash
  git add .env.example
  git commit -m "chore: 꽃가루 API 서버 전용 env 변수 문서화"
  ```

### Task 0.2: 실 API 응답 캡처 + region-codes.json 생성

**Files:**
- Create: `api/_lib/__fixtures__/kma-oak-inseason.json`, `kma-offseason.json`, `google-grass.json`, `naver-gc-gangnam.json`, `naver-gc-sejong.json`
- Create: `api/_lib/region-codes.json`
- Create: `docs/superpowers/notes/pollen-api-discovery.md`

- [ ] **Step 1: 기상청 3.0 실호출 (시즌 중/비시즌 각 1건)**
  - 임시 스크립트 또는 curl로 강남구 좌표 대응 지역코드에 대해 참나무·소나무·잡초류 응답을 받아 `kma-*.json`에 저장.
  - 요청 예: `https://apis.data.go.kr/1360000/PollenRiskFrcstInfoService/... ?serviceKey={KMA_POLLEN_KEY}&areaNo={code}&time={YYYYMMDD06}&type=json` (정확한 엔드포인트/파라미터는 데이터셋 문서 확인).
- [ ] **Step 2: 응답 구조 문서화**
  - `pollen-api-discovery.md`에: 응답 JSON 경로(예: `response.body.items.item[].oakPollenRiskIndex`), 값 범위(0–3), 다일 예보 필드(오늘/내일/모레), **비시즌 신호**(빈 값/`-`/null 중 무엇인지)를 기록.
- [ ] **Step 3: Google Pollen 실호출**
  - `POST https://pollen.googleapis.com/v1/forecast:lookup?key={GOOGLE_POLLEN_KEY}` body `{location:{latitude,longitude}, days:1}` (강남구 좌표). 응답을 `google-grass.json`에 저장.
  - 문서에: grass의 UPI 경로(예: `dailyInfo[0].plantInfo[]` 중 `code==="GRASS"`의 `indexInfo.value`), 값 범위(0–5) 기록.
- [ ] **Step 4: Naver 역지오코딩 실호출 (강남 + 세종)**
  - `GET https://maps.apigw.ntruss.com/map-reversegeocode/v2/gc?coords={lng},{lat}&output=json&orders=admcode,legalcode` 헤더 `x-ncp-apigw-api-key-id`/`x-ncp-apigw-api-key`. 강남/세종 각각 저장.
  - 문서에: `area1.name`/`area2.name` 경로, **세종 area2 공백 여부** 확인 기록.
- [ ] **Step 5: region-codes.json 생성**
  - 데이터셋 첨부 ZIP("행정구역코드 정보")을 받아 `{ "서울특별시|강남구": "1168000000", ... , "세종특별자치시|": "3611000000" }` 형태(복합키 `area1|area2`, 세종은 area2 빈 문자열)로 변환해 `region-codes.json`에 저장.
  - **조인 검증**: 강남/세종 Naver 응답의 `area1|area2`가 이 테이블 키와 정확히 일치하는지 확인. 불일치면 정규화 규칙(공백/접미사)을 문서에 명시.
- [ ] **Step 6: 커밋**
  ```bash
  git add api/_lib/__fixtures__ api/_lib/region-codes.json docs/superpowers/notes/pollen-api-discovery.md
  git commit -m "feat(pollen): Phase 0 — 실 API 응답 fixture + 행정구역코드 매핑"
  ```

**게이트:** 위 fixture와 문서의 확정 경로 없이는 Task 3(어댑터)를 시작하지 않는다.

---

## Phase 1 — 패널 + 프록시

### Task 1: Vercel 서버리스 부트스트랩 + vitest 분리

**Files:**
- Create: `vercel.json`, `vitest.workspace.js`, `api/health.js`, `api/health.test.js`
- Modify: `package.json`

**Interfaces:**
- Produces: `api/*.js`가 Vercel Node 함수로 인식됨. `vitest`가 `api/**`를 node 환경, `src/**`를 jsdom 환경으로 실행.

- [ ] **Step 1: 의존성 설치**
  ```bash
  npm i @upstash/redis @upstash/ratelimit
  npm i -D vercel
  ```
- [ ] **Step 2: `vercel.json` 작성**
  ```json
  {
    "functions": { "api/**/*.js": { "runtime": "@vercel/node@3" } }
  }
  ```
- [ ] **Step 3: `vitest.workspace.js` 작성**
  ```js
  export default [
    { test: { include: ['src/**/*.test.{js,jsx}'], environment: 'jsdom' } },
    { test: { include: ['api/**/*.test.js'], environment: 'node' } },
  ];
  ```
  (참고: 현재 `src` 테스트가 jsdom을 쓰는지 확인. 안 쓰면 기존 설정 유지하되 `api`용 node 프로젝트만 추가.)
- [ ] **Step 4: 실패 테스트 작성 — `api/health.test.js`**
  ```js
  import { describe, it, expect } from 'vitest';
  import handler from './health.js';

  function mockRes() {
    return { statusCode: 0, body: null,
      status(c){ this.statusCode = c; return this; },
      json(b){ this.body = b; return this; } };
  }

  describe('health', () => {
    it('200 ok 반환', async () => {
      const res = mockRes();
      await handler({ method: 'GET' }, res);
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ ok: true });
    });
  });
  ```
- [ ] **Step 5: 테스트 실패 확인**
  Run: `npx vitest run api/health.test.js`
  Expected: FAIL ("Cannot find module './health.js'").
- [ ] **Step 6: `api/health.js` 구현**
  ```js
  export default async function handler(req, res) {
    return res.status(200).json({ ok: true });
  }
  ```
- [ ] **Step 7: 테스트 통과 확인**
  Run: `npx vitest run api/health.test.js`
  Expected: PASS.
- [ ] **Step 8: `package.json` 스크립트 추가**
  - `"dev:api": "vercel dev"` 추가(로컬에서 `/api` 서빙). 기존 `"dev": "vite"`는 유지.
- [ ] **Step 9: 커밋**
  ```bash
  git add vercel.json vitest.workspace.js api/health.js api/health.test.js package.json package-lock.json
  git commit -m "chore(api): Vercel 서버리스 부트스트랩 + vitest node 환경 분리"
  ```

### Task 2: 순수 유틸 — 스케일/bbox/스냅/KST/캐시키

**Files:**
- Create: `api/_lib/pollen-core.js`, `api/_lib/pollen-core.test.js`

**Interfaces:**
- Produces:
  - `upiToLevel(upi: number): 0|1|2|3` — `{0:0,1:0,2:1,3:1,4:2,5:3}`, 범위 밖은 clamp.
  - `isInKorea(lat: number, lng: number): boolean`
  - `snapCoord(n: number): number` — 소수 2자리 반올림.
  - `kstDate(date: Date): string` — `YYYY-MM-DD` (Asia/Seoul).
  - `cacheKey(regionCode: string, kstDateStr: string): string` — `pollen:{regionCode}:{date}`.

- [ ] **Step 1: 실패 테스트 작성 — `api/_lib/pollen-core.test.js`**
  ```js
  import { describe, it, expect } from 'vitest';
  import { upiToLevel, isInKorea, snapCoord, kstDate, cacheKey } from './pollen-core.js';

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
  ```
- [ ] **Step 2: 실패 확인**
  Run: `npx vitest run api/_lib/pollen-core.test.js`
  Expected: FAIL (모듈 없음).
- [ ] **Step 3: 구현 — `api/_lib/pollen-core.js`**
  ```js
  const UPI_MAP = { 0: 0, 1: 0, 2: 1, 3: 1, 4: 2, 5: 3 };

  export function upiToLevel(upi) {
    if (upi <= 0) return 0;
    if (upi >= 5) return 3;
    return UPI_MAP[upi] ?? 0;
  }

  export function isInKorea(lat, lng) {
    return lat >= 33.0 && lat <= 38.7 && lng >= 124.5 && lng <= 132.0;
  }

  export function snapCoord(n) {
    return Math.round(n * 100) / 100;
  }

  export function kstDate(date) {
    // en-CA 로케일은 YYYY-MM-DD 포맷을 준다.
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(date);
  }

  export function cacheKey(regionCode, kstDateStr) {
    return `pollen:${regionCode}:${kstDateStr}`;
  }
  ```
- [ ] **Step 4: 통과 확인**
  Run: `npx vitest run api/_lib/pollen-core.test.js`
  Expected: PASS.
- [ ] **Step 5: 커밋**
  ```bash
  git add api/_lib/pollen-core.js api/_lib/pollen-core.test.js
  git commit -m "feat(pollen): 순수 유틸 — UPI 매핑/bbox/스냅/KST/캐시키"
  ```

### Task 3: 어댑터 — 기상청/Google 응답 → 통합 카테고리 (Phase 0 fixture 기반)

**Files:**
- Modify: `api/_lib/pollen-core.js`, `api/_lib/pollen-core.test.js`

**Interfaces:**
- Consumes: `upiToLevel`; Phase 0 fixture(`__fixtures__/*.json`)와 그 확정 경로.
- Produces:
  - `parseKma(kmaJson): { oak, pine, weed }` — 각 `{ level: 0-3|null, status: 'ok'|'offseason'|'error' }`.
  - `parseGoogleGrass(googleJson): { level: 0-3|null, status }`.
  - `buildResponse({ region, regionCode, kmaJson, googleJson, updatedAt, kstDateStr }): UnifiedModel` — 스펙 5의 통합 모델.

> **주의:** 아래 JSON 경로는 Phase 0 `pollen-api-discovery.md`에서 확정한 실제 경로로 교체한다. fixture를 import해 테스트한다.

- [ ] **Step 1: 실패 테스트 추가 (fixture 사용)**
  ```js
  import kmaOak from './__fixtures__/kma-oak-inseason.json';
  import kmaOff from './__fixtures__/kma-offseason.json';
  import googleGrass from './__fixtures__/google-grass.json';
  import { parseKma, parseGoogleGrass, buildResponse } from './pollen-core.js';

  describe('parseKma', () => {
    it('시즌 중 참나무 level 0-3', () => {
      const r = parseKma(kmaOak);
      expect(r.oak.status).toBe('ok');
      expect(r.oak.level).toBeGreaterThanOrEqual(0);
      expect(r.oak.level).toBeLessThanOrEqual(3);
    });
    it('비시즌은 offseason + level null', () => {
      const r = parseKma(kmaOff);
      expect(r.weed.status).toBe('offseason');
      expect(r.weed.level).toBeNull();
    });
  });

  describe('parseGoogleGrass', () => {
    it('UPI를 0-3으로 접음', () => {
      const r = parseGoogleGrass(googleGrass);
      expect([0,1,2,3, null]).toContain(r.level);
    });
  });

  describe('buildResponse', () => {
    it('4개 카테고리 통합 모델', () => {
      const out = buildResponse({
        region: '서울특별시 강남구', regionCode: '1168000000',
        kmaJson: kmaOak, googleJson: googleGrass,
        updatedAt: '2026-07-26T06:00:00+09:00', kstDateStr: '2026-07-26',
      });
      expect(out.categories.map(c => c.key)).toEqual(['oak','pine','weed','grass']);
      expect(out.regionCode).toBe('1168000000');
      expect(out.generatedForKstDate).toBe('2026-07-26');
    });
  });
  ```
- [ ] **Step 2: 실패 확인**
  Run: `npx vitest run api/_lib/pollen-core.test.js`
  Expected: FAIL (`parseKma` 미정의).
- [ ] **Step 3: 구현 (Phase 0 경로로 채움)**
  ```js
  // 아래 경로 상수는 Phase 0 discovery 문서에서 확정한 실제 값으로 교체.
  // 예시 구조 — 실제 응답에 맞춰 조정하되 반환 형태(level/status)는 고정.
  function kmaCategory(item, field) {
    if (!item) return { level: null, status: 'error' };
    const raw = item[field];
    // 비시즌 신호(Phase 0에서 확정): 빈 문자열/'-'/null 중 하나.
    if (raw === '' || raw === '-' || raw == null) return { level: null, status: 'offseason' };
    const level = Number(raw);
    if (Number.isNaN(level)) return { level: null, status: 'error' };
    return { level: Math.max(0, Math.min(3, level)), status: 'ok' };
  }

  export function parseKma(kmaJson) {
    const item = kmaJson?.response?.body?.items?.item?.[0]
      ?? kmaJson?.response?.body?.items?.item ?? null;
    return {
      oak:  kmaCategory(item, 'oakPollenRiskIndex'),
      pine: kmaCategory(item, 'pinePollenRiskIndex'),
      weed: kmaCategory(item, 'weedsPollenRiskIndex'),
    };
  }

  export function parseGoogleGrass(googleJson) {
    const plants = googleJson?.dailyInfo?.[0]?.plantInfo ?? [];
    const grass = plants.find((p) => p.code === 'GRASS');
    if (!grass || !grass.indexInfo || grass.indexInfo.value == null) {
      return { level: null, status: grass ? 'offseason' : 'error' };
    }
    return { level: upiToLevel(Number(grass.indexInfo.value)), status: 'ok' };
  }

  export function buildResponse({ region, regionCode, kmaJson, googleJson, updatedAt, kstDateStr }) {
    const kma = parseKma(kmaJson);
    const grass = parseGoogleGrass(googleJson);
    return {
      region, regionCode, updatedAt,
      categories: [
        { key: 'oak',   label: '참나무', ...kma.oak,  source: '기상청' },
        { key: 'pine',  label: '소나무', ...kma.pine, source: '기상청' },
        { key: 'weed',  label: '잡초류', ...kma.weed, source: '기상청' },
        { key: 'grass', label: '잔디',   ...grass,    source: 'Google' },
      ],
      disclaimer: '기상청 예보 위험지수 · 지역 단위 · 시즌제',
      generatedForKstDate: kstDateStr,
    };
  }
  ```
- [ ] **Step 4: 통과 확인**
  Run: `npx vitest run api/_lib/pollen-core.test.js`
  Expected: PASS. (실패 시 fixture 경로 vs 구현 경로 불일치 — Phase 0 문서 기준으로 맞춘다.)
- [ ] **Step 5: 커밋**
  ```bash
  git add api/_lib/pollen-core.js api/_lib/pollen-core.test.js
  git commit -m "feat(pollen): 기상청/Google 응답 → 통합 모델 어댑터"
  ```

### Task 4: 지역코드 매핑 (area1/area2 → code, 세종 폴백)

**Files:**
- Create: `api/_lib/region.js`, `api/_lib/region.test.js`

**Interfaces:**
- Consumes: `region-codes.json` (Phase 0).
- Produces:
  - `parseNaverGc(gcJson): { area1: string, area2: string }` — 세종 등 area2 없으면 `''`.
  - `lookupRegionCode(area1, area2): { regionCode: string|null, region: string }` — 복합키 `area1|area2`, 없으면 area1 단독(`area1|`) 폴백, 그래도 없으면 `null`.

- [ ] **Step 1: 실패 테스트 작성**
  ```js
  import { describe, it, expect } from 'vitest';
  import gcGangnam from './__fixtures__/naver-gc-gangnam.json';
  import gcSejong from './__fixtures__/naver-gc-sejong.json';
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
    it('세종 area1 단독 폴백', () => {
      expect(lookupRegionCode('세종특별자치시', '').regionCode).toBeTruthy();
    });
    it('미매칭은 null', () => {
      expect(lookupRegionCode('없는시', '없는구').regionCode).toBeNull();
    });
  });
  ```
- [ ] **Step 2: 실패 확인**
  Run: `npx vitest run api/_lib/region.test.js`
  Expected: FAIL.
- [ ] **Step 3: 구현 — `api/_lib/region.js`**
  ```js
  import codes from './region-codes.json' assert { type: 'json' };

  export function parseNaverGc(gcJson) {
    const region = gcJson?.results?.[0]?.region ?? {};
    return {
      area1: region.area1?.name ?? '',
      area2: region.area2?.name ?? '',
    };
  }

  export function lookupRegionCode(area1, area2) {
    const composite = `${area1}|${area2}`;
    const fallback = `${area1}|`;
    const regionCode = codes[composite] ?? codes[fallback] ?? null;
    const region = area2 ? `${area1} ${area2}` : area1;
    return { regionCode, region };
  }
  ```
  (`assert { type: 'json' }`가 Node 런타임에서 문제되면 `import`를 `createRequire`/`readFileSync`로 대체 — Phase 0에서 런타임 확인.)
- [ ] **Step 4: 통과 확인**
  Run: `npx vitest run api/_lib/region.test.js`
  Expected: PASS.
- [ ] **Step 5: 커밋**
  ```bash
  git add api/_lib/region.js api/_lib/region.test.js
  git commit -m "feat(pollen): 역지오코딩 파싱 + 행정구역코드 매핑(세종 폴백)"
  ```

### Task 5: Redis + rate limit + CORS 래퍼

**Files:**
- Create: `api/_lib/redis.js`, `api/_lib/ratelimit.js`, `api/_lib/http.js`, `api/_lib/http.test.js`

**Interfaces:**
- Produces:
  - `getRedis(): Redis | null` — env 없거나 실패 시 `null`(fail-open).
  - `limiter` — `@upstash/ratelimit` 인스턴스(또는 redis 없으면 no-op).
  - `resolveCors(origin: string): string|null` — 허용 오리진이면 그 값, 아니면 `null`.
  - `applyCors(req, res): boolean` — 허용이면 헤더 세팅 후 true, 아니면 403 응답 후 false.

- [ ] **Step 1: 실패 테스트 — `api/_lib/http.test.js`** (CORS 순수 로직만 테스트)
  ```js
  import { describe, it, expect } from 'vitest';
  import { resolveCors } from './http.js';

  describe('resolveCors', () => {
    it('프로덕션 도메인 허용', () => {
      process.env.ALLOWED_ORIGINS = 'https://pollen.example.com';
      expect(resolveCors('https://pollen.example.com')).toBe('https://pollen.example.com');
    });
    it('vercel 프리뷰 허용', () => {
      expect(resolveCors('https://pollen-map-abc123.vercel.app')).toBe('https://pollen-map-abc123.vercel.app');
    });
    it('타 도메인 거부', () => {
      expect(resolveCors('https://evil.com')).toBeNull();
    });
  });
  ```
- [ ] **Step 2: 실패 확인**
  Run: `npx vitest run api/_lib/http.test.js` → FAIL.
- [ ] **Step 3: 구현 — `api/_lib/http.js`**
  ```js
  export function resolveCors(origin) {
    if (!origin) return null;
    const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    if (allowed.includes(origin)) return origin;
    if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) return origin;
    return null;
  }

  export function applyCors(req, res) {
    const origin = resolveCors(req.headers?.origin);
    if (!origin) { res.status(403).json({ error: 'forbidden origin' }); return false; }
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    return true;
  }
  ```
- [ ] **Step 4: 통과 확인** → PASS.
- [ ] **Step 5: 구현 — `api/_lib/redis.js` (테스트 없음, env 의존)**
  ```js
  import { Redis } from '@upstash/redis';

  let client;
  export function getRedis() {
    if (client !== undefined) return client;
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    client = (url && token) ? new Redis({ url, token }) : null;
    return client;
  }
  ```
- [ ] **Step 6: 구현 — `api/_lib/ratelimit.js`**
  ```js
  import { Ratelimit } from '@upstash/ratelimit';
  import { getRedis } from './redis.js';

  let limiter;
  export function getLimiter() {
    if (limiter !== undefined) return limiter;
    const redis = getRedis();
    limiter = redis
      ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 m') })
      : null; // fail-open
    return limiter;
  }
  ```
- [ ] **Step 7: 커밋**
  ```bash
  git add api/_lib/redis.js api/_lib/ratelimit.js api/_lib/http.js api/_lib/http.test.js
  git commit -m "feat(pollen): Redis/ratelimit/CORS 래퍼 (fail-open)"
  ```

### Task 6: `/api/pollen` 핸들러 통합

**Files:**
- Create: `api/pollen.js`, `api/pollen.test.js`

**Interfaces:**
- Consumes: `pollen-core.js`, `region.js`, `redis.js`, `ratelimit.js`, `http.js`.
- 외부 fetch(Naver/기상청/Google)는 테스트에서 `vi.mock`으로 대체.

- [ ] **Step 1: 실패 테스트 — 검증 경로 위주**
  ```js
  import { describe, it, expect, vi, beforeEach } from 'vitest';

  function mockRes() {
    return { statusCode: 0, body: null, headers: {},
      status(c){ this.statusCode = c; return this; },
      json(b){ this.body = b; return this; },
      setHeader(k,v){ this.headers[k]=v; } };
  }
  const req = (query, origin='https://x.vercel.app') => ({ method:'GET', query, headers:{ origin } });

  beforeEach(() => { process.env.ALLOWED_ORIGINS = 'https://pollen.example.com'; });

  describe('/api/pollen 입력검증', () => {
    it('bbox 밖은 400', async () => {
      const { default: handler } = await import('./pollen.js');
      const res = mockRes();
      await handler(req({ lat:'35.68', lng:'139.69' }), res); // 도쿄
      expect(res.statusCode).toBe(400);
    });
    it('lat/lng 누락은 400', async () => {
      const { default: handler } = await import('./pollen.js');
      const res = mockRes();
      await handler(req({}), res);
      expect(res.statusCode).toBe(400);
    });
    it('허용 안된 오리진은 403', async () => {
      const { default: handler } = await import('./pollen.js');
      const res = mockRes();
      await handler(req({ lat:'37.5', lng:'127.0' }, 'https://evil.com'), res);
      expect(res.statusCode).toBe(403);
    });
  });
  ```
- [ ] **Step 2: 실패 확인** → FAIL.
- [ ] **Step 3: 구현 — `api/pollen.js`**
  ```js
  import { isInKorea, snapCoord, kstDate, cacheKey, buildResponse } from './_lib/pollen-core.js';
  import { parseNaverGc, lookupRegionCode } from './_lib/region.js';
  import { getRedis } from './_lib/redis.js';
  import { getLimiter } from './_lib/ratelimit.js';
  import { applyCors } from './_lib/http.js';

  async function fetchNaverGc(lat, lng) {
    const url = `https://maps.apigw.ntruss.com/map-reversegeocode/v2/gc?coords=${lng},${lat}&output=json&orders=admcode`;
    const r = await fetch(url, { headers: {
      'x-ncp-apigw-api-key-id': process.env.NAVER_GEOCODE_ID,
      'x-ncp-apigw-api-key': process.env.NAVER_GEOCODE_KEY,
    }});
    if (!r.ok) throw new Error(`naver gc ${r.status}`);
    return r.json();
  }
  async function fetchKma(regionCode, kstDateStr) {
    // 엔드포인트/파라미터는 Phase 0 discovery 문서 기준으로 확정.
    const base = 'https://apis.data.go.kr/1360000/PollenRiskFrcstInfoService';
    const url = `${base}/getOakPollenRiskFrcstInfo?serviceKey=${encodeURIComponent(process.env.KMA_POLLEN_KEY)}&areaNo=${regionCode}&time=${kstDateStr.replaceAll('-','')}06&dataType=JSON`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`kma ${r.status}`);
    return r.json();
  }
  async function fetchGoogle(lat, lng) {
    const url = `https://pollen.googleapis.com/v1/forecast:lookup?key=${process.env.GOOGLE_POLLEN_KEY}&location.latitude=${lat}&location.longitude=${lng}&days=1`;
    const r = await fetch(url, { method: 'GET' });
    if (!r.ok) throw new Error(`google ${r.status}`);
    return r.json();
  }

  export default async function handler(req, res) {
    if (!applyCors(req, res)) return;

    const lat = Number(req.query?.lat);
    const lng = Number(req.query?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isInKorea(lat, lng)) {
      return res.status(400).json({ error: 'invalid or out-of-area coordinates' });
    }

    const limiter = getLimiter();
    if (limiter) {
      const ip = (req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
      const { success } = await limiter.limit(ip);
      if (!success) return res.status(429).json({ error: 'too many requests' });
    }

    const sLat = snapCoord(lat), sLng = snapCoord(lng);
    let gc;
    try { gc = await fetchNaverGc(sLat, sLng); }
    catch { return res.status(502).json({ error: 'geocode failed' }); }

    const { area1, area2 } = parseNaverGc(gc);
    const { regionCode, region } = lookupRegionCode(area1, area2);
    if (!regionCode) return res.status(200).json({ region: region || '', regionCode: null, categories: [], status: 'unmapped' });

    const now = new Date();
    const kstDateStr = kstDate(now);
    const redis = getRedis();
    const key = cacheKey(regionCode, kstDateStr);
    if (redis) {
      const cached = await redis.get(key);
      if (cached) { res.setHeader('Cache-Control', 's-maxage=1800'); return res.status(200).json(cached); }
    }

    const [kmaR, googleR] = await Promise.allSettled([
      fetchKma(regionCode, kstDateStr),
      fetchGoogle(sLat, sLng),
    ]);
    const out = buildResponse({
      region, regionCode,
      kmaJson: kmaR.status === 'fulfilled' ? kmaR.value : null,
      googleJson: googleR.status === 'fulfilled' ? googleR.value : null,
      updatedAt: now.toISOString(),
      kstDateStr,
    });

    if (redis) {
      // 동적 TTL: 다음 06/18 KST 갱신까지 (간단화: 6시간).
      await redis.set(key, out, { ex: 6 * 3600 });
    }
    res.setHeader('Cache-Control', 's-maxage=1800');
    return res.status(200).json(out);
  }
  ```
- [ ] **Step 4: 통과 확인**
  Run: `npx vitest run api/pollen.test.js`
  Expected: PASS (검증 3케이스). 외부 호출 케이스는 `vercel dev`로 수동 확인.
- [ ] **Step 5: `vercel dev`로 수동 스모크 (선택)**
  Run: `npx vercel dev` → `curl 'http://localhost:3000/api/pollen?lat=37.5&lng=127.0' -H 'Origin: https://x.vercel.app'`
  Expected: 통합 JSON 또는 명확한 상태 코드.
- [ ] **Step 6: 커밋**
  ```bash
  git add api/pollen.js api/pollen.test.js
  git commit -m "feat(pollen): /api/pollen 핸들러 — 검증/CORS/ratelimit/캐시/병합"
  ```

### Task 7: `useGeolocation` 훅 추출 + Map.jsx 연동

**Files:**
- Create: `src/hooks/useGeolocation.js`, `src/hooks/useGeolocation.test.jsx`
- Modify: `src/components/Map.jsx` (geolocation 좌표 획득부만)

**Interfaces:**
- Produces: `useGeolocation(): { coords: {lat,lng}|null, accuracy, status: 'idle'|'locating'|'ok'|'denied'|'error', request: () => void }`.
- Map.jsx는 이 훅의 `request()`를 기존 GPS 버튼에 연결하고, `coords` 변화 시 기존 `placeLocationMarker` 호출.

> **주의:** 기존 Map.jsx의 GPS/IP 폴백 로직(대략 `performGeolocation`/`tryIpFallback`)을 훅으로 이동한다. 마커·서클 렌더링(`placeLocationMarker`)은 Map.jsx에 남긴다. 나무 데이터 로딩은 손대지 않는다.

- [ ] **Step 1: 실패 테스트 — `src/hooks/useGeolocation.test.jsx`**
  ```jsx
  import { describe, it, expect, vi, beforeEach } from 'vitest';
  import { renderHook, act, waitFor } from '@testing-library/react';
  import { useGeolocation } from './useGeolocation.js';

  beforeEach(() => {
    global.navigator.geolocation = {
      getCurrentPosition: vi.fn((ok) => ok({ coords: { latitude: 37.5, longitude: 127.0, accuracy: 20 } })),
    };
  });

  describe('useGeolocation', () => {
    it('초기 상태 idle', () => {
      const { result } = renderHook(() => useGeolocation());
      expect(result.current.status).toBe('idle');
      expect(result.current.coords).toBeNull();
    });
    it('request() 성공 시 coords 세팅', async () => {
      const { result } = renderHook(() => useGeolocation());
      act(() => result.current.request());
      await waitFor(() => expect(result.current.status).toBe('ok'));
      expect(result.current.coords).toEqual({ lat: 37.5, lng: 127.0 });
    });
  });
  ```
  (참고: `@testing-library/react`가 devDep에 없으면 `npm i -D @testing-library/react`. 없이 가려면 순수 함수로 분리 후 테스트.)
- [ ] **Step 2: 실패 확인** → FAIL.
- [ ] **Step 3: 구현 — `src/hooks/useGeolocation.js`**
  ```js
  import { useState, useCallback } from 'react';

  export function useGeolocation() {
    const [coords, setCoords] = useState(null);
    const [accuracy, setAccuracy] = useState(null);
    const [status, setStatus] = useState('idle');

    const request = useCallback(() => {
      if (!navigator.geolocation) { setStatus('error'); return; }
      setStatus('locating');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setAccuracy(pos.coords.accuracy);
          setStatus('ok');
        },
        (err) => { setStatus(err.code === 1 ? 'denied' : 'error'); },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
      );
    }, []);

    return { coords, accuracy, status, request };
  }
  ```
- [ ] **Step 4: 통과 확인** → PASS.
- [ ] **Step 5: Map.jsx 연동 (최소 수정)**
  - 기존 GPS 버튼 핸들러가 이 훅의 `request()`를 호출하도록 교체하고, `coords`가 생기면 `placeLocationMarker(coords.lat, coords.lng, accuracy, true)` 호출(`useEffect`). IP 폴백 로직은 훅에 통합하거나 Map에 잔존(현행 유지 시 회귀 테스트로 GPS 정상 확인).
  - **회귀 확인**: `npm run dev`로 지도 GPS 버튼이 여전히 동작하는지 수동 확인(기존 기능 무회귀).
- [ ] **Step 6: 커밋**
  ```bash
  git add src/hooks/useGeolocation.js src/hooks/useGeolocation.test.jsx src/components/Map.jsx
  git commit -m "refactor(map): geolocation 좌표 획득을 useGeolocation 훅으로 추출"
  ```

### Task 8: 프론트 서비스 래퍼 `pollen.js`

**Files:**
- Create: `src/services/pollen.js`, `src/services/pollen.test.js`

**Interfaces:**
- Produces: `fetchPollen(lat, lng): Promise<UnifiedModel>` — `/api/pollen?lat&lng` GET, 실패 시 throw.

- [ ] **Step 1: 실패 테스트**
  ```js
  import { describe, it, expect, vi } from 'vitest';
  import { fetchPollen } from './pollen.js';

  describe('fetchPollen', () => {
    it('성공 응답 반환', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ regionCode: '1168000000', categories: [] }) });
      const r = await fetchPollen(37.5, 127.0);
      expect(r.regionCode).toBe('1168000000');
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/pollen?lat=37.5&lng=127'));
    });
    it('실패 시 throw', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
      await expect(fetchPollen(37.5, 127.0)).rejects.toThrow();
    });
  });
  ```
- [ ] **Step 2: 실패 확인** → FAIL.
- [ ] **Step 3: 구현**
  ```js
  export async function fetchPollen(lat, lng) {
    const res = await fetch(`/api/pollen?lat=${lat}&lng=${lng}`);
    if (!res.ok) throw new Error(`pollen ${res.status}`);
    return res.json();
  }
  ```
- [ ] **Step 4: 통과 확인** → PASS.
- [ ] **Step 5: 커밋**
  ```bash
  git add src/services/pollen.js src/services/pollen.test.js
  git commit -m "feat(pollen): 프론트 fetch 래퍼"
  ```

### Task 9: `PollenPanel` 컴포넌트 + App 배치

**Files:**
- Create: `src/components/PollenPanel.jsx`, `src/components/PollenPanel.css`, `src/components/PollenPanel.test.jsx`
- Modify: `src/App.jsx` (배치 + 좌표 공유)

**Interfaces:**
- Consumes: `fetchPollen`, `useGeolocation`.
- Produces: `<PollenPanel coords={...} />` — 카테고리 카드 렌더. `coords` null이면 "내 위치" 안내.

- [ ] **Step 1: 실패 테스트 — 렌더링 분기**
  ```jsx
  import { describe, it, expect, vi } from 'vitest';
  import { render, screen, waitFor } from '@testing-library/react';
  import PollenPanel from './PollenPanel.jsx';

  vi.mock('../services/pollen.js', () => ({
    fetchPollen: vi.fn().mockResolvedValue({
      region: '서울특별시 강남구', regionCode: '1168000000',
      categories: [
        { key:'oak', label:'참나무', level:2, status:'ok', source:'기상청' },
        { key:'pine', label:'소나무', level:1, status:'ok', source:'기상청' },
        { key:'weed', label:'잡초류', level:null, status:'offseason', source:'기상청' },
        { key:'grass', label:'잔디', level:1, status:'ok', source:'Google' },
      ],
      disclaimer: '기상청 예보 위험지수 · 지역 단위 · 시즌제',
    }),
  }));

  describe('PollenPanel', () => {
    it('coords 있으면 카테고리 렌더', async () => {
      render(<PollenPanel coords={{ lat:37.5, lng:127.0 }} />);
      await waitFor(() => expect(screen.getByText('참나무')).toBeInTheDocument());
      expect(screen.getByText('잡초류')).toBeInTheDocument();
    });
    it('coords 없으면 위치 안내', () => {
      render(<PollenPanel coords={null} />);
      expect(screen.getByText(/내 위치/)).toBeInTheDocument();
    });
  });
  ```
- [ ] **Step 2: 실패 확인** → FAIL.
- [ ] **Step 3: 구현 — `PollenPanel.jsx`**
  ```jsx
  import { useEffect, useState } from 'react';
  import { fetchPollen } from '../services/pollen.js';
  import './PollenPanel.css';

  const LEVEL_LABEL = ['낮음', '보통', '높음', '매우높음'];
  const LEVEL_COLOR = ['#2ecc71', '#f1c40f', '#e67e22', '#e74c3c'];

  export default function PollenPanel({ coords }) {
    const [data, setData] = useState(null);
    const [error, setError] = useState(false);

    useEffect(() => {
      if (!coords) return;
      let alive = true;
      setError(false);
      fetchPollen(coords.lat, coords.lng)
        .then((d) => { if (alive) setData(d); })
        .catch(() => { if (alive) setError(true); });
      return () => { alive = false; };
    }, [coords]);

    if (!coords) return <div className="pollen-panel muted">내 위치를 눌러 오늘의 꽃가루를 확인하세요.</div>;
    if (error) return <div className="pollen-panel muted">일시적으로 불러올 수 없습니다.</div>;
    if (!data) return <div className="pollen-panel muted">불러오는 중…</div>;

    const cats = data.categories || [];
    const allOff = cats.length > 0 && cats.every((c) => c.status === 'offseason');
    if (allOff) return <div className="pollen-panel muted">현재는 주요 꽃가루 비시즌입니다.</div>;

    return (
      <div className="pollen-panel">
        <div className="pollen-region">{data.region} · 오늘의 꽃가루</div>
        <div className="pollen-cards">
          {cats.map((c) => (
            <div key={c.key} className="pollen-card">
              <span className="pollen-name">{c.label}</span>
              {c.status === 'ok' ? (
                <span className="pollen-level" style={{ background: LEVEL_COLOR[c.level] }}>
                  {LEVEL_LABEL[c.level]}
                </span>
              ) : (
                <span className="pollen-level off">{c.status === 'offseason' ? '비시즌' : '—'}</span>
              )}
            </div>
          ))}
        </div>
        <div className="pollen-disclaimer">{data.disclaimer}</div>
      </div>
    );
  }
  ```
- [ ] **Step 4: `PollenPanel.css` 작성** (간단한 가로 배너 스타일; 기존 톤 맞춤)
  ```css
  .pollen-panel { display:flex; flex-direction:column; gap:6px; padding:10px 14px; background:#fff; border-bottom:1px solid #eee; }
  .pollen-panel.muted { color:#888; font-size:14px; }
  .pollen-region { font-weight:600; font-size:14px; }
  .pollen-cards { display:flex; gap:8px; flex-wrap:wrap; }
  .pollen-card { display:flex; align-items:center; gap:6px; }
  .pollen-name { font-size:13px; }
  .pollen-level { color:#fff; font-size:12px; padding:2px 8px; border-radius:10px; }
  .pollen-level.off { background:#ccc; color:#666; }
  .pollen-disclaimer { font-size:11px; color:#999; }
  ```
- [ ] **Step 5: 통과 확인** → PASS.
- [ ] **Step 6: App.jsx 배치**
  - `App.jsx`에서 `useGeolocation` 사용, `app-body` 상단에 `<PollenPanel coords={coords} />` 삽입. Map에도 동일 좌표/`request` 전달(중복 권한 팝업 방지). 나무 데이터 로딩 로직은 무수정.
  - **회귀 확인**: `npm run dev`로 지도·나무 마커·GPS 정상 확인.
- [ ] **Step 7: 커밋**
  ```bash
  git add src/components/PollenPanel.jsx src/components/PollenPanel.css src/components/PollenPanel.test.jsx src/App.jsx
  git commit -m "feat(pollen): 오늘의 꽃가루 패널 + App 배치"
  ```

### Task 10: 배포 방어선 + 검증

**Files:**
- Modify: (설정만) Vercel Dashboard, Google Cloud Console

- [ ] **Step 1: 전체 테스트**
  Run: `npx vitest run`
  Expected: 전 스위트 PASS.
- [ ] **Step 2: 린트**
  Run: `npm run lint`
  Expected: 통과(신규 파일 포함).
- [ ] **Step 3: Vercel env 등록**
  - `KMA_POLLEN_KEY`, `GOOGLE_POLLEN_KEY`, `NAVER_GEOCODE_ID/KEY`, `UPSTASH_REDIS_REST_URL/TOKEN`, `ALLOWED_ORIGINS`(프로덕션 도메인)을 Vercel Dashboard에 등록. `VITE_DATA_API_KEY`는 기존대로 유지.
- [ ] **Step 4: 최종 방어선 확인**
  - Google Cloud: Pollen API 일일 쿼터(500/일) + 예산 알림 설정 확인.
  - Vercel: Spend Management 한도 확인.
- [ ] **Step 5: 프리뷰 배포 스모크**
  - PR 프리뷰에서 패널이 CORS 403 없이 로드되는지, bbox 밖 좌표 400, 정상 좌표 통합 JSON 확인.
- [ ] **Step 6: headless Playwright 수동 검증**
  - 실제/모의 좌표로 패널 표시 스크린샷 확보(기존 검증 관행).
- [ ] **Step 7: 커밋/머지**
  ```bash
  git add -A && git commit -m "chore(pollen): Phase 1 배포 방어선 설정 문서화"
  ```

---

## Self-Review 결과

- **스펙 커버리지**: 스펙 3(Phase 0)=Task 0.1/0.2, 4.1(프록시 순서)=Task 6, 4.2(패널)=Task 9, 5(스케일/모델)=Task 2/3, 6.1(KST)=Task 2, 6.2(훅)=Task 7, 6.3(캐시)=Task 2/6, 8(env)=Task 0.1/10, 9(의존성)=Task 1, 10(부트스트랩)=Task 1, 11(방어)=Task 5/6/10, 12(테스트)=전 태스크. **Phase 2(푸시)는 별도 계획으로 분리** — 이 계획 범위 밖.
- **플레이스홀더 스캔**: 어댑터(Task 3)·기상청 엔드포인트(Task 6)의 정확한 JSON 경로/URL은 **Phase 0 산출물로 확정**해 교체하도록 명시. 코드 골격과 반환 계약은 확정. 그 외 TBD 없음.
- **타입 일관성**: `upiToLevel`·`buildResponse`·`parseKma`·`parseNaverGc`·`lookupRegionCode`·`fetchPollen`·`useGeolocation` 반환 형태가 태스크 간 일치. 통일 척도 0–3, UPI `{3→1,4→2}` 매핑 전 구간 일관.

## 미해결 의존성
- Phase 0 게이트(Task 0.1/0.2)가 완료돼야 Task 3/6의 경로 상수를 확정할 수 있다. 키 발급이 선행 조건.
