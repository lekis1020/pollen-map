# 실시간 꽃가루 자료 + PWA 푸시 알림 — 설계 문서

- 작성일: 2026-07-26
- 상태: 설계 승인 대기
- 대상 저장소: `pollen-map` (React 19 + Vite, Vercel 배포)

## 1. 목표와 범위

가로수·수목 위치 지도인 기존 서비스에 **오늘의 꽃가루 정보**와 **꽃가루 알림(PWA 웹 푸시)**을 추가한다.

- 데이터 소스: **기상청 꽃가루농도위험지수 3.0**(참나무·소나무·잡초류) + **Google Pollen API**(잔디, 한국은 grass만 제공).
- UI: 상단 "오늘의 꽃가루" 패널. GPS 자동 조회 + 구독 지역 저장.
- 알림: 앱이 닫혀 있어도 수신되는 PWA 웹 푸시.
- 인프라: **Vercel Serverless Functions + Upstash Redis + Vercel Cron** (플랫폼 단일화).

### 단계화

- **Phase 1** — 오늘의 꽃가루 패널 + `/api/pollen` 프록시 + 보안·과금 방어. 독립 배포·검증.
- **Phase 2** — PWA + 웹 푸시(구독/Cron/발송) + iOS 대응. 독립 배포·검증.

### 설계 원칙

- 꽃가루 기능은 **기존 나무 지도와 완전히 독립된 모듈**. 신규 파일만 추가하고 기존 `api.js`/`Map.jsx`는 무수정. 꽃가루 기능이 실패해도 지도는 정상 동작(기존 폴백 철학과 동일).
- **모든 비공개 키는 서버리스 함수 안에**. 브라우저로 새 키가 나가지 않는다.
- 데이터는 **예보 위험지수**임을 UI에서 정직하게 표기(기존 disclaimer 정책과 일치).

## 2. 아키텍처

```
[브라우저]                         [Vercel Serverless]              [외부]
 PollenPanel  ── GET /api/pollen?lat&lng ──▶  입력검증·bbox·스냅·ratelimit
       ▲                                       ├─ reverse-geocode(Naver)
       │                                       ├─ 기상청 위험지수(참/솔/잡초, 0–3)
       └──────── 통합 JSON ◀────────────────────┤─ Google Pollen(잔디, UPI→0–3)
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
| `api/_lib/pollen-core.js` | 병합·스케일·시즌·캐시 로직 (테스트 대상) |
| `api/_lib/region-codes.json` | 기상청 행정구역코드 매핑 테이블 (공식 ZIP에서 1회 추출) |
| `api/_lib/ratelimit.js` | `@upstash/ratelimit` 래퍼 |
| `src/services/pollen.js` | 프론트 fetch 래퍼 |
| `src/components/PollenPanel.jsx`, `.css` | 오늘의 꽃가루 패널 |
| `api/subscribe.js` | 구독 저장 (Phase 2) |
| `api/cron/pollen-alerts.js`, `api/send-region-pushes.js` | Cron + fan-out 발송 (Phase 2) |
| `src/sw.js` | 커스텀 서비스워커 (Phase 2, injectManifest) |
| `public/manifest.webmanifest` | PWA manifest (Phase 2) |
| `src/components/PushSubscribe.jsx` | 구독 UI + 동의 고지 (Phase 2) |
| `public/privacy.html` 또는 라우트 | 개인정보처리방침 (Phase 2) |
| `vercel.json` | Cron 스케줄, 함수 설정 |

## 3. Phase 1 — 오늘의 꽃가루 패널

### 3.1 `GET /api/pollen?lat&lng` 처리 순서

1. **입력 검증** — `lat`/`lng`가 유한 숫자인지, 한국 bbox(`lat 33.0–38.7`, `lng 124.5–132.0`) 안인지. 벗어나면 `400`.
2. **CORS** — `Access-Control-Allow-Origin`을 앱 도메인으로 제한. 그 외 origin은 `403`.
3. **좌표 스냅** — 소수 2자리(~1km 격자)로 반올림. 이후 역지오코딩·캐시 키에 스냅 좌표만 사용 → 캐시 우회·과금 남용 차단.
4. **rate limit** — `@upstash/ratelimit` 슬라이딩 윈도우 IP당 10req/분. 초과 시 `429`. 추가로 **전역 일일 상한**(Google 업스트림 호출 카운터, 예: 300/일)에 도달하면 캐시 또는 일반 응답만 반환.
5. **캐시 조회** — 아래 5.2의 캐시 키로 Redis 확인. 히트 시 즉시 반환.
6. **역지오코딩(Naver)** — 스냅 좌표 → `area1`(시도) + `area2`(시군구).
   - **세종시 등 `area2`가 비면 `area1` 단독**으로 지역코드 조회.
7. **지역코드 매핑** — `(area1, area2)` 복합키로 `region-codes.json`에서 기상청 10자리 행정구역코드 조회. 매칭 실패 시 경고 로그 + 해당 지역 `status:"unmapped"`.
8. **업스트림 병렬 호출** (`Promise.allSettled`):
   - 기상청 꽃가루농도위험지수 3.0 — 참나무·소나무·잡초류 지수.
   - Google Pollen `forecast:lookup` — 잔디(grass) UPI.
9. **정규화·병합** — 아래 4의 통합 모델.
10. **캐시 저장** — 동적 TTL(다음 06/18 KST 갱신 시각까지).
11. **응답** — 통합 JSON.

### 3.2 프론트 `PollenPanel.jsx`

- 마운트 시 기존 geolocation 로직으로 GPS 확보 → `/api/pollen` 호출.
- GPS 거부/실패 시 기존 IP·선택지역 폴백 패턴 재사용.
- 4개 카테고리 카드(참나무·소나무·잡초류·잔디)를 **0–3 색상/라벨**로 표시.
- 비시즌 카테고리는 "비시즌"으로, 부분 실패 카테고리는 출처와 함께 정직하게 표시.
- 패널 자체 실패는 "일시적으로 불러올 수 없음" 처리, 지도는 무영향.
- disclaimer: "기상청 예보 위험지수 · 지역 단위 · 시즌제 / 잔디는 Google 예보 기준".

## 4. 통합 데이터 모델과 스케일

**통일 척도는 기상청 native 0–3.** (BLOCKER 수정: 이전 "0–4"는 두 소스 어디에도 없음.)

| level | 라벨 |
|---|---|
| 0 | 낮음 |
| 1 | 보통 |
| 2 | 높음 |
| 3 | 매우높음 |

- 기상청: 그대로 사용(0–3).
- Google UPI(0–5) → 접기: `{0→0, 1→0, 2→1, 3→2, 4→3, 5→3}`.

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

- **status 값**: `ok` | `offseason` | `unmapped` | `error`.
- **시즌 판정은 하드코딩 월이 아니라 API 응답 유무로.** (소나무·참나무 3~4월 시작 표기가 소스마다 다름 — 응답 기반이면 자동 적응.)

## 5. 시간·캐시 처리

### 5.1 KST 기준 (MAJOR 수정)

- Vercel 서버리스는 UTC 기본. "오늘" 판정, 캐시 날짜, Cron 스케줄 전부 `Asia/Seoul`(UTC+9, DST 없음) 명시.
- `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' })` 등으로 KST 날짜 산출.
- 기상청 발표: 06:00 / 18:00 KST.

