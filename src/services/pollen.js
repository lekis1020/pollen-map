// snapCoord는 서버(api/pollen.js)와 반드시 같은 셀을 만들어야 한다.
// 두 구현이 조금이라도 어긋나면 캐시가 조용히 갈라지므로 복제하지 않고 그대로 쓴다.
import { snapCoord } from '../../api/_lib/pollen-core.js';

/**
 * 꽃가루 지수 조회.
 *
 * 좌표를 서버로 보내기 전에 약 1.1km 셀로 스냅한다. 서버도 어차피 스냅하므로
 * 응답 내용은 같지만, Vercel 엣지 캐시는 raw URL 단위로 키를 잡기 때문에
 * 스냅하지 않으면 GPS 소수점 끝자리가 다르다는 이유만으로 같은 동네
 * 사용자끼리 캐시를 공유하지 못한다.
 * (2026-08-30 프로덕션 실측: 동일 URL 재요청 HIT / 5자리 흔들림 MISS)
 */
export async function fetchPollen(lat, lng) {
  const res = await fetch(`/api/pollen?lat=${snapCoord(lat)}&lng=${snapCoord(lng)}`);
  if (!res.ok) throw new Error(`pollen ${res.status}`);
  return res.json();
}
