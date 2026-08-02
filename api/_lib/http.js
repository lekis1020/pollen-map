export function resolveCors(origin) {
  if (!origin) return null;
  const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (allowed.includes(origin)) return origin;
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) return origin;
  return null;
}

export function applyCors(req, res) {
  const origin = resolveCors(req.headers?.origin);
  if (!origin) { res.status(403).json({ error: 'forbidden origin' }); return false; }
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  return true;
}
