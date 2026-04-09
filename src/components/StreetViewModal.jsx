import { useEffect, useRef, useState } from 'react';
import './StreetViewModal.css';

export default function StreetViewModal({ treeData, onClose }) {
  const panoramaRef = useRef(null);
  const containerRef = useRef(null);
  const [error, setError] = useState(null);

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

    try {
      const position = new window.naver.maps.LatLng(treeData.latitude, treeData.longitude);
      const panorama = new window.naver.maps.Panorama(containerRef.current, {
        position: position,
        pov: { pan: 0, tilt: 0, fov: 100 },
      });
      panoramaRef.current = panorama;

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

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
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
            <div className="street-view-container" ref={containerRef} />
          )}
        </div>
      </div>
    </div>
  );
}
