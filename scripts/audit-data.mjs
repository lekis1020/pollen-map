// 두 데이터 소스를 검사해 품질 플래그와 좌표 교정안을 산출한다.
//
// 사용: npm run audit:data
// 산출: public/data/quality-flags.json, public/data/corrections.json
//
// 원본 데이터는 절대 수정하지 않는다. 교정은 오버레이 파일로만 남긴다.

import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FLAG, flagNationwideRecord, flagSeoulTree } from '../src/utils/qualityFlags.js';
import { repairCoordinate, isInKorea } from '../src/utils/coordRepair.js';
import { nationwideKey } from '../src/services/normalizers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SEOUL_PATH = join(ROOT, 'public/data/seoul-trees.json');
const FLAGS_OUT = join(ROOT, 'public/data/quality-flags.json');
const CORRECTIONS_OUT = join(ROOT, 'public/data/corrections.json');

const API_BASE = 'https://api.data.go.kr/openapi/tn_pubr_public_sttree_stret_api';
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

const env = loadEnv();
const API_KEY = process.env.VITE_DATA_API_KEY || env.VITE_DATA_API_KEY;
if (!API_KEY) {
  console.error('VITE_DATA_API_KEY 가 없습니다. .env 혹은 환경변수로 지정하세요.');
  process.exit(1);
}

