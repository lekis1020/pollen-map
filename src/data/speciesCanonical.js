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
  메타쉐퀘이아: '메타세쿼이아',
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
  // '가시'는 등재하지 않는다. 데이터에 가시나무(Quercus, 등급 3)와
  // 홍가시(Photinia, 등급 1)가 함께 있어 2글자 단독 '가시'는 어느 쪽인지 모를
  // 뿐더러, 틀리면 알레르기 등급이 1↔3으로 크게 어긋난다.
  // 추측해서 등급을 주느니 "정보 없음"으로 남기는 편이 낫다.
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
  const trimmed = token.trim().replace(EDGE_DIGITS, '').trim();
  if (!trimmed) return null;
  const fixed = TYPO[trimmed] || ABBREV[trimmed];
  return { name: fixed || trimmed, changed: Boolean(fixed) };
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

  const species = parts.map((part) => part.name);
  const normalized =
    hadMarker ||
    changedByEtc ||
    parts.some((part) => part.changed) ||
    species.join('+') !== text;

  return { raw: text, species, kind: 'tree', normalized };
}
