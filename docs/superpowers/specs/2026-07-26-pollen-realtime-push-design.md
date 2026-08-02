# 실시간 꽃가루 자료 + PWA 푸시 알림 — 설계 문서

- 작성일: 2026-07-26
- 개정: 2026-07-26 (rev2 — critic/harsh-critic 계획 검토 반영: BLOCKER 4 + MAJOR 6 + 갭 다수)
- 상태: 설계 승인 대기
- 대상 저장소: `pollen-map` (React 19 + Vite, Vercel 배포, 현재 순수 정적 — 서버리스 함수 없음)

## 1. 목표와 범위

가로수·수목 위치 지도인 기존 서비스에 **오늘의 꽃가루 정보**와 **꽃가루 알림(PWA 웹 푸시)**을 추가한다.

- 데이터 소스: **기상청 꽃가루농도위험지수 3.0**(참나무·소나무·잡초류) + **Google Pollen API**(잔디, 한국은 grass만 제공).
- UI: 상단 "오늘의 꽃가루" 패널. GPS 자동 조회 + 구독 지역 저장.
- 알림: 앱이 닫혀 있어도 수신되는 PWA 웹 푸시.
- 인프라: **Vercel Serverless Functions + Upstash Redis + Vercel Cron** (플랫폼 단일화). 이 프로젝트에 **처음 도입되는 백엔드**다.

### 단계화

- **Phase 0** — API 디스커버리 스파이크. 인증키 발급 후 실호출로 응답 구조·행정구역코드·시즌 신호를 확정. **Phase 1 착수의 게이트.** (아래 3.)
- **Phase 1** — 오늘의 꽃가루 패널 + `/api/pollen` 프록시 + 보안·과금 방어 + 서버리스 부트스트랩. 독립 배포·검증.
- **Phase 2** — PWA + 웹 푸시(구독/Cron/발송) + iOS 대응. 독립 배포·검증.

### 설계 원칙 (rev2: "무수정" 범위 명확화)

- 꽃가루 기능은 **기존 나무 데이터 로딩 로직과 독립**. `src/services/api.js`·`dataSources.js`·`normalizers.js`(나무 데이터 파이프라인)는 **무수정**.
- 단, **GPS 좌표 획득 로직은 공용 훅으로 추출**한다(아래 6.2 결정). 따라서 `Map.jsx`·`App.jsx`는 **geolocation 부분만** 최소 수정된다. "Map.jsx 전체 무수정"은 rev1의 오류였고, 좌표가 `Map.jsx` 내부에 갇혀 있어 PollenPanel이 재사용할 수 없기 때문이다.
- **모든 비공개 키는 서버리스 함수 안에** (신규 키 한정). 기존 클라이언트 키(`VITE_DATA_API_KEY`, Naver `ncpKeyId`)는 하위호환을 위해 유지한다(아래 8, 9).
- 꽃가루 기능이 실패해도 지도는 정상 동작.
- 데이터는 **예보 위험지수**임을 UI에서 정직하게 표기(기존 disclaimer 정책과 일치).

## 2. 아키텍처

```
[브라우저]                         [Vercel Serverless]              [외부]
 PollenPanel  ── GET /api/pollen?lat&lng ──▶  입력검증·bbox·스냅·ratelimit
   │(useGeolocation 훅)                        ├─ reverse-geocode(Naver, gc)
   ▲                                           ├─ region-code 매핑
   │                                           ├─ (캐시 조회)
   │                                           ├─ 기상청 위험지수(참/솔/잡초, 0–3)
   └──────── 통합 JSON ◀────────────────────────┤─ Google Pollen(잔디, UPI→0–3)
                                               └─ Redis 캐시(지역코드 키, 동적 TTL)

 [Phase 2]
 구독 버튼 ── POST /api/subscribe ──▶ 검증·ratelimit·dedup ─▶ Upstash Redis(양방향 인덱스)
 서비스워커(sw.js, injectManifest) — push / notificationclick 처리
 [Vercel Cron, KST 오전] ─▶ /api/cron/pollen-alerts (CRON_SECRET 검증)
     지역별 지수 조회 → 임계 초과 지역만 fan-out 발송(VAPID) → 410/404 시 Redis 삭제
```

### 신규/수정 파일

