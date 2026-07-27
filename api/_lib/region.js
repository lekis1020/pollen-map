import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const codes = JSON.parse(readFileSync(join(__dirname, 'region-codes.json'), 'utf8'));

export function parseNaverGc(gcJson) {
  const region = gcJson?.results?.[0]?.region ?? {};
  return {
    area1: region.area1?.name ?? '',
    area2: region.area2?.name ?? '',
  };
}

export function lookupRegionCode(area1, area2) {
  const composite = `${area1}|${area2}`;
  const fallback = `${area1}|`;
  const regionCode = codes[composite] ?? codes[fallback] ?? null;
  const region = area2 ? `${area1} ${area2}` : area1;
  return { regionCode, region };
}
