// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import Map from './Map.jsx';

// 네이버 지도 API 최소 목.
// 목적은 지도 렌더 검증이 아니라 "InfoWindow가 언제 닫히는가" 하나다.
// Event 리스너를 (대상, 타입)으로 기록해 두고 테스트에서 직접 발화시킨다.
function installNaverMock() {
  const listeners = [];
  const infoWindows = [];

  class InfoWindow {
    constructor(opts) { this.opts = opts; this.openCalls = []; this.closeCalls = 0; infoWindows.push(this); }
    open(map, anchor) {
      this.openCalls.push(anchor);
      // 실제 SDK처럼 콘텐츠를 DOM으로 만들어 둔다. 버튼 바인딩이 이 위에서 일어난다.
      this.el = document.createElement('div');
      this.el.innerHTML = this.opts.content;
    }
    getContentElement() { return this.el; }
    close() { this.closeCalls += 1; }
  }
  const noop = class { constructor() {} setMap() {} getElement() { return null; } };

  const maps = {
    Map: class {
      constructor() { this.zoom = 7; }
      getBounds() { return { minY: () => 37.4, maxY: () => 37.6, minX: () => 126.9, maxX: () => 127.1 }; }
      setCenter() {} setZoom() {} getZoom() { return this.zoom; } panBy() {}
    },
    Marker: class { constructor(o) { Object.assign(this, o); } setMap() {} getElement() { return null; } },
    Polyline: noop,
    Circle: noop,
    InfoWindow,
    LatLng: class { constructor(lat, lng) { this.y = lat; this.x = lng; } lat() { return this.y; } lng() { return this.x; } },
    LatLngBounds: class {},
    Point: class { constructor(x, y) { this.x = x; this.y = y; } },
    Size: class { constructor(w, h) { this.w = w; this.h = h; } },
    Position: { TOP_RIGHT: 'TOP_RIGHT' },
    ZoomControlStyle: { SMALL: 'SMALL' },
    MapTypeId: { NORMAL: 'normal', HYBRID: 'hybrid' },
    Event: {
      addListener: (target, type, fn) => { const l = { target, type, fn }; listeners.push(l); return l; },
      removeListener: (l) => { const i = listeners.indexOf(l); if (i >= 0) listeners.splice(i, 1); },
    },
  };
  window.naver = { maps };

  return {
    listeners,
    infoWindows,
    fire(type, arg, index = 0) {
      const matched = listeners.filter((l) => l.type === type);
      matched[index]?.fn(arg);
    },
    countOf(type) { return listeners.filter((l) => l.type === type).length; },
  };
}

// 그룹화 워커 대체 — 넘어온 데이터를 전부 싱글톤 마커로 돌려준다.
function installWorkerMock() {
  window.Worker = class {
    constructor() { this.onmessage = null; }
    postMessage(data) { this.onmessage?.({ data: { polylines: [], markers: data } }); }
    terminate() {}
  };
}

const tree = (over = {}) => ({
  id: 't1', latitude: 37.5, longitude: 127.0, city: '서울특별시', district: '강남구',
  species: '은행나무', speciesList: ['은행나무'], speciesKind: 'tree',
  sourceType: 'streetTree', roadName: '언주로', plantCount: 1, qualityFlags: [], ...over,
});

const geoStub = { coords: null, accuracy: null, status: 'idle', request: () => {} };

let naver;

beforeEach(() => {
  naver = installNaverMock();
  installWorkerMock();
});

afterEach(() => {
  cleanup();
  delete window.naver;
  vi.useRealTimers();
});

// 마커를 눌러 팝업을 띄운 뒤, 현재 열려 있는 InfoWindow를 돌려준다.
// 지도에도 click 리스너가 달리므로 순서가 아니라 대상 타입으로 고른다.
async function openPopup() {
  const markerClick = naver.listeners.find((l) => l.type === 'click' && 'position' in (l.target || {}));
  if (!markerClick) throw new Error('마커 click 리스너를 찾지 못했다');
  markerClick.fn();
  return naver.infoWindows[naver.infoWindows.length - 1];
}

