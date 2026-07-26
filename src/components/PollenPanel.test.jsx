// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import PollenPanel from './PollenPanel.jsx';

vi.mock('../services/pollen.js', () => ({
  fetchPollen: vi.fn().mockResolvedValue({
    region: '서울특별시 강남구', regionCode: '1168000000',
    categories: [
      { key: 'oak', label: '참나무', level: 2, status: 'ok', source: '기상청' },
      { key: 'pine', label: '소나무', level: 1, status: 'ok', source: '기상청' },
      { key: 'weed', label: '잡초류', level: null, status: 'offseason', source: '기상청' },
      { key: 'grass', label: '잔디', level: 1, status: 'ok', source: 'Google' },
    ],
    disclaimer: '기상청 예보 위험지수 · 지역 단위 · 시즌제',
  }),
}));

describe('PollenPanel', () => {
  it('coords 있으면 카테고리 렌더', async () => {
    render(<PollenPanel coords={{ lat: 37.5, lng: 127.0 }} />);
    await waitFor(() => expect(screen.getByText('참나무')).toBeInTheDocument());
    expect(screen.getByText('잡초류')).toBeInTheDocument();
  });
  it('coords 없으면 위치 안내', () => {
    render(<PollenPanel coords={null} />);
    expect(screen.getByText(/내 위치/)).toBeInTheDocument();
  });
});