| 경로 | 내용 |
|---|---|
| `api/pollen.js` | 프록시 엔드포인트 (Phase 1) |
| `api/_lib/pollen-core.js` | 병합·스케일·시즌·캐시 로직 (순수 함수, 테스트 대상) |
| `api/_lib/region-codes.json` | 기상청 행정구역코드 매핑 (Phase 0 산출물) |
| `api/_lib/ratelimit.js`, `api/_lib/redis.js` | Upstash 래퍼 |
| `src/hooks/useGeolocation.js` | **신규** 공용 좌표 획득 훅 (GPS + IP 폴백, 지도 렌더링 없음) |
| `src/components/Map.jsx` | geolocation 부분만 훅 사용하도록 최소 수정 |
| `src/App.jsx` | PollenPanel 배치 + 좌표 공유 최소 수정 |
| `src/services/pollen.js` | 프론트 fetch 래퍼 |
| `src/components/PollenPanel.jsx`, `.css` | 오늘의 꽃가루 패널 |
| `vercel.json` | 함수 런타임 설정 (Phase 1), Cron (Phase 2) |
| `vitest.workspace.js` | jsdom(src) + node(api) 분리 |
| `api/subscribe.js`, `api/unsubscribe.js` | 구독/해지 (Phase 2) |
| `api/cron/pollen-alerts.js`, `api/send-region-pushes.js` | Cron + fan-out (Phase 2) |
| `src/sw.js` | 커스텀 서비스워커 (Phase 2, injectManifest) |
| `public/manifest.webmanifest` | PWA manifest (Phase 2) |
| `src/components/PushSubscribe.jsx` | 구독 UI + 동의 고지 (Phase 2) |
| `public/privacy.html` | 개인정보처리방침 (Phase 2) |

## 3. Phase 0 — API 디스커버리 스파이크 (Phase 1 게이트)

rev1의 "Section 10 나중에 확인" 항목은 실제로는 착수 전제다. `pollen-core.js`와 `region-codes.json`은 아래가 없으면 작성 불가능하다. **인증키 발급 후 실호출로 다음을 확정하고 문서화한다.**

1. **data.go.kr 활용신청** — "기상청_꽃가루농도위험지수 3.0"은 나무 API와 **별도 신청**. 호스트도 다름(`apis.data.go.kr` vs 기존 `api.data.go.kr`). 동일 계정 키 사용 가능 여부 확인.
2. **기상청 3.0 응답 구조** — 실호출로 필드명, 4단계 값(0–3), 다일 예보 구조, **비시즌 신호**(빈 배열 / null / 명시 코드)를 확정. 시즌 판정 로직은 이 신호에 맞춰 구현.
3. **Google Pollen `forecast:lookup`** — 한국 grass 반환 필드·plant code, UPI 범위, 요청 형식(`POST https://pollen.googleapis.com/v1/forecast:lookup?key=...`, `location.latitude/longitude`, `days`) 확정.
4. **Naver Reverse Geocoding(gc)** — NCP 콘솔에서 **Reverse Geocoding 서브 API 활성화 확인**(기존 정지오코딩과 별개). 응답의 `results[].region.area1.name`/`area2.name` 추출 경로, 세종시 area2 공백 동작, 쿼터 확인.
5. **매핑 조인 검증** — 같은 좌표에 대해 Naver `area2.name`과 기상청 행정구역코드 테이블의 명칭이 실제로 조인되는지 확인(포맷 불일치가 최대 리스크). `region-codes.json` 생성.

**산출물:** 응답 구조 문서 + `region-codes.json` + 확정된 상수(스케일 매핑, 시즌 신호). 이게 나와야 Phase 1을 시작한다.

## 4. Phase 1 — `GET /api/pollen?lat&lng`

### 4.1 처리 순서 (rev2: 순서 수정 — regionCode 산출 후 캐시 조회)

