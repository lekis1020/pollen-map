import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { idbGet, idbSet } = vi.hoisted(() => ({
  idbGet: vi.fn(async () => null),
  idbSet: vi.fn(async () => true),
}));

vi.mock('./idbCache', () => ({
  idbGet: (...args) => idbGet(...args),
  idbSet: (...args) => idbSet(...args),
}));

import { nationwideKey } from './normalizers';

const SEOUL_TTL = 24 * 60 * 60 * 1000;

function jsonResponse(body, ok = true, status = ok ? 200 : 500) {
  return { ok, status, json: async () => body };
}

async function loadApi() {
  vi.resetModules();
  return import('./api.js');
}

beforeEach(() => {
  idbGet.mockReset();
  idbSet.mockReset();
  idbGet.mockResolvedValue(null);
  idbSet.mockResolvedValue(true);
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loadSeoulTrees', () => {
  const seoulPayload = {
    dicts: {
      sp: ['은행나무', '3', '결주'],
      gu: ['강남구'],
      road: ['  테헤란로  ', '12', '×'],
    },
    lat: [37.51, 37.52, 37.53],
    lng: [127.01, 127.02, 127.03],
    sp: [0, 1, 2],
    gu: [0, 0, 0],
    road: [0, 1, 2],
    generatedAt: '2026-04-01',
  };

  it('컬럼형 JSON을 레코드로 풀고 도로명 잡값을 비운다', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (String(url).includes('seoul-trees')) return jsonResponse(seoulPayload);
      if (String(url).includes('quality-flags')) {
        return jsonResponse({ seoul: { flags: { 0: ['STALE'], 2: ['NOT_A_TREE'] } } });
      }
      throw new Error(url);
    }));

    const { loadSeoulTrees } = await loadApi();
    const items = await loadSeoulTrees();

    expect(idbGet).toHaveBeenCalledWith('seoul-trees-v3', SEOUL_TTL);
    expect(items.map((item) => item.roadName)).toEqual(['테헤란로', '', '']);
    expect(items[0]).toMatchObject({
      id: 'st_0',
      sourceType: 'seoulTree',
      sourceLabel: '서울 가로수 (개별)',
      locationName: '테헤란로',
      city: '서울특별시',
      district: '강남구',
      species: '은행나무',
      speciesList: ['은행나무'],
      speciesKind: 'tree',
      qualityFlags: ['STALE'],
      treeCount: 1,
      plantCount: 1,
      latitude: 37.51,
      longitude: 127.01,
      institution: '',
      phone: '',
      referenceDate: '2026-04-01',
      extra: {},
    });
    expect(items[1].species).toBe('3');
    expect(items[1].speciesKind).toBe('unknown');
    expect(items[1].qualityFlags).toEqual([]);
    expect(items[2].speciesKind).toBe('not-a-tree');
    expect(items[2].qualityFlags).toEqual(['NOT_A_TREE']);
    expect(idbSet).toHaveBeenCalledWith('seoul-trees-v3', items);
  });

  it('품질 플래그 파일을 못 읽어도 나무는 돌려준다', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (String(url).includes('seoul-trees')) return jsonResponse(seoulPayload);
      return jsonResponse(null, false, 404);
    }));
    const { loadSeoulTrees } = await loadApi();
    const items = await loadSeoulTrees();
    expect(items).toHaveLength(3);
    expect(items.every((item) => item.qualityFlags.length === 0)).toBe(true);
  });

  it('캐시가 있으면 네트워크를 타지 않는다', async () => {
    const cached = [{ id: 'cached' }];
    idbGet.mockResolvedValueOnce(cached);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { loadSeoulTrees } = await loadApi();
    await expect(loadSeoulTrees()).resolves.toBe(cached);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(idbSet).not.toHaveBeenCalled();
  });

  it('빈 배열 캐시는 미스로 보고 다시 받는다', async () => {
    idbGet.mockResolvedValueOnce([]);
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (String(url).includes('seoul-trees')) {
        return jsonResponse({ ...seoulPayload, lat: [37.1], lng: [127.1], sp: [0], gu: [0], road: [0] });
      }
      return jsonResponse({ seoul: { flags: {} } });
    }));
    const { loadSeoulTrees } = await loadApi();
    const items = await loadSeoulTrees();
    expect(items).toHaveLength(1);
  });

  it('서울 JSON이 실패하면 메시지를 던져 올린다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(null, false, 503)));
    const { loadSeoulTrees } = await loadApi();
    await expect(loadSeoulTrees()).rejects.toThrow('서울 가로수 데이터 로드 실패: 503');
  });
});

