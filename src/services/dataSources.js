// 범례와 통계가 읽는 표시 정보. 로딩 경로는 여기 플래그로 고르지 않는다.
// 가로수길은 fetchAllData, 서울 나무는 loadSeoulTrees, 명품숲은 loadFamousForests.
export const DATA_SOURCES = {
  streetTree: {
    id: 'streetTree',
    label: '가로수길',
    color: '#27ae60',
  },
  seoulTree: {
    id: 'seoulTree',
    label: '서울 가로수 (개별)',
    color: '#2ecc71',
  },
  famousForest: {
    id: 'famousForest',
    label: '국유림 명품숲',
    color: '#8e44ad',
  },
};

export const SOURCE_LIST = Object.values(DATA_SOURCES);