1. **입력 검증** — `lat`/`lng` 유한 숫자 + 한국 bbox(`33.0–38.7`, `124.5–132.0`). 벗어나면 `400`.
2. **CORS** — 아래 8의 다중 오리진 정책. 불허 오리진은 `403`.
3. **좌표 스냅** — 소수 2자리(~1km). 목적은 **캐시 우회 방지가 아니라**(캐시 키는 지역코드) 역지오코딩·Google 호출의 distinct 입력 수를 줄이는 비용 최적화 + 공격자가 한 지역에서 강제할 수 있는 업스트림 요청 수 제한.
4. **rate limit** — `@upstash/ratelimit` IP당 10req/분(초과 `429`) + 전역 일일 상한(Google 업스트림 카운터, 예: 300/일).
5. **역지오코딩(Naver gc)** — 스냅 좌표 → `area1` + `area2`. **area2 공백(세종 등)이면 area1 단독** 경로.
6. **지역코드 매핑** — `(area1, area2)` 복합키로 `region-codes.json` 조회. 실패 시 경고 로그 + `status:"unmapped"`.
7. **캐시 조회** — `pollen:{regionCode}:{KST날짜}`로 Redis 확인. 히트 시 즉시 반환.
8. **업스트림 병렬 호출**(`Promise.allSettled`): 기상청(참/솔/잡초) + Google Pollen(잔디).
9. **정규화·병합** — 아래 5의 통합 모델.
10. **캐시 저장** — 동적 TTL(다음 06/18 KST 갱신 시각까지). HTTP `Cache-Control: s-maxage`도 설정해 Vercel CDN 캐시 활용.
11. **응답**.

### 4.2 프론트 `PollenPanel.jsx`

- **배치** — `App.jsx`의 `app-body` 상단(지도 위). 헤더 아래 가로 배너.
- **좌표** — 공용 `useGeolocation` 훅(6.2)에서 lat/lng 수신 → `/api/pollen` 호출. GPS 거부/실패 시 IP·선택지역 폴백.
- **권한 UX** — 자동 위치 요청이 첫 방문 즉시 권한 팝업을 띄우지 않도록, 기본은 IP 근사 → 사용자가 "내 위치" 누를 때 정밀 GPS(기존 Map GPS 버튼과 동일 권한 공유).
- 4개 카테고리 카드(참/솔/잡초/잔디)를 **0–3 색상/라벨**로 표시. 비시즌은 "비시즌", 부분 실패는 출처와 함께 표시.
- **비시즌 전체(겨울) UX** — 4개 모두 offseason이면 카드를 나열하지 않고 "현재는 주요 꽃가루 비시즌입니다(다음 시즌 안내)" 단일 메시지로 축약.
- 패널 자체 실패는 "일시적으로 불러올 수 없음", 지도 무영향.
- disclaimer: "기상청 예보 위험지수 · 지역 단위 · 시즌제 / 잔디는 Google 예보 기준".

## 5. 통합 데이터 모델과 스케일

**통일 척도는 기상청 native 0–3.**

| level | 라벨 |
|---|---|
| 0 | 낮음 | 1 | 보통 | 2 | 높음 | 3 | 매우높음 |

- 기상청: 그대로(0–3).
- **Google UPI(0–5) → 접기: `{0→0, 1→0, 2→1, 3→1, 4→2, 5→3}`** (rev2 수정). 근거: Low+Moderate를 보통으로 묶고 High↔높음, Very High↔매우높음을 1:1 정렬. rev1의 `{4,5→3}`은 잔디를 한 단계 과대경보했다.

```jsonc
{
  "region": "서울특별시 강남구",
  "regionCode": "1168000000",
  "updatedAt": "2026-07-26T06:00:00+09:00",
  "categories": [
    { "key": "oak",   "label": "참나무", "level": 2,    "source": "기상청", "status": "ok" },
    { "key": "pine",  "label": "소나무", "level": 1,    "source": "기상청", "status": "ok" },
    { "key": "weed",  "label": "잡초류", "level": null, "source": "기상청", "status": "offseason" },
    { "key": "grass", "label": "잔디",   "level": 1,    "source": "Google", "status": "ok" }
  ],
  "disclaimer": "기상청 예보 위험지수 · 지역 단위 · 시즌제",
  "generatedForKstDate": "2026-07-26"
}
```

- **status**: `ok` | `offseason` | `unmapped` | `error`.
- **시즌 판정은 Phase 0에서 확정한 API 신호로** (하드코딩 월 금지).

## 6. 시간·캐시·좌표

### 6.1 KST 기준
Vercel은 UTC 기본. "오늘" 판정·캐시 날짜·Cron 전부 `Asia/Seoul`(UTC+9, DST 없음) 명시. 기상청 발표 06/18 KST.

