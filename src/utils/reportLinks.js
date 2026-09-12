/**
 * 제보 링크 생성.
 *
 * 사용자가 좌표를 손으로 옮겨 적어야 한다면 아무도 제보하지 않는다.
 * 그래서 지도가 아는 것은 전부 앱이 채워 보낸다.
 *
 * 이 모듈은 순수 함수만 둔다 — DOM도 React도 모른다. 팝업(문자열 HTML)과
 * 로드뷰 모달(JSX) 양쪽에서 같은 함수를 쓰기 위해서다.
 */

import { CONTACT_GITHUB_ISSUES, CONTACT_X_HANDLE, mailHref } from '../data/contact.js';
import { naverMapUrl } from './naverLinks.js';

const UNKNOWN = '미상';

const SOURCE_LABEL = {
  streetTree: '가로수길',
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

  const mapUrl = coords ? naverMapUrl(coords) : null;

  return { headline, location, shown, coords, mapUrl };
}

// X의 가중 글자수 상한이다 — String.length가 아니다. X는 코드포인트마다
// 가중치 1 또는 2를 매기고 이 합이 280을 넘으면 인텐트가 본문을 통째로
// 버린다. 한글 음절(U+AC00–U+D7A3)은 가중치 2라서, 이 앱이 만드는 본문은
// 거의 전부 한글이므로 String.length로만 재면 실제 한도의 절반만 채워도
// 넘친 것처럼 보이거나, 반대로 실제로는 넘쳤는데 안 넘친 것처럼 보인다.
export const X_MAX = 280;

// X의 가중치 규칙(코드포인트 기준). 이 범위 밖은 전부 가중치 2 —
// 한글 음절/자모, CJK 한자, 가나 등이 여기 해당한다.
function xWeight(codePoint) {
  if (
    (codePoint >= 0x0000 && codePoint <= 0x10ff) ||
    (codePoint >= 0x2000 && codePoint <= 0x200d) ||
    (codePoint >= 0x2010 && codePoint <= 0x201f) ||
    (codePoint >= 0x2032 && codePoint <= 0x2037)
  ) {
    return 1;
  }
  return 2;
}

// 서로게이트 쌍이 코드포인트 하나로 세어지도록 charCodeAt이 아니라
// for...of로 순회한다.
function xWeightedLength(text) {
  let total = 0;
  for (const ch of text) total += xWeight(ch.codePointAt(0));
  return total;
}

// 가중 예산 안에 들어오는 만큼만 앞에서부터 잘라 담는다.
function truncateToXWeight(text, maxWeight) {
  let result = '';
  let used = 0;
  for (const ch of text) {
    const w = xWeight(ch.codePointAt(0));
    if (used + w > maxWeight) break;
    result += ch;
    used += w;
  }
  return result;
}

export function reportMailHref(ctx) {
  const body = [
    '■ 위치',
    ...ctx.location.map((l) => `  ${l}`),
    // 검토자가 좌표를 옮겨 붙이지 않고 바로 열 수 있게. GitHub·X에는 넣지
    // 않는다 — 이슈 폼의 위치 칸과 X의 280자는 좌표 텍스트로 충분하다.
    ...(ctx.mapUrl ? [`  지도: ${ctx.mapUrl}`] : []),
    '',
    '■ 지도에 표시된 정보',
    ...ctx.shown.map((l) => `  ${l}`),
    '',
    '■ 제보 내용 (아래에 적어주세요)',
    '  무엇이 틀렸나요:',
    '  실제 정보:',
    '  (사진이 있으면 첨부해 주세요)',
    '',
  ].join('\n');

  return mailHref(`데이터 제보 — ${ctx.headline}`, body);
}

export function reportGithubHref(ctx) {
  // 필드 id는 .github/ISSUE_TEMPLATE/data-report.yml과 일치해야 한다.
  // 오타는 GitHub이 조용히 무시하므로 issueTemplate.test.js가 대조한다.
  const params = new URLSearchParams({
    template: 'data-report.yml',
    title: `[제보] ${ctx.headline}`,
    location: ctx.location.join('\n'),
    shown: ctx.shown.join('\n'),
  });
  return `${CONTACT_GITHUB_ISSUES}/new?${params}`;
}

export function reportXHref(ctx) {
  // 좌표가 잘려나가면 제보로서 쓸모가 없다. 그래서 좌표를 먼저 넣고
  // 뒤쪽(도로명·수종)부터 잘라낸다.
  const head = `${CONTACT_X_HANDLE} 지도 정보 오류 제보`;
  const coord = ctx.coords ? `\n좌표 ${ctx.coords.lat}, ${ctx.coords.lng}` : '';
  const tail = `\n${ctx.headline}\n${ctx.shown.join(' · ')}`;

  const fixed = head + coord;
  const room = X_MAX - xWeightedLength(fixed);
  const text = fixed + (room > 1 ? truncateToXWeight(tail, room) : '');

  return `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
}
