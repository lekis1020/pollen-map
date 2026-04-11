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

// 초기 로드: 첫 페이지만 (빠른 오버뷰)
export async function fetchInitialData() {
  const apiKey = getApiKey();
  if (!apiKey || apiKey === 'your_api_key_here') {
    throw new Error('API 키가 설정되지 않았습니다. .env 파일에 VITE_DATA_API_KEY를 설정해주세요.');
  }

  const enabledSources = getEnabledSources();
  const allItems = [];
  let totalCount = 0;

  for (const source of enabledSources) {
    const firstPage = await fetchSourcePage(source, { pageNo: 1, numOfRows: 1000 });
    allItems.push(...firstPage.items);
    totalCount = firstPage.totalCount;
  }

  return { items: allItems, totalCount };
}

// 나머지 데이터 로드 (줌 인 시 호출)
export async function fetchRemainingData(onUpdate) {
  const enabledSources = getEnabledSources();
  let allItems = [];

  for (const source of enabledSources) {
    const firstPage = await fetchSourcePage(source, { pageNo: 1, numOfRows: 1000 });
    const totalPages = Math.ceil(firstPage.totalCount / 1000);
    const maxPages = Math.min(totalPages, 10);

    for (let page = 2; page <= maxPages; page++) {
      try {
        const result = await fetchSourcePage(source, { pageNo: page, numOfRows: 1000 });
        allItems.push(...result.items);
        if (onUpdate) onUpdate(allItems);
      } catch { /* skip */ }
    }
  }

  return allItems;
}

