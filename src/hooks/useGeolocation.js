import { useState, useCallback } from 'react';

export function useGeolocation() {
  const [coords, setCoords] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [status, setStatus] = useState('idle');

  const request = useCallback(() => {
    if (!navigator.geolocation) { setStatus('error'); return; }
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setAccuracy(pos.coords.accuracy);
        setStatus('ok');
      },
      (err) => { setStatus(err.code === 1 ? 'denied' : 'error'); },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  }, []);

  return { coords, accuracy, status, request };
}
