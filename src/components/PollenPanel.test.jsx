// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent, act } from '@testing-library/react';
import PollenPanel, { getPollenSummary } from './PollenPanel.jsx';
import * as pollenModule from '../services/pollen.js';

vi.mock('../services/pollen.js', () => ({
  fetchPollen: vi.fn(),
}));

const SUCCESS_DATA = {
  region: '서울특별시 강남구',
  regionCode: '1168000000',
  generatedForKstDate: '2026-09-27',
  categories: [
    { key: 'oak', label: '참나무', level: 2, status: 'ok', source: '기상청' },
    { key: 'pine', label: '소나무', level: 1, status: 'ok', source: '기상청' },
    { key: 'weed', label: '잡초류', level: null, status: 'offseason', source: '기상청' },
    { key: 'grass', label: '잔디', level: 1, status: 'ok', source: 'Google' },
  ],
  disclaimer: '기상청 예보 위험지수 · 지역 단위 · 시즌제',
};
const SOURCE_COPY = '기상청 예보 · 실시간 측정 아님 / 잔디: Google';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('getPollenSummary', () => {
  it('가장 높은 정상 위험을 모바일 요약으로 고른다', () => {
    expect(getPollenSummary([
      { key: 'oak', label: '참나무', level: 1, status: 'ok' },
      { key: 'pine', label: '소나무', level: 3, status: 'ok' },
      { key: 'weed', label: '잡초류', level: 2, status: 'ok' },
    ])).toBe('소나무 매우높음');
  });

  it('동률이면 API 배열의 앞 항목을 유지한다', () => {
    expect(getPollenSummary([
      { key: 'oak', label: '참나무', level: 2, status: 'ok' },
      { key: 'pine', label: '소나무', level: 2, status: 'ok' },
    ])).toBe('참나무 높음');
  });

  it('모두 비시즌이면 단일 요약을 반환한다', () => {
    expect(getPollenSummary([
      { key: 'oak', label: '참나무', level: null, status: 'offseason' },
      { key: 'pine', label: '소나무', level: null, status: 'offseason' },
    ])).toBe('주요 꽃가루 비시즌');
  });

  it('정상 항목 없이 오류가 있으면 부분 실패를 알린다', () => {
    expect(getPollenSummary([
      { key: 'oak', label: '참나무', level: null, status: 'offseason' },
      { key: 'pine', label: '소나무', level: null, status: 'error' },
    ])).toBe('일부 정보를 불러올 수 없음');
  });
});

