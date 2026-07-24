import { describe, it, expect } from 'vitest';
import { canonicalizeSpecies } from './speciesCanonical';

describe('canonicalizeSpecies', () => {
  it('정상 수종명은 그대로 통과시킨다', () => {
    const r = canonicalizeSpecies('은행나무');
    expect(r.species).toEqual(['은행나무']);
    expect(r.kind).toBe('tree');
    expect(r.normalized).toBe(false);
    expect(r.raw).toBe('은행나무');
  });

  it('축약형을 정식명으로 확장한다', () => {
    expect(canonicalizeSpecies('양버즘').species).toEqual(['양버즘나무']);
    expect(canonicalizeSpecies('왕벚').species).toEqual(['왕벚나무']);
    expect(canonicalizeSpecies('목백합').species).toEqual(['튤립나무']);
    expect(canonicalizeSpecies('배롱').species).toEqual(['배롱나무']);
    expect(canonicalizeSpecies('양버즘').normalized).toBe(true);
  });

  it('오타를 교정한다', () => {
    expect(canonicalizeSpecies('메타세콰이어').species).toEqual(['메타세쿼이아']);
    expect(canonicalizeSpecies('메타세퀘이아').species).toEqual(['메타세쿼이아']);
    expect(canonicalizeSpecies('왕벗나무').species).toEqual(['왕벚나무']);
    expect(canonicalizeSpecies('므티나무').species).toEqual(['느티나무']);
    expect(canonicalizeSpecies('은헹나무').species).toEqual(['은행나무']);
  });

  it('복수 수종을 분해한다', () => {
    expect(canonicalizeSpecies('은행나무+이팝나무').species)
      .toEqual(['은행나무', '이팝나무']);
    expect(canonicalizeSpecies('홍가시+황금사철').species)
      .toEqual(['홍가시', '황금사철']);
    expect(canonicalizeSpecies('은행나무, 이팝나무, 왕벚나무').species)
      .toEqual(['은행나무', '이팝나무', '왕벚나무']);
    expect(canonicalizeSpecies('은행나무 등').species).toEqual(['은행나무']);
  });

  it('복수 수종 분해 후에도 각 항목을 정규화한다', () => {
    expect(canonicalizeSpecies('왕벚+메타세콰이어').species)
      .toEqual(['왕벚나무', '메타세쿼이아']);
  });

  it('결주·고사는 나무가 아닌 것으로 분류한다', () => {
    expect(canonicalizeSpecies('결주').kind).toBe('not-a-tree');
    expect(canonicalizeSpecies('고사').kind).toBe('not-a-tree');
    expect(canonicalizeSpecies('결주').species).toEqual([]);
  });

  it('비수종 표기가 섞인 라벨에서 수종을 건져낸다', () => {
    const r = canonicalizeSpecies('공분양버즘나무');
    expect(r.kind).toBe('tree');
    expect(r.species).toEqual(['양버즘나무']);
    expect(r.normalized).toBe(true);
  });

  it('숫자·기호·빈값은 unknown으로 분류한다', () => {
    expect(canonicalizeSpecies('').kind).toBe('unknown');
    expect(canonicalizeSpecies('1111').kind).toBe('unknown');
    expect(canonicalizeSpecies('×').kind).toBe('unknown');
    expect(canonicalizeSpecies('?').kind).toBe('unknown');
    expect(canonicalizeSpecies(null).kind).toBe('unknown');
    expect(canonicalizeSpecies(undefined).kind).toBe('unknown');
  });

  it('앞뒤에 붙은 숫자 노이즈를 제거한다', () => {
    expect(canonicalizeSpecies('0왕벚나무').species).toEqual(['왕벚나무']);
  });

  it('사전에 없는 라벨은 원본 그대로 두고 normalized=false로 표시한다', () => {
    const r = canonicalizeSpecies('느티느티나무넘은들5길나무');
    expect(r.kind).toBe('tree');
    expect(r.species).toEqual(['느티느티나무넘은들5길나무']);
    expect(r.normalized).toBe(false);
  });
});
