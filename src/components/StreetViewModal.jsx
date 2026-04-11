import { useEffect, useRef, useState } from 'react';
import './StreetViewModal.css';

export default function StreetViewModal({ treeData, onClose }) {
  const panoramaRef = useRef(null);
  const containerRef = useRef(null);
  const miniMapRef = useRef(null);
  const miniMapContainerRef = useRef(null);
  const [error, setError] = useState(null);
  const [actualPosition, setActualPosition] = useState(null);
  const [distanceMeters, setDistanceMeters] = useState(null);
  const [loading, setLoading] = useState(true);

  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // 모달 열린 동안 body 스크롤 방지
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // 네이버 파노라마 초기화 - 시작/중간/끝 좌표를 순차 탐색
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
    setLoading(true);

    // 시도할 좌표 후보 목록: 시작점 → 중간점 → 끝점
    const candidates = [];
    const startLat = treeData.startLat || treeData.latitude;
    const startLng = treeData.startLng || treeData.longitude;
    const endLat = treeData.endLat || treeData.latitude;
    const endLng = treeData.endLng || treeData.longitude;
    const midLat = treeData.latitude;
    const midLng = treeData.longitude;

    candidates.push({ lat: startLat, lng: startLng, label: '시작점' });
    if (midLat !== startLat || midLng !== startLng) {
      candidates.push({ lat: midLat, lng: midLng, label: '중간점' });
    }
    if (endLat !== startLat || endLng !== startLng) {
      candidates.push({ lat: endLat, lng: endLng, label: '끝점' });
    }

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
          const panoPos = panorama.getPosition();
          if (panoPos) {
            setActualPosition({ lat: panoPos.lat(), lng: panoPos.lng() });
            const treeCenter = new window.naver.maps.LatLng(midLat, midLng);
            const dist = treeCenter.distanceTo(panoPos);
            setDistanceMeters(Math.round(dist));
            setLoading(false);
          }
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

        // 3초 타임아웃 후 다음 후보로
        currentTimeout = setTimeout(onFail, 3000);
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

  // 가로수길 구간 좌표 (시작~끝)
  const startPos = treeData.startLat && treeData.startLng
    ? { lat: treeData.startLat, lng: treeData.startLng } : null;
  const endPos = treeData.endLat && treeData.endLng
    ? { lat: treeData.endLat, lng: treeData.endLng } : null;

  // 미니맵에 가로수길 구간 + 로드뷰 위치 표시
  useEffect(() => {
    if (!miniMapContainerRef.current || !window.naver?.maps) return;
    if (loading) return;

    const nMaps = window.naver.maps;
    const treePos = new nMaps.LatLng(treeData.latitude, treeData.longitude);

    // 모든 좌표를 포함하는 bounds 계산
    const allLats = [treeData.latitude];
    const allLngs = [treeData.longitude];
    if (startPos) { allLats.push(startPos.lat); allLngs.push(startPos.lng); }
    if (endPos) { allLats.push(endPos.lat); allLngs.push(endPos.lng); }
    if (actualPosition) { allLats.push(actualPosition.lat); allLngs.push(actualPosition.lng); }

    const bounds = new nMaps.LatLngBounds(
      new nMaps.LatLng(Math.min(...allLats), Math.min(...allLngs)),
      new nMaps.LatLng(Math.max(...allLats), Math.max(...allLngs))
    );

    const map = new nMaps.Map(miniMapContainerRef.current, {
      center: bounds.getCenter(),
      zoom: 17,
      mapTypeId: error ? nMaps.MapTypeId.HYBRID : nMaps.MapTypeId.NORMAL,
      draggable: true,
      scrollWheel: true,
      zoomControl: true,
      zoomControlOptions: {
        position: nMaps.Position.TOP_RIGHT,
        style: nMaps.ZoomControlStyle.SMALL,
      },
    });
    miniMapRef.current = map;
    map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });

    // 가로수길 구간 표시 (초록색 선)
    if (startPos && endPos && (startPos.lat !== endPos.lat || startPos.lng !== endPos.lng)) {
      const startLatLng = new nMaps.LatLng(startPos.lat, startPos.lng);
      const endLatLng = new nMaps.LatLng(endPos.lat, endPos.lng);

      new nMaps.Polyline({
        map, path: [startLatLng, endLatLng],
        strokeColor: '#2ecc71', strokeOpacity: 0.8, strokeWeight: 5,
      });

      // 시작/끝 마커
      [startLatLng, endLatLng].forEach(pos => {
        new nMaps.Marker({
          position: pos, map,
          icon: {
            content: '<div style="width:8px;height:8px;background:#2ecc71;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>',
            anchor: new nMaps.Point(6, 6),
          },
        });
      });
    } else {
      // 단일 지점 마커
      new nMaps.Marker({
        position: treePos, map,
        icon: {
          content: '<div style="width:14px;height:14px;background:#2ecc71;border:2.5px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>',
          anchor: new nMaps.Point(9, 9),
        },
        title: '가로수 위치',
      });
    }

    // 로드뷰 위치 마커 (파란색) - 성공 시만
    if (actualPosition && !error) {
      const panoPos = new nMaps.LatLng(actualPosition.lat, actualPosition.lng);
      new nMaps.Marker({
        position: panoPos, map,
        icon: {
          content: '<div style="width:12px;height:12px;background:#3498db;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>',
          anchor: new nMaps.Point(8, 8),
        },
        title: '로드뷰 위치',
      });

      // 가로수길과 로드뷰 연결선 (빨간 점선)
      new nMaps.Polyline({
        map, path: [treePos, panoPos],
        strokeColor: '#e74c3c', strokeOpacity: 0.6, strokeWeight: 2, strokeStyle: 'shortdash',
      });
    }

    return () => { miniMapRef.current = null; };
  }, [actualPosition, error, loading, treeData, startPos, endPos]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  // 검증 상태 판정
  const getVerificationStatus = () => {
    if (error) return { label: '로드뷰 미지원', color: '#e74c3c', icon: '!' };
    if (distanceMeters === null) return { label: '확인 중', color: '#f39c12', icon: '...' };
    if (distanceMeters < 50) return { label: '위치 일치', color: '#2ecc71', icon: 'O' };
    if (distanceMeters < 200) return { label: '검증 필요', color: '#f39c12', icon: '?' };
    return { label: '위치 불일치', color: '#e74c3c', icon: '!' };
  };

  const getInfoBarContent = () => {
    if (loading) return '로드뷰를 불러오는 중...';
    if (error) {
      return `반경 300m 내 로드뷰가 없습니다. 위성지도에서 가로수 위치를 확인하세요. (${treeData.latitude.toFixed(4)}, ${treeData.longitude.toFixed(4)})`;
    }
    if (distanceMeters === null) return '로드뷰 위치를 확인하는 중...';
    if (distanceMeters < 50) return `로드뷰가 가로수 위치와 일치합니다. (오차: ${distanceMeters}m)`;
    return `로드뷰 촬영 위치가 가로수에서 약 ${distanceMeters.toLocaleString()}m 떨어져 있습니다. 미니맵에서 실제 위치를 확인하세요.`;
  };

  const verification = getVerificationStatus();

  return (
    <div className="street-view-overlay" onClick={handleBackdropClick}>
      <div className="street-view-modal">
        <div className="street-view-header">
          <div className="street-view-title">
            <h3>
              {treeData.roadName}
              <span
                className="verification-badge"
                style={{ background: verification.color }}
              >
                {verification.label}
              </span>
            </h3>
            <span className="street-view-location">
              {treeData.city} {treeData.district} &middot; {treeData.species}
              {distanceMeters !== null && !error && (
                <span className="street-view-distance"> &middot; {distanceMeters}m 오차</span>
              )}
            </span>
          </div>
          <button className="street-view-close" onClick={onClose} aria-label="닫기">
            &times;
          </button>
        </div>
        <div className="street-view-content">
          {loading && (
            <div className="street-view-loading">
              <div className="street-view-spinner" />
              <p>로드뷰를 불러오는 중...</p>
            </div>
          )}
          <div className="street-view-split" style={{ display: loading ? 'none' : 'flex' }}>
            {error ? (
              <div className="street-view-fallback">
                <div className="street-view-fallback-message">
                  <p>이 위치의 로드뷰가 촬영되지 않았습니다.</p>
                  <p className="street-view-fallback-hint">
                    네이버 로드뷰는 주요 도로만 지원하며, 가로수 데이터의 좌표가 도로에서 벗어난 경우 표시되지 않을 수 있습니다.
                  </p>
                  <div className="street-view-coords">
                    좌표: {treeData.latitude.toFixed(4)}, {treeData.longitude.toFixed(4)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="street-view-panorama" ref={containerRef} />
            )}
            <div className="street-view-minimap-wrapper">
              <div className="street-view-minimap-header">
                <span className="minimap-legend-item">
                  <span className="minimap-dot minimap-dot-tree" />가로수길
                </span>
                {!error && actualPosition && (
                  <span className="minimap-legend-item">
                    <span className="minimap-dot minimap-dot-pano" />로드뷰
                  </span>
                )}
              </div>
              <div className="street-view-minimap" ref={miniMapContainerRef} />
            </div>
          </div>
        </div>
        <div className="street-view-info-bar">
          {getInfoBarContent()}
        </div>
      </div>
    </div>
  );
}
