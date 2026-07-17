#!/usr/bin/env node
/**
 * Naver Cloud Geocoding API로 국유림 명품숲의 대표 좌표를 보강한다.
 *
 * Usage:
 *   NAVER_GEOCODE_ID=... NAVER_GEOCODE_KEY=... node scripts/geocode-famous-forests.mjs
 *
 * 입력/출력: public/data/famous-forests.json (좌표가 없는 항목만 갱신)
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, '../public/data/famous-forests.json');
const API_URL = 'https://maps.apigw.ntruss.com/map-geocode/v2/geocode';
const REQUEST_INTERVAL_MS = 100;

const keyId = process.env.NAVER_GEOCODE_ID?.trim();
const key = process.env.NAVER_GEOCODE_KEY?.trim();

if (!keyId || !key) {
  console.error('NAVER_GEOCODE_ID와 NAVER_GEOCODE_KEY 환경변수가 필요합니다.');
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function geocode(query) {
  const url = new URL(API_URL);
  url.searchParams.set('query', query);

  const response = await fetch(url, {
    headers: {
      'X-NCP-APIGW-API-KEY-ID': keyId,
      'X-NCP-APIGW-API-KEY': key,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const body = await response.json();
  const [result] = body.addresses || [];
  if (!result) return null;

  const latitude = Number(result.y);
  const longitude = Number(result.x);
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    ? { latitude, longitude, matchedAddress: result.roadAddress || result.jibunAddress || query }
    : null;
}

const data = JSON.parse(await fs.readFile(DATA_PATH, 'utf8'));
const missing = data.items.filter((item) => !item.hasCoords);
console.log(`명품숲 ${data.items.length}건 중 좌표 미등록 ${missing.length}건 지오코딩 시작`);

let resolved = 0;
let unresolved = 0;
for (const [index, item] of missing.entries()) {
  const correctedAddress = (item.address || '')
    .replace('소홀읍', '소흘읍')
    .replace('강원도', '강원특별자치도')
    .replace(/\s+산\d+(?:-\d+)?(?:\s+외.*)?$/, '');
  const queries = [...new Set([item.navigationAddress, item.address, correctedAddress, item.name].filter(Boolean))];
  try {
    let coords = null;
    for (const query of queries) {
      coords = await geocode(query);
      if (coords) break;
    }
    if (coords) {
      Object.assign(item, coords, { hasCoords: true, geocodedAt: new Date().toISOString() });
      resolved += 1;
      console.log(`[${index + 1}/${missing.length}] OK  ${item.name} → ${coords.latitude}, ${coords.longitude}`);
    } else {
      unresolved += 1;
      console.warn(`[${index + 1}/${missing.length}] MISS ${item.name} (${queries.join(' / ')})`);
    }
  } catch (error) {
    unresolved += 1;
    console.error(`[${index + 1}/${missing.length}] FAIL ${item.name}: ${error.message}`);
  }
  await sleep(REQUEST_INTERVAL_MS);
}

data.generatedAt = new Date().toISOString();
data.geocoding = {
  provider: 'Naver Cloud Geocoding API',
  resolvedThisRun: resolved,
  unresolved,
  totalWithCoordinates: data.items.filter((item) => item.hasCoords).length,
  completedAt: data.generatedAt,
};
await fs.writeFile(DATA_PATH, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
console.log(`완료: ${resolved}건 좌표 추가, ${unresolved}건 수동 확인 필요`);
