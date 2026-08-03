// 수종별 알레르기 항원 정보 데이터베이스
// 등급: 4(매우높음), 3(높음), 2(보통), 1(낮음), 0(정보 없음)
//
// 0은 "알레르기 유발 안 함"이 아니라 "DB에 등재되지 않아 판정 불가"다.
// DB 항목 중 level 0인 것은 하나도 없으며, 0은 오직 미매칭을 뜻한다.

// Node ESM은 확장자 없는 import를 해석하지 못한다.
// scripts/audit-data.mjs 가 plain Node로 이 모듈을 불러오므로 .js를 명시한다.
import { canonicalizeSpecies } from './speciesCanonical.js';

export const ALLERGEN_LEVELS = {
  4: { label: '매우 높음', color: '#e74c3c', description: '심한 알레르기 반응 유발 가능' },
  3: { label: '높음', color: '#e67e22', description: '알레르기 반응 유발 가능성 높음' },
  2: { label: '보통', color: '#f39c12', description: '일부 민감한 사람에게 영향' },
  1: { label: '낮음', color: '#2ecc71', description: '알레르기 유발 가능성 낮음' },
  0: { label: '정보 없음', color: '#475569', description: 'DB에 등재되지 않은 수종입니다' },
};

// 수종별 알레르기 정보
// keywords: 공공데이터에서 해당 수종으로 매칭할 키워드들
export const ALLERGEN_DATABASE = [
  // === 매우 높음 (4) - 풀/잡초 ===
  {
    name: '쑥',
    englishName: 'Mugwort',
    scientificName: 'Artemisia princeps',
    level: 4,
    pollenMonths: [8, 9, 10],
    symptoms: '비염, 결막염, 천식, 피부염 (한국 가을철 주요 알레르기 원인)',
    keywords: ['쑥', '개똥쑥', '참쑥', '사철쑥'],
  },
  {
    name: '돼지풀',
    englishName: 'Ragweed',
    scientificName: 'Ambrosia artemisiifolia',
    level: 4,
    pollenMonths: [8, 9, 10],
    symptoms: '비염, 결막염, 천식 (매우 강한 알레르기 유발)',
    keywords: ['돼지풀', '단풍잎돼지풀', '두드러기풀'],
  },

  // === 매우 높음 (4) - 나무 ===
  {
    name: '자작나무',
    englishName: 'Birch',
    scientificName: 'Betula platyphylla',
    level: 4,
    pollenMonths: [3, 4, 5],
    symptoms: '비염, 결막염, 천식, 구강알레르기증후군(OAS)',
    keywords: ['자작나무', '자작'],
  },
  {
    name: '오리나무',
    englishName: 'Alder',
    scientificName: 'Alnus japonica',
    level: 4,
    pollenMonths: [2, 3, 4],
    symptoms: '비염, 결막염, 천식',
    keywords: ['오리나무', '오리'],
  },
  {
    name: '삼나무',
    englishName: 'Japanese Cedar',
    scientificName: 'Cryptomeria japonica',
    level: 4,
    pollenMonths: [2, 3, 4],
    symptoms: '비염, 결막염, 천식 (일본 삼나무 꽃가루증의 주원인). 측백나무과(Cupressaceae) 교차반응군 — 이 중 하나에 감작되면 다른 구성원에도 반응할 수 있습니다.',
    keywords: ['삼나무'],
  },
  {
    name: '편백',
    englishName: 'Japanese Cypress',
    scientificName: 'Chamaecyparis obtusa',
    level: 4,
    pollenMonths: [3, 4, 5],
    symptoms: '비염, 결막염, 피부염. 측백나무과(Cupressaceae) 교차반응군 — 이 중 하나에 감작되면 다른 구성원에도 반응할 수 있습니다.',
    keywords: ['편백', '편백나무'],
  },

  // === 높음 (3) - 풀/잡초 ===
  {
    name: '잔디',
    englishName: 'Grass',
    scientificName: 'Poaceae spp.',
    level: 3,
    pollenMonths: [5, 6, 7, 8],
    symptoms: '비염, 결막염, 천식 (화본과 꽃가루 알레르기)',
    keywords: ['잔디', '잔디밭', '우산잔디', '켄터키블루그래스', '라이그래스', '티모시'],
  },
  {
    name: '환삼덩굴',
    englishName: 'Japanese Hop',
    scientificName: 'Humulus scandens',
    level: 3,
    pollenMonths: [8, 9],
    symptoms: '비염, 결막염, 천식',
    keywords: ['환삼덩굴'],
  },
  {
    name: '향나무',
    englishName: 'Juniper',
    scientificName: 'Juniperus chinensis',
    level: 3,
    pollenMonths: [3, 4],
    symptoms: '비염, 결막염. 측백나무과(Cupressaceae) 교차반응군 — 이 중 하나에 감작되면 다른 구성원에도 반응할 수 있습니다.',
    keywords: ['향나무', '눈향나무', '가이즈카향나무'],
  },

  // === 높음 (3) - 나무 ===
  {
    name: '플라타너스',
    englishName: 'Platanus / Sycamore',
    scientificName: 'Platanus occidentalis',
    level: 3,
    pollenMonths: [4, 5],
    symptoms: '비염, 결막염, 천식, 솜털 알레르기',
    keywords: ['플라타너스', '양버즘나무', '버즘나무', '플라타나스'],
  },
  {
    name: '참나무',
    englishName: 'Oak',
    scientificName: 'Quercus spp.',
    level: 3,
    pollenMonths: [4, 5, 6],
    symptoms: '비염, 결막염',
    keywords: ['참나무', '신갈나무', '상수리나무', '떡갈나무', '굴참나무', '갈참나무', '졸참나무'],
  },
  {
    name: '소나무',
    englishName: 'Pine',
    scientificName: 'Pinus densiflora',
    level: 3,
    pollenMonths: [4, 5, 6],
    symptoms: '비염, 결막염 (꽃가루량이 매우 많음)',
    // 반송(Pinus densiflora f. multicaulis)은 소나무의 품종이라 같은 종이다.
    keywords: ['소나무', '잣나무', '리기다소나무', '해송', '곰솔', '적송', '흑송', '반송'],
  },
  {
    name: '느릅나무',
    englishName: 'Elm',
    scientificName: 'Ulmus davidiana',
    level: 3,
    pollenMonths: [3, 4, 5],
    symptoms: '비염, 결막염',
    keywords: ['느릅나무', '느릅'],
  },
  {
    name: '측백나무',
    englishName: 'Oriental Arborvitae',
    scientificName: 'Platycladus orientalis',
    level: 3,
    pollenMonths: [3, 4],
    symptoms: '비염, 결막염. 측백나무과(Cupressaceae) 교차반응군 — 이 중 하나에 감작되면 다른 구성원에도 반응할 수 있습니다.',
    keywords: ['측백나무', '측백'],
  },

  // === 보통 (2) ===
  {
    name: '은행나무',
    englishName: 'Ginkgo',
    scientificName: 'Ginkgo biloba',
    level: 2,
    pollenMonths: [4, 5],
    symptoms: '접촉성 피부염 (열매), 비염',
    keywords: ['은행나무', '은행'],
  },
  {
    name: '버드나무',
    englishName: 'Willow',
    scientificName: 'Salix koreensis',
    level: 2,
    pollenMonths: [3, 4, 5],
    symptoms: '비염, 결막염 (솜털 비산)',
    keywords: ['버드나무', '수양버들', '왕버들', '능수버들'],
  },
  {
    name: '포플러',
    englishName: 'Poplar',
    scientificName: 'Populus spp.',
    level: 2,
    pollenMonths: [3, 4],
    symptoms: '비염, 결막염 (솜털 비산)',
    keywords: ['포플러', '양버들', '사시나무', '이태리포플러', '미루나무', '현사시나무'],
  },
  {
    name: '단풍나무',
    englishName: 'Maple',
    scientificName: 'Acer palmatum',
    level: 2,
    pollenMonths: [4, 5],
    symptoms: '비염 (경미)',
    keywords: ['단풍나무', '단풍', '중국단풍', '복자기', '고로쇠'],
  },
  {
    name: '물푸레나무',
    englishName: 'Ash',
    scientificName: 'Fraxinus rhynchophylla',
    level: 2,
    pollenMonths: [4, 5],
    symptoms: '비염, 결막염',
    keywords: ['물푸레나무', '물푸레', '들메나무'],
  },

  // === 낮음 (1) - 관상식물 ===
  {
    name: '개나리',
    englishName: 'Forsythia',
    scientificName: 'Forsythia koreana',
    level: 1,
    pollenMonths: [3, 4],
    symptoms: '거의 없음 (충매화)',
    keywords: ['개나리'],
  },
  {
    name: '무궁화',
    englishName: 'Rose of Sharon',
    scientificName: 'Hibiscus syriacus',
    level: 1,
    pollenMonths: [7, 8, 9],
    symptoms: '거의 없음 (충매화)',
    keywords: ['무궁화'],
  },
  {
    name: '진달래',
    englishName: 'Azalea',
    scientificName: 'Rhododendron mucronulatum',
    level: 1,
    pollenMonths: [4, 5],
    symptoms: '경미한 비염 (충매화)',
    keywords: ['진달래', '철쭉', '영산홍', '산철쭉', '자산홍', '산철'],
  },

  // === 낮음 (1) - 나무 ===
  {
    name: '벚나무',
    englishName: 'Cherry Blossom',
    scientificName: 'Prunus serrulata',
    level: 1,
    pollenMonths: [3, 4],
    symptoms: '경미한 비염 (충매화로 꽃가루 비산 적음)',
    keywords: ['벚나무', '왕벚나무', '벚꽃', '겹벚나무'],
  },
  {
    name: '이팝나무',
    englishName: 'Snow Bell',
    scientificName: 'Chionanthus retusus',
    level: 1,
    pollenMonths: [5, 6],
    symptoms: '경미한 비염',
    keywords: ['이팝나무', '이팝'],
  },
  {
    name: '느티나무',
    englishName: 'Zelkova',
    scientificName: 'Zelkova serrata',
    level: 1,
    pollenMonths: [4, 5],
    symptoms: '경미한 비염',
    keywords: ['느티나무', '느티'],
  },
  {
    name: '메타세쿼이아',
    englishName: 'Metasequoia',
    scientificName: 'Metasequoia glyptostroboides',
    level: 1,
    pollenMonths: [3, 4],
    symptoms: '경미한 비염',
    keywords: ['메타세쿼이아', '메타세콰이아', '메타쉐콰이어'],
  },
  {
    name: '가중나무',
    englishName: 'Tree of Heaven',
    scientificName: 'Ailanthus altissima',
    level: 1,
    pollenMonths: [5, 6],
    symptoms: '접촉성 피부염 (수액)',
    keywords: ['가중나무', '가죽나무'],
  },
  {
    name: '목련',
    englishName: 'Magnolia',
    scientificName: 'Magnolia kobus',
    level: 1,
    pollenMonths: [3, 4],
    symptoms: '경미한 비염 (충매화)',
    keywords: ['목련', '백목련', '자목련'],
  },
  {
    name: '칠엽수',
    englishName: 'Horse Chestnut',
    scientificName: 'Aesculus turbinata',
    level: 1,
    pollenMonths: [5, 6],
    symptoms: '경미한 비염',
    keywords: ['칠엽수', '마로니에'],
  },
  {
    name: '회화나무',
    englishName: 'Japanese Pagoda Tree',
    scientificName: 'Styphnolobium japonicum',
    level: 1,
    pollenMonths: [7, 8],
    symptoms: '경미한 비염',
    keywords: ['회화나무'],
  },
  {
    name: '배롱나무',
    englishName: 'Crape Myrtle',
    scientificName: 'Lagerstroemia indica',
    level: 1,
    pollenMonths: [7, 8, 9],
    symptoms: '거의 없음 (충매화)',
    keywords: ['배롱나무', '백일홍나무'],
  },
  {
    name: '팽나무',
    englishName: 'Japanese Hackberry',
    scientificName: 'Celtis sinensis',
    level: 1,
    pollenMonths: [4, 5],
    symptoms: '경미한 비염',
    keywords: ['팽나무'],
  },
  {
    name: '튤립나무',
    englishName: 'Tulip Tree',
    scientificName: 'Liriodendron tulipifera',
    level: 1,
    pollenMonths: [5, 6],
    symptoms: '경미한 비염 (충매화)',
    keywords: ['튤립나무', '백합나무'],
  },

  // ===================================================================
  // 아래는 2026-07-24 조사로 추가된 수종.
  // 근거: docs/superpowers/specs/2026-07-24-research-allergen-species.md
  // (PubMed, WHO/IUIS Allergen Nomenclature, 국립생물자원관 『한반도 알레르기
  //  유발 꽃가루』, 국립기상과학원)
  //
  // 등급 1은 "알레르기를 일으키지 않는다"가 아니라 "충매화·조매화라
  // 공기 중 꽃가루 노출이 적어 흡입 알레르겐으로서 위험이 낮다"는 뜻이다.
  // ===================================================================

  // === 높음 (3) - 풍매화 ===
  {
    name: '히말라야시다',
    englishName: 'Deodar Cedar',
    scientificName: 'Cedrus deodara',
    level: 3,
    pollenMonths: [10, 11],
    // Rawat 2000 (PMID 10921460): 아토피 인구 7.5% SPT 양성, 양성자의 65.8%에서
    // 특이 IgE 상승. Bist 2005 (PMID 16252835): 자작나무·오리나무와 동일 선상의
    // 주요 감작원. 한국인 대상 감작률 조사는 없으나 10~11월 개화라 가을철
    // 감별진단에 가치가 있어 등급 3 유지.
    symptoms: '비염, 결막염, 천식 (가을 개화 풍매화. 근거 문헌은 인도 대상이며 한국인 감작률 자료는 없음)',
    keywords: ['히말라야시다', '히말리야시다', '희말라야시다', '히말라야 시다', '개잎갈나무', '설송'],
  },
  {
    name: '가시나무',
    englishName: 'Ring-cupped Oak',
    scientificName: 'Quercus myrsinifolia',
    level: 3,
    pollenMonths: [4, 5],
    // 참나무속 공통 알레르겐 기반 추정. Q. myrsinifolia 종 자체의 직접 감작
    // 연구는 없으며 국립생물자원관도 국내 상록 참나무류의 데이터 공백을 인정.
    // 키워드는 실제로 참나무속인 표기만 등재한다 — 홍가시나무(Photinia)·
    // 호랑가시나무(Ilex)는 전혀 다른 속이므로 별도 항목으로 분리했다.
    symptoms: '비염, 결막염, 천식 (참나무속 공통 알레르겐 기반 추정)',
    keywords: ['가시나무', '종가시나무', '붉가시나무', '가시나무류'],
  },

  // === 낮음 (1) - 충매화 ===
  {
    name: '감나무',
    englishName: 'Persimmon',
    scientificName: 'Diospyros kaki',
    level: 1,
    pollenMonths: [5, 6],
    symptoms: '흡입 노출 보고 없음 (충매화로 공기 중 꽃가루 적음). 감 과일 섭취 알레르기는 별개 경로',
    keywords: ['감나무'],
  },
  {
    name: '층층나무',
    englishName: 'Giant Dogwood',
    scientificName: 'Cornus controversa',
    level: 1,
    pollenMonths: [5, 6],
    symptoms: '흡입 노출 보고 없음 (충매화)',
    keywords: ['층층나무'],
  },
  {
    name: '살구나무',
    englishName: 'Apricot',
    scientificName: 'Prunus armeniaca',
    level: 1,
    pollenMonths: [3, 4],
    // Jiang 2015 (PMID 26742437): 과수원 작업자의 직업성 고농도 노출에서
    // 장미과 화분 교차반응 확인. 도시 가로수 일반 대기 노출과는 노출량이
    // 수 자릿수 차이라 등급 상향 근거로 쓰지 않는다.
    symptoms: '일반 도시 노출에서는 보고 없음 (충매화). 과수원 종사자 등 고농도 직업 노출 시 장미과 화분 직업성 알레르기 보고 있음',
    keywords: ['살구나무'],
  },
  {
    name: '산딸나무',
    englishName: 'Kousa Dogwood',
    scientificName: 'Cornus kousa',
    level: 1,
    pollenMonths: [5, 6],
    symptoms: '흡입 노출 보고 없음 (딱정벌레 매개 충매화)',
    keywords: ['산딸나무'],
  },
  {
    name: '모과나무',
    englishName: 'Chinese Quince',
    scientificName: 'Pseudocydonia sinensis',
    level: 1,
    pollenMonths: [4, 5],
    symptoms: '흡입 노출 보고 없음 (충매화)',
    keywords: ['모과나무'],
  },
  {
    name: '대추나무',
    englishName: 'Jujube',
    scientificName: 'Ziziphus jujuba',
    level: 1,
    pollenMonths: [6, 7],
    symptoms: '흡입 노출 보고 없음 (충매화, 밀원식물)',
    keywords: ['대추나무'],
  },
  {
    name: '꽃사과',
    englishName: 'Flowering Crabapple',
    scientificName: 'Malus floribunda',
    level: 1,
    pollenMonths: [4, 5],
    symptoms: '일반 도시 노출에서는 보고 없음 (충매화). 장미과 화분 교차반응은 직업성 고농도 노출 맥락',
    keywords: ['꽃사과', '꽃사과나무'],
  },
  {
    name: '팥배나무',
    englishName: 'Korean Mountain Ash',
    scientificName: 'Aria alnifolia',
    level: 1,
    pollenMonths: [5],
    symptoms: '흡입 노출 보고 없음 (충매화)',
    keywords: ['팥배나무'],
  },
  {
    name: '때죽나무',
    englishName: 'Japanese Snowbell',
    scientificName: 'Styrax japonicus',
    level: 1,
    pollenMonths: [5, 6],
    symptoms: '흡입 노출 보고 없음 (충매화)',
    keywords: ['때죽나무'],
  },
  {
    name: '후박나무',
    englishName: 'Machilus',
    scientificName: 'Machilus thunbergii',
    level: 1,
    pollenMonths: [5, 6],
    symptoms: '흡입 노출 보고 없음 (충매화, 남부지방 상록활엽수)',
    keywords: ['후박나무'],
  },
  {
    name: '먼나무',
    englishName: 'Kurogane Holly',
    scientificName: 'Ilex rotunda',
    level: 1,
    pollenMonths: [5, 6],
    symptoms: '흡입 노출 보고 없음 (충매화, 자웅이주)',
    keywords: ['먼나무'],
  },
  {
    name: '모감주나무',
    englishName: 'Goldenrain Tree',
    scientificName: 'Koelreuteria paniculata',
    level: 1,
    pollenMonths: [6, 7],
    symptoms: '흡입 노출 보고 없음 (충매화)',
    keywords: ['모감주나무'],
  },
  {
    name: '동백나무',
    englishName: 'Camellia',
    scientificName: 'Camellia japonica',
    level: 1,
    pollenMonths: [12, 1, 2, 3, 4],
    symptoms: '흡입 노출 보고 없음 (조매화로 공기 중 꽃가루가 매우 적음)',
    keywords: ['동백나무', '동백'],
  },
  {
    name: '매화나무',
    englishName: 'Japanese Apricot',
    scientificName: 'Prunus mume',
    level: 1,
    // 살구나무와 같은 Prunus속·같은 등급이지만 개화가 2월부터로 유의하게 이르다.
    // keywords를 살구나무에 병합하면 이 이른 개화가 화면에서 사라진다.
    pollenMonths: [2, 3, 4],
    symptoms: '흡입 노출 보고 없음 (충매화). 국내 목본 중 개화가 가장 이른 축',
    keywords: ['매화나무', '매실나무', '매화'],
  },

  // --- 국명에 "가시"가 들어가지만 참나무속이 아닌 수종 ---
  // 아래 두 항목은 부분일치 폴백보다 정확 매칭이 먼저 걸리게 해서
  // '가시나무'(Quercus, 등급 3)로 오분류되는 것을 막는 역할도 한다.
  // 이 항목이 없으면 74건이 등급 1 → 3으로 잘못 상향된다.
  {
    name: '홍가시나무',
    englishName: 'Japanese Photinia',
    scientificName: 'Photinia glabra',
    level: 1,
    pollenMonths: [5, 6],
    // 장미과 Photinia속. 국명에 "가시나무"가 들어가지만 참나무과가 아니며,
    // "홍"은 새 잎이 붉게 물드는 관상 특성에서 왔다.
    symptoms: '흡입 노출 보고 없음 (충매화, 장미과). 참나무속과 무관',
    keywords: ['홍가시나무', '홍가시', '홍가시나무류', '레드로빈'],
  },
  {
    name: '호랑가시나무',
    englishName: 'Chinese Holly',
    scientificName: 'Ilex cornuta',
    level: 1,
    pollenMonths: [4, 5],
    // 감탕나무과 Ilex속. 먼나무(Ilex rotunda)와 같은 속이라 등급도 같다.
    // 국명의 "가시"는 잎 가장자리 거치에서 온 것이지 참나무와 무관하다.
    // 완도호랑가시나무는 호랑가시나무 × 감탕나무의 자연교잡종.
    symptoms: '흡입 노출 보고 없음 (충매화, 자웅이주). 참나무속과 무관',
    keywords: ['호랑가시나무', '호랑가시', '완도호랑가시나무'],
  },

  // ===================================================================
  // 아래는 2026-08-03 조사로 추가된 침엽수·구과류 수종.
  // 근거: docs/superpowers/specs/2026-08-03-research-conifer.md
  // (PubMed 직접 검색, WHO/IUIS Allergen Nomenclature,
  //  국립생물자원관 『한반도 알레르기 유발 꽃가루』, 국립기상과학원)
  //
  // 전나무속(Abies): 풍매화·기낭형 대립 화분·PubMed 알레르겐 0건·
  //   NIBR 미수록 → 등급 1. 낮음은 "알레르기 없음"이 아니라
  //   "직접 임상 감작 근거 부재, 대립 화분으로 하기도 침착 불리"의 뜻.
  // 구상나무(A. koreana)·분비나무(A. nephrolepis)는 등재 보류 —
  //   전나무 keywords에 통합. 비자나무(Torreya nucifera)도 등재 보류.
  // ===================================================================

  // === Pinaceae — 낮음 (1) ===
  {
    name: '전나무',
    englishName: 'Needle Fir',
    scientificName: 'Abies holophylla',
    level: 1,
    pollenMonths: [4, 5],
    // PubMed 검색('Abies pollen allergy rhinitis IgE') → 0건.
    // WHO/IUIS 공인 알레르겐 없음. NIBR 44종 비수록.
    // 풍매화이나 기낭형(saccate) 이중기낭 대립 화분(40–80 µm)으로
    // 하기도 침착이 불리함. 직접 임상 감작 근거 부재 → 등급 1.
    // 구상나무(A. koreana, 한국 고산 고유종)·분비나무(A. nephrolepis)는
    // 가로수 식재 극히 드물어 등재 보류 — keywords에 통합 처리.
    symptoms: '직접 알레르겐 임상근거 없음 (풍매화이나 기낭형 대립 화분으로 하기도 침착 불리; PubMed 0건)',
    keywords: ['전나무', '구상나무', '분비나무'],
  },
  {
    name: '가문비나무',
    englishName: 'Spruce',
    scientificName: 'Picea jezoensis',
    level: 1,
    pollenMonths: [4, 5],
    // PubMed 검색('Picea spruce pollen allergy sensitization pollinosis') → 0건.
    // WHO/IUIS 공인 알레르겐 없음. NIBR 44종 비수록.
    // 기낭형 이중기낭 대립 화분(50–90 µm). 전나무속과 동일 판단 근거.
    // 독일가문비(P. abies)·종비나무(P. koraiensis)·코니카가문비(P. glauca 'Conica')
    // 모두 동속이나 직접 임상 근거 없어 동일 등급.
    symptoms: '직접 알레르겐 임상근거 없음 (풍매화이나 기낭형 대립 화분; PubMed 0건)',
    keywords: ['가문비나무', '가문비', '독일가문비', '종비나무', '코니카가문비'],
  },
  {
    name: '낙엽송',
    englishName: 'Japanese Larch',
    scientificName: 'Larix kaempferi',
    level: 1,
    pollenMonths: [3, 4],
    // PubMed 검색('Larix pollen allergy pollinosis rhinitis') → 0건.
    // WHO/IUIS 공인 알레르겐 없음. NIBR 44종 비수록.
    // 낙엽침엽수로 잎보다 먼저 개화해 화분 비산이 눈에 띔.
    // 기낭형 이중기낭 대립 화분(50–80 µm).
    // 직접 임상 감작 근거 부재 → 등급 1.
    symptoms: '직접 알레르겐 임상근거 없음 (풍매화이나 기낭형 대립 화분; PubMed 0건)',
    keywords: ['낙엽송', '일본잎갈나무'],
  },

  // === Taxaceae — 보통 (2) ===
  {
    name: '주목',
    englishName: 'Japanese Yew',
    scientificName: 'Taxus cuspidata',
    level: 2,
    pollenMonths: [3, 4],
    // Maguchi S, Fukuda S. Auris Nasus Larynx. 2001 May;28 Suppl:S43-7.
    // PMID 11683342. DOI: 10.1016/s0385-8146(01)00062-1
    // 일본 삿포로, 봄철 알레르기비염 환자 18명 중 5명(27.8%)에서
    // 특이 IgE 항체(immunoblotting) 확인. 1례 화분증 확진.
    // 저자: "봄철 화분증의 minor allergen 중 하나".
    // 자웅이주(수그루만 화분 생산). 한국인 감작률 데이터 없음.
    // 단독 감작 연구 1건으로 등급 2; 3 부여 근거 불충분.
    symptoms: '비염, 결막염 (봄철 minor allergen; 자웅이주로 노출량 제한. 근거 문헌 일본 대상, 한국인 데이터 없음)',
    keywords: ['주목', '선주목', '둥근주목'],
  },

  // === Cupressaceae — 높음 (3) ===
  {
    name: '화백',
    englishName: 'Sawara Cypress',
    scientificName: 'Chamaecyparis pisifera',
    level: 3,
    pollenMonths: [3, 4],
    // 편백(C. obtusa, DB 등급 4)과 동속. Chamaecyparis 속은
    // Cupressaceae 5대 알레르기 속 중 하나 (Charpin 2019,
    // PMID 28401436, DOI: 10.1007/s12016-017-8602-y):
    //   "most important taxa: Cupressus, Hesperocyparis, Juniperus,
    //    Cryptomeria, and Chamaecyparis."
    // Group 1 pectate lyase 알레르겐: Cupressaceae 내 70–97% 서열 동종성.
    // C. pisifera 종 직접 임상연구 없음 (PubMed 0건).
    // 편백보다 노출량 적어 등급 3 (편백 4보다 낮게 배정).
    // 교차반응: 편백·삼나무·향나무·측백나무·서양측백·연필향나무.
    symptoms: '비염, 결막염 (측백나무과 Cupressaceae 교차반응군. 편백·삼나무 감작자에게 교차반응 가능. C. pisifera 종 직접 임상연구 없음)',
    keywords: ['화백', '황금실화백나무', '황금화백'],
  },
  {
    name: '서양측백',
    englishName: 'Eastern White Cedar / Arborvitae',
    scientificName: 'Thuja occidentalis',
    level: 3,
    pollenMonths: [3, 4],
    // Guerin B et al. Int Arch Allergy Immunol. 1996;110(1):91-4.
    // PMID 8645985. DOI: 10.1159/000237317
    // 2증례: 봄철 비염·결막염, thuja 단독감작. RAST(IgE) 확인.
    // Immunoprint·CRIE: cypress와 thuja 추출물 공통 항원성 확인
    //   → Cupressaceae 교차반응 직접 증명.
    // 구 분류: 측백나무(Platycladus orientalis)의 구 학명이
    //   Thuja orientalis였음. DB 측백나무(등급 3)와 일관성 유지.
    // 현재 Cupressaceae Thujoid clade로 Platycladus·Thuja 모두 포함.
    // 에메랄드그린·에메랄드골드 등 품종명은 대부분 T. occidentalis
    // 또는 T. plicata 원예 품종이므로 keywords에 포함.
    symptoms: '비염, 결막염 (측백나무과 Cupressaceae 교차반응군. Guerin 1996: 직접 IgE 확인, 측백나무와 공통 항원성 확인)',
    keywords: [
      '서양측백', '서양측백나무', '에메랄드그린', '에메랄드골드',
      '에매랄드골드', '써니스마라그', '블루엔젤',
    ],
  },
  {
    name: '연필향나무',
    englishName: 'Eastern Red Cedar',
    scientificName: 'Juniperus virginiana',
    level: 3,
    pollenMonths: [2, 3, 4],
    // Midoro-Horiuti T et al. Clin Exp Allergy. 2001;31(5):771-8.
    // PMID 11422137. DOI: 10.1046/j.1365-2222.2001.01079.x
    // Jun v 1: 산 삼나무(J. ashei) Jun a 1과 고도 서열 동종성 → IgE 결합 확인.
    // Jun v 4: 145 kDa 신규 알레르겐, IgE 결합 확인.
    // (Jun v 3는 stop codon 돌연변이로 기능 상실 → J. ashei보다 낮은 알레르겐성)
    // André C et al. Allerg Immunol. 2000;32(3):104-6. PMID 10815237:
    //   J. ashei ↔ C. sempervirens ↔ C. arizonica: 88%+ ELISA 억제 병행
    //   → Cupressaceae 광범위 교차반응 확인.
    // 향나무(J. chinensis, DB 등급 3) 동속 → 일관성 유지.
    // J. virginiana는 J. ashei보다 알레르겐 역가 낮다는 연구(PMID 11422137)
    //   있으나, IgE 결합 확실 + 교차반응 확립으로 등급 3 유지.
    symptoms: '비염, 결막염 (측백나무과 교차반응군. Jun v 1·v 4 IgE 결합 확인. 향나무·삼나무·편백 감작자 교차반응 가능)',
    keywords: ['연필향나무', '연필향'],
  },

  // === Cupressaceae Taxodioideae — 보통 (2) ===
  {
    name: '낙우송',
    englishName: 'Bald Cypress',
    scientificName: 'Taxodium distichum',
    level: 2,
    pollenMonths: [3, 4],
    // Bucholtz GA et al. Ann Allergy. 1985;55(6):805-10. PMID 4073601.
    // 비내유발: 피부반응 양성 알레르기비염 환자 17명 중 12명(71%) 양성.
    //   기관지유발: 천식 환자 10명 중 2명 양성.
    //   RAST 특이 IgE: 비내유발 양성자 12명 중 7명(59%) 확인.
    //   저자: "Bald cypress pollen is an aeroallergen."
    // 측백나무과 Taxodioideae 아과 (삼나무·메타세쿼이아와 같은 계통).
    // 삼나무(Cry j 1 최주요 알레르겐, 등급 4) 수준의 국내 임상 중요도
    //   근거는 없음. 메타세쿼이아(등급 1, 직접 근거 없음)보다는 높음.
    // → 직접 aeroallergen 확인(IgE·비내유발) + 등급 2(보통).
    symptoms: '비염, 천식 (Bucholtz 1985: 비내유발 71% 양성, IgE 59% 확인. 삼나무 수준의 국내 임상 중요도 근거는 없음)',
    keywords: ['낙우송', '낙우송나무', '막우송'],
  },

  // === Pinaceae — 높음 (3): 스트로브잣나무 별도 항목 ===
  {
    name: '스트로브잣나무',
    englishName: 'Eastern White Pine',
    scientificName: 'Pinus strobus',
    level: 3,
    pollenMonths: [4, 5],
    // Gastaminza G et al. Clin Exp Allergy. 2009;39(9):1438-46.
    // PMID 19573163. DOI: 10.1111/j.1365-2222.2009.03308.x
    // 소나무 화분 알레르기 환자 65명 대상: P. radiata·P. strobus
    //   특이 IgE 양성 77%. 주요 알레르겐 42 kDa(환자 85%).
    //   Pinus 속 내 교차반응 높음. Cupressus와는 교차반응 없음.
    // 소나무(P. densiflora, DB 등급 3) 동속 → 등급 3 일관성.
    //
    // [keyword 매칭 분석]
    // '스트로브잣나무'.includes('잣나무') → TRUE
    //   → 소나무 항목으로 이미 inferred match(등급 3) 됨.
    // '스트로브잣'.includes('잣나무') → FALSE → 미매칭(등급 0)
    // '스잣'.includes('잣나무') → FALSE → 미매칭(등급 0)
    // → 이 항목은 약어형을 잡기 위한 별도 등재.
    symptoms: '비염, 결막염 (소나무속 교차반응군; PMID 19573163: P. strobus IgE 77% 양성. Pinus 속 내 교차반응 높음)',
    keywords: ['스트로브잣나무', '스트로브잣', '스잣'],
  },

  // ===================================================================
  // 아래는 2026-08-03 조사로 추가된 수종.
  // 근거: docs/superpowers/specs/2026-08-03-research-broadleaf.md
  // (PubMed 실시간 조회, WHO/IUIS Allergen Nomenclature,
  //  국립생물자원관 『한반도 알레르기 유발 꽃가루』, 국립기상과학원)
  // ===================================================================

  // === 매우 높음 (4) - 자작나무속 누락 수종 긴급 추가 ===
  {
    name: '물박달나무',
    englishName: 'Dahurian Birch',
    scientificName: 'Betula davurica',
    level: 4,
    pollenMonths: [4, 5],
    // 자작나무속(Betula) 동속. DB 자작나무(B. platyphylla, 등급 4) false negative 정합 추가.
    // Bet v 1(PR-10, 17kDa), Bet v 2(profilin), Bet v 4(polcalcin)는 자작나무속 내
    // 고도로 보존된 알레르겐. 한국 소아 연구(PMID 28480649, Sung M 2017)에서 birch
    // 감작이 한국 5대 수목 알레르겐으로 확인. 종 특이 직접 감작 데이터는 없으나
    // 속 수준 보존성으로 DB 정합성상 등급 4 부여 필수.
    symptoms: '비염, 결막염, 천식, 구강알레르기증후군(OAS) (자작나무속 공통 Bet v 1 알레르겐 교차반응. 종 특이 한국인 감작률 자료 없음)',
    keywords: ['물박달나무', '물박달'],
  },
  {
    name: '박달나무',
    englishName: 'Schmidt Birch',
    scientificName: 'Betula schmidtii',
    level: 4,
    pollenMonths: [4, 5],
    // 자작나무속(Betula) 동속. 위 물박달나무와 같은 근거 적용.
    symptoms: '비염, 결막염, 천식, 구강알레르기증후군(OAS) (자작나무속 공통 Bet v 1 알레르겐 교차반응. 종 특이 한국인 감작률 자료 없음)',
    keywords: ['박달나무', '박달'],
  },

  // === 높음 (3) - 활엽 풍매화 ===
  {
    name: '서어나무',
    englishName: 'Korean Hornbeam',
    scientificName: 'Carpinus laxiflora',
    level: 3,
    pollenMonths: [4, 5],
    // WHO/IUIS 공인 알레르겐: C. betulus Car b 1 (PR-10, 17.5 kDa, Bet v 1 상동체).
    // 비자작나무(birch-free) 지역에서 Car b 1이 자작나무 Bet v 1보다 더 강한
    // IgE 반응을 유도한 임상 연구(Wallner M et al. Allergy 2009, PMID 19170672).
    // 자작나무 없는 지역 5,335명 코호트에서 서어나무(hornbeam) 반응 확인
    // (Mari A et al. Clin Exp Allergy 2003, PMID 14519150).
    // C. laxiflora 종 자체에 대한 직접 임상 연구는 없으며 서어나무속(Carpinus)
    // 공통 알레르겐 기반 추정. 한국인 감작률 자료 없음.
    symptoms: '비염, 결막염, 천식 (서어나무속 Car b 1 알레르겐 기반 추정. 비자작나무 지역에서도 1차 감작원으로 기능 가능. 한국인 직접 감작률 자료 없음)',
    keywords: ['서어나무', '서어', '왕서어나무', '개서어나무'],
  },
  {
    name: '소사나무',
    englishName: 'Little-leaf Hornbeam',
    scientificName: 'Carpinus turczaninowii',
    level: 3,
    pollenMonths: [4, 5],
    // 서어나무(*C. laxiflora*)와 동속(Carpinus). Car b 1 알레르겐 교차반응 동일 적용.
    // 종 자체 직접 임상 연구 없음. 서어나무속 공통 알레르겐 기반 추정.
    symptoms: '비염, 결막염, 천식 (서어나무속 Car b 1 알레르겐 기반 추정. 한국인 직접 감작률 자료 없음)',
    keywords: ['소사나무', '소사', '까치박달나무', '까치박달'],
  },
  {
    name: '너도밤나무',
    englishName: 'Korean Beech',
    scientificName: 'Fagus multinervis',
    level: 3,
    pollenMonths: [4, 5],
    // WHO/IUIS 공인 알레르겐: F. sylvatica Fag s 1 (PR-10, 17 kDa, Bet v 1 상동체).
    // Fag s 1 NMR 구조 확립(Moraes AH et al. 2015, PMID 26289775). 단, Fag s 1은
    // 주로 교차반응성 알레르겐으로 기능하며 1차 감작 능력은 Car b 1보다 약함.
    // 비자작나무 지역 코호트에서 beech 반응 확인(PMID 14519150).
    // 한국 자생 F. multinervis는 울릉도 한정 분포로 가로수 식재가 희귀함.
    symptoms: '비염, 결막염 (너도밤나무속 Fag s 1 PR-10 기반 추정. 주로 Fagales 교차반응성 알레르겐. 한국인 직접 감작률 자료 없음)',
    keywords: ['너도밤나무', '너도밤'],
  },
  {
    name: '비술나무',
    englishName: 'Siberian Elm',
    scientificName: 'Ulmus pumila',
    level: 3,
    pollenMonths: [3, 4],
    // 느릅나무속(Ulmus) 동속. DB 느릅나무(U. davidiana, 등급 3) false negative 정합 추가.
    // WHO/IUIS 공인: Ulm d 1(U. davidiana), Ulm m 1(U. minor).
    // 한국 5개 지역 학동기 아동 14,678명 연구(Sung M et al. JKMS 2017, PMID 28480649)에서
    // elm(느릅나무속) 감작이 5대 수목 알레르겐으로 지역 간 유의한 차이 확인.
    // 동아시아 맥락: 중국 충칭 천둥번개 천식 연구(Zhou W 2025, PMID 41429540)에서
    // Ulmus 화분이 봄철 유의 감작원으로 확인. U. pumila 종 특이 직접 데이터 없으나
    // DB 정합성·한국 임상 근거 기반 등급 3 필수.
    symptoms: '비염, 결막염 (느릅나무속 공통 알레르겐 기반. 한국 5대 수목 알레르겐(elm) 중 하나로 확인. U. pumila 종 특이 감작률 자료 없음)',
    keywords: ['비술나무', '비술'],
  },
  {
    name: '뽕나무',
    englishName: 'White Mulberry',
    scientificName: 'Morus alba',
    level: 3,
    pollenMonths: [4, 5],
    // WHO/IUIS: Mor a 1 (Morus alba, PR-10 계열 알레르겐) 등재.
    // 꾸지나무(B. papyrifera, 동과 Moraceae) 주요 알레르겐 Bro p 3(nsLTP1)이
    // Morus alba 화분과 강한 교차반응 임상 확인(Jiang Z et al. Mol Immunol 2025,
    // PMID 40294488). Bro p 3-sIgE와 Morus alba sIgE 유의 상관.
    // IgE inhibition으로 Morus alba 화분 알레르겐 공유 입증.
    // 풍매화(자웅이주·단성화 수상화서). 한국인 직접 감작률 자료 없음.
    symptoms: '비염, 결막염, 천식 (뽕나무과 Moraceae 교차반응 임상 확인. M. alba 화분 직접 임상 연구 없으며 꾸지나무 교차반응 기반 추정. 한국인 감작률 자료 없음)',
    keywords: ['뽕나무', '수양뽕나무', '수양뽕', '산뽕나무'],
  },

  // === 보통 (2) - 풍매화, 임상 데이터 제한적 ===
  {
    name: '구실잣밤나무',
    englishName: 'Japanese Chinquapin',
    scientificName: 'Castanopsis sieboldii',
    level: 2,
    pollenMonths: [3, 4, 5],
    // 참나무과(Fagaceae) 풍매화. 동과에 Quercus(등급 3), Fagus(등급 3),
    // Castanea(WHO/IUIS Cas s 5, nsLTP) 등재.
    // Castanopsis 속 자체 직접 임상 연구 없음. Fagaceae 과 수준 외삽.
    // NIBR 가이드북: 국내 상록 참나무류 데이터 공백 공식 인정.
    symptoms: '비염, 결막염 (참나무과 Fagaceae 풍매화 특성 기반 추정. 구실잣밤나무 종 자체 직접 감작 연구 없음. 한국인 감작률 자료 없음)',
    keywords: ['구실잣밤나무', '구실잣밤', '구실'],
  },
  {
    name: '시무나무',
    englishName: 'David Hemiptelea',
    scientificName: 'Hemiptelea davidii',
    level: 2,
    pollenMonths: [3, 4],
    // 느릅나무과(Ulmaceae) 풍매화. 동과 Ulmus davidiana 등급 3.
    // Hemiptelea davidii 자체 직접 임상 연구 없음. Ulmaceae 과 수준 외삽.
    symptoms: '비염 (느릅나무과 Ulmaceae 풍매화 특성 기반 추정. 시무나무 종 자체 직접 감작 연구 없음. 한국인 감작률 자료 없음)',
    keywords: ['시무나무', '시무'],
  },
  {
    name: '미국풍나무',
    englishName: 'American Sweetgum',
    scientificName: 'Liquidambar styraciflua',
    level: 2,
    pollenMonths: [3, 4],
    // 풍나무과(Altingiaceae) 풍매화. 구형 두상화서, 이른 봄 개화.
    // 북미 알레르기 피부반응 검사 패널 포함 수종(sweetgum).
    // PubMed 임상 문헌 미확인. 한국 도입수종. 한국인 감작 데이터 없음.
    symptoms: '비염 (풍매화 확정. 북미 알레르기 패널에 수록된 알레르겐. PubMed 임상 문헌 없으며 한국인 감작률 자료 없음)',
    keywords: ['미국풍나무', '미국풍', '풍나무'],
  },
  {
    name: '벽오동',
    englishName: 'Chinese Parasol Tree',
    scientificName: 'Firmiana simplex',
    level: 2,
    pollenMonths: [6, 7],
    // 아욱과(Malvaceae, 구 Sterculiaceae) 풍매화.
    // 수꽃은 무화피(apetalous) 소형 원추화서로 풍매화 형태 형질 명확.
    // 직접 임상 감작 PubMed 문헌 없음. 한국인 감작 데이터 없음.
    symptoms: '비염 (무화피 풍매화 형태 특성 기반 추정. 임상 감작 근거 없음. 한국인 감작률 자료 없음)',
    keywords: ['벽오동', '벽오동나무'],
  },
  {
    name: '푸조나무',
    englishName: 'Muku Tree',
    scientificName: 'Aphananthe aspera',
    level: 2,
    pollenMonths: [4, 5],
    // 삼과(Cannabaceae) 풍매화. 환삼덩굴(Humulus scandens, 등급 3) 동과.
    // Moraceae 연구(PMID 40294488)에서 Humulus scandens와 Broussonetia 교차반응 확인.
    // Aphananthe 직접 임상 연구 없음. 삼과 교차반응 가능성 기반 추정.
    symptoms: '비염 (삼과 Cannabaceae 풍매화. 환삼덩굴 동과 교차반응 가능성 있으나 미입증. 한국인 감작률 자료 없음)',
    keywords: ['푸조나무', '푸조'],
  },
  {
    name: '계수나무',
    englishName: 'Katsura Tree',
    scientificName: 'Cercidiphyllum japonicum',
    level: 2,
    pollenMonths: [3, 4],
    // 계수나무과(Cercidiphyllaceae) 풍매화. 자웅이주, 무화피, 잎 전개 전 이른 봄 개화.
    // 일본 봄철 화분 모니터링 포함 수종. 직접 임상 감작 PubMed 문헌 없음.
    symptoms: '비염 (풍매화 확정 — 자웅이주·무화피·선개화. 임상 감작 근거 없음. 한국인 감작률 자료 없음)',
    keywords: ['계수나무', '계수'],
  },
  {
    name: '회양목',
    englishName: 'Korean Boxwood',
    scientificName: 'Buxus koreana',
    level: 2,
    pollenMonths: [3, 4],
    // 회양목과(Buxaceae) 풍매화. 이른 봄 무화피 수꽃 군생.
    // 유럽 B. sempervirens는 지중해 도시수목 알레르기 유발성 평가에 포함됨.
    // B. koreana 직접 임상 연구 없음. 한국인 감작 데이터 없음.
    symptoms: '비염 (풍매화 확정. 유럽 동속 B. sempervirens 알레르기 평가 수록. 한국 종 직접 임상 근거 없음)',
    keywords: ['회양목'],
  },

  // === 낮음 (1) - 충매화 ===
  {
    name: '오동나무',
    englishName: 'Korean Empress Tree',
    scientificName: 'Paulownia coreana',
    level: 1,
    pollenMonths: [4, 5],
    symptoms: '흡입 알레르기 보고 없음 (충매화 — 대형 자주색 통상화, 화밀 분비, 벌·나방 매개)',
    keywords: ['오동나무', '오동', '참오동'],
  },
  {
    name: '다릅나무',
    englishName: 'Amur Maackia',
    scientificName: 'Maackia amurensis',
    level: 1,
    pollenMonths: [6, 7],
    symptoms: '흡입 알레르기 보고 없음 (충매화 — 콩과 나비형 화관)',
    keywords: ['다릅나무', '다릅'],
  },
  {
    name: '황벽나무',
    englishName: 'Amur Cork Tree',
    scientificName: 'Phellodendron amurense',
    level: 1,
    pollenMonths: [5, 6],
    symptoms: '흡입 알레르기 보고 없음 (운향과 충매화. 화분 알레르기 임상 문헌 없음)',
    keywords: ['황벽나무', '황벽'],
  },
  {
    name: '피나무',
    englishName: 'Amur Linden',
    scientificName: 'Tilia amurensis',
    level: 1,
    pollenMonths: [6, 7],
    symptoms: '흡입 알레르기 보고 없음 (충매화 밀원식물. 근접 접촉 시 화분 노출 가능하나 공기 중 흡입 알레르기 임상 근거 없음)',
    keywords: ['피나무', '찰피나무', '염주나무'],
  },
  {
    name: '사철나무',
    englishName: 'Japanese Spindle Tree',
    scientificName: 'Euonymus japonicus',
    level: 1,
    pollenMonths: [5, 6],
    // ⚠️ PMID 2058813(Herold 1991)은 E. europaeus 목분(wood dust) 직업성 알레르기 단일
    // 증례이며, 화분 알레르기 및 E. japonicus와 무관. DB 등급 근거로 사용 불가.
    symptoms: '흡입 알레르기 보고 없음 (충매화 — 꿀샘 발달 소형 꽃. 목분 직업성 알레르기 보고는 별개 경로이며 화분과 무관)',
    keywords: ['사철나무', '황금사철', '황금사철나무'],
  },
  {
    name: '아까시나무',
    englishName: 'Black Locust',
    scientificName: 'Robinia pseudoacacia',
    level: 1,
    pollenMonths: [5, 6],
    symptoms: '흡입 알레르기 보고 없음 (충매화 밀원식물. 봄 꽃향기 자극 반응은 IgE 비매개 신경성 반응일 가능성. 화분 흡입 알레르기 임상 근거 없음)',
    keywords: ['아까시나무', '아카시아'],
  },

  // ===================================================================
  // 아래는 2026-08-03 조사로 추가된 수종.
  // 근거: docs/superpowers/specs/2026-08-03-research-entomo-a.md
  // (PubMed, WHO/IUIS Allergen Nomenclature, 국립생물자원관 『한반도 알레르기
  //  유발 꽃가루』, 국립기상과학원)
  //
  // 충매화 등급 1: "알레르기를 일으키지 않는다"가 아니라 "충매화라
  // 공기 중 꽃가루 노출이 적어 흡입 알레르겐으로서 위험이 낮다"는 뜻이다.
  // ===================================================================

  // === 보통 (2) - 물푸레나무과 ===
  {
    name: '광나무',
    englishName: 'Japanese Privet / Korean Privet',
    scientificName: 'Ligustrum japonicum',
    level: 2,
    pollenMonths: [6, 7],
    // Vara 2015 (PMID 26520268): 도시 대기에서 Lig v 1(Ole e 1 상동체) 직접 검출.
    // Robledo-Retana 2020 (PMID 32055279): "전 세계 알레르기 호흡기 질환과 연관된
    // 흡입 알레르겐의 주요 공급원"으로 평가. Lig v 1 WHO/IUIS 공인 알레르겐.
    // 한국종(L. japonicum, L. obtusifolium) 직접 감작률 데이터는 없으며
    // 유럽 L. vulgare 문헌 기반 속(屬) 수준 추정. 물푸레나무(Fra e 1) 교차반응 주의.
    symptoms: '비염, 결막염 (충매화이나 화분 일부 기류 비산 확인. Lig v 1 WHO/IUIS 공인 흡입 알레르겐. 물푸레나무·올리브 감작자 교차반응 주의. 한국종 직접 감작률 데이터 없음)',
    keywords: ['광나무', '쥐똥나무', '흰쥐똥나무', '미국쥐똥나무', '당광나무'],
  },

  // === 낮음 (1) - 충매화 ===
  {
    name: '산수유',
    englishName: 'Japanese Cornelian Cherry',
    scientificName: 'Cornus officinalis',
    level: 1,
    pollenMonths: [2, 3],
    // PubMed 검색 0건. Cornus 속 화분 알레르겐 보고 전무.
    // 층층나무(C. controversa, 등급 1), 산딸나무(C. kousa, 등급 1)와 동속 동등급.
    symptoms: '흡입 노출 보고 없음 (충매화, 이른 봄 개화)',
    keywords: ['산수유', '산수유나무'],
  },
  {
    name: '산사나무',
    englishName: 'Chinese Hawthorn',
    scientificName: 'Crataegus pinnatifida',
    level: 1,
    pollenMonths: [4, 5],
    // PubMed 검색 0건. Crataegus 속 화분 알레르겐 보고 없음.
    symptoms: '흡입 노출 보고 없음 (충매화)',
    keywords: ['산사나무', '산사', '산사자나무'],
  },
  {
    name: '마가목',
    englishName: 'Korean Mountain Ash',
    scientificName: 'Sorbus commixta',
    level: 1,
    pollenMonths: [5, 6],
    // PubMed 검색 0건. Sorbus 속 화분 알레르겐 보고 없음.
    // Sor a 1은 마가목 열매(sorb apple) 식품 알레르겐으로 화분 흡입 경로와 무관.
    symptoms: '흡입 노출 보고 없음 (충매화). 마가목 열매 OAS는 섭취 경로로 별개',
    keywords: ['마가목'],
  },
  {
    name: '돌배나무',
    englishName: 'Sand Pear',
    scientificName: 'Pyrus pyrifolia var. culta',
    level: 1,
    pollenMonths: [4],
    // PubMed 검색: Pyrus 화분 알레르겐 보고 없음.
    // Pyr c 1(PR-10)은 배 과일 알레르겐(자작나무 교차, OAS)으로 화분 흡입 알레르겐 아님.
    symptoms: '흡입 노출 보고 없음 (충매화). 배 과일 OAS는 자작나무 감작 기반 섭취 경로',
    keywords: ['돌배나무', '돌배', '배나무', '산배나무', '참배나무'],
  },
  {
    name: '자엽자두',
    englishName: 'Purple-leaf Plum',
    scientificName: "Prunus cerasifera 'Atropurpurea'",
    level: 1,
    pollenMonths: [3, 4],
    // 같은 Prunus 속 직업성 노출 문헌(PMID 26742437, 33067336)이 있으나
    // P. cerasifera 직접 대상 아님. 충매화이며 도시 가로수 일반 노출 보고 없음.
    symptoms: '흡입 노출 보고 없음 (충매화, 이른 봄 개화). Prunus 속 직업성 노출과 무관',
    keywords: ['자엽자두', '자두나무', '서양자두', '자두', '베니스모모', '아메리카노자두'],
  },
  {
    name: '복사나무',
    englishName: 'Peach Tree',
    scientificName: 'Prunus persica',
    level: 1,
    pollenMonths: [3, 4],
    // Victorio-Puche 2020 (PMID 33067336): Pru p 9(WHO/IUIS 공인 화분 알레르겐)가
    // 과수원 작업자 직업성 고농도 노출에서 비염·천식 유발 확인.
    // Jiang 2015 (PMID 26742437): 복숭아 화분이 장미과 교차반응의 기준 종.
    // 두 연구 모두 과수원 작업자 수분기 직업성 노출 → 도시 가로수 일반 대기 노출과
    // 수 자릿수 차이. 충매화로 도시 환경 일반 노출 보고 없음.
    symptoms: '일반 도시 노출에서 흡입 알레르기 보고 없음 (충매화). 과수원 종사자 등 고농도 직업 노출 시 Pru p 9 매개 비염·천식 보고(PMID 33067336). 복숭아 과일 OAS는 섭취 경로로 별개',
    keywords: ['복사나무', '복숭아', '복숭아나무', '개복숭아', '산복숭아', '꽃복숭아', '꽃복숭아나무', '홍도화', '홍도화나무'],
  },
  {
    name: '사과나무',
    englishName: 'Apple',
    scientificName: 'Malus domestica',
    level: 1,
    pollenMonths: [4, 5],
    // PubMed: Malus 화분 알레르겐 보고 없음.
    // Mal d 1/3/4는 사과 과일 알레르겐(섭취 경로). 꽃사과(M. floribunda, 등급 1)와 동속.
    symptoms: '흡입 노출 보고 없음 (충매화, 강한 자가불화합성으로 방화곤충 의존). 사과 과일 OAS는 자작나무 감작 기반 섭취 경로',
    keywords: ['사과나무', '사과'],
  },
  {
    name: '아그배나무',
    englishName: 'Siebold Crabapple',
    scientificName: 'Malus sieboldii',
    level: 1,
    pollenMonths: [4, 5],
    // 사과나무(M. domestica)와 동속 동등급. 충매화 확립, 화분 알레르겐 보고 없음.
    symptoms: '흡입 노출 보고 없음 (충매화)',
    keywords: ['아그배나무', '아그배', '애기사과'],
  },
  {
    name: '귀룽나무',
    englishName: 'Bird Cherry',
    scientificName: 'Prunus padus',
    level: 1,
    pollenMonths: [4, 5],
    // PubMed 0건. Prunus padus 화분 알레르겐 보고 없음.
    // 북유럽에서 도시 가로수로 흔하나 화분 알레르기 연구 없음.
    symptoms: '흡입 노출 보고 없음 (충매화, 향기성 총상화서)',
    keywords: ['귀룽나무', '귀룽', '구룡나무'],
  },
  {
    name: '이스라지',
    englishName: 'Japanese Bush Cherry',
    scientificName: 'Prunus japonica',
    level: 1,
    pollenMonths: [4, 5],
    // 소관목. PubMed 화분 알레르겐 보고 없음. 같은 Prunus 속 충매화 선례 적용.
    symptoms: '흡입 노출 보고 없음 (충매화, 소관목으로 식재량 적음)',
    keywords: ['이스라지'],
  },
  {
    name: '조팝나무',
    englishName: 'Bridal Wreath Spirea',
    scientificName: 'Spiraea prunifolia',
    level: 1,
    pollenMonths: [3, 4],
    // PubMed 0건. Spiraea 속 화분 알레르겐 보고 없음.
    symptoms: '흡입 노출 보고 없음 (충매화)',
    keywords: ['조팝나무', '조팝', '조팝나무꽃'],
  },
  {
    name: '피라칸다',
    englishName: 'Narrowleaf Firethorn',
    scientificName: 'Pyracantha angustifolia',
    level: 1,
    pollenMonths: [5, 6],
    // PubMed 0건. Pyracantha 속 화분 알레르겐 보고 없음.
    // 가시로 인한 외상·접촉 피부염 보고가 있으나 화분 알레르기와 무관.
    symptoms: '흡입 노출 보고 없음 (충매화)',
    keywords: ['피라칸다', '피라칸사', '피라칸사스', '피라칸타'],
  },
  {
    name: '노각나무',
    englishName: 'Korean Stewartia',
    scientificName: 'Stewartia koreana',
    level: 1,
    pollenMonths: [6, 7, 8],
    // PubMed 0건. Stewartia 속 화분 알레르겐 보고 없음.
    // 차나무과(Theaceae) 동백나무(C. japonica, 등급 1)와 같은 과. 충매화 확립.
    symptoms: '흡입 노출 보고 없음 (충매화, 차나무과)',
    keywords: ['노각나무', '노각'],
  },
  {
    name: '말채나무',
    englishName: 'Walter Dogwood / Tatarian Dogwood',
    scientificName: 'Cornus walteri',
    level: 1,
    pollenMonths: [5, 6],
    // PubMed 0건. Cornus 속 화분 알레르겐 보고 전무(층층나무·산딸나무·산수유와 동속).
    symptoms: '흡입 노출 보고 없음 (충매화)',
    keywords: ['말채나무', '말채', '흰말채나무', '흰말채', '미드윈터파이어', '혈줄기층층나무'],
  },
  {
    name: '라일락',
    englishName: 'Lilac',
    scientificName: 'Syringa vulgaris',
    level: 1,
    pollenMonths: [4, 5],
    // González 2001 (PMID 11251633): Syr v 1(Ole e 1 상동체)이 교차반응 맥락에서
    // 기재되나, 이는 올리브 감작 환자 혈청 사용 — Syringa 화분 자체에 의한 일차
    // 기도 감작 보고 아님. 충매화(대형 점착성 화분)이며 도시 대기 노출 연구 없음.
    // Syr v 1은 IUIS 미등재로 확인됨.
    symptoms: '흡입 노출 보고 없음 (충매화, 대형 점착성 화분). Syr v 1(Ole e 1 상동체)이 문헌에 기재되어 물푸레나무(Fra e 1) 감작자의 이론적 교차반응은 가능하나 일차 기도 감작 임상 보고 없음',
    keywords: ['라일락', '수수꽃다리', '꽃개회나무', '미스킴라일락', '라일락나무'],
  },
  {
    name: '목서',
    englishName: 'Sweet Osmanthus / Fragrant Olive',
    scientificName: 'Osmanthus fragrans',
    level: 1,
    pollenMonths: [9, 10],
    // PubMed: Osmanthus fragrans 화분 알레르겐 보고 0건.
    // PMID 18693537(Morfin Maciel 2007)은 멕시코 올리브 감작 환자에서
    // O. americanus와의 교차반응 가능성을 추정한 것으로 O. fragrans 직접 연구 아님.
    // 강한 향기의 충매화. 가을 개화. Oleaceae이나 Ligustrum(Lig v 1)과 달리
    // 도시 대기 화분 검출 보고 없음.
    symptoms: '흡입 노출 보고 없음 (충매화, 강향 가을 개화). 향기 민감성은 화분 알레르기와 별개 경로',
    keywords: ['목서', '은목서', '금목서', '구골나무'],
  },

  // ===================================================================
  // 아래는 2026-08-03 조사로 추가된 수종.
  // 근거: docs/superpowers/specs/2026-08-03-research-entomo-b.md
  // 핵심 근거 문헌 — PubMed(PMID 아래 명시), WHO/IUIS Allergen DB,
  // 국립생물자원관(NIBR) 『한반도 알레르기 유발 꽃가루』,
  // 국립기상과학원(NIMS), Cho SH et al. AARD 2015
  // ===================================================================

  // === 높음 (3) — 화본과 풍매화 ===
  {
    name: '억새',
    englishName: 'Japanese Silver Grass',
    scientificName: 'Miscanthus sinensis',
    level: 3,
    pollenMonths: [9, 10, 11],
    // Cho SH et al. "Pollen allergy plants in Korea." AARD. 2015;3(4):239-254:
    // 억새를 알레르기 평가 필요 화본과로 명시.
    // 화본과 그룹 1 교차반응 근거:
    //   Flicker S et al. J Allergy Clin Immunol. 2006;117:1336. PMID 16750995.
    //   Narayanan M et al. J Immunol. 2017;198:1685. PMID 28093528.
    // Miscanthus sinensis 종 자체의 직접 감작 임상 연구는 없음(PubMed 0건).
    // 화본과(Poaceae) 공통 그룹 1 알레르겐 교차반응 기반 추정 등급.
    symptoms: '비염, 결막염, 천식 (화본과 화분 알레르기. 잔디·티모시 등과 교차반응). ※ 종 수준 직접 감작 연구 없음.',
    keywords: ['억새', '참억새', '물억새'],
  },
  {
    name: '핑크뮬리',
    englishName: 'Gulf Muhly Grass',
    scientificName: 'Muhlenbergia capillaris',
    level: 3,
    pollenMonths: [9, 10, 11],
    // 화본과(Poaceae) 풍매화. Muhlenbergia 속 및 종 수준의 화분 알레르기
    // 임상 연구는 PubMed에서 0건. 화본과 그룹 1 교차반응 기반 추정 등급.
    // (Flicker 2006, PMID 16750995; Narayanan 2017, PMID 28093528)
    // 한국 식재 역사 짧고(2010년대 이후), 감작률 데이터 전무.
    symptoms: '비염, 결막염, 천식 (화본과 화분 알레르기. 잔디·억새 등과 교차반응). ※ 속·종 수준 직접 감작 연구 없음; 한국 감작률 데이터 전무.',
    keywords: ['핑크뮬리', '핑크뮬리그래스', '분홍쥐꼬리새'],
  },

  // === 보통 (2) — 야자과 풍매화 ===
  {
    name: '야자류',
    englishName: 'Windmill Palm / Mexican Fan Palm',
    scientificName: 'Arecaceae (Trachycarpus / Washingtonia)',
    level: 2,
    pollenMonths: [3, 4, 5],
    // 科(Arecaceae) 수준 근거:
    //   Phoenix dactylifera 화분 감작: Huertas AJ et al. Allergol Immunopathol.
    //   2011;39:145-9. PMID 21354689. (Pho d 2가 환자 83.3%에서 인식)
    //   Phoenix canariensis 직업성 천식·비결막염: Blanco C et al. Allergy.
    //   1995;50:277-80. PMID 7677245. (Phoenix 속간 교차반응 확인)
    //   코코넛(Cocos nucifera) 화분 12종 알레르겐: Saha B et al. J Proteome Res.
    //   2015;14:4823. PMID 26426307.
    // Trachycarpus / Washingtonia 속 자체의 직접 감작 연구는 PubMed 0건.
    // Trachycarpus는 풍매화 확정, Washingtonia는 풍매·충매 혼합.
    // 한국 임상 감작률 데이터 없음.
    symptoms: '비염, 결막염, 천식 (Arecaceae 화분 흡입). Pho d 2(profilin) 교차반응으로 식물성 식품 OAS 동반 가능. ※ Trachycarpus·Washingtonia 속 직접 감작 연구 없음; 과(科) 수준 추정 등급.',
    keywords: ['종려나무', '종려', '당종려', '왜종려', '워싱턴야자', '워싱톤야자', '야자나무', '야자'],
  },

  // === 낮음 (1) — 충매화 ===
  {
    name: '담팔수',
    englishName: 'Elaeocarpus',
    scientificName: 'Elaeocarpus sylvestris var. ellipticus',
    level: 1,
    pollenMonths: [5, 6],
    symptoms: '흡입 노출 보고 없음 (충매화). PubMed 화분 알레르기 문헌 0건.',
    keywords: ['담팔수'],
  },
  {
    name: '녹나무',
    englishName: 'Camphor Tree',
    scientificName: 'Cinnamomum camphora',
    level: 1,
    pollenMonths: [4, 5],
    // 장뇌(camphor) 향기는 VOC 흡입 자극이며 IgE 매개 화분 알레르기와 다른 경로.
    symptoms: '흡입 노출 보고 없음 (충매화). 장뇌 향기에 의한 자극성 증상은 화분 알레르기 아님.',
    keywords: ['녹나무'],
  },
  {
    name: '참식나무',
    englishName: 'Neolitsea',
    scientificName: 'Neolitsea sericea',
    level: 1,
    pollenMonths: [3, 4],
    symptoms: '흡입 노출 보고 없음 (충매화, 자웅이주)',
    keywords: ['참식나무', '참식'],
  },
  {
    name: '감탕나무',
    englishName: 'Mochi Tree Holly',
    scientificName: 'Ilex integra',
    level: 1,
    pollenMonths: [4, 5],
    // Ilex속: 먼나무(Ilex rotunda)·호랑가시나무(Ilex cornuta) 등급 1 선행.
    symptoms: '흡입 노출 보고 없음 (충매화, 자웅이주). Ilex속 내 일관 등급.',
    keywords: ['감탕나무', '감탕'],
  },
  {
    name: '아왜나무',
    englishName: 'Sweet Viburnum',
    scientificName: 'Viburnum odoratissimum',
    level: 1,
    pollenMonths: [4, 5],
    symptoms: '흡입 노출 보고 없음 (충매화)',
    keywords: ['아왜나무', '아왜'],
  },
  {
    name: '불두화',
    englishName: 'Japanese Snowball',
    scientificName: 'Viburnum opulus f. hydrangeoides',
    level: 1,
    pollenMonths: [5],
    // 완전 불임성(sterile) 품종 — 꽃 전체가 장식화이며 화분 생산 없음.
    symptoms: '화분 생산 없음 (전 꽃차례가 불임성 장식화. 실질 화분 노출 위험 없음)',
    keywords: ['불두화'],
  },
  {
    name: '태산목',
    englishName: 'Southern Magnolia',
    scientificName: 'Magnolia grandiflora',
    level: 1,
    pollenMonths: [5, 6, 7],
    // Magnolia kobus(목련) 등급 1 선행. 갑충 매개 충매화, 화분립 대형·점착성.
    symptoms: '흡입 노출 보고 없음 (갑충 매개 충매화, 대형 점착성 화분). Magnolia속 내 일관 등급.',
    keywords: ['태산목'],
  },
  {
    name: '함박꽃나무',
    englishName: 'Oyama Magnolia',
    scientificName: 'Magnolia sieboldii',
    level: 1,
    pollenMonths: [5, 6],
    symptoms: '흡입 노출 보고 없음 (충매화). Magnolia속 내 일관 등급.',
    keywords: ['함박꽃나무', '함박'],
  },
  {
    name: '황칠나무',
    englishName: 'Korean Dendropanax',
    scientificName: 'Dendropanax trifidus',
    level: 1,
    pollenMonths: [6, 7],
    symptoms: '흡입 노출 보고 없음 (충매화)',
    keywords: ['황칠나무', '황칠'],
  },
  {
    name: '하귤',
    englishName: 'Natsu Mikan',
    scientificName: 'Citrus natsudaidai',
    level: 1,
    pollenMonths: [4, 5],
    // Citrus 섭취 알레르기(LTP)는 흡입 알레르기와 별개 경로.
    symptoms: '흡입 노출 보고 없음 (충매화). 감귤류 과일 섭취 알레르기는 별개 경로.',
    keywords: ['하귤', '하귤나무', '나쓰미캉'],
  },
  {
    name: '돈나무',
    englishName: 'Japanese Pittosporum',
    scientificName: 'Pittosporum tobira',
    level: 1,
    pollenMonths: [4, 5],
    symptoms: '흡입 노출 보고 없음 (충매화). PubMed 화분 알레르기 문헌 0건.',
    keywords: ['돈나무'],
  },
  {
    name: '자귀나무',
    englishName: 'Silk Tree',
    scientificName: 'Albizia julibrissin',
    level: 1,
    pollenMonths: [6, 7, 8],
    // 화분립이 연합화분(polyad) 형태로 공기 중 비산 거의 없음.
    symptoms: '흡입 노출 보고 없음 (충매화, 연합화분으로 공기 중 비산 없음)',
    keywords: ['자귀나무', '복자귀', '자귀'],
  },
  {
    name: '칠자화',
    englishName: 'Seven Sons Flower',
    scientificName: 'Heptacodium miconioides',
    level: 1,
    pollenMonths: [8, 9],
    symptoms: '흡입 노출 보고 없음 (충매화)',
    keywords: ['칠자화'],
  },
  {
    name: '남천',
    englishName: 'Heavenly Bamboo',
    scientificName: 'Nandina domestica',
    level: 1,
    pollenMonths: [5, 6, 7],
    symptoms: '흡입 노출 보고 없음 (충매화)',
    keywords: ['남천'],
  },
  {
    name: '매자나무',
    englishName: 'Korean Barberry',
    scientificName: 'Berberis koreana',
    level: 1,
    pollenMonths: [4, 5],
    symptoms: '흡입 노출 보고 없음 (충매화)',
    keywords: ['매자나무', '홍매자', '매자'],
  },
  {
    name: '낙상홍',
    englishName: 'Japanese Winterberry',
    scientificName: 'Ilex serrata',
    level: 1,
    pollenMonths: [5, 6],
    // Ilex속: 먼나무·호랑가시나무 등급 1 선행. 자웅이주, 조경 시 암그루 선호.
    symptoms: '흡입 노출 보고 없음 (충매화, 자웅이주). Ilex속 내 일관 등급.',
    keywords: ['낙상홍'],
  },
  {
    name: '능소화',
    englishName: 'Chinese Trumpet Vine',
    scientificName: 'Campsis grandiflora',
    level: 1,
    pollenMonths: [7, 8, 9],
    symptoms: '흡입 노출 보고 없음 (충매화)',
    keywords: ['능소화'],
  },
  {
    name: '꽃개오동',
    englishName: 'Southern Catalpa',
    scientificName: 'Catalpa bignonioides',
    level: 1,
    pollenMonths: [6, 7],
    symptoms: '흡입 노출 보고 없음 (충매화)',
    keywords: ['꽃개오동', '개오동', '노나무'],
  },
  {
    name: '치자나무',
    englishName: 'Gardenia',
    scientificName: 'Gardenia jasminoides',
    level: 1,
    pollenMonths: [6, 7],
    // 겹꽃 품종(꽃치자)은 불임화 경향으로 화분 생산 더 적음.
    symptoms: '흡입 노출 보고 없음 (충매화). 겹꽃 원예 품종은 화분 생산량 더 적음.',
    keywords: ['치자나무', '치자', '꽃치자'],
  },
  {
    name: '화살나무',
    englishName: 'Winged Spindle Tree',
    scientificName: 'Euonymus alatus',
    level: 1,
    pollenMonths: [4, 5],
    symptoms: '흡입 노출 보고 없음 (충매화)',
    keywords: ['화살나무', '화살'],
  },
  {
    name: '헛개나무',
    englishName: 'Japanese Raisin Tree',
    scientificName: 'Hovenia dulcis',
    level: 1,
    pollenMonths: [6, 7],
    symptoms: '흡입 노출 보고 없음 (충매화, 밀원식물)',
    keywords: ['헛개나무', '헛개'],
  },
  {
    name: '박태기나무',
    englishName: 'Chinese Redbud',
    scientificName: 'Cercis chinensis',
    level: 1,
    pollenMonths: [3, 4],
    symptoms: '흡입 노출 보고 없음 (충매화, 간생화)',
    keywords: ['박태기나무', '박태기'],
  },
  {
    name: '수국',
    englishName: 'Hydrangea',
    scientificName: 'Hydrangea macrophylla / H. paniculata',
    level: 1,
    pollenMonths: [6, 7, 8],
    // 수국(mophead) 구형 꽃차례는 거의 전부 불임성 장식화.
    // 나무수국은 일부 가임화 있으나 충매화.
    symptoms: '흡입 노출 보고 없음 (충매화. 수국은 대부분 불임성 장식화로 화분 생산 극히 적음)',
    keywords: ['수국', '나무수국', '떡갈잎수국', '등수국'],
  },
  {
    name: '꽃댕강나무',
    englishName: 'Glossy Abelia',
    scientificName: 'Abelia × grandiflora',
    level: 1,
    pollenMonths: [7, 8, 9, 10],
    symptoms: '흡입 노출 보고 없음 (충매화)',
    keywords: ['꽃댕강나무', '꽃댕강', '애벨리아'],
  },
  {
    name: '달맞이꽃',
    englishName: 'Evening Primrose',
    scientificName: 'Oenothera biennis',
    level: 1,
    pollenMonths: [6, 7, 8, 9],
    // 야행성 나방 매개 충매화. 화분립에 viscin thread(점착사)가 있어
    // 공기 중 비산 불가.
    symptoms: '흡입 노출 보고 없음 (야행성 충매화, 나방 매개. 점착성 화분으로 공기 중 비산 없음)',
    keywords: ['달맞이꽃', '달맞이'],
  },
  {
    name: '송엽국',
    englishName: 'Trailing Ice Plant',
    scientificName: 'Lampranthus spectabilis',
    level: 1,
    pollenMonths: [3, 4, 5],
    symptoms: '흡입 노출 보고 없음 (충매화)',
    keywords: ['송엽국'],
  },
  {
    name: '장미',
    englishName: 'Rose',
    scientificName: 'Rosa hybrida',
    level: 1,
    pollenMonths: [5, 6, 7, 8, 9, 10],
    // 겹꽃 원예 품종은 수술이 화판화하여 화분 생산 더 적음.
    symptoms: '흡입 노출 보고 없음 (충매화. 겹꽃 원예 품종은 화분 생산 매우 적음). 장미 직업성 피부염은 별개 경로.',
    keywords: ['장미'],
  },
  {
    name: '패랭이꽃',
    englishName: 'Pink / Carnation',
    scientificName: 'Dianthus spp.',
    level: 1,
    pollenMonths: [5, 6, 7, 8, 9],
    symptoms: '흡입 노출 보고 없음 (충매화)',
    keywords: ['패랭이', '패랭이꽃', '수염패랭이', '술패랭이'],
  },
  {
    name: '체리세이지',
    englishName: 'Cherry Sage',
    scientificName: 'Salvia microphylla',
    level: 1,
    pollenMonths: [5, 6, 7, 8, 9, 10, 11],
    // Salvia는 레버식 수술(trigger stamen)로 벌이 누르면 화분 전달 — 충매화 전형.
    symptoms: '흡입 노출 보고 없음 (충매화, 벌 레버식 수분 기작)',
    keywords: ['체리세이지'],
  },
];