### 5.2 캐시 키·TTL (BLOCKER 수정)

- **캐시 키 = 기상청 지역코드** (역지오코딩 결과). 유한집합(≈250 시군구)이라 좌표 원본 대비 캐시가 실제로 동작.
  - 예: `pollen:{regionCode}:{KST날짜}`.
- **동적 TTL** — 현재 시각에서 다음 갱신 시각(06/18 KST)까지. 3h 고정 대비 불필요 호출 감소.

## 6. Phase 2 — PWA 웹 푸시

### 6.1 PWA / 서비스워커 (BLOCKER 수정)

- vite-plugin-pwa **`strategies: 'injectManifest'`**. 기본값 `generateSW`는 커스텀 push 리스너를 못 담아 푸시가 조용히 무시됨.
- `src/sw.js`: `self.__WB_MANIFEST` 프리캐시 주입점 + `self.addEventListener('push', ...)` + `notificationclick` 핸들러.
- `public/manifest.webmanifest` + 아이콘. 설치 프롬프트(Android `beforeinstallprompt`).

### 6.2 `POST /api/subscribe`

- 입력 검증: `endpoint`는 HTTPS이고 알려진 푸시서비스 도메인(`fcm.googleapis.com`, `updates.push.services.mozilla.com`, `*.notify.windows.com` 등)만 허용. `regionCode`는 화이트리스트, `threshold`는 1–3 범위.
- IP rate limit(예: 3구독/시간), **총 구독 수 캡**(예: 10,000), endpoint 기준 dedup, 레코드 **90일 TTL**.
- 저장 전 **동의 고지** 표시, 개인정보처리방침 페이지 제공, 구독취소 엔드포인트 제공.

### 6.3 Redis 데이터 모델 (MAJOR 수정 — 양방향 인덱스)

- `sub:{endpointHash}` → `{ endpoint, keys, regionCode, threshold, createdAt }` (기본 레코드, TTL 90일).
- `region:{regionCode}` → endpointHash들의 SET (Cron fan-out 조회용).
- 삭제(410/구독취소): `DEL sub:{hash}` + `SREM region:{code} {hash}` 동시.

### 6.4 Cron + 발송

