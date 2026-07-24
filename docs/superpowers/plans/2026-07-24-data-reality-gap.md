# 로드뷰 현실과 공개 데이터 격차 해소 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 공공 가로수 데이터의 검증 가능한 오류를 원본 훼손 없이 교정하고, 교정할 수 없는 불확실성은 로드뷰 메타데이터 기반 검증 상태로 정직하게 노출한다.

**Architecture:** 원본 데이터는 불변으로 두고, 그 위에 (a) 빌드타임 결정론적 정규화·플래그 레이어와 (b) 런타임 로드뷰 메타데이터 검증 레이어를 얹는다. 정규화·플래그·좌표교정 로직은 전부 순수 함수로 `src/`에 두고 앱과 CLI 스크립트가 공유한다. 이미지는 취득하지 않는다.

**Tech Stack:** React 19, Vite 8, Naver Maps API v3, Node ESM 스크립트, vitest(신규)

**설계 문서:** `docs/superpowers/specs/2026-07-24-data-reality-gap-design.md`
**측정 근거:** `docs/superpowers/specs/2026-07-24-data-audit.md`

## Global Constraints

- **공공데이터 원본을 절대 수정하지 않는다.** 교정은 별도 오버레이 파일로만 관리하고, 각 교정에 `method`·`confidence`·`evidence`를 반드시 첨부한다.
- **로드뷰 이미지를 취득·저장하지 않는다.** `panorama.getLocation()` 메타데이터만 사용한다. 검증 결과를 localStorage·IndexedDB·서버 어디에도 영속 저장하지 않는다.
- **근거 없는 알레르기 등급을 부여하지 않는다.** 근거를 못 찾은 수종은 DB에 등재하지 않고 "정보 없음"으로 남긴다.
- **정규화 사전에 실측하지 않은 항목을 추가하지 않는다.** 모든 항목은 실제 데이터에 존재하는 라벨이어야 한다.
- 디자인 토큰은 기존 healthcare-clean을 재사용한다. 새 색·다크모드·글래스모피즘을 도입하지 않는다. 액센트 `#0f766e`, warning `#b45309`, pending `#475569`, danger `#b91c1c`.
- 아이콘은 인라인 SVG만 쓴다. emoji 금지.
- 파일은 ESM(`import`/`export`). `package.json`에 `"type": "module"`이 이미 있다.

---

### Task 1: 수종명 정규화 모듈 + vitest 도입

**Files:**
- Create: `src/data/speciesCanonical.js`
- Create: `src/data/speciesCanonical.test.js`
- Modify: `package.json` (devDependency `vitest`, `test` 스크립트)

**Interfaces:**
- Consumes: 없음 (의존성 없는 순수 모듈)
- Produces:
  - `canonicalizeSpecies(raw: string) => { raw: string, species: string[], kind: 'tree'|'not-a-tree'|'unknown', normalized: boolean }`
  - `NOT_A_TREE_MARKERS: string[]`

- [ ] **Step 1: vitest 설치**

```bash
npm install --save-dev vitest@^4
```

- [ ] **Step 2: `package.json`에 test 스크립트 추가**

`"scripts"` 블록의 `"lint"` 줄 다음에 추가:

```json
    "test": "vitest run",
    "test:watch": "vitest",
```

- [ ] **Step 3: 실패하는 테스트 작성**

`src/data/speciesCanonical.test.js`:

```javascript
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
```

- [ ] **Step 4: 테스트 실패 확인**

Run: `npm test -- speciesCanonical`
Expected: FAIL — `Failed to resolve import "./speciesCanonical"`

- [ ] **Step 5: 구현 작성**

`src/data/speciesCanonical.js`:

```javascript
// 수종명 원본 문자열을 정규 형태로 변환한다.
// 공공데이터 원본은 수정하지 않는다 — raw를 보존한 결과 객체를 돌려준다.
//
// 사전 항목은 전부 실제 데이터에서 실측한 라벨이다.
// 추측으로 항목을 늘리지 말 것. 측정 근거는
// docs/superpowers/specs/2026-07-24-data-audit.md 참조.

const TYPO = {
  메타세콰이어: '메타세쿼이아',
  메타세콰이아: '메타세쿼이아',
  매타세콰이아: '메타세쿼이아',
  메타세과이어: '메타세쿼이아',
  메타세퀘이아: '메타세쿼이아',
  왕벗나무: '왕벚나무',
  벗나무: '벚나무',
  벚꽃나무: '벚나무',
  므티나무: '느티나무',
  느티나: '느티나무',
  은해나무: '은행나무',
  은헹나무: '은행나무',
  은나무: '은행나무',
  은행나: '은행나무',
  살구나무살구나무: '살구나무',
  무궁화나무: '무궁화',
};

const ABBREV = {
  왕벚: '왕벚나무',
  양버즘: '양버즘나무',
  배롱: '배롱나무',
  목백합: '튤립나무',
  느티: '느티나무',
  은행: '은행나무',
  이팝: '이팝나무',
  후박: '후박나무',
  가시: '가시나무',
  모감주: '모감주나무',
  복자기: '복자기나무',
  현사시: '현사시나무',
  살구: '살구나무',
};

// 원본 등록 단계에서 빈 자리·고사목을 수종명 칸에 적은 표기
export const NOT_A_TREE_MARKERS = [
  '결주', '고사', '공분', '미식재', '제거', '벌목', '굴취', '공터',
];

const JUNK_ONLY = /^[\s0-9?×xX\-.]*$/;
const SPLIT = /\s*[+,/·]\s*|\s+외\s*\d+\s*/;
const TRAILING_ETC = /\s*등\s*$/;
const EDGE_DIGITS = /^[0-9]+|[0-9]+$/g;

function canonicalizeOne(token) {
  const t = token.trim().replace(EDGE_DIGITS, '').trim();
  if (!t) return null;
  const fixed = TYPO[t] || ABBREV[t];
  return { name: fixed || t, changed: Boolean(fixed) };
}

export function canonicalizeSpecies(raw) {
  const text = String(raw ?? '').trim();
  if (!text || JUNK_ONLY.test(text)) {
    return { raw: text, species: [], kind: 'unknown', normalized: false };
  }

  // 비수종 표기를 걷어낸다. 전부 걷히면 나무가 아니다.
  let stripped = text;
  let hadMarker = false;
  for (const marker of NOT_A_TREE_MARKERS) {
    if (stripped.includes(marker)) {
      hadMarker = true;
      stripped = stripped.split(marker).join('');
    }
  }
  stripped = stripped.trim();
  if (hadMarker && (!stripped || JUNK_ONLY.test(stripped))) {
    return { raw: text, species: [], kind: 'not-a-tree', normalized: false };
  }

  const withoutEtc = stripped.replace(TRAILING_ETC, '');
  const changedByEtc = withoutEtc !== stripped;

  const parts = withoutEtc.split(SPLIT).map(canonicalizeOne).filter(Boolean);
  if (parts.length === 0) {
    return { raw: text, species: [], kind: 'unknown', normalized: false };
  }

  const species = parts.map((p) => p.name);
  const normalized =
    hadMarker ||
    changedByEtc ||
    parts.some((p) => p.changed) ||
    species.join('+') !== text;

  return { raw: text, species, kind: 'tree', normalized };
}
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `npm test -- speciesCanonical`
Expected: PASS — 10 tests passed

- [ ] **Step 7: 실제 데이터에 적용해 회귀가 없는지 확인**

`node --input-type=module -e` 로 임시 실행 (파일 생성 불필요):

```bash
node --input-type=module -e "
import fs from 'fs';
const { canonicalizeSpecies } = await import('./src/data/speciesCanonical.js');
const j = JSON.parse(fs.readFileSync('public/data/seoul-trees.json','utf8'));
const cnt = new Array(j.dicts.sp.length).fill(0);
for (const i of j.sp) cnt[i]++;
let tree=0, notTree=0, unknown=0, changed=0;
j.dicts.sp.forEach((s,i)=>{
  const c=cnt[i]; if(!c) return;
  const r=canonicalizeSpecies(s);
  if(r.kind==='tree') tree+=c; else if(r.kind==='not-a-tree') notTree+=c; else unknown+=c;
  if(r.normalized) changed+=c;
});
console.log('tree', tree, 'not-a-tree', notTree, 'unknown', unknown, 'normalized', changed);
"
```

Expected: `not-a-tree`가 300 근처(감사 실측 303), `unknown`이 950 근처(실측 948),
`tree`가 255,900 근처. 크게 다르면 사전이나 분기 로직을 재점검한다.

- [ ] **Step 8: 커밋**

```bash
git add package.json package-lock.json src/data/speciesCanonical.js src/data/speciesCanonical.test.js
git commit -m "feat(data): 수종명 정규화 모듈 추가 + vitest 도입

오타·축약형·복수수종·결주/고사 표기를 정규 형태로 변환한다.
사전 항목은 전량 실측 라벨 기반."
```

---

### Task 2: 알레르기 DB 3단계 매칭

**Files:**
- Modify: `src/data/allergenDatabase.js` (`ALLERGEN_LEVELS` 0번 라벨, `getAllergenInfo`, 신규 export)
- Create: `src/data/allergenDatabase.test.js`

**Interfaces:**
- Consumes: `canonicalizeSpecies` (Task 1)
- Produces:
  - `getAllergenInfo(speciesName: string) => entry|null` — 시그니처 유지 (기존 호출부 5곳 무수정)
  - `getAllergenMatch(speciesName: string) => { info: entry|null, matchType: 'exact'|'inferred'|'none' }`
  - `getAllergenInfos(speciesList: string[]) => Array<{ species: string, info: entry|null, matchType: string }>`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/data/allergenDatabase.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import {
  getAllergenInfo, getAllergenLevel, getAllergenMatch, getAllergenInfos,
  ALLERGEN_LEVELS,
} from './allergenDatabase';

describe('축약형 매칭 (회귀 방지)', () => {
  it('양버즘은 플라타너스 등급 3이어야 한다', () => {
    // 가장 위험한 false negative — 알레르기 높은 수종이 "정보 없음"으로 표시되던 버그
    expect(getAllergenLevel('양버즘')).toBe(3);
    expect(getAllergenInfo('양버즘').name).toBe('플라타너스');
  });

  it('그 밖의 축약형도 정식명과 같은 등급을 준다', () => {
    expect(getAllergenLevel('왕벚')).toBe(getAllergenLevel('왕벚나무'));
    expect(getAllergenLevel('배롱')).toBe(getAllergenLevel('배롱나무'));
    expect(getAllergenLevel('목백합')).toBe(getAllergenLevel('튤립나무'));
  });

  it('오타도 정식명과 같은 등급을 준다', () => {
    expect(getAllergenLevel('메타세콰이어')).toBe(getAllergenLevel('메타세쿼이아'));
    expect(getAllergenLevel('왕벗나무')).toBe(getAllergenLevel('왕벚나무'));
  });
});

describe('기존 부분일치 폴백 보존 (회귀 방지)', () => {
  it('부분일치로 동작하던 라벨이 계속 동작한다', () => {
    expect(getAllergenLevel('대왕참나무')).toBe(3);   // 참나무
    expect(getAllergenLevel('은단풍')).toBe(2);       // 단풍나무
    expect(getAllergenLevel('스트로브잣나무')).toBe(3); // 소나무
    expect(getAllergenLevel('중국단풍')).toBe(2);
    expect(getAllergenLevel('수양벚나무')).toBe(1);
  });

  it('부분일치로 잡힌 것은 matchType이 inferred다', () => {
    expect(getAllergenMatch('대왕참나무').matchType).toBe('inferred');
    expect(getAllergenMatch('은행나무').matchType).toBe('exact');
    expect(getAllergenMatch('양버즘').matchType).toBe('exact');
  });
});

describe('미매칭', () => {
  it('DB에 없는 수종은 null과 none을 준다', () => {
    const m = getAllergenMatch('존재하지않는수종이름');
    expect(m.info).toBeNull();
    expect(m.matchType).toBe('none');
    expect(getAllergenLevel('존재하지않는수종이름')).toBe(0);
  });

  it('빈값도 안전하게 처리한다', () => {
    expect(getAllergenInfo('')).toBeNull();
    expect(getAllergenInfo(null)).toBeNull();
    expect(getAllergenLevel(undefined)).toBe(0);
  });
});

describe('복수 수종', () => {
  it('모든 종의 정보를 반환한다', () => {
    const r = getAllergenInfos(['은행나무', '이팝나무']);
    expect(r).toHaveLength(2);
    expect(r[0].info.name).toBe('은행나무');
    expect(r[1].info.name).toBe('이팝나무');
  });

  it('일부만 매칭돼도 나머지를 버리지 않는다', () => {
    const r = getAllergenInfos(['은행나무', '존재하지않는수종']);
    expect(r).toHaveLength(2);
    expect(r[1].info).toBeNull();
    expect(r[1].matchType).toBe('none');
  });
});

describe('등급 0의 의미', () => {
  it('0은 "해당없음"이 아니라 "정보 없음"이다', () => {
    expect(ALLERGEN_LEVELS[0].label).toBe('정보 없음');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- allergenDatabase`
