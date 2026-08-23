// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useGeolocation } from './useGeolocation.js';

beforeEach(() => {
  global.navigator.geolocation = {
    getCurrentPosition: vi.fn((ok) => ok({ coords: { latitude: 37.5, longitude: 127.0, accuracy: 20 } })),
  };
});

describe('useGeolocation', () => {
  it('초기 상태 idle', () => {
    const { result } = renderHook(() => useGeolocation());
    expect(result.current.status).toBe('idle');
    expect(result.current.coords).toBeNull();
  });
  it('request() 성공 시 coords 세팅', async () => {
    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.request());
    await waitFor(() => expect(result.current.status).toBe('ok'));
    expect(result.current.coords).toEqual({ lat: 37.5, lng: 127.0 });
  });
});

// 새로고침 후 좌표 복원.
// 설치된 PWA에는 브라우저 새로고침 버튼이 없어 헤더에 하나를 뒀는데, 리로드하면
// 좌표가 초기화돼 꽃가루 패널이 "내 위치를 눌러…"로 돌아가 버린다. 세션에 남겨
// 다시 GPS를 요청하지 않게 한다.
describe('세션 좌표 복원', () => {
  const KEY = 'pollen-map-geo';
  const save = (v) => sessionStorage.setItem(KEY, JSON.stringify(v));

  beforeEach(() => sessionStorage.clear());

  it('저장된 좌표를 초기값으로 복원한다', () => {
    save({ lat: 37.5, lng: 127.0, accuracy: 20, ts: Date.now() });
    const { result } = renderHook(() => useGeolocation());
    expect(result.current.coords).toEqual({ lat: 37.5, lng: 127.0 });
    expect(result.current.accuracy).toBe(20);
  });

  it('복원해도 status는 idle이다', () => {
    // Map의 geo effect는 [geo.status]에만 의존하고, 지도가 준비되기 전에
    // 발화하면 마커를 못 찍고 조용히 끝난다. status까지 되살리면 그 한 번을
    // 헛되이 쓰게 되므로 좌표만 복원한다.
    save({ lat: 37.5, lng: 127.0, accuracy: 20, ts: Date.now() });
    const { result } = renderHook(() => useGeolocation());
    expect(result.current.status).toBe('idle');
  });

  it('1시간이 지난 좌표는 복원하지 않는다', () => {
    save({ lat: 37.5, lng: 127.0, accuracy: 20, ts: Date.now() - 61 * 60 * 1000 });
    const { result } = renderHook(() => useGeolocation());
    expect(result.current.coords).toBeNull();
  });

  it('손상된 값은 무시하고 빈 상태로 시작한다', () => {
    sessionStorage.setItem(KEY, '{이건 JSON이 아니다');
    const { result } = renderHook(() => useGeolocation());
    expect(result.current.coords).toBeNull();
  });

  it('좌표가 아닌 값이 들어 있어도 무시한다', () => {
    save({ lat: 'x', lng: null, ts: Date.now() });
    const { result } = renderHook(() => useGeolocation());
    expect(result.current.coords).toBeNull();
  });

  it('request() 성공 시 세션에 저장한다', async () => {
    const { result } = renderHook(() => useGeolocation());
    act(() => result.current.request());
    await waitFor(() => expect(result.current.status).toBe('ok'));
    const saved = JSON.parse(sessionStorage.getItem(KEY));
    expect(saved).toMatchObject({ lat: 37.5, lng: 127.0, accuracy: 20 });
    expect(typeof saved.ts).toBe('number');
  });

  it('sessionStorage를 못 쓰는 환경에서도 죽지 않는다', () => {
    const orig = Object.getOwnPropertyDescriptor(window, 'sessionStorage');
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get() { throw new Error('storage disabled'); },
    });
    try {
      const { result } = renderHook(() => useGeolocation());
      expect(result.current.coords).toBeNull();
    } finally {
      Object.defineProperty(window, 'sessionStorage', orig);
    }
  });
});