describe('loadFamousForests', () => {
  it('좌표가 있는 항목만 정규화한다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({
      items: [
        {
          id: 'famousForest_0',
          name: '가평숲',
          address: '경기 가평군',
          species: '가문비나무, 낙엽송',
          hasCoords: true,
          latitude: 37.8,
          longitude: 127.5,
          areaHa: 12,
          management: '북부지방산림청',
        },
        { id: 'famousForest_1', name: '좌표없음', hasCoords: false },
      ],
    })));
    const { loadFamousForests } = await loadApi();
    const items = await loadFamousForests();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: 'famousForest_0',
      sourceType: 'famousForest',
      city: '경기도',
      species: '가문비나무, 낙엽송',
      speciesList: ['가문비나무', '낙엽송'],
      latitude: 37.8,
      longitude: 127.5,
    });
  });

  it('실패하면 상태 코드를 메시지에 담는다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(null, false, 404)));
    const { loadFamousForests } = await loadApi();
    await expect(loadFamousForests()).rejects.toThrow('명품숲 데이터 로드 실패: 404');
  });
});

describe('fetchAllData', () => {
  const raw = {
    institutionNm: '충청북도 충주시',
    sttreeStretNm: '3',
    startLatitude: '36.96',
    startLongitude: '127.95',
    latitude: '37.50',
    longitude: '127.00',
    sttreeKnd: '양버즘',
    sttreeCo: '4',
  };

  it('교정 전 키로 플래그를 찾고, 가장 낮은 신뢰도 교정을 적용한다', async () => {
    const key = nationwideKey(raw);
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      const href = String(url);
      if (href.includes('sttree-roads')) {
        return jsonResponse({
          items: [
            raw,
            { sttreeStretNm: '좌표없음' },
          ],
        });
      }
      if (href.includes('quality-flags')) {
        return jsonResponse({ nationwide: { flags: { [key]: ['STALE'] } } });
      }
      if (href.includes('corrections')) {
        return jsonResponse({
          corrections: [
            { key, field: 'latitude', to: '36.20', method: 'roadname-geocode:road', confidence: 'medium' },
            { key, field: 'longitude', to: '127.10', method: 'single-digit-repair', confidence: 'low' },
          ],
        });
      }
      throw new Error(href);
    }));

    const seen = [];
    const { fetchAllData } = await loadApi();
    const result = await fetchAllData((page) => { seen.push(page); });

    expect(result.totalCount).toBe(1);
    expect(result.items[0]).toMatchObject({
      roadName: '',
      locationName: '',
      species: '양버즘',
      speciesList: ['양버즘나무'],
      latitude: 36.2,
      longitude: 127.1,
      treeCount: 4,
      plantCount: 4,
      sourceKey: key,
      qualityFlags: ['STALE'],
      coordCorrection: { method: 'single-digit-repair', confidence: 'low' },
    });
    expect(seen).toHaveLength(1);
    expect(seen[0].items).not.toBe(result.items);
    expect(seen[0].items).toEqual(result.items);
    expect(seen[0].totalCount).toBe(1);
  });

  it('같은 신뢰도면 먼저 온 교정 방식을 대표로 쓴다', async () => {
    const key = nationwideKey(raw);
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      const href = String(url);
      if (href.includes('sttree-roads')) return jsonResponse({ items: [raw] });
      if (href.includes('quality-flags')) return jsonResponse({ nationwide: { flags: {} } });
      if (href.includes('corrections')) {
        return jsonResponse({
          corrections: [
            { key, field: 'latitude', to: '36.10', method: 'first-method', confidence: 'medium' },
            { key, field: 'longitude', to: '127.20', method: 'second-method', confidence: 'medium' },
          ],
        });
      }
      throw new Error(href);
    }));
    const { fetchAllData } = await loadApi();
    const result = await fetchAllData();
    expect(result.items[0].coordCorrection).toEqual({ method: 'first-method', confidence: 'medium' });
    expect(result.items[0].latitude).toBeCloseTo(36.1, 5);
    expect(result.items[0].longitude).toBeCloseTo(127.2, 5);
  });

  it('오버레이를 못 받아도 정규화 결과는 돌려준다', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      const href = String(url);
      if (href.includes('sttree-roads')) return jsonResponse({ items: [raw] });
      throw new Error('overlay down');
    }));
    const { fetchAllData } = await loadApi();
    const result = await fetchAllData();
    expect(result.items).toHaveLength(1);
    expect(result.items[0].qualityFlags).toEqual([]);
    expect(result.items[0].coordCorrection).toBeNull();
    expect(result.items[0].speciesList).toEqual(['양버즘나무']);
  });

  it('스냅샷이 실패하면 소스 라벨을 붙여 던진다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(null, false, 500)));
    const { fetchAllData } = await loadApi();
    await expect(fetchAllData()).rejects.toThrow('[가로수길] 데이터 로드 실패: 500');
  });
});
