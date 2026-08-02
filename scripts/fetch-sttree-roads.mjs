#!/usr/bin/env node
/**
 * 전국가로수길정보표준데이터(tn_pubr_public_sttree_stret_api) 스냅샷 생성.
 *
 * 배경: 2026-08 데이터포털 서비스 전환 이후 api.data.go.kr이 Origin 헤더가 붙은
 * 요청(=브라우저 직접 호출)을 403으로 차단한다. 서버 호출은 정상이므로
 * 서울 가로수(OA-1325)와 같은 정적 스냅샷 방식으로 전환한다.
 *
 * 사용: node scripts/fetch-sttree-roads.mjs   (.env의 VITE_DATA_API_KEY 사용)
 * 산출물: public/data/sttree-roads.json  { generatedAt, totalCount, items: [원본 그대로] }
 *
 * items는 API 원본 필드를 그대로 보존한다 — 클라이언트의 normalizeStreetTree와
 * 품질 오버레이(nationwideKey 기준 flags/corrections)가 원본 필드를 전제하기 때문.
 * 갱신 주기: 원본이 자주 바뀌지 않으므로 분기 1회 재실행이면 충분.
 */

import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'public/data/sttree-roads.json');
const API = 'https://api.data.go.kr/openapi/tn_pubr_public_sttree_stret_api';
const PAGE_SIZE = 1000;

function loadEnv() {
  const envPath = join(ROOT, '.env');
  if (!existsSync(envPath)) return {};
  const env = {};
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = { ...loadEnv(), ...process.env };
const key = (env.VITE_DATA_API_KEY || '').trim();
if (!key || key.startsWith('your_')) {
  console.error('env VITE_DATA_API_KEY 가 필요합니다 (.env 확인)');
  process.exit(1);
}

async function fetchPage(pageNo) {
  const url = new URL(API);
  url.searchParams.set('serviceKey', key);
  url.searchParams.set('pageNo', String(pageNo));
  url.searchParams.set('numOfRows', String(PAGE_SIZE));
  url.searchParams.set('type', 'json');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`page ${pageNo}: HTTP ${res.status}`);
  const data = await res.json();
  // 2026-08 서비스 전환으로 response 래퍼가 사라지고 items가 items.item[]로 중첩됨.
  // 구형({response:{header,body:{items:[...]}}})과 신형({header,body:{items:{item:[...]}}}) 모두 허용.
  const header = data.response?.header ?? data.header;
  if (header?.resultCode !== '00') {
    throw new Error(`page ${pageNo}: API 오류 ${header?.resultMsg || JSON.stringify(data).slice(0, 200)}`);
  }
  const body = data.response?.body ?? data.body;
  const rawItems = body?.items;
  const items = Array.isArray(rawItems) ? rawItems : rawItems?.item ?? [];
  return { items, totalCount: parseInt(body?.totalCount, 10) || 0 };
}

const first = await fetchPage(1);
const totalPages = Math.ceil(first.totalCount / PAGE_SIZE);
console.log(`totalCount=${first.totalCount}, pages=${totalPages}`);

const all = [...first.items];
for (let page = 2; page <= totalPages; page++) {
  const { items } = await fetchPage(page);
  all.push(...items);
  console.log(`  page ${page}/${totalPages}: +${items.length} (누적 ${all.length})`);
}

if (all.length !== first.totalCount) {
  console.warn(`⚠️ 수집 ${all.length} ≠ totalCount ${first.totalCount} — 그래도 저장합니다.`);
}

const out = {
  generatedAt: new Date().toISOString().slice(0, 10),
  totalCount: all.length,
  items: all,
};
writeFileSync(OUT, JSON.stringify(out));
console.log(`저장: public/data/sttree-roads.json (${all.length}행, ${(JSON.stringify(out).length / 1024 / 1024).toFixed(1)}MB)`);
