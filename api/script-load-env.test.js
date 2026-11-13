import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadEnvFile } from '../scripts/load-env.mjs';

// 세 수집 스크립트가 공유하는 .env 파서. 규칙을 바꾸면 값 끝이 잘리거나
// 따옴표가 남아서 키가 조용히 달라진다.
function parseEnv(envText) {
  const dir = mkdtempSync(join(tmpdir(), 'pollen-env-'));
  const envPath = join(dir, '.env');
  try {
    if (envText !== null) writeFileSync(envPath, envText);
    return loadEnvFile(envText === null ? join(dir, 'missing.env') : envPath);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('스크립트 .env 파서', () => {
  it('파일이 없으면 빈 객체', () => {
    expect(parseEnv(null)).toEqual({});
  });

  it('KEY=value, 따옴표, 공백, 주석 아닌 줄을 지금 규칙 그대로 읽는다', () => {
    const env = parseEnv([
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

  it('CRLF 줄끝의 CR은 값에 남지 않는다', () => {
    expect(parseEnv('KEY=value\r\nNEXT=two\r\n')).toEqual({ KEY: 'value', NEXT: 'two' });
  });
});
