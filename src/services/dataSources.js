// 멀티소스 공공데이터 API 정의
// 각 소스는 독립적인 fetch/normalize 함수를 가지며, fetchAllSources()로 통합 조회

// 서울시 가로수 위치정보 (OA-1325) 정규화
function normalizeSeoulItem(item) {
  return {
    id: `seoul_${item.TREE_ID || ''}_${item.LATITUDE}_${item.LONGITUDE}`,
    roadName: item.ROAD_NM || '',
    city: '서울특별시',
    district: item.GU_NM || '',
    species: item.TREE_NM || '',
    treeCount: 1, // 개별 나무 단위
    latitude: parseFloat(item.LATITUDE) || 0,
    longitude: parseFloat(item.LONGITUDE) || 0,
    institution: `서울시 ${item.GU_NM || ''}`,
    phone: '',
    referenceDate: item.REG_DATE || '',
    dataSource: 'seoul',
  };
}

// 전국보호수 데이터 정규화
function normalizeProtectedTreeItem(item) {
  return {
    id: `protected_${item.latitude}_${item.longitude}_${item.prsvnTreeNm || ''}`,
    roadName: item.prsvnTreePlacNm || item.roadNmAddr || '',
    city: item.ctprvnNm || '',
    district: item.signguNm || '',
    species: item.prsvnTreeNm || '',
    treeCount: 1,
    latitude: parseFloat(item.latitude) || 0,
    longitude: parseFloat(item.longitude) || 0,
    institution: item.institutionNm || '',
    phone: item.phoneNumber || '',
    referenceDate: item.referenceDate || '',
    dataSource: 'protected',
  };
}

// 서울시 가로수 데이터 가져오기
async function fetchSeoulTreeData(apiKey) {
  const baseUrl = 'http://openapi.seoul.go.kr:8088';
  const allItems = [];
  const rowsPerPage = 1000;
  let start = 1;
  let totalCount = 0;

  try {
    // 첫 페이지로 totalCount 확인
    const firstUrl = `${baseUrl}/${apiKey}/json/SearchPublicTreeService/${start}/${start + rowsPerPage - 1}/`;
    const response = await fetch(firstUrl);
    if (!response.ok) return [];

    const data = await response.json();
    const service = data.SearchPublicTreeService;
    if (!service || service.RESULT?.CODE !== 'INFO-000') return [];

    totalCount = service.list_total_count || 0;
    if (service.row) allItems.push(...service.row);

    // 나머지 페이지 (최대 50,000건)
    const maxItems = Math.min(totalCount, 50000);
    const BATCH_SIZE = 5;
    start += rowsPerPage;

    while (start <= maxItems) {
      const promises = [];
      for (let i = 0; i < BATCH_SIZE && start + i * rowsPerPage <= maxItems; i++) {
        const s = start + i * rowsPerPage;
        const e = Math.min(s + rowsPerPage - 1, maxItems);
        const url = `${baseUrl}/${apiKey}/json/SearchPublicTreeService/${s}/${e}/`;
        promises.push(fetch(url).then((r) => r.json()).catch(() => null));
      }

      const results = await Promise.allSettled(promises);
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value?.SearchPublicTreeService?.row) {
          allItems.push(...result.value.SearchPublicTreeService.row);
        }
      }

      start += BATCH_SIZE * rowsPerPage;
    }
  } catch {
    console.warn('서울시 가로수 데이터 로드 실패');
  }

  return allItems
    .filter((item) => item.LATITUDE && item.LONGITUDE)
    .map(normalizeSeoulItem);
}

// 전국보호수 데이터 가져오기
async function fetchProtectedTreeData(apiKey) {
  const baseUrl = 'https://api.data.go.kr/openapi/tn_pubr_public_prsvntre_api';
  const allItems = [];

  try {
    const params = new URLSearchParams({
      serviceKey: apiKey,
      pageNo: '1',
      numOfRows: '1000',
      type: 'json',
    });

    const response = await fetch(`${baseUrl}?${params.toString()}`);
    if (!response.ok) return [];

    const data = await response.json();
    if (data.response?.header?.resultCode !== '00') return [];

    const body = data.response?.body;
    const items = body?.items || [];
    const itemList = Array.isArray(items) ? items : [items];
    allItems.push(...itemList);

    // 추가 페이지
    const totalCount = parseInt(body?.totalCount, 10) || 0;
    const totalPages = Math.min(Math.ceil(totalCount / 1000), 10);

    for (let page = 2; page <= totalPages; page++) {
      try {
        params.set('pageNo', String(page));
        const res = await fetch(`${baseUrl}?${params.toString()}`);
        if (!res.ok) continue;
        const d = await res.json();
        const pageItems = d.response?.body?.items || [];
        allItems.push(...(Array.isArray(pageItems) ? pageItems : [pageItems]));
      } catch {
        // 개별 페이지 실패 무시
      }
    }
  } catch {
    console.warn('전국보호수 데이터 로드 실패');
  }

  return allItems
    .filter((item) => item.latitude && item.longitude)
    .map(normalizeProtectedTreeItem);
}

// 데이터 소스 정의
export const DATA_SOURCES = [
  {
    id: 'seoul_tree',
    name: '서울시 가로수 위치정보',
    envKey: 'VITE_SEOUL_API_KEY',
    fetch: fetchSeoulTreeData,
    description: '서울시 열린데이터광장 (OA-1325) - 개별 나무 단위 위치 데이터',
  },
  {
    id: 'protected_tree',
    name: '전국 보호수 정보',
    envKey: 'VITE_DATA_API_KEY', // data.go.kr 키 공유
    fetch: fetchProtectedTreeData,
    description: '공공데이터포털 - 전국 보호수 (노거수, 희귀목 등)',
  },
];

// 모든 활성 소스에서 데이터 가져오기
export async function fetchFromAdditionalSources() {
  const results = [];

  for (const source of DATA_SOURCES) {
    const apiKey = import.meta.env[source.envKey];
    if (!apiKey || apiKey === 'your_api_key_here') continue;

    try {
      console.info(`${source.name} 데이터를 가져오는 중...`);
      const items = await source.fetch(apiKey);
      console.info(`${source.name}: ${items.length}건 로드 완료`);
      results.push(...items);
    } catch {
      console.warn(`${source.name} 로드 실패`);
    }
  }

  return results;
}
