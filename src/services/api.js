import { DATA_SOURCES } from './dataSources';
import { NORMALIZERS, nationwideKey } from './normalizers';
import { idbGet, idbSet } from './idbCache';
import { canonicalizeSpecies } from '../data/speciesCanonical.js';

const JUNK_ONLY = /^[\s0-9?×xX\-.]*$/;

// 도로명 칸의 숫자·기호 값은 도로명이 아니다. normalizers.js와 같은 규칙.
function sanitizeRoadName(raw) {
  const text = String(raw || '').trim();
  return !text || JUNK_ONLY.test(text) ? '' : text;
}

// 서울 소스의 품질 플래그. 인덱스를 키로 하는 객체다.
// 실패해도 앱은 동작해야 하므로 빈 객체로 폴백한다.
async function loadSeoulQualityFlags() {
  try {
    const res = await fetch('/data/quality-flags.json');
    if (!res.ok) return {};
    const json = await res.json();
    return json?.seoul?.flags || {};
  } catch {
    return {};
  }
}

// 품질 오버레이(플래그 + 좌표 교정)를 한 번만 로드해 재사용한다.
// 실패해도 앱은 동작해야 하므로 빈 오버레이로 폴백한다.
let overlayPromise = null;
function getQualityOverlay() {
  overlayPromise ||= (async () => {
    const empty = { nationwideFlags: {}, correctionsByKey: new Map() };
    try {
      const [flagsRes, corrRes] = await Promise.all([
        fetch('/data/quality-flags.json'),
        fetch('/data/corrections.json'),
      ]);
      const flagsJson = flagsRes.ok ? await flagsRes.json() : null;
      const corrJson = corrRes.ok ? await corrRes.json() : null;
      const correctionsByKey = new Map();
      for (const correction of corrJson?.corrections || []) {
        if (!correctionsByKey.has(correction.key)) correctionsByKey.set(correction.key, []);
        correctionsByKey.get(correction.key).push(correction);
      }
      return {
        nationwideFlags: flagsJson?.nationwide?.flags || {},
        correctionsByKey,
      };
    } catch {
      return empty;
    }
  })();
  return overlayPromise;
}

const CONFIDENCE_RANK = { high: 3, medium: 2, low: 1 };

// 좌표 교정을 원본에 적용한다. 원본 객체는 건드리지 않고 복사본을 만든다.
function applyCorrections(rawItem, correctionsByKey) {
  const corrections = correctionsByKey.get(nationwideKey(rawItem));
  if (!corrections) return { item: rawItem, correction: null };
  const item = { ...rawItem };
  for (const correction of corrections) item[correction.field] = correction.to;
  // 팝업이 "어떻게 고쳤는지"를 말할 수 있어야 한다. 한 레코드에 방식이 섞이면
  // 가장 낮은 신뢰도를 대표로 쓴다 — 사용자에게 유리한 쪽으로 반올림하지 않는다.
  const weakest = corrections.reduce((acc, c) =>
    (CONFIDENCE_RANK[c.confidence] || 0) < (CONFIDENCE_RANK[acc.confidence] || 0) ? c : acc
  );
  return { item, correction: { method: weakest.method, confidence: weakest.confidence } };
}

// 전국 가로수길 정적 스냅샷 로드 (scripts/fetch-sttree-roads.mjs 산출물, 10,423 노선)
// 2026-08 데이터포털 서비스 전환 후 api.data.go.kr이 브라우저(Origin 헤더 포함) 요청을
// 403으로 차단해 직접 호출이 불가능하다 — 서울 가로수(OA-1325)와 같은 정적 방식 사용.
async function loadStreetTreeRoads() {
  const source = DATA_SOURCES.streetTree;
  const res = await fetch('/data/sttree-roads.json');
  if (!res.ok) throw new Error(`[${source.label}] 데이터 로드 실패: ${res.status}`);
  const data = await res.json();
  const itemList = data.items || [];
  const normalize = NORMALIZERS[source.id];
  const overlay = await getQualityOverlay();

  const valid = itemList.filter(
    (item) => (item.latitude && item.longitude) || (item.startLatitude && item.startLongitude)
  );
  // 플래그는 원본 기준으로 산출됐으므로 교정 전 키로 조회한다.
  const keys = valid.map(nationwideKey);
  const normalized = valid.map((raw) => {
    const { item, correction } = applyCorrections(raw, overlay.correctionsByKey);
    return { record: normalize(item), correction };
  });
  normalized.forEach(({ record, correction }, i) => {
    record.sourceKey = keys[i];
    record.qualityFlags = overlay.nationwideFlags[keys[i]] || [];
    record.coordCorrection = correction;
  });

  return {
    items: normalized.map(({ record }) => record),
    totalCount: normalized.length,
  };
}

