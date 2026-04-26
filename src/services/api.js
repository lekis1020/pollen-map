import { DATA_SOURCES, getEnabledSources } from './dataSources';
import { NORMALIZERS } from './normalizers';
import { idbGet, idbSet } from './idbCache';

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
// 컬럼형 포맷 + 사전 인코딩 → 7.4MB (기존 29MB 대비 75%↓)
// IndexedDB 캐시: 변환된 객체를 저장하여 재방문 시 네트워크+파싱+변환 생략
const SEOUL_CACHE_KEY = 'seoul-trees-v2';
const SEOUL_CACHE_TTL = 24 * 60 * 60 * 1000; // 24시간

export async function loadSeoulTrees() {
  // 1) IndexedDB 캐시 확인
  const cached = await idbGet(SEOUL_CACHE_KEY, SEOUL_CACHE_TTL);
  if (cached && cached.length > 0) {
    return cached;
  }

  // 2) 네트워크에서 컬럼형 JSON 로드 + 행 객체로 변환
  const res = await fetch('/data/seoul-trees.json');
  if (!res.ok) throw new Error(`서울 가로수 데이터 로드 실패: ${res.status}`);
  const data = await res.json();
  const { dicts, lat, lng, sp, gu, road, generatedAt } = data;
  const count = lat.length;
  const items = new Array(count);

  for (let i = 0; i < count; i++) {
    items[i] = {
      id: `st_${i}`,
      sourceType: 'seoulTree',
      sourceLabel: '서울 가로수 (개별)',
      roadName: dicts.road[road[i]],
      locationName: dicts.road[road[i]],
      city: '서울특별시',
      district: dicts.gu[gu[i]],
      species: dicts.sp[sp[i]],
      treeCount: 1,
      plantCount: 1,
      latitude: lat[i],
      longitude: lng[i],
      institution: '',
      phone: '',
      referenceDate: generatedAt || '',
      extra: {},
    };
  }

  // 3) 백그라운드로 IndexedDB에 저장 (UI 차단하지 않음)
  idbSet(SEOUL_CACHE_KEY, items);

  return items;
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

