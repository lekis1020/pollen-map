import { useEffect, useRef, useState, useCallback } from 'react';
import { getAllergenInfo, getAllergenLevel, getPollenSeasonText, ALLERGEN_LEVELS } from '../data/allergenDatabase';
import Legend from './Legend';
import './Map.css';

const MARKER_CAP = 2000;

// 균등 샘플링: 전체 배열에서 cap개를 고르게 추출
function sampleEven(arr, cap) {
  if (arr.length <= cap) return arr;
  const step = arr.length / cap;
  const out = new Array(cap);
  for (let i = 0; i < cap; i++) out[i] = arr[Math.floor(i * step)];
  return out;
}

export default function Map({ data, onStreetViewClick }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const clusterRef = useRef(null);
  const infoWindowRef = useRef(null);
  const idleDebounceRef = useRef(null);
  const [bounds, setBounds] = useState(null);
  const [mapReady, setMapReady] = useState(false);

  // Build info window HTML for a tree item
  const buildInfoContent = useCallback((item) => {
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
    if (item.institution) {
      rows += `
      <tr><td class="popup-label">관리기관</td><td>${item.institution}</td></tr>`;
    }

    return `<div class="tree-popup">
      <h3>${item.locationName || item.roadName}</h3>
      <table><tbody>${rows}</tbody></table>
      <button class="street-view-btn" id="naver-sv-btn">로드뷰 보기</button>
    </div>`;
  }, []);

  // Initialize Naver Map (with polling for script load)
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

  // Update markers when data changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.naver?.maps) return;

    // Clear old cluster first, then markers
    if (clusterRef.current) {
      try { clusterRef.current.setMap(null); } catch {}
      clusterRef.current = null;
    }
    markersRef.current.forEach((m) => { try { m.setMap(null); } catch {} });
    markersRef.current = [];
    if (infoWindowRef.current) {
      try { infoWindowRef.current.close(); } catch {}
    }

    // 뷰포트 기반 필터 + 마커 상한 (렌더 성능 보호)
    const inBounds = bounds
      ? data.filter((it) =>
          it.latitude >= bounds.minLat &&
          it.latitude <= bounds.maxLat &&
          it.longitude >= bounds.minLng &&
          it.longitude <= bounds.maxLng
        )
      : data;
    const visible = sampleEven(inBounds, MARKER_CAP);

    // Create markers
    const markers = visible.map((item) => {
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
          content: buildInfoContent(item),
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

    // Clustering - defer to next tick for DOM stability
    const clusterTimeout = setTimeout(() => {
      if (window.MarkerClustering) {
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
            map: map,
            markers: markers,
            disableClickZoom: false,
            gridSize: 60,
            icons: icons,
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
          // Clustering failed - show markers directly
          markers.forEach((m) => m.setMap(map));
        }
      } else {
        markers.forEach((m) => m.setMap(map));
      }
    }, 200);

    return () => {
      clearTimeout(clusterTimeout);
      markersRef.current.forEach((m) => { try { m.setMap(null); } catch {} });
      if (clusterRef.current) {
        try { clusterRef.current.setMap(null); } catch {}
        clusterRef.current = null;
      }
    };
  }, [data, bounds, onStreetViewClick, buildInfoContent, mapReady]);

  return (
    <div className="map-wrapper">
      <div ref={mapRef} className="map-container" />
      <Legend />
    </div>
  );
}
