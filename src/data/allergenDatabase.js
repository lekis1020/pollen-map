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
    symptoms: '비염, 결막염, 천식 (일본 삼나무 꽃가루증의 주원인)',
    keywords: ['삼나무'],
  },
  {
    name: '편백',
    englishName: 'Japanese Cypress',
    scientificName: 'Chamaecyparis obtusa',
    level: 4,
    pollenMonths: [3, 4, 5],
    symptoms: '비염, 결막염, 피부염',
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
    symptoms: '비염, 결막염',
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
    keywords: ['소나무', '잣나무', '리기다소나무', '해송', '곰솔', '적송', '흑송'],
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
    symptoms: '비염, 결막염',
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
    keywords: ['진달래', '철쭉', '영산홍'],
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
    keywords: ['홍가시나무', '홍가시'],
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