### 6.2 좌표 획득 훅 (rev2: BLOCKER 해소)
- **결정: `src/hooks/useGeolocation.js` 추출** — GPS(`getCurrentPosition`, high→low 정확도 폴백) + IP 폴백만 담당(지도 마커 렌더링 제외). `Map.jsx`는 이 훅으로 좌표를 받아 기존 `placeLocationMarker`로 렌더링(마커 로직은 그대로). `PollenPanel`도 같은 훅 사용 → 권한 팝업 1회, 코드 중복 없음.
- 대안(비채택): PollenPanel에 최소 geolocation 중복 구현(Map.jsx 완전 무수정이나 권한 2회·유지보수 부담).

### 6.3 캐시 키·해상도
- 키 = `pollen:{regionCode}:{KST날짜}` (유한집합 ≈250 시군구).
- **알려진 한계** — Google 잔디는 원래 ~1km 해상도지만 시군구 단위로 캐시되어 대형 군 지역(예: 홍천군 ~1,820㎢)에서는 대표값 한 개가 지역 전체에 제공된다. 예보 지수 성격상 수용하고 disclaimer로 커버(별도 좌표 캐시는 도입하지 않음).

## 7. Phase 2 — PWA 웹 푸시

### 7.1 PWA / 서비스워커
- vite-plugin-pwa **`strategies: 'injectManifest'`** + `src/sw.js`(`self.__WB_MANIFEST` + `push`/`notificationclick`). 기본값 `generateSW`는 커스텀 push 리스너를 못 담음.
- `manifest.webmanifest` + 아이콘. VAPID 키는 `npx web-push generate-vapid-keys`로 생성해 env 등록.

### 7.2 `POST /api/subscribe`
- 검증: `endpoint` HTTPS + 알려진 푸시서비스 도메인만, `regionCode` 화이트리스트, `threshold` 1–3. IP rate limit, 총 구독 캡, endpoint dedup, 90일 TTL.
- **동의 고지 + 개인정보처리방침 + 구독취소(`/api/unsubscribe`)** 선행.

### 7.3 Redis 데이터 모델 (양방향 인덱스)
- `sub:{endpointHash}` → 레코드(TTL 90일).
- `region:{regionCode}` → endpointHash SET(Cron 조회용).
- 삭제(410/해지): `DEL sub` + `SREM region` 동시.

### 7.4 Cron + 발송
- `vercel.json` `crons`. 스케줄은 KST 목표시각의 **UTC 환산**(예: KST 07:00 = `0 22 * * *`). Hobby는 ±59분 정밀도 — 일일 알림 허용, 사용자 문구에 "아침 중" 표기.
- `cron/pollen-alerts.js`: `CRON_SECRET` 검증 → `cron:pollen:{KST날짜}` `NX`로 중복 방지 → 임계 초과 지역만 **fan-out**(`send-region-pushes.js` 호출, 300초 타임아웃 회피).
- `send-region-pushes.js`: `web-push` 발송, `410/404` → 즉시 삭제, `429` → 백오프.

### 7.5 iOS 대응
- 홈 화면 설치 PWA만, 전달률 70–85%, 구독 소멸 가능. 앱 실행 시 `getSubscription()` 재구독, iOS Safari 설치 안내 UI, 인앱 브라우저(카카오/네이버) 감지 시 "Safari로 열기", "best-effort" 고지.

## 8. 환경 변수 (rev2: 키 이전 오류 수정)

**기존 유지(하위호환 — 삭제/개명 금지):**
- `VITE_DATA_API_KEY` — 기존 나무 데이터가 `api.js:68`에서 브라우저로 사용. **그대로 둔다.** (data.go.kr 키는 비과금·저위험이라 클라이언트 노출 수용.)
- Naver `ncpKeyId`(`index.html`) — 기존 지도용 클라이언트 키. Cloud Console 도메인 잠금만 확인.

**신규(서버 전용):**
- `KMA_POLLEN_KEY` — 기상청 꽃가루 API용. `VITE_DATA_API_KEY`와 **별도 변수**(키 값은 같을 수 있으나 서버 전용으로 분리).
- `GOOGLE_POLLEN_KEY`.
- `NAVER_GEOCODE_ID` / `NAVER_GEOCODE_KEY` — 기존 CLI용 재사용하되 **Reverse Geocoding 서브 API 활성화 필요**.
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`.
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` (Phase 2).
- `CRON_SECRET` — Vercel 자동 주입 (Phase 2).
- `ALLOWED_ORIGINS` — CORS. **다중 오리진**: 프로덕션 도메인 + `*.vercel.app` 프리뷰. 런타임에 `request.headers.origin`을 프로덕션 목록 또는 `/\.vercel\.app$/` 패턴과 대조(프리뷰는 `VERCEL_ENV==='preview'`일 때만 완화). 단일 도메인으로 잠그면 프리뷰 배포가 전부 403.

