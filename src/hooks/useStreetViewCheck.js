import { useState, useEffect, useRef } from 'react';

// In-memory cache for panorama check results (persists across renders)
const panoCache = new Map();

// Check single location for panorama availability (exported for TreeMarker fallback)
export function checkPanoAvailability(lat, lng) {
  return checkPanoAt(lat, lng);
}

function checkPanoAt(lat, lng) {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (panoCache.has(key)) return Promise.resolve(panoCache.get(key));

  return new Promise((resolve) => {
    if (!window.naver?.maps) { resolve(false); return; }

    const position = new window.naver.maps.LatLng(lat, lng);
    const div = document.createElement('div');
    div.style.cssText = 'width:100px;height:100px;position:fixed;left:-9999px;top:0';
    document.body.appendChild(div);

    let resolved = false;
    const done = (available) => {
      if (resolved) return;
      resolved = true;
      panoCache.set(key, available);
      try { div.remove(); } catch {}
      resolve(available);
    };

    setTimeout(() => done(false), 2000);

    try {
      const pano = new window.naver.maps.Panorama(div, { position, pov: { pan: 0, tilt: 0, fov: 100 } });
      window.naver.maps.Event.addListener(pano, 'pano_changed', () => {
        try {
          const pos = pano.getPosition();
          done(pos ? position.distanceTo(pos) < 500 : false);
        } catch { done(false); }
      });
      window.naver.maps.Event.addListener(pano, 'error', () => done(false));
      window.naver.maps.Event.addListener(pano, 'pano_status', (s) => { if (s !== 'OK') done(false); });
    } catch { done(false); }
  });
}

// Batch check with concurrency limit
async function batchCheck(items, concurrency = 3) {
  const results = new Map();
  const queue = [...items];

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift();
      const lat = item.startLat || item.latitude;
      const lng = item.startLng || item.longitude;
      if (lat && lng) {
        const available = await checkPanoAt(lat, lng);
        results.set(item.id, available);
      }
    }
  }

  await Promise.all(Array(Math.min(concurrency, queue.length)).fill(null).map(() => worker()));
  return results;
}

export function useStreetViewCheck(items, enabled) {
  const [availability, setAvailability] = useState(new Map());
  const checkingRef = useRef(false);

  useEffect(() => {
    if (!enabled || !items.length || checkingRef.current) return;

    // Only check items that have polyline coords and haven't been checked
    const toCheck = items.filter(item =>
      (item.startLat && item.endLat) && !availability.has(item.id)
    ).slice(0, 50); // Max 50 per batch

    if (toCheck.length === 0) return;
    checkingRef.current = true;

    batchCheck(toCheck).then(results => {
      setAvailability(prev => {
        const next = new Map(prev);
        results.forEach((v, k) => next.set(k, v));
        return next;
      });
      checkingRef.current = false;
    });
  }, [items, enabled]);

  return availability;
}
