// 소스별 API 응답 정규화 함수

// 고유 ID 생성용 카운터
let idCounter = 0;

// 도로명 기반 방향 해시 (같은 도로는 항상 같은 방향)
function roadNameHash(name) {
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) {
    h = (h * 31 + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function normalizeStreetTree(item) {
  // API 응답의 도로 구간 시작/끝 좌표 추출 (필드명 변형 대응)
  let startLat = parseFloat(item.startLatitude || item.startLa) || null;
  let startLng = parseFloat(item.startLongitude || item.startLo) || null;
  let endLat = parseFloat(item.endLatitude || item.endLa) || null;
  let endLng = parseFloat(item.endLongitude || item.endLo) || null;

  // 중심점: API 제공 좌표 → 시작/끝점 중간값 순으로 결정
  const rawLat = parseFloat(item.latitude) || 0;
  const rawLng = parseFloat(item.longitude) || 0;
  const centerLat = rawLat || (startLat && endLat ? (startLat + endLat) / 2 : startLat || 0);
  const centerLng = rawLng || (startLng && endLng ? (startLng + endLng) / 2 : startLng || 0);

  // 시작/끝 좌표가 없으면 중심점에서 ~300m 도로 구간 생성
  if (!startLat && centerLat && centerLng) {
    const roadName = item.roadsidTreeRoadNm || item.sttreeStretNm || '';
    const angle = (roadNameHash(roadName) % 180) * Math.PI / 180;
    const offset = 0.0015; // ~150m
    startLat = centerLat - offset * Math.cos(angle);
    startLng = centerLng - offset * Math.sin(angle);
    endLat = centerLat + offset * Math.cos(angle);
    endLng = centerLng + offset * Math.sin(angle);
  }

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
    startLat,
    startLng,
    endLat,
    endLng,
    institution: item.institutionNm || item.insttNm || '',
    phone: item.phoneNumber || '',
    referenceDate: item.referenceDate || '',
    extra: {},
  };
}

export function normalizeProtectedTree(item) {
  return {
    id: `protectedTree_${++idCounter}_${item.latitude}_${item.longitude}`,
    sourceType: 'protectedTree',
    sourceLabel: '보호수',
    roadName: '',
    locationName: item.prtcTreeNm || item.speciesNm || '보호수',
    city: item.ctprvnNm || '',
    district: item.signguNm || '',
    species: item.speciesNm || '',
    treeCount: 1,
    plantCount: 1,
    latitude: parseFloat(item.latitude) || 0,
    longitude: parseFloat(item.longitude) || 0,
    institution: item.institutionNm || '',
    phone: item.phoneNumber || '',
    referenceDate: item.referenceDate || '',
    extra: {
      treeAge: item.treeAge || '',
      designation: item.dsgntnDe || '',
      circumference: item.treCrcmfr || '',
      height: item.treHght || '',
    },
  };
}

export function normalizeUrbanPark(item) {
  return {
    id: `urbanPark_${++idCounter}_${item.latitude}_${item.longitude}`,
    sourceType: 'urbanPark',
    sourceLabel: '도시공원',
    roadName: '',
    locationName: item.parkNm || '',
    city: item.ctprvnNm || '',
    district: item.signguNm || '',
    species: '',
    treeCount: 0,
    plantCount: 0,
    latitude: parseFloat(item.latitude) || 0,
    longitude: parseFloat(item.longitude) || 0,
    institution: item.institutionNm || '',
    phone: item.phoneNumber || '',
    referenceDate: item.referenceDate || '',
    extra: {
      parkType: item.parkSe || '',
      area: item.ar || '',
      rdnmadr: item.rdnmadr || '',
      lnmadr: item.lnmadr || '',
    },
  };
}

export function normalizeArboretum(item) {
  return {
    id: `arboretum_${++idCounter}_${item.latitude}_${item.longitude}`,
    sourceType: 'arboretum',
    sourceLabel: '수목원',
    roadName: '',
    locationName: item.arboretumNm || '',
    city: item.ctprvnNm || '',
    district: item.signguNm || '',
    species: item.mainSpcs || '',
    treeCount: 0,
    plantCount: 0,
    latitude: parseFloat(item.latitude) || 0,
    longitude: parseFloat(item.longitude) || 0,
    institution: item.institutionNm || '',
    phone: item.phoneNumber || '',
    referenceDate: item.referenceDate || '',
    extra: {
      area: item.ar || '',
      mainSpecies: item.mainSpcs || '',
      operatingHours: item.operHours || '',
      rdnmadr: item.rdnmadr || '',
    },
  };
}

export const NORMALIZERS = {
  streetTree: normalizeStreetTree,
  protectedTree: normalizeProtectedTree,
  urbanPark: normalizeUrbanPark,
  arboretum: normalizeArboretum,
};
