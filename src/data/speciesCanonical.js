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
  메타세콰이야: '메타세쿼이아',
  메타세쿼이어: '메타세쿼이아',
  메타세코이아: '메타세쿼이아',
  네타세콰이어: '메타세쿼이아',
  메타세콰이어나무: '메타세쿼이아',
  왕벗나무: '왕벚나무',
  벗나무: '벚나무',
  벚꽃나무: '벚나무',
  므티나무: '느티나무',
  느티나: '느티나무',
  느니나무: '느티나무',
  은해나무: '은행나무',
  은헹나무: '은행나무',
  은나무: '은행나무',
  은행나: '은행나무',
  살구나무살구나무: '살구나무',
  무궁화나무: '무궁화',
  회회나무: '회화나무',
  베롱나무: '배롱나무',
  아팝나무: '이팝나무',
  백목합: '백목련',
  막우송: '낙우송',
  버짐나무: '양버즘나무',
  버짐: '양버즘나무',
  은당풍: '은단풍',
  워싱톤야자: '워싱턴야자',
  에매랄드골드: '에메랄드골드',
  튜립나무: '튤립나무',
  튜울립: '튤립나무',
  튜울립나무: '튤립나무',
  구실잦밤: '구실잣밤나무',
  가이스카: '가이즈카향나무',
  가이즈까향: '가이즈카향나무',
  가이즈까황나무: '가이즈카향나무',
  // 명품숲 원본 CSV가 두 어절로 적어 놓은 종명. 실제 국명은 붙여 쓴다.
  '한계령 풀': '한계령풀',
  '도깨비 부채': '도깨비부채',
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
  // 같은 이유로 한 글자 축약('소', '전')도 등재하지 않는다.
  모감주: '모감주나무',
  복자기: '복자기나무',
  현사시: '현사시나무',
  살구: '살구나무',
  // 아래는 2026-08-03 전수 집계에서 등급 0으로 떨어지던 실측 축약형이다.
  // 확장 대상이 아직 ALLERGEN_DATABASE에 없는 것도 있다 — 등재되면 그때 매칭된다.
  먼: '먼나무',
  벚: '벚나무',
  산벚: '산벚나무',
  메타: '메타세쿼이아',
  메세: '메타세쿼이아',
  회화: '회화나무',
  버즘: '양버즘나무',
  왕버즘: '양버즘나무',
  히말라야: '히말라야시다',
  시다: '히말라야시다',
  히시: '히말라야시다',
  신갈: '신갈나무',
  졸참: '졸참나무',
  굴참: '굴참나무',
  대왕참: '대왕참나무',
  산딸: '산딸나무',
  매실: '매실나무',
  모과: '모과나무',
  층층: '층층나무',
  백합: '튤립나무',
  백합수: '튤립나무',
  팽: '팽나무',
  리기다: '리기다소나무',
  대추: '대추나무',
  감: '감나무',
  백일홍: '배롱나무',
  목백일홍: '배롱나무',
  맹가지배롱: '배롱나무',
  계수: '계수나무',
  미국풍: '미국풍나무',
  풍나무: '미국풍나무',
  조팝: '조팝나무',
  화살: '화살나무',
  사과: '사과나무',
  흰말채: '흰말채나무',
  감탕: '감탕나무',
  박태기: '박태기나무',
  구실잣밤: '구실잣밤나무',
  물박달: '물박달나무',
  박달: '박달나무',
  가문비: '가문비나무',
  비자: '비자나무',
  종려: '종려나무',
  황칠: '황칠나무',
  하귤나무: '하귤',
  푸조: '푸조나무',
  복숭아: '복사나무',
  복숭아나무: '복사나무',
  산철: '산철쭉',
  수양뽕: '뽕나무',
  연필향: '연필향나무',
  스잣: '스트로브잣나무',
  스트로브잣: '스트로브잣나무',
  낙우송나무: '낙우송',
  벽오동나무: '벽오동',
  산수유나무: '산수유',
  홍도화나무: '홍도화',
  꽃복숭아나무: '꽃복숭아',
  황금사철나무: '황금사철',
  칠엽나무: '칠엽수',
};

// 원본 등록 단계에서 빈 자리·고사목을 수종명 칸에 적은 표기
export const NOT_A_TREE_MARKERS = [
  '결주', '고사', '공분', '미식재', '제거', '벌목', '굴취', '공터',
];

const JUNK_ONLY = /^[\s0-9?×xX\-.]*$/;
const SPLIT = /\s*[+,/·]\s*/;
const TRAILING_ETC = /\s*(?:등|외)\s*$/;
const EDGE_DIGITS = /^[0-9]+|[0-9]+$/g;

// 식재 위치·성별 주기는 수종명이 아니다: "배롱나무(좌,우)", "은행나무(수)".
// 괄호 안 쉼표가 복수 수종 구분자로 읽혀 "우)" 같은 조각이 생기던 것을 막는다.
// 원본에는 닫는 괄호가 빠진 "베롱나무(좌"도 있어 여는 괄호 이후를 통째로 걷어낸다.
const PAREN_NOTE = /\s*[(（[][^)）\]]*[)）\]]?/g;

// "반송 외 4종", "피라칸사스 16300주", "등 총 2,035종" 같은 집계 표기.
// 숫자를 반드시 한 자리 이상 요구한다 — [\d,]+ 로 두면 쉼표 하나에도 매치돼
// "낙우송, 종비나무"의 ", 종"을 먹어치운다.
const COUNT_PHRASE = /\s*(?:외|총)?\s*\d[\d,]*\s*(?:종|주|본|그루)/g;

// 분해 후 남는 집계·범주어. 수종명이 아니므로 버린다.
const AGGREGATE = new Set(['등', '총', '외', '기타', '수종', '활엽수', '침엽수', '약용수']);

// 토큰 꼬리에 띄어쓰기로 붙은 집계어. "갈참나무 등 총" → "갈참나무".
// 원본의 "총 2,035종"이 저장 단계에서 "총 2, 035종"으로 쪼개지면
// COUNT_PHRASE가 "035종"만 지우고 "등 총 2"가 남는데, 그 잔재를 여기서 턴다.
// 띄어쓰기가 있는 경우만 떼므로 '등칡'이나 '느티나무등' 같은 라벨은 건드리지 않는다.
// 숫자를 먼저 떼면 "종비나무 등 총 " 처럼 공백이 남으므로 꼬리 공백도 허용한다.
const TRAILING_AGGREGATE = /(?:\s+(?:등|총|외))+\s*$/;

function canonicalizeOne(token) {
  const trimmed = token
    .trim()
    .replace(EDGE_DIGITS, '')
    .replace(TRAILING_AGGREGATE, '')
    .trim();
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

  // 괄호 주기와 집계 표기를 분해 전에 걷어낸다. 분해 후에 처리하면
  // 괄호 안 쉼표가 이미 다른 수종으로 쪼개진 뒤라 되돌릴 수 없다.
  const cleaned = stripped.replace(PAREN_NOTE, '').replace(COUNT_PHRASE, '').trim();
  const withoutEtc = cleaned.replace(TRAILING_ETC, '').trim();
  const changedByEtc = withoutEtc !== stripped;

  const parts = withoutEtc
    .split(SPLIT)
    .map(canonicalizeOne)
    .filter((part) => part && !AGGREGATE.has(part.name));
  if (parts.length === 0) {
    return { raw: text, species: [], kind: 'unknown', normalized: false };
  }

  // "은행나무(수)+은행나무(암)"처럼 주기만 다른 항목은 같은 수종으로 합친다.
  const species = [...new Set(parts.map((part) => part.name))];
  const normalized =
    hadMarker ||
    changedByEtc ||
    parts.some((part) => part.changed) ||
    species.join('+') !== text;

  return { raw: text, species, kind: 'tree', normalized };
}
