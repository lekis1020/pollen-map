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
      return;
    }

    setError(null);
    setActualPosition(null);
    setDistanceMeters(null);

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
        }
      });

      // 로드뷰를 사용할 수 없는 위치 감지
      window.naver.maps.Event.addListener(panorama, 'error', () => {
        setError('이 위치의 로드뷰를 사용할 수 없습니다.');
      });

      window.naver.maps.Event.addListener(panorama, 'pano_status', (status) => {
        if (status !== 'OK') {
          setError('이 위치의 로드뷰를 사용할 수 없습니다.');
        }
      });
    } catch {
      setError('로드뷰를 불러오는 중 오류가 발생했습니다.');
    }

    return () => {
      panoramaRef.current = null;
    };
  }, [treeData.latitude, treeData.longitude]);

  // 미니맵 초기화 (actualPosition이 설정된 후)
  useEffect(() => {
    if (!actualPosition || !miniMapContainerRef.current || !window.naver?.maps) return;

    const treePos = new window.naver.maps.LatLng(treeData.latitude, treeData.longitude);
    const panoPos = new window.naver.maps.LatLng(actualPosition.lat, actualPosition.lng);

    // 두 좌표의 중간점과 적절한 줌 레벨 계산
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

    // 두 마커를 포함하도록 범위 조정
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

    return () => {
      miniMapRef.current = null;
    };
  }, [actualPosition, treeData.latitude, treeData.longitude]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const getDistanceText = () => {
    if (distanceMeters === null) return '로드뷰 위치를 확인하는 중...';
    if (distanceMeters < 50) return '로드뷰가 나무 위치 근처에서 촬영되었습니다.';
    return `로드뷰 촬영 위치는 나무 위치에서 약 ${distanceMeters.toLocaleString()}m 떨어져 있습니다.`;
  };

  return (
    <div className="street-view-overlay" onClick={handleBackdropClick}>
      <div className="street-view-modal">
        <div className="street-view-header">
          <div className="street-view-title">
            <h3>{treeData.roadName}</h3>
            <span className="street-view-location">
              {treeData.city} {treeData.district} &middot; {treeData.species}
            </span>
          </div>
          <button className="street-view-close" onClick={onClose} aria-label="닫기">
            &times;
          </button>
        </div>
        <div className="street-view-content">
          {error ? (
            <div className="street-view-error">
              <p>{error}</p>
              <p className="street-view-error-hint">
                이 위치 근처에 네이버 로드뷰가 촬영되지 않았을 수 있습니다.
              </p>
            </div>
          ) : (
            <div className="street-view-split">
              <div className="street-view-panorama" ref={containerRef} />
              <div className="street-view-minimap-wrapper">
                <div className="street-view-minimap-header">
                  <span className="minimap-legend-item">
                    <span className="minimap-dot minimap-dot-tree" />나무 위치
                  </span>
                  <span className="minimap-legend-item">
                    <span className="minimap-dot minimap-dot-pano" />로드뷰 위치
                  </span>
                </div>
                <div className="street-view-minimap" ref={miniMapContainerRef} />
              </div>
            </div>
          )}
        </div>
        {!error && (
          <div className="street-view-info-bar">
            {getDistanceText()}
          </div>
        )}
      </div>
    </div>
  );
}
