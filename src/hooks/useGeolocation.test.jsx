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
