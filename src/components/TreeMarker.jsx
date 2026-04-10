import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { getAllergenInfo, getAllergenLevel, getPollenSeasonText, ALLERGEN_LEVELS } from '../data/allergenDatabase';
import { DATA_SOURCES } from '../services/dataSources';

// 소스 타입별 마커 내부 SVG 도형
const SOURCE_SHAPES = {
  streetTree: '<circle cx="12" cy="11" r="5" fill="#fff" opacity="0.9"/>',
  protectedTree: '<polygon points="12,6 14.5,10.5 9.5,10.5" fill="#fff" opacity="0.9" stroke="#fff" stroke-width="0.5"/><polygon points="12,16 14.5,11.5 9.5,11.5" fill="#fff" opacity="0.9" stroke="#fff" stroke-width="0.5"/>',
  urbanPark: '<rect x="8" y="7" width="8" height="8" rx="1" fill="#fff" opacity="0.9"/>',
  arboretum: '<path d="M12,6 C12,6 16,10 16,12.5 C16,14.7 14.2,16.5 12,16.5 C9.8,16.5 8,14.7 8,12.5 C8,10 12,6 12,6Z" fill="#fff" opacity="0.9"/>',
};

// 알레르기 등급별 커스텀 마커 아이콘 생성
function createMarkerIcon(level, sourceType) {
  const color = ALLERGEN_LEVELS[level]?.color || '#3498db';
  const shape = SOURCE_SHAPES[sourceType] || SOURCE_SHAPES.streetTree;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="${color}" stroke="#fff" stroke-width="1.5"/>
      ${shape}
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: 'custom-marker-icon',
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36],
  });
}

// 아이콘 캐시
const iconCache = {};
function getIcon(level, sourceType) {
  const key = `${level}_${sourceType}`;
  if (!iconCache[key]) {
    iconCache[key] = createMarkerIcon(level, sourceType);
  }
  return iconCache[key];
}

// 소스별 위치명 레이블
const LOCATION_LABELS = {
  streetTree: '가로수길명',
  protectedTree: '보호수명',
  urbanPark: '공원명',
  arboretum: '수목원명',
};

// 소스별 수량 레이블
const COUNT_LABELS = {
  streetTree: '식재본수',
  protectedTree: '수량',
  urbanPark: null,
  arboretum: null,
};

export default function TreeMarker({ data, onStreetViewClick }) {
  const level = getAllergenLevel(data.species);
  const allergenInfo = getAllergenInfo(data.species);
  const levelInfo = ALLERGEN_LEVELS[level];
  const sourceInfo = DATA_SOURCES[data.sourceType];
  const countLabel = COUNT_LABELS[data.sourceType];

  return (
    <Marker
      position={[data.latitude, data.longitude]}
      icon={getIcon(level, data.sourceType)}
    >
      <Popup>
        <div className="tree-popup">
          <h3>{data.locationName || data.roadName}</h3>
          {sourceInfo && (
            <span
              className="source-badge"
              style={{ backgroundColor: sourceInfo.color, color: '#fff', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', display: 'inline-block', marginBottom: '6px' }}
            >
              {sourceInfo.label}
            </span>
          )}
          <table>
            <tbody>
              <tr>
                <td className="popup-label">지역</td>
                <td>{data.city} {data.district}</td>
              </tr>
              {data.species && (
                <tr>
                  <td className="popup-label">수종</td>
                  <td><strong>{data.species}</strong></td>
                </tr>
              )}
              {countLabel && data.plantCount > 0 && (
                <tr>
                  <td className="popup-label">{countLabel}</td>
                  <td>{data.plantCount.toLocaleString()}본</td>
                </tr>
              )}
              <tr>
                <td className="popup-label">알레르기 등급</td>
                <td>
                  <span
                    className="allergen-badge"
                    style={{ backgroundColor: levelInfo.color }}
                  >
                    {levelInfo.label}
                  </span>
                </td>
              </tr>
              {allergenInfo && (
                <>
                  <tr>
                    <td className="popup-label">꽃가루 시기</td>
                    <td>{getPollenSeasonText(allergenInfo.pollenMonths)}</td>
                  </tr>
                  <tr>
                    <td className="popup-label">주요 증상</td>
                    <td className="popup-symptoms">{allergenInfo.symptoms}</td>
                  </tr>
                </>
              )}
              {/* 보호수 추가 정보 */}
              {data.sourceType === 'protectedTree' && data.extra?.treeAge && (
                <tr>
                  <td className="popup-label">수령</td>
                  <td>약 {data.extra.treeAge}년</td>
                </tr>
              )}
              {data.sourceType === 'protectedTree' && data.extra?.designation && (
                <tr>
                  <td className="popup-label">지정일</td>
                  <td>{data.extra.designation}</td>
                </tr>
              )}
              {data.sourceType === 'protectedTree' && data.extra?.circumference && (
                <tr>
                  <td className="popup-label">둘레</td>
                  <td>{data.extra.circumference}m</td>
                </tr>
              )}
              {data.sourceType === 'protectedTree' && data.extra?.height && (
                <tr>
                  <td className="popup-label">높이</td>
                  <td>{data.extra.height}m</td>
                </tr>
              )}
              {/* 도시공원 추가 정보 */}
              {data.sourceType === 'urbanPark' && data.extra?.parkType && (
                <tr>
                  <td className="popup-label">공원구분</td>
                  <td>{data.extra.parkType}</td>
                </tr>
              )}
              {data.sourceType === 'urbanPark' && data.extra?.area && (
                <tr>
                  <td className="popup-label">면적</td>
                  <td>{data.extra.area}m&sup2;</td>
                </tr>
              )}
              {/* 수목원 추가 정보 */}
              {data.sourceType === 'arboretum' && data.extra?.mainSpecies && (
                <tr>
                  <td className="popup-label">주요 식물</td>
                  <td className="popup-symptoms">{data.extra.mainSpecies}</td>
                </tr>
              )}
              {data.sourceType === 'arboretum' && data.extra?.area && (
                <tr>
                  <td className="popup-label">면적</td>
                  <td>{data.extra.area}m&sup2;</td>
                </tr>
              )}
              {/* 주소 정보 */}
              {data.extra?.rdnmadr && (
                <tr>
                  <td className="popup-label">주소</td>
                  <td>{data.extra.rdnmadr}</td>
                </tr>
              )}
              {data.institution && (
                <tr>
                  <td className="popup-label">관리기관</td>
                  <td>{data.institution}</td>
                </tr>
              )}
            </tbody>
          </table>
          {onStreetViewClick && (
            <button
              className="street-view-btn"
              onClick={(e) => {
                e.stopPropagation();
                onStreetViewClick(data);
              }}
            >
              로드뷰 보기
            </button>
          )}
        </div>
      </Popup>
    </Marker>
  );
}
