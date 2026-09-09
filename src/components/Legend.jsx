import { ALLERGEN_LEVELS } from '../data/allergenDatabase';
import { SOURCE_LIST } from '../services/dataSources';
import './Legend.css';

export default function Legend() {
  const levels = Object.entries(ALLERGEN_LEVELS)
    .sort(([a], [b]) => Number(b) - Number(a));

  return (
    <div className="map-legend">
      <h4>알레르기 등급</h4>
      {/* 팝업을 열지 않고 색만 보는 사용자에게도 등급의 뜻이 닿아야 한다. */}
      <p className="legend-note">
        등급은 꽃가루의 알레르기 유발 가능성이며, 유행 시기에 따라 실제 영향이 달라집니다.
      </p>
      {levels.map(([key, info]) => (
        <div key={key} className="legend-item">
          <span className="legend-color" style={{ background: info.color }} />
          <span>{info.label}</span>
        </div>
      ))}
      <h4>데이터 소스</h4>
      {SOURCE_LIST.map((source) => (
        <div key={source.id} className="legend-item">
          <span className="legend-color" style={{ background: source.color }} />
          <span>{source.label}</span>
        </div>
      ))}
    </div>
  );
}
