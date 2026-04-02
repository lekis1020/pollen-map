// 개발용 샘플 데이터 (실제 API 응답 형식과 동일)
// 전국 주요 도시의 대표 가로수길 데이터

export const sampleData = [
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

  // === 인천 ===
  { roadsidTreeRoadNm: '인천대로', ctprvnNm: '인천광역시', signguNm: '남동구', speciesNm: '느티나무', pltngCo: '240', latitude: '37.4482', longitude: '126.7315', institutionNm: '인천시 남동구청', phoneNumber: '032-453-2000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '송도국제대로', ctprvnNm: '인천광역시', signguNm: '연수구', speciesNm: '메타세쿼이아', pltngCo: '310', latitude: '37.3818', longitude: '126.6609', institutionNm: '인천시 연수구청', phoneNumber: '032-749-7000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '경원대로', ctprvnNm: '인천광역시', signguNm: '부평구', speciesNm: '플라타너스', pltngCo: '190', latitude: '37.5074', longitude: '126.7242', institutionNm: '인천시 부평구청', phoneNumber: '032-509-6000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '중봉대로', ctprvnNm: '인천광역시', signguNm: '서구', speciesNm: '자작나무', pltngCo: '85', latitude: '37.5451', longitude: '126.6762', institutionNm: '인천시 서구청', phoneNumber: '032-560-4000', referenceDate: '2024-01-01' },

  // === 대전 ===
  { roadsidTreeRoadNm: '대덕대로', ctprvnNm: '대전광역시', signguNm: '유성구', speciesNm: '소나무', pltngCo: '270', latitude: '36.3622', longitude: '127.3561', institutionNm: '대전시 유성구청', phoneNumber: '042-611-2000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '한밭대로', ctprvnNm: '대전광역시', signguNm: '서구', speciesNm: '은행나무', pltngCo: '200', latitude: '36.3504', longitude: '127.3845', institutionNm: '대전시 서구청', phoneNumber: '042-288-2000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '엑스포로', ctprvnNm: '대전광역시', signguNm: '유성구', speciesNm: '벚나무', pltngCo: '180', latitude: '36.3755', longitude: '127.3885', institutionNm: '대전시 유성구청', phoneNumber: '042-611-2000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '동서대로', ctprvnNm: '대전광역시', signguNm: '중구', speciesNm: '느릅나무', pltngCo: '110', latitude: '36.3258', longitude: '127.4214', institutionNm: '대전시 중구청', phoneNumber: '042-606-6000', referenceDate: '2024-01-01' },

  // === 광주 ===
  { roadsidTreeRoadNm: '무등로', ctprvnNm: '광주광역시', signguNm: '동구', speciesNm: '느티나무', pltngCo: '230', latitude: '35.1468', longitude: '126.9232', institutionNm: '광주시 동구청', phoneNumber: '062-608-2000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '상무대로', ctprvnNm: '광주광역시', signguNm: '서구', speciesNm: '플라타너스', pltngCo: '195', latitude: '35.1468', longitude: '126.8541', institutionNm: '광주시 서구청', phoneNumber: '062-360-7000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '빛고을로', ctprvnNm: '광주광역시', signguNm: '북구', speciesNm: '벚나무', pltngCo: '250', latitude: '35.1745', longitude: '126.9120', institutionNm: '광주시 북구청', phoneNumber: '062-410-6000', referenceDate: '2024-01-01' },

  // === 울산 ===
  { roadsidTreeRoadNm: '삼산로', ctprvnNm: '울산광역시', signguNm: '남구', speciesNm: '은행나무', pltngCo: '160', latitude: '35.5382', longitude: '129.3115', institutionNm: '울산시 남구청', phoneNumber: '052-226-3000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '태화로', ctprvnNm: '울산광역시', signguNm: '중구', speciesNm: '버드나무', pltngCo: '140', latitude: '35.5593', longitude: '129.3170', institutionNm: '울산시 중구청', phoneNumber: '052-290-3000', referenceDate: '2024-01-01' },

  // === 세종 ===
  { roadsidTreeRoadNm: '세종대로', ctprvnNm: '세종특별자치시', signguNm: '', speciesNm: '이팝나무', pltngCo: '340', latitude: '36.4800', longitude: '127.0000', institutionNm: '세종시청', phoneNumber: '044-120', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '한누리대로', ctprvnNm: '세종특별자치시', signguNm: '', speciesNm: '메타세쿼이아', pltngCo: '280', latitude: '36.4970', longitude: '127.0100', institutionNm: '세종시청', phoneNumber: '044-120', referenceDate: '2024-01-01' },

  // === 경기도 ===
  { roadsidTreeRoadNm: '경수대로', ctprvnNm: '경기도', signguNm: '수원시', speciesNm: '플라타너스', pltngCo: '380', latitude: '37.2636', longitude: '127.0286', institutionNm: '수원시청', phoneNumber: '031-228-2000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '일산로', ctprvnNm: '경기도', signguNm: '고양시', speciesNm: '벚나무', pltngCo: '420', latitude: '37.6580', longitude: '126.8320', institutionNm: '고양시청', phoneNumber: '031-909-9000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '분당내곡로', ctprvnNm: '경기도', signguNm: '성남시', speciesNm: '소나무', pltngCo: '150', latitude: '37.3820', longitude: '127.1190', institutionNm: '성남시청', phoneNumber: '031-729-2000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '판교로', ctprvnNm: '경기도', signguNm: '성남시', speciesNm: '단풍나무', pltngCo: '200', latitude: '37.3949', longitude: '127.1112', institutionNm: '성남시청', phoneNumber: '031-729-2000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '동탄대로', ctprvnNm: '경기도', signguNm: '화성시', speciesNm: '느티나무', pltngCo: '290', latitude: '37.2066', longitude: '127.0720', institutionNm: '화성시청', phoneNumber: '031-369-2000', referenceDate: '2024-01-01' },

  // === 강원도 ===
  { roadsidTreeRoadNm: '경춘로', ctprvnNm: '강원특별자치도', signguNm: '춘천시', speciesNm: '자작나무', pltngCo: '180', latitude: '37.8813', longitude: '127.7300', institutionNm: '춘천시청', phoneNumber: '033-250-3000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '속초해변로', ctprvnNm: '강원특별자치도', signguNm: '속초시', speciesNm: '소나무', pltngCo: '210', latitude: '38.2070', longitude: '128.5918', institutionNm: '속초시청', phoneNumber: '033-639-2000', referenceDate: '2024-01-01' },

  // === 충청도 ===
  { roadsidTreeRoadNm: '성환읍내로', ctprvnNm: '충청남도', signguNm: '천안시', speciesNm: '은행나무', pltngCo: '160', latitude: '36.8151', longitude: '127.1139', institutionNm: '천안시청', phoneNumber: '041-521-2000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '청주대로', ctprvnNm: '충청북도', signguNm: '청주시', speciesNm: '플라타너스', pltngCo: '230', latitude: '36.6358', longitude: '127.4914', institutionNm: '청주시청', phoneNumber: '043-201-2000', referenceDate: '2024-01-01' },

  // === 전라도 ===
  { roadsidTreeRoadNm: '전주한옥마을길', ctprvnNm: '전북특별자치도', signguNm: '전주시', speciesNm: '느티나무', pltngCo: '130', latitude: '35.8151', longitude: '127.1530', institutionNm: '전주시청', phoneNumber: '063-222-1000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '순천만로', ctprvnNm: '전라남도', signguNm: '순천시', speciesNm: '메타세쿼이아', pltngCo: '350', latitude: '34.9506', longitude: '127.4872', institutionNm: '순천시청', phoneNumber: '061-749-3000', referenceDate: '2024-01-01' },

  // === 경상도 ===
  { roadsidTreeRoadNm: '경주대로', ctprvnNm: '경상북도', signguNm: '경주시', speciesNm: '벚나무', pltngCo: '500', latitude: '35.8562', longitude: '129.2248', institutionNm: '경주시청', phoneNumber: '054-779-6000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '창원대로', ctprvnNm: '경상남도', signguNm: '창원시', speciesNm: '은행나무', pltngCo: '270', latitude: '35.2280', longitude: '128.6811', institutionNm: '창원시청', phoneNumber: '055-225-2000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '거제대로', ctprvnNm: '경상남도', signguNm: '거제시', speciesNm: '편백', pltngCo: '180', latitude: '34.8806', longitude: '128.6211', institutionNm: '거제시청', phoneNumber: '055-639-3000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '통영해안로', ctprvnNm: '경상남도', signguNm: '통영시', speciesNm: '삼나무', pltngCo: '150', latitude: '34.8544', longitude: '128.4336', institutionNm: '통영시청', phoneNumber: '055-650-4000', referenceDate: '2024-01-01' },

  // === 제주 ===
  { roadsidTreeRoadNm: '중문관광로', ctprvnNm: '제주특별자치도', signguNm: '서귀포시', speciesNm: '편백', pltngCo: '320', latitude: '33.2541', longitude: '126.4121', institutionNm: '서귀포시청', phoneNumber: '064-760-2000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '제주대로', ctprvnNm: '제주특별자치도', signguNm: '제주시', speciesNm: '삼나무', pltngCo: '280', latitude: '33.4996', longitude: '126.5312', institutionNm: '제주시청', phoneNumber: '064-728-2000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '비자림로', ctprvnNm: '제주특별자치도', signguNm: '제주시', speciesNm: '소나무', pltngCo: '400', latitude: '33.4380', longitude: '126.7960', institutionNm: '제주시청', phoneNumber: '064-728-2000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '서귀포칠십리로', ctprvnNm: '제주특별자치도', signguNm: '서귀포시', speciesNm: '오리나무', pltngCo: '95', latitude: '33.2460', longitude: '126.5637', institutionNm: '서귀포시청', phoneNumber: '064-760-2000', referenceDate: '2024-01-01' },

  // === 추가 다양한 수종 데이터 ===
  { roadsidTreeRoadNm: '안동하회로', ctprvnNm: '경상북도', signguNm: '안동시', speciesNm: '회화나무', pltngCo: '80', latitude: '36.5684', longitude: '128.7294', institutionNm: '안동시청', phoneNumber: '054-840-5000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '담양메타세쿼이아로', ctprvnNm: '전라남도', signguNm: '담양군', speciesNm: '메타세쿼이아', pltngCo: '600', latitude: '35.3214', longitude: '126.9884', institutionNm: '담양군청', phoneNumber: '061-380-3000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '남이섬로', ctprvnNm: '강원특별자치도', signguNm: '춘천시', speciesNm: '포플러', pltngCo: '150', latitude: '37.7930', longitude: '127.5250', institutionNm: '춘천시청', phoneNumber: '033-250-3000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '가평잣나무숲길', ctprvnNm: '경기도', signguNm: '가평군', speciesNm: '잣나무', pltngCo: '250', latitude: '37.8316', longitude: '127.5097', institutionNm: '가평군청', phoneNumber: '031-580-2000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '목포해안로', ctprvnNm: '전라남도', signguNm: '목포시', speciesNm: '팽나무', pltngCo: '110', latitude: '34.8118', longitude: '126.3922', institutionNm: '목포시청', phoneNumber: '061-270-2000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '진해벚꽃로', ctprvnNm: '경상남도', signguNm: '창원시', speciesNm: '왕벚나무', pltngCo: '800', latitude: '35.1339', longitude: '128.7121', institutionNm: '창원시청', phoneNumber: '055-225-2000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '제천청풍로', ctprvnNm: '충청북도', signguNm: '제천시', speciesNm: '물푸레나무', pltngCo: '90', latitude: '37.1325', longitude: '128.2121', institutionNm: '제천시청', phoneNumber: '043-641-5000', referenceDate: '2024-01-01' },
  { roadsidTreeRoadNm: '아산온천로', ctprvnNm: '충청남도', signguNm: '아산시', speciesNm: '튤립나무', pltngCo: '120', latitude: '36.7898', longitude: '127.0018', institutionNm: '아산시청', phoneNumber: '041-540-2000', referenceDate: '2024-01-01' },
];