describe('마커 팝업(InfoWindow) 수명', () => {
  it('지도를 움직여도 팝업이 닫히지 않는다', async () => {
    vi.useFakeTimers();
    render(<Map data={[tree()]} onStreetViewClick={() => {}} geo={geoStub} />);
    await act(async () => { vi.advanceTimersByTime(400); }); // 지도 초기화 폴링 + 클러스터 타이머

    const iw = await openPopup();
    expect(iw, '마커 클릭으로 팝업이 열려야 한다').toBeTruthy();
    expect(iw.openCalls.length).toBe(1);

    // 지도 이동 → idle → 180ms 디바운스 → setBounds → 렌더 effect 재실행
    await act(async () => {
      naver.fire('idle');
      vi.advanceTimersByTime(400);
    });

    // 이 팝업은 뷰포트가 바뀌었다고 닫혀서는 안 된다.
    expect(iw.closeCalls, '지도 이동만으로 팝업이 닫혔다').toBe(0);
  });

  it('데이터가 바뀌면 팝업을 닫는다', async () => {
    vi.useFakeTimers();
    const { rerender } = render(<Map data={[tree()]} onStreetViewClick={() => {}} geo={geoStub} />);
    await act(async () => { vi.advanceTimersByTime(400); });

    const iw = await openPopup();
    expect(iw.closeCalls).toBe(0);

    // 필터 변경 등으로 표시 대상이 달라지면 열려 있던 팝업은 더 이상 유효하지 않다.
    await act(async () => {
      rerender(<Map data={[tree({ id: 't2', species: '느티나무' })]} onStreetViewClick={() => {}} geo={geoStub} />);
      vi.advanceTimersByTime(400);
    });

    expect(iw.closeCalls, '데이터가 바뀌었는데 팝업이 남아 있다').toBeGreaterThan(0);
  });

  it('지도를 클릭하면 팝업을 닫는다', async () => {
    vi.useFakeTimers();
    render(<Map data={[tree()]} onStreetViewClick={() => {}} geo={geoStub} />);
    await act(async () => { vi.advanceTimersByTime(400); });

    // 팝업에는 닫기 수단이 필요하다. 지금까지는 "지도를 움직이면 닫힌다"가
    // 유일한 방법이었는데, 그 동작을 없애므로 대체 수단이 있어야 한다.
    const mapClick = naver.listeners.filter((l) => l.type === 'click' && l.target?.getBounds);
    expect(mapClick.length, '지도 click 리스너가 없다').toBeGreaterThan(0);

    const iw = await openPopup();
    await act(async () => { mapClick[0].fn(); });
    expect(iw.closeCalls).toBeGreaterThan(0);
  });
});

