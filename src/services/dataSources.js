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
  protectedTree: {
    id: 'protectedTree',
    label: '보호수',
    description: '전국보호수정보표준데이터',
    apiPath: 'tn_pubr_public_prtc_tree_info_api',
    color: '#8e44ad',
    icon: 'star',
    enabled: false, // data.go.kr 별도 활용신청 필요
  },
  urbanPark: {
    id: 'urbanPark',
    label: '도시공원',
    description: '전국도시공원정보표준데이터',
    apiPath: 'tn_pubr_public_urban_park_info_api',
    color: '#2980b9',
    icon: 'square',
    enabled: false, // data.go.kr 별도 활용신청 필요
  },
  arboretum: {
    id: 'arboretum',
    label: '수목원',
    description: '전국수목원정보표준데이터',
    apiPath: 'tn_pubr_public_arboretum_info_api',
    color: '#d35400',
    icon: 'leaf',
    enabled: false, // data.go.kr 별도 활용신청 필요
  },
};

export const SOURCE_LIST = Object.values(DATA_SOURCES);

export function getEnabledSources() {
  return SOURCE_LIST.filter((s) => s.enabled);
}