// 서울 개별 가로수 정적 JSON 로드 (OA-1325, ~257k 그루)
// 컬럼형 포맷 + 사전 인코딩 → 7.4MB (기존 29MB 대비 75%↓)
// IndexedDB 캐시: 변환된 객체를 저장하여 재방문 시 네트워크+파싱+변환 생략
// v3: speciesList/speciesKind/qualityFlags 필드가 추가되어 이전 캐시는 쓸 수 없다.
// 필드 없는 캐시를 그대로 쓰면 결주·고사가 다시 나무로 표시된다.
const SEOUL_CACHE_KEY = 'seoul-trees-v3';
const SEOUL_CACHE_TTL = 24 * 60 * 60 * 1000; // 24시간

export async function loadSeoulTrees() {
  // 1) IndexedDB 캐시 확인
  const cached = await idbGet(SEOUL_CACHE_KEY, SEOUL_CACHE_TTL);
  if (cached && cached.length > 0) {
    return cached;
  }

  // 2) 네트워크에서 컬럼형 JSON 로드 + 행 객체로 변환
  const [res, seoulFlags] = await Promise.all([
    fetch('/data/seoul-trees.json'),
    loadSeoulQualityFlags(),
  ]);
  if (!res.ok) throw new Error(`서울 가로수 데이터 로드 실패: ${res.status}`);
  const data = await res.json();
  const { dicts, lat, lng, sp, gu, road, generatedAt } = data;
  const count = lat.length;
  const items = new Array(count);

  for (let i = 0; i < count; i++) {
    const rawSpecies = dicts.sp[sp[i]];
    const canon = canonicalizeSpecies(rawSpecies);
    const roadName = sanitizeRoadName(dicts.road[road[i]]);
    items[i] = {
      id: `st_${i}`,
      sourceType: 'seoulTree',
      sourceLabel: '서울 가로수 (개별)',
      roadName,
      locationName: roadName,
      city: '서울특별시',
      district: dicts.gu[gu[i]],
      species: rawSpecies,          // 원본 보존
      speciesList: canon.species,
      speciesKind: canon.kind,
      qualityFlags: seoulFlags[i] || [],
      treeCount: 1,
      plantCount: 1,
      latitude: lat[i],
      longitude: lng[i],
      institution: '',
      phone: '',
      referenceDate: generatedAt || '',
      extra: {},
    };
  }

  // 3) 백그라운드로 IndexedDB에 저장 (UI 차단하지 않음)
  idbSet(SEOUL_CACHE_KEY, items);

  return items;
}

// 산림청 국유림 명품숲 정적 JSON 로드. 좌표는 배포 전 Naver Cloud Geocoding API로 보강한다.
export async function loadFamousForests() {
  const res = await fetch('/data/famous-forests.json');
  if (!res.ok) throw new Error(`명품숲 데이터 로드 실패: ${res.status}`);
  const data = await res.json();
  const normalize = NORMALIZERS.famousForest;
  return (data.items || []).filter((item) => item.hasCoords).map(normalize);
}

// 전국 가로수길 로드. 정적 스냅샷이라 단일 fetch로 끝난다.
// onFirstPage 콜백은 기존 2단계 로딩 계약 유지용 — 전체 로드 직후 한 번 호출된다.
export async function fetchAllData(onFirstPage) {
  const result = await loadStreetTreeRoads();
  if (onFirstPage) onFirstPage({ items: [...result.items], totalCount: result.totalCount });
  return result;
}