describe('팝업 버튼 동작', () => {
  // 마크업에 버튼이 있는지만 보면 부족하다. 네이버 InfoWindow는 내부 클릭의
  // 전파를 오버레이 래퍼에서 끊기 때문에 document 위임으로는 아무 일도 일어나지
  // 않는다(프로덕션에서 실제로 이렇게 깨졌다). 클릭이 동작하는지까지 본다.
  it('닫기 버튼을 누르면 팝업이 닫힌다', async () => {
    vi.useFakeTimers();
    render(<Map data={[tree()]} onStreetViewClick={() => {}} geo={geoStub} />);
    await act(async () => { vi.advanceTimersByTime(400); });
    const iw = await openPopup();
    const btn = iw.getContentElement().querySelector('.tree-popup-close');
    expect(btn, '닫기 버튼이 없다').toBeTruthy();
    await act(async () => { btn.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(iw.closeCalls, '닫기 버튼이 팝업을 닫지 못했다').toBeGreaterThan(0);
  });

  it('로드뷰 버튼을 누르면 onStreetViewClick이 불린다', async () => {
    vi.useFakeTimers();
    const onStreetViewClick = vi.fn();
    render(<Map data={[tree()]} onStreetViewClick={onStreetViewClick} geo={geoStub} />);
    await act(async () => { vi.advanceTimersByTime(400); });
    const iw = await openPopup();
    const btn = iw.getContentElement().querySelector('.street-view-btn');
    expect(btn, '로드뷰 버튼이 없다').toBeTruthy();
    await act(async () => { btn.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(onStreetViewClick).toHaveBeenCalledTimes(1);
    expect(onStreetViewClick.mock.calls[0][0]).toMatchObject({ id: 't1' });
  });

  it('로드뷰 버튼을 고정 id가 아닌 클래스로 식별한다', async () => {
    vi.useFakeTimers();
    render(<Map data={[tree()]} onStreetViewClick={() => {}} geo={geoStub} />);
    await act(async () => { vi.advanceTimersByTime(400); });
    const iw = await openPopup();
    // 고정 id + setTimeout(50) + getElementById 조합은 경합과 중복 바인딩을 만든다.
    expect(iw.opts.content).not.toContain('id="naver-sv-btn"');
    expect(iw.opts.content).toContain('street-view-btn');
  });
});

describe('알레르기 등급 설명', () => {
  // 등급 배지는 크게 보이는데 그 등급이 무엇을 뜻하는지는 어디에도 없었다.
  // 9월에 4·5월 수종을 보고도 빨간 배지만 눈에 들어와, 등급을 "지금 이 자리의
  // 위험도"로 오해할 수 있다. 등급은 꽃가루 자체의 성질이고 실제 영향은 시기가
  // 정한다는 것을 팝업이 직접 말해야 한다.
  it('알레르기 정보가 있는 수종의 팝업에 설명 문구가 있다', async () => {
    vi.useFakeTimers();
    render(<Map data={[tree()]} onStreetViewClick={() => {}} geo={geoStub} />);
    await act(async () => { vi.advanceTimersByTime(400); });

    const iw = await openPopup();
    const note = iw.getContentElement().querySelector('.popup-allergen-note');
    expect(note, '등급 설명 문구가 없다').toBeTruthy();
    expect(note.textContent).toContain('알레르기 유발 가능성');
    expect(note.textContent).toContain('꽃가루 시기에 따라 달라집니다');
  });

  // '정보 없음' 팝업에는 꽃가루 시기 행 자체가 없다. "위 꽃가루 시기에 따라"가
  // 가리킬 곳이 없고, 항원성을 주장한 적도 없으므로 문구를 넣으면 안 된다.
  it('DB에 없는 수종의 팝업에는 설명 문구를 넣지 않는다', async () => {
    vi.useFakeTimers();
    const unknown = tree({ id: 'u1', species: '없는나무', speciesList: ['없는나무'] });
    render(<Map data={[unknown]} onStreetViewClick={() => {}} geo={geoStub} />);
    await act(async () => { vi.advanceTimersByTime(400); });

    const iw = await openPopup();
    const el = iw.getContentElement();
    expect(el.textContent, '이 팝업은 정보 없음이어야 한다').toContain('정보 없음');
    expect(el.querySelector('.popup-allergen-note'), '정보 없음인데 설명 문구가 붙었다').toBeNull();
  });

  // 팝업을 열지 않고 색만 보는 사용자도 있다.
  it('범례에도 같은 취지의 한 줄이 있다', async () => {
    vi.useFakeTimers();
    const { container } = render(<Map data={[tree()]} onStreetViewClick={() => {}} geo={geoStub} />);
    await act(async () => { vi.advanceTimersByTime(400); });

    const note = container.querySelector('.legend-note');
    expect(note, '범례에 설명이 없다').toBeTruthy();
    expect(note.textContent).toContain('알레르기 유발 가능성');
  });
});
