import { useEffect, useRef, useState, useCallback } from 'react';
import { getAllergenInfos, getPollenSeasonText, ALLERGEN_LEVELS } from '../data/allergenDatabase';
import { FLAG_LABEL } from '../utils/qualityFlags';
import { useGeolocation } from '../hooks/useGeolocation.js';
import Legend from './Legend';
import './Map.css';

const MARKER_CAP = 2000;
const POLYLINE_CAP = 1500;

// 팝업은 문자열 HTML로 조립되므로 데이터 값은 반드시 이스케이프한다.
// 공공데이터 원본 문자열이 그대로 들어오는 자리다.
const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

// 레코드에서 알레르기 판정 대상 수종 목록을 뽑는다.
// speciesList가 있으면 정규화·분해된 결과를, 없으면 원본 단일 값을 쓴다.
function speciesOf(item) {
  if (item.speciesList?.length) return item.speciesList;
  return item.species ? [item.species] : [];
}

// 레코드의 알레르기 등급은 포함된 수종 중 최댓값이다.
// "은행나무+이팝나무"처럼 여러 종이 있으면 가장 위험한 쪽을 기준으로 표시한다.
function maxAllergenLevel(item) {
  const matches = getAllergenInfos(speciesOf(item));
  return Math.max(0, ...matches.map((m) => (m.info ? m.info.level : 0)));
}

// 팝업의 알레르기 관련 행을 만든다. 네 종류 팝업이 공유한다.
// 복수 수종이면 모든 종의 꽃가루 시기·증상을 병기한다 —
// 예전에는 첫 매칭 하나만 보여줘서 두 번째 이후 종 정보가 소실됐다.
function buildAllergenRows(item, { withSymptoms = true } = {}) {
  const matches = getAllergenInfos(speciesOf(item));
  const level = Math.max(0, ...matches.map((m) => (m.info ? m.info.level : 0)));
  const levelInfo = ALLERGEN_LEVELS[level];

  let rows = `
      <tr><td class="popup-label">알레르기 등급</td><td><span class="allergen-badge" style="background:${levelInfo.color}">${escapeHtml(levelInfo.label)}</span></td></tr>`;

  const multi = matches.filter((m) => m.info).length > 1;
  for (const match of matches) {
    if (!match.info) continue;
    const inferred = match.matchType === 'inferred'
      ? `<span class="popup-inferred">${escapeHtml(match.info.name)} 기준 추정</span>`
      : '';
    const label = multi
      ? `${escapeHtml(match.species)} 꽃가루 시기`
      : '꽃가루 시기';
    rows += `
      <tr><td class="popup-label">${label}</td><td>${escapeHtml(getPollenSeasonText(match.info.pollenMonths))} ${inferred}</td></tr>`;
    if (withSymptoms) {
      rows += `
      <tr><td class="popup-label">주요 증상</td><td class="popup-symptoms">${escapeHtml(match.info.symptoms)}</td></tr>`;
    }
  }
  return rows;
}

