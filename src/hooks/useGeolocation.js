import { useState, useCallback } from 'react';

// 좌표를 세션에 남긴다. 설치된 PWA에는 브라우저 새로고침 버튼이 없어 헤더에
// 하나를 뒀는데, 리로드할 때마다 좌표가 날아가면 꽃가루 패널이 "내 위치를
// 눌러…"로 돌아가고 사용자는 GPS를 매번 다시 잡아야 한다.
//
// sessionStorage라 탭·앱을 닫으면 사라진다. 다만 설치 PWA는 세션이 며칠씩
// 이어질 수 있어서, 이동한 뒤의 옛 좌표로 엉뚱한 지역 꽃가루를 보여주지
// 않도록 시간 제한을 둔다.
const STORAGE_KEY = 'pollen-map-geo';
const MAX_AGE = 60 * 60 * 1000; // 1시간

function readSaved() {
  // 시크릿 모드나 스토리지 차단 환경에서는 접근 자체가 던진다.
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!Number.isFinite(v?.lat) || !Number.isFinite(v?.lng)) return null;
    if (!Number.isFinite(v?.ts) || Date.now() - v.ts > MAX_AGE) return null;
    return v;
  } catch {
    return null;
  }
}

function writeSaved(lat, lng, accuracy) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ lat, lng, accuracy, ts: Date.now() }));
  } catch {
    // 저장 못 해도 기능 자체는 돌아간다 — 새로고침 때 좌표를 잃을 뿐이다.
  }
}

export function useGeolocation() {
  const saved = readSaved();
  const [coords, setCoords] = useState(saved ? { lat: saved.lat, lng: saved.lng } : null);
  const [accuracy, setAccuracy] = useState(saved?.accuracy ?? null);

  // 복원해도 status는 idle로 둔다. Map의 geo effect는 [geo.status]에만 의존하는데,
  // 지도가 만들어지기 전에 'ok'로 발화하면 placeLocationMarker가 조용히 return하고
  // status가 다시 바뀌지 않아 마커가 영영 안 찍힌다. 좌표만 되살린다 —
  // 꽃가루 패널은 coords만 있으면 동작한다.
  const [status, setStatus] = useState('idle');

  const request = useCallback(() => {
    if (!navigator.geolocation) { setStatus('error'); return; }
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setAccuracy(pos.coords.accuracy);
        setStatus('ok');
        writeSaved(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
      },
      (err) => { setStatus(err.code === 1 ? 'denied' : 'error'); },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }, []);

  return { coords, accuracy, status, request };
}