// 별칭 → DB 항목 정확 매칭 인덱스.
// name·keywords를 모두 키로 넣는다. 최초 등록이 이긴다(DB는 등급 내림차순 정렬).
const EXACT_INDEX = (() => {
  const map = new Map();
  for (const entry of ALLERGEN_DATABASE) {
    for (const key of [entry.name, ...entry.keywords]) {
      if (!map.has(key)) map.set(key, entry);
    }
  }
  return map;
})();

// 단일 수종명에 대해 3단계로 매칭한다.
//   1. 정규화 후 정확 매칭 (exact)   — 축약형·오타를 흡수한다
//   2. 기존 부분일치 폴백 (inferred) — 대왕참나무→참나무 같은 케이스 보존
//   3. 미매칭 (none)
//
// 부분일치를 없애면 안 된다. 현재 부분일치로 정상 동작하는 라벨이 1,646개다.
// 진짜 결함은 부분일치 자체가 아니라 방향이었다 — 라벨.includes(키워드)만 봐서
// 라벨이 키워드보다 짧은 축약형('양버즘' vs '양버즘나무')이 전부 탈락했다.
export function getAllergenMatch(speciesName) {
  if (!speciesName) return { info: null, matchType: 'none' };

  const { species } = canonicalizeSpecies(speciesName);
  const candidates = species.length > 0 ? species : [String(speciesName).trim()];

  for (const name of candidates) {
    const hit = EXACT_INDEX.get(name);
    if (hit) return { info: hit, matchType: 'exact' };
  }

  for (const name of candidates) {
    for (const entry of ALLERGEN_DATABASE) {
      for (const keyword of entry.keywords) {
        if (name.includes(keyword)) return { info: entry, matchType: 'inferred' };
      }
    }
  }

  return { info: null, matchType: 'none' };
}

// 수종명으로 알레르기 정보를 조회 (기존 시그니처 유지)
export function getAllergenInfo(speciesName) {
  return getAllergenMatch(speciesName).info;
}

// 알레르기 등급 반환 (매칭 안 되면 0 = 정보 없음)
export function getAllergenLevel(speciesName) {
  const info = getAllergenInfo(speciesName);
  return info ? info.level : 0;
}

// 복수 수종에 대해 각각의 정보를 반환한다.
// "은행나무+이팝나무"처럼 한 칸에 여러 종이 적힌 경우 두 번째 이후 종의
// 꽃가루 시기·증상이 소실되던 문제를 막는다.
export function getAllergenInfos(speciesList) {
  return (speciesList || []).map((species) => ({
    species,
    ...getAllergenMatch(species),
  }));
}

// 꽃가루 시기를 한글 문자열로 변환
export function getPollenSeasonText(months) {
  if (!months || months.length === 0) return '정보 없음';
  const monthNames = months.map((m) => `${m}월`);
  return monthNames.join(', ');
}
