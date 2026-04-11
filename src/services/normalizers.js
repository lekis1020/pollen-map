// 소스별 API 응답 정규화 함수

export function normalizeStreetTree(item) {
  return {
    id: `streetTree_${item.latitude}_${item.longitude}_${item.speciesNm || item.roadsidTreeRoadNm}`,
    sourceType: 'streetTree',
    sourceLabel: '가로수길',
    roadName: item.roadsidTreeRoadNm || '',
    locationName: item.roadsidTreeRoadNm || '',
    city: item.ctprvnNm || '',
    district: item.signguNm || '',
    species: item.speciesNm || '',
    treeCount: parseInt(item.pltngCo, 10) || 0,
    plantCount: parseInt(item.pltngCo, 10) || 0,
    latitude: parseFloat(item.latitude) || 0,
    longitude: parseFloat(item.longitude) || 0,
    institution: item.institutionNm || '',
    phone: item.phoneNumber || '',
    referenceDate: item.referenceDate || '',
    extra: {},
  };
}

export function normalizeProtectedTree(item) {
  return {
    id: `protectedTree_${item.latitude}_${item.longitude}_${item.prtcTreeNm || item.speciesNm}`,
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
    id: `urbanPark_${item.latitude}_${item.longitude}_${item.parkNm}`,
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
    id: `arboretum_${item.latitude}_${item.longitude}_${item.arboretumNm}`,
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
