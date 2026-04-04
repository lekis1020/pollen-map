// CSV 파일 파싱 유틸리티
// data.go.kr 전국가로수길정보표준데이터 CSV 형식 지원

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
  // 가로수길명
  '가로수길명': 'roadName',
  'roadsidTreeRoadNm': 'roadName',
  '가로수길 명칭': 'roadName',

  // 시도명
  '시도명': 'city',
  'ctprvnNm': 'city',
  '시도': 'city',

  // 시군구명
  '시군구명': 'district',
  'signguNm': 'district',
  '시군구': 'district',

  // 수종명
  '수종명': 'species',
  'speciesNm': 'species',
  '수종': 'species',
  '가로수종류': 'species',

  // 식재본수
  '식재본수': 'treeCount',
  'pltngCo': 'treeCount',
  '가로수수량': 'treeCount',

  // 위도
  '위도': 'latitude',
  'latitude': 'latitude',
  '가로수길시작위도': 'latitude',

  // 경도
  '경도': 'longitude',
  'longitude': 'longitude',
  '가로수길시작경도': 'longitude',

  // 관리기관
  '관리기관명': 'institution',
  'institutionNm': 'institution',
  '관리기관': 'institution',

  // 전화번호
  '관리기관전화번호': 'phone',
  'phoneNumber': 'phone',
  '전화번호': 'phone',

  // 데이터기준일자
  '데이터기준일자': 'referenceDate',
  'referenceDate': 'referenceDate',
};

// 컬럼 헤더를 내부 필드명으로 매핑
function mapHeaders(headers) {
  return headers.map((h) => {
    const cleaned = h.replace(/^\uFEFF/, '').trim(); // BOM 제거
    return COLUMN_MAP[cleaned] || cleaned;
  });
}

// CSV 파일을 파싱하여 데이터 배열로 변환
export function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV 파일에 데이터가 없습니다.');
  }

  const rawHeaders = parseCSVLine(lines[0]);
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

    items.push({
      id: `csv_${i}_${lat}_${lng}`,
      roadName: row.roadName || '',
      city: row.city || '',
      district: row.district || '',
      species: row.species || '',
      treeCount: parseInt(row.treeCount, 10) || 0,
      latitude: lat,
      longitude: lng,
      institution: row.institution || '',
      phone: row.phone || '',
      referenceDate: row.referenceDate || '',
    });
  }

  return { items, total: lines.length - 1, skipped };
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
