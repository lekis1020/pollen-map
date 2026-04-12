import { DATA_SOURCES, getEnabledSources } from './dataSources';
import { NORMALIZERS } from './normalizers';

const API_BASE_URL = 'https://api.data.go.kr/openapi';

function getApiKey() {
  return (import.meta.env.VITE_DATA_API_KEY || '').trim();
}

// 특정 소스의 데이터를 한 페이지 가져옴
async function fetchSourcePage(source, { city, district, pageNo = 1, numOfRows = 1000 } = {}) {
  const apiKey = getApiKey();
  const params = new URLSearchParams({
    serviceKey: apiKey,
    pageNo: String(pageNo),
    numOfRows: String(numOfRows),
    type: 'json',
  });

  if (city) params.append('ctprvnNm', city);
  if (district) params.append('signguNm', district);

  const url = `${API_BASE_URL}/${source.apiPath}?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`[${source.label}] API 요청 실패: ${response.status}`);
  }

  const data = await response.json();

  if (data.response?.header?.resultCode !== '00') {
    throw new Error(
      `[${source.label}] API 오류: ${data.response?.header?.resultMsg || '알 수 없는 오류'}`
    );
  }

  const body = data.response?.body;
  const items = body?.items || [];
  const itemList = Array.isArray(items) ? items : [items];
  const normalize = NORMALIZERS[source.id];

  return {
    items: itemList.filter((item) => (item.latitude && item.longitude) || (item.startLatitude && item.startLongitude)).map(normalize),
    totalCount: parseInt(body?.totalCount, 10) || 0,
    pageNo: parseInt(body?.pageNo, 10) || 1,
    numOfRows: parseInt(body?.numOfRows, 10) || numOfRows,
  };
}

// 특정 소스의 모든 페이지 데이터를 가져옴
async function fetchAllPagesForSource(source, { city, district } = {}) {
  const firstPage = await fetchSourcePage(source, { city, district, pageNo: 1, numOfRows: 1000 });
  const allItems = [...firstPage.items];
  const totalPages = Math.ceil(firstPage.totalCount / 1000);
  const maxPages = Math.min(totalPages, 10);

  if (maxPages > 1) {
    const promises = [];
    for (let page = 2; page <= maxPages; page++) {
      promises.push(fetchSourcePage(source, { city, district, pageNo: page, numOfRows: 1000 }));
    }
    const results = await Promise.allSettled(promises);
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allItems.push(...result.value.items);
      }
    }
  }

  return { items: allItems, totalCount: firstPage.totalCount };
}

// 기존 API 호환: 가로수길 데이터만 가져옴
export async function fetchTreeData({ city, district, pageNo = 1, numOfRows = 1000 } = {}) {
  const apiKey = getApiKey();

  if (!apiKey || apiKey === 'your_api_key_here') {
    throw new Error('API 키가 설정되지 않았습니다. .env 파일에 VITE_DATA_API_KEY를 설정해주세요.');
  }

  const source = DATA_SOURCES.streetTree;
  const result = await fetchSourcePage(source, { city, district, pageNo, numOfRows });
  return {
    items: result.items,
    totalCount: result.totalCount,
    pageNo: result.pageNo,
    numOfRows: result.numOfRows,
  };
}

// 서울 개별 가로수 정적 JSON 로드 (OA-1325, ~257k 그루)
export async function loadSeoulTrees() {
  const res = await fetch('/data/seoul-trees.json');
  if (!res.ok) throw new Error(`서울 가로수 데이터 로드 실패: ${res.status}`);
  const data = await res.json();
  return data.items.map((it) => ({
    id: it.id,
    sourceType: 'seoulTree',
    sourceLabel: '서울 가로수 (개별)',
    roadName: it.road,
    locationName: it.road,
    city: '서울특별시',
    district: it.gu,
    species: it.sp,
    treeCount: 1,
    plantCount: 1,
    latitude: it.lat,
    longitude: it.lng,
    institution: '',
    phone: '',
    referenceDate: data.generatedAt || '',
    extra: {},
  }));
}

// 2단계 로드: 첫 페이지 즉시 반환 → 나머지 완료 후 콜백
export async function fetchAllData(onFirstPage) {
  const apiKey = getApiKey();
  if (!apiKey || apiKey === 'your_api_key_here') {
    throw new Error('API 키가 설정되지 않았습니다. .env 파일에 VITE_DATA_API_KEY를 설정해주세요.');
  }

  const enabledSources = getEnabledSources();
  const allItems = [];

  for (const source of enabledSources) {
    // 1단계: 첫 페이지 즉시
    const firstPage = await fetchSourcePage(source, { pageNo: 1, numOfRows: 1000 });
    allItems.push(...firstPage.items);
    if (onFirstPage) onFirstPage({ items: [...allItems], totalCount: firstPage.totalCount });

    // 2단계: 나머지 페이지 병렬 로드
    const totalPages = Math.ceil(firstPage.totalCount / 1000);
    const maxPages = Math.min(totalPages, 10);

    if (maxPages > 1) {
      const promises = [];
      for (let page = 2; page <= maxPages; page++) {
        promises.push(fetchSourcePage(source, { pageNo: page, numOfRows: 1000 }));
      }
      const results = await Promise.allSettled(promises);
      for (const result of results) {
        if (result.status === 'fulfilled') {
          allItems.push(...result.value.items);
        }
      }
    }
  }

  return { items: allItems, totalCount: allItems.length };
}

