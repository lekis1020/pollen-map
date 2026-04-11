import { ALLERGEN_LEVELS } from '../data/allergenDatabase';
import { SOURCE_LIST } from '../services/dataSources';
import './Legend.css';

export default function Legend() {
  const levels = Object.entries(ALLERGEN_LEVELS)
    .sort(([a], [b]) => Number(b) - Number(a));

  return (
    <div className="map-legend">
      <h4>알레르기 등급</h4>
      {levels.map(([key, info]) => (
        <div key={key} className="legend-item">
          <span className="legend-color" style={{ background: info.color }} />
          <span>{info.label}</span>
        </div>
      ))}
      <h4 style={{ marginTop: 8 }}>데이터 소스</h4>
      {SOURCE_LIST.map((source) => (
        <div key={source.id} className="legend-item">
          <span className="legend-color" style={{ background: source.color }} />
          <span>{source.label}</span>
        </div>
      ))}
    </div>
  );
}
