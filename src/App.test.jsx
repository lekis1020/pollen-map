// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import App from './App.jsx';

// App은 마운트되자마자 세 소스를 불러온다. 여기서 보려는 건 헤더 버튼 하나라
// 데이터 경로는 전부 막는다.
vi.mock('./services/api', () => ({
  fetchAllData: vi.fn(() => Promise.resolve({ items: [] })),
  loadSeoulTrees: vi.fn(() => Promise.resolve([])),
  loadFamousForests: vi.fn(() => Promise.resolve([])),
}));
vi.mock('./services/cache', () => ({
  getCachedData: vi.fn(() => null),
  setCachedData: vi.fn(),
}));
// 네이버 지도 전역에 의존하므로 대체한다.
vi.mock('./components/Map', () => ({
  default: () => <div data-testid="map" />,
}));

describe('헤더 새로고침 버튼', () => {
  let reload;
  let originalLocation;

  beforeEach(() => {
    originalLocation = Object.getOwnPropertyDescriptor(window, 'location');
    reload = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload },
    });
  });

  afterEach(() => {
    cleanup();
    Object.defineProperty(window, 'location', originalLocation);
    vi.clearAllMocks();
  });

  // 홈 화면에 설치하면 주소창이 사라져 브라우저 새로고침 버튼도 없어진다.
  // 그때 앱 안에 새로고침 수단이 하나도 없으면 사용자가 막힌다.
  it('렌더된다', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: '새로고침' })).toBeInTheDocument();
  });

  it('누르면 페이지를 리로드한다', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '새로고침' }));
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
