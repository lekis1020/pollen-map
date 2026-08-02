# 꽃가루 API 디스커버리 노트

Phase 0 산출물. 값이 확정된 것과 활용신청/키 발급 후 실호출로 확정할 것을 구분한다.

## 기상청 꽃가루농도위험지수 3.0 — ✅ 공식 Swagger에서 확정 (2026-07-27)

- **Host / Base**: `https://apis.data.go.kr/1360000/HealthWthrIdxServiceV3`
- **오퍼레이션** (참/솔/잡초 각각 **별도 호출**):
  - 참나무: `getOakPollenRiskIdxV3`
  - 소나무: `getPinePollenRiskIdxV3`
  - 잡초류: `getWeedsPollenRiskndxV3`  ← 이름에 오타(`Riskndx`), 그대로 사용
- **요청 파라미터**: `serviceKey`, `areaNo`(10자리 행정구역코드), `time`(YYYYMMDDHH, 06 또는 18), `dataType`(JSON), `pageNo`, `numOfRows`
- **응답 구조**: `response.body.items.item[]`
  - item 필드: `code`, `areaNo`, `date`, `today`, `tomorrow`, `dayaftertomorrow`, `twodaysaftertomorrow`
  - **`today` = 오늘 지수값(0–3)** → parseKma는 각 오퍼레이션의 `item[0].today`를 읽는다.
- **인증 상태**: ✅ **활용신청 승인 완료(2026-07-28, 자동승인)** → 전용 `KMA_POLLEN_KEY` 발급(.env).
  발급 직후 약 5분간 게이트웨이 미전파로 403(Forbidden) → 이후 200. (기존 `VITE_DATA_API_KEY`는 이 서비스에 Forbidden.)
- **비시즌 신호 — ✅ 실호출로 확정(2026-07-28)**: body 없이 header만 온다.
  ```json
  { "response": { "header": { "resultCode": "99", "resultMsg": "해당지수자료 제공기간이 아닙니다! [자료제공기간 3월 ~ 6월]" } } }
  ```
  - 참나무·소나무 3~6월, 잡초류 8~10월(resultMsg 기준. 첨부 docx에는 4~6월로 표기 — API 메시지가 우선).
  - `parseKmaItem`: `resultCode "99"` + resultMsg에 "제공기간" 포함 → `offseason`. 그 외 item 없음 → `error`.
  - 실응답 fixture: `kma-oak/pine/weed.json`(전부 비시즌), `kma-offseason.json`(동일 실응답으로 교체).
- **시즌 중 응답 — ✅ 잡초류 실호출로 확정(2026-08-02, 시즌 개시)**: `today:"0"`(문자열 숫자), `resultCode:"00"`.
  마지막 필드명은 Swagger 표기(`todaysaftertomorrow`)와 달리 실제로는 **`twodaysaftertomorrow`**(우리는 `today`만 읽어 영향 없음).
  실응답 fixture: `kma-weed-inseason.json`. 참나무·소나무는 3월 시즌 개시 후 동일 형식인지 확인(현 oak/pine inseason fixture는 가정 기반).

## Google Pollen API — ✅ 문서에서 확정

- `GET https://pollen.googleapis.com/v1/forecast:lookup?location.latitude=&location.longitude=&days=1&key=`
- 한국은 **grass만** 제공.
- 잔디 UPI 경로: `dailyInfo[0].pollenTypeInfo[]` 중 `code === "GRASS"`의 `indexInfo.value`(0–5).
  - (plantInfo[]의 잔디 분류 코드는 `GRAMINALES` — pollenTypeInfo 쪽을 사용)
- UPI(0–5) → 통일척도(0–3) 접기: `{0→0,1→0,2→1,3→1,4→2,5→3}`.
- **실호출 확정(2026-07-29)**: status 200, `regionCode:"KR"`. GRASS 항목은 있으나 **비시즌엔 `indexInfo`(및 `inSeason`) 필드 자체가 없음** → `parseGoogleGrass`가 offseason으로 처리(기존 로직 그대로 유효). 실응답 fixture: `google-grass-offseason.json`.
- 시즌 중 실제 `indexInfo.value` 형태는 잔디 시즌에 재확인(현 `google-grass.json`은 가정 기반 — discover 스크립트는 덮어쓰지 않고 `google-grass-live.json`으로 저장).

