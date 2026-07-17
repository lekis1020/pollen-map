#!/usr/bin/env node
/**
 * 산림청_국유림 명품숲 선정 현황 CSV → JSON 변환 스크립트
 * (iconv로 UTF-8 변환 후 사용)
 *
 * 사전 준비:
 *   iconv -f cp949 -t utf-8 famous-forests-raw.csv > famous-forests-utf8.csv
 *
 * Usage: node scripts/fetch-famous-forests.mjs
 * Output: public/data/famous-forests.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW_CSV = path.join(__dirname, 'famous-forests-utf8.csv');
const OUTPUT_JSON = path.join(__dirname, '../public/data/famous-forests.json');

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const row = [];
    let current = '';
    let inQuote = false;
    for (const char of lines[i]) {
      if (char === '"') {
        inQuote = !inQuote;
      } else if (char === ',' && !inQuote) {
        row.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current.trim().replace(/^"|"$/g, ''));
    const obj = {};
    header.forEach((h, idx) => { obj[h] = row[idx] || ''; });
    records.push(obj);
  }
  return records;
}

function normalizeSpecies(raw) {
  if (!raw) return '';
  return raw
    .split(/[,\s/]+/)
    .map(s => s.trim())
    .filter(Boolean)
    .join(', ');
}

function main() {
  console.log('📖 Reading UTF-8 CSV...');
  const raw = fs.readFileSync(RAW_CSV, 'utf8');
  const records = parseCSV(raw);

  console.log(`✅ Parsed ${records.length} famous forests`);

  const items = records.map((row, idx) => {
    const address = row['개소'] || row['비고(차량 이용시 네이게이션상의 목적지 주소)'] || '';
    const navigationAddress = row['비고(차량 이용시 네이게이션상의 목적지 주소)'] || '';
    return {
      id: `famousForest_${idx}`,
      sourceType: 'famousForest',
      sourceLabel: '국유림 명품숲',
      name: (row['명품숲 명'] || '').trim(),
      type: row['유형'] || '',
      year: row['선정년도'] || '',
      address,
      navigationAddress,
      species: normalizeSpecies(row['주요 수종']),
      areaHa: parseFloat(row['면적(ha)']) || 0,
      management: row['관리기관'] || '',
      contact: row['탐방문의1'] || row['탐방문의2'] || '',
      note: row['특이사항'] || '',
      latitude: null,
      longitude: null,
      hasCoords: false,
    };
  });

  const output = {
    generatedAt: new Date().toISOString(),
    source: '산림청_국유림 명품숲 선정 현황_20230913 (data.go.kr 15038042)',
    total: items.length,
    items,
  };

  fs.mkdirSync(path.dirname(OUTPUT_JSON), { recursive: true });
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(output, null, 2), 'utf8');

  console.log(`✅ Written ${items.length} records → ${OUTPUT_JSON}`);
  console.log('⚠️  latitude/longitude = null (지오코딩 필요)');
}

main();