/**
 * 네이버 지도 딥링크.
 *
 * 파노라마 URL 형식은 map.naver.com에서 실제 panoId로 열어 확인했다(2026-08-30):
 *   c=<lng>,<lat>,<zoom>,0,0,0,adh   뷰어를 닫았을 때 뒤에 남을 지도(거리뷰 모드)
 *   p=<panoId>,<pan>,<tilt>,<fov>,Float   파노라마 자체
 * p= 없이 c=만 주면 파노라마가 아니라 '거리뷰 선택 모드 지도'가 뜬다.
 * 좌표만으로 파노라마를 지정하는 방법은 없어서 panoId가 반드시 필요하다.
 */

const PANORAMA_ZOOM = 17;

/**
 * @param {object} p
 * @param {string|null} p.panoId 파노라마 ID (naver.maps.Panorama#getLocation)
 * @param {number} p.lat 파노라마 촬영 지점 위도
 * @param {number} p.lng 파노라마 촬영 지점 경도
 * @param {number} [p.pan] 방위각 (deg)
 * @param {number} [p.tilt] 상하각 (deg)
 * @param {number} [p.fov] 화각 (deg)
 * @returns {string|null} 링크를 만들 수 없으면 null
 */
export function naverPanoramaUrl({ panoId, lat, lng, pan = 0, tilt = 0, fov = 80 }) {
  if (!panoId) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const pov = [pan, tilt, fov].map((v) => Math.round(Number.isFinite(v) ? v : 0));
  const center = `${lng},${lat},${PANORAMA_ZOOM},0,0,0,adh`;
  const pano = `${encodeURIComponent(panoId)},${pov.join(',')},Float`;

  return `https://map.naver.com/p?c=${center}&p=${pano}`;
}
