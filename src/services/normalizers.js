// 소스별 API 응답 정규화 함수

let idCounter = 0;

const CITY_NAMES = {
  서울: '서울특별시', 부산: '부산광역시', 대구: '대구광역시', 인천: '인천광역시',
  광주: '광주광역시', 대전: '대전광역시', 울산: '울산광역시', 세종: '세종특별자치시',
  경기: '경기도', 강원: '강원특별자치도', 충북: '충청북도', 충남: '충청남도',
  전북: '전북특별자치도', 전남: '전라남도', 경북: '경상북도', 경남: '경상남도', 제주: '제주특별자치도',
};

function getCityFromAddress(address = '') {
  const legacyPrefixes = {
    경기도: '경기', 강원도: '강원', 충청북도: '충북', 충청남도: '충남',
    전라북도: '전북', 전라남도: '전남', 경상북도: '경북', 경상남도: '경남', 제주도: '제주',
  };
  const firstToken = address.split(/\s+/)[0];
  return CITY_NAMES[firstToken] || CITY_NAMES[legacyPrefixes[firstToken]] || firstToken;
}

export function normalizeStreetTree(item) {
  const startLat = parseFloat(item.startLatitude || item.startLa) || null;
  const startLng = parseFloat(item.startLongitude || item.startLo) || null;
  const endLat = parseFloat(item.endLatitude || item.endLa) || null;
  const endLng = parseFloat(item.endLongitude || item.endLo) || null;

  // 중심점: API 제공 좌표 우선, 없으면 시작/끝점 중간, 최후에 시작점
  const rawLat = parseFloat(item.latitude) || 0;
  const rawLng = parseFloat(item.longitude) || 0;
  const centerLat = rawLat || (startLat && endLat ? (startLat + endLat) / 2 : startLat || 0);
  const centerLng = rawLng || (startLng && endLng ? (startLng + endLng) / 2 : startLng || 0);

  return {
    id: `streetTree_${++idCounter}_${centerLat}_${centerLng}`,
    sourceType: 'streetTree',
    sourceLabel: '가로수길',
    roadName: item.roadsidTreeRoadNm || item.sttreeStretNm || '',
    locationName: item.roadsidTreeRoadNm || item.sttreeStretNm || '',
    city: item.ctprvnNm || (item.insttNm || '').split(' ')[0] || '',
    district: item.signguNm || (item.insttNm || '').split(' ').slice(1).join(' ') || '',
    species: item.speciesNm || item.sttreeKnd || '',
    treeCount: parseInt(item.pltngCo || item.sttreeCo, 10) || 0,
    plantCount: parseInt(item.pltngCo || item.sttreeCo, 10) || 0,
    latitude: centerLat,
    longitude: centerLng,
    institution: item.institutionNm || item.insttNm || '',
    phone: item.phoneNumber || '',
    referenceDate: item.referenceDate || '',
    extra: {},
  };
}

export function normalizeFamousForest(item) {
  return {
    id: item.id,
    sourceType: 'famousForest',
    sourceLabel: '국유림 명품숲',
    locationName: item.name,
    address: item.address,
    city: getCityFromAddress(item.address),
    district: '',
    species: item.species,
    areaHa: item.areaHa,
    management: item.management,
    contact: item.contact,
    note: item.note,
    type: item.type,
    year: item.year,
    latitude: item.latitude || 0,
    longitude: item.longitude || 0,
    hasCoords: item.hasCoords,
    extra: {
      area: item.areaHa,
      management: item.management,
    },
  };
}

export const NORMALIZERS = {
  streetTree: normalizeStreetTree,
  famousForest: normalizeFamousForest,
};