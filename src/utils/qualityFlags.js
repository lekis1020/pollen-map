// 공공데이터 레코드의 품질 문제를 결정론적으로 판정한다.
// 원본을 수정하지 않고 플래그만 붙인다.
//
// 각 플래그의 실측 발생 건수는
// docs/superpowers/specs/2026-07-24-data-audit.md 참조.

import { canonicalizeSpecies } from '../data/speciesCanonical.js';
import { getAllergenMatch } from '../data/allergenDatabase.js';
import { isInKorea, haversineKm } from './coordRepair.js';

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
  const hasCoords =
    Number.isFinite(sLat) && sLat !== 0 && Number.isFinite(eLat) && eLat !== 0;

  if (hasCoords) {
    if (!isInKorea(sLat, sLng) || !isInKorea(eLat, eLng)) {
      flags.push(FLAG.COORD_OUT_OF_KR);
    }

    const institution = String(item.institutionNm || item.insttNm || '').trim();
    const box = SIDO_BOUNDS[SIDO_ALIAS[institution.split(/\s+/)[0]]];
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

  const canon = canonicalizeSpecies(item.sttreeKnd);
  if (canon.kind === 'unknown') {
    flags.push(FLAG.SPECIES_INVALID);
  } else if (canon.kind === 'not-a-tree') {
    flags.push(FLAG.NOT_A_TREE);
  } else {
    if (canon.species.length > 1) flags.push(FLAG.SPECIES_MULTI);
    const allUnmatched = canon.species.every(
      (species) => getAllergenMatch(species).matchType === 'none'
    );
    if (allUnmatched) flags.push(FLAG.SPECIES_UNMATCHED);
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
