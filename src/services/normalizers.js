// 소스별 API 응답 정규화 함수

import { canonicalizeSpecies } from '../data/speciesCanonical.js';

let idCounter = 0;

const JUNK_ONLY = /^[\s0-9?×xX\-.]*$/;

// 도로명 칸에 '3', '6', '12' 같은 값이 들어간 케이스가 있다(서울 소스 7,130그루).
// 숫자·기호만 있는 값은 도로명이 아니므로 비운다 — 잘못된 정보를 보여주느니
// "도로명 미상"이 낫다.
function sanitizeRoadName(raw) {
  const text = String(raw || '').trim();
  return !text || JUNK_ONLY.test(text) ? '' : text;
}

// 전국 소스에는 안정적인 레코드 id가 없다. 기관+도로명+시작좌표로 키를 만든다.
// scripts/audit-data.mjs와 src/services/api.js가 같은 키를 써야 플래그가 붙는다.
// 좌표 교정 전 원본 값으로 계산한다 — 플래그도 원본 기준으로 산출되기 때문이다.
export function nationwideKey(item) {
  return [
    item.institutionNm || item.insttNm || '',
    item.sttreeStretNm || '',
    item.startLatitude || '',
    item.startLongitude || '',
  ].join('|');
}

const CITY_NAMES = {
  서울: '서울특별시', 부산: '부산광역시', 대구: '대구광역시', 인천: '인천광역시',
  광주: '광주광역시', 대전: '대전광역시', 울산: '울산광역시', 세종: '세종특별자치시',
  경기: '경기도', 강원: '강원특별자치도', 충북: '충청북도', 충남: '충청남도',
  전북: '전북특별자치도', 전남: '전라남도', 경북: '경상북도', 경남: '경상남도', 제주: '제주특별자치도',
};

function getCityFromAddress(address = '') {
  const legacyPrefixes = {
    경기도: '경기', 강원도: '강원', 충청북도: '충북', 충청남도: '충남',
    전라북도: '전북', 전라남도: '전남', 경상북도: '경북', 경상남도: '경남', 제주도: '제주',
  };
  const firstToken = address.split(/\s+/)[0];
  return CITY_NAMES[firstToken] || CITY_NAMES[legacyPrefixes[firstToken]] || firstToken;
}

export function normalizeStreetTree(item) {
  const startLat = parseFloat(item.startLatitude || item.startLa) || null;
  const startLng = parseFloat(item.startLongitude || item.startLo) || null;
  const endLat = parseFloat(item.endLatitude || item.endLa) || null;
  const endLng = parseFloat(item.endLongitude || item.endLo) || null;

  // 중심점: API 제공 좌표 우선, 없으면 시작/끝점 중간, 최후에 시작점
  const rawLat = parseFloat(item.latitude) || 0;
  const rawLng = parseFloat(item.longitude) || 0;
  const centerLat = rawLat || (startLat && endLat ? (startLat + endLat) / 2 : startLat || 0);
  const centerLng = rawLng || (startLng && endLng ? (startLng + endLng) / 2 : startLng || 0);

  const rawSpecies = item.speciesNm || item.sttreeKnd || '';
  const canon = canonicalizeSpecies(rawSpecies);
  const roadName = sanitizeRoadName(item.roadsidTreeRoadNm || item.sttreeStretNm);

  return {
    id: `streetTree_${++idCounter}_${centerLat}_${centerLng}`,
    sourceType: 'streetTree',
    sourceLabel: '가로수길',
    roadName,
    locationName: roadName,
    city: item.ctprvnNm || (item.insttNm || '').split(' ')[0] || '',
    district: item.signguNm || (item.insttNm || '').split(' ').slice(1).join(' ') || '',
    species: rawSpecies,           // 원본 보존 — 우리는 source of truth가 아니다
    speciesList: canon.species,    // 정규화·분해 결과
    speciesKind: canon.kind,
    qualityFlags: [],              // api.js가 오버레이에서 채운다
    treeCount: parseInt(item.pltngCo || item.sttreeCo, 10) || 0,
    plantCount: parseInt(item.pltngCo || item.sttreeCo, 10) || 0,
    latitude: centerLat,
    longitude: centerLng,
    institution: item.institutionNm || item.insttNm || '',
    phone: item.phoneNumber || '',
    referenceDate: item.referenceDate || '',
    extra: {},
  };
}

export function normalizeFamousForest(item) {
  return {
    id: item.id,
    sourceType: 'famousForest',
    sourceLabel: '국유림 명품숲',
    locationName: item.name,
    address: item.address,
    city: getCityFromAddress(item.address),
    district: '',
    species: item.species,
    areaHa: item.areaHa,
    management: item.management,
    contact: item.contact,
    note: item.note,
    type: item.type,
    year: item.year,
    latitude: item.latitude || 0,
    longitude: item.longitude || 0,
    hasCoords: item.hasCoords,
    extra: {
      area: item.areaHa,
      management: item.management,
    },
  };
}

export const NORMALIZERS = {
  streetTree: normalizeStreetTree,
  famousForest: normalizeFamousForest,
};