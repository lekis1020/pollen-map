// 데이터 소스 레지스트리
// data.go.kr 표준데이터 API들의 설정을 정의

export const DATA_SOURCES = {
  streetTree: {
    id: 'streetTree',
    label: '가로수길',
    description: '전국가로수길정보표준데이터',
    apiPath: 'tn_pubr_public_sttree_stret_api', // 스냅샷 생성 스크립트가 호출하는 원본 API
    color: '#27ae60',
    icon: 'circle',
    enabled: true, // 정적 스냅샷(/data/sttree-roads.json)으로 로드 — 2026-08부터 브라우저 직접 호출은 데이터포털이 403 차단
  },
  seoulTree: {
    id: 'seoulTree',
    label: '서울 가로수 (개별)',
    description: '서울시 가로수 위치정보 OA-1325',
    color: '#2ecc71',
    icon: 'circle',
    enabled: false, // 공공데이터 API가 아닌 정적 JSON으로 로드하므로 fetchAllData 루프에서 제외
  },
  famousForest: {
    id: 'famousForest',
    label: '국유림 명품숲',
    description: '산림청_국유림 명품숲 선정 현황 (15038042)',
    color: '#8e44ad',
    icon: 'tree',
    enabled: false, // 정적 JSON으로 loadFamousForests에서 로드
  },
};

export const SOURCE_LIST = Object.values(DATA_SOURCES);

export function getEnabledSources() {
  return SOURCE_LIST.filter((s) => s.enabled);
}
