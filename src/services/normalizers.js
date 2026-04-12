// 소스별 API 응답 정규화 함수

let idCounter = 0;

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

export const NORMALIZERS = {
  streetTree: normalizeStreetTree,
};
