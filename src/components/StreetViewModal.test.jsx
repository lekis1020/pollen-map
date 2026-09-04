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

// 네이버 지도 API 최소 목.
// panoramaFails: 로드뷰가 없는 지점을 재현한다. 실제 코드는 후보 9곳을
// 모두 시도하고 전부 실패하면 error 상태로 떨어진다.
function installNaverMock({ panoId = '6_XH7ynPhSmJkdQrPCKLMA', pov, panoramaFails = false } = {}) {
  const listeners = [];
  const noop = class { constructor() {} setMap() {} fitBounds() {} };
  const miniMaps = [];

  class Panorama {
    constructor() {
      if (panoramaFails) throw new Error('no panorama here');
      this.pov = pov ?? { pan: 0, tilt: 0, fov: 80 };
    }
    getPosition() { return { lat: () => 37.5699122, lng: () => 126.9768465 }; }
    getLocation() {
      return { panoId, address: '서울 종로구 세종로', photodate: '2026-04-13 09:56:32' };
    }
    getPov() { return this.pov; }
  }

  window.naver = {
    maps: {
      Panorama,
      Map: class {
        constructor(el, opts) {
          this.opts = opts;
          this.fitBoundsCalls = 0;
          this.zoom = null;
          this.centered = null;
          miniMaps.push(this);
        }
        fitBounds() { this.fitBoundsCalls += 1; }
        setZoom(z) { this.zoom = z; }
        setCenter(c) { this.centered = c; }
        destroy() { this.destroyed = true; }
      },
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
    get miniMap() { return miniMaps[miniMaps.length - 1]; },
    get miniMaps() { return miniMaps; },
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

// 로드뷰가 없는 지점에서도 사용자는 "그래서 여기가 어디냐"를 봐야 한다.
// 이전에는 텍스트 카드가 주인공 자리를 차지하고 위성 지도는 옆의 작은
// 상자에만 있었다.
describe('로드뷰 미지원 지점의 위성 폴백', () => {
  function renderFallback() {
    const mock = installNaverMock({ panoramaFails: true });
    render(<StreetViewModal treeData={TREE} onClose={() => {}} />);
    return mock;
  }

  it('위성 지도가 주인공 자리를 차지한다', () => {
    const { container } = { container: document.body };
    renderFallback();
    expect(container.querySelector('.sv-split--fallback')).not.toBeNull();
    expect(container.querySelector('.street-view-minimap')).not.toBeNull();
    // 이 지도는 더 이상 '미니맵'이 아니다.
    expect(screen.getByRole('complementary', { name: '위성 지도' })).toBeInTheDocument();
  });

  it('일반·위성 토글이 폴백에서도 뜨고 위성이 기본이다', () => {
    renderFallback();
    const toggle = screen.getByRole('button', { name: /일반|위성/ });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: /일반|위성/ })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  // 폴백에서는 좌표가 한 점뿐이라 fitBounds가 최대 배율까지 확대해 버린다.
  it('한 점만 있을 때는 fitBounds 대신 줌을 고정한다', () => {
    const mock = renderFallback();
    expect(mock.miniMap.fitBoundsCalls).toBe(0);
    expect(mock.miniMap.zoom).toBe(17);
  });

  it('인포바가 위성 지도로 대신 보여준다고 알린다', () => {
    renderFallback();
    expect(screen.getByRole('status', { name: '' }).textContent).toMatch(/위성 지도/);
  });

  // 화면 안에 위성이 있으므로 '위성지도에서 확인'은 더 이상 맞는 문구가 아니다.
  it('카드는 네이버 지도 새 창 링크를 남긴다', () => {
    renderFallback();
    const link = screen.getByRole('link', { name: /네이버 지도에서 열기/ });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('href')).toContain('sw');
  });

  it('로드뷰가 없으면 파노라마 이어 보기 링크는 뜨지 않는다', () => {
    renderFallback();
    expect(screen.queryByRole('link', { name: /네이버 지도에서 보기/ })).toBeNull();
  });
});

// 프로덕션에서 미니맵 컨테이너 안에 네이버 지도 루트가 20개까지 쌓여 있었다.
// effect가 다시 돌 때마다 새 지도를 만들면서 이전 것을 파괴하지 않은 탓이다.
describe('미니맵 인스턴스 수명', () => {
  it('지도 종류를 바꾸면 이전 지도를 파괴한다', () => {
    const mock = installNaverMock();
    render(<StreetViewModal treeData={TREE} onClose={() => {}} />);
    mock.settle();

    const first = mock.miniMap;
    fireEvent.click(screen.getByRole('button', { name: /일반|위성/ }));

    expect(mock.miniMaps.length).toBeGreaterThan(1);
    expect(first.destroyed).toBe(true);
  });

  it('모달을 닫을 때도 지도를 파괴한다', () => {
    const mock = installNaverMock();
    const { unmount } = render(<StreetViewModal treeData={TREE} onClose={() => {}} />);
    mock.settle();
    const map = mock.miniMap;

    unmount();
    expect(map.destroyed).toBe(true);
  });

  // 폴백에서 위성을 기본으로 미는 것을 setState로 하면 지도가 한 번 더
  // 만들어지고(일반 → 위성), 사용자가 일반으로 되돌려도 도로 위성이 됐다.
  it('폴백에서 위성이 기본이지만 사용자가 일반으로 바꾸면 유지된다', () => {
    installNaverMock({ panoramaFails: true });
    render(<StreetViewModal treeData={TREE} onClose={() => {}} />);

    const toggle = () => screen.getByRole('button', { name: /일반|위성/ });
    expect(toggle()).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(toggle());
    expect(toggle()).toHaveAttribute('aria-pressed', 'false');
    expect(toggle()).toHaveTextContent('위성');
  });
});
