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

  it('괄호 주기(좌우·암수)를 수종명에서 걷어낸다', () => {
    // 괄호 안 쉼표가 복수 수종 구분자로 잘못 읽혀 "우)" 조각이 생기던 결함
    expect(canonicalizeSpecies('배롱나무(좌,우)').species).toEqual(['배롱나무']);
    expect(canonicalizeSpecies('목련(백,자)').species).toEqual(['목련']);
    expect(canonicalizeSpecies('은행나무(수)+은행나무(암)').species).toEqual(['은행나무']);
    // 닫는 괄호가 없는 원본도 있다
    expect(canonicalizeSpecies('베롱나무(좌').species).toEqual(['배롱나무']);
  });

  it('본수·집계 표기를 수종명으로 오인하지 않는다', () => {
    expect(canonicalizeSpecies('반송 외 4종').species).toEqual(['반송']);
    expect(canonicalizeSpecies('피라칸사스 16300주').species).toEqual(['피라칸사스']);
    expect(canonicalizeSpecies('낙우송, 종비나무 등 총 2,035종').species)
      .toEqual(['낙우송', '종비나무']);
    expect(canonicalizeSpecies('스잣+메타 외').species)
      .toEqual(['스트로브잣나무', '메타세쿼이아']);
  });

  it('천단위 쉼표가 이미 쪼개진 집계 표기도 걷어낸다', () => {
    // 명품숲 원본의 "총 2,035종"은 저장 단계에서 쉼표로 쪼개져
    // "총 2, 035종"으로 들어온다. 이때 "035종"만 지워지고 "등 총 2"가 남아
    // 수종 필터에 "종비나무 등 총"이 뜨던 결함.
    expect(canonicalizeSpecies('낙우송, 종비나무 등 총 2, 035종').species)
      .toEqual(['낙우송', '종비나무']);
    expect(canonicalizeSpecies('전나무, 서어나무, 갈참나무 등 총 3, 344종').species)
      .toEqual(['전나무', '서어나무', '갈참나무']);
  });

  it('집계·범주어만 남으면 수종으로 치지 않는다', () => {
    expect(canonicalizeSpecies('등').kind).toBe('unknown');
    expect(canonicalizeSpecies('기타').kind).toBe('unknown');
    expect(canonicalizeSpecies('활엽수').kind).toBe('unknown');
  });

  it('실측된 축약형을 정식명으로 확장한다', () => {
    expect(canonicalizeSpecies('먼').species).toEqual(['먼나무']);
    expect(canonicalizeSpecies('메타').species).toEqual(['메타세쿼이아']);
    expect(canonicalizeSpecies('메세').species).toEqual(['메타세쿼이아']);
    expect(canonicalizeSpecies('버즘').species).toEqual(['양버즘나무']);
    expect(canonicalizeSpecies('시다').species).toEqual(['히말라야시다']);
    expect(canonicalizeSpecies('대왕참').species).toEqual(['대왕참나무']);
    expect(canonicalizeSpecies('백합수').species).toEqual(['튤립나무']);
  });

  it('실측된 오타를 교정한다', () => {
    expect(canonicalizeSpecies('메타세콰이야').species).toEqual(['메타세쿼이아']);
    expect(canonicalizeSpecies('네타세콰이어').species).toEqual(['메타세쿼이아']);
    expect(canonicalizeSpecies('느니나무').species).toEqual(['느티나무']);
    expect(canonicalizeSpecies('회회나무').species).toEqual(['회화나무']);
    expect(canonicalizeSpecies('아팝나무').species).toEqual(['이팝나무']);
    expect(canonicalizeSpecies('막우송').species).toEqual(['낙우송']);
  });

  it('한 글자 축약은 추측하지 않고 원본을 유지한다', () => {
    // '소'가 소나무(등급 3)인지 단정할 수 없다. '가시'를 등재하지 않는 것과 같은 이유다.
    expect(canonicalizeSpecies('소').species).toEqual(['소']);
    expect(canonicalizeSpecies('전').species).toEqual(['전']);
  });
});
