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
};

export const SOURCE_LIST = Object.values(DATA_SOURCES);

export function getEnabledSources() {
  return SOURCE_LIST.filter((s) => s.enabled);
}