Expected: FAIL — `getAllergenMatch is not a function`, `양버즘` 등급이 3이 아닌 0

- [ ] **Step 3: `ALLERGEN_LEVELS`의 0번 항목 수정**

`src/data/allergenDatabase.js` 8행:

```javascript
  0: { label: '해당없음', color: '#3498db', description: '알레르기 항원 미확인' },
```

를 다음으로 교체:

```javascript
  0: { label: '정보 없음', color: '#475569', description: 'DB에 등재되지 않은 수종입니다' },
```

DB 34개 항목 중 `level: 0`인 것은 없다(실측). 따라서 0은 오직 미매칭을 뜻하며,
"해당없음"이라는 라벨은 "알레르기 유발 안 함"으로 오독된다.

- [ ] **Step 4: 별칭 인덱스와 3단계 매칭 구현**

`src/data/allergenDatabase.js` 최상단 import 추가:

```javascript
import { canonicalizeSpecies } from './speciesCanonical';
```

파일 끝의 `getAllergenInfo` / `getAllergenLevel`을 통째로 아래로 교체:

```javascript
// 별칭 → DB 항목 정확 매칭 인덱스.
// name·keywords를 모두 키로 넣는다. 최초 등록이 이긴다(DB는 등급 내림차순 정렬).
const EXACT_INDEX = (() => {
  const map = new Map();
  for (const entry of ALLERGEN_DATABASE) {
    for (const key of [entry.name, ...entry.keywords]) {
      if (!map.has(key)) map.set(key, entry);
    }
  }
  return map;
})();

// 단일 수종명에 대해 3단계로 매칭한다.
//   1. 정규화 후 정확 매칭 (exact)
//   2. 기존 부분일치 폴백 (inferred) — 대왕참나무→참나무 같은 케이스 보존
//   3. 미매칭 (none)
export function getAllergenMatch(speciesName) {
  if (!speciesName) return { info: null, matchType: 'none' };

  const { species } = canonicalizeSpecies(speciesName);
  const candidates = species.length > 0 ? species : [String(speciesName).trim()];

  for (const name of candidates) {
    const hit = EXACT_INDEX.get(name);
    if (hit) return { info: hit, matchType: 'exact' };
  }

  for (const name of candidates) {
    for (const entry of ALLERGEN_DATABASE) {
      for (const keyword of entry.keywords) {
        if (name.includes(keyword)) return { info: entry, matchType: 'inferred' };
      }
    }
  }

  return { info: null, matchType: 'none' };
}

// 수종명으로 알레르기 정보를 조회 (기존 시그니처 유지)
export function getAllergenInfo(speciesName) {
  return getAllergenMatch(speciesName).info;
}

// 알레르기 등급 반환 (매칭 안 되면 0 = 정보 없음)
export function getAllergenLevel(speciesName) {
  const info = getAllergenInfo(speciesName);
  return info ? info.level : 0;
}

// 복수 수종에 대해 각각의 정보를 반환한다.
// "은행나무+이팝나무"처럼 한 칸에 여러 종이 적힌 경우 두 번째 이후 종의
// 꽃가루 시기·증상이 소실되던 문제를 막는다.
export function getAllergenInfos(speciesList) {
  return (speciesList || []).map((species) => ({
    species,
    ...getAllergenMatch(species),
  }));
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test -- allergenDatabase`
Expected: PASS — 모든 테스트 통과

- [ ] **Step 6: 전체 테스트 + 린트**

Run: `npm test && npm run lint`
Expected: 전부 통과, 린트 에러 0

- [ ] **Step 7: 커밋**

```bash
git add src/data/allergenDatabase.js src/data/allergenDatabase.test.js
git commit -m "fix(allergen): 축약형 수종이 등급 0으로 떨어지던 버그 수정

라벨.includes(키워드) 단방향 매칭 탓에 라벨이 키워드보다 짧은 축약형이
전부 미매칭됐다. 특히 '양버즘'이 등급 3(플라타너스)이 아닌 0으로 표시됨.

별칭 정확 매칭을 1단계로 추가하고 기존 부분일치는 2단계 폴백으로 보존해
대왕참나무·은단풍 등 1,646개 라벨의 기존 동작을 유지한다.
등급 0의 라벨을 '해당없음'에서 '정보 없음'으로 바로잡았다."
```

---

### Task 3: 알레르기 DB 수종 확장

**Files:**
- Modify: `src/data/allergenDatabase.js` (`ALLERGEN_DATABASE` 배열에 항목 추가)
- Modify: `src/data/allergenDatabase.test.js` (커버리지 테스트 추가)

**Interfaces:**
- Consumes: Task 2의 `getAllergenMatch`
- Produces: 없음 (데이터만 추가)

**주의:** 등급은 근거를 확인한 것만 부여한다. 대부분 충매화(곤충 수분)라 풍매화보다
꽃가루 알레르기 기여가 낮다. 확신이 없으면 항목을 추가하지 말고 "정보 없음"으로 남긴다.

- [ ] **Step 1: 커버리지 테스트 작성**

`src/data/allergenDatabase.test.js` 끝에 추가:

```javascript
describe('서울 소스 미등재 수종 커버리지', () => {
  // 감사에서 등급 0으로 떨어진 상위 수종 (docs/.../2026-07-24-data-audit.md)
  const NEWLY_COVERED = [
    '감나무', '층층나무', '살구나무', '산딸나무', '모과나무',
    '히말라야시다', '대추나무', '꽃사과', '팥배나무', '때죽나무',
  ];

  it.each(NEWLY_COVERED)('%s가 DB에 등재되어 있다', (name) => {
    const m = getAllergenMatch(name);
    expect(m.info).not.toBeNull();
    expect(m.matchType).toBe('exact');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- allergenDatabase`
Expected: FAIL — 10건 모두 `expected null not to be null`

- [ ] **Step 3: DB 항목 추가**

`src/data/allergenDatabase.js`의 `ALLERGEN_DATABASE` 배열 끝(`튤립나무` 항목 다음,
닫는 `];` 앞)에 추가:

```javascript
  // === 낮음 (1) - 충매화 수종 ===
  // 곤충이 수분을 매개하므로 공기 중 꽃가루 농도가 낮다.
  // 접촉·근접 시 경미한 반응 가능성만 기재한다.
  {
    name: '감나무',
    englishName: 'Persimmon',
    scientificName: 'Diospyros kaki',
    level: 1,
    pollenMonths: [5, 6],
    symptoms: '경미한 비염 (충매화로 공기 중 꽃가루 적음)',
    keywords: ['감나무'],
  },
  {
    name: '층층나무',
    englishName: 'Giant Dogwood',
    scientificName: 'Cornus controversa',
    level: 1,
    pollenMonths: [5, 6],
    symptoms: '경미한 비염 (충매화)',
    keywords: ['층층나무'],
  },
  {
    name: '살구나무',
    englishName: 'Apricot',
    scientificName: 'Prunus armeniaca',
    level: 1,
    pollenMonths: [3, 4],
    symptoms: '경미한 비염, 구강알레르기증후군(장미과 교차반응)',
    keywords: ['살구나무', '살구', '매화나무'],
  },
  {
    name: '산딸나무',
    englishName: 'Kousa Dogwood',
    scientificName: 'Cornus kousa',
    level: 1,
    pollenMonths: [5, 6],
    symptoms: '경미한 비염 (충매화)',
    keywords: ['산딸나무'],
  },
  {
    name: '모과나무',
    englishName: 'Chinese Quince',
    scientificName: 'Pseudocydonia sinensis',
    level: 1,
    pollenMonths: [4, 5],
    symptoms: '경미한 비염 (충매화)',
    keywords: ['모과나무'],
  },
  {
    name: '대추나무',
    englishName: 'Jujube',
    scientificName: 'Ziziphus jujuba',
    level: 1,
    pollenMonths: [5, 6],
    symptoms: '경미한 비염 (충매화)',
    keywords: ['대추나무'],
  },
  {
    name: '꽃사과',
    englishName: 'Flowering Crabapple',
    scientificName: 'Malus floribunda',
    level: 1,
    pollenMonths: [4, 5],
    symptoms: '경미한 비염, 구강알레르기증후군(장미과 교차반응)',
    keywords: ['꽃사과'],
  },
  {
    name: '팥배나무',
    englishName: 'Korean Mountain Ash',
    scientificName: 'Aria alnifolia',
    level: 1,
    pollenMonths: [5],
    symptoms: '경미한 비염 (충매화)',
    keywords: ['팥배나무'],
  },
  {
    name: '때죽나무',
    englishName: 'Japanese Snowbell',
    scientificName: 'Styrax japonicus',
    level: 1,
    pollenMonths: [5, 6],
    symptoms: '경미한 비염 (충매화)',
    keywords: ['때죽나무'],
  },
  {
    name: '후박나무',
    englishName: 'Machilus',
    scientificName: 'Machilus thunbergii',
    level: 1,
    pollenMonths: [5, 6],
    symptoms: '경미한 비염 (남부지방 상록활엽수)',
    keywords: ['후박나무'],
  },
  {
    name: '먼나무',
    englishName: 'Kurogane Holly',
    scientificName: 'Ilex rotunda',
    level: 1,
    pollenMonths: [5, 6],
    symptoms: '경미한 비염 (충매화, 남부지방 상록수)',
    keywords: ['먼나무'],
  },
  {
    name: '모감주나무',
    englishName: 'Goldenrain Tree',
    scientificName: 'Koelreuteria paniculata',
    level: 1,
    pollenMonths: [6, 7],
    symptoms: '경미한 비염 (충매화)',
    keywords: ['모감주나무'],
  },
  {
    name: '동백나무',
    englishName: 'Camellia',
    scientificName: 'Camellia japonica',
    level: 1,
    pollenMonths: [12, 1, 2, 3],
    symptoms: '경미한 비염 (조매화로 공기 중 꽃가루 매우 적음)',
    keywords: ['동백나무', '동백'],
  },

  // === 보통 (2) - 풍매화 침엽수 ===
  {
    name: '히말라야시다',
    englishName: 'Deodar Cedar',
    scientificName: 'Cedrus deodara',
    level: 2,
    pollenMonths: [10, 11],
    symptoms: '비염, 결막염 (가을 개화 풍매화, 소나무과)',
    keywords: ['히말라야시다', '히말리야시다', '개잎갈나무'],
  },
  {
    name: '가시나무',
    englishName: 'Ring-cupped Oak',
    scientificName: 'Quercus myrsinifolia',
    level: 3,
    pollenMonths: [4, 5],
    symptoms: '비염, 결막염, 천식 (참나무속 풍매화)',
    keywords: ['가시나무'],
  },
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- allergenDatabase`
Expected: PASS — 커버리지 테스트 10건 포함 전부 통과

