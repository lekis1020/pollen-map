import { sampleData } from '../data/sampleData';

const API_BASE_URL =
  'https://api.data.go.kr/openapi/tn_pubr_public_sttree_stret_api';

// API 키 확인
function getApiKey() {
  return import.meta.env.VITE_DATA_API_KEY;
}

// 고유 ID 생성용 카운터
let idCounter = 0;

// API 응답을 통일된 형식으로 변환
function normalizeItem(item) {
  idCounter++;
  // 실제 API 필드 (tn_pubr_public_sttree_stret_api)
  if (item.sttreeStretNm || item.sttreeKnd) {
    const city = item.insttNm?.split(' ')[0] || '';
    const district = item.insttNm?.split(' ').slice(1).join(' ') || '';
    // 시작점과 끝점의 중간점을 사용 (도로 중앙에 더 가깝게 위치)
    const startLat = parseFloat(item.startLatitude) || 0;
    const startLng = parseFloat(item.startLongitude) || 0;
    const endLat = parseFloat(item.endLatitude) || startLat;
    const endLng = parseFloat(item.endLongitude) || startLng;
    const midLat = (startLat + endLat) / 2;
    const midLng = (startLng + endLng) / 2;
    return {
      id: `api_${idCounter}_${item.startLatitude}_${item.startLongitude}`,
      roadName: item.sttreeStretNm || '',
      city,
      district,
      species: item.sttreeKnd || '',
      treeCount: parseInt(item.sttreeCo, 10) || 0,
      latitude: midLat,
      longitude: midLng,
      startLat, startLng, endLat, endLng,
      institution: item.institutionNm || item.insttNm || '',
      phone: item.phoneNumber || '',
      referenceDate: item.referenceDate || '',
    };
  }
  // 샘플 데이터 필드
  return {
    id: `sample_${idCounter}_${item.latitude}_${item.longitude}`,
    roadName: item.roadsidTreeRoadNm || '',
    city: item.ctprvnNm || '',
    district: item.signguNm || '',
    species: item.speciesNm || '',
    treeCount: parseInt(item.pltngCo, 10) || 0,
    latitude: parseFloat(item.latitude) || 0,
    longitude: parseFloat(item.longitude) || 0,
    institution: item.institutionNm || '',
    phone: item.phoneNumber || '',
    referenceDate: item.referenceDate || '',
  };
}

// 공공데이터 API에서 가로수길 데이터를 가져옴
export async function fetchTreeData({ city, district, pageNo = 1, numOfRows = 1000 } = {}) {
  const apiKey = getApiKey();

  // API 키가 없으면 샘플 데이터 반환
  if (!apiKey || apiKey === 'your_api_key_here') {
    console.info('API 키가 설정되지 않아 샘플 데이터를 사용합니다.');
    return {
      items: sampleData.map(normalizeItem),
      totalCount: sampleData.length,
      issample: true,
    };
  }

  const params = new URLSearchParams({
    serviceKey: apiKey,
    pageNo: String(pageNo),
    numOfRows: String(numOfRows),
    type: 'json',
  });

  if (city) params.append('ctprvnNm', city);
  if (district) params.append('signguNm', district);

  const url = `${API_BASE_URL}?${params.toString()}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`);
  }

  const data = await response.json();

  if (data.response?.header?.resultCode !== '00') {
    throw new Error(
      `API 오류: ${data.response?.header?.resultMsg || '알 수 없는 오류'}`
    );
  }

  const body = data.response?.body;
  const items = body?.items || [];
  const itemList = Array.isArray(items) ? items : [items];

  return {
    items: itemList.filter((item) => (item.latitude && item.longitude) || (item.startLatitude && item.startLongitude)).map(normalizeItem),
    totalCount: parseInt(body?.totalCount, 10) || 0,
    pageNo: parseInt(body?.pageNo, 10) || 1,
    numOfRows: parseInt(body?.numOfRows, 10) || numOfRows,
    issample: false,
  };
}

// 모든 페이지의 데이터를 가져옴 (API 사용 시)
export async function fetchAllTreeData({ city, district } = {}) {
  const firstPage = await fetchTreeData({ city, district, pageNo: 1, numOfRows: 1000 });

  if (firstPage.issample) {
    return firstPage;
  }

  const allItems = [...firstPage.items];
  const totalPages = Math.ceil(firstPage.totalCount / 1000);

  // 나머지 페이지를 배치로 가져옴 (최대 50페이지, 5개씩 병렬)
  const maxPages = Math.min(totalPages, 50);
  const BATCH_SIZE = 5;

  for (let batchStart = 2; batchStart <= maxPages; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE - 1, maxPages);
    const promises = [];
    for (let page = batchStart; page <= batchEnd; page++) {
      promises.push(fetchTreeData({ city, district, pageNo: page, numOfRows: 1000 }));
    }

    const results = await Promise.allSettled(promises);
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allItems.push(...result.value.items);
      }
    }
  }

  return {
    items: allItems,
    totalCount: firstPage.totalCount,
    issample: false,
  };
}
