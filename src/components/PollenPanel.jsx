import { useEffect, useState } from 'react';
import { fetchPollen } from '../services/pollen.js';
import './PollenPanel.css';

const LEVEL_LABEL = ['낮음', '보통', '높음', '매우높음'];
const LEVEL_STYLE = [
  { background: '#2ecc71', text: '#052e16' },
  { background: '#f1c40f', text: '#713f12' },
  { background: '#e67e22', text: '#431407' },
  { background: '#e74c3c', text: '#3f0000' },
];

// Exported for direct rule testing; it has no component or Fast Refresh state.
// eslint-disable-next-line react-refresh/only-export-components
export function getPollenSummary(categories = []) {
  const active = categories.filter(
    (category) => category.status === 'ok' && Number.isInteger(category.level),
  );

  if (active.length > 0) {
    const highest = active.reduce((best, category) => (
      category.level > best.level ? category : best
    ));
    return `${highest.label} ${LEVEL_LABEL[highest.level] ?? '정보 없음'}`;
  }

  if (categories.length > 0 && categories.every((category) => category.status === 'offseason')) {
    return '주요 꽃가루 비시즌';
  }

  if (categories.some((category) => category.status === 'error')) {
    return '일부 정보를 불러올 수 없음';
  }

  return '정보 없음';
}

function CategoryCard({ category }) {
  const isAvailable = category.status === 'ok' && Number.isInteger(category.level);
  const levelStyle = LEVEL_STYLE[category.level];
  const label = isAvailable
    ? (LEVEL_LABEL[category.level] ?? '정보 없음')
    : (category.status === 'offseason' ? '비시즌' : '정보 없음');

  return (
    <div className="pollen-card">
      <span className="pollen-name">{category.label}</span>
      <span
        className={`pollen-level${isAvailable ? '' : ' unavailable'}`}
        style={isAvailable ? {
          '--pollen-level-color': levelStyle?.background,
          '--pollen-level-text': levelStyle?.text,
        } : undefined}
      >
        {label}
      </span>
    </div>
  );
}

export default function PollenPanel({ coords }) {
  const latitude = coords?.lat;
  const longitude = coords?.lng;
  const coordinateKey = coords ? `${latitude}:${longitude}` : null;
  const [request, setRequest] = useState({ key: null, status: 'idle', data: null });
  const [expanded, setExpanded] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- atomically bind loading state to the requested coordinates */
  useEffect(() => {
    if (!coordinateKey) {
      setRequest({ key: null, status: 'idle', data: null });
      return;
    }

    let alive = true;
    setRequest({ key: coordinateKey, status: 'loading', data: null });
    fetchPollen(latitude, longitude)
      .then((data) => {
        if (alive) {
          setRequest({ key: coordinateKey, status: 'success', data });
        }
      })
      .catch(() => {
        if (alive) {
          setRequest({ key: coordinateKey, status: 'error', data: null });
        }
      });
    return () => { alive = false; };
  }, [coordinateKey, latitude, longitude]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const currentRequest = request.key === coordinateKey
    ? request
    : {
      key: coordinateKey,
      status: coordinateKey ? 'loading' : 'idle',
      data: null,
    };
  const data = currentRequest.status === 'success' ? currentRequest.data : null;
  const categories = data?.categories || [];
  let statusCopy = null;

  if (!coordinateKey) {
    statusCopy = '지도에서 내 위치를 눌러 오늘의 꽃가루를 확인하세요.';
  } else if (currentRequest.status === 'error') {
    statusCopy = '오늘의 꽃가루를 일시적으로 불러올 수 없습니다.';
  } else if (currentRequest.status === 'loading') {
    statusCopy = '오늘의 꽃가루 불러오는 중…';
  }

  const hasDetails = Boolean(data);
  const basisDate = data?.generatedForKstDate?.replaceAll('-', '.');

  return (
    <section className={`pollen-panel${statusCopy ? ' muted' : ''}`} aria-labelledby="pollen-panel-title">
      <div className="pollen-summary-row">
        <div className="pollen-heading">
          <h2 id="pollen-panel-title">오늘의 꽃가루 위험지수</h2>
          <p className="pollen-source">기상청 예보 · 실시간 측정 아님 / 잔디: Google</p>
        </div>

        {statusCopy ? (
          <p
            className="pollen-status"
            role={currentRequest.status === 'error' ? 'alert' : undefined}
          >
            {statusCopy}
          </p>
        ) : (
          <div className="pollen-mobile-summary">
            <span className="pollen-summary-region">{data.region}</span>
            <strong>{getPollenSummary(categories)}</strong>
          </div>
        )}

        {hasDetails && (
          <button
            type="button"
            className="pollen-toggle"
            aria-expanded={expanded}
            aria-controls="pollen-details"
            aria-label={expanded ? '꽃가루 상세 접기' : '꽃가루 상세 펼치기'}
            onClick={() => setExpanded((value) => !value)}
          >
            <span aria-hidden="true">{expanded ? '⌃' : '⌄'}</span>
          </button>
        )}
      </div>

      {hasDetails && (
        <div id="pollen-details" className={`pollen-details${expanded ? ' expanded' : ''}`}>
          <div className="pollen-card-grid">
            <div className="pollen-card pollen-region-card">
              <span className="pollen-name">현재 지역</span>
              <strong>{data.region}</strong>
            </div>
            {categories.map((category) => (
              <CategoryCard key={category.key} category={category} />
            ))}
          </div>
          <div className="pollen-meta">
            {basisDate && <span>기준일 {basisDate}</span>}
          </div>
          {data.disclaimer && <p className="pollen-disclaimer">{data.disclaimer}</p>}
        </div>
      )}
    </section>
  );
}
