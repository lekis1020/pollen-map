import { useState, useRef } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { getAllergenInfo, getAllergenLevel, getPollenSeasonText, ALLERGEN_LEVELS } from '../data/allergenDatabase';

const CIRCLE_SHAPE = '<circle cx="12" cy="11" r="5" fill="#fff" opacity="0.9"/>';

// 알레르기 등급별 커스텀 마커 아이콘 생성
function createMarkerIcon(level) {
  const color = ALLERGEN_LEVELS[level]?.color || '#3498db';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="${color}" stroke="#fff" stroke-width="1.5"/>
      ${CIRCLE_SHAPE}
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
function getIcon(level) {
  if (!iconCache[level]) {
    iconCache[level] = createMarkerIcon(level);
  }
  return iconCache[level];
}

export default function TreeMarker({ data, onStreetViewClick }) {
  const level = getAllergenLevel(data.species);
  const allergenInfo = getAllergenInfo(data.species);
  const levelInfo = ALLERGEN_LEVELS[level];
  const [panoAvailable, setPanoAvailable] = useState(null); // null=unchecked, true/false
  const checkedRef = useRef(false);

  const checkPanorama = () => {
    if (checkedRef.current || !window.naver?.maps) return;
    checkedRef.current = true;

    const lat = data.startLat || data.latitude;
    const lng = data.startLng || data.longitude;
    const position = new window.naver.maps.LatLng(lat, lng);

    const div = document.createElement('div');
    div.style.cssText = 'width:1px;height:1px;position:absolute;left:-9999px';
    document.body.appendChild(div);

    try {
      const pano = new window.naver.maps.Panorama(div, {
        position: position,
        pov: { pan: 0, tilt: 0, fov: 100 },
      });

      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) { resolved = true; setPanoAvailable(false); div.remove(); }
      }, 3000);

      window.naver.maps.Event.addListener(pano, 'pano_changed', () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        const pos = pano.getPosition();
        if (pos) {
          const dist = position.distanceTo(pos);
          setPanoAvailable(dist < 200);
        } else {
          setPanoAvailable(false);
        }
        div.remove();
      });

      window.naver.maps.Event.addListener(pano, 'error', () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        setPanoAvailable(false);
        div.remove();
      });
    } catch {
      setPanoAvailable(false);
      div.remove();
    }
  };

  return (
    <Marker
      position={[data.latitude, data.longitude]}
      icon={getIcon(level)}
      eventHandlers={{ popupopen: checkPanorama }}
    >
      <Popup>
        <div className="tree-popup">
          <h3>{data.locationName || data.roadName}</h3>
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
              {data.plantCount > 0 && (
                <tr>
                  <td className="popup-label">식재본수</td>
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
              {data.institution && (
                <tr>
                  <td className="popup-label">관리기관</td>
                  <td>{data.institution}</td>
                </tr>
              )}
            </tbody>
          </table>
          {onStreetViewClick && panoAvailable === null && (
            <button className="street-view-btn" disabled>
              로드뷰 확인 중...
            </button>
          )}
          {onStreetViewClick && panoAvailable === true && (
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
          {onStreetViewClick && panoAvailable === false && (
            <span className="street-view-unavailable">로드뷰 미지원 구간</span>
          )}
        </div>
      </Popup>
    </Marker>
  );
}
