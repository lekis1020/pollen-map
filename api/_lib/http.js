export function resolveCors(origin) {
  if (!origin) return null;
  const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (allowed.includes(origin)) return origin;
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) return origin;
  return null;
}

/**
 * 교차 출처 호출을 막는 게이트.
 *
 * 브라우저는 same-origin GET에 Origin 헤더를 붙이지 않는다. 이 앱 자신의
 * 요청이 정확히 그 경우라, "헤더가 없으면 거부"로 두면 정작 우리 앱만 막힌다
 * (2026-07-26~08-30 프로덕션 꽃가루 패널이 통째로 403이었다).
 *
 * 헤더가 없는 요청을 통과시켜도 이 게이트가 원래 막으려던 것 — 다른 웹사이트가
 * 브라우저에서 이 API를 끌어다 쓰는 것 — 은 그대로 막힌다. 그런 요청에는
 * 브라우저가 반드시 Origin을 붙이기 때문이다. curl처럼 헤더를 마음대로 뺄 수
 * 있는 클라이언트는 애초에 이 검사로 걸러지지 않으며, 그쪽은 WAF 레이트리밋이
 * 담당한다.
 *
 * Vary는 두 경로 모두에 남긴다. 엣지 캐시가 Origin 유무를 구분하지 못하면
 * ACAO 없는 응답이 교차 출처 요청에 재사용되거나 그 반대가 된다.
 */
export function applyCors(req, res) {
  res.setHeader('Vary', 'Origin');

  const requestOrigin = req.headers?.origin;
  if (!requestOrigin) return true;

  const origin = resolveCors(requestOrigin);
  if (!origin) { res.status(403).json({ error: 'forbidden origin' }); return false; }
  res.setHeader('Access-Control-Allow-Origin', origin);
  return true;
}
