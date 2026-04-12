import { ALLERGEN_LEVELS } from '../data/allergenDatabase';
import './FilterPanel.css';

export default function FilterPanel({
  filters,
  onFilterChange,
  cities,
  speciesList,
}) {
  const handleCityChange = (e) => {
    onFilterChange({ ...filters, city: e.target.value || '' });
  };

  const handleSpeciesChange = (e) => {
    onFilterChange({ ...filters, species: e.target.value || '' });
  };

  const handleLevelToggle = (level) => {
    const current = filters.allergenLevels || [];
    const updated = current.includes(level)
      ? current.filter((l) => l !== level)
      : [...current, level];
    onFilterChange({ ...filters, allergenLevels: updated });
  };

  const handleAllergenOnlyToggle = () => {
    onFilterChange({ ...filters, allergenOnly: !filters.allergenOnly });
  };

  const handleReset = () => {
    onFilterChange({
      city: '',
      species: '',
      allergenLevels: [],
      allergenOnly: false,
    });
  };

  return (
    <div className="filter-panel">
      <div className="filter-header">
        <h2>필터</h2>
        <button className="reset-btn" onClick={handleReset}>
          초기화
        </button>
      </div>

      <div className="filter-section">
        <label className="filter-label">지역 (시도)</label>
        <select
          className="filter-select"
          value={filters.city || ''}
          onChange={handleCityChange}
        >
          <option value="">전체</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-section">
        <label className="filter-label">수종</label>
        <select
          className="filter-select"
          value={filters.species || ''}
          onChange={handleSpeciesChange}
        >
          <option value="">전체</option>
          {speciesList.map((sp) => (
            <option key={sp} value={sp}>
              {sp}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-section">
        <label className="filter-label">알레르기 등급</label>
        <div className="level-checkboxes">
          {Object.entries(ALLERGEN_LEVELS)
            .sort(([a], [b]) => Number(b) - Number(a))
            .map(([level, info]) => {
              const lvl = parseInt(level, 10);
              const checked = (filters.allergenLevels || []).includes(lvl);
              return (
                <label key={level} className="level-checkbox">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleLevelToggle(lvl)}
                  />
                  <span
                    className="level-dot"
                    style={{ backgroundColor: info.color }}
                  />
                  <span>{info.label}</span>
                </label>
              );
            })}
        </div>
      </div>

      <div className="filter-section">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={filters.allergenOnly || false}
            onChange={handleAllergenOnlyToggle}
          />
          <span>알레르기 유발 수종만 보기</span>
        </label>
      </div>

      <div className="filter-section data-sources">
        <h3 className="data-sources-title">데이터 출처</h3>
        <ul className="data-sources-list">
          <li>
            <strong>전국 가로수길</strong>
            <span>공공데이터포털 · tn_pubr_public_sttree_stret_api</span>
          </li>
          <li>
            <strong>서울 가로수 (개별)</strong>
            <span>서울 열린데이터광장 · OA-1325 · 2022-10 갱신, 종로구 제외</span>
          </li>
        </ul>
        <p className="data-sources-note">
          ※ 좌표는 2012~2022년 조사 기준. 실제 로드뷰 촬영 시점과 차이가 있을 수 있습니다.
        </p>
      </div>
    </div>
  );
}
