import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { getAllergenInfo, getAllergenLevel, getPollenSeasonText, ALLERGEN_LEVELS } from '../data/allergenDatabase';
import { groupByRoadSpecies } from '../utils/groupByRoad';
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
  const [bounds, setBounds] = useState(null);
  const [mapReady, setMapReady] = useState(false);

  // 데이터 변경 시 도로·수종 단위로 그룹화 (폴리라인 + 잔여 마커)
  const grouped = useMemo(() => groupByRoadSpecies(data), [data]);

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
      <Legend />
    </div>
  );
}
