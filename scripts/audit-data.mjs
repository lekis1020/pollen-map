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
import { repairCoordinate, isInKorea, haversineKm } from '../src/utils/coordRepair.js';
import { nationwideKey } from '../src/services/normalizers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SEOUL_PATH = join(ROOT, 'public/data/seoul-trees.json');
const NATIONWIDE_PATH = join(ROOT, 'public/data/sttree-roads.json');
const GEOCODE_CACHE = join(ROOT, 'scripts/data/wrong-region-geocoded.json');
const FLAGS_OUT = join(ROOT, 'public/data/quality-flags.json');
const CORRECTIONS_OUT = join(ROOT, 'public/data/corrections.json');

// 전국 데이터는 api.data.go.kr을 직접 부르지 않는다. 2026-08 데이터포털
// 서비스 전환 이후 응답 스키마가 바뀌었고(response 래퍼 제거), 스냅샷이
// 유일한 소스가 됐다. 갱신은 scripts/fetch-sttree-roads.mjs 담당.
function loadNationwide() {
  if (!existsSync(NATIONWIDE_PATH)) {
    console.error(`${NATIONWIDE_PATH} 가 없습니다. 먼저 fetch-sttree-roads.mjs 를 실행하세요.`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(NATIONWIDE_PATH, 'utf-8')).items || [];
}

// 도로명 재지오코딩 결과. 없으면 좌표 교정은 한 자리 오타 건만 산출한다.
function loadGeocodeCache() {
  if (!existsSync(GEOCODE_CACHE)) return {};
  return JSON.parse(readFileSync(GEOCODE_CACHE, 'utf-8')).results || {};
}

// 지오코딩 정밀도를 그대로 신뢰도로 옮긴다. 어느 것도 high가 아니다 —
// 한 자리 오타 교정(정상 끝점이라는 독립 근거가 있음)과 달리
// 여기서는 원본 주소 표기가 맞다는 가정 위에 서 있기 때문이다.
const GEOCODE_CONFIDENCE = { parcel: 'medium', road: 'medium', dong: 'low' };
// 가로수길 한 구간이 이보다 길면 좌표 형상을 신뢰하지 않는다.
// 실제 최장 구간은 수십 km 수준이라 100km는 명백한 오류만 걸러낸다.
const MAX_SEGMENT_KM = 100;
const GEOCODE_PRECISION_NOTE = {
  parcel: '구간설명의 지번을 지오코딩한 필지 수준 위치',
  road: '도로 위 여러 건물번호의 평균점이라 구간 내 수백 m 오차 가능',
  dong: '법정동 중심점이라 오차 1km 내외 가능',
};

function auditNationwide(items, geocoded) {
  const flags = {};
  const corrections = [];
  const counts = {};
  const byInstitution = {};
  const repairedByKey = {};

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
    const repairedField = isLat ? `${prefix}Latitude` : `${prefix}Longitude`;
    // 아래 재지오코딩 단계가 같은 레코드를 다시 건드릴 수 있다.
    // 그때 구간 형상을 원본(깨진 끝점)으로 계산하면 끝점이 국토 밖으로 날아간다.
    repairedByKey[nationwideKey(item)] = {
      ...repairedByKey[nationwideKey(item)],
      [repairedField]: String(isLat ? repaired.lat : repaired.lng),
    };
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

  // 기관 단위 좌표 오류: 도로명 재지오코딩 결과가 있으면 구간을 통째로 옮긴다.
  // 오프셋이 기관마다 불규칙해 일괄 평행이동은 못 하지만, 레코드별 도로명이
  // 맞는 위치를 가리키므로 시작점을 그리로 옮기고 구간 형상은 보존한다.
  for (const item of items) {
    const key = nationwideKey(item);
    const hit = geocoded[key];
    if (!hit) continue;

    // 한 자리 오타 교정이 이미 걸린 레코드는 그 결과 위에서 형상을 계산한다.
    const base = { ...item, ...(repairedByKey[key] || {}) };
    const sLat = Number(base.startLatitude);
    const sLng = Number(base.startLongitude);
    const eLat = Number(base.endLatitude);
    const eLng = Number(base.endLongitude);
    if (!Number.isFinite(sLat) || !Number.isFinite(eLat)) continue;

    const movedKm = haversineKm(sLat, sLng, hit.lat, hit.lng);
    const institution = String(item.institutionNm || item.insttNm || '').trim();
    const match = { institutionNm: institution, sttreeStretNm: item.sttreeStretNm || '' };
    // 구간 형상(끝점 - 시작점)은 원본을 믿는다. 틀린 것은 위치이지 형상이 아니다.
    // 다만 형상 자체가 깨진 레코드(끝점이 국토 밖이거나 구간이 비현실적으로 긴 것)는
    // 형상을 신뢰할 근거가 없으므로 끝점을 시작점에 붙여 점으로 만든다.
    const shapeKm = haversineKm(sLat, sLng, eLat, eLng);
    const shapeTrustworthy = isInKorea(eLat, eLng) && shapeKm <= MAX_SEGMENT_KM;
    const endLat = shapeTrustworthy ? hit.lat + (eLat - sLat) : hit.lat;
    const endLng = shapeTrustworthy ? hit.lng + (eLng - sLng) : hit.lng;
    const targets = [
      ['startLatitude', item.startLatitude, hit.lat],
      ['startLongitude', item.startLongitude, hit.lng],
      ['endLatitude', item.endLatitude, endLat],
      ['endLongitude', item.endLongitude, endLng],
    ];
    for (const [field, from, to] of targets) {
      corrections.push({
        sourceType: 'streetTree',
        key,
        match,
        field,
        from: String(from),
        to: to.toFixed(6),
        method: `roadname-geocode:${hit.precision}`,
        confidence: GEOCODE_CONFIDENCE[hit.precision] || 'low',
        evidence:
          `"${hit.query}" 지오코딩 → ${hit.address} ` +
          `(원 좌표에서 ${movedKm.toFixed(1)}km). ${GEOCODE_PRECISION_NOTE[hit.precision] || ''}`,
      });
    }
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

console.log('전국 가로수길 스냅샷을 읽는 중...');
const items = loadNationwide();
const geocoded = loadGeocodeCache();
console.log(`  ${items.length}건 / 재지오코딩 캐시 ${Object.keys(geocoded).length}건`);

const nationwide = auditNationwide(items, geocoded);

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
