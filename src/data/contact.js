/**
 * 제보·문의 창구 한 곳에서 관리.
 * 사이드바 패널과 에러 배너 두 군데서 같은 주소를 쓰므로 상수로 뺀다.
 */
export const CONTACT_X = 'https://x.com/lekis1020';
export const CONTACT_X_HANDLE = '@lekis1020';
export const CONTACT_MAIL = 'lekis1020@gmail.com';
export const CONTACT_GITHUB_ISSUES = 'https://github.com/lekis1020/pollen-map/issues';

/**
 * 받은 편지함에서 이 서비스 제보임을 바로 알아보려면 제목이 채워져 있어야 한다.
 * @param {string} [suffix] 제목 뒤에 붙일 맥락 (예: '데이터 로드 실패')
 */
export function mailHref(suffix) {
  const subject = suffix
    ? `[식물 알레르기 지도] ${suffix}`
    : '[식물 알레르기 지도] 제보';
  return `mailto:${CONTACT_MAIL}?subject=${encodeURIComponent(subject)}`;
}
