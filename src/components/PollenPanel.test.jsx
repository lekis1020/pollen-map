// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import PollenPanel from './PollenPanel.jsx';
import * as pollenModule from '../services/pollen.js';

vi.mock('../services/pollen.js', () => ({
  fetchPollen: vi.fn(),
}));

describe('PollenPanel', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('coords 있으면 카테고리 렌더', async () => {
    pollenModule.fetchPollen.mockResolvedValueOnce({
      region: '서울특별시 강남구', regionCode: '1168000000',
      categories: [
        { key: 'oak', label: '참나무', level: 2, status: 'ok', source: '기상청' },
        { key: 'pine', label: '소나무', level: 1, status: 'ok', source: '기상청' },
        { key: 'weed', label: '잡초류', level: null, status: 'offseason', source: '기상청' },
        { key: 'grass', label: '잔디', level: 1, status: 'ok', source: 'Google' },
      ],
      disclaimer: '기상청 예보 위험지수 · 지역 단위 · 시즌제',
    });
    render(<PollenPanel coords={{ lat: 37.5, lng: 127.0 }} />);
    await waitFor(() => expect(screen.getByText('참나무')).toBeInTheDocument());
    expect(screen.getByText('잡초류')).toBeInTheDocument();
  });
  it('coords 없으면 위치 안내', () => {
    render(<PollenPanel coords={null} />);
    expect(screen.getByText(/내 위치/)).toBeInTheDocument();
  });
  it('전체 비시즌이면 단일 메시지', async () => {
    pollenModule.fetchPollen.mockResolvedValueOnce({
      region: '서울특별시',
      categories: [
        { key: 'oak', label: '참나무', level: null, status: 'offseason' },
        { key: 'pine', label: '소나무', level: null, status: 'offseason' },
      ],
    });
    render(<PollenPanel coords={{ lat: 37.5, lng: 127.0 }} />);
    await waitFor(() => expect(screen.getByText(/비시즌/)).toBeInTheDocument());
    expect(screen.queryByText('참나무')).not.toBeInTheDocument();
  });
  it('fetch 실패 시 안내', async () => {
    pollenModule.fetchPollen.mockRejectedValueOnce(new Error('Network error'));
    render(<PollenPanel coords={{ lat: 37.5, lng: 127.0 }} />);
    await waitFor(() => expect(screen.getByText(/일시적으로 불러올 수 없습니다/)).toBeInTheDocument());
  });
});
