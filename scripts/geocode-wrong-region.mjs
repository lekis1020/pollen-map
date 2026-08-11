#!/usr/bin/env node
/**
 * 기관 관할을 벗어난 좌표(COORD_WRONG_REGION)를 원본의 주소 정보로 재지오코딩한다.
 *
 * 강동구청 61/61처럼 기관 전체가 어긋난 레코드가 있는데, 오프셋이 불규칙해
 * 일괄 평행이동으로는 못 고친다. 다만 도로명·구간설명은 대체로 맞으므로
 * 그것을 지오코딩해 위치를 되찾는다.
 *
 * 정밀도가 다른 세 단계를 순서대로 시도하고, 어느 단계에서 나왔는지를
 * precision으로 남긴다 — audit-data.mjs가 이를 confidence로 옮긴다.
 *   parcel : 구간설명의 지번("둔촌동 105-9")     → 필지 수준
 *   road   : 도로명 + 건물번호 탐침              → 도로 수준(구간 내 오차 존재)
 *   dong   : 법정동/리 이름만                    → 동 중심점(오차 ~1km)
 *
 * 원본은 수정하지 않는다. 결과는 캐시 파일로만 남기고,
 * npm run audit:data 가 이를 읽어 corrections.json 오버레이를 만든다.
 *
 * Usage:
 *   NAVER_GEOCODE_ID=... NAVER_GEOCODE_KEY=... node scripts/geocode-wrong-region.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FLAG, flagNationwideRecord, SIDO_BOUNDS } from '../src/utils/qualityFlags.js';
import { nationwideKey } from '../src/services/normalizers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const NATIONWIDE_PATH = join(ROOT, 'public/data/sttree-roads.json');
const OUT_DIR = join(ROOT, 'scripts/data');
const OUT_PATH = join(OUT_DIR, 'wrong-region-geocoded.json');

const API_URL = 'https://maps.apigw.ntruss.com/map-geocode/v2/geocode';
const REQUEST_INTERVAL_MS = 120;
// 도로명만 있을 때 실제로 존재하는 건물번호를 찾기 위한 탐침값.
// 네이버 지오코딩은 실재하지 않는 건물번호에 결과를 주지 않아서,
// 도로 하나를 찍으려면 몇 개를 시도해 봐야 한다.
const HOUSE_NUMBER_PROBES = [1, 10, 50, 100, 200, 300, 500];

const keyId = process.env.NAVER_GEOCODE_ID?.trim();
const key = process.env.NAVER_GEOCODE_KEY?.trim();
if (!keyId || !key) {
  console.error('NAVER_GEOCODE_ID와 NAVER_GEOCODE_KEY 환경변수가 필요합니다.');
  process.exit(1);
}

const SIDO_ALIAS = {
  서울특별시: '서울', 인천광역시: '인천', 경기도: '경기',
  강원특별자치도: '강원', 강원도: '강원', 충청북도: '충북', 충청남도: '충남',
  대전광역시: '대전', 세종특별자치시: '세종', 전북특별자치도: '전북',
  전라북도: '전북', 전라남도: '전남', 광주광역시: '광주', 경상북도: '경북',
  대구광역시: '대구', 경상남도: '경남', 부산광역시: '부산',
  울산광역시: '울산', 제주특별자치도: '제주', 제주도: '제주',
};

// "둔촌동 105-9", "창평리 산 12" 같은 지번. 동 이름에 숫자가 끼어 있는
// "신일4가"류는 [가-힣]{2,} 가 숫자를 넘지 못해 자연히 걸러진다.
const JIBUN = /([가-힣]{2,}(?:동|리|가))\s*(?:산\s*)?(\d+(?:-\d+)?)/;
// 읍·면이 앞에 붙어 있으면 함께 잡는다. "군위읍 내량리"처럼 상위 행정구역이
// 있어야 리 이름만으로는 못 찾는 곳이 걸린다.
const DONG = /(?:([가-힣]{2,}(?:읍|면))\s*)?([가-힣]{2,}(?:동|리))/;
const ROUTE_LABEL = /^(지방도|국도|국지도|자전거|시도|군도|\d+번?국도)/;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function geocode(query) {
  const url = new URL(API_URL);
  url.searchParams.set('query', query);
  const res = await fetch(url, {
    headers: { 'X-NCP-APIGW-API-KEY-ID': keyId, 'X-NCP-APIGW-API-KEY': key },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  await sleep(REQUEST_INTERVAL_MS);
  return body.addresses || [];
}

function regionOf(item) {
  const institution = String(item.institutionNm || item.insttNm || '').trim();
  const [sido, ...rest] = institution.split(/\s+/);
  // "서울특별시 강동구청" → 주소로 쓰려면 기관명의 '청'을 떼야 한다.
  const sigungu = rest.join(' ').replace(/청$/, '');
  return { sido, sigungu, region: [sido, sigungu].filter(Boolean).join(' ') };
}

// 결과가 그 기관 것이 맞는지 두 관문으로 검증한다.
//  1) 결과 주소에 기관의 시군구가 실제로 들어있을 것 (동명이도로 방지)
//  2) 좌표가 그 시도 경계 안일 것
function accept(addr, sido, sigungu) {
  const lat = Number(addr.y);
  const lng = Number(addr.x);
  const text = `${addr.roadAddress || ''} ${addr.jibunAddress || ''}`;
  if (sigungu && !text.includes(sigungu)) return null;
  const box = SIDO_BOUNDS[SIDO_ALIAS[sido]];
  if (!box) return null;
  if (!(lat >= box[0] && lat <= box[1] && lng >= box[2] && lng <= box[3])) return null;
  return { lat, lng, address: (addr.roadAddress || addr.jibunAddress || '').trim() };
}

function roadCandidates(item) {
  const names = [];
  for (const raw of [item.roadNm, item.sttreeStretNm]) {
    const text = String(raw || '').trim();
    if (!text || ROUTE_LABEL.test(text)) continue;
    // "백양대로(새모라길)" → 별칭 주기를 떼고, "한남로149~150번길" → 앞쪽만.
    const head = text.replace(/\(.*$/, '').split(/[~,]/)[0].trim();
    if (head) names.push(head);
  }
  return [...new Set(names)];
}

async function resolveOne(item) {
  const { sido, sigungu, region } = regionOf(item);
  const sctn = String(item.roadSctn || '');

  // 1단계: 구간설명의 지번. 가장 정밀하다.
  const jibun = sctn.match(JIBUN);
  if (jibun) {
    const query = `${region} ${jibun[1]} ${jibun[2]}`;
    for (const addr of await geocode(query)) {
      const hit = accept(addr, sido, sigungu);
      if (hit) return { ...hit, query, precision: 'parcel' };
    }
  }

  // 2단계: 도로명 + 건물번호 탐침. 성공한 지점들의 중심을 도로 대표점으로 쓴다.
  // 한 점만 쓰면 긴 도로에서 끝단으로 치우친다.
  for (const road of roadCandidates(item)) {
    const query = `${region} ${road}`;
    const hits = [];
    for (const probe of HOUSE_NUMBER_PROBES) {
      let addresses;
      try {
        addresses = await geocode(`${query} ${probe}`);
      } catch {
        continue;
      }
      for (const addr of addresses) {
        const hit = accept(addr, sido, sigungu);
        if (hit) {
          hits.push(hit);
          break;
        }
      }
    }
    if (hits.length > 0) {
      const avg = (nums) => nums.reduce((a, b) => a + b, 0) / nums.length;
      return {
        lat: avg(hits.map((h) => h.lat)),
        lng: avg(hits.map((h) => h.lng)),
        address: `${hits[0].address} 외 ${hits.length - 1}점 평균`,
        query,
        precision: 'road',
        sampleCount: hits.length,
      };
    }
  }

  // 3단계: 법정동·리 이름만. 동 중심점이라 오차가 크지만 시도 오배치보다는 낫다.
  const dong = sctn.match(DONG) || String(item.sttreeStretNm || '').match(DONG);
  if (dong) {
    // 읍·면을 붙인 쪽을 먼저 시도한다. 리 이름은 전국에 중복이 많다.
    const queries = [
      dong[1] ? `${region} ${dong[1]} ${dong[2]}` : null,
      `${region} ${dong[2]}`,
    ].filter(Boolean);
    for (const query of queries) {
      for (const addr of await geocode(query)) {
        const hit = accept(addr, sido, sigungu);
        if (hit) return { ...hit, query, precision: 'dong' };
      }
    }
  }

  return null;
}

const items = JSON.parse(readFileSync(NATIONWIDE_PATH, 'utf-8')).items || [];
const targets = items.filter((it) =>
  flagNationwideRecord(it).includes(FLAG.COORD_WRONG_REGION)
);
console.log(`재지오코딩 대상 ${targets.length}건 / 전체 ${items.length}건\n`);

const results = {};
const rejected = [];
const byPrecision = {};
let done = 0;

for (const item of targets) {
  done += 1;
  const label = `${item.institutionNm || item.insttNm} ${item.sttreeStretNm || ''}`.trim();
  let hit = null;
  try {
    hit = await resolveOne(item);
  } catch (err) {
    console.log(`[${done}/${targets.length}] ERR  ${label} — ${err.message}`);
  }

  if (hit) {
    results[nationwideKey(item)] = hit;
    byPrecision[hit.precision] = (byPrecision[hit.precision] || 0) + 1;
    console.log(`[${done}/${targets.length}] OK   [${hit.precision}] ${label} → ${hit.address}`);
  } else {
    rejected.push({ key: nationwideKey(item), label });
    console.log(`[${done}/${targets.length}] MISS ${label}`);
  }
}

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(
  OUT_PATH,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      source: 'Naver Cloud Geocoding API',
      targetCount: targets.length,
      acceptedCount: Object.keys(results).length,
      byPrecision,
      results,
      rejected,
    },
    null,
    2
  )
);

console.log(`\n채택 ${Object.keys(results).length}건 / 보류 ${rejected.length}건`);
console.log(`정밀도별: ${JSON.stringify(byPrecision)}`);
console.log(`산출: ${OUT_PATH}`);
console.log('다음: npm run audit:data 로 corrections.json 을 갱신하세요.');
