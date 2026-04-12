// 데이터 소스 레지스트리
// data.go.kr 표준데이터 API들의 설정을 정의

export const DATA_SOURCES = {
  streetTree: {
    id: 'streetTree',
    label: '가로수길',
    description: '전국가로수길정보표준데이터',
    apiPath: 'tn_pubr_public_sttree_stret_api',
    color: '#27ae60',
    icon: 'circle',
    enabled: true,
  },
  seoulTree: {
    id: 'seoulTree',
    label: '서울 가로수 (개별)',
    description: '서울시 가로수 위치정보 OA-1325',
    color: '#2ecc71',
    icon: 'circle',
    enabled: false, // 공공데이터 API가 아닌 정적 JSON으로 로드하므로 fetchAllData 루프에서 제외
  },
};

export const SOURCE_LIST = Object.values(DATA_SOURCES);

export function getEnabledSources() {
  return SOURCE_LIST.filter((s) => s.enabled);
}
