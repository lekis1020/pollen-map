// CSV 파일 파싱 유틸리티
// data.go.kr 다중 표준데이터 CSV 형식 지원

// CSV 문자열을 파싱 (쉼표, 큰따옴표 처리)
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

// 컬럼명 매핑 (다양한 표준 컬럼명 지원)
const COLUMN_MAP = {
  // === 공통 필드 ===
  '시도명': 'city',
  'ctprvnNm': 'city',
  '시도': 'city',
  '시군구명': 'district',
  'signguNm': 'district',
  '시군구': 'district',
  '위도': 'latitude',
  'latitude': 'latitude',
  '경도': 'longitude',
  'longitude': 'longitude',
  '관리기관명': 'institution',
  'institutionNm': 'institution',
  '관리기관': 'institution',
  '관리기관전화번호': 'phone',
  'phoneNumber': 'phone',
  '전화번호': 'phone',
  '데이터기준일자': 'referenceDate',
  'referenceDate': 'referenceDate',

  // === 가로수길 필드 ===
  '가로수길명': 'roadName',
  'roadsidTreeRoadNm': 'roadName',
  '가로수길 명칭': 'roadName',
  '수종명': 'species',
  'speciesNm': 'species',
  '수종': 'species',
  '가로수종류': 'species',
  '식재본수': 'treeCount',
  'pltngCo': 'treeCount',
  '가로수수량': 'treeCount',
  '가로수길시작위도': 'latitude',
  '가로수길시작경도': 'longitude',

  // === 보호수 필드 ===
  '보호수명': 'prtcTreeNm',
  'prtcTreeNm': 'prtcTreeNm',
  '수령': 'treeAge',
  'treeAge': 'treeAge',
  '지정일자': 'dsgntnDe',
  'dsgntnDe': 'dsgntnDe',
  '나무둘레': 'treCrcmfr',
  'treCrcmfr': 'treCrcmfr',
  '나무높이': 'treHght',
  'treHght': 'treHght',

  // === 도시공원 필드 ===
  '공원명': 'parkNm',
  'parkNm': 'parkNm',
  '공원구분': 'parkSe',
  'parkSe': 'parkSe',
  '면적': 'ar',
  'ar': 'ar',
  '소재지도로명주소': 'rdnmadr',
  'rdnmadr': 'rdnmadr',
  '소재지지번주소': 'lnmadr',
  'lnmadr': 'lnmadr',

  // === 수목원 필드 ===
  '수목원명': 'arboretumNm',
  'arboretumNm': 'arboretumNm',
  '주요식물': 'mainSpcs',
  'mainSpcs': 'mainSpcs',
  '운영시간': 'operHours',
  'operHours': 'operHours',
};

// CSV 헤더로 데이터 소스 타입 자동 감지
export function detectSourceType(headers) {
  const cleaned = headers.map((h) => h.replace(/^\uFEFF/, '').trim());
  if (cleaned.some((h) => ['가로수길명', 'roadsidTreeRoadNm', '식재본수', 'pltngCo'].includes(h))) {
    return 'streetTree';
  }
  if (cleaned.some((h) => ['보호수명', 'prtcTreeNm', '수령', 'treeAge'].includes(h))) {
    return 'protectedTree';
  }
  if (cleaned.some((h) => ['공원명', 'parkNm', '공원구분', 'parkSe'].includes(h))) {
    return 'urbanPark';
  }
  if (cleaned.some((h) => ['수목원명', 'arboretumNm', '주요식물', 'mainSpcs'].includes(h))) {
    return 'arboretum';
  }
  return 'streetTree'; // 기본값
}

// 소스 타입별 레이블
const SOURCE_LABELS = {
  streetTree: '가로수길',
  protectedTree: '보호수',
  urbanPark: '도시공원',
  arboretum: '수목원',
};

// 컬럼 헤더를 내부 필드명으로 매핑
function mapHeaders(headers) {
  return headers.map((h) => {
    const cleaned = h.replace(/^\uFEFF/, '').trim(); // BOM 제거
    return COLUMN_MAP[cleaned] || cleaned;
  });
}

// 소스 타입별 행 데이터를 통합 스키마로 변환
function normalizeRow(row, sourceType, index) {
  const lat = parseFloat(row.latitude);
  const lng = parseFloat(row.longitude);

  const base = {
    latitude: lat,
    longitude: lng,
    sourceType,
    sourceLabel: SOURCE_LABELS[sourceType] || sourceType,
    city: row.city || '',
    district: row.district || '',
    institution: row.institution || '',
    phone: row.phone || '',
    referenceDate: row.referenceDate || '',
  };

  switch (sourceType) {
    case 'protectedTree':
      return {
        ...base,
        id: `csv_pt_${index}_${lat}_${lng}`,
        locationName: row.prtcTreeNm || '',
        roadName: '',
        species: row.species || '',
        treeCount: 1,
        plantCount: 1,
        extra: {
          treeAge: row.treeAge || '',
          designation: row.dsgntnDe || '',
          circumference: row.treCrcmfr || '',
          height: row.treHght || '',
        },
      };
    case 'urbanPark':
      return {
        ...base,
        id: `csv_up_${index}_${lat}_${lng}`,
        locationName: row.parkNm || '',
        roadName: '',
        species: '',
        treeCount: 0,
        plantCount: 0,
        extra: {
          parkType: row.parkSe || '',
          area: row.ar || '',
          rdnmadr: row.rdnmadr || '',
          lnmadr: row.lnmadr || '',
        },
      };
    case 'arboretum':
      return {
        ...base,
        id: `csv_ab_${index}_${lat}_${lng}`,
        locationName: row.arboretumNm || '',
        roadName: '',
        species: row.mainSpcs || '',
        treeCount: 0,
        plantCount: 0,
        extra: {
          area: row.ar || '',
          mainSpecies: row.mainSpcs || '',
          operatingHours: row.operHours || '',
          rdnmadr: row.rdnmadr || '',
        },
      };
    default: // streetTree
      return {
        ...base,
        id: `csv_st_${index}_${lat}_${lng}`,
        locationName: row.roadName || '',
        roadName: row.roadName || '',
        species: row.species || '',
        treeCount: parseInt(row.treeCount, 10) || 0,
        plantCount: parseInt(row.treeCount, 10) || 0,
        extra: {},
      };
  }
}

// CSV 파일을 파싱하여 데이터 배열로 변환
export function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV 파일에 데이터가 없습니다.');
  }

  const rawHeaders = parseCSVLine(lines[0]);
  const sourceType = detectSourceType(rawHeaders);
  const headers = mapHeaders(rawHeaders);

  const items = [];
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });

    const lat = parseFloat(row.latitude);
    const lng = parseFloat(row.longitude);

    // 유효한 좌표가 있는 행만 포함
    if (!lat || !lng || lat < 33 || lat > 39 || lng < 124 || lng > 132) {
      skipped++;
      continue;
    }

    items.push(normalizeRow(row, sourceType, i));
  }

  return {
    items,
    total: lines.length - 1,
    skipped,
    detectedSource: sourceType,
    detectedSourceLabel: SOURCE_LABELS[sourceType] || sourceType,
  };
}

// File 객체에서 텍스트를 읽어 파싱
export function readCSVFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = parseCSV(e.target.result);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'));
    // EUC-KR 인코딩 시도, 실패하면 UTF-8
    reader.readAsText(file, 'UTF-8');
  });
}
