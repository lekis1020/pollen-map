// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react';
import StreetViewModal from './StreetViewModal.jsx';

const TREE = {
  roadName: '세종대로',
  city: '서울특별시',
  district: '종로구',
  species: '은행나무',
  latitude: 37.57,
  longitude: 126.9769,
  referenceDate: '2025-12-31',
};

// 네이버 지도 API 최소 목. 여기서 보려는 건 "새 창 로드뷰 링크" 하나다.
function installNaverMock({ panoId = '6_XH7ynPhSmJkdQrPCKLMA', pov } = {}) {
  const listeners = [];
  const noop = class { constructor() {} setMap() {} fitBounds() {} };

  class Panorama {
    constructor() { this.pov = pov ?? { pan: 0, tilt: 0, fov: 80 }; }
    getPosition() { return { lat: () => 37.5699122, lng: () => 126.9768465 }; }
    getLocation() {
      return { panoId, address: '서울 종로구 세종로', photodate: '2026-04-13 09:56:32' };
    }
    getPov() { return this.pov; }
  }

  window.naver = {
    maps: {
      Panorama,
      Map: class { constructor() {} fitBounds() {} },
      Marker: class { constructor() {} },
      Polyline: noop,
      LatLng: class { constructor(lat, lng) { this.y = lat; this.x = lng; } lat() { return this.y; } lng() { return this.x; } },
      LatLngBounds: class { getCenter() { return null; } },
      Point: class { constructor(x, y) { this.x = x; this.y = y; } },
      MapTypeId: { NORMAL: 'normal', HYBRID: 'hybrid' },
      Position: { TOP_RIGHT: 'TOP_RIGHT' },
      ZoomControlStyle: { SMALL: 'SMALL' },
      Event: {
        addListener: (target, type, fn) => { const l = { target, type, fn }; listeners.push(l); return l; },
        removeListener: () => {},
      },
    },
  };

  return {
    // 파노라마가 실제로 잡혔을 때를 재현한다.
    settle() {
      act(() => {
        listeners.filter((l) => l.type === 'pano_changed').forEach((l) => l.fn());
      });
    },
  };
}

afterEach(() => {
  cleanup();
  delete window.naver;
  vi.clearAllMocks();
});

describe('네이버 지도에서 로드뷰 이어 보기', () => {
  it('로드뷰가 잡히면 새 창 링크가 뜬다', () => {
    const mock = installNaverMock();
    render(<StreetViewModal treeData={TREE} onClose={() => {}} />);
    mock.settle();

    const link = screen.getByRole('link', { name: /네이버 지도에서 보기/ });
    expect(link).toHaveAttribute(
      'href',
      'https://map.naver.com/p?c=126.9768465,37.5699122,17,0,0,0,adh' +
        '&p=6_XH7ynPhSmJkdQrPCKLMA,0,0,80,Float'
    );
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  // 보던 방향 그대로 이어 봐야 '이어 보기'다.
  it('링크는 지금 보고 있는 시점을 그대로 넘긴다', () => {
    const mock = installNaverMock({ pov: { pan: 137.4, tilt: 5.2, fov: 60 } });
    render(<StreetViewModal treeData={TREE} onClose={() => {}} />);
    mock.settle();

    expect(
      screen.getByRole('link', { name: /네이버 지도에서 보기/ })
    ).toHaveAttribute('href', expect.stringContaining(',137,5,60,Float'));
  });

  // 사용자가 화면을 돌려본 뒤 눌렀다면, href에 박힌 초기 시점이 아니라
  // 그 순간 보고 있던 방향으로 열려야 한다.
  it('클릭 시점에 돌려본 방향이 있으면 그 방향으로 연다', () => {
    const pano = { pan: 0, tilt: 0, fov: 80 };
    const mock = installNaverMock({ pov: pano });
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<StreetViewModal treeData={TREE} onClose={() => {}} />);
    mock.settle();

    // 파노라마를 돌려본 상황
    pano.pan = 200;
    pano.tilt = -3;

    fireEvent.click(screen.getByRole('link', { name: /네이버 지도에서 보기/ }));

    expect(open).toHaveBeenCalledTimes(1);
    expect(open.mock.calls[0][0]).toContain(',200,-3,80,Float');
    open.mockRestore();
  });

  // panoId가 없으면 어느 파노라마인지 지정할 수 없다. 엉뚱한 곳을 여느니 안 띄운다.
  it('panoId를 못 얻으면 링크를 띄우지 않는다', () => {
    const mock = installNaverMock({ panoId: null });
    render(<StreetViewModal treeData={TREE} onClose={() => {}} />);
    mock.settle();

    expect(screen.queryByRole('link', { name: /네이버 지도에서 보기/ })).toBeNull();
  });
});