- [ ] **Step 5: 실제 감축 효과 측정**

```bash
node --input-type=module -e "
import fs from 'fs';
const { getAllergenMatch } = await import('./src/data/allergenDatabase.js');
const j = JSON.parse(fs.readFileSync('public/data/seoul-trees.json','utf8'));
const cnt = new Array(j.dicts.sp.length).fill(0);
for (const i of j.sp) cnt[i]++;
let none = 0; const rest = {};
j.dicts.sp.forEach((s,i)=>{
  const c = cnt[i]; if(!c || !s) return;
  if (getAllergenMatch(s).matchType === 'none') { none += c; rest[s] = c; }
});
console.log('등급 정보 없음:', none, '(감사 시점 2,904)');
console.log(Object.entries(rest).sort((a,b)=>b[1]-a[1]).slice(0,15));
"
```

Expected: `등급 정보 없음`이 1,000 미만. 남는 것은 결주·고사·빈값 계열이어야 한다.
실제 수종인데 남아 있으면 Step 3에 항목을 더 추가한다.

- [ ] **Step 6: 커밋**

```bash
git add src/data/allergenDatabase.js src/data/allergenDatabase.test.js
git commit -m "feat(allergen): 미등재 수종 15종 추가

서울 소스에서 등급 0으로 떨어지던 감나무(921)·층층나무(298)·
살구나무(217) 등을 등재. 근거를 확인한 종만 추가하고
확신 없는 종은 '정보 없음'으로 남긴다."
```

---

### Task 4: 좌표 한 자리 오타 교정 모듈

**Files:**
- Create: `src/utils/coordRepair.js`
- Create: `src/utils/coordRepair.test.js`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `isInKorea(lat: number, lng: number) => boolean`
  - `repairCoordinate({ badLat: string, badLng: string, anchorLat: number, anchorLng: number, maxDistanceKm?: number }) => { lat: number, lng: number, field: 'lat'|'lng', distanceKm: number } | null`
  - `haversineKm(lat1, lng1, lat2, lng2) => number`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/utils/coordRepair.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { isInKorea, repairCoordinate, haversineKm } from './coordRepair';

describe('haversineKm', () => {
  it('같은 점은 0이다', () => {
    expect(haversineKm(37.5, 127.0, 37.5, 127.0)).toBe(0);
  });

  it('서울시청~강남역은 대략 8~9km다', () => {
    const d = haversineKm(37.5665, 126.9780, 37.4979, 127.0276);
    expect(d).toBeGreaterThan(7);
    expect(d).toBeLessThan(10);
  });
});

describe('isInKorea', () => {
  it('국내 좌표를 통과시킨다', () => {
    expect(isInKorea(37.5665, 126.9780)).toBe(true);  // 서울
    expect(isInKorea(33.4996, 126.5312)).toBe(true);  // 제주
  });

  it('국토 밖 좌표를 거른다', () => {
    expect(isInKorea(26.305441, 127.562409)).toBe(false); // 위도 오타
    expect(isInKorea(36.436397, 158.239748)).toBe(false); // 경도 오타
    expect(isInKorea(39.590401, 128.450201)).toBe(false); // 북한 이북
  });
});

describe('repairCoordinate — 실측 검증 케이스', () => {
  // docs/superpowers/specs/2026-07-24-data-audit.md 에서 확정 교정된 5건
  it('충북 옥천 가화길: 위도 26 → 36', () => {
    const r = repairCoordinate({
      badLat: '26.305441', badLng: '127.562409',
      anchorLat: 36.307305, anchorLng: 127.561457,
    });
    expect(r).not.toBeNull();
    expect(r.lat).toBeCloseTo(36.305441, 6);
    expect(r.field).toBe('lat');
    expect(r.distanceKm).toBeLessThan(1);
  });

  it('경북 상주: 경도 158 → 128', () => {
    const r = repairCoordinate({
      badLat: '36.436397', badLng: '158.239748',
      anchorLat: 36.435432, anchorLng: 128.246033,
    });
    expect(r.lng).toBeCloseTo(128.239748, 6);
    expect(r.field).toBe('lng');
  });

  it('부산 동래구: 경도 120 → 129', () => {
    const r = repairCoordinate({
      badLat: '35.214684', badLng: '120.076932',
      anchorLat: 35.215517, anchorLng: 129.075001,
    });
    expect(r.lng).toBeCloseTo(129.076932, 6);
  });
});

