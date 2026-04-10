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
    setLoading(true);

    try {
      const position = new window.naver.maps.LatLng(treeData.latitude, treeData.longitude);
      const panorama = new window.naver.maps.Panorama(containerRef.current, {
        position: position,
        pov: { pan: 0, tilt: 0, fov: 100 },
      });
      panoramaRef.current = panorama;

      // 파노라마 위치 변경 시 실제 위치와 거리 계산
      window.naver.maps.Event.addListener(panorama, 'pano_changed', () => {
        const panoPos = panorama.getPosition();
        if (panoPos) {
          setActualPosition({ lat: panoPos.lat(), lng: panoPos.lng() });
          const dist = position.distanceTo(panoPos);
          setDistanceMeters(Math.round(dist));
          setLoading(false);
        }
      });

      // 로드뷰를 사용할 수 없는 위치 감지
      window.naver.maps.Event.addListener(panorama, 'error', () => {
        setError('이 위치의 로드뷰를 사용할 수 없습니다.');
        setLoading(false);
      });

      window.naver.maps.Event.addListener(panorama, 'pano_status', (status) => {
        if (status !== 'OK') {
          setError('이 위치의 로드뷰를 사용할 수 없습니다.');
          setLoading(false);
        }
      });

      // 5초 타임아웃 - 응답 없으면 미지원으로 처리
      const timeout = setTimeout(() => {
        setLoading((prev) => {
          if (prev) {
            setError('이 위치의 로드뷰를 사용할 수 없습니다.');
            return false;
          }
          return prev;
        });
      }, 5000);

      return () => {
        clearTimeout(timeout);
        panoramaRef.current = null;
      };
    } catch {
      setError('로드뷰를 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    }
  }, [treeData.latitude, treeData.longitude]);

  // 미니맵 (파노라마 성공 시 비교 지도 / 실패 시 위치 확인 지도)
  useEffect(() => {
    if (!miniMapContainerRef.current || !window.naver?.maps) return;
    if (loading) return;

    const treePos = new window.naver.maps.LatLng(treeData.latitude, treeData.longitude);

    if (error) {
      // 파노라마 실패: 위성/지도뷰로 해당 위치 표시
      const map = new window.naver.maps.Map(miniMapContainerRef.current, {
        center: treePos,
        zoom: 17,
        mapTypeId: window.naver.maps.MapTypeId.HYBRID,
        draggable: true,
        scrollWheel: true,
        zoomControl: true,
        zoomControlOptions: {
          position: window.naver.maps.Position.TOP_RIGHT,
          style: window.naver.maps.ZoomControlStyle.SMALL,
        },
      });
      miniMapRef.current = map;

      // 나무 위치 마커
      new window.naver.maps.Marker({
        position: treePos,
        map: map,
        icon: {
          content: `<div style="
            width: 16px; height: 16px;
            background: #2ecc71; border: 2.5px solid #fff;
            border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          "></div>`,
          anchor: new window.naver.maps.Point(10, 10),
        },
        title: '가로수 위치',
      });

      return () => { miniMapRef.current = null; };
    }

    if (!actualPosition) return;

    // 파노라마 성공: 나무 위치 vs 로드뷰 위치 비교
    const panoPos = new window.naver.maps.LatLng(actualPosition.lat, actualPosition.lng);
    const bounds = new window.naver.maps.LatLngBounds(
      new window.naver.maps.LatLng(
        Math.min(treeData.latitude, actualPosition.lat),
        Math.min(treeData.longitude, actualPosition.lng)
      ),
      new window.naver.maps.LatLng(
        Math.max(treeData.latitude, actualPosition.lat),
        Math.max(treeData.longitude, actualPosition.lng)
      )
    );

    const map = new window.naver.maps.Map(miniMapContainerRef.current, {
      center: bounds.getCenter(),
      zoom: 17,
      draggable: true,
      scrollWheel: true,
      zoomControl: true,
      zoomControlOptions: {
        position: window.naver.maps.Position.TOP_RIGHT,
        style: window.naver.maps.ZoomControlStyle.SMALL,
      },
    });
    miniMapRef.current = map;

    map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });

    // 나무 위치 마커 (초록색)
    new window.naver.maps.Marker({
      position: treePos,
      map: map,
      icon: {
        content: `<div style="
          width: 12px; height: 12px;
          background: #2ecc71; border: 2px solid #fff;
          border-radius: 50%; box-shadow: 0 1px 4px rgba(0,0,0,0.3);
        "></div>`,
        anchor: new window.naver.maps.Point(8, 8),
      },
      title: '나무 위치',
    });

    // 로드뷰 촬영 위치 마커 (파란색)
    new window.naver.maps.Marker({
      position: panoPos,
      map: map,
      icon: {
        content: `<div style="
          width: 12px; height: 12px;
          background: #3498db; border: 2px solid #fff;
          border-radius: 50%; box-shadow: 0 1px 4px rgba(0,0,0,0.3);
        "></div>`,
        anchor: new window.naver.maps.Point(8, 8),
      },
      title: '로드뷰 위치',
    });

    // 두 지점 연결선
    new window.naver.maps.Polyline({
      map: map,
      path: [treePos, panoPos],
      strokeColor: '#e74c3c',
      strokeOpacity: 0.6,
      strokeWeight: 2,
      strokeStyle: 'shortdash',
    });

    return () => { miniMapRef.current = null; };
  }, [actualPosition, error, loading, treeData.latitude, treeData.longitude]);

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
                {error ? (
                  <span className="minimap-legend-item">
                    <span className="minimap-dot minimap-dot-tree" />가로수 위치 (위성지도)
                  </span>
                ) : (
                  <>
                    <span className="minimap-legend-item">
                      <span className="minimap-dot minimap-dot-tree" />나무
                    </span>
                    <span className="minimap-legend-item">
                      <span className="minimap-dot minimap-dot-pano" />로드뷰
                    </span>
                  </>
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
