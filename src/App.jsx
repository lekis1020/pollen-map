import { useState, useEffect, useMemo } from 'react';
import Map from './components/Map';
import FilterPanel from './components/FilterPanel';
import StatsPanel from './components/StatsPanel';
import { fetchTreeData } from './services/api';
import { filterData, getUniqueCities, getUniqueSpecies, calculateStats } from './utils/helpers';
import 'leaflet/dist/leaflet.css';
import './App.css';

function App() {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSample, setIsSample] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [filters, setFilters] = useState({
    city: '',
    species: '',
    allergenLevels: [],
    allergenOnly: false,
  });

  // 데이터 로드
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchTreeData();
        setRawData(result.items);
        setIsSample(!!result.issample);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // 필터 옵션
  const cities = useMemo(() => getUniqueCities(rawData), [rawData]);
  const speciesList = useMemo(() => getUniqueSpecies(rawData), [rawData]);

  // 필터 적용된 데이터
  const filteredData = useMemo(
    () => filterData(rawData, filters),
    [rawData, filters]
  );

  // 통계
  const stats = useMemo(
    () => calculateStats(filteredData),
    [filteredData]
  );

  return (
    <div className="app">
      <header className="app-header">
        <button
          className="sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="사이드바 토글"
        >
          {sidebarOpen ? '\u2715' : '\u2630'}
        </button>
        <h1>
          <span className="header-icon" role="img" aria-hidden="true">
            &#127793;
          </span>
          가로수길 알레르기 지도
        </h1>
        <div className="header-info">
          {loading ? (
            <span className="loading-badge">로딩 중...</span>
          ) : (
            <span className="data-badge">
              {filteredData.length}개 표시
              {isSample && ' (샘플 데이터)'}
            </span>
          )}
        </div>
      </header>

      <div className="app-body">
        <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <FilterPanel
            filters={filters}
            onFilterChange={setFilters}
            cities={cities}
            speciesList={speciesList}
          />
          <StatsPanel stats={stats} />
        </aside>

        <main className="main-content">
          {error && (
            <div className="error-banner">
              <p>데이터 로드 실패: {error}</p>
              <button onClick={() => window.location.reload()}>
                다시 시도
              </button>
            </div>
          )}
          {loading ? (
            <div className="loading-overlay">
              <div className="spinner" />
              <p>가로수길 데이터를 불러오는 중...</p>
            </div>
          ) : (
            <Map data={filteredData} />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