## Naver Reverse Geocoding(gc) — ✅ 문서에서 확정

- `GET https://maps.apigw.ntruss.com/map-reversegeocode/v2/gc?coords={lng},{lat}&output=json&orders=admcode,legalcode`
  - (문서 대체 host: `naveropenapi.apigw.ntruss.com`. repo 기존 정지오코딩은 `maps.apigw.ntruss.com` 사용 → 동일 host로 시작.)
- 헤더: `X-NCP-APIGW-API-KEY-ID`, `X-NCP-APIGW-API-KEY`
- 경로: `results[0].region.area1.name`(시도), `results[0].region.area2.name`(시군구)
- **세종시**: area2 빈값 → `results[0].region.area3.name`(읍/면/동) 존재. region-codes.json에 `세종특별자치시|` 키로 대응.
- **필수 선행**: NCP 콘솔에서 기존 앱에 **Reverse Geocoding 서브 API 활성화**(정지오코딩과 별개).

## region-codes.json (Task 4) — ✅ 완료 (2026-07-28)

- `areaNo`는 10자리 행정구역코드. 예: 서울 강남구 = `1168000000`.
- 공식 ZIP(`dfs-zone-tree_excel_20260701.xlsx`, 승인 페이지 참고문서)에서 **340개 키** 생성:
  - 시군구 256개(`"area1|area2"`) + 시도 폴백 18개(`"area1|"`) — 세종 폴백은 시군구 레벨 `3611000000`.
  - 기상청 표의 복합구는 공백 없음("수원시장안구") → Naver 표기용 공백 별칭("수원시 장안구") 추가.
  - **전남광주통합특별시**(2026 행정개편): Naver가 구 명칭을 줄 경우 대비 `광주광역시|*`(동·서·남·북·광산구) / `전라남도|*` 별칭 추가.
  - 이어도 제외(중복 코드, 역지오코딩 비대상).
- 조인 키: Naver `(area1.name, area2.name)` → `"area1|area2"`. 세종은 `"세종특별자치시|"`.

## 남은 사용자 액션 (제가 대신 불가)

1. ~~data.go.kr 데이터셋 15085289 **활용신청**~~ ✅ 완료(2026-07-28 승인, `KMA_POLLEN_KEY` .env 저장).
2. ~~**Google Pollen** 키 발급~~ ✅ 완료(2026-07-29 검증, 비시즌 실응답 확정).
3. ~~NCP 콘솔 **Reverse Geocoding** 활성화~~ ✅ 완료(2026-07-29 검증 — 별도 앱의 ID/Secret 쌍 사용, 강남·세종 실응답 확보).
4. ~~**Upstash Redis**~~ ⏭️ **생략 결정**(기존 free DB는 타 프로젝트 전용. fail-open + Vercel `s-maxage=1800` + Google 일일쿼터 캡으로 방어. 필요 시 pay-as-you-go 2번째 DB).
5. ~~기상청 첨부 **ZIP**(행정구역코드) 확보~~ ✅ 완료(승인 페이지에서 다운로드, region-codes.json 반영).

## 로컬 E2E (2026-07-29 vercel dev 검증)

- `GET /api/pollen?lat=37.5172&lng=127.0473` → 서울특별시 강남구/1168000000, 4종 카테고리 offseason 정상.
- `GET /api/pollen?lat=36.48&lng=127.289` → 세종특별자치시/3611000000(area2 공백 폴백) 정상.
- ⚠️ `vercel.json` 제거됨 — `"runtime":"@vercel/node@3"` 표기가 CLI/배포에서 "Function Runtimes must have a valid version" 에러 유발. Node 함수는 자동 감지라 불필요.
- 로컬 CORS: `.env`에 `ALLOWED_ORIGINS=http://localhost:5173` 필요(`vercel dev`는 `npm run dev:api`).

- ⚠️ 공공데이터포털 점검: **2026-07-29(수) 19시 ~ 08-02(일) 18시** 신규 활용신청·로그인 중단(기존 API 호출은 정상).
- → 남은 2·3·4 완료 후 `.env` 채우고 `npm run discover:pollen` 재실행(로그: `pollen-discovery-run.md`) → Task 10 마무리.
