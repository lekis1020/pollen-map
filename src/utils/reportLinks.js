/**
 * 제보 링크 생성.
 *
 * 사용자가 좌표를 손으로 옮겨 적어야 한다면 아무도 제보하지 않는다.
 * 그래서 지도가 아는 것은 전부 앱이 채워 보낸다.
 *
 * 이 모듈은 순수 함수만 둔다 — DOM도 React도 모른다. 팝업(문자열 HTML)과
 * 로드뷰 모달(JSX) 양쪽에서 같은 함수를 쓰기 위해서다.
 */

const UNKNOWN = '미상';

const SOURCE_LABEL = {
  streetTree: '전국 가로수길',
  seoulTree: '서울 가로수 (개별)',
  famousForest: '국유림 명품숲',
};

// 폴리라인 그룹은 최상위에 좌표가 없고 representative에만 있다
// (src/utils/groupByRoad.js). 0,0은 좌표 미상을 뜻하는 기존 관례다.
function coordsOf(item) {
  const src = Number.isFinite(item.latitude) ? item : item.representative;
  const lat = Number(src?.latitude);
  const lng = Number(src?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
}

export function buildReportContext(item) {
  const isForest = item.sourceType === 'famousForest';
  const coords = coordsOf(item);
  const road = (item.roadName || '').trim();

  const headline = isForest
    ? (item.locationName || item.name || UNKNOWN)
    : [item.city, item.district, road || '도로명 미상'].filter(Boolean).join(' ');

  const location = [`좌표: ${coords ? `${coords.lat}, ${coords.lng}` : UNKNOWN}`];
  if (isForest) {
    location.push(`주소: ${item.address || UNKNOWN}`);
  } else {
    const region = [item.city, item.district].filter(Boolean).join(' ');
    if (region) location.push(`지역: ${region}`);
    location.push(`도로명: ${road || UNKNOWN}`);
  }

  const shown = [
    `구분: ${item.sourceLabel || SOURCE_LABEL[item.sourceType] || '가로수길 구간'}`,
    `수종: ${item.species || UNKNOWN}`,
  ];
  if (isForest) {
    if (item.areaHa) shown.push(`면적: ${item.areaHa} ha`);
    if (item.management) shown.push(`관리기관: ${item.management}`);
  } else {
    // 폴리라인 그룹은 count, 개별 레코드는 plantCount를 쓴다.
    const count = item.count ?? item.plantCount;
    if (count > 0) shown.push(`식재본수: ${count.toLocaleString()}본`);
    const inst = item.institution || item.representative?.institution;
    if (inst) shown.push(`출처 기관: ${inst}`);
  }
  if (item.referenceDate) shown.push(`데이터 기준: ${item.referenceDate}`);

  return { headline, location, shown, coords };
}
