import { ALLERGEN_LEVELS } from '../data/allergenDatabase';
import './StatsPanel.css';

export default function StatsPanel({ stats }) {
  if (!stats) return null;

  const maxCount = Math.max(...stats.speciesStats.map((s) => s.count), 1);

  return (
    <div className="stats-panel">
      <h3>현황 통계</h3>

      <div className="stats-summary">
        <span className="stats-total">총 {stats.total}개 가로수길</span>
      </div>

      <div className="stats-section">
        <h4>알레르기 등급별 분포</h4>
        <div className="level-bars">
          {stats.levelStats
            .filter((ls) => ls.count > 0)
            .sort((a, b) => b.level - a.level)
            .map((ls) => (
              <div key={ls.level} className="level-bar-row">
                <span className="level-bar-label">
                  <span
                    className="level-bar-dot"
                    style={{ backgroundColor: ls.color }}
                  />
                  {ls.label}
                </span>
                <div className="level-bar-track">
                  <div
                    className="level-bar-fill"
                    style={{
                      width: `${(ls.count / stats.total) * 100}%`,
                      backgroundColor: ls.color,
                    }}
                  />
                </div>
                <span className="level-bar-count">{ls.count}</span>
              </div>
            ))}
        </div>
      </div>

      <div className="stats-section">
        <h4>수종별 가로수길 수 (상위 10)</h4>
        <div className="species-bars">
          {stats.speciesStats.slice(0, 10).map((sp) => (
            <div key={sp.name} className="species-bar-row">
              <span className="species-bar-label">
                <span
                  className="species-bar-dot"
                  style={{
                    backgroundColor:
                      ALLERGEN_LEVELS[sp.level]?.color || '#999',
                  }}
                />
                {sp.name}
              </span>
              <div className="species-bar-track">
                <div
                  className="species-bar-fill"
                  style={{
                    width: `${(sp.count / maxCount) * 100}%`,
                    backgroundColor:
                      ALLERGEN_LEVELS[sp.level]?.color || '#999',
                  }}
                />
              </div>
              <span className="species-bar-count">{sp.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
