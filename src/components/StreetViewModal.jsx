import { useEffect, useRef, useState, useCallback } from 'react';
import { compareTimeline, compareRoadName } from '../utils/roadviewCheck.js';
import { naverPanoramaUrl } from '../utils/naverLinks.js';
import './StreetViewModal.css';

// 로드뷰가 없을 때 위성 지도의 기본 배율. 건물 하나가 아니라 블록이 보이는 수준.
const FALLBACK_ZOOM = 17;

const EARTH_RADIUS_M = 6371000;
function haversineMeters(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

const ICONS = {
  check: (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 10.5l3.2 3.2L15.5 6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  alert: (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 6v4.5M10 13.5v.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 3.5L17 16H3L10 3.5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M10 8.5v3M10 14v.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  spinner: (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="sv-icon-spin">
      <path d="M10 2.5a7.5 7.5 0 017.5 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  external: (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M11.5 4.5h4v4M15 5l-7 7M9 4.5H5.5A1.5 1.5 0 004 6v8.5A1.5 1.5 0 005.5 16H14a1.5 1.5 0 001.5-1.5V11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  layer: (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 3l7 4-7 4-7-4 7-4zM3 13l7 4 7-4M3 10l7 4 7-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  tree: (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 2.5c2.8 0 5 2 5 4.6 0 1.2-.5 2.2-1.2 3 .8.7 1.2 1.6 1.2 2.7 0 2-2 3.5-4.5 3.5h-1c-2.5 0-4.5-1.5-4.5-3.5 0-1 .4-2 1.2-2.7C5.5 9.3 5 8.3 5 7.1 5 4.5 7.2 2.5 10 2.5z" fill="currentColor"/>
      <path d="M10 15v2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  pin: (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 2.5c3 0 5.5 2.4 5.5 5.4 0 4-5.5 9.6-5.5 9.6S4.5 11.9 4.5 7.9C4.5 4.9 7 2.5 10 2.5z" fill="currentColor"/>
      <circle cx="10" cy="7.8" r="2" fill="#fff"/>
    </svg>
  ),
};

export default function StreetViewModal({ treeData, onClose }) {
  const panoramaRef = useRef(null);
  const containerRef = useRef(null);
  const miniMapRef = useRef(null);
  const miniMapContainerRef = useRef(null);
  const [error, setError] = useState(null);
  const [actualPosition, setActualPosition] = useState(null);
  const [distanceMeters, setDistanceMeters] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapType, setMapType] = useState('normal'); // 'normal' | 'hybrid'
  // 파노라마 메타데이터. 이미지는 취득·저장하지 않고 이것만 화면에서 1회 사용한다.
  const [panoMeta, setPanoMeta] = useState(null); // { panoId, address, photodate, pov }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // 네이버 파노라마 초기화
  useEffect(() => {
    if (!containerRef.current) return;

    if (!window.naver || !window.naver.maps) {
      setError('네이버 지도 API를 불러올 수 없습니다.');
      setLoading(false);
      return;
    }

    setError(null);
    setActualPosition(null);
    setDistanceMeters(null);
    setPanoMeta(null);
    setLoading(true);

    const midLat = treeData.latitude;
    const midLng = treeData.longitude;
    // 중심점 + 4방향 50m + 4방향 150m 오프셋으로 후보 확장.
    // 도로/가로수 좌표가 약간 어긋난 경우 인근 로드뷰를 잡아낸다.
    const lat50 = 50 / 111000;
    const lng50 = 50 / (111000 * Math.cos((midLat * Math.PI) / 180));
    const lat150 = lat50 * 3;
    const lng150 = lng50 * 3;
    const candidates = [
      { lat: midLat, lng: midLng, label: '중심점' },
      { lat: midLat + lat50, lng: midLng, label: '북 50m' },
      { lat: midLat - lat50, lng: midLng, label: '남 50m' },
      { lat: midLat, lng: midLng + lng50, label: '동 50m' },
      { lat: midLat, lng: midLng - lng50, label: '서 50m' },
      { lat: midLat + lat150, lng: midLng + lng150, label: '북동 150m' },
      { lat: midLat - lat150, lng: midLng + lng150, label: '남동 150m' },
      { lat: midLat + lat150, lng: midLng - lng150, label: '북서 150m' },
      { lat: midLat - lat150, lng: midLng - lng150, label: '남서 150m' },
    ];

    let candidateIndex = 0;
    let currentTimeout = null;

    function tryCandidate() {
      if (candidateIndex >= candidates.length) {
        setError('이 가로수길 구간에서 로드뷰를 사용할 수 없습니다.');
        setLoading(false);
        return;
      }

      const c = candidates[candidateIndex];
      const position = new window.naver.maps.LatLng(c.lat, c.lng);

      try {
        const panorama = new window.naver.maps.Panorama(containerRef.current, {
          position: position,
          pov: { pan: 0, tilt: 0, fov: 100 },
        });
        panoramaRef.current = panorama;

        let resolved = false;

        window.naver.maps.Event.addListener(panorama, 'pano_changed', () => {
          if (resolved) return;
          resolved = true;
          clearTimeout(currentTimeout);
          try {
            const panoPos = panorama.getPosition();
            if (panoPos) {
              const panoLat = panoPos.lat();
              const panoLng = panoPos.lng();
              setActualPosition({ lat: panoLat, lng: panoLng });
              const dist = haversineMeters(midLat, midLng, panoLat, panoLng);
              setDistanceMeters(Math.round(dist));
            }
            // 촬영일자·주소는 데이터와 대조하는 데 쓴다.
            // 이미지가 아니라 메타데이터이며, 저장하지 않고 이 화면에서만 쓴다.
            const loc = typeof panorama.getLocation === 'function'
              ? panorama.getLocation()
              : null;
            if (loc) {
              setPanoMeta({
                panoId: loc.panoId || null,
                address: loc.address || loc.title || null,
                photodate: loc.photodate || null,
                // 새 창 링크의 기본 시점. 클릭 시점의 시점은 아래에서 다시 읽는다.
                pov: typeof panorama.getPov === 'function' ? panorama.getPov() : null,
              });
            }
          } catch {
            /* keep panorama visible */
          }
          setLoading(false);
        });

        const onFail = () => {
          if (resolved) return;
          resolved = true;
          clearTimeout(currentTimeout);
          candidateIndex++;
          tryCandidate();
        };

        window.naver.maps.Event.addListener(panorama, 'error', onFail);
        window.naver.maps.Event.addListener(panorama, 'pano_status', (status) => {
          if (status !== 'OK') onFail();
        });

        // 첫 후보는 3초, 이후는 1.2초씩 빠르게 진행 (총 ~13초 상한)
        currentTimeout = setTimeout(onFail, candidateIndex === 0 ? 3000 : 1200);
      } catch {
        candidateIndex++;
        tryCandidate();
      }
    }

    tryCandidate();

    return () => {
      clearTimeout(currentTimeout);
      panoramaRef.current = null;
    };
  }, [treeData]);

  // 미니맵
  useEffect(() => {
    if (!miniMapContainerRef.current || !window.naver?.maps) return;
    if (loading) return;

    const nMaps = window.naver.maps;
    const treePos = new nMaps.LatLng(treeData.latitude, treeData.longitude);

    const allLats = [treeData.latitude];
    const allLngs = [treeData.longitude];
    if (actualPosition) { allLats.push(actualPosition.lat); allLngs.push(actualPosition.lng); }

    const bounds = new nMaps.LatLngBounds(
      new nMaps.LatLng(Math.min(...allLats), Math.min(...allLngs)),
      new nMaps.LatLng(Math.max(...allLats), Math.max(...allLngs))
    );

    const map = new nMaps.Map(miniMapContainerRef.current, {
      center: bounds.getCenter(),
      zoom: 17,
      mapTypeId: mapType === 'hybrid' ? nMaps.MapTypeId.HYBRID : nMaps.MapTypeId.NORMAL,
      draggable: true,
      scrollWheel: true,
      zoomControl: true,
      zoomControlOptions: {
        position: nMaps.Position.TOP_RIGHT,
        style: nMaps.ZoomControlStyle.SMALL,
      },
    });
    miniMapRef.current = map;
    // 로드뷰가 없으면 좌표가 가로수 한 점뿐이다. 그 bounds로 fitBounds를 부르면
    // 최대 배율까지 파고들어 주변이 아무것도 안 보인다.
    if (actualPosition) {
      map.fitBounds(bounds, { top: 36, right: 36, bottom: 36, left: 36 });
    } else {
      map.setCenter(treePos);
      map.setZoom(FALLBACK_ZOOM);
    }

    new nMaps.Marker({
      position: treePos, map,
      icon: {
        content: '<div class="sv-mini-pin sv-mini-pin-tree" aria-label="가로수 위치"><span></span></div>',
        anchor: new nMaps.Point(10, 10),
      },
      title: '가로수 위치',
    });

    if (actualPosition && !error) {
      const panoPos = new nMaps.LatLng(actualPosition.lat, actualPosition.lng);
      new nMaps.Marker({
        position: panoPos, map,
        icon: {
          content: '<div class="sv-mini-pin sv-mini-pin-pano" aria-label="로드뷰 위치"><span></span></div>',
          anchor: new nMaps.Point(9, 9),
        },
        title: '로드뷰 위치',
      });

      new nMaps.Polyline({
        map, path: [treePos, panoPos],
        strokeColor: '#0F766E', strokeOpacity: 0.55, strokeWeight: 2, strokeStyle: 'shortdash',
      });
    }

    return () => { miniMapRef.current = null; };
  }, [actualPosition, error, loading, treeData, mapType]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  // 로드뷰가 없을 때는 위성이 기본이다 — 지형·건물이 보이는 쪽이 쓸모 있다.
  // 한 번만 밀어주고, 이후 일반/위성 선택은 사용자에게 맡긴다.
  useEffect(() => {
    if (error) setMapType('hybrid');
  }, [error]);

  const toggleMapType = useCallback(() => {
    setMapType((t) => (t === 'normal' ? 'hybrid' : 'normal'));
  }, []);

  const timeline = compareTimeline({
    photodate: panoMeta?.photodate,
    referenceDate: treeData.referenceDate,
  });
  const roadMatch = compareRoadName({
    roadName: treeData.roadName,
    address: panoMeta?.address,
  });

  // 검증 상태
  const getVerification = () => {
    if (error) return { label: '로드뷰 미지원', tone: 'danger', icon: ICONS.alert };
    if (loading || distanceMeters === null) return { label: '위치 확인 중', tone: 'pending', icon: ICONS.spinner };
    if (distanceMeters < 50) return { label: '위치 일치', tone: 'success', icon: ICONS.check };
    if (distanceMeters < 200) return { label: '검증 필요', tone: 'warning', icon: ICONS.warning };
    return { label: '위치 불일치', tone: 'danger', icon: ICONS.alert };
  };

  const verification = getVerification();

  const getInfoBar = () => {
    if (loading) {
      return { tone: 'pending', icon: ICONS.spinner, text: '로드뷰를 불러오는 중입니다…' };
    }
    if (error) {
      return {
        tone: 'danger',
        icon: ICONS.alert,
        text: '반경 300m 내에 촬영된 로드뷰가 없습니다. 위성 지도로 대신 보여드립니다.',
      };
    }
    if (distanceMeters === null) {
      return { tone: 'pending', icon: ICONS.spinner, text: '로드뷰 촬영 위치를 확인하는 중입니다…' };
    }
    if (distanceMeters < 50) {
      return {
        tone: 'success',
        icon: ICONS.check,
        text: `로드뷰가 가로수 위치와 일치합니다. (오차 ${distanceMeters}m)`,
      };
    }
    return {
      tone: 'warning',
      icon: ICONS.warning,
      text: `로드뷰 촬영 위치가 가로수에서 약 ${distanceMeters.toLocaleString()}m 떨어져 있습니다. 미니맵에서 실제 위치를 확인하세요.`,
    };
  };

  const infoBar = getInfoBar();
  const naverSatelliteUrl = `https://map.naver.com/p?c=${treeData.longitude},${treeData.latitude},16,0,0,0,sw`;

  // 이 모달 안의 파노라마를 네이버 지도에서 그대로 이어 보는 링크.
  // panoId가 있어야 특정 파노라마를 지정할 수 있어서, 못 얻으면 링크를 띄우지 않는다.
  const buildExternalUrl = (pov) =>
    naverPanoramaUrl({
      panoId: panoMeta?.panoId,
      lat: actualPosition?.lat,
      lng: actualPosition?.lng,
      ...(pov ?? {}),
    });
  const externalPanoUrl = error ? null : buildExternalUrl(panoMeta?.pov);

  // href는 로드뷰가 처음 잡혔을 때의 시점이라 가운데클릭·복사에도 쓸 수 있게 남겨둔다.
  // 다만 사용자가 화면을 돌려봤다면 그 방향으로 이어 봐야 하므로,
  // 실제 클릭에서는 지금 보고 있는 시점을 다시 읽어 연다.
  const handleOpenExternal = (e) => {
    const pano = panoramaRef.current;
    if (!pano || typeof pano.getPov !== 'function') return;
    let live = null;
    try {
      live = buildExternalUrl(pano.getPov());
    } catch {
      return;
    }
    if (!live || live === e.currentTarget.href) return;
    e.preventDefault();
    window.open(live, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="street-view-overlay" onClick={handleBackdropClick} role="presentation">
      <div
        className="street-view-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sv-modal-title"
      >
        <header className="street-view-header">
          <div className="street-view-title">
            <div className="sv-title-row">
              <h3 id="sv-modal-title">{treeData.roadName}</h3>
              <span
                className={`sv-badge sv-badge--${verification.tone}`}
                aria-label={`검증 상태: ${verification.label}`}
              >
                <span className="sv-badge-icon" aria-hidden="true">{verification.icon}</span>
                {verification.label}
              </span>
            </div>
            <div className="sv-meta-row">
              <span className="sv-meta-chip">
                <span className="sv-meta-label">지역</span>
                <span className="sv-meta-value">{treeData.city} {treeData.district}</span>
              </span>
              <span className="sv-meta-divider" aria-hidden="true" />
              <span className="sv-meta-chip">
                <span className="sv-meta-label">수종</span>
                <span className="sv-meta-value">{treeData.species}</span>
              </span>
              {distanceMeters !== null && !error && (
                <>
                  <span className="sv-meta-divider" aria-hidden="true" />
                  <span className="sv-meta-chip sv-meta-chip--accent">
                    <span className="sv-meta-label">오차</span>
                    <span className="sv-meta-value">{distanceMeters.toLocaleString()}m</span>
                  </span>
                </>
              )}
              {timeline?.pano && (
                <>
                  <span className="sv-meta-divider" aria-hidden="true" />
                  <span className="sv-meta-chip">
                    <span className="sv-meta-label">로드뷰 촬영</span>
                    <span className="sv-meta-value">{timeline.pano}</span>
                  </span>
                </>
              )}
              {timeline?.data && (
                <>
                  <span className="sv-meta-divider" aria-hidden="true" />
                  <span className="sv-meta-chip">
                    <span className="sv-meta-label">데이터 기준</span>
                    <span className="sv-meta-value">{timeline.data}</span>
                  </span>
                </>
              )}
            </div>
            <p className="sv-source-hint">
              {treeData.institution
                ? <>출처: {treeData.institution} · 도로명은 등록 원본 그대로 표시되며 일부 오기재가 있을 수 있습니다.</>
                : '도로명은 공공데이터 원본 그대로 표시되며 일부 오기재가 있을 수 있습니다.'}
            </p>
          </div>
          <button
            type="button"
            className="street-view-close"
            onClick={onClose}
            aria-label="모달 닫기"
          >
            {ICONS.close}
          </button>
        </header>

        <div className="street-view-content">
          {loading && (
            <div className="street-view-loading street-view-loading-overlay" role="status" aria-live="polite">
              <div className="street-view-spinner" aria-hidden="true" />
              <p className="sv-loading-title">로드뷰를 불러오는 중</p>
              <p className="sv-loading-sub">네이버 파노라마 서버에 연결하고 있습니다.</p>
            </div>
          )}

          <div className={`street-view-split${error ? ' sv-split--fallback' : ''}`}>
            <div
              className="street-view-panorama"
              ref={containerRef}
              style={error ? { display: 'none' } : undefined}
            />

            {error && (
              /*
                지도가 주인공이므로 카드는 지도 위 오버레이로 내려앉는다.
                컨테이너는 pointer-events: none이라 카드 밖은 그대로 지도를
                끌 수 있고, 카드만 클릭을 받는다.
              */
              <div className="street-view-fallback">
                <div className="sv-fallback-card">
                  <div className="sv-fallback-icon" aria-hidden="true">{ICONS.alert}</div>
                  <h4>로드뷰가 제공되지 않는 위치입니다</h4>
                  <p className="sv-fallback-desc">
                    주변 8방향(약 50–150m)까지 찾았지만 촬영된 로드뷰가 없습니다.
                    위성 지도로 주변을 확인하세요.
                  </p>
                  <dl className="sv-fallback-coords">
                    <dt>좌표</dt>
                    <dd>{treeData.latitude.toFixed(5)}, {treeData.longitude.toFixed(5)}</dd>
                  </dl>
                  <div className="sv-fallback-actions">
                    {/* 일반/위성 전환은 이제 화면 안 토글이 하므로 '일반 지도' 링크는 뺐다. */}
                    <a
                      className="sv-fallback-cta"
                      href={naverSatelliteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span>네이버 지도에서 열기</span>
                      <span className="sv-cta-icon" aria-hidden="true">{ICONS.external}</span>
                    </a>
                    <button
                      type="button"
                      className="sv-fallback-secondary"
                      onClick={() => {
                        navigator.clipboard?.writeText(`${treeData.latitude}, ${treeData.longitude}`);
                      }}
                    >
                      좌표 복사
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 폴백에서는 이 지도가 미니맵이 아니라 화면의 본체다. */}
            <aside
              className="street-view-minimap-wrapper"
              aria-label={error ? '위성 지도' : '미니맵'}
            >
              <div className="street-view-minimap-header">
                <div className="sv-mini-legend">
                  <span className="sv-mini-legend-item">
                    <span className="sv-legend-dot sv-legend-dot-tree" aria-hidden="true" />
                    가로수
                  </span>
                  {!error && actualPosition && (
                    <span className="sv-mini-legend-item">
                      <span className="sv-legend-dot sv-legend-dot-pano" aria-hidden="true" />
                      로드뷰 촬영점
                    </span>
                  )}
                </div>
                {(
                  <button
                    type="button"
                    className="sv-mini-toggle"
                    onClick={toggleMapType}
                    aria-pressed={mapType === 'hybrid'}
                    title={mapType === 'hybrid' ? '일반 지도로 보기' : '위성 지도로 보기'}
                  >
                    <span className="sv-mini-toggle-icon" aria-hidden="true">{ICONS.layer}</span>
                    {mapType === 'hybrid' ? '일반' : '위성'}
                  </button>
                )}
              </div>
              <div className="street-view-minimap" ref={miniMapContainerRef} />
            </aside>
          </div>
        </div>

        {(timeline?.note || roadMatch.address) && (
          <div className="sv-cross-check">
            {roadMatch.state === 'mismatch' && (
              <p className="sv-cross-check-item sv-cross-check-item--warn">
                데이터의 도로명은 <strong>{roadMatch.road}</strong>인데 로드뷰 지점의
                주소는 <strong>{roadMatch.address}</strong>입니다.
                등록 원본의 도로명이 실제와 다를 수 있습니다.
              </p>
            )}
            {roadMatch.state !== 'mismatch' && roadMatch.address && (
              <p className="sv-cross-check-item">
                로드뷰 지점 주소: <strong>{roadMatch.address}</strong>
              </p>
            )}
            {timeline?.note && <p className="sv-cross-check-item">{timeline.note}</p>}
          </div>
        )}

        <div className={`street-view-info-bar sv-info-bar--${infoBar.tone}`}>
          {/* 링크는 상태 문구가 아니므로 aria-live 영역 밖에 둔다 */}
          <span className="sv-info-status" role="status" aria-live="polite">
            <span className="sv-info-icon" aria-hidden="true">{infoBar.icon}</span>
            <span className="sv-info-text">{infoBar.text}</span>
          </span>
          {externalPanoUrl && (
            <a
              className="sv-info-external"
              href={externalPanoUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleOpenExternal}
              title="지금 보고 있는 지점·방향 그대로 네이버 지도에서 엽니다"
            >
              <span>네이버 지도에서 보기</span>
              <span className="sv-cta-icon" aria-hidden="true">{ICONS.external}</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