- `vercel.json`에 Cron 등록. **스케줄은 원하는 KST 시각의 UTC 환산값** (예: KST 07:00 = `0 22 * * *`). Hobby는 시간 단위 정밀도(±59분) — 일일 알림엔 허용, 문서화.
- `api/cron/pollen-alerts.js`:
  1. `Authorization: Bearer ${CRON_SECRET}` 검증(미검증 시 `401`).
  2. **중복 방지** — `cron:pollen:{KST날짜}`를 `NX`로 set(24h TTL). 이미 있으면 조기 종료.
  3. 구독 있는 지역들의 지수 조회.
  4. 임계 초과 지역만 **fan-out** — 지역별 `api/send-region-pushes.js`를 `fetch`로 호출(Hobby 300초 타임아웃 회피).
- `api/send-region-pushes.js`:
  - 해당 지역 구독자에게 `web-push`로 발송(VAPID 키는 env).
  - 발송 실패 `410`/`404` → 해당 구독 Redis에서 즉시 삭제. `429` → 백오프.

### 6.5 iOS 대응 (MAJOR 수정)

- iOS 웹푸시는 홈 화면 설치 PWA에서만, 전달률 70–85%, 구독이 조용히 소멸할 수 있음.
- 앱 실행 시 `pushManager.getSubscription()` 확인 → 없고 권한 허용 상태면 **재구독** 후 `/api/subscribe` 재전송.
- iOS Safari 사용자에게 "공유 → 홈 화면에 추가" 안내 UI (`/iPhone|iPad/` + `navigator.standalone` 감지).
- 카카오톡·네이버 등 인앱 브라우저 감지 시 "Safari로 열기" 안내.
- "iPhone 알림은 best-effort" 고지.

## 7. 보안·비용 방어 요약

| 항목 | 조치 |
|---|---|
| 과금 남용(좌표 스윕) | 좌표 스냅 + 지역코드 캐시 + IP rate limit + 전역 일일 상한 |
| 최종 방어선 | Google Cloud Console API 일일 쿼터 + 예산 알림, Vercel Spend Management |
| 서비스 지역 | 한국 bbox 검증 |
| 구독 플러딩 | rate limit + 총량 캡 + endpoint 도메인 검증 + dedup + TTL |
| 입력 검증 | lat/lng, regionCode 화이트리스트, threshold 범위 |
| CORS | 앱 도메인으로 제한 |
| Cron 보호 | CRON_SECRET 검증 |
| 프라이버시 | 동의 고지 + 개인정보처리방침 + 구독취소 + lat/lng 로그 미저장 (PIPA/GDPR) |
| 키 정리 | GOOGLE_POLLEN_KEY·NAVER_GEOCODE·VAPID 서버 전용, `VITE_DATA_API_KEY`도 서버로 이전 |
| Naver 클라이언트 키 | Cloud Console 도메인 잠금 확인 |
| dev 의존성 | `npm audit fix` (vite/postcss/js-yaml, 빌드타임 한정) |

## 8. 환경 변수 (서버 전용, `VITE_` 없음)

- `KMA_POLLEN_KEY` — 기상청(data.go.kr) 키, 현 `VITE_DATA_API_KEY`에서 서버로 이전.
- `GOOGLE_POLLEN_KEY` — Google Pollen API.
- `NAVER_GEOCODE_ID` / `NAVER_GEOCODE_KEY` — 기존 재사용.
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`.
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` (Phase 2).
- `CRON_SECRET` — Vercel 자동 주입 (Phase 2).
- `ALLOWED_ORIGIN` — CORS 허용 도메인.

## 9. 테스트 전략

- **`api/_lib/pollen-core.js` 단위 테스트(vitest)**: UPI→0–3 매핑, 세종 area2 null 폴백, 시즌 offseason 처리, KST 날짜 경계, 캐시 키 생성, 부분 실패 병합.
- **지역코드 매핑 자가검증**: `region-codes.json`의 대표 지역을 실제 기상청 호출로 검증하는 스크립트.
- **`/api/pollen` 통합 테스트**: bbox 거부(400), rate limit(429), 캐시 히트/미스, 업스트림 실패 격리.
- **Phase 2**: 구독 검증(도메인/threshold/dedup), 410 프루닝, Cron NX 중복 방지, fan-out.
- **수동 검증**: 실제 GPS로 패널 표시(headless Playwright), iOS Safari 설치·푸시 수신.

## 10. 미해결·확인 필요 항목

- 기상청 공식 ZIP(행정구역코드 + 정확한 서비스 기간) 실제 다운로드 후 `region-codes.json` 및 시즌 표기 확정.
- 기상청 3.0 응답의 정확한 필드명·다일 예보 구조를 인증키 발급 후 실호출로 확정.
- Google Pollen `forecast:lookup`의 한국 grass 반환 필드·plant code 실호출 확정.
- 배포 도메인(`ALLOWED_ORIGIN`) 확정.

## 11. 확인된 정상 항목 (재검토 불필요)

Vercel Cron 일 1회(Hobby OK) · Upstash 무료 티어(50만 cmd/월, 256MB 충분) · Hobby 함수 300초(Fluid Compute) · iOS 16.4+ 웹푸시(한국은 EU DMA 무관하게 동작).
