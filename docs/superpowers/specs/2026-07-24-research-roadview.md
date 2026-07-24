# 네이버 로드뷰(파노라마) 이미지 프로그래매틱 취득 조사 보고서

조사일: 2026-07-24 / 조사 방법: 공식 문서 WebFetch 직접 확인 + WebSearch. 추측이 섞인 부분과 확인 못한 부분은 명시적으로 "확인 불가"로 표기함.

---

## 1. 결론 요약 — 실현 가능 경로 순위

| 순위 | 경로 | 가능 여부 | 라이선스 리스크 | 비용 |
|---|---|---|---|---|
| 1 | **Google Street View Static API** (공식 REST, 정지 이미지 반환) | **가능** — 공식 정지 이미지 REST API로는 유일 | 낮음 (공식 약관 내 사용) | 월 10,000건 무료, 이후 $7.00/1,000건 (볼륨 할인 있음) |
| 2 | **Mapillary Graph API** (크라우드소싱 street-level 이미지) | **가능** | 낮음 — CC BY-SA 4.0 (표기 의무, SA 조건) | 무료 |
| 3 | **Naver JS SDK로 메타데이터만 수집** (`Panorama.getLocation()` → `photodate` 등) | 기술적으로 **가능** (이미지 아닌 촬영일자/panoId만) | 중간 — 결과 데이터 "저장·DB화 금지" 조항 때문에 대량 축적은 회색지대 | Web Dynamic Map 무료 이용량 내 (대표 계정 한정, 초과 시 과금) |
| 4 | **naver.maps.Panorama 렌더 화면을 Playwright 스크린샷으로 저장** | 기술적으로 가능하나 **약관 위반 소지 큼 — 비권장** | 높음 — 복제·저장 금지 조항 명시 (3항 원문 인용) + 저작권 문제 별개 | — |
| 5 | **비공식 라이브러리 `sk-zk/streetlevel`** (네이버/카카오 파노라마 + 촬영일자 다운로드) | 기술적으로 가능 | **매우 높음** — 내부 API 리버싱, 약관 위반, 언제든 차단 가능 | 무료 (라이브러리 MIT) |
| — | 카카오 Roadview 정지 이미지 API | **불가** — 카카오 공식 답변으로 부재 확인 | — | — |
| — | 공공기관 street-level 파노라마 오픈데이터 | **발견하지 못함** | — | — |

**핵심**: 네이버·카카오 모두 "로드뷰 정지 이미지"를 반환하는 공식 REST API는 존재하지 않는다. 이미지 파일이 반드시 필요하면 Google SV Static 또는 Mapillary가 유일한 합법 경로(둘 다 한국 커버리지 사전 확인 필수)이고, 촬영일자 메타데이터만 필요하면 Naver JS SDK 경유가 가능하다.

---

## 2. NCP Maps에 로드뷰·파노라마 정지 이미지 공식 API 존재 여부 — **없음**