async function fetchPage(pageNo) {
  const url = `${API_BASE}?serviceKey=${API_KEY}&pageNo=${pageNo}&numOfRows=${PAGE_SIZE}&type=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`전국 데이터 ${pageNo}페이지 실패: HTTP ${res.status}`);
  const json = await res.json();
  return json?.response?.body || {};
}

async function fetchNationwide() {
  const first = await fetchPage(1);
  const total = Number(first.totalCount) || 0;
  const pages = Math.ceil(total / PAGE_SIZE);
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, pages - 1) }, (_, i) => fetchPage(i + 2))
  );
  return [first, ...rest].flatMap((body) => body.items || []);
}

function auditNationwide(items) {
  const flags = {};
  const corrections = [];
  const counts = {};
  const byInstitution = {};

  for (const item of items) {
    const institution = String(item.institutionNm || item.insttNm || '').trim();
    byInstitution[institution] ||= { total: 0, wrongRegion: 0 };
    byInstitution[institution].total += 1;

    const recordFlags = flagNationwideRecord(item);
    if (recordFlags.length) {
      flags[nationwideKey(item)] = recordFlags;
      for (const code of recordFlags) counts[code] = (counts[code] || 0) + 1;
      if (recordFlags.includes(FLAG.COORD_WRONG_REGION)) {
        byInstitution[institution].wrongRegion += 1;
      }
    }

    // 좌표 교정: 한쪽 끝점만 국토 밖일 때 정상 끝점을 앵커로 삼는다.
    const sLat = Number(item.startLatitude);
    const sLng = Number(item.startLongitude);
    const eLat = Number(item.endLatitude);
    const eLng = Number(item.endLongitude);
    if (!Number.isFinite(sLat) || !Number.isFinite(eLat)) continue;

    const startOK = isInKorea(sLat, sLng);
    const endOK = isInKorea(eLat, eLng);
    if (startOK === endOK) continue; // 둘 다 정상이거나 둘 다 이상 → 대상 아님

    const badLat = startOK ? item.endLatitude : item.startLatitude;
    const badLng = startOK ? item.endLongitude : item.startLongitude;
    const repaired = repairCoordinate({
      badLat,
      badLng,
      anchorLat: startOK ? sLat : eLat,
      anchorLng: startOK ? sLng : eLng,
    });
    if (!repaired) continue;

    const prefix = startOK ? 'end' : 'start';
    const isLat = repaired.field === 'lat';
    corrections.push({
      sourceType: 'streetTree',
      key: nationwideKey(item),
      match: { institutionNm: institution, sttreeStretNm: item.sttreeStretNm || '' },
      field: isLat ? `${prefix}Latitude` : `${prefix}Longitude`,
      from: isLat ? badLat : badLng,
      to: String(isLat ? repaired.lat : repaired.lng),
      method: 'single-digit-repair',
      confidence: 'high',
      evidence: `정상 끝점에서 ${repaired.distanceKm.toFixed(2)}km. 한 자리 치환 후보 중 국내로 들어오는 것이 유일`,
    });
  }

  // 기관 전체가 틀린 곳은 개별 검증보다 기관 단위 처리가 효율적이다.
  const systematic = Object.entries(byInstitution)
    .filter(([, v]) => v.total >= 3 && v.wrongRegion / v.total >= 0.5)
    .map(([institution, v]) => ({
      institution,
      wrongRegion: v.wrongRegion,
      total: v.total,
      ratio: Number((v.wrongRegion / v.total).toFixed(3)),
    }))
    .sort((a, b) => b.wrongRegion - a.wrongRegion);

  return { flags, corrections, counts, systematic, total: items.length };
}

function auditSeoul() {
  const data = JSON.parse(readFileSync(SEOUL_PATH, 'utf-8'));
  const { lat, lng, dicts } = data;
  const n = lat.length;

  // 동일 좌표에 몇 그루가 쌓였는지 미리 센다.
  const stack = new Map();
  for (let i = 0; i < n; i++) {
    const key = `${lat[i]},${lng[i]}`;
    stack.set(key, (stack.get(key) || 0) + 1);
  }

  const flags = {};
  const counts = {};
  for (let i = 0; i < n; i++) {
    const treeFlags = flagSeoulTree(
      {
        lat: lat[i],
        lng: lng[i],
        species: dicts.sp[data.sp[i]] || '',
        road: dicts.road[data.road[i]] || '',
      },
      { stackedCount: stack.get(`${lat[i]},${lng[i]}`) || 1 }
    );
    if (treeFlags.length) {
      flags[i] = treeFlags;
      for (const code of treeFlags) counts[code] = (counts[code] || 0) + 1;
    }
  }
  return { flags, counts, total: n };
}

console.log('전국 가로수길 데이터를 받는 중...');
const items = await fetchNationwide();
console.log(`  ${items.length}건 수신`);

const nationwide = auditNationwide(items);

console.log('서울 개별 가로수 데이터를 검사하는 중...');
const seoul = auditSeoul();

const generatedAt = new Date().toISOString();

writeFileSync(FLAGS_OUT, JSON.stringify({
  generatedAt,
  nationwide: {
    total: nationwide.total,
    counts: nationwide.counts,
    systematicInstitutions: nationwide.systematic,
    flags: nationwide.flags,
  },
  seoul: {
    total: seoul.total,
    counts: seoul.counts,
    flags: seoul.flags,
  },
}));

writeFileSync(CORRECTIONS_OUT, JSON.stringify({
  generatedAt,
  corrections: nationwide.corrections,
}, null, 2));

console.log('\n=== 전국 ===');
console.log(`  전체 ${nationwide.total}건, 플래그 있는 레코드 ${Object.keys(nationwide.flags).length}건`);
for (const [code, count] of Object.entries(nationwide.counts).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${code.padEnd(24)} ${count}`);
}
console.log(`  좌표 교정안 ${nationwide.corrections.length}건`);
console.log('  기관 단위 체계적 오류:');
for (const s of nationwide.systematic) {
  console.log(`    ${s.institution.padEnd(24)} ${s.wrongRegion}/${s.total} (${(s.ratio * 100).toFixed(0)}%)`);
}

console.log('\n=== 서울 ===');
console.log(`  전체 ${seoul.total}그루, 플래그 있는 개체 ${Object.keys(seoul.flags).length}그루`);
for (const [code, count] of Object.entries(seoul.counts).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${code.padEnd(24)} ${count}`);
}

console.log(`\n산출: ${FLAGS_OUT}`);
console.log(`산출: ${CORRECTIONS_OUT}`);
