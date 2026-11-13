import { describe, it, expect } from 'vitest';
import { FLAG, flagNationwideRecord, flagSeoulTree } from './qualityFlags.js';

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
      sttreeStretLt: '0.1',      // 100m라고 신고
      endLatitude: '36.997860',  // 실제 직선거리 약 3km
    });
    expect(r).toContain(FLAG.LENGTH_CONTRADICTION);
  });

  it('직선거리가 신고연장보다 짧은 것은 정상이므로 잡지 않는다', () => {
    // 구불구불한 도로는 직선거리 < 도로연장이 당연하다. 실측 중앙값 0.83
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
    expect(flagSeoulTree(OK_TREE, { stackedCount: 89 })).toContain(FLAG.COORD_STACKED);
    expect(flagSeoulTree(OK_TREE, { stackedCount: 2 })).not.toContain(FLAG.COORD_STACKED);
  });

  it('도로명 잡값은 공백·기호·숫자만 있는 경우다', () => {
    for (const road of ['×', '?', 'x', '  12  ', '   ', '-']) {
      expect(flagSeoulTree({ ...OK_TREE, road })).toContain(FLAG.ROAD_INVALID);
    }
    expect(flagSeoulTree({ ...OK_TREE, road: '  테헤란로  ' })).not.toContain(FLAG.ROAD_INVALID);
  });
});

describe('flagNationwideRecord — 시도 별칭', () => {
  // 기관명 첫 토큰을 짧은 시도명으로 줄인 뒤 경계 상자를 본다.
  // 상자는 [latMin, latMax, lngMin, lngMax].
  const INSIDE = {
    서울특별시: [37.55, 126.98],
    인천광역시: [37.45, 126.7],
    경기도: [37.4, 127.0],
    강원특별자치도: [37.8, 128.2],
    강원도: [37.8, 128.2],
    충청북도: [36.6, 127.8],
    충청남도: [36.5, 126.8],
    대전광역시: [36.35, 127.4],
    세종특별자치시: [36.5, 127.28],
    전북특별자치도: [35.8, 127.1],
    전라북도: [35.8, 127.1],
    전라남도: [34.8, 126.9],
    광주광역시: [35.15, 126.85],
    경상북도: [36.5, 128.7],
    대구광역시: [36.2, 128.5],
    경상남도: [35.2, 128.2],
    부산광역시: [35.1, 129.05],
    울산광역시: [35.5, 129.2],
    제주특별자치도: [33.4, 126.5],
    제주도: [33.4, 126.5],
  };

  function recordAt(institution, lat, lng) {
    return flagNationwideRecord({
      ...OK_RECORD,
      institutionNm: `${institution} 기관`,
      startLatitude: String(lat),
      startLongitude: String(lng),
      endLatitude: String(lat + 0.001),
      endLongitude: String(lng + 0.001),
      sttreeStretLt: '5',
    });
  }

  it('별칭이 가리키는 상자 안의 좌표는 관할 이탈이 아니다', () => {
    for (const [name, [lat, lng]] of Object.entries(INSIDE)) {
      expect(recordAt(name, lat, lng), name).not.toContain(FLAG.COORD_WRONG_REGION);
    }
  });

  it('다른 시도 좌표면 관할 이탈이다', () => {
    expect(recordAt('서울특별시', 35.1, 129.05)).toContain(FLAG.COORD_WRONG_REGION);
    expect(recordAt('제주도', 37.55, 126.98)).toContain(FLAG.COORD_WRONG_REGION);
  });

  it('상자가 없는 기관명은 관할 이탈로 보지 않는다', () => {
    expect(recordAt('해외시', 37.55, 126.98)).not.toContain(FLAG.COORD_WRONG_REGION);
  });
});