// 품질 플래그가 있으면 근거와 함께 경고 블록을 만든다.
// 원본을 고칠 권한이 없으므로, 고치는 대신 무엇이 의심스러운지 밝힌다.
function buildQualityNote(item) {
  const flags = item.qualityFlags || [];
  const corrected = item.coordCorrected;
  if (!flags.length && !corrected) return '';

  let inner = '';
  if (flags.length) {
    const lines = flags.map((f) => `<li>${escapeHtml(FLAG_LABEL[f] || f)}</li>`).join('');
    inner += `<strong>이 기록에서 확인된 문제</strong><ul>${lines}</ul>`;
  }
  if (corrected) {
    inner += '<p class="popup-quality-fixed">좌표에 한 자리 오타가 있어 보정해 표시했습니다.</p>';
  }
  return `<div class="popup-quality-note">${inner}</div>`;
}

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
  const geo = useGeolocation(); // 좌표 획득(1차 시도)은 훅에 위임; 마커 렌더는 Map이 소유

  // 위치 마커를 지도에 표시하는 공통 함수
  const placeLocationMarker = useCallback((lat, lng, accuracy, zoomTo, approximate = false) => {
    const map = mapInstanceRef.current;
    if (!map || !window.naver?.maps) return;

    const latlng = new window.naver.maps.LatLng(lat, lng);

    if (locationMarkerRef.current) locationMarkerRef.current.setMap(null);
    if (locationCircleRef.current) locationCircleRef.current.setMap(null);

    const color = approximate ? '#E67E22' : '#4A90D9';
    const radiusCap = approximate ? 8000 : 3000;

    if (accuracy > 0) {
      locationCircleRef.current = new window.naver.maps.Circle({
        map, center: latlng,
        radius: Math.min(accuracy, radiusCap),
        fillColor: color, fillOpacity: 0.1,
        strokeColor: color, strokeOpacity: 0.25, strokeWeight: 1,
        clickable: false,
      });
    }

    const markerClass = approximate ? 'gps-location-marker approximate' : 'gps-location-marker';
    locationMarkerRef.current = new window.naver.maps.Marker({
      position: latlng, map,
      icon: {
        content: `<div class="${markerClass}"><div class="gps-dot"></div><div class="gps-pulse"></div></div>`,
        anchor: new window.naver.maps.Point(18, 18),
      },
      zIndex: 1000,
    });

    map.setCenter(latlng);
    if (zoomTo) map.setZoom(zoomTo);
    setGpsState('active');
  }, []);

  // IP 기반 대략 위치 fallback — 여러 제공자 병렬 호출 후 consensus 산출
  const tryIpFallback = useCallback(async () => {
    const PROVIDERS = [
      {
        url: 'https://ipapi.co/json/',
        parse: (d) => ({ lat: +d.latitude, lng: +d.longitude, city: d.city, region: d.region }),
      },
      {
        url: 'https://ipwho.is/',
        parse: (d) => (d.success === false ? null : { lat: +d.latitude, lng: +d.longitude, city: d.city, region: d.region }),
      },
      {
        url: 'https://get.geojs.io/v1/ip/geo.json',
        parse: (d) => ({ lat: +d.latitude, lng: +d.longitude, city: d.city, region: d.region }),
      },
    ];

    const fetchOne = async (p) => {
      const ctrl = AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined;
      const res = await fetch(p.url, { signal: ctrl });
      if (!res.ok) throw new Error(`${res.status}`);
      const r = p.parse(await res.json());
      if (!r || !Number.isFinite(r.lat) || !Number.isFinite(r.lng)) throw new Error('invalid');
      return r;
    };

    const distKm = (a, b) => {
      const R = 6371;
      const toRad = (d) => (d * Math.PI) / 180;
      const dLat = toRad(b.lat - a.lat);
      const dLng = toRad(b.lng - a.lng);
      const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(x));
    };

    const results = (await Promise.allSettled(PROVIDERS.map(fetchOne)))
      .filter((r) => r.status === 'fulfilled')
      .map((r) => r.value);
    if (results.length === 0) return false;

    // consensus: 30km 이내로 모인 결과들의 centroid 사용
    let best = null;
    if (results.length >= 2) {
      for (const anchor of results) {
        const cluster = results.filter((r) => distKm(anchor, r) <= 30);
        if (cluster.length >= 2 && (!best || cluster.length > best.cluster.length)) {
          const avgLat = cluster.reduce((s, r) => s + r.lat, 0) / cluster.length;
          const avgLng = cluster.reduce((s, r) => s + r.lng, 0) / cluster.length;
          best = { cluster, lat: avgLat, lng: avgLng, city: cluster[0].city, region: cluster[0].region };
        }
      }
    }
    if (!best) {
      const single = results.find((r) => r.city) || results[0];
      best = { cluster: [single], ...single };
    }

    placeLocationMarker(best.lat, best.lng, 5000, 11, true);
    const place = [best.city, best.region].filter(Boolean).join(' ') || '대략 위치';
    const sources = best.cluster.length > 1 ? `${best.cluster.length}개 소스 평균` : '단일 소스';
    setGpsError(`GPS 측위 실패 → IP 기반 대략 위치(${place}, ${sources}). 정확한 위치는 지도를 길게 눌러 지정해 주세요.`);
    setTimeout(() => setGpsError(null), 8000);
    return true;
  }, [placeLocationMarker]);

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

  // 권한 변경 감지 리스너 해제용
  const permissionListenerRef = useRef(null);

  // 훅의 1차(고정밀도) 시도 결과 반영 — 성공 시 마커 표시, 실패 시 저정밀도 재시도 → IP fallback
  useEffect(() => {
    if (geo.status === 'ok' && geo.coords) {
      showLocation({ coords: { latitude: geo.coords.lat, longitude: geo.coords.lng, accuracy: geo.accuracy } });
      return;
    }
    if (geo.status === 'denied') {
      setGpsState('error');
      setShowPermissionGuide(true);
      setTimeout(() => setGpsState('idle'), 300);
      return;
    }
    if (geo.status === 'error') {
      // 훅의 1차 시도(고정밀도)가 실패(권한거부 제외) — OS/네트워크 기반 측위가 느린 경우
      // (특히 macOS CoreLocation cold-start) 저정밀도로 재시도
      navigator.geolocation.getCurrentPosition(
        showLocation,
        async (retryErr) => {
          if (retryErr.code === 1) {
            setGpsState('error');
            setShowPermissionGuide(true);
            setTimeout(() => setGpsState('idle'), 300);
            return;
          }
          // 두 번째 재시도도 실패 → IP 기반 대략 위치 fallback
          const ok = await tryIpFallback();
          if (!ok) {
            setGpsState('error');
            if (retryErr.code === 2) {
              setGpsError('위치 서비스를 사용할 수 없습니다. 기기의 위치 서비스가 켜져 있는지 확인해 주세요.');
            } else {
              setGpsError('위치 확인이 오래 걸립니다. 잠시 후 다시 시도해 주세요.');
            }
            setTimeout(() => { setGpsState('idle'); setGpsError(null); }, 5000);
          }
        },
        { enableHighAccuracy: false, timeout: 25000, maximumAge: 0 }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.status]);

  // 실제 위치 요청 — 좌표 획득(1차 고정밀도 시도)은 useGeolocation 훅에 위임
  const performGeolocation = useCallback(() => {
    setGpsState('loading');
    setGpsError(null);
    geo.request();
  }, [geo]);

  // GPS 현재 위치 기능
  const handleGpsClick = useCallback(async () => {
    if (!window.isSecureContext) {
      setGpsState('error');
      setGpsError('위치 서비스는 HTTPS에서만 사용할 수 있습니다.');
      setTimeout(() => { setGpsState('idle'); setGpsError(null); }, 4000);
      return;
    }

    if (!mapInstanceRef.current || !window.naver?.maps) {
      setGpsState('error');
      setGpsError('지도를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.');
      setTimeout(() => { setGpsState('idle'); setGpsError(null); }, 3000);
      return;
    }

    if (!navigator.geolocation) {
      setGpsState('error');
      setGpsError('이 브라우저에서는 위치 서비스를 지원하지 않습니다.');
      setTimeout(() => { setGpsState('idle'); setGpsError(null); }, 3000);
      return;
    }

    // 권한 상태 사전 확인 — denied면 즉시 가이드 표시 + 권한 변경 시 자동 재시도
    if (navigator.permissions?.query) {
      try {
        const status = await navigator.permissions.query({ name: 'geolocation' });
        if (status.state === 'denied') {
          setGpsState('error');
          setShowPermissionGuide(true);
          setTimeout(() => setGpsState('idle'), 300);

          // 사용자가 OS/브라우저 설정에서 권한을 허용하면 자동 재시도
          if (permissionListenerRef.current) {
            permissionListenerRef.current.status.removeEventListener('change', permissionListenerRef.current.fn);
          }
          const fn = () => {
            if (status.state !== 'denied') {
              status.removeEventListener('change', fn);
              permissionListenerRef.current = null;
              setShowPermissionGuide(false);
              performGeolocation();
            }
          };
          status.addEventListener('change', fn);
          permissionListenerRef.current = { status, fn };
          return;
        }
      } catch {
        // Permissions API 미지원/거부 — 정상 흐름으로 진행
      }
    }

    performGeolocation();
  }, [performGeolocation]);

  // 언마운트 시 권한 변경 리스너 정리
  useEffect(() => {
    return () => {
      if (permissionListenerRef.current) {
        permissionListenerRef.current.status.removeEventListener('change', permissionListenerRef.current.fn);
        permissionListenerRef.current = null;
      }
    };
  }, []);

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
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  // Info content for individual tree marker
  const buildMarkerInfo = useCallback((item) => {
    let rows = `
      <tr><td class="popup-label">지역</td><td>${escapeHtml(item.city)} ${escapeHtml(item.district)}</td></tr>`;
    if (item.species) {
      rows += `
      <tr><td class="popup-label">수종</td><td><strong>${escapeHtml(item.species)}</strong></td></tr>`;
    }
    if (item.plantCount > 0) {
      rows += `
      <tr><td class="popup-label">식재본수</td><td>${item.plantCount.toLocaleString()}본</td></tr>`;
    }
    rows += buildAllergenRows(item);

    const sourceNote = item.institution
      ? `<p class="popup-source-note">출처: ${escapeHtml(item.institution)} · 도로명은 등록 원본 그대로 표시되며 일부 오기재가 있을 수 있습니다.</p>`
      : '<p class="popup-source-note">도로명은 공공데이터 원본 그대로 표시되며 일부 오기재가 있을 수 있습니다.</p>';

    return `<div class="tree-popup">
      <div class="tree-popup-header">
        <div class="tree-popup-title">
          <span class="tree-popup-eyebrow">개별 가로수</span>
          <h3>${escapeHtml(item.locationName || item.roadName) || '도로명 미상'}</h3>
        </div>
      </div>
      <table><tbody>${rows}</tbody></table>
      ${buildQualityNote(item)}
      ${sourceNote}
      <button class="street-view-btn" id="naver-sv-btn">로드뷰 보기</button>
    </div>`;
  }, []);

  const buildFamousForestInfo = useCallback((item) => {
    let rows = `
      <tr><td class="popup-label">주소</td><td>${escapeHtml(item.address) || '-'}</td></tr>
      <tr><td class="popup-label">주요 수종</td><td><strong>${escapeHtml(item.species) || '-'}</strong></td></tr>
      <tr><td class="popup-label">면적</td><td>${item.areaHa ? `${item.areaHa.toLocaleString()} ha` : '-'}</td></tr>
      <tr><td class="popup-label">유형·선정</td><td>${escapeHtml(item.type) || '-'}${item.year ? ` · ${escapeHtml(item.year)}` : ''}</td></tr>`;
    rows += buildAllergenRows(item, { withSymptoms: false });
    if (item.management) {
      rows += `
      <tr><td class="popup-label">관리기관</td><td>${escapeHtml(item.management)}</td></tr>`;
    }
    if (item.note) {
      rows += `
      <tr><td class="popup-label">특이사항</td><td>${escapeHtml(item.note)}</td></tr>`;
    }

    return `<div class="tree-popup">
      <div class="tree-popup-header">
        <div class="tree-popup-title">
          <span class="tree-popup-eyebrow">국유림 명품숲</span>
          <h3>${item.locationName}</h3>
        </div>
      </div>
      <table><tbody>${rows}</tbody></table>
      <p class="popup-source-note">출처: 산림청 국유림 명품숲 선정 현황(15038042) · 좌표는 Naver Cloud Geocoding 대표지점입니다.</p>
    </div>`;
  }, []);

  // Info content for polyline (group)
  const buildPolylineInfo = useCallback((pl) => {
    let rows = `
      <tr><td class="popup-label">지역</td><td>${escapeHtml(pl.city)} ${escapeHtml(pl.district)}</td></tr>
      <tr><td class="popup-label">수종</td><td><strong>${escapeHtml(pl.species)}</strong></td></tr>
      <tr><td class="popup-label">구간 그루수</td><td>${pl.count.toLocaleString()}본</td></tr>`;
    rows += buildAllergenRows(pl);

    const inst = pl.representative?.institution;
    const sourceNote = inst
      ? `<p class="popup-source-note">출처: ${escapeHtml(inst)} · 도로명은 등록 원본 그대로 표시되며 일부 오기재가 있을 수 있습니다.</p>`
      : '<p class="popup-source-note">도로명은 공공데이터 원본 그대로 표시되며 일부 오기재가 있을 수 있습니다.</p>';

    return `<div class="tree-popup">
      <div class="tree-popup-header">
        <div class="tree-popup-title">
          <span class="tree-popup-eyebrow">가로수길 구간</span>
          <h3>${escapeHtml(pl.roadName) || '도로명 미상'}</h3>
        </div>
      </div>
      <table><tbody>${rows}</tbody></table>
      ${buildQualityNote(pl.representative || pl)}
      ${sourceNote}
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
      const color = ALLERGEN_LEVELS[maxAllergenLevel(pl)].color;
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
      const color = ALLERGEN_LEVELS[maxAllergenLevel(item)].color;
      const isFamousForest = item.sourceType === 'famousForest';
      const marker = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(item.latitude, item.longitude),
        map: null,
        icon: {
          content: isFamousForest
            ? '<div style="width:22px;height:22px;display:flex;align-items:center;justify-content:center;background:#8e44ad;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.35);cursor:pointer;font-size:13px">♣</div>'
            : `<div style="width:12px;height:12px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.3);cursor:pointer"></div>`,
          anchor: new window.naver.maps.Point(isFamousForest ? 12 : 8, isFamousForest ? 12 : 8),
        },
        title: item.locationName || item.roadName,
      });
      window.naver.maps.Event.addListener(marker, 'click', () => {
        if (infoWindowRef.current) {
          try { infoWindowRef.current.close(); } catch {}
        }
        const infoWindow = new window.naver.maps.InfoWindow({
          content: isFamousForest ? buildFamousForestInfo(item) : buildMarkerInfo(item),
          borderWidth: 0,
          backgroundColor: 'transparent',
          anchorSize: new window.naver.maps.Size(0, 0),
          pixelOffset: new window.naver.maps.Point(0, -10),
        });
        infoWindow.open(map, marker);
        infoWindowRef.current = infoWindow;
        if (!isFamousForest) setTimeout(() => {
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
  }, [grouped, bounds, onStreetViewClick, buildMarkerInfo, buildFamousForestInfo, buildPolylineInfo, mapReady]);

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
