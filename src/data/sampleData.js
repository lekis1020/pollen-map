// 개발용 샘플 데이터 (실제 API 응답 형식과 동일)
// 소스별로 구분된 전국 식물 데이터

// 가로수길 샘플 데이터
const streetTreeSamples = [
  // === 서울 ===
  { roadsidTreeRoadNm: '강남대로', ctprvnNm: '서울특별시', signguNm: '강남구', speciesNm: '은행나무', pltngCo: '320', latitude: '37.4979', longitude: '127.0276', institutionNm: '서울시 강남구청', phoneNumber: '02-3423-5000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '테헤란로', ctprvnNm: '서울특별시', signguNm: '강남구', speciesNm: '플라타너스', pltngCo: '280', latitude: '37.5060', longitude: '127.0340', institutionNm: '서울시 강남구청', phoneNumber: '02-3423-5000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '올림픽대로', ctprvnNm: '서울특별시', signguNm: '송파구', speciesNm: '벚나무', pltngCo: '450', latitude: '37.5185', longitude: '127.1050', institutionNm: '서울시 송파구청', phoneNumber: '02-2147-2000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '여의대방로', ctprvnNm: '서울특별시', signguNm: '영등포구', speciesNm: '양버즘나무', pltngCo: '195', latitude: '37.5219', longitude: '126.9245', institutionNm: '서울시 영등포구청', phoneNumber: '02-2670-3000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '세종대로', ctprvnNm: '서울특별시', signguNm: '종로구', speciesNm: '은행나무', pltngCo: '150', latitude: '37.5729', longitude: '126.9769', institutionNm: '서울시 종로구청', phoneNumber: '02-2148-1114', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '도산대로', ctprvnNm: '서울특별시', signguNm: '강남구', speciesNm: '느티나무', pltngCo: '210', latitude: '37.5172', longitude: '127.0286', institutionNm: '서울시 강남구청', phoneNumber: '02-3423-5000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '양재대로', ctprvnNm: '서울특별시', signguNm: '서초구', speciesNm: '소나무', pltngCo: '180', latitude: '37.4844', longitude: '127.0345', institutionNm: '서울시 서초구청', phoneNumber: '02-2155-6114', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '한강대로', ctprvnNm: '서울특별시', signguNm: '용산구', speciesNm: '플라타너스', pltngCo: '240', latitude: '37.5340', longitude: '126.9647', institutionNm: '서울시 용산구청', phoneNumber: '02-2199-6114', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '동작대로', ctprvnNm: '서울특별시', signguNm: '동작구', speciesNm: '버드나무', pltngCo: '130', latitude: '37.5035', longitude: '126.9515', institutionNm: '서울시 동작구청', phoneNumber: '02-820-1114', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '천호대로', ctprvnNm: '서울특별시', signguNm: '강동구', speciesNm: '이팝나무', pltngCo: '165', latitude: '37.5385', longitude: '127.1237', institutionNm: '서울시 강동구청', phoneNumber: '02-3425-5000', referenceDate: '2024-01-01' },
  // === 부산 ===
  { roadsidTreeRoadNm: '해운대로', ctprvnNm: '부산광역시', signguNm: '해운대구', speciesNm: '소나무', pltngCo: '350', latitude: '35.1631', longitude: '129.1636', institutionNm: '부산시 해운대구청', phoneNumber: '051-749-4000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '광안해변로', ctprvnNm: '부산광역시', signguNm: '수영구', speciesNm: '벚나무', pltngCo: '200', latitude: '35.1533', longitude: '129.1187', institutionNm: '부산시 수영구청', phoneNumber: '051-610-4000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '중앙대로', ctprvnNm: '부산광역시', signguNm: '중구', speciesNm: '플라타너스', pltngCo: '170', latitude: '35.1028', longitude: '129.0327', institutionNm: '부산시 중구청', phoneNumber: '051-600-4000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '사상로', ctprvnNm: '부산광역시', signguNm: '사상구', speciesNm: '은행나무', pltngCo: '145', latitude: '35.1520', longitude: '128.9911', institutionNm: '부산시 사상구청', phoneNumber: '051-310-4000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '남천로', ctprvnNm: '부산광역시', signguNm: '남구', speciesNm: '단풍나무', pltngCo: '120', latitude: '35.1367', longitude: '129.1050', institutionNm: '부산시 남구청', phoneNumber: '051-607-4000', referenceDate: '2024-01-01' },
  // === 대구 ===
  { roadsidTreeRoadNm: '동대구로', ctprvnNm: '대구광역시', signguNm: '동구', speciesNm: '플라타너스', pltngCo: '280', latitude: '35.8797', longitude: '128.6284', institutionNm: '대구시 동구청', phoneNumber: '053-662-2000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '달구벌대로', ctprvnNm: '대구광역시', signguNm: '중구', speciesNm: '은행나무', pltngCo: '220', latitude: '35.8661', longitude: '128.5933', institutionNm: '대구시 중구청', phoneNumber: '053-661-2000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '수성로', ctprvnNm: '대구광역시', signguNm: '수성구', speciesNm: '메타세쿼이아', pltngCo: '160', latitude: '35.8562', longitude: '128.6316', institutionNm: '대구시 수성구청', phoneNumber: '053-666-2000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '앞산순환로', ctprvnNm: '대구광역시', signguNm: '남구', speciesNm: '참나무', pltngCo: '300', latitude: '35.8377', longitude: '128.5849', institutionNm: '대구시 남구청', phoneNumber: '053-664-2000', referenceDate: '2024-01-01' },
  // === 인천/대전/광주/울산/세종 ===
  { roadsidTreeRoadNm: '인천대로', ctprvnNm: '인천광역시', signguNm: '남동구', speciesNm: '느티나무', pltngCo: '240', latitude: '37.4482', longitude: '126.7315', institutionNm: '인천시 남동구청', phoneNumber: '032-453-2000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '송도국제대로', ctprvnNm: '인천광역시', signguNm: '연수구', speciesNm: '메타세쿼이아', pltngCo: '310', latitude: '37.3818', longitude: '126.6609', institutionNm: '인천시 연수구청', phoneNumber: '032-749-7000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '대덕대로', ctprvnNm: '대전광역시', signguNm: '유성구', speciesNm: '소나무', pltngCo: '270', latitude: '36.3622', longitude: '127.3561', institutionNm: '대전시 유성구청', phoneNumber: '042-611-2000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '한밭대로', ctprvnNm: '대전광역시', signguNm: '서구', speciesNm: '은행나무', pltngCo: '200', latitude: '36.3504', longitude: '127.3845', institutionNm: '대전시 서구청', phoneNumber: '042-288-2000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '무등로', ctprvnNm: '광주광역시', signguNm: '동구', speciesNm: '느티나무', pltngCo: '230', latitude: '35.1468', longitude: '126.9232', institutionNm: '광주시 동구청', phoneNumber: '062-608-2000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '삼산로', ctprvnNm: '울산광역시', signguNm: '남구', speciesNm: '은행나무', pltngCo: '160', latitude: '35.5382', longitude: '129.3115', institutionNm: '울산시 남구청', phoneNumber: '052-226-3000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '세종대로', ctprvnNm: '세종특별자치시', signguNm: '', speciesNm: '이팝나무', pltngCo: '340', latitude: '36.4800', longitude: '127.0000', institutionNm: '세종시청', phoneNumber: '044-120', referenceDate: '2024-01-01' },
  // === 경기/강원/충청/전라/경상/제주 ===
  { roadsidTreeRoadNm: '경수대로', ctprvnNm: '경기도', signguNm: '수원시', speciesNm: '플라타너스', pltngCo: '380', latitude: '37.2636', longitude: '127.0286', institutionNm: '수원시청', phoneNumber: '031-228-2000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '일산로', ctprvnNm: '경기도', signguNm: '고양시', speciesNm: '벚나무', pltngCo: '420', latitude: '37.6580', longitude: '126.8320', institutionNm: '고양시청', phoneNumber: '031-909-9000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '경춘로', ctprvnNm: '강원특별자치도', signguNm: '춘천시', speciesNm: '자작나무', pltngCo: '180', latitude: '37.8813', longitude: '127.7300', institutionNm: '춘천시청', phoneNumber: '033-250-3000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '순천만로', ctprvnNm: '전라남도', signguNm: '순천시', speciesNm: '메타세쿼이아', pltngCo: '350', latitude: '34.9506', longitude: '127.4872', institutionNm: '순천시청', phoneNumber: '061-749-3000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '경주대로', ctprvnNm: '경상북도', signguNm: '경주시', speciesNm: '벚나무', pltngCo: '500', latitude: '35.8562', longitude: '129.2248', institutionNm: '경주시청', phoneNumber: '054-779-6000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '중문관광로', ctprvnNm: '제주특별자치도', signguNm: '서귀포시', speciesNm: '편백', pltngCo: '320', latitude: '33.2541', longitude: '126.4121', institutionNm: '서귀포시청', phoneNumber: '064-760-2000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '제주대로', ctprvnNm: '제주특별자치도', signguNm: '제주시', speciesNm: '삼나무', pltngCo: '280', latitude: '33.4996', longitude: '126.5312', institutionNm: '제주시청', phoneNumber: '064-728-2000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '담양메타세쿼이아로', ctprvnNm: '전라남도', signguNm: '담양군', speciesNm: '메타세쿼이아', pltngCo: '600', latitude: '35.3214', longitude: '126.9884', institutionNm: '담양군청', phoneNumber: '061-380-3000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '진해벚꽃로', ctprvnNm: '경상남도', signguNm: '창원시', speciesNm: '왕벚나무', pltngCo: '800', latitude: '35.1339', longitude: '128.7121', institutionNm: '창원시청', phoneNumber: '055-225-2000', referenceDate: '2024-01-01' },
];

// 보호수 샘플 데이터
const protectedTreeSamples = [
  { prtcTreeNm: '정이품송', ctprvnNm: '충청북도', signguNm: '보은군', speciesNm: '소나무', treeAge: '600', dsgntnDe: '1962-12-03', treCrcmfr: '4.8', treHght: '14.5', latitude: '36.5393', longitude: '127.6867', institutionNm: '보은군청', phoneNumber: '043-540-3000', referenceDate: '2024-01-01' },
  { prtcTreeNm: '삼청동 느티나무', ctprvnNm: '서울특별시', signguNm: '종로구', speciesNm: '느티나무', treeAge: '500', dsgntnDe: '1972-10-05', treCrcmfr: '6.2', treHght: '18', latitude: '37.5828', longitude: '126.9827', institutionNm: '서울시 종로구청', phoneNumber: '02-2148-1114', referenceDate: '2024-01-01' },
  { prtcTreeNm: '양평 용문사 은행나무', ctprvnNm: '경기도', signguNm: '양평군', speciesNm: '은행나무', treeAge: '1100', dsgntnDe: '1962-12-03', treCrcmfr: '14', treHght: '42', latitude: '37.5542', longitude: '127.5770', institutionNm: '양평군청', phoneNumber: '031-770-2000', referenceDate: '2024-01-01' },
  { prtcTreeNm: '창덕궁 향나무', ctprvnNm: '서울특별시', signguNm: '종로구', speciesNm: '향나무', treeAge: '700', dsgntnDe: '1968-03-15', treCrcmfr: '3.5', treHght: '12', latitude: '37.5794', longitude: '126.9910', institutionNm: '문화재청', phoneNumber: '042-481-4650', referenceDate: '2024-01-01' },
  { prtcTreeNm: '안동 하회마을 느티나무', ctprvnNm: '경상북도', signguNm: '안동시', speciesNm: '느티나무', treeAge: '600', dsgntnDe: '1982-11-04', treCrcmfr: '5.8', treHght: '20', latitude: '36.5396', longitude: '128.5180', institutionNm: '안동시청', phoneNumber: '054-840-5000', referenceDate: '2024-01-01' },
  { prtcTreeNm: '전주 한옥마을 은행나무', ctprvnNm: '전북특별자치도', signguNm: '전주시', speciesNm: '은행나무', treeAge: '400', dsgntnDe: '1982-11-04', treCrcmfr: '7.3', treHght: '25', latitude: '35.8151', longitude: '127.1530', institutionNm: '전주시청', phoneNumber: '063-222-1000', referenceDate: '2024-01-01' },
  { prtcTreeNm: '강릉 오죽헌 율곡매', ctprvnNm: '강원특별자치도', signguNm: '강릉시', speciesNm: '매화나무', treeAge: '600', dsgntnDe: '1972-03-22', treCrcmfr: '1.2', treHght: '6', latitude: '37.7799', longitude: '128.8783', institutionNm: '강릉시청', phoneNumber: '033-660-2000', referenceDate: '2024-01-01' },
  { prtcTreeNm: '경주 계림 느티나무', ctprvnNm: '경상북도', signguNm: '경주시', speciesNm: '느티나무', treeAge: '800', dsgntnDe: '1962-12-03', treCrcmfr: '8.5', treHght: '22', latitude: '35.8340', longitude: '129.2190', institutionNm: '경주시청', phoneNumber: '054-779-6000', referenceDate: '2024-01-01' },
  { prtcTreeNm: '제주 비자림 비자나무', ctprvnNm: '제주특별자치도', signguNm: '제주시', speciesNm: '비자나무', treeAge: '800', dsgntnDe: '1993-08-19', treCrcmfr: '6.0', treHght: '14', latitude: '33.4870', longitude: '126.8120', institutionNm: '제주시청', phoneNumber: '064-728-2000', referenceDate: '2024-01-01' },
  { prtcTreeNm: '부여 은행나무', ctprvnNm: '충청남도', signguNm: '부여군', speciesNm: '은행나무', treeAge: '1000', dsgntnDe: '1962-12-03', treCrcmfr: '10.2', treHght: '30', latitude: '36.2756', longitude: '126.9098', institutionNm: '부여군청', phoneNumber: '041-830-2000', referenceDate: '2024-01-01' },
  { prtcTreeNm: '담양 관방제림 팽나무', ctprvnNm: '전라남도', signguNm: '담양군', speciesNm: '팽나무', treeAge: '300', dsgntnDe: '2004-09-01', treCrcmfr: '5.0', treHght: '18', latitude: '35.3184', longitude: '126.9854', institutionNm: '담양군청', phoneNumber: '061-380-3000', referenceDate: '2024-01-01' },
  { prtcTreeNm: '울진 금강소나무', ctprvnNm: '경상북도', signguNm: '울진군', speciesNm: '소나무', treeAge: '500', dsgntnDe: '1988-04-01', treCrcmfr: '4.2', treHght: '16', latitude: '36.9930', longitude: '129.4003', institutionNm: '울진군청', phoneNumber: '054-789-6000', referenceDate: '2024-01-01' },
  { prtcTreeNm: '해남 대흥사 느티나무', ctprvnNm: '전라남도', signguNm: '해남군', speciesNm: '느티나무', treeAge: '500', dsgntnDe: '1982-11-04', treCrcmfr: '6.8', treHght: '19', latitude: '34.4856', longitude: '126.6127', institutionNm: '해남군청', phoneNumber: '061-530-5000', referenceDate: '2024-01-01' },
  { prtcTreeNm: '서귀포 천지연 담팔수', ctprvnNm: '제주특별자치도', signguNm: '서귀포시', speciesNm: '담팔수', treeAge: '300', dsgntnDe: '1971-08-26', treCrcmfr: '3.0', treHght: '15', latitude: '33.2455', longitude: '126.5544', institutionNm: '서귀포시청', phoneNumber: '064-760-2000', referenceDate: '2024-01-01' },
  { prtcTreeNm: '속리산 망개나무', ctprvnNm: '충청북도', signguNm: '보은군', speciesNm: '망개나무', treeAge: '350', dsgntnDe: '1976-06-03', treCrcmfr: '2.5', treHght: '10', latitude: '36.5432', longitude: '127.8603', institutionNm: '보은군청', phoneNumber: '043-540-3000', referenceDate: '2024-01-01' },
];

// 도시공원 샘플 데이터
const urbanParkSamples = [
  { parkNm: '올림픽공원', parkSe: '근린공원', ctprvnNm: '서울특별시', signguNm: '송파구', ar: '1,453,000', latitude: '37.5209', longitude: '127.1212', institutionNm: '서울시 송파구청', phoneNumber: '02-2147-2000', referenceDate: '2024-01-01', rdnmadr: '서울특별시 송파구 올림픽로 424' },
  { parkNm: '서울숲', parkSe: '근린공원', ctprvnNm: '서울특별시', signguNm: '성동구', ar: '595,000', latitude: '37.5444', longitude: '127.0374', institutionNm: '서울시 성동구청', phoneNumber: '02-2286-5000', referenceDate: '2024-01-01', rdnmadr: '서울특별시 성동구 뚝섬로 273' },
  { parkNm: '용산가족공원', parkSe: '근린공원', ctprvnNm: '서울특별시', signguNm: '용산구', ar: '270,000', latitude: '37.5245', longitude: '126.9680', institutionNm: '서울시 용산구청', phoneNumber: '02-2199-6114', referenceDate: '2024-01-01', rdnmadr: '서울특별시 용산구 서빙고로 185' },
  { parkNm: '해운대해수욕장공원', parkSe: '근린공원', ctprvnNm: '부산광역시', signguNm: '해운대구', ar: '120,000', latitude: '35.1587', longitude: '129.1604', institutionNm: '부산시 해운대구청', phoneNumber: '051-749-4000', referenceDate: '2024-01-01', rdnmadr: '부산광역시 해운대구 해운대해변로 264' },
  { parkNm: '대구수성못공원', parkSe: '근린공원', ctprvnNm: '대구광역시', signguNm: '수성구', ar: '218,000', latitude: '35.8293', longitude: '128.6186', institutionNm: '대구시 수성구청', phoneNumber: '053-666-2000', referenceDate: '2024-01-01', rdnmadr: '대구광역시 수성구 두산동' },
  { parkNm: '한밭수목원', parkSe: '근린공원', ctprvnNm: '대전광역시', signguNm: '서구', ar: '387,000', latitude: '36.3638', longitude: '127.3883', institutionNm: '대전시 서구청', phoneNumber: '042-270-8452', referenceDate: '2024-01-01', rdnmadr: '대전광역시 서구 둔산대로 169' },
  { parkNm: '5.18기념공원', parkSe: '도시자연공원', ctprvnNm: '광주광역시', signguNm: '서구', ar: '204,000', latitude: '35.1487', longitude: '126.8899', institutionNm: '광주시 서구청', phoneNumber: '062-360-7000', referenceDate: '2024-01-01', rdnmadr: '광주광역시 서구 상무민주로 61' },
  { parkNm: '수원 화성공원', parkSe: '역사공원', ctprvnNm: '경기도', signguNm: '수원시', ar: '340,000', latitude: '37.2867', longitude: '127.0095', institutionNm: '수원시청', phoneNumber: '031-228-2000', referenceDate: '2024-01-01', rdnmadr: '경기도 수원시 팔달구 정조로 825' },
  { parkNm: '일산호수공원', parkSe: '근린공원', ctprvnNm: '경기도', signguNm: '고양시', ar: '1,034,000', latitude: '37.6725', longitude: '126.7715', institutionNm: '고양시청', phoneNumber: '031-909-9000', referenceDate: '2024-01-01', rdnmadr: '경기도 고양시 일산동구 호수로 595' },
  { parkNm: '제주 한라생태숲', parkSe: '도시자연공원', ctprvnNm: '제주특별자치도', signguNm: '제주시', ar: '196,000', latitude: '33.4310', longitude: '126.5250', institutionNm: '제주시청', phoneNumber: '064-728-2000', referenceDate: '2024-01-01', rdnmadr: '제주특별자치도 제주시 516로 2596' },
];

// 수목원 샘플 데이터
const arboretumSamples = [
  { arboretumNm: '국립수목원', ctprvnNm: '경기도', signguNm: '포천시', mainSpcs: '소나무, 참나무, 단풍나무, 자작나무', ar: '1,157,000', latitude: '37.7500', longitude: '127.1670', institutionNm: '산림청 국립수목원', phoneNumber: '031-540-2000', referenceDate: '2024-01-01', rdnmadr: '경기도 포천시 소흘읍 광릉수목원로 415' },
  { arboretumNm: '천리포수목원', ctprvnNm: '충청남도', signguNm: '태안군', mainSpcs: '목련, 동백나무, 호랑가시나무', ar: '170,000', latitude: '36.8056', longitude: '126.1448', institutionNm: '천리포수목원', phoneNumber: '041-672-9982', referenceDate: '2024-01-01', rdnmadr: '충청남도 태안군 소원면 천리포1길 187' },
  { arboretumNm: '한라수목원', ctprvnNm: '제주특별자치도', signguNm: '제주시', mainSpcs: '편백, 삼나무, 구상나무, 한란', ar: '340,000', latitude: '33.4590', longitude: '126.5320', institutionNm: '제주시 한라수목원', phoneNumber: '064-710-7575', referenceDate: '2024-01-01', rdnmadr: '제주특별자치도 제주시 수목원길 72' },
  { arboretumNm: '아침고요수목원', ctprvnNm: '경기도', signguNm: '가평군', mainSpcs: '소나무, 잣나무, 단풍나무, 진달래', ar: '100,000', latitude: '37.7435', longitude: '127.3389', institutionNm: '아침고요수목원', phoneNumber: '1544-6703', referenceDate: '2024-01-01', rdnmadr: '경기도 가평군 상면 수목원로 432' },
  { arboretumNm: '국립세종수목원', ctprvnNm: '세종특별자치시', signguNm: '', mainSpcs: '느티나무, 배롱나무, 무궁화, 이팝나무', ar: '650,000', latitude: '36.5101', longitude: '127.0044', institutionNm: '산림청 국립세종수목원', phoneNumber: '044-251-0001', referenceDate: '2024-01-01', rdnmadr: '세종특별자치시 연기면 수목원로 136' },
  { arboretumNm: '국립백두대간수목원', ctprvnNm: '경상북도', signguNm: '봉화군', mainSpcs: '구상나무, 주목, 분비나무, 눈향나무', ar: '5,179,000', latitude: '36.9058', longitude: '128.9183', institutionNm: '산림청 국립백두대간수목원', phoneNumber: '054-679-1000', referenceDate: '2024-01-01', rdnmadr: '경상북도 봉화군 춘양면 춘양로 1501' },
  { arboretumNm: '울산테마식물수목원', ctprvnNm: '울산광역시', signguNm: '남구', mainSpcs: '동백나무, 소나무, 배롱나무', ar: '30,000', latitude: '35.5237', longitude: '129.2840', institutionNm: '울산시 남구청', phoneNumber: '052-226-3000', referenceDate: '2024-01-01', rdnmadr: '울산광역시 남구 산업로 140' },
];

// 소스별 샘플 데이터 (export)
export const sampleDataBySource = {
  streetTree: streetTreeSamples,
  protectedTree: protectedTreeSamples,
  urbanPark: urbanParkSamples,
  arboretum: arboretumSamples,
};

// 기존 호환용: 전체 가로수 샘플 데이터
export const sampleData = streetTreeSamples;
