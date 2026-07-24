// 로드뷰 메타데이터와 공공데이터를 대조하는 순수 함수.
//
// 네이버 파노라마는 naver.maps.Panorama#getLocation()으로
// { panoId, coord, title, address, photodate }를 준다. 이미지가 아니라
// 메타데이터이므로 약관상 화면 표시에 쓸 수 있다.
// 실측 예: { photodate: "2026-04-14 14:06:41",
//            address: "Taepyeongno 1(il)-ga, Jung-gu, Seoul" }

const HANGUL = /[가-힣]/;

// 'YYYY-MM-DD ...' 또는 'YYYY-MM...' 문자열에서 'YYYY-MM'만 뽑는다.
function yearMonth(value) {
  const text = String(value || '').trim();
  const m = text.match(/^(\d{4})[-/.]?(\d{2})/);
  return m ? `${m[1]}-${m[2]}` : null;
}

// 로드뷰 촬영 시점과 데이터 기준일자를 비교한다.
// 어느 쪽이 최신인지 알아야 "로드뷰에 나무가 안 보인다"는 관찰을 해석할 수 있다.
export function compareTimeline({ photodate, referenceDate }) {
  const pano = yearMonth(photodate);
  if (!pano) return null;
  const data = yearMonth(referenceDate);
  if (!data) return { pano, data: null, note: null };

  let note;
  if (data > pano) {
    note = '데이터가 로드뷰보다 최신입니다. 촬영 이후에 심었거나 바뀌었을 수 있습니다.';
  } else if (pano > data) {
    note = '로드뷰가 데이터보다 최신입니다. 조사 이후에 베였거나 수종이 바뀌었을 수 있습니다.';
  } else {
    note = '로드뷰와 데이터의 시점이 같습니다.';
  }
  return { pano, data, note };
}

// 파노라마 지점 주소와 데이터의 도로명을 대조한다.
// 원본 도로명 오기재를 이미지 없이 잡아내는 장치다.
//
// 주의: address는 브라우저 로케일에 따라 로마자로 올 때가 있다
//   (예: "Taepyeongno 1(il)-ga, Jung-gu, Seoul").
// 그 경우 한글 도로명과 문자열 비교가 불가능하므로 억지로 맞추려 하지 않고
// 'unknown'으로 둔다. 로마자를 한글로 되돌리는 추정은 오판을 만들 뿐이다.
export function compareRoadName({ roadName, address }) {
  const road = String(roadName || '').trim();
  const addr = String(address || '').trim();
  if (!addr) return { state: 'unknown' };
  if (!HANGUL.test(addr)) return { state: 'unknown', address: addr, romanized: true };
  if (!road) return { state: 'unknown', address: addr };

  // 'N번길' 같은 접미를 떼고 핵심 토큰으로 비교한다.
  const core = road.replace(/\s*\d+번길.*$/, '').trim();
  if (core.length < 2) return { state: 'unknown', address: addr };

  return {
    state: addr.includes(core) ? 'match' : 'mismatch',
    address: addr,
    road,
  };
}
