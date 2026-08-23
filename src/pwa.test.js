import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeAll } from 'vitest';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = fileURLToPath(new URL('../.pwa-test-dist', import.meta.url));
const read = (p) => readFileSync(`${OUT}/${p}`, 'utf-8');

// 산출물을 검사하려면 빌드가 필요하다. CI의 단계 순서(lint→test→build)에
// 기대면 dist가 낡은 채로 통과할 수 있어, 여기서 별도 폴더로 직접 빌드한다.
beforeAll(() => {
  rmSync(OUT, { recursive: true, force: true });
  execFileSync('npx', ['vite', 'build', '--outDir', OUT, '--emptyOutDir'], {
    cwd: ROOT,
    stdio: 'pipe',
  });
}, 120_000);

describe('manifest', () => {
  it('설치에 필요한 필드를 갖춘다', () => {
    const m = JSON.parse(read('manifest.webmanifest'));
    expect(m.name).toBeTruthy();
    expect(m.short_name).toBeTruthy();
    expect(m.start_url).toBeTruthy();
    expect(m.display).toBe('standalone');
    expect(m.lang).toBe('ko');
  });

  it('Android 설치 기준인 192·512 아이콘과 maskable을 포함한다', () => {
    const m = JSON.parse(read('manifest.webmanifest'));
    const sizes = m.icons.map((i) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    expect(m.icons.some((i) => (i.purpose || '').includes('maskable'))).toBe(true);
  });
});

describe('아이콘 파일', () => {
  // PNG 헤더에서 실제 픽셀 크기를 읽는다. manifest에 적힌 크기와 파일이
  // 어긋나면 브라우저가 설치 가능으로 치지 않는다.
  const pngSize = (p) => {
    const b = readFileSync(`${OUT}/${p}`);
    expect(b.subarray(1, 4).toString()).toBe('PNG');
    return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  };

  it.each([
    ['icons/icon-192.png', 192],
    ['icons/icon-512.png', 512],
    ['icons/apple-touch-icon-180.png', 180],
  ])('%s 가 %d 픽셀로 존재한다', (path, size) => {
    expect(pngSize(path)).toEqual({ width: size, height: size });
  });
});

describe('서비스워커 precache 범위', () => {
  // 이 파일에서 가장 중요한 검사다.
  // dist는 14MB가 넘고 그 대부분이 data/*.json이다. globPatterns에 json을
  // 무심코 넣으면 설치할 때마다 14MB를 받게 된다. 앱 셸만 담기게 못박는다.
  // 빌드된 sw.js는 minify돼 있어 precacheAndRoute 호출부를 문자열로 찾을 수
  // 없다. 다만 주입된 매니페스트 자체는 온전한 JSON 배열로 남으므로 그걸 집는다.
  const precache = () => {
    const m = read('sw.js').match(/\[\{"revision":[\s\S]*?\}\]/);
    expect(m, 'sw.js에서 precache 목록을 찾지 못했다').toBeTruthy();
    const entries = JSON.parse(m[0]);
    expect(entries.length, 'precache 목록이 비어 있다').toBeGreaterThan(0);
    return entries;
  };

  it('data/*.json을 precache하지 않는다', () => {
    const urls = precache().map((e) => e.url);
    expect(urls.filter((u) => u.includes('data/'))).toEqual([]);
    expect(urls.filter((u) => u.endsWith('.json'))).toEqual([]);
  });

  it('앱 셸 총량이 1MB를 넘지 않는다', () => {
    const urls = precache().map((e) => e.url);
    const bytes = urls.reduce((sum, u) => {
      const f = `${OUT}/${u.replace(/^\//, '')}`;
      return existsSync(f) ? sum + readFileSync(f).length : sum;
    }, 0);
    expect(bytes).toBeLessThan(1_000_000);
  });

  it('앱 셸의 핵심 파일은 precache한다', () => {
    const urls = precache().map((e) => e.url);
    expect(urls.some((u) => u.endsWith('index.html'))).toBe(true);
    expect(urls.some((u) => u.endsWith('.js'))).toBe(true);
    expect(urls.some((u) => u.endsWith('.css'))).toBe(true);
  });
});
