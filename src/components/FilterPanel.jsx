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
    </div>
  );
}
