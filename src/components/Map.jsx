import { useEffect, useRef, useState, useCallback } from 'react';
import { getAllergenInfo, getAllergenLevel, getPollenSeasonText, ALLERGEN_LEVELS } from '../data/allergenDatabase';
import Legend from './Legend';
import './Map.css';

const MARKER_CAP = 2000;
const POLYLINE_CAP = 1500;

// 균등 샘플링: 전체 배열에서 cap개를 고르게 추출
function sampleEven(arr, cap) {
  if (arr.length <= cap) return arr;
  const step = arr.length / cap;
  const out = new Array(cap);
  for (let i = 0; i < cap; i++) out[i] = arr[Math.floor(i * step)];
  return out;
}

function boundsIntersect(a, b) {
  return !(
    a.maxLat < b.minLat ||
    a.minLat > b.maxLat ||
    a.maxLng < b.minLng ||
    a.minLng > b.maxLng
  );
}

export default function Map({ data, onStreetViewClick }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const polylinesRef = useRef([]);
  const clusterRef = useRef(null);
  const infoWindowRef = useRef(null);
  const idleDebounceRef = useRef(null);
  const locationMarkerRef = useRef(null);
  const locationCircleRef = useRef(null);
  const [bounds, setBounds] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [gpsState, setGpsState] = useState('idle'); // idle | loading | active | error
  const [gpsError, setGpsError] = useState(null);
  const [showPermissionGuide, setShowPermissionGuide] = useState(false);

  // 위치 마커를 지도에 표시하는 공통 함수
  const placeLocationMarker = useCallback((lat, lng, accuracy, zoomTo) => {
    const map = mapInstanceRef.current;
    if (!map || !window.naver?.maps) return;

    const latlng = new window.naver.maps.LatLng(lat, lng);

    if (locationMarkerRef.current) locationMarkerRef.current.setMap(null);
    if (locationCircleRef.current) locationCircleRef.current.setMap(null);

    if (accuracy > 0) {
      locationCircleRef.current = new window.naver.maps.Circle({
        map, center: latlng,
        radius: Math.min(accuracy, 3000),
        fillColor: '#4A90D9', fillOpacity: 0.1,
        strokeColor: '#4A90D9', strokeOpacity: 0.25, strokeWeight: 1,
        clickable: false,
      });
    }

    locationMarkerRef.current = new window.naver.maps.Marker({
      position: latlng, map,
      icon: {
        content: `<div class="gps-location-marker"><div class="gps-dot"></div><div class="gps-pulse"></div></div>`,
        anchor: new window.naver.maps.Point(18, 18),
      },
      zIndex: 1000,
    });

    map.setCenter(latlng);
    if (zoomTo) map.setZoom(zoomTo);
    setGpsState('active');
  }, []);

  // GPS 현재 위치 — 위치 획득 성공 시 마커 표시 및 지도 이동
  const showLocation = useCallback((position) => {
    const { latitude, longitude, accuracy } = position.coords;
    placeLocationMarker(latitude, longitude, accuracy, 15);

    // 정확도가 1km 이상이면 경고
    if (accuracy > 1000) {
      setGpsError(`위치 정확도가 낮습니다 (약 ${Math.round(accuracy / 1000)}km). 지도를 길게 눌러 위치를 직접 지정할 수 있습니다.`);
      setTimeout(() => setGpsError(null), 6000);
    }
  }, [placeLocationMarker]);

  // GPS 현재 위치 기능
  const handleGpsClick = useCallback(() => {
    // 1) 보안 컨텍스트(HTTPS) 확인
    if (!window.isSecureContext) {
      setGpsState('error');
      setGpsError('위치 서비스는 HTTPS에서만 사용할 수 있습니다.');
      setTimeout(() => { setGpsState('idle'); setGpsError(null); }, 4000);
      return;
    }

    // 2) 지도 로딩 대기 안내
    if (!mapInstanceRef.current || !window.naver?.maps) {
      setGpsState('error');
      setGpsError('지도를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.');
      setTimeout(() => { setGpsState('idle'); setGpsError(null); }, 3000);
      return;
    }

    // 3) Geolocation API 지원 확인
    if (!navigator.geolocation) {
      setGpsState('error');
      setGpsError('이 브라우저에서는 위치 서비스를 지원하지 않습니다.');
      setTimeout(() => { setGpsState('idle'); setGpsError(null); }, 3000);
      return;
    }

    setGpsState('loading');
    setGpsError(null);

    // 4) 고정밀도 시도 → 실패 시 저정밀도로 재시도
    navigator.geolocation.getCurrentPosition(
      showLocation,
      (err) => {
        // PERMISSION_DENIED (code 1)
        if (err.code === 1) {
          setGpsState('error');
          setShowPermissionGuide(true);
          setTimeout(() => setGpsState('idle'), 300);
          return;
        }
        // TIMEOUT (code 3) 또는 POSITION_UNAVAILABLE (code 2) — 저정밀도로 재시도
        if (err.code === 2 || err.code === 3) {
          navigator.geolocation.getCurrentPosition(
            showLocation,
            (retryErr) => {
              setGpsState('error');
              if (retryErr.code === 1) {
                setGpsError('위치 권한이 거부되었습니다.');
              } else if (retryErr.code === 2) {
                setGpsError('위치 서비스를 사용할 수 없습니다. 기기의 위치 서비스가 켜져 있는지 확인해 주세요.');
              } else {
                setGpsError('위치를 가져올 수 없습니다. 잠시 후 다시 시도해 주세요.');
              }
              setTimeout(() => { setGpsState('idle'); setGpsError(null); }, 5000);
            },
            { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
          );
          return;
        }
        // 기타 에러
        setGpsState('error');
        setGpsError('위치를 가져올 수 없습니다.');
        setTimeout(() => { setGpsState('idle'); setGpsError(null); }, 4000);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, [showLocation]);

  // Web Worker로 도로·수종 단위 그룹화 (메인 스레드 차단 없음)
  const workerRef = useRef(null);
  const [grouped, setGrouped] = useState({ polylines: [], markers: [] });

  useEffect(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('../workers/groupWorker.js', import.meta.url),
        { type: 'module' }
      );
      workerRef.current.onmessage = (e) => setGrouped(e.data);
    }
    if (data.length > 0) {
      workerRef.current.postMessage(data);
    } else {
      setGrouped({ polylines: [], markers: [] });
    }
  }, [data]);

  useEffect(() => {
    return () => workerRef.current?.terminate();
  }, []);

  // Info content for individual tree marker
  const buildMarkerInfo = useCallback((item) => {
    const level = getAllergenLevel(item.species);
    const levelInfo = ALLERGEN_LEVELS[level];
    const allergenInfo = getAllergenInfo(item.species);

    let rows = `
      <tr><td class="popup-label">지역</td><td>${item.city} ${item.district}</td></tr>`;
    if (item.species) {
      rows += `
      <tr><td class="popup-label">수종</td><td><strong>${item.species}</strong></td></tr>`;
    }
    if (item.plantCount > 0) {
      rows += `
      <tr><td class="popup-label">식재본수</td><td>${item.plantCount.toLocaleString()}본</td></tr>`;
    }
    rows += `
      <tr><td class="popup-label">알레르기 등급</td><td><span class="allergen-badge" style="background:${levelInfo.color}">${levelInfo.label}</span></td></tr>`;
    if (allergenInfo) {
      rows += `
      <tr><td class="popup-label">꽃가루 시기</td><td>${getPollenSeasonText(allergenInfo.pollenMonths)}</td></tr>
      <tr><td class="popup-label">주요 증상</td><td class="popup-symptoms">${allergenInfo.symptoms}</td></tr>`;
    }

    return `<div class="tree-popup">
      <h3>${item.locationName || item.roadName}</h3>
      <table><tbody>${rows}</tbody></table>
      <button class="street-view-btn" id="naver-sv-btn">로드뷰 보기</button>
    </div>`;
  }, []);

  // Info content for polyline (group)
  const buildPolylineInfo = useCallback((pl) => {
    const level = getAllergenLevel(pl.species);
    const levelInfo = ALLERGEN_LEVELS[level];
    const allergenInfo = getAllergenInfo(pl.species);
    let rows = `
      <tr><td class="popup-label">지역</td><td>${pl.city} ${pl.district}</td></tr>
      <tr><td class="popup-label">수종</td><td><strong>${pl.species}</strong></td></tr>
      <tr><td class="popup-label">구간 그루수</td><td>${pl.count.toLocaleString()}본</td></tr>
      <tr><td class="popup-label">알레르기 등급</td><td><span class="allergen-badge" style="background:${levelInfo.color}">${levelInfo.label}</span></td></tr>`;
    if (allergenInfo) {
      rows += `
      <tr><td class="popup-label">꽃가루 시기</td><td>${getPollenSeasonText(allergenInfo.pollenMonths)}</td></tr>
      <tr><td class="popup-label">주요 증상</td><td class="popup-symptoms">${allergenInfo.symptoms}</td></tr>`;
    }
    return `<div class="tree-popup">
      <h3>${pl.roadName}</h3>
      <table><tbody>${rows}</tbody></table>
      <button class="street-view-btn" id="naver-sv-btn">대표지점 로드뷰</button>
    </div>`;
  }, []);

  // Naver 지도 초기화
  useEffect(() => {
    let cancelled = false;
    let pollTimer;

    const init = () => {
      if (cancelled || mapInstanceRef.current) return;
      if (!window.naver?.maps || !mapRef.current) {
        pollTimer = setTimeout(init, 100);
        return;
      }

      const map = new window.naver.maps.Map(mapRef.current, {
        center: new window.naver.maps.LatLng(36.5, 127.5),
        zoom: 7,
        minZoom: 6,
        maxZoom: 18,
        zoomControl: true,
        zoomControlOptions: {
          position: window.naver.maps.Position.TOP_RIGHT,
          style: window.naver.maps.ZoomControlStyle.SMALL,
        },
      });
      mapInstanceRef.current = map;

      const updateBounds = () => {
        if (idleDebounceRef.current) clearTimeout(idleDebounceRef.current);
        idleDebounceRef.current = setTimeout(() => {
          try {
            const b = map.getBounds();
            setBounds({
              minLat: b.minY(),
              maxLat: b.maxY(),
              minLng: b.minX(),
              maxLng: b.maxX(),
            });
          } catch {}
        }, 180);
      };
      window.naver.maps.Event.addListener(map, 'idle', updateBounds);
      updateBounds();

      // 지도 길게 누르기 → 수동 위치 지정
      window.naver.maps.Event.addListener(map, 'rightclick', (e) => {
        placeLocationMarker(e.coord.lat(), e.coord.lng(), 0, null);
        setGpsError(null);
      });

      setMapReady(true);
    };

    init();

    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
      mapInstanceRef.current = null;
    };
  }, []);

  // 폴리라인 + 싱글톤 마커 렌더
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.naver?.maps) return;

    // 기존 오버레이 정리
    if (clusterRef.current) {
      try { clusterRef.current.setMap(null); } catch {}
      clusterRef.current = null;
    }
    markersRef.current.forEach((m) => { try { m.setMap(null); } catch {} });
    markersRef.current = [];
    polylinesRef.current.forEach((p) => { try { p.setMap(null); } catch {} });
    polylinesRef.current = [];
    if (infoWindowRef.current) {
      try { infoWindowRef.current.close(); } catch {}
    }

    const { polylines, markers: singletons } = grouped;

    // 1) 폴리라인: 뷰포트 교차 + 상한
    const visiblePolylines = bounds
      ? polylines.filter((pl) => boundsIntersect(pl.bounds, bounds))
      : polylines;
    const cappedPolylines = visiblePolylines.slice(0, POLYLINE_CAP);

    const plObjects = cappedPolylines.map((pl) => {
      const level = getAllergenLevel(pl.species);
      const color = ALLERGEN_LEVELS[level]?.color || '#3498db';
      const polyline = new window.naver.maps.Polyline({
        map,
        path: pl.path.map((p) => new window.naver.maps.LatLng(p.lat, p.lng)),
        strokeColor: color,
        strokeOpacity: 0.85,
        strokeWeight: 4,
        strokeLineCap: 'round',
        strokeLineJoin: 'round',
        clickable: true,
      });
      window.naver.maps.Event.addListener(polyline, 'click', (e) => {
        if (infoWindowRef.current) {
          try { infoWindowRef.current.close(); } catch {}
        }
        const infoWindow = new window.naver.maps.InfoWindow({
          content: buildPolylineInfo(pl),
          borderWidth: 0,
          backgroundColor: 'transparent',
          anchorSize: new window.naver.maps.Size(0, 0),
          pixelOffset: new window.naver.maps.Point(0, -10),
        });
        infoWindow.open(map, e.coord);
        infoWindowRef.current = infoWindow;
        setTimeout(() => {
          const btn = document.getElementById('naver-sv-btn');
          if (btn && onStreetViewClick) {
            btn.addEventListener('click', () => onStreetViewClick(pl.representative));
          }
        }, 50);
      });
      return polyline;
    });
    polylinesRef.current = plObjects;

    // 2) 싱글톤 마커: 뷰포트 + 샘플링 상한
    const inBounds = bounds
      ? singletons.filter((it) =>
          it.latitude >= bounds.minLat &&
          it.latitude <= bounds.maxLat &&
          it.longitude >= bounds.minLng &&
          it.longitude <= bounds.maxLng
        )
      : singletons;
    const visibleMarkers = sampleEven(inBounds, MARKER_CAP);

    const markers = visibleMarkers.map((item) => {
      const level = getAllergenLevel(item.species);
      const color = ALLERGEN_LEVELS[level]?.color || '#3498db';
      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(item.latitude, item.longitude),
        map: null,
        icon: {
          content: `<div style="width:12px;height:12px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.3);cursor:pointer"></div>`,
          anchor: new window.naver.maps.Point(8, 8),
        },
        title: item.roadName || item.locationName,
      });
      window.naver.maps.Event.addListener(marker, 'click', () => {
        if (infoWindowRef.current) {
          try { infoWindowRef.current.close(); } catch {}
        }
        const infoWindow = new window.naver.maps.InfoWindow({
          content: buildMarkerInfo(item),
          borderWidth: 0,
          backgroundColor: 'transparent',
          anchorSize: new window.naver.maps.Size(0, 0),
          pixelOffset: new window.naver.maps.Point(0, -10),
        });
        infoWindow.open(map, marker);
        infoWindowRef.current = infoWindow;
        setTimeout(() => {
          const btn = document.getElementById('naver-sv-btn');
          if (btn && onStreetViewClick) {
            btn.addEventListener('click', () => onStreetViewClick(item));
          }
        }, 50);
      });
      return marker;
    });
    markersRef.current = markers;

    // 3) 싱글톤에 대한 클러스터링
    const clusterTimeout = setTimeout(() => {
      if (window.MarkerClustering && markers.length > 0) {
        try {
          const icons = [
            { content: '<div style="cursor:pointer;width:40px;height:40px;line-height:40px;font-size:12px;color:#fff;text-align:center;background:#27ae60;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>', size: new window.naver.maps.Size(40, 40), anchor: new window.naver.maps.Point(20, 20) },
            { content: '<div style="cursor:pointer;width:48px;height:48px;line-height:48px;font-size:13px;color:#fff;text-align:center;background:#2980b9;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>', size: new window.naver.maps.Size(48, 48), anchor: new window.naver.maps.Point(24, 24) },
            { content: '<div style="cursor:pointer;width:56px;height:56px;line-height:56px;font-size:14px;color:#fff;text-align:center;background:#e67e22;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>', size: new window.naver.maps.Size(56, 56), anchor: new window.naver.maps.Point(28, 28) },
            { content: '<div style="cursor:pointer;width:64px;height:64px;line-height:64px;font-size:15px;color:#fff;text-align:center;background:#e74c3c;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>', size: new window.naver.maps.Size(64, 64), anchor: new window.naver.maps.Point(32, 32) },
          ];
          const cluster = new MarkerClustering({
            minClusterSize: 2,
            maxZoom: 16,
            map,
            markers,
            disableClickZoom: false,
            gridSize: 60,
            icons,
            indexGenerator: [10, 100, 500, 1000],
            stylingFunction: (clusterMarker, count) => {
              const el = clusterMarker.getElement();
              if (el) {
                const div = el.querySelector('div');
                if (div) div.textContent = count;
              }
            },
          });
          clusterRef.current = cluster;
        } catch {
          markers.forEach((m) => m.setMap(map));
        }
      } else {
        markers.forEach((m) => m.setMap(map));
      }
    }, 200);

    return () => {
      clearTimeout(clusterTimeout);
      markersRef.current.forEach((m) => { try { m.setMap(null); } catch {} });
      polylinesRef.current.forEach((p) => { try { p.setMap(null); } catch {} });
      if (clusterRef.current) {
        try { clusterRef.current.setMap(null); } catch {}
        clusterRef.current = null;
      }
    };
  }, [grouped, bounds, onStreetViewClick, buildMarkerInfo, buildPolylineInfo, mapReady]);

  return (
    <div className="map-wrapper">
      <div ref={mapRef} className="map-container" />
      <div className="map-controls">
        <button
          className={`gps-button ${gpsState}`}
          onClick={handleGpsClick}
          disabled={gpsState === 'loading'}
          aria-label="현재 위치로 이동"
          title="현재 위치"
        >
          {gpsState === 'loading' ? (
            <svg className="gps-spinner" viewBox="0 0 24 24" width="22" height="22">
              <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="50 20" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" fill={gpsState === 'active' ? '#4A90D9' : 'none'} />
              <circle cx="12" cy="12" r="8" />
              <line x1="12" y1="2" x2="12" y2="4" />
              <line x1="12" y1="20" x2="12" y2="22" />
              <line x1="2" y1="12" x2="4" y2="12" />
              <line x1="20" y1="12" x2="22" y2="12" />
            </svg>
          )}
        </button>
        <Legend />
      </div>
      {gpsError && <div className="gps-error-toast">{gpsError}</div>}
      {showPermissionGuide && (
        <PermissionGuide onClose={() => setShowPermissionGuide(false)} />
      )}
    </div>
  );
}

