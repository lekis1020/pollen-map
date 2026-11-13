import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// 세 스크립트가 각자 들고 있는 .env 파서. 파일을 추출해 현재 규칙을 고정하고,
// 공용 모듈로 옮긴 뒤에는 그 모듈이 같은 규칙을 지키는지 본다.
const COPIES = [
  'scripts/fetch-seoul-trees.mjs',
  'scripts/fetch-sttree-roads.mjs',
  'scripts/pollen-discovery.mjs',
];

function extractLoadEnv(source) {
  const match = source.match(/function loadEnv\(\) \{\n[\s\S]*?\n\}/);
  if (!match) throw new Error('loadEnv() not found');
  return match[0];
}

async function parseEnv(envText) {
  const shared = join(process.cwd(), 'scripts/load-env.mjs');
  if (existsSync(shared)) {
    const ns = await import(pathToFileURL(shared).href);
    const dir = mkdtempSync(join(tmpdir(), 'pollen-env-'));
    const envPath = join(dir, '.env');
    try {
      if (envText !== null) writeFileSync(envPath, envText);
      return ns.loadEnvFile(envText === null ? join(dir, 'missing.env') : envPath);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  const results = [];
  for (const file of COPIES) {
    const dir = mkdtempSync(join(tmpdir(), 'pollen-env-'));
    try {
      if (envText !== null) writeFileSync(join(dir, '.env'), envText);
      const modPath = join(dir, 'run.mjs');
      writeFileSync(modPath, `
        import { readFileSync, existsSync } from 'node:fs';
        import { join } from 'node:path';
        const ROOT = ${JSON.stringify(dir)};
        ${extractLoadEnv(readFileSync(join(process.cwd(), file), 'utf8'))}
        export const env = loadEnv();
      `);
      const ns = await import(`${pathToFileURL(modPath).href}?once=${Math.random()}`);
      results.push(ns.env);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
  for (const other of results.slice(1)) expect(other).toEqual(results[0]);
  return results[0];
}

describe('스크립트 .env 파서', () => {
  it('파일이 없으면 빈 객체', async () => {
    expect(await parseEnv(null)).toEqual({});
  });

  it('KEY=value, 따옴표, 공백, 주석 아닌 줄을 지금 규칙 그대로 읽는다', async () => {
    const env = await parseEnv([
      'SEOUL_API_KEY=plain',
      'NAVER_GEOCODE_ID="quoted"',
      "NAVER_GEOCODE_KEY='single'",
      '  KMA_POLLEN_KEY  =  spaced  ',
      'GOOGLE_POLLEN_KEY="hello world"',
      'PARTIAL="value',
      'TRAIL=value"',
      'MIXED="value\'',
      'EMPTY=',
      'KEEP_HASH=value # not a comment',
      '# COMMENT=ignored',
      'export EXPORTED=no',
      'lower=no',
      'VITE_DATA_API_KEY=abc',
      '',
    ].join('\n'));

    expect(env).toEqual({
      SEOUL_API_KEY: 'plain',
      NAVER_GEOCODE_ID: 'quoted',
      NAVER_GEOCODE_KEY: 'single',
      // `(.*)`가 공백을 먹어서 값 끝의 공백은 남는다. 등호 직후 공백만 사라진다.
      KMA_POLLEN_KEY: 'spaced  ',
      GOOGLE_POLLEN_KEY: 'hello world',
      PARTIAL: 'value',
      TRAIL: 'value',
      MIXED: 'value',
      EMPTY: '',
      KEEP_HASH: 'value # not a comment',
      VITE_DATA_API_KEY: 'abc',
    });
  });

  it('CRLF 줄끝의 CR은 값에 남지 않는다', async () => {
    expect(await parseEnv('KEY=value\r\nNEXT=two\r\n')).toEqual({ KEY: 'value', NEXT: 'two' });
  });
});
