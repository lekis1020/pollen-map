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

describe('팝업 제보 링크', () => {
  // 팝업 안 링크는 리스너를 달지 않는다. 네이버 InfoWindow는 내부 클릭의
  // 전파만 끊고 기본 동작은 막지 않아 <a>가 그대로 열린다. 그래서 여기서는
  // 마크업에 링크가 제대로 박혔는지를 본다.
  const reportLinks = (iw) => [...iw.getContentElement().querySelectorAll('.popup-report a')];

  it('개별 가로수 팝업에 X · 메일 · GitHub 순으로 링크가 있다', async () => {
    vi.useFakeTimers();
    render(<Map data={[tree()]} onStreetViewClick={() => {}} geo={geoStub} />);
    await act(async () => { vi.advanceTimersByTime(400); });

    const links = reportLinks(await openPopup());
    expect(links).toHaveLength(3);
    expect(links[0].getAttribute('href')).toContain('x.com/intent/post');
    expect(links[1].getAttribute('href')).toMatch(/^mailto:/);
    expect(links[2].getAttribute('href')).toContain('template=data-report.yml');
  });

  it('링크에 그 지점의 좌표와 수종이 담긴다', async () => {
    vi.useFakeTimers();
    render(<Map data={[tree()]} onStreetViewClick={() => {}} geo={geoStub} />);
    await act(async () => { vi.advanceTimersByTime(400); });

    const mail = reportLinks(await openPopup())[1].getAttribute('href');
    const body = decodeURIComponent(mail);
    expect(body).toContain('37.5, 127');
    expect(body).toContain('은행나무');
    expect(body).toContain('언주로');
  });

  // mailto에 target="_blank"를 쓰면 빈 탭이 남는다.
  it('메일 링크만 새 탭으로 열지 않는다', async () => {
    vi.useFakeTimers();
    render(<Map data={[tree()]} onStreetViewClick={() => {}} geo={geoStub} />);
    await act(async () => { vi.advanceTimersByTime(400); });

    const links = reportLinks(await openPopup());
    expect(links[0].getAttribute('target')).toBe('_blank');
    expect(links[1].getAttribute('target')).toBeNull();
    expect(links[2].getAttribute('target')).toBe('_blank');
  });

  // 공공데이터 원본에 따옴표·꺾쇠·&가 그대로 들어 있다. 팝업은 문자열 HTML이라
  // 이스케이프가 빠지면 원본 값이 마크업이 된다.
  it('특수문자가 든 도로명이 링크와 마크업을 깨뜨리지 않는다', async () => {
    vi.useFakeTimers();
    const dirty = tree({ id: 'd1', roadName: '"><img src=x> A&B' });
    render(<Map data={[dirty]} onStreetViewClick={() => {}} geo={geoStub} />);
    await act(async () => { vi.advanceTimersByTime(400); });

    const iw = await openPopup();
    expect(iw.getContentElement().querySelector('img'), '주입된 img가 살아났다').toBeNull();
    expect(reportLinks(iw)).toHaveLength(3);
  });

  it('명품숲 팝업에도 제보 링크가 있다', async () => {
    vi.useFakeTimers();
    const forest = {
      id: 'f1', sourceType: 'famousForest', sourceLabel: '국유림 명품숲',
      locationName: '무왕리 낙엽송숲', address: '경기 양평군 지평면 무왕리 산143',
      species: '낙엽송', speciesList: ['낙엽송'], latitude: 37.44, longitude: 127.0,
      qualityFlags: [],
    };
    render(<Map data={[forest]} onStreetViewClick={() => {}} geo={geoStub} />);
    await act(async () => { vi.advanceTimersByTime(400); });

    expect(reportLinks(await openPopup())).toHaveLength(3);
  });

  // 구간 팝업은 그룹 객체를 받는다. groupByRoad가 만드는 실제 shape을 쓴다 —
  // 최상위 latitude가 없고 sourceLabel도 없다(sourceType은 있다).
  it('가로수길 구간 팝업에도 제보 링크가 있다', async () => {
    vi.useFakeTimers();
    const group = {
      id: 'pl_1', count: 12, species: '은행나무', speciesList: ['은행나무'],
      roadName: '테헤란로', city: '서울특별시', district: '강남구',
      sourceType: 'streetTree',
      path: [{ lat: 37.50, lng: 127.00 }, { lat: 37.51, lng: 127.01 }],
      representative: { id: 'r1', latitude: 37.50, longitude: 127.00, institution: '강남구청' },
      bounds: { minLat: 37.50, maxLat: 37.51, minLng: 127.00, maxLng: 127.01 },
    };
    window.Worker = class {
      constructor() { this.onmessage = null; }
      postMessage() { this.onmessage?.({ data: { polylines: [group], markers: [] } }); }
      terminate() {}
    };
    render(<Map data={[tree()]} onStreetViewClick={() => {}} geo={geoStub} />);
    await act(async () => { vi.advanceTimersByTime(400); });

    const plClick = naver.listeners.find((l) => l.type === 'click' && !('position' in (l.target || {})) && !l.target?.getBounds);
    expect(plClick, '폴리라인 click 리스너를 찾지 못했다').toBeTruthy();
    await act(async () => { plClick.fn({ coord: null }); });

    const iw = naver.infoWindows[naver.infoWindows.length - 1];
    expect(reportLinks(iw)).toHaveLength(3);
    expect(decodeURIComponent(reportLinks(iw)[1].getAttribute('href'))).toContain('식재본수: 12본');
  });
});