## 9. 의존성 (신규)

**Phase 1** (현재 `dependencies`는 react/react-dom뿐 — 첫 서버 런타임 의존성):
- `@upstash/redis`, `@upstash/ratelimit` (root `dependencies` — Vercel이 `api/`에서 번들).
- `vercel` (devDependency — 로컬 `vercel dev`용).

**Phase 2:** `web-push`, `vite-plugin-pwa`, `workbox-precaching`.

## 10. Vercel 서버리스 부트스트랩 (rev2 신규)

현재 `vercel.json` 없음, `api/` 없음, 순수 정적 배포(`vite build` → `dist/`). 첫 함수 도입 시:
- **`vercel.json`** — 최소: `{ "functions": { "api/**/*.js": { "runtime": "@vercel/node@3" } } }`. Phase 2에서 `crons` 추가.
- **로컬 개발** — `npm run dev`(vite)는 `/api`를 서빙하지 않음. `vercel dev`로 함수 포함 구동. 스크립트/문서에 명시.
- **env** — 서버 전용 변수는 Vercel Dashboard 또는 `vercel env pull`. `.env.example` 갱신.
- **테스트** — `vitest.workspace.js`: `{src/**: jsdom}` + `{api/**: node}` 분리(현재 vitest 설정은 src 전용).

## 11. 운영·보안 방어 요약

| 항목 | 조치 |
|---|---|
| 과금 남용 | 좌표 스냅 + 지역코드 캐시 + IP rate limit + 전역 일일 상한 |
| 최종 방어선 | Google Cloud API 일일 쿼터 + 예산 알림, Vercel Spend Management |
| 서비스 지역 | 한국 bbox 검증 |
| 구독 플러딩 | rate limit + 총량 캡 + endpoint 도메인 검증 + dedup + TTL |
| CORS | 다중 오리진(프로덕션 + 프리뷰 패턴) |
| Cron 보호 | CRON_SECRET 검증 + NX 중복 방지 |
| Redis 장애 | **fail-open**(캐시/ratelimit 우회하고 응답, 단 전역 일일 상한은 보수적으로) — 가용성 우선, 비용은 GCP 쿼터가 최종 방어 |
| 모니터링 | Google 일일 카운터 임계 시 로그 경보, 기상청 응답 파싱 실패 시 `status:error` 카운트. (Vercel 무료 로그 보존 짧음 — 최소 count 지표만) |
| 프라이버시 | 동의 고지 + 개인정보처리방침 + 구독취소 + lat/lng 로그 미저장 (PIPA/GDPR). Upstash 데이터 리전 확인(US/EU) |
| dev 의존성 | `npm audit fix` (vite/postcss/js-yaml, 빌드타임 한정) |

## 12. 테스트 전략

- **`api/_lib/pollen-core.js` 단위(vitest, node env)**: UPI→0–3 매핑(`3→1`,`4→2` 회귀 포함), 세종 area2 null 폴백, offseason 처리, KST 날짜 경계, 캐시 키 생성, 부분 실패 병합.
- **`region-codes.json` 자가검증 스크립트**: 대표 지역을 실제 기상청 호출로 검증.
- **`/api/pollen` 통합**: bbox 거부(400), CORS(403/프리뷰 허용), rate limit(429), 캐시 히트/미스, 업스트림 실패 격리, Redis 다운 fail-open.
- **Phase 2**: 구독 검증, 410 프루닝, Cron NX, fan-out.
- **수동**: 실제 GPS 패널 표시(headless Playwright), iOS Safari 설치·푸시 수신.

## 13. 확인된 정상 항목 (재검토 불필요)

Vercel Cron 일 1회(Hobby OK) · Upstash 무료 티어(50만 cmd/월, 256MB) · Hobby 함수 300초(Fluid Compute) · iOS 16.4+ 웹푸시(한국은 EU DMA 무관하게 동작).
