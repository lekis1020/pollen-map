// 서울 가로수 위치정보 (OA-1325) 전체 데이터를 페이지별로 수집해
// public/data/seoul-trees.json 으로 저장. 빌드 전에 한 번 실행.
//
// 사용: SEOUL_API_KEY=xxxx node scripts/fetch-seoul-trees.mjs
//      또는 .env 에 SEOUL_API_KEY 지정 후 실행

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_PATH = join(ROOT, 'public/data/seoul-trees.json');

// .env 로드 (SEOUL_API_KEY 찾기)
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

const env = loadEnv();
const API_KEY = process.env.SEOUL_API_KEY || env.SEOUL_API_KEY;
if (!API_KEY) {
  console.error('SEOUL_API_KEY 가 없습니다. .env 혹은 환경변수로 지정하세요.');
  process.exit(1);
}

const BASE = 'http://openapi.seoul.go.kr:8088';
const SERVICE = 'GeoInfoOfRoadsideTreeW';
const PAGE_SIZE = 1000;

const GU_LIST = [
  '강남구', '강동구', '강북구', '강서구', '관악구', '광진구',
  '구로구', '금천구', '노원구', '도봉구', '동대문구', '동작구',
  '마포구', '서대문구', '서초구', '성동구', '성북구', '송파구',
  '양천구', '영등포구', '용산구', '은평구', '중구', '중랑구',
  // 종로구 제외 (2012 구축 시 누락)
];

async function fetchPage(gu, start, end) {
  const url = `${BASE}/${API_KEY}/json/${SERVICE}/${start}/${end}/${encodeURIComponent(gu)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${gu} ${start}-${end} HTTP ${res.status}`);
  const data = await res.json();
  const body = data[SERVICE];
  if (!body || body.RESULT?.CODE !== 'INFO-000') {
    throw new Error(`${gu} ${start}-${end} API error: ${body?.RESULT?.MESSAGE || JSON.stringify(data)}`);
  }
  return { total: body.list_total_count || 0, rows: body.row || [] };
}

function normalize(row) {
  const lat = parseFloat(row.LAT);
  const lng = parseFloat(row.LOT);
  if (!lat || !lng) return null;
  // 서울 범위 대략 필터 (잘못된 좌표 컷)
  if (lat < 37.3 || lat > 37.8 || lng < 126.6 || lng > 127.3) return null;
  return {
    id: `s_${row.GU_NM}_${row.UNQ_NO}`,
    lat: +lat.toFixed(6),
    lng: +lng.toFixed(6),
    sp: (row.TREE_NM || '').trim(),
    gu: row.GU_NM,
    road: (row.WDTH_NM || '').trim(),
  };
}

async function collectGu(gu) {
  const first = await fetchPage(gu, 1, Math.min(PAGE_SIZE, 1000));
  const total = first.total;
  const items = first.rows.map(normalize).filter(Boolean);

  const pages = Math.ceil(total / PAGE_SIZE);
  for (let p = 2; p <= pages; p++) {
    const s = (p - 1) * PAGE_SIZE + 1;
    const e = Math.min(p * PAGE_SIZE, total);
    try {
      const page = await fetchPage(gu, s, e);
      items.push(...page.rows.map(normalize).filter(Boolean));
    } catch (err) {
      console.warn(`  ! ${gu} page ${p} 실패: ${err.message}`);
    }
  }
  console.log(`  ${gu}: ${items.length.toLocaleString()} / ${total.toLocaleString()}`);
  return items;
}

async function main() {
  console.log(`서울 가로수 위치정보 수집 시작 (${GU_LIST.length}개 구)`);
  const t0 = Date.now();
  const all = [];

  // 동시 3개씩 처리
  const CONCURRENCY = 3;
  for (let i = 0; i < GU_LIST.length; i += CONCURRENCY) {
    const batch = GU_LIST.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(collectGu));
    for (const r of results) all.push(...r);
  }

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify({
    generatedAt: new Date().toISOString(),
    count: all.length,
    items: all,
  }));

  const size = Buffer.byteLength(JSON.stringify({ count: all.length, items: all }));
  console.log(`\n완료: ${all.length.toLocaleString()} 그루, ${(size / 1024 / 1024).toFixed(1)} MB`);
  console.log(`소요: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`저장: ${OUT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
