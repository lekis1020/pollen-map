import { useEffect, useState } from 'react';
import { fetchPollen } from '../services/pollen.js';
import './PollenPanel.css';

const LEVEL_LABEL = ['낮음', '보통', '높음', '매우높음'];
const LEVEL_COLOR = ['#2ecc71', '#f1c40f', '#e67e22', '#e74c3c'];

export default function PollenPanel({ coords }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!coords) return;
    let alive = true;
    fetchPollen(coords.lat, coords.lng)
      .then((d) => { if (alive) { setData(d); setError(false); } })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [coords]);

  if (!coords) return <div className="pollen-panel muted">내 위치를 눌러 오늘의 꽃가루를 확인하세요.</div>;
  if (error) return <div className="pollen-panel muted">일시적으로 불러올 수 없습니다.</div>;
  if (!data) return <div className="pollen-panel muted">불러오는 중…</div>;

  const cats = data.categories || [];
  const allOff = cats.length > 0 && cats.every((c) => c.status === 'offseason');
  if (allOff) return <div className="pollen-panel muted">현재는 주요 꽃가루 비시즌입니다.</div>;

  return (
    <div className="pollen-panel">
      <div className="pollen-region">{data.region} · 오늘의 꽃가루</div>
      <div className="pollen-cards">
        {cats.map((c) => (
          <div key={c.key} className="pollen-card">
            <span className="pollen-name">{c.label}</span>
            {c.status === 'ok' ? (
              <span className="pollen-level" style={{ background: LEVEL_COLOR[c.level] ?? '#ccc' }}>
                {LEVEL_LABEL[c.level] ?? '—'}
              </span>
            ) : (
              <span className="pollen-level off">{c.status === 'offseason' ? '비시즌' : '—'}</span>
            )}
          </div>
        ))}
      </div>
      <div className="pollen-disclaimer">{data.disclaimer}</div>
    </div>
  );
}
