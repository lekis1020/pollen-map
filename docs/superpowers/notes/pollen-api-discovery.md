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
  - item 필드: `code`, `areaNo`, `date`, `today`, `tomorrow`, `dayaftertomorrow`, `todaysaftertomorrow`
  - **`today` = 오늘 지수값(0–3)** → parseKma는 각 오퍼레이션의 `item[0].today`를 읽는다.
- **인증 상태**: 기존 `VITE_DATA_API_KEY`는 유효(나무 API `resultCode:00`)하나 이 서비스는 **`Forbidden`** →
  **data.go.kr 데이터셋 15085289 활용신청 필요**(서비스별 개별 승인). 승인 후 동일 키 값 사용 가능성 높음.
- **미확정(활용신청 후 실호출로)**: 비시즌 신호(`today` 빈값/누락/items 빈 배열 중 무엇인지), 값의 문자열/숫자 형식.

## Google Pollen API — ✅ 문서에서 확정

- `GET https://pollen.googleapis.com/v1/forecast:lookup?location.latitude=&location.longitude=&days=1&key=`
- 한국은 **grass만** 제공.
- 잔디 UPI 경로: `dailyInfo[0].pollenTypeInfo[]` 중 `code === "GRASS"`의 `indexInfo.value`(0–5).
  - (plantInfo[]의 잔디 분류 코드는 `GRAMINALES` — pollenTypeInfo 쪽을 사용)
- UPI(0–5) → 통일척도(0–3) 접기: `{0→0,1→0,2→1,3→1,4→2,5→3}`.
- **미확정**: 실제 응답에서 GRASS 항목 존재/값 범위(키 발급 후 `npm run discover:pollen`으로 확인).

## Naver Reverse Geocoding(gc) — ✅ 문서에서 확정

- `GET https://maps.apigw.ntruss.com/map-reversegeocode/v2/gc?coords={lng},{lat}&output=json&orders=admcode,legalcode`
  - (문서 대체 host: `naveropenapi.apigw.ntruss.com`. repo 기존 정지오코딩은 `maps.apigw.ntruss.com` 사용 → 동일 host로 시작.)
- 헤더: `X-NCP-APIGW-API-KEY-ID`, `X-NCP-APIGW-API-KEY`
- 경로: `results[0].region.area1.name`(시도), `results[0].region.area2.name`(시군구)
- **세종시**: area2 빈값 → `results[0].region.area3.name`(읍/면/동) 존재. region-codes.json에 `세종특별자치시|` 키로 대응.
- **필수 선행**: NCP 콘솔에서 기존 앱에 **Reverse Geocoding 서브 API 활성화**(정지오코딩과 별개).

## region-codes.json (Task 4)

- `areaNo`는 10자리 행정구역코드. 예: 서울 강남구 = `1168000000`.
- 전체 표는 데이터셋 15085289 **첨부 ZIP**("설명서 및 행정구역코드")에서 추출.
- 조인 키: Naver `(area1.name, area2.name)` → `"area1|area2"`. 세종은 `"세종특별자치시|"`.

## 남은 사용자 액션 (제가 대신 불가)

1. data.go.kr 데이터셋 15085289 **활용신청** (기상청 꽃가루 3.0).
2. **Google Pollen** 키 발급 + Cloud Console 일일 쿼터/예산캡.
3. NCP 콘솔 **Reverse Geocoding** 활성화.
4. **Upstash Redis** 생성(Vercel Marketplace).
5. 기상청 첨부 **ZIP**(행정구역코드) 확보.

→ 위 완료 후 `.env` 채우고 `npm run discover:pollen` 실행하면 나머지(Task 0.2·3·4·6·10)를 이어서 구현한다.
