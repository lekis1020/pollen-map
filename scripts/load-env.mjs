import { readFileSync, existsSync } from 'node:fs';

// fetch-seoul-trees, fetch-sttree-roads, pollen-discovery가 쓰던 파서.
// 등호 앞뒤 공백만 걷고, 값 끝의 공백과 '#' 이후는 그대로 둔다.
export function loadEnvFile(envPath) {
  if (!existsSync(envPath)) return {};
  const env = {};
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}