function detectPlatform() {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

function PermissionGuide({ onClose }) {
  const platform = detectPlatform();

  const guides = {
    ios: [
      { text: '아이폰 설정 앱을 엽니다' },
      { text: '개인정보 보호 및 보안 → 위치 서비스가 켜져 있는지 확인합니다' },
      { text: '아래 목록에서 사용 중인 브라우저(Safari/Chrome)를 탭합니다' },
      { text: '"앱을 사용하는 동안" 또는 "다음번에 묻기"를 선택합니다' },
      { text: '이 페이지로 돌아와 위치 버튼을 다시 눌러주세요' },
    ],
    android: [
      { text: '기기 설정 → 위치에서 위치 서비스가 켜져 있는지 확인합니다' },
      { text: '브라우저 주소창 왼쪽의 자물쇠 아이콘을 탭합니다' },
      { text: '"권한" 또는 "사이트 설정"에서 "위치"를 "허용"으로 변경합니다' },
      { text: '페이지를 새로고침한 뒤 위치 버튼을 다시 눌러주세요' },
    ],
    desktop: [
      { text: 'OS 위치 서비스 확인: Mac → 시스템 설정 → 개인정보 보호 → 위치 서비스 켜기 / Windows → 설정 → 개인정보 → 위치 켜기' },
      { text: '브라우저 주소창 왼쪽의 자물쇠 또는 설정 아이콘을 클릭합니다' },
      { text: '"사이트 설정"에서 "위치" 항목을 "허용"으로 변경합니다' },
      { text: '페이지를 새로고침(F5)한 뒤 위치 버튼을 다시 클릭해 주세요' },
    ],
  };

  const titles = {
    ios: 'iPhone에서 위치 권한 허용하기',
    android: 'Android에서 위치 권한 허용하기',
    desktop: 'PC 브라우저에서 위치 권한 허용하기',
  };

  const steps = guides[platform];

  return (
    <div className="permission-guide-overlay" onClick={onClose}>
      <div className="permission-guide" onClick={(e) => e.stopPropagation()}>
        <button className="permission-guide-close" onClick={onClose} aria-label="닫기">&times;</button>
        <div className="permission-guide-header">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#e67e22" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h3>{titles[platform]}</h3>
        </div>
        <ol className="permission-guide-steps">
          {steps.map((step, i) => (
            <li key={i}>{step.text}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}