describe('PollenPanel', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('coords 있으면 카테고리 렌더', async () => {
    pollenModule.fetchPollen.mockResolvedValueOnce(SUCCESS_DATA);
    render(<PollenPanel coords={{ lat: 37.5, lng: 127.0 }} />);
    await waitFor(() => expect(screen.getByText('참나무')).toBeInTheDocument());
    expect(screen.getByText('잡초류')).toBeInTheDocument();
  });

  it('모바일 상세 버튼이 접근성 상태와 상세 영역을 제어한다', async () => {
    pollenModule.fetchPollen.mockResolvedValueOnce(SUCCESS_DATA);
    render(<PollenPanel coords={{ lat: 37.5, lng: 127.0 }} />);

    const toggle = await screen.findByRole('button', { name: '꽃가루 상세 펼치기' });
    const details = document.getElementById(toggle.getAttribute('aria-controls'));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(details).not.toBeNull();
    expect(details).not.toHaveClass('expanded');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAccessibleName('꽃가루 상세 접기');
    expect(details).toHaveClass('expanded');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAccessibleName('꽃가루 상세 펼치기');
    expect(details).not.toHaveClass('expanded');
  });

  it('정상 위험 배지는 배경색과 흰색이 아닌 명시적 전경색을 함께 가진다', async () => {
    pollenModule.fetchPollen.mockResolvedValueOnce(SUCCESS_DATA);
    const { container } = render(<PollenPanel coords={{ lat: 37.5, lng: 127.0 }} />);
    await screen.findByText('참나무');

    const badges = [...container.querySelectorAll('.pollen-level:not(.unavailable)')];
    expect(badges).toHaveLength(3);
    badges.forEach((badge) => {
      expect(badge.style.getPropertyValue('--pollen-level-color')).not.toBe('');
      const foreground = badge.style.getPropertyValue('--pollen-level-text').trim().toLowerCase();
      expect(foreground).not.toBe('');
      expect(foreground).not.toBe('white');
      expect(foreground).not.toBe('#fff');
      expect(foreground).not.toBe('#ffffff');
    });
  });
  it('coords 없으면 위치 안내와 출처를 유지한다', () => {
    render(<PollenPanel coords={null} />);
    expect(screen.getByText(/내 위치/)).toBeInTheDocument();
    expect(screen.getByText(SOURCE_COPY)).toBeInTheDocument();
  });

  it('불러오는 중에도 출처를 유지한다', () => {
    pollenModule.fetchPollen.mockReturnValueOnce(new Promise(() => {}));
    render(<PollenPanel coords={{ lat: 37.5, lng: 127.0 }} />);

    expect(screen.getByText('오늘의 꽃가루 불러오는 중…')).toBeInTheDocument();
    expect(screen.getByText(SOURCE_COPY)).toBeInTheDocument();
  });

  it('전체 비시즌이어도 요약과 데스크톱 상세 카드를 유지한다', async () => {
    pollenModule.fetchPollen.mockResolvedValueOnce({
      region: '서울특별시',
      categories: [
        { key: 'oak', label: '참나무', level: null, status: 'offseason' },
        { key: 'pine', label: '소나무', level: null, status: 'offseason' },
      ],
    });
    render(<PollenPanel coords={{ lat: 37.5, lng: 127.0 }} />);

    expect(await screen.findByText('주요 꽃가루 비시즌')).toBeInTheDocument();
    expect(screen.getAllByText('서울특별시').length).toBeGreaterThan(0);
    expect(screen.getByText('참나무')).toBeInTheDocument();
    expect(screen.getByText('소나무')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '꽃가루 상세 펼치기' })).toBeInTheDocument();
  });

  it('성공 후 coords가 없어지면 과거 지역과 카드를 제거한다', async () => {
    pollenModule.fetchPollen.mockResolvedValueOnce(SUCCESS_DATA);
    const { rerender } = render(<PollenPanel coords={{ lat: 37.5, lng: 127.0 }} />);
    expect(await screen.findByText('참나무')).toBeInTheDocument();

    rerender(<PollenPanel coords={null} />);

    expect(screen.getByText(/내 위치/)).toBeInTheDocument();
    expect(screen.queryAllByText('서울특별시 강남구')).toHaveLength(0);
    expect(screen.queryAllByText('참나무')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: /꽃가루 상세/ })).not.toBeInTheDocument();
  });

  it('다른 coords 재요청이 실패하면 과거 지역과 카드를 제거한다', async () => {
    pollenModule.fetchPollen
      .mockResolvedValueOnce(SUCCESS_DATA)
      .mockRejectedValueOnce(new Error('Network error'));
    const { rerender } = render(<PollenPanel coords={{ lat: 37.5, lng: 127.0 }} />);
    expect(await screen.findByText('참나무')).toBeInTheDocument();

    rerender(<PollenPanel coords={{ lat: 35.1, lng: 129.0 }} />);
    expect(
      await screen.findByText('오늘의 꽃가루를 일시적으로 불러올 수 없습니다.'),
    ).toBeInTheDocument();
    expect(screen.queryAllByText('서울특별시 강남구')).toHaveLength(0);
    expect(screen.queryAllByText('참나무')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: /꽃가루 상세/ })).not.toBeInTheDocument();
  });

  it('이전 coords 응답이 늦게 도착해도 최신 coords 결과를 유지한다', async () => {
    const requestA = deferred();
    const requestB = deferred();
    pollenModule.fetchPollen
      .mockReturnValueOnce(requestA.promise)
      .mockReturnValueOnce(requestB.promise);

    const { rerender } = render(<PollenPanel coords={{ lat: 37.5, lng: 127.0 }} />);
    rerender(<PollenPanel coords={{ lat: 35.1, lng: 129.0 }} />);

    const dataB = {
      ...SUCCESS_DATA,
      region: '부산광역시 해운대구',
      regionCode: '2635000000',
      categories: [
        { key: 'birch', label: '자작나무', level: 3, status: 'ok', source: '기상청' },
      ],
    };
    await act(async () => {
      requestB.resolve(dataB);
      await requestB.promise;
    });
    expect(await screen.findByText('자작나무')).toBeInTheDocument();

    await act(async () => {
      requestA.resolve(SUCCESS_DATA);
      await requestA.promise;
    });

    expect(screen.getAllByText('부산광역시 해운대구').length).toBeGreaterThan(0);
    expect(screen.getByText('자작나무')).toBeInTheDocument();
    expect(screen.queryAllByText('서울특별시 강남구')).toHaveLength(0);
    expect(screen.queryByText('참나무')).not.toBeInTheDocument();
  });

  it('fetch 실패 시 안내와 출처를 유지한다', async () => {
    pollenModule.fetchPollen.mockRejectedValueOnce(new Error('Network error'));
    render(<PollenPanel coords={{ lat: 37.5, lng: 127.0 }} />);
    await waitFor(() => expect(screen.getByText(/일시적으로 불러올 수 없습니다/)).toBeInTheDocument());
    expect(screen.getByText(SOURCE_COPY)).toBeInTheDocument();
  });
});
