// 도로명·수종 칸에 숫자·기호만 들어 있는 값은 이름이 아니다.
// normalizers, 서울 로더, 품질 플래그, 수종 정규화가 같은 판정을 쓴다.
export const JUNK_ONLY = /^[\s0-9?×xX\-.]*$/;

export function sanitizeRoadName(raw) {
  const text = String(raw || '').trim();
  return !text || JUNK_ONLY.test(text) ? '' : text;
}