- 조사 지시에 있던 URL `https://api.ncloud-docs.com/docs/ai-naver-mapsstaticmap`은 현재 **HTTP 404** (구 AI·NAVER API 문서 경로 폐기됨).
- 현행 공식 문서 [Maps 개요 — api.ncloud-docs.com/docs/application-maps-overview](https://api.ncloud-docs.com/docs/application-maps-overview): NCP Maps 제품군은 **Dynamic Map, Static Map, Geocoding, Reverse Geocoding, Directions 5, Directions 15**의 6종뿐. 파노라마/로드뷰 이미지 REST API는 목록에 없음.
- [Maps 이용 가이드 — guide.ncloud-docs.com/docs/maps-overview](https://guide.ncloud-docs.com/docs/maps-overview): 거리뷰/항공뷰는 **"Web Dynamic Map의 panorama 서브 모듈 제공"**으로만 명시. 즉 JS 뷰어 형태로만 제공되며 이미지 반환 API가 아님. (Web Dynamic Map / Static Map / Geocoding / Reverse Geocoding은 대표 계정 한정 무료 이용량 제공, 초과 시 과금 명시)

## 3. naver.maps.Panorama의 Playwright 캡처 — 약관상 **위반 소지 큼**

[NCP AI·NAVER API 서비스 이용약관 PDF](https://xv-ncloud.pstatic.net/images/provision/AI%C2%B7NaverAPI%EC%84%9C%EB%B9%84%EC%8A%A4%EC%9D%B4%EC%9A%A9%EC%95%BD%EA%B4%80_1620716044568.pdf)에서 텍스트 추출로 직접 확인한 원문:

> "'고객'은 '회사'의 사전 동의 없이 '본 서비스'의 결과 데이터를 본 약관에서 허용한 범위를 넘어서서 무단으로 **복제, 저장, 가공, 배포**하거나 제3자에게 제공해서는 안됩니다."

> (Maps 특칙) "…별도로 **저장해서는 안되며**, 따라서 그와 같은 결과 데이터를 별도로 저장하는 방식으로 **데이터베이스화하여 이용해서도 안됩니다**. 예를 들면, Maps API의 결과 데이터로 전송 받는 지도 타일(Tile) 데이터를 모아서 … **리턴 받는 즉시 1회 자신의 서비스에서 사용하는 것만 허용**되며, 그렇지 않고 그 결과 값들을 별도로 저장, DB화, …"

해석 및 한계:

- 파노라마 이미지도 SDK가 반환하는 "결과 데이터"이므로, 렌더 화면 스크린샷을 **저장·축적하는 파이프라인은 위 복제·저장 금지 조항에 포섭될 가능성이 높음**. 화면에 실시간 렌더하여 사용자에게 보여주는 것만 허용 범위로 해석됨.
- 조문에 "캡처"·"크롤링"이라는 단어가 명시돼 있는지는 **확인 불가** (추출 텍스트에서 해당 단어 미발견). 다만 "복제·저장" 조항으로 실질적으로 동일하게 금지됨.
- 파노라마 이미지는 네이버 저작물이므로 약관과 별개로 저작권 문제도 존재.
- 최신 개정판(현행 NCP Maps 상품 약관)에서 조문 변경 여부는 **확인 불가** — 실사용 전 NCP 고객지원 문의 권장.

## 4. 파노라마 메타데이터 조회 — **가능 (JS SDK 경유, 촬영일자 포함)**

근거: [Panorama 튜토리얼](https://navermaps.github.io/maps.js.ncp/docs/tutorial-Panorama.html), [naver.maps.Panorama 클래스 레퍼런스](https://navermaps.github.io/maps.js.ncp/docs/naver.maps.Panorama.html)

- `panorama.getLocation()` → **`PanoramaLocation` 객체 반환: `{ panoId, title, address, coord, photodate }`** — `photodate`(촬영일) 제공이 공식 문서에서 확인됨. `coord`는 촬영 위치의 위/경도.
- `panorama.setPosition(latlng)` → 지정 좌표에서 **반경 300m 내 최근접 파노라마를 자동 탐색·로드**.
- 수집 패턴:

```javascript
var pano = new naver.maps.Panorama("pano", {
    position: new naver.maps.LatLng(lat, lng)
});
naver.maps.Event.addListener(pano, "pano_changed", function () {
    var loc = pano.getLocation(); // { panoId, title, address, coord, photodate }
});
```

- **`naver.maps.PanoramaService`는 존재 확인 불가** (공식 문서·검색 어디에도 없음. 구글의 `StreetViewService` 같은 뷰어 독립적 메타데이터 서비스는 없는 것으로 보임). 메타데이터만 필요해도 (숨김) 뷰어 인스턴스를 생성해야 하며, 이 과정에서 이미지 타일 로드가 발생하므로 대량 조회 시 과금·정책 이슈 유의.
- 메타데이터 역시 "결과 데이터"이므로 대량 저장·DB화는 3항 조항의 회색지대 (소량·일회성이면 위험 낮음).

## 5. 대안 비교

| 서비스 | 정지 이미지 API | 촬영일자 | 비용/라이선스 | 한국 커버리지 | 근거 URL |
|---|---|---|---|---|---|
| **카카오 Roadview** | **없음** — 카카오 담당자 공식 답변: "기 제공하는 로드뷰 API 외에 별도로 로드뷰 이미지만 바로 호출할 수 있는 기능은 제공하지 않습니다" | API로 미제공 (Web API 문서에 촬영일자 메서드 없음 — 확인 불가) | 뷰어 무료. 출판물·영상 캡처는 출처 표기 조건부 허용 정책이 있으나 프로그래매틱 대량 수집 허용 여부는 명시 없음 (**확인 불가**) | 전국 (자사 서비스) | [데브톡 105815 (이미지 호출 불가 공식답변)](https://devtalk.kakao.com/t/topic/105815), [데브톡 143432 (이미지 활용 문의)](https://devtalk.kakao.com/t/topic/143432), [Web API 문서](https://apis.map.kakao.com/web/documentation/) — `RoadviewClient.getNearestPanoId(position, radius, callback)`로 최근접 panoId 취득은 가능, [카카오맵 오프라인 사용 정책](https://kakaomap.tistory.com/257) |
| **Google Street View Static API** | **있음** (공식 REST, HTTP 요청으로 정지 파노라마 반환) | 메타데이터 엔드포인트에서 제공 | SKU "Static Street View" (Essentials): **월 10,000건 무료**, 이후 **$7.00/1,000건**, 10만 건 초과 볼륨 할인 $5.60 → $4.20 → $2.10 → $0.53/1,000건. 메타데이터 요청은 별도 SKU | **제한적** — 한국 내 존재하나 정확한 범위·최신성은 **확인 불가** | [Usage & Billing](https://developers.google.com/maps/documentation/streetview/usage-and-billing), [가격표](https://developers.google.com/maps/billing-and-pricing/pricing), [한국 커버리지 논의 스레드](https://support.google.com/maps/thread/47738088) |
| **Mapillary** | **있음** (Graph API로 이미지 URL·타일 취득) | `captured_at` 제공 | **무료, CC BY-SA 4.0** (출처 표기 + 동일조건 변경허락) | 존재하나 크라우드소싱 기반으로 밀도 불균일 — 정량 범위 **확인 불가** (mapillary.com/app 지도에서 직접 확인 필요) | [API 문서](https://www.mapillary.com/developer/api-documentation), [Mapillary — Wikipedia](https://en.wikipedia.org/wiki/Mapillary) |
| **비공식: sk-zk/streetlevel** | 파노라마 풀해상도 다운로드 (Naver Street View·Kakao Road View 모두 지원 명시) | **촬영일자 포함**, 과거 이력·근처 파노라마 지원 | 라이브러리 자체는 MIT. 단 **내부 API 리버싱 = 서비스 약관 위반, 차단 위험** — API 키 불필요라고 명시돼 있으나 이는 비공식 엔드포인트 사용을 의미 | Naver·Kakao 커버리지 그대로 | [github.com/sk-zk/streetlevel](https://github.com/sk-zk/streetlevel) |
| **공공 오픈데이터 (국토지리정보원 등)** | **발견하지 못함** — 전국 단위 street-level 파노라마 오픈데이터는 이번 조사에서 확인 불가 | — | — | — | NGII 제공물은 [정밀도로지도](https://www.data.go.kr/data/15059912/fileData.do)(3D 벡터 레이어, 파노라마 사진 아님), 항공사진 등. 유사물: [국가유산 360 파노라마](https://gis-heritage.go.kr/gisContentService.do)(문화유산 한정), [서울 S-MAP](https://smap.seoul.go.kr/)(3D 모델) — 도로 파노라마 아님 |

## 6. "확인 불가" 항목 정리

| 항목 | 상태 |
|---|---|
| NCP 약관 조문 내 "캡처"/"크롤링" 단어의 명시적 존재 | **확인 불가** — 추출 텍스트에서 미발견. "복제·저장·가공·배포 금지" 조항으로 실질 동일 규제 |
| NCP Maps 현행(최신 개정) 약관에서 해당 조항 유지 여부 | **확인 불가** — 확인한 것은 2021년판 AI·NAVER API 약관 PDF. NCP 고객지원 문의 권장 |
| `naver.maps.PanoramaService`의 존재 | **확인 불가** — 공식 문서·검색에서 미발견, 없는 것으로 보임 |
| 카카오 Roadview 촬영일자 API 제공 여부 | **확인 불가** — 공식 Web API 문서에 관련 메서드 없음 |
| 카카오 로드뷰의 프로그래매틱 대량 캡처 허용 여부 | **확인 불가** — 오프라인 사용 정책은 출판물·영상 중심, 대량 수집 언급 없음 |
| Google Street View 한국 커버리지의 정확한 범위·최신성 | **확인 불가** |
| Mapillary 한국 커버리지 밀도 | **확인 불가** — 앱 지도에서 직접 확인 필요 |
| 공공기관 street-level 파노라마 오픈데이터의 완전한 부존재 | 단정 불가 — 전수 검색은 못 했으므로 "**발견하지 못함**"으로만 표기 |

## 7. pollen-map 프로젝트 관점 권고

- **촬영일자 메타데이터만 필요한 경우**: Naver JS SDK `Panorama.getLocation().photodate`를 headless Playwright로 수집하는 것이 기술적으로 가능. 소량·일회성이면 위험 낮으나, 대량 DB화는 "결과 데이터 저장 금지" 조항의 회색지대.
- **이미지 파일 자체가 필요한 경우**: 합법 경로는 Google Street View Static API(대상 지역 커버리지 사전 확인 필수) 또는 Mapillary(CC BY-SA 표기 의무, 커버리지 확인 필수)뿐. 네이버/카카오 로드뷰 캡처·다운로드 파이프라인은 약관상 비권장.

## 근거 URL 전체 목록

- https://api.ncloud-docs.com/docs/application-maps-overview — NCP Maps API 제품군 (파노라마 REST API 없음)
- https://guide.ncloud-docs.com/docs/maps-overview — 거리뷰는 Dynamic Map panorama 서브모듈로만 제공
- https://navermaps.github.io/maps.js.ncp/docs/tutorial-Panorama.html — Panorama 튜토리얼
- https://navermaps.github.io/maps.js.ncp/docs/naver.maps.Panorama.html — Panorama 클래스 (getLocation, PanoramaLocation.photodate, setPosition 300m)
- https://xv-ncloud.pstatic.net/images/provision/AI%C2%B7NaverAPI%EC%84%9C%EB%B9%84%EC%8A%A4%EC%9D%B4%EC%9A%A9%EC%95%BD%EA%B4%80_1620716044568.pdf — NCP AI·NAVER API 서비스 이용약관 (복제·저장 금지 조항 원문)
- https://devtalk.kakao.com/t/topic/105815 — 카카오 공식: 로드뷰 이미지 직접 호출 기능 미제공
- https://devtalk.kakao.com/t/topic/143432 — 카카오 로드뷰 이미지 활용 문의
- https://kakaomap.tistory.com/257 — 카카오맵 오프라인(캡처) 사용 정책
- https://apis.map.kakao.com/web/documentation/ — Kakao 지도 Web API (Roadview, RoadviewClient.getNearestPanoId)
- https://developers.google.com/maps/documentation/streetview/usage-and-billing — Street View Static API 과금 방식
- https://developers.google.com/maps/billing-and-pricing/pricing — Static Street View SKU 단가·무료량
- https://support.google.com/maps/thread/47738088 — 한국 스트리트뷰 커버리지 논의
- https://www.mapillary.com/developer/api-documentation — Mapillary API
- https://en.wikipedia.org/wiki/Mapillary — Mapillary 라이선스(CC BY-SA 4.0)
- https://github.com/sk-zk/streetlevel — 비공식 파노라마 다운로드 라이브러리 (Naver/Kakao 지원)
- https://www.data.go.kr/data/15059912/fileData.do — NGII 정밀도로지도 (파노라마 아님)
- https://gis-heritage.go.kr/gisContentService.do — 국가유산 360 파노라마 (문화유산 한정)
- https://smap.seoul.go.kr/ — 서울 S-MAP (3D 모델, 파노라마 아님)
