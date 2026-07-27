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
const NOTES = join(ROOT, 'docs/superpowers/notes/pollen-api-discovery.md');

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
const SITES = {
  gangnam: { lat: 37.4979, lng: 127.0276 },
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
  save('google-grass.json', json);
  const day = json?.dailyInfo?.[0] ?? {};
  const types = (day.pollenTypeInfo || []).map((t) => `${t.code}=${t.indexInfo?.value ?? 'n/a'}`);
  const plants = (day.plantInfo || []).map((p) => p.code);
  note(`- Google pollenTypeInfo: [${types.join(', ')}]  (status ${res.status})`);
  note(`  plantInfo codes: [${plants.join(', ')}]  → 잔디는 pollenTypeInfo code="GRASS" 권장`);
}

async function kmaPollen(areaNo) {
  const key = need('KMA_POLLEN_KEY');
  // ⚠️ 엔드포인트/파라미터는 공식 ZIP에서 확정. 아래는 best-guess이며,
  //    KMA_ENDPOINT / KMA_AREA_NO env로 재정의 가능. 실패해도 raw를 저장해 구조를 확인한다.
  const base = env.KMA_ENDPOINT
    || 'https://apis.data.go.kr/1360000/PollenRiskFrcstInfoService/getOakPollenRiskFrcstInfo';
  const area = env.KMA_AREA_NO || areaNo || '1168000000';
  const url = new URL(base);
  url.searchParams.set('serviceKey', key);
  url.searchParams.set('areaNo', area);
  url.searchParams.set('time', `${kstYmd()}06`);
  url.searchParams.set('dataType', 'JSON');
  url.searchParams.set('pageNo', '1');
  url.searchParams.set('numOfRows', '10');
  let raw, parsed;
  try {
    const res = await fetch(url);
    raw = await res.text();
    try { parsed = JSON.parse(raw); } catch { parsed = { _nonJson: raw.slice(0, 2000) }; }
    save('kma-oak-inseason.json', parsed);
    note(`- KMA (areaNo=${area}): status ${res.status}. 응답을 kma-oak-inseason.json에서 직접 확인하세요.`);
    note(`  ⚠️ 참/솔/잡초가 별도 오퍼레이션인지, today/tomorrow 필드명, 비시즌 신호를 이 응답으로 확정.`);
  } catch (e) {
    note(`- KMA 호출 실패: ${e.message}. KMA_ENDPOINT/KMA_AREA_NO env로 엔드포인트를 지정해 재시도하세요.`);
  }
}

async function main() {
  note(`# 꽃가루 API 디스커버리 결과 (${kstYmd()} KST)`);
  note('');
  note('## Naver Reverse Geocoding');
  const gangnam = await naverGc(SITES.gangnam, 'gangnam');
  await naverGc(SITES.sejong, 'sejong');
  note('');
  note('## Google Pollen (grass)');
  await googlePollen(SITES.gangnam);
  note('');
  note('## 기상청 꽃가루농도위험지수 3.0');
  note('  ※ 공식 ZIP(설명서 + 행정구역코드)을 받아 정확한 엔드포인트/areaNo/응답필드를 확정하세요.');
  await kmaPollen();
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
