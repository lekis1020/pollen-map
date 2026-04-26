import { groupByRoadSpecies } from '../utils/groupByRoad';

let currentId = 0;

self.onmessage = (e) => {
  const id = ++currentId;
  const result = groupByRoadSpecies(e.data);
  // 이전 요청이 도착하기 전에 새 요청이 온 경우, 오래된 결과 무시
  if (id === currentId) {
    self.postMessage(result);
  }
};
