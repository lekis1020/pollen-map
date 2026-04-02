// 수종별 알레르기 항원 정보 데이터베이스
// 등급: 4(매우높음), 3(높음), 2(보통), 1(낮음), 0(없음/미확인)

export const ALLERGEN_LEVELS = {
  4: { label: '매우 높음', color: '#e74c3c', description: '심한 알레르기 반응 유발 가능' },
  3: { label: '높음', color: '#e67e22', description: '알레르기 반응 유발 가능성 높음' },
  2: { label: '보통', color: '#f39c12', description: '일부 민감한 사람에게 영향' },
  1: { label: '낮음', color: '#2ecc71', description: '알레르기 유발 가능성 낮음' },
  0: { label: '해당없음', color: '#3498db', description: '알레르기 항원 미확인' },
};

// 수종별 알레르기 정보
// keywords: 공공데이터에서 해당 수종으로 매칭할 키워드들
export const ALLERGEN_DATABASE = [
  // === 매우 높음 (4) ===
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

  // === 높음 (3) ===
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

  // === 낮음 (1) ===
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
];

// 수종명으로 알레르기 정보를 조회
export function getAllergenInfo(speciesName) {
  if (!speciesName) return null;
  const normalized = speciesName.trim();
  for (const entry of ALLERGEN_DATABASE) {
    for (const keyword of entry.keywords) {
      if (normalized.includes(keyword)) {
        return entry;
      }
    }
  }
  return null;
}

// 알레르기 등급 반환 (매칭 안 되면 0)
export function getAllergenLevel(speciesName) {
  const info = getAllergenInfo(speciesName);
  return info ? info.level : 0;
}

// 꽃가루 시기를 한글 문자열로 변환
export function getPollenSeasonText(months) {
  if (!months || months.length === 0) return '정보 없음';
  const monthNames = months.map((m) => `${m}월`);
  return monthNames.join(', ');
}
