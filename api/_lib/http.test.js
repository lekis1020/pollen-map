import { describe, it, expect } from 'vitest';
import { resolveCors } from './http.js';

describe('resolveCors', () => {
  it('프로덕션 도메인 허용', () => {
    process.env.ALLOWED_ORIGINS = 'https://pollen.example.com';
    expect(resolveCors('https://pollen.example.com')).toBe('https://pollen.example.com');
  });
  it('vercel 프리뷰 허용', () => {
    expect(resolveCors('https://pollen-map-abc123.vercel.app')).toBe('https://pollen-map-abc123.vercel.app');
  });
  it('타 도메인 거부', () => {
    expect(resolveCors('https://evil.com')).toBeNull();
  });
});