describe('repairCoordinate — 교정을 포기해야 하는 경우', () => {
  it('한 자리 치환으로 앵커 근처에 못 오면 null을 반환한다', () => {
    const r = repairCoordinate({
      badLat: '10.000000', badLng: '10.000000',
      anchorLat: 37.5, anchorLng: 127.0,
    });
    expect(r).toBeNull();
  });

  it('앵커 자체가 국토 밖이면 교정하지 않는다', () => {
    const r = repairCoordinate({
      badLat: '26.305441', badLng: '127.562409',
      anchorLat: 5.0, anchorLng: 5.0,
    });
    expect(r).toBeNull();
  });

  it('후보가 둘 이상이면 모호하므로 null을 반환한다', () => {
    // 앵커 반경을 아주 크게 잡아 여러 후보가 들어오게 만든 상황
    const r = repairCoordinate({
      badLat: '26.305441', badLng: '127.562409',
      anchorLat: 36.307305, anchorLng: 127.561457,
      maxDistanceKm: 2000,
    });
    expect(r).toBeNull();
  });

  it('이미 국내 좌표면 교정하지 않는다', () => {
    const r = repairCoordinate({
      badLat: '37.500000', badLng: '127.000000',
      anchorLat: 37.501, anchorLng: 127.001,
    });
    expect(r).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- coordRepair`
Expected: FAIL — `Failed to resolve import "./coordRepair"`

- [ ] **Step 3: 구현 작성**

`src/utils/coordRepair.js`:

```javascript
// 공공데이터 좌표의 한 자리 숫자 오타를 결정론적으로 교정한다.
//
// 근거: 국토 밖으로 튄 좌표 9건을 조사한 결과 전부 한 자리 오타였다.
//   36.307305 → 26.305441 (3→2), 128.239748 → 158.239748 (2→5) 등
// 잘못된 끝점의 각 자릿수를 0~9로 치환한 후보 중, 정상 끝점(앵커) 근처로
// 들어오는 것이 정확히 하나일 때만 교정한다. 둘 이상이면 모호하므로 포기한다.
//
// 측정: 대상 9건 중 5건 확정 교정, 모호 0건.
// docs/superpowers/specs/2026-07-24-data-audit.md 참조.

const KOREA_BOUNDS = { latMin: 33.0, latMax: 38.7, lngMin: 124.5, lngMax: 132.0 };
const EARTH_RADIUS_KM = 6371;
const DEFAULT_MAX_DISTANCE_KM = 5;

export function isInKorea(lat, lng) {
  return (
    Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= KOREA_BOUNDS.latMin && lat <= KOREA_BOUNDS.latMax &&
    lng >= KOREA_BOUNDS.lngMin && lng <= KOREA_BOUNDS.lngMax
  );
}

const toRad = (d) => (d * Math.PI) / 180;

export function haversineKm(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

// 문자열의 각 숫자 자리를 0~9로 한 번씩 치환한 모든 변형을 만든다.
function digitVariants(numStr) {
  const out = new Set();
  for (let i = 0; i < numStr.length; i++) {
    if (!/[0-9]/.test(numStr[i])) continue;
    for (let d = 0; d <= 9; d++) {
      const ch = String(d);
      if (ch === numStr[i]) continue;
      out.add(numStr.slice(0, i) + ch + numStr.slice(i + 1));
    }
  }
  return [...out];
}

export function repairCoordinate({
  badLat, badLng, anchorLat, anchorLng,
  maxDistanceKm = DEFAULT_MAX_DISTANCE_KM,
}) {
  const badLatNum = Number(badLat);
  const badLngNum = Number(badLng);

  // 앵커가 신뢰할 수 없으면 기준이 없으므로 교정하지 않는다.
  if (!isInKorea(anchorLat, anchorLng)) return null;
  // 이미 정상이면 교정 대상이 아니다.
  if (isInKorea(badLatNum, badLngNum)) return null;

  const candidates = [];
  for (const v of digitVariants(String(badLat))) {
    const lat = Number(v);
    if (isInKorea(lat, badLngNum)) candidates.push({ lat, lng: badLngNum, field: 'lat' });
  }
  for (const v of digitVariants(String(badLng))) {
    const lng = Number(v);
    if (isInKorea(badLatNum, lng)) candidates.push({ lat: badLatNum, lng, field: 'lng' });
  }

  const near = candidates
    .map((c) => ({ ...c, distanceKm: haversineKm(anchorLat, anchorLng, c.lat, c.lng) }))
    .filter((c) => c.distanceKm <= maxDistanceKm);

  // 같은 좌표로 수렴한 후보는 하나로 본다.
  const unique = [...new Map(near.map((c) => [`${c.lat},${c.lng}`, c])).values()];

  return unique.length === 1 ? unique[0] : null;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- coordRepair`
Expected: PASS — 11 tests passed

- [ ] **Step 5: 커밋**

```bash
git add src/utils/coordRepair.js src/utils/coordRepair.test.js
git commit -m "feat(data): 좌표 한 자리 오타 결정론적 교정 모듈

국토 밖으로 튄 좌표를 정상 끝점 기준으로 한 자리 치환 탐색해 교정한다.
후보가 유일할 때만 교정하고 모호하면 포기한다. 실측 9건 중 5건 확정 교정."
```

---

### Task 5: 품질 플래그 판정 모듈

**Files:**
- Create: `src/utils/qualityFlags.js`
- Create: `src/utils/qualityFlags.test.js`

**Interfaces:**
- Consumes: `canonicalizeSpecies` (Task 1), `getAllergenMatch` (Task 2), `isInKorea`·`haversineKm` (Task 4)
- Produces:
  - `FLAG: Record<string, string>` — 플래그 코드 상수
  - `flagNationwideRecord(item, options?) => string[]`
  - `flagSeoulTree(tree, options?) => string[]`
  - `SIDO_BOUNDS: Record<string, [number, number, number, number]>`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/utils/qualityFlags.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { FLAG, flagNationwideRecord, flagSeoulTree } from './qualityFlags';

const OK_RECORD = {
  sttreeStretNm: '샘골길',
  startLatitude: '36.967860', startLongitude: '127.951170',
  endLatitude: '36.966090', endLongitude: '127.952520',
  sttreeKnd: '왕벚나무', sttreeCo: '32', sttreeStretLt: '0.23',
  institutionNm: '충청북도 충주시', referenceDate: '2025-06-30',
};

describe('flagNationwideRecord — 정상 레코드', () => {
  it('정상 레코드에는 플래그가 없다', () => {
    expect(flagNationwideRecord(OK_RECORD)).toEqual([]);
  });
});

describe('flagNationwideRecord — 좌표', () => {
  it('국토 밖 좌표를 잡는다', () => {
    const r = flagNationwideRecord({ ...OK_RECORD, endLongitude: '158.239748' });
    expect(r).toContain(FLAG.COORD_OUT_OF_KR);
  });

  it('등록기관 시도와 좌표가 다르면 잡는다', () => {
    // 강동구청인데 좌표가 경기 광주 부근
    const r = flagNationwideRecord({
      ...OK_RECORD,
      institutionNm: '서울특별시 강동구청',
      startLatitude: '37.315901', startLongitude: '127.071743',
      endLatitude: '37.316901', endLongitude: '127.072743',
    });
    expect(r).toContain(FLAG.COORD_WRONG_REGION);
  });

  it('직선거리가 신고연장보다 길면 잡는다 (물리적 모순)', () => {
    const r = flagNationwideRecord({
      ...OK_RECORD,
      sttreeStretLt: '0.1',   // 100m라고 신고
      endLatitude: '36.997860', // 실제 직선거리 약 3km
    });
    expect(r).toContain(FLAG.LENGTH_CONTRADICTION);
  });

  it('직선거리가 신고연장보다 짧은 것은 정상이므로 잡지 않는다', () => {
    // 구불구불한 도로는 직선거리 < 도로연장이 당연하다. 중앙값 0.83
    const r = flagNationwideRecord({ ...OK_RECORD, sttreeStretLt: '2.0' });
    expect(r).not.toContain(FLAG.LENGTH_CONTRADICTION);
  });

  it('시작과 끝이 같으면 잡는다', () => {
    const r = flagNationwideRecord({
      ...OK_RECORD,
      endLatitude: OK_RECORD.startLatitude,
      endLongitude: OK_RECORD.startLongitude,
    });
    expect(r).toContain(FLAG.SEGMENT_DEGENERATE);
  });
});

describe('flagNationwideRecord — 수종·속성', () => {
  it('복수 수종 기재를 잡는다', () => {
    const r = flagNationwideRecord({ ...OK_RECORD, sttreeKnd: '은행나무+이팝나무' });
    expect(r).toContain(FLAG.SPECIES_MULTI);
  });

  it('알레르기 DB 미매칭을 잡는다', () => {
    const r = flagNationwideRecord({ ...OK_RECORD, sttreeKnd: '존재하지않는수종' });
    expect(r).toContain(FLAG.SPECIES_UNMATCHED);
  });

  it('축약형은 정규화되므로 미매칭으로 잡지 않는다', () => {
    const r = flagNationwideRecord({ ...OK_RECORD, sttreeKnd: '양버즘' });
    expect(r).not.toContain(FLAG.SPECIES_UNMATCHED);
  });

  it('그루수 0을 잡는다', () => {
    expect(flagNationwideRecord({ ...OK_RECORD, sttreeCo: '0' })).toContain(FLAG.COUNT_ZERO);
    expect(flagNationwideRecord({ ...OK_RECORD, sttreeCo: '' })).toContain(FLAG.COUNT_ZERO);
  });

  it('기준일자 2022 이전을 잡는다', () => {
    const r = flagNationwideRecord({ ...OK_RECORD, referenceDate: '2021-01-01' });
    expect(r).toContain(FLAG.STALE);
  });
});

describe('flagSeoulTree', () => {
  const OK_TREE = { lat: 37.522895, lng: 127.020205, species: '은행나무', road: '테헤란로' };

  it('정상 개체에는 플래그가 없다', () => {
    expect(flagSeoulTree(OK_TREE)).toEqual([]);
  });

  it('결주·고사를 잡는다', () => {
    expect(flagSeoulTree({ ...OK_TREE, species: '결주' })).toContain(FLAG.NOT_A_TREE);
    expect(flagSeoulTree({ ...OK_TREE, species: '고사' })).toContain(FLAG.NOT_A_TREE);
  });

  it('수종 무효값을 잡는다', () => {
    expect(flagSeoulTree({ ...OK_TREE, species: '1111' })).toContain(FLAG.SPECIES_INVALID);
    expect(flagSeoulTree({ ...OK_TREE, species: '' })).toContain(FLAG.SPECIES_INVALID);
    expect(flagSeoulTree({ ...OK_TREE, species: '×' })).toContain(FLAG.SPECIES_INVALID);
  });

  it('도로명 무효값을 잡는다', () => {
    expect(flagSeoulTree({ ...OK_TREE, road: '3' })).toContain(FLAG.ROAD_INVALID);
    expect(flagSeoulTree({ ...OK_TREE, road: '' })).toContain(FLAG.ROAD_INVALID);
  });

  it('좌표 정밀도가 낮으면 잡는다', () => {
    expect(flagSeoulTree({ ...OK_TREE, lat: 37.522 })).toContain(FLAG.COORD_LOW_PRECISION);
  });

  it('같은 좌표에 많이 쌓이면 잡는다', () => {
    const r = flagSeoulTree(OK_TREE, { stackedCount: 89 });
    expect(r).toContain(FLAG.COORD_STACKED);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- qualityFlags`
Expected: FAIL — `Failed to resolve import "./qualityFlags"`

- [ ] **Step 3: 구현 작성**

`src/utils/qualityFlags.js`:

```javascript
// 공공데이터 레코드의 품질 문제를 결정론적으로 판정한다.
// 원본을 수정하지 않고 플래그만 붙인다.
//
// 각 플래그의 실측 발생 건수는
// docs/superpowers/specs/2026-07-24-data-audit.md 참조.

import { canonicalizeSpecies } from '../data/speciesCanonical';
import { getAllergenMatch } from '../data/allergenDatabase';
import { isInKorea, haversineKm } from './coordRepair';

export const FLAG = {
  // 전국 소스
  COORD_OUT_OF_KR: 'COORD_OUT_OF_KR',
  COORD_WRONG_REGION: 'COORD_WRONG_REGION',
  LENGTH_CONTRADICTION: 'LENGTH_CONTRADICTION',
  SEGMENT_DEGENERATE: 'SEGMENT_DEGENERATE',
  SPECIES_MULTI: 'SPECIES_MULTI',
  SPECIES_UNMATCHED: 'SPECIES_UNMATCHED',
  COUNT_ZERO: 'COUNT_ZERO',
  STALE: 'STALE',
  // 서울 소스
  NOT_A_TREE: 'NOT_A_TREE',
  SPECIES_INVALID: 'SPECIES_INVALID',
  ROAD_INVALID: 'ROAD_INVALID',
  COORD_LOW_PRECISION: 'COORD_LOW_PRECISION',
  COORD_STACKED: 'COORD_STACKED',
};

export const FLAG_LABEL = {
  [FLAG.COORD_OUT_OF_KR]: '좌표가 국토 밖입니다',
  [FLAG.COORD_WRONG_REGION]: '좌표가 등록 기관의 관할 시도를 벗어납니다',
  [FLAG.LENGTH_CONTRADICTION]: '좌표 직선거리가 신고된 구간 연장보다 깁니다',
  [FLAG.SEGMENT_DEGENERATE]: '구간의 시작점과 끝점이 같습니다',
  [FLAG.SPECIES_MULTI]: '한 칸에 여러 수종이 기재되어 있습니다',
  [FLAG.SPECIES_UNMATCHED]: '알레르기 정보가 등재되지 않은 수종입니다',
  [FLAG.COUNT_ZERO]: '그루수가 0으로 등록되어 있습니다',
  [FLAG.STALE]: '기준일자가 2022년 이전입니다',
  [FLAG.NOT_A_TREE]: '원본에 결주·고사로 기재되어 있습니다',
  [FLAG.SPECIES_INVALID]: '수종명이 비어 있거나 숫자·기호입니다',
  [FLAG.ROAD_INVALID]: '도로명이 비어 있거나 숫자입니다',
  [FLAG.COORD_LOW_PRECISION]: '좌표 정밀도가 낮습니다 (오차 100m 이상 가능)',
  [FLAG.COORD_STACKED]: '여러 그루가 완전히 같은 좌표에 등록되어 있습니다',
};

// 시도별 넉넉한 경계 상자. 인접 시도와 겹치도록 잡아 경계 부근 오탐을 피한다.
// 목적은 정밀 판정이 아니라 "부산인데 경기도 좌표" 같은 총체적 오류 탐지다.
export const SIDO_BOUNDS = {
  서울: [37.40, 37.72, 126.73, 127.28], 인천: [36.95, 37.98, 124.60, 126.80],
  경기: [36.88, 38.30, 126.35, 127.90], 강원: [37.00, 38.62, 127.05, 129.40],
  충북: [36.00, 37.30, 127.25, 128.70], 충남: [35.95, 37.10, 125.95, 127.60],
  대전: [36.17, 36.50, 127.25, 127.55], 세종: [36.42, 36.72, 127.15, 127.42],
  전북: [35.30, 36.20, 126.35, 127.95], 전남: [33.90, 35.55, 125.00, 127.95],
  광주: [35.03, 35.26, 126.62, 127.02], 경북: [35.55, 37.65, 127.75, 131.95],
  대구: [35.62, 36.05, 128.32, 128.82], 경남: [34.50, 35.95, 127.50, 129.35],
  부산: [34.85, 35.40, 128.72, 129.35], 울산: [35.30, 35.83, 128.95, 129.48],
  제주: [33.05, 33.62, 126.10, 126.99],
};

const SIDO_ALIAS = {
  서울특별시: '서울', 인천광역시: '인천', 경기도: '경기',
  강원특별자치도: '강원', 강원도: '강원', 충청북도: '충북', 충청남도: '충남',
  대전광역시: '대전', 세종특별자치시: '세종', 전북특별자치도: '전북',
  전라북도: '전북', 전라남도: '전남', 광주광역시: '광주', 경상북도: '경북',
  대구광역시: '대구', 경상남도: '경남', 부산광역시: '부산',
  울산광역시: '울산', 제주특별자치도: '제주', 제주도: '제주',
};

const JUNK_ONLY = /^[\s0-9?×xX\-.]*$/;

// 직선거리가 신고 연장보다 이 배율 이상 길면 물리적으로 불가능하다고 본다.
// 측정 오차·좌표 반올림을 감안해 15% 여유를 둔다.
const LENGTH_TOLERANCE = 1.15;
const STACKED_THRESHOLD = 10;
const MIN_COORD_DECIMALS = 5;

function decimalsOf(value) {
  const s = String(value);
  const dot = s.indexOf('.');
  return dot === -1 ? 0 : s.length - dot - 1;
}

export function flagNationwideRecord(item) {
  const flags = [];

  const sLat = Number(item.startLatitude);
  const sLng = Number(item.startLongitude);
  const eLat = Number(item.endLatitude);
  const eLng = Number(item.endLongitude);
  const hasCoords = Number.isFinite(sLat) && sLat !== 0 && Number.isFinite(eLat) && eLat !== 0;

  if (hasCoords) {
    if (!isInKorea(sLat, sLng) || !isInKorea(eLat, eLng)) {
      flags.push(FLAG.COORD_OUT_OF_KR);
    }

    const sido = SIDO_ALIAS[String(item.institutionNm || item.insttNm || '').trim().split(/\s+/)[0]];
    const box = sido && SIDO_BOUNDS[sido];
    if (box && !(sLat >= box[0] && sLat <= box[1] && sLng >= box[2] && sLng <= box[3])) {
      flags.push(FLAG.COORD_WRONG_REGION);
    }

    if (sLat === eLat && sLng === eLng) {
      flags.push(FLAG.SEGMENT_DEGENERATE);
    } else {
      const reportedKm = parseFloat(item.sttreeStretLt);
      if (reportedKm > 0) {
        const straightKm = haversineKm(sLat, sLng, eLat, eLng);
        // 직선거리 < 도로연장은 정상(구불구불한 도로). 그 반대만 모순이다.
        if (straightKm > reportedKm * LENGTH_TOLERANCE) {
          flags.push(FLAG.LENGTH_CONTRADICTION);
        }
      }
    }
  }

  const rawSpecies = String(item.sttreeKnd || '').trim();
  const canon = canonicalizeSpecies(rawSpecies);
  if (canon.kind === 'unknown') {
    flags.push(FLAG.SPECIES_INVALID);
  } else if (canon.kind === 'not-a-tree') {
    flags.push(FLAG.NOT_A_TREE);
  } else {
    if (canon.species.length > 1) flags.push(FLAG.SPECIES_MULTI);
    const unmatched = canon.species.every((s) => getAllergenMatch(s).matchType === 'none');
    if (unmatched) flags.push(FLAG.SPECIES_UNMATCHED);
  }

  if (!(parseInt(item.sttreeCo, 10) > 0)) flags.push(FLAG.COUNT_ZERO);

  const year = parseInt(String(item.referenceDate || '').slice(0, 4), 10);
  if (year && year <= 2022) flags.push(FLAG.STALE);

  return flags;
}

export function flagSeoulTree(tree, { stackedCount = 1 } = {}) {
  const flags = [];

  const canon = canonicalizeSpecies(tree.species);
  if (canon.kind === 'not-a-tree') flags.push(FLAG.NOT_A_TREE);
  else if (canon.kind === 'unknown') flags.push(FLAG.SPECIES_INVALID);

  const road = String(tree.road || '').trim();
  if (!road || JUNK_ONLY.test(road)) flags.push(FLAG.ROAD_INVALID);

  if (decimalsOf(tree.lat) < MIN_COORD_DECIMALS) flags.push(FLAG.COORD_LOW_PRECISION);
  if (stackedCount >= STACKED_THRESHOLD) flags.push(FLAG.COORD_STACKED);

  return flags;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- qualityFlags`
Expected: PASS

- [ ] **Step 5: 전체 테스트 + 린트**

Run: `npm test && npm run lint`
Expected: 전부 통과

- [ ] **Step 6: 커밋**

```bash
git add src/utils/qualityFlags.js src/utils/qualityFlags.test.js
git commit -m "feat(data): 품질 플래그 판정 모듈

좌표·수종·속성 이상을 결정론적으로 판정한다. 직선거리가 도로연장보다
짧은 것은 정상이므로 물리적 모순 방향만 플래그한다."
```

---

### Task 6: 감사 스크립트와 산출물

**Files:**
- Create: `scripts/audit-data.mjs`
- Modify: `package.json` (`audit:data` 스크립트)
- 생성물: `public/data/quality-flags.json`, `public/data/corrections.json`

**Interfaces:**
- Consumes: `flagNationwideRecord`·`flagSeoulTree`·`FLAG` (Task 5), `repairCoordinate` (Task 4)
- Produces: 두 JSON 파일. 스키마는 아래 Step 2 참조.

- [ ] **Step 1: `package.json`에 스크립트 추가**

`"scripts"` 블록의 `"geocode:forests"` 줄 다음에 추가:

```json
    "audit:data": "node scripts/audit-data.mjs",
```

- [ ] **Step 2: 스크립트 작성**

`scripts/audit-data.mjs`:

```javascript
// 두 데이터 소스를 검사해 품질 플래그와 좌표 교정안을 산출한다.
//
// 사용: npm run audit:data
// 산출: public/data/quality-flags.json, public/data/corrections.json
//
// 원본 데이터는 절대 수정하지 않는다. 교정은 오버레이 파일로만 남긴다.

import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FLAG, flagNationwideRecord, flagSeoulTree } from '../src/utils/qualityFlags.js';
import { repairCoordinate, isInKorea } from '../src/utils/coordRepair.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SEOUL_PATH = join(ROOT, 'public/data/seoul-trees.json');
const FLAGS_OUT = join(ROOT, 'public/data/quality-flags.json');
const CORRECTIONS_OUT = join(ROOT, 'public/data/corrections.json');

const API_BASE = 'https://api.data.go.kr/openapi/tn_pubr_public_sttree_stret_api';
const PAGE_SIZE = 1000;

function loadEnv() {
  const envPath = join(ROOT, '.env');
  if (!existsSync(envPath)) return {};
  const env = {};
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = loadEnv();
const API_KEY = process.env.VITE_DATA_API_KEY || env.VITE_DATA_API_KEY;
if (!API_KEY) {
  console.error('VITE_DATA_API_KEY 가 없습니다. .env 혹은 환경변수로 지정하세요.');
  process.exit(1);
}

async function fetchNationwide() {
  const first = await fetchPage(1);
  const total = Number(first.totalCount) || 0;
  const pages = Math.ceil(total / PAGE_SIZE);
  const rest = await Promise.all(
    Array.from({ length: pages - 1 }, (_, i) => fetchPage(i + 2))
  );
  return [first, ...rest].flatMap((b) => b.items || []);
}

async function fetchPage(pageNo) {
  const url = `${API_BASE}?serviceKey=${API_KEY}&pageNo=${pageNo}&numOfRows=${PAGE_SIZE}&type=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`전국 데이터 ${pageNo}페이지 실패: HTTP ${res.status}`);
  const json = await res.json();
  return json?.response?.body || {};
}

// 전국 소스: 레코드를 식별할 안정적인 id가 없으므로 기관+도로명+시작좌표로 키를 만든다.
function nationwideKey(item) {
  return [
    item.institutionNm || item.insttNm || '',
    item.sttreeStretNm || '',
    item.startLatitude || '',
    item.startLongitude || '',
  ].join('|');
}

function auditNationwide(items) {
  const flags = {};
  const corrections = [];
  const counts = {};
  const byInstitution = {};

  for (const item of items) {
    const inst = String(item.institutionNm || item.insttNm || '').trim();
    byInstitution[inst] ||= { total: 0, wrongRegion: 0 };
    byInstitution[inst].total += 1;

    const f = flagNationwideRecord(item);
    if (f.length) {
      flags[nationwideKey(item)] = f;
      for (const code of f) counts[code] = (counts[code] || 0) + 1;
      if (f.includes(FLAG.COORD_WRONG_REGION)) byInstitution[inst].wrongRegion += 1;
    }

    // 좌표 교정: 한쪽 끝점만 국토 밖일 때, 정상 끝점을 앵커로 삼는다.
    const sLat = Number(item.startLatitude);
    const sLng = Number(item.startLongitude);
    const eLat = Number(item.endLatitude);
    const eLng = Number(item.endLongitude);
    if (!Number.isFinite(sLat) || !Number.isFinite(eLat)) continue;

    const startOK = isInKorea(sLat, sLng);
    const endOK = isInKorea(eLat, eLng);
    if (startOK === endOK) continue; // 둘 다 정상이거나 둘 다 이상 → 교정 대상 아님

    const anchor = startOK ? { lat: sLat, lng: sLng } : { lat: eLat, lng: eLng };
    const prefix = startOK ? 'end' : 'start';
    const repaired = repairCoordinate({
      badLat: startOK ? item.endLatitude : item.startLatitude,
      badLng: startOK ? item.endLongitude : item.startLongitude,
      anchorLat: anchor.lat,
      anchorLng: anchor.lng,
    });
    if (!repaired) continue;

    const field = repaired.field === 'lat' ? `${prefix}Latitude` : `${prefix}Longitude`;
    corrections.push({
      sourceType: 'streetTree',
      key: nationwideKey(item),
      match: {
        institutionNm: inst,
        sttreeStretNm: item.sttreeStretNm || '',
      },
      field,
      from: repaired.field === 'lat'
        ? (startOK ? item.endLatitude : item.startLatitude)
        : (startOK ? item.endLongitude : item.startLongitude),
      to: String(repaired.field === 'lat' ? repaired.lat : repaired.lng),
      method: 'single-digit-repair',
      confidence: 'high',
      evidence: `정상 끝점에서 ${repaired.distanceKm.toFixed(2)}km. 한 자리 치환 후보 중 국내로 들어오는 것이 유일`,
    });
  }

  const systematic = Object.entries(byInstitution)
    .filter(([, v]) => v.total >= 3 && v.wrongRegion / v.total >= 0.5)
    .map(([institution, v]) => ({
      institution,
      wrongRegion: v.wrongRegion,
      total: v.total,
      ratio: Number((v.wrongRegion / v.total).toFixed(3)),
    }))
    .sort((a, b) => b.wrongRegion - a.wrongRegion);

  return { flags, corrections, counts, systematic, total: items.length };
}

function auditSeoul() {
  const j = JSON.parse(readFileSync(SEOUL_PATH, 'utf-8'));
  const { lat, lng, dicts } = j;
  const n = lat.length;

  // 동일 좌표에 몇 그루가 쌓였는지 미리 센다.
  const stack = new Map();
  for (let i = 0; i < n; i++) {
    const key = `${lat[i]},${lng[i]}`;
    stack.set(key, (stack.get(key) || 0) + 1);
  }

  const flags = {};
  const counts = {};
  for (let i = 0; i < n; i++) {
    const f = flagSeoulTree(
      {
        lat: lat[i],
        lng: lng[i],
        species: dicts.sp[j.sp[i]] || '',
        road: dicts.road[j.road[i]] || '',
      },
      { stackedCount: stack.get(`${lat[i]},${lng[i]}`) || 1 }
    );
    if (f.length) {
      flags[i] = f;
      for (const code of f) counts[code] = (counts[code] || 0) + 1;
    }
  }
  return { flags, counts, total: n };
}

console.log('전국 가로수길 데이터를 받는 중...');
const items = await fetchNationwide();
console.log(`  ${items.length}건 수신`);

const nationwide = auditNationwide(items);
console.log('서울 개별 가로수 데이터를 검사하는 중...');
const seoul = auditSeoul();

const generatedAt = new Date().toISOString();

writeFileSync(FLAGS_OUT, JSON.stringify({
  generatedAt,
  nationwide: {
    total: nationwide.total,
    counts: nationwide.counts,
    systematicInstitutions: nationwide.systematic,
    flags: nationwide.flags,
  },
  seoul: {
    total: seoul.total,
    counts: seoul.counts,
    flags: seoul.flags,
  },
}));

writeFileSync(CORRECTIONS_OUT, JSON.stringify({
  generatedAt,
  corrections: nationwide.corrections,
}, null, 2));

console.log('\n=== 전국 ===');
console.log(`  전체 ${nationwide.total}건, 플래그 있는 레코드 ${Object.keys(nationwide.flags).length}건`);
for (const [code, count] of Object.entries(nationwide.counts).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${code.padEnd(24)} ${count}`);
}
console.log(`  좌표 교정안 ${nationwide.corrections.length}건`);
console.log('  기관 단위 체계적 오류:');
for (const s of nationwide.systematic) {
  console.log(`    ${s.institution.padEnd(24)} ${s.wrongRegion}/${s.total} (${(s.ratio * 100).toFixed(0)}%)`);
}

console.log('\n=== 서울 ===');
console.log(`  전체 ${seoul.total}그루, 플래그 있는 개체 ${Object.keys(seoul.flags).length}그루`);
for (const [code, count] of Object.entries(seoul.counts).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${code.padEnd(24)} ${count}`);
}

console.log(`\n산출: ${FLAGS_OUT}`);
console.log(`산출: ${CORRECTIONS_OUT}`);
```

- [ ] **Step 3: 실행하고 감사 실측치와 대조**

Run: `npm run audit:data`

Expected: 아래 실측치와 큰 차이가 없어야 한다
(`docs/superpowers/specs/2026-07-24-data-audit.md` 기준. 원본 데이터가 갱신되므로 ±10% 편차는 정상):

```
전국: COORD_OUT_OF_KR 9, COORD_WRONG_REGION 163,
      LENGTH_CONTRADICTION 1709, SEGMENT_DEGENERATE 394,
      SPECIES_MULTI 3102, COUNT_ZERO 1249, STALE 192
      좌표 교정안 5건
      기관 단위: 서울특별시 강동구청 61/61, 대구광역시 군위군청 4/4, 경상북도 청도군청 3/3
서울: ROAD_INVALID 7130, COORD_STACKED 3310, COORD_LOW_PRECISION 2525,
      SPECIES_INVALID 948, NOT_A_TREE 303
```

`SPECIES_UNMATCHED`는 Task 2·3의 DB 확장 덕분에 감사 시점(1,138)보다 크게 줄어야 정상이다.

- [ ] **Step 4: 산출물 크기 확인**

```bash
ls -lh public/data/quality-flags.json public/data/corrections.json
```

Expected: `quality-flags.json`이 수 MB 이하. 서울 플래그가 17,000건 수준이므로
과도하게 크면 (수십 MB) 플래그 임계값을 재검토한다.

- [ ] **Step 5: 커밋**

```bash
git add package.json scripts/audit-data.mjs public/data/quality-flags.json public/data/corrections.json
git commit -m "feat(data): 데이터 품질 감사 스크립트와 산출물

두 소스를 검사해 레코드별 플래그와 좌표 교정안을 산출한다.
원본은 수정하지 않고 오버레이 파일로만 관리한다."
```

---

### Task 7: 정규화 파이프라인에 통합

**Files:**
- Modify: `src/services/normalizers.js`
- Modify: `src/services/api.js` (품질 플래그·교정 로드)
- Create: `src/services/normalizers.test.js`

**Interfaces:**
- Consumes: `canonicalizeSpecies` (Task 1), `quality-flags.json`·`corrections.json` (Task 6)
- Produces: 정규화 결과 객체에 필드 추가
  - `speciesList: string[]` — 분해·정규화된 수종 배열
  - `speciesKind: 'tree'|'not-a-tree'|'unknown'`
  - `qualityFlags: string[]`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/services/normalizers.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { normalizeStreetTree } from './normalizers';

describe('normalizeStreetTree — 수종 정규화', () => {
  it('복수 수종을 배열로 분해한다', () => {
    const r = normalizeStreetTree({
      sttreeStretNm: '테스트로', sttreeKnd: '은행나무+이팝나무',
      startLatitude: '37.5', startLongitude: '127.0',
      endLatitude: '37.51', endLongitude: '127.01',
    });
    expect(r.speciesList).toEqual(['은행나무', '이팝나무']);
    expect(r.speciesKind).toBe('tree');
  });

  it('축약형을 정식명으로 바꾼다', () => {
    const r = normalizeStreetTree({
      sttreeKnd: '양버즘',
      startLatitude: '37.5', startLongitude: '127.0',
    });
    expect(r.speciesList).toEqual(['양버즘나무']);
  });

  it('결주는 not-a-tree로 표시한다', () => {
    const r = normalizeStreetTree({
      sttreeKnd: '결주',
      startLatitude: '37.5', startLongitude: '127.0',
    });
    expect(r.speciesKind).toBe('not-a-tree');
  });

  it('species 필드는 원본을 보존한다', () => {
    const r = normalizeStreetTree({
      sttreeKnd: '양버즘',
      startLatitude: '37.5', startLongitude: '127.0',
    });
    expect(r.species).toBe('양버즘');
  });

  it('도로명이 무효값이면 빈 문자열로 만든다', () => {
    const r = normalizeStreetTree({
      sttreeStretNm: '3', sttreeKnd: '은행나무',
      startLatitude: '37.5', startLongitude: '127.0',
    });
    expect(r.roadName).toBe('');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- normalizers`
Expected: FAIL — `r.speciesList is undefined`

- [ ] **Step 3: `normalizers.js` 수정**

파일 상단에 import 추가:

```javascript
import { canonicalizeSpecies } from '../data/speciesCanonical';
```

파일 상단 `getCityFromAddress` 함수 다음에 추가:

```javascript
const JUNK_ONLY = /^[\s0-9?×xX\-.]*$/;

// 도로명 칸에 '3', '6', '은행나무' 같은 값이 들어간 케이스가 있다.
// 숫자·기호만 있는 값은 도로명이 아니므로 비운다. (서울 소스 7,130그루)
function sanitizeRoadName(raw) {
  const text = String(raw || '').trim();
  return !text || JUNK_ONLY.test(text) ? '' : text;
}
```

`normalizeStreetTree`의 `return {` 직전에 추가:

```javascript
  const rawSpecies = item.speciesNm || item.sttreeKnd || '';
  const canon = canonicalizeSpecies(rawSpecies);
  const roadName = sanitizeRoadName(item.roadsidTreeRoadNm || item.sttreeStretNm);
```

그리고 `return` 객체의 `roadName`·`locationName`·`species` 세 줄을 교체하고 필드를 추가:

```javascript
    roadName,
    locationName: roadName,
    species: rawSpecies,           // 원본 보존
    speciesList: canon.species,    // 정규화·분해 결과
    speciesKind: canon.kind,
    qualityFlags: [],              // api.js에서 채운다
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- normalizers`
Expected: PASS

- [ ] **Step 5: `api.js`에 플래그·교정 로더 추가**

`src/services/api.js` 끝에 추가:

```javascript
// 품질 플래그와 좌표 교정 오버레이를 로드한다.
// 실패해도 앱은 동작해야 하므로 빈 값으로 폴백한다.
export async function loadQualityOverlay() {
  const empty = { flags: { nationwide: {}, seoul: {} }, corrections: [] };
  try {
    const [flagsRes, corrRes] = await Promise.all([
      fetch('/data/quality-flags.json'),
      fetch('/data/corrections.json'),
    ]);
    if (!flagsRes.ok || !corrRes.ok) return empty;
    const flagsJson = await flagsRes.json();
    const corrJson = await corrRes.json();
    return {
      flags: {
        nationwide: flagsJson?.nationwide?.flags || {},
        seoul: flagsJson?.seoul?.flags || {},
      },
      counts: {
        nationwide: flagsJson?.nationwide?.counts || {},
        seoul: flagsJson?.seoul?.counts || {},
      },
      systematicInstitutions: flagsJson?.nationwide?.systematicInstitutions || [],
      corrections: corrJson?.corrections || [],
    };
  } catch {
    return empty;
  }
}
```

- [ ] **Step 6: 전체 테스트 + 린트 + 빌드**

Run: `npm test && npm run lint && npm run build`
Expected: 전부 통과

- [ ] **Step 7: 커밋**

```bash
git add src/services/normalizers.js src/services/normalizers.test.js src/services/api.js
git commit -m "feat(data): 정규화 파이프라인에 수종 정규화·도로명 정제 통합

원본 species 필드는 보존하고 speciesList/speciesKind를 추가한다.
숫자만 있는 도로명은 비워 잘못된 정보 노출을 막는다."
```

---

### Task 8: 통계·필터에서 나무 아닌 것 제외

**Files:**
- Modify: `src/utils/helpers.js`
- Create: `src/utils/helpers.test.js`

**Interfaces:**
- Consumes: Task 7의 `speciesKind`, Task 2의 `getAllergenLevel`
- Produces: `filterData`·`calculateStats` 동작 변경 (시그니처 유지)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/utils/helpers.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { filterData, calculateStats } from './helpers';

const tree = (over = {}) => ({
  latitude: 37.5, longitude: 127.0, city: '서울특별시', district: '강남구',
  species: '은행나무', speciesKind: 'tree', speciesList: ['은행나무'],
  sourceType: 'streetTree', treeCount: 10, ...over,
});

describe('filterData', () => {
  it('결주·고사는 걸러낸다', () => {
    const data = [tree(), tree({ species: '결주', speciesKind: 'not-a-tree' })];
    expect(filterData(data, {})).toHaveLength(1);
  });

  it('좌표 없는 항목은 걸러낸다', () => {
    expect(filterData([tree({ latitude: 0 })], {})).toHaveLength(0);
  });

  it('지역 필터가 동작한다', () => {
    const data = [tree(), tree({ city: '부산광역시' })];
    expect(filterData(data, { city: '부산광역시' })).toHaveLength(1);
  });
});

describe('calculateStats', () => {
  it('결주·고사를 통계에서 뺀다', () => {
    const data = [tree(), tree({ species: '결주', speciesKind: 'not-a-tree' })];
    expect(calculateStats(data).total).toBe(1);
  });

  it('제외된 개수를 따로 보고한다', () => {
    const data = [tree(), tree({ species: '결주', speciesKind: 'not-a-tree' })];
    expect(calculateStats(data).excludedNotATree).toBe(1);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- helpers`
Expected: FAIL — 결주가 걸러지지 않아 length 2

- [ ] **Step 3: `helpers.js` 수정**

`filterData` 안의 좌표 검사 바로 다음에 추가:

```javascript
    // 원본에 결주·고사로 기재된 항목은 나무가 아니므로 지도에 표시하지 않는다.
    if (item.speciesKind === 'not-a-tree') return false;
```

`calculateStats`의 시작 부분을 교체:

```javascript
export function calculateStats(data) {
  const speciesMap = {};
  const levelCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  const sourceCounts = {};
  let excludedNotATree = 0;

  for (const item of data) {
    if (item.speciesKind === 'not-a-tree') {
      excludedNotATree += 1;
      continue;
    }
    const species = item.species || '미확인';
```

그리고 `return` 문을 교체:

```javascript
  return {
    speciesStats, levelStats, sourceStats,
    total: data.length - excludedNotATree,
    excludedNotATree,
  };
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- helpers`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/utils/helpers.js src/utils/helpers.test.js
git commit -m "fix(map): 결주·고사로 기재된 항목을 지도·통계에서 제외

원본이 '나무 없음'이라고 적어둔 303그루를 나무로 표시하고 있었다."
```

---

### Task 9: 팝업에 복수 수종·추정 매칭·품질 플래그 표시

**Files:**
- Modify: `src/components/Map.jsx` (`buildMarkerInfo`, `buildSeoulTreeInfo`, `buildPolylineInfo`)
- Modify: `src/components/Map.css` (플래그 표기 스타일)

**Interfaces:**
- Consumes: `getAllergenInfos`·`getAllergenMatch` (Task 2), `FLAG_LABEL` (Task 5), `speciesList` (Task 7)
- Produces: 없음 (표시만)

**주의:** `Map.jsx`에 팝업 빌더가 3개 있고(개별 마커 309행, 서울 개체 349행, 폴리라인 385행)
알레르기 표시 로직이 셋 다 거의 같다. 중복을 지우고 공용 함수 하나로 만든다.

- [ ] **Step 1: 공용 알레르기 행 빌더 추가**

`src/components/Map.jsx`의 import를 교체:

```javascript
import {
  getAllergenInfos, getAllergenMatch, getPollenSeasonText, ALLERGEN_LEVELS,
} from '../data/allergenDatabase';
import { FLAG_LABEL } from '../utils/qualityFlags';
```

`buildMarkerInfo` 정의 바로 앞(파일 상단 컴포넌트 밖)에 추가:

```javascript
const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

// 팝업의 알레르기 관련 행을 만든다. 세 종류 팝업이 공유한다.
// 복수 수종이면 모든 종의 꽃가루 시기·증상을 병기한다.
function buildAllergenRows(item) {
  const list = item.speciesList?.length ? item.speciesList : [item.species].filter(Boolean);
  const matches = getAllergenInfos(list);
  const level = Math.max(0, ...matches.map((m) => (m.info ? m.info.level : 0)));
  const levelInfo = ALLERGEN_LEVELS[level];

  let rows = `
    <tr><td class="popup-label">알레르기 등급</td><td><span class="allergen-badge" style="background:${levelInfo.color}">${levelInfo.label}</span></td></tr>`;

  for (const m of matches) {
    if (!m.info) continue;
    const inferred = m.matchType === 'inferred'
      ? `<span class="popup-inferred">${escapeHtml(m.info.name)} 기준 추정</span>`
      : '';
    const label = matches.length > 1 ? `${escapeHtml(m.species)} 꽃가루 시기` : '꽃가루 시기';
    rows += `
      <tr><td class="popup-label">${label}</td><td>${getPollenSeasonText(m.info.pollenMonths)} ${inferred}</td></tr>
      <tr><td class="popup-label">주요 증상</td><td class="popup-symptoms">${escapeHtml(m.info.symptoms)}</td></tr>`;
  }
  return rows;
}

// 품질 플래그가 있으면 근거와 함께 경고 블록을 만든다.
function buildQualityNote(item) {
  const flags = item.qualityFlags || [];
  if (!flags.length) return '';
  const lines = flags.map((f) => `<li>${escapeHtml(FLAG_LABEL[f] || f)}</li>`).join('');
  return `<div class="popup-quality-note">
    <strong>이 기록에 확인된 문제</strong>
    <ul>${lines}</ul>
  </div>`;
}
```

- [ ] **Step 2: 세 팝업 빌더에서 중복 로직 교체**

`buildMarkerInfo`(309행 부근), `buildSeoulTreeInfo`(349행 부근),
`buildPolylineInfo`(385행 부근) 각각에서 아래 3줄을 삭제:

```javascript
    const level = getAllergenLevel(item.species);
    const levelInfo = ALLERGEN_LEVELS[level];
    const allergenInfo = getAllergenInfo(item.species);
```

그리고 각 빌더의 알레르기 등급 행 + 꽃가루 시기 행 + 증상 행을 전부
아래 한 줄로 교체:

```javascript
    rows += buildAllergenRows(item);
```

각 빌더가 반환하는 HTML의 `popup-source-note` 앞에 추가:

```javascript
    ${buildQualityNote(item)}
```

- [ ] **Step 3: 마커 색상 계산부 수정**

503행·551행 부근의 두 곳:

```javascript
      const level = getAllergenLevel(pl.species);
      const color = ALLERGEN_LEVELS[level]?.color || '#3498db';
```

를 각각 교체 (`pl`·`item` 변수명은 원래대로 유지):

```javascript
      const matches = getAllergenInfos(pl.speciesList?.length ? pl.speciesList : [pl.species]);
      const level = Math.max(0, ...matches.map((m) => (m.info ? m.info.level : 0)));
      const color = ALLERGEN_LEVELS[level]?.color || ALLERGEN_LEVELS[0].color;
```

- [ ] **Step 4: 스타일 추가**

`src/components/Map.css` 끝에 추가:

```css
/* 품질 플래그 경고 — healthcare-clean warning 토큰 재사용 */
.popup-quality-note {
  margin-top: 10px;
  padding: 10px 12px;
  border: 1px dashed #b45309;
  border-radius: 10px;
  background: #fffbeb;
  color: #78350f;
  font-size: 12px;
  line-height: 1.5;
}

.popup-quality-note strong {
  display: block;
  margin-bottom: 4px;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #b45309;
}

.popup-quality-note ul {
  margin: 0;
  padding-left: 16px;
}

.popup-inferred {
  display: inline-block;
  margin-left: 4px;
  padding: 1px 6px;
  border-radius: 6px;
  background: #f1f5f9;
  color: #64748b;
  font-size: 11px;
}
```

- [ ] **Step 5: 린트 + 빌드 확인**

Run: `npm run lint && npm run build`
Expected: 통과. `getAllergenInfo`·`getAllergenLevel` 미사용 import가 남아 있으면 린트가 잡는다 — 지운다.

- [ ] **Step 6: 로컬에서 눈으로 확인**

```bash
npm run dev
```

브라우저에서 `http://localhost:5173` 열고:
- 마커를 클릭해 팝업이 뜨는지
- 알레르기 등급 배지가 보이는지
- 복수 수종 구간(전국 데이터, 예: 은행나무+이팝나무)에서 두 종의 꽃가루 시기가 다 나오는지

- [ ] **Step 7: 커밋**

```bash
git add src/components/Map.jsx src/components/Map.css
git commit -m "feat(map): 복수 수종 병기 + 추정 매칭 표시 + 품질 플래그 경고

세 팝업 빌더에 중복돼 있던 알레르기 표시 로직을 공용 함수로 합쳤다.
'은행나무+이팝나무'에서 이팝나무 정보가 소실되던 문제를 해결한다."
```

---

### Task 10: 로드뷰 메타데이터 검증 (Layer 1)

**Files:**
- Modify: `src/components/StreetViewModal.jsx`
- Modify: `src/components/StreetViewModal.css`

**Interfaces:**
- Consumes: `naver.maps.Panorama#getLocation()` → `{ panoId, title, address, coord, photodate }`
- Produces: 없음 (표시만)

**약관 제약:** 파노라마 이미지를 캡처·저장하지 않는다. 메타데이터를 localStorage 등
영속 저장소에 쌓지 않는다. 사용자가 연 지점만, 그 화면에서만 사용한다.

- [ ] **Step 1: photodate·address 상태 추가**

`StreetViewModal.jsx`의 상태 선언부(72~76행 부근)에 추가:

```javascript
  const [panoMeta, setPanoMeta] = useState(null); // { photodate, address, panoId }
```

`useEffect` 안의 초기화 블록(102~105행 부근)에 추가:

```javascript
    setPanoMeta(null);
```

- [ ] **Step 2: `pano_changed` 핸들러에서 메타데이터 수집**

`pano_changed` 리스너 안, `setDistanceMeters(...)` 다음에 추가:

```javascript
            const loc = typeof panorama.getLocation === 'function'
              ? panorama.getLocation()
              : null;
            if (loc) {
              setPanoMeta({
                panoId: loc.panoId || null,
                address: loc.address || loc.title || null,
                photodate: loc.photodate || null,
              });
            }
```

- [ ] **Step 3: 촬영일자·도로명 대조 로직 추가**

`getVerification` 함수 바로 앞에 추가:

```javascript
  // 로드뷰 촬영일자와 데이터 기준일자를 비교한다.
  // 어느 쪽이 최신인지 알아야 "로드뷰에 안 보인다"는 관찰을 해석할 수 있다.
  const getTimeline = () => {
    const pano = panoMeta?.photodate ? String(panoMeta.photodate).slice(0, 7) : null;
    const data = treeData.referenceDate ? String(treeData.referenceDate).slice(0, 7) : null;
    if (!pano && !data) return null;
    let note = null;
    if (pano && data) {
      if (data > pano) note = '데이터가 로드뷰보다 최신입니다. 촬영 이후 식재되었을 수 있습니다.';
      else if (pano > data) note = '로드뷰가 데이터보다 최신입니다. 조사 이후 변경되었을 수 있습니다.';
      else note = '로드뷰와 데이터의 시점이 같습니다.';
    }
    return { pano, data, note };
  };

  // 파노라마 지점 주소와 데이터 도로명을 대조한다.
  const getRoadMatch = () => {
    const road = String(treeData.roadName || '').trim();
    const addr = String(panoMeta?.address || '').trim();
    if (!road || !addr) return { state: 'unknown' };
    // 도로명에서 'N번길' 같은 접미를 떼고 핵심 토큰으로 비교한다.
    const core = road.replace(/\s*\d+번길.*$/, '').trim();
    if (!core) return { state: 'unknown' };
    return { state: addr.includes(core) ? 'match' : 'mismatch', address: addr, road };
  };

  const timeline = getTimeline();
  const roadMatch = getRoadMatch();
```

- [ ] **Step 4: 헤더 메타 행에 촬영일자·도로명 대조 결과 표시**

`sv-meta-row` div 안, `오차` 칩 다음(350행 부근 `)}` 뒤)에 추가:

```javascript
              {timeline?.pano && (
                <>
                  <span className="sv-meta-divider" aria-hidden="true" />
                  <span className="sv-meta-chip">
                    <span className="sv-meta-label">로드뷰 촬영</span>
                    <span className="sv-meta-value">{timeline.pano}</span>
                  </span>
                </>
              )}
              {timeline?.data && (
                <>
                  <span className="sv-meta-divider" aria-hidden="true" />
                  <span className="sv-meta-chip">
                    <span className="sv-meta-label">데이터 기준</span>
                    <span className="sv-meta-value">{timeline.data}</span>
                  </span>
                </>
              )}
```

- [ ] **Step 5: 도로명 대조 결과와 시점 해설을 하단 정보바 위에 추가**

`street-view-info-bar` div 바로 앞에 추가:

```javascript
        {(timeline?.note || roadMatch.state === 'mismatch') && (
          <div className="sv-cross-check">
            {roadMatch.state === 'mismatch' && (
              <p className="sv-cross-check-item sv-cross-check-item--warn">
                데이터의 도로명은 <strong>{roadMatch.road}</strong>인데, 로드뷰 지점의
                주소는 <strong>{roadMatch.address}</strong>입니다. 등록 원본의 도로명이
                실제와 다를 수 있습니다.
              </p>
            )}
            {timeline?.note && (
              <p className="sv-cross-check-item">{timeline.note}</p>
            )}
          </div>
        )}
```

- [ ] **Step 6: 스타일 추가**

`src/components/StreetViewModal.css` 끝에 추가:

```css
/* 로드뷰 메타데이터 교차검증 결과 */
.sv-cross-check {
  padding: 10px 20px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}

.sv-cross-check-item {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.55;
  color: #475569;
}

.sv-cross-check-item + .sv-cross-check-item {
  margin-top: 6px;
}

.sv-cross-check-item--warn {
  color: #78350f;
}

.sv-cross-check-item strong {
  color: #0f172a;
  font-weight: 600;
}
```

- [ ] **Step 7: 린트 + 빌드**

Run: `npm run lint && npm run build`
Expected: 통과

- [ ] **Step 8: 로컬에서 로드뷰 모달 확인**

```bash
npm run dev
```

마커 클릭 → 로드뷰 열기. 확인 사항:
- "로드뷰 촬영" 칩에 연월이 나오는지 (네이버가 `photodate`를 주지 않으면 칩이 안 나오는 게 정상)
- 촬영 시점 해설 문장이 나오는지
- 콘솔에 에러가 없는지

`photodate`가 계속 안 나오면 `panorama.getLocation()`이 실제로 무엇을 반환하는지
콘솔에 찍어 필드명을 확인하고 Step 2를 그에 맞춰 고친다.

- [ ] **Step 9: 커밋**

```bash
git add src/components/StreetViewModal.jsx src/components/StreetViewModal.css
git commit -m "feat(streetview): 로드뷰 촬영일자·주소 교차검증 추가

panorama.getLocation()의 photodate/address로 데이터와 대조한다.
이미지는 취득·저장하지 않는다."
```

---

### Task 11: 필터 패널에 품질 토글과 출처 갱신

**Files:**
- Modify: `src/components/FilterPanel.jsx`
- Modify: `src/components/FilterPanel.css`
- Modify: `src/utils/helpers.js` (`filterData`에 `hideFlagged` 처리)
- Modify: `src/utils/helpers.test.js`

**Interfaces:**
- Consumes: `qualityFlags` (Task 7), `excludedNotATree` (Task 8)
- Produces: `filters.hideFlagged: boolean`

- [ ] **Step 1: `filterData` 테스트 추가**

`src/utils/helpers.test.js`의 `describe('filterData')` 블록 안에 추가:

```javascript
  it('hideFlagged가 켜지면 플래그 있는 항목을 숨긴다', () => {
    const data = [tree(), tree({ qualityFlags: ['COORD_WRONG_REGION'] })];
    expect(filterData(data, { hideFlagged: true })).toHaveLength(1);
    expect(filterData(data, { hideFlagged: false })).toHaveLength(2);
  });

  it('기본값에서는 플래그 있는 항목도 보여준다', () => {
    const data = [tree({ qualityFlags: ['COUNT_ZERO'] })];
    expect(filterData(data, {})).toHaveLength(1);
  });
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- helpers`
Expected: FAIL — hideFlagged가 무시돼 length 2

- [ ] **Step 3: `filterData`에 처리 추가**

`src/utils/helpers.js`의 `filterData` 안, `not-a-tree` 검사 다음에 추가:

```javascript
    // 품질 이슈가 있는 기록 숨기기. 기본값은 표시(off)다 —
    // 기본으로 숨기면 사용자가 데이터가 왜 적은지 알 수 없다.
    if (filters.hideFlagged && item.qualityFlags?.length) return false;
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- helpers`
Expected: PASS

- [ ] **Step 5: FilterPanel에 토글 추가**

`src/components/FilterPanel.jsx`의 알레르기 등급 섹션(`filter-section`) 다음에 추가:

```jsx
      <div className="filter-section">
        <label className="filter-label">데이터 품질</label>
        <label className="quality-toggle">
          <input
            type="checkbox"
            checked={Boolean(filters.hideFlagged)}
            onChange={() =>
              onFilterChange({ ...filters, hideFlagged: !filters.hideFlagged })
            }
          />
          <span>품질 문제가 확인된 기록 숨기기</span>
        </label>
        <p className="quality-note">
          좌표가 관할 구역을 벗어나거나 수종·도로명이 비어 있는 등, 등록 원본에서
          문제가 확인된 기록입니다. 원본은 수정하지 않고 표시만 조정합니다.
        </p>
      </div>
```

prop 이름 `onFilterChange`는 확인 완료다 (`FilterPanel.jsx:6`). 기존 핸들러들이
`onFilterChange({ ...filters, key: value })` 패턴을 쓰므로 위 코드가 그 패턴을 따른다.

- [ ] **Step 5b: `handleReset`에 새 필터 초기화 추가**

`FilterPanel.jsx`의 `handleReset`(30행 부근)이 `hideFlagged`를 초기화하지 않는다.
리셋 후에도 토글이 켜진 채로 남아 사용자가 혼란스러워진다. 객체에 한 줄 추가:

```javascript
  const handleReset = () => {
    onFilterChange({
      city: '',
      species: '',
      allergenLevels: [],
      allergenOnly: false,
      hideFlagged: false,
    });
  };
```

- [ ] **Step 6: 출처 표기에 제외 건수 추가**

FilterPanel 하단의 데이터 출처 블록에 한 줄 추가 (기존 출처 문구 다음):

```jsx
        <li>원본에 결주·고사로 기재된 기록은 지도에서 제외합니다.</li>
```

- [ ] **Step 7: 스타일 추가**

`src/components/FilterPanel.css` 끝에 추가:

```css
.quality-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #0f172a;
  cursor: pointer;
}

.quality-toggle input {
  accent-color: #0f766e;
}

.quality-note {
  margin: 6px 0 0;
  font-size: 11.5px;
  line-height: 1.5;
  color: #64748b;
}
```

- [ ] **Step 8: 전체 테스트 + 린트 + 빌드**

Run: `npm test && npm run lint && npm run build`
Expected: 전부 통과

- [ ] **Step 9: 커밋**

```bash
git add src/components/FilterPanel.jsx src/components/FilterPanel.css src/utils/helpers.js src/utils/helpers.test.js
git commit -m "feat(filter): 품질 문제 기록 숨기기 토글 추가

기본값은 표시. 숨기는 게 기본이면 데이터가 왜 적은지 알 수 없다."
```

---

### Task 12: 배포 후 실제 동작 검증

**Files:**
- 없음 (검증만)

**Interfaces:**
- Consumes: 배포된 사이트
- Produces: 검증 결과 스크린샷

**이 프로젝트는 배포 후 headless 브라우저로 직접 확인하는 것이 규칙이다.**
코드만 고치고 끝내지 않는다.

- [ ] **Step 1: 성공 기준 재측정**

```bash
node --input-type=module -e "
import fs from 'fs';
const { getAllergenMatch } = await import('./src/data/allergenDatabase.js');
const { canonicalizeSpecies } = await import('./src/data/speciesCanonical.js');
const j = JSON.parse(fs.readFileSync('public/data/seoul-trees.json','utf8'));
const cnt = new Array(j.dicts.sp.length).fill(0);
for (const i of j.sp) cnt[i]++;
let none=0, notTree=0;
j.dicts.sp.forEach((s,i)=>{
  const c=cnt[i]; if(!c) return;
  const k=canonicalizeSpecies(s).kind;
  if(k==='not-a-tree'){ notTree+=c; return; }
  if(getAllergenMatch(s).matchType==='none') none+=c;
});
console.log('알레르기 정보 없음:', none, '(목표 1,000 미만, 착수 시점 2,904)');
console.log('결주·고사로 분류:', notTree, '(지도에서 제외됨, 실측 303)');
"
```

Expected: `알레르기 정보 없음`이 1,000 미만, `결주·고사`가 300 근처

- [ ] **Step 2: 배포**

```bash
git push
```

Vercel이 자동 배포한다. 배포 완료를 기다린다 (약 1~2분).

- [ ] **Step 3: 배포된 사이트 검증 스크립트 작성**

`/private/tmp/verify-quality.js`:

```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('https://pollen-map-dun.vercel.app', { waitUntil: 'networkidle' });
  await page.waitForTimeout(15000);

  // 품질 오버레이 파일이 실제로 서빙되는지
  const overlay = await page.evaluate(async () => {
    const r = await fetch('/data/quality-flags.json');
    if (!r.ok) return { ok: false, status: r.status };
    const j = await r.json();
    return {
      ok: true,
      nationwideCounts: j?.nationwide?.counts,
      seoulCounts: j?.seoul?.counts,
      systematic: (j?.nationwide?.systematicInstitutions || []).slice(0, 3),
    };
  });
  console.log('quality-flags.json:', JSON.stringify(overlay, null, 2));

  const corrections = await page.evaluate(async () => {
    const r = await fetch('/data/corrections.json');
    return r.ok ? (await r.json()).corrections.length : `HTTP ${r.status}`;
  });
  console.log('corrections:', corrections);

  // 범례에 "정보 없음"이 반영됐는지
  const legend = await page.locator('.map-legend').innerText().catch(() => '(범례 없음)');
  console.log('범례:\n', legend);

  await page.screenshot({ path: '/private/tmp/verify-quality.png', fullPage: false });
  console.log('콘솔 에러:', errors.length ? errors : '없음');
  await browser.close();
})();
```

- [ ] **Step 4: 검증 실행**

```bash
cd /private/tmp && node verify-quality.js
```

Expected:
- `quality-flags.json`이 200으로 서빙되고 카운트가 채워져 있음
- `corrections` 개수가 1 이상
- 범례에 `정보 없음`이 있고 `해당없음`은 없음
- 콘솔 에러 없음

- [ ] **Step 5: 팝업과 로드뷰 모달 육안 확인**

`/private/tmp/verify-popup.js`:

```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('https://pollen-map-dun.vercel.app', { waitUntil: 'networkidle' });
  await page.waitForTimeout(15000);

  // 지도 위 아무 마커나 클릭
  const marker = page.locator('.tree-marker, [class*="marker"]').first();
  await marker.click({ timeout: 20000 }).catch(() => console.log('마커 클릭 실패'));
  await page.waitForTimeout(2500);
  await page.screenshot({ path: '/private/tmp/verify-popup.png' });

  const popup = await page.locator('.tree-popup').innerText().catch(() => '(팝업 없음)');
  console.log('팝업 내용:\n', popup);
  await browser.close();
})();
```

```bash
cd /private/tmp && node verify-popup.js
```

Expected: 팝업에 알레르기 등급이 나오고, 등급 0인 항목의 라벨이 `정보 없음`

- [ ] **Step 6: 스크린샷 확인**

```bash
open /private/tmp/verify-quality.png /private/tmp/verify-popup.png
```

지도가 정상 렌더되고 마커가 보이는지, 레이아웃이 깨지지 않았는지 눈으로 본다.

- [ ] **Step 7: 실패 시 대응**

검증이 실패하면 **사용자에게 보고하기 전에 직접 고친다.** 이 프로젝트의 규칙이다.
콘솔 에러가 있으면 원인을 찾아 수정하고 Step 2부터 다시 한다.

- [ ] **Step 8: 문서 갱신**

`README.md`의 데이터 소스 섹션에 한 문단 추가:

```markdown
### 데이터 품질

공공데이터 원본에는 좌표 오류, 수종명 오타·축약, 결주·고사 표기 등이 포함되어
있습니다. 이 서비스는 원본을 수정하지 않고, 검증 가능한 문제를 플래그로 표시하며
한 자리 좌표 오타처럼 확정적으로 교정 가능한 경우만 오버레이로 보정합니다.
감사 결과는 `docs/superpowers/specs/2026-07-24-data-audit.md`를 참고하세요.

품질 감사 재실행: `npm run audit:data`
```

- [ ] **Step 9: 커밋**

```bash
git add README.md
git commit -m "docs: 데이터 품질 처리 방침 안내 추가"
git push
```

---

## 자체 검토 결과

**스펙 커버리지**

| 스펙 항목 | 담당 Task |
|---|---|
| 4.3.1 수종명 정규화 | Task 1 |
| 4.3.2 알레르기 DB 3단계 매칭 | Task 2 |
| 4.3.2 등급 0 라벨 수정 | Task 2 Step 3 |
| 4.3.2 누락 수종 추가 | Task 3 |
| 4.3.3 감사 스크립트·플래그 | Task 5, 6 |
| 4.3.4 좌표 교정 오버레이 | Task 4, 6 |
| 4.4 로드뷰 메타데이터 검증 | Task 10 |
| 4.5.1 NOT_A_TREE 제외 | Task 8 |
| 4.5.2 무효 도로명 미표시 | Task 7 Step 3 |
| 4.5.3 플래그 시각화 | Task 9 |
| 4.5.4 등급 0 라벨 | Task 2 |
| 4.5.5 품질 토글 | Task 11 |
| 4.5.6 disclaimer 확장 | Task 9 (`buildQualityNote`) |
| 4.5.7 추정 매칭 표시 | Task 9 (`popup-inferred`) |
| 4.6 vitest 도입 | Task 1 |
| 5 성공 기준 재측정 | Task 12 Step 1 |

**미결 사항 (구현 중 확인 필요)**

1. **`panorama.getLocation()`의 `photodate` 실제 제공 여부** — 공식 문서에는
   `PanoramaLocation`에 포함된다고 되어 있으나 실측하지 않았다. Task 10 Step 8에서
   확인하고, 안 나오면 해당 칩만 조건부로 숨긴다 (이미 조건부로 작성됨).

2. **전국 소스의 안정적인 레코드 id 부재** — `nationwideKey()`가 기관+도로명+시작좌표
   해시다. 좌표가 교정되면 키가 바뀐다. Task 6의 `corrections`는 교정 전 키를 쓰므로
   적용 시점에 주의한다. 데이터 갱신 시 키가 흔들리면 감사를 다시 돌린다.

3. **`FilterPanel`의 prop 이름** — 확인 완료. `onFilterChange`가 맞다
   (`FilterPanel.jsx:6`). `handleReset`이 새 `hideFlagged`를 초기화하지 않는
   문제도 Task 11 Step 5b로 반영했다.

5. **`speciesList` 이름 중복** — `FilterPanel`이 이미 `speciesList`라는 prop을
   받는다(드롭다운용 고유 수종 목록). Task 7이 레코드에 추가하는 `speciesList`는
   개별 레코드의 정규화된 수종 배열로 완전히 다른 것이다. 서로 다른 파일·스코프라
   충돌하지 않지만, 읽을 때 헷갈릴 수 있으니 인지하고 작업한다.

4. **4.5.3 "마커·폴리라인 시각적 구분"은 팝업 경고로 대체했다.** 25만 개 마커의
   스타일을 플래그별로 나누면 렌더 비용이 커지고, 기존 알레르기 등급 색상 체계와
   충돌한다. 팝업에서 근거와 함께 보여주는 편이 정보량이 많고 안전하다.
   시각적 구분이 꼭 필요하다고 판단되면 별도 작업으로 뺀다.
