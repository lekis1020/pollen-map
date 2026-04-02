import { sampleData } from '../data/sampleData';

const API_BASE_URL =
  'https://api.data.go.kr/openapi/tn_pubr_public_roadside_tree_info_api';

// API 키 확인
function getApiKey() {
  return import.meta.env.VITE_DATA_API_KEY;
}

// API 응답을 통일된 형식으로 변환
function normalizeItem(item) {
  return {
    id: `${item.latitude}_${item.longitude}_${item.speciesNm || item.roadsidTreeRoadNm}`,
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
    items: itemList.filter((item) => item.latitude && item.longitude).map(normalizeItem),
    totalCount: parseInt(body?.totalCount, 10) || 0,
    pageNo: parseInt(body?.pageNo, 10) || 1,
    numOfRows: parseInt(body?.numOfRows, 10) || numOfRows,
    isample: false,
  };
}

// 모든 페이지의 데이터를 가져옴 (API 사용 시)
export async function fetchAllTreeData({ city, district } = {}) {
  const firstPage = await fetchTreeData({ city, district, pageNo: 1, numOfRows: 1000 });

  if (firstPage.isample || firstPage.isample === undefined) {
    return firstPage;
  }

  const allItems = [...firstPage.items];
  const totalPages = Math.ceil(firstPage.totalCount / 1000);

  // 나머지 페이지를 병렬로 가져옴 (최대 10페이지)
  const maxPages = Math.min(totalPages, 10);
  const promises = [];
  for (let page = 2; page <= maxPages; page++) {
    promises.push(fetchTreeData({ city, district, pageNo: page, numOfRows: 1000 }));
  }

  const results = await Promise.allSettled(promises);
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allItems.push(...result.value.items);
    }
  }

  return {
    items: allItems,
    totalCount: firstPage.totalCount,
    isample: false,
  };
}
