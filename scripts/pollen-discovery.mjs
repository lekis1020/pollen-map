#!/usr/bin/env node
/**
 * Phase 0 — 꽃가루 API 디스커버리.
 *
 * 키를 .env에 넣은 뒤 한 번 실행하면 실제 응답을 fixture로 저장하고,
 * 어댑터(Task 3/4) 작성에 필요한 필드 경로를 콘솔에 요약해준다.
 *
 * 사용:
 *   node scripts/pollen-discovery.mjs
 *
 * 필요 env (.env):
 *   NAVER_GEOCODE_ID, NAVER_GEOCODE_KEY   (Reverse Geocoding 활성화 필수)
 *   GOOGLE_POLLEN_KEY
 *   KMA_POLLEN_KEY  (+ KMA_ENDPOINT, KMA_AREA_NO 로 엔드포인트/코드 지정 가능)
 *
 * 산출물: api/_lib/__fixtures__/*.json  +  docs/superpowers/notes/pollen-api-discovery.md
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const FIXTURES = join(ROOT, 'api/_lib/__fixtures__');
// 확정 스펙 문서(pollen-api-discovery.md)를 덮어쓰지 않도록 실행 로그는 별도 파일에 남긴다.
const NOTES = join(ROOT, 'docs/superpowers/notes/pollen-discovery-run.md');

// .env 로드 (기존 스크립트와 동일한 방식)
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
const need = (k) => {
  const v = (env[k] || '').trim();
  if (!v || v.startsWith('your_')) throw new Error(`env ${k} 가 필요합니다 (.env 확인)`);
  return v;
};

// 테스트 좌표: 강남(area2 있음), 세종(area2 없음)
// 주의: 강남역 사거리(127.0276,37.4979)는 실제로는 서초구 → 강남구청 좌표 사용.
const SITES = {
  gangnam: { lat: 37.5172, lng: 127.0473 },
  sejong: { lat: 36.48, lng: 127.289 },
};

const save = (name, obj) => {
  mkdirSync(FIXTURES, { recursive: true });
  writeFileSync(join(FIXTURES, name), JSON.stringify(obj, null, 2));
  console.log(`  ↳ saved api/_lib/__fixtures__/${name}`);
};

const notes = [];
const note = (line) => { notes.push(line); console.log(line); };

// KST YYYYMMDD (기상청 time 파라미터용)
function kstYmd() {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
  return p.replaceAll('-', '');
}

async function naverGc(site, label) {
  const id = need('NAVER_GEOCODE_ID');
  const key = need('NAVER_GEOCODE_KEY');
  // repo의 기존 정지오코딩과 동일 호스트. 문서 대체 호스트: naveropenapi.apigw.ntruss.com
  const url = new URL('https://maps.apigw.ntruss.com/map-reversegeocode/v2/gc');
  url.searchParams.set('coords', `${site.lng},${site.lat}`);
  url.searchParams.set('output', 'json');
  url.searchParams.set('orders', 'admcode,legalcode');
  const res = await fetch(url, {
    headers: { 'X-NCP-APIGW-API-KEY-ID': id, 'X-NCP-APIGW-API-KEY': key },
  });
  const json = await res.json();
  save(`naver-gc-${label}.json`, json);
  const region = json?.results?.[0]?.region ?? {};
  note(`- Naver gc ${label}: area1="${region.area1?.name ?? ''}" area2="${region.area2?.name ?? ''}" area3="${region.area3?.name ?? ''}" (status ${res.status})`);
  return region;
}

async function googlePollen(site) {
  const key = need('GOOGLE_POLLEN_KEY');
  const url = new URL('https://pollen.googleapis.com/v1/forecast:lookup');
  url.searchParams.set('location.latitude', String(site.lat));
  url.searchParams.set('location.longitude', String(site.lng));
  url.searchParams.set('days', '1');
  url.searchParams.set('key', key);
  const res = await fetch(url);
  const json = await res.json();
  // google-grass.json은 테스트 fixture(시즌 중 가정)라 덮어쓰지 않는다 — 실행 캡처는 -live로 저장.
  save('google-grass-live.json', json);
  const day = json?.dailyInfo?.[0] ?? {};
  const types = (day.pollenTypeInfo || []).map((t) => `${t.code}=${t.indexInfo?.value ?? 'n/a'}`);
  const plants = (day.plantInfo || []).map((p) => p.code);
  note(`- Google pollenTypeInfo: [${types.join(', ')}]  (status ${res.status})`);
  note(`  plantInfo codes: [${plants.join(', ')}]  → 잔디는 pollenTypeInfo code="GRASS" 권장`);
}

// 기상청 스펙(공식 Swagger에서 확정, 2026-07-27):
//   Host: apis.data.go.kr/1360000/HealthWthrIdxServiceV3
//   오퍼레이션(참/솔/잡초 각각 별도 호출):
//     getOakPollenRiskIdxV3 / getPinePollenRiskIdxV3 / getWeedsPollenRiskndxV3  (잡초는 'Riskndx' 오타 주의)
//   응답: response.body.items.item[] , item = {code, areaNo, date, today, tomorrow, dayaftertomorrow, todaysaftertomorrow}
//     → today 가 오늘 지수값(0–3)
//   ⚠️ 키는 유효해도 이 서비스에 '활용신청' 승인이 없으면 Forbidden. 데이터셋 15085289 활용신청 필요.
const KMA_BASE = 'https://apis.data.go.kr/1360000/HealthWthrIdxServiceV3';
const KMA_OPS = {
  oak: 'getOakPollenRiskIdxV3',
  pine: 'getPinePollenRiskIdxV3',
  weed: 'getWeedsPollenRiskndxV3',
};

async function kmaPollen(areaNo) {
  const key = need('KMA_POLLEN_KEY');
  const area = env.KMA_AREA_NO || areaNo || '1168000000';
  for (const [kind, op] of Object.entries(KMA_OPS)) {
    const url = new URL(`${KMA_BASE}/${op}`);
    url.searchParams.set('serviceKey', key);
    url.searchParams.set('areaNo', area);
    url.searchParams.set('time', `${kstYmd()}06`);
    url.searchParams.set('dataType', 'JSON');
    url.searchParams.set('pageNo', '1');
    url.searchParams.set('numOfRows', '10');
    try {
      const res = await fetch(url);
      const raw = await res.text();
      let parsed;
      try { parsed = JSON.parse(raw); } catch { parsed = { _nonJson: raw.slice(0, 2000) }; }
      save(`kma-${kind}-live.json`, parsed);
      const item = parsed?.response?.body?.items?.item;
      const today = Array.isArray(item) ? item[0]?.today : item?.today;
      note(`- KMA ${kind} (${op}, areaNo=${area}): status ${res.status}, today=${today ?? 'n/a'}`);
      if (raw.startsWith('Forbidden') || /NOT_REGISTERED/.test(raw)) {
        note(`  ⚠️ 활용신청 미승인으로 보입니다 — data.go.kr 데이터셋 15085289 활용신청 필요.`);
      }
    } catch (e) {
      note(`- KMA ${kind} 호출 실패: ${e.message}`);
    }
  }
  note(`  ※ 비시즌 신호(today 빈값/누락 여부)를 위 응답으로 확정해 parseKma에 반영.`);
}

async function main() {
  note(`# 꽃가루 API 디스커버리 결과 (${kstYmd()} KST)`);
  note('');
  note('## Naver Reverse Geocoding');
  try {
    await naverGc(SITES.gangnam, 'gangnam');
    await naverGc(SITES.sejong, 'sejong');
  } catch (e) {
    note(`- 건너뜀: ${e.message}`);
  }
  note('');
  note('## Google Pollen (grass)');
  try {
    await googlePollen(SITES.gangnam);
  } catch (e) {
    note(`- 건너뜀: ${e.message}`);
  }
  note('');
  note('## 기상청 꽃가루농도위험지수 3.0');
  note('  ※ 공식 ZIP(설명서 + 행정구역코드)을 받아 정확한 엔드포인트/areaNo/응답필드를 확정하세요.');
  try {
    await kmaPollen();
  } catch (e) {
    note(`- 건너뜀: ${e.message}`);
  }
  note('');
  note('## 다음 단계');
  note('- 위 fixture로 Task 3(parseKma/parseGoogleGrass) 필드 경로를 확정.');
  note('  · Google 잔디: dailyInfo[].pollenTypeInfo[] 중 code==="GRASS"의 indexInfo.value (0–5).');
  note('  · 세종은 area2 빈값 → region-codes.json에 "세종특별자치시|" 키 필요(또는 area3 활용).');
  note('- 공식 ZIP의 행정구역코드로 api/_lib/region-codes.json 생성.');

  mkdirSync(dirname(NOTES), { recursive: true });
  writeFileSync(NOTES, notes.join('\n') + '\n');
  console.log(`\n요약을 ${NOTES} 에 저장했습니다.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
