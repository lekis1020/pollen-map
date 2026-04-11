import { useState, useEffect, useMemo } from 'react';
import Map from './components/Map';
import StreetViewModal from './components/StreetViewModal';
import FilterPanel from './components/FilterPanel';
import StatsPanel from './components/StatsPanel';
import { fetchAllData } from './services/api';
import { getCachedData, setCachedData } from './services/cache';
import { filterData, getUniqueCities, getUniqueSpecies, calculateStats } from './utils/helpers';
import './App.css';

function App() {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [streetViewTree, setStreetViewTree] = useState(null);
  const [filters, setFilters] = useState({
    city: '',
    species: '',
    allergenLevels: [],
    allergenOnly: false,
  });

  // 데이터 로드: 캐시 우선 -> 백그라운드 갱신
  useEffect(() => {
    async function loadData() {
      try {
        setError(null);

        // 1. 캐시 확인 (즉시 표시)
        const cached = getCachedData();
        if (cached && cached.length > 0) {
          setRawData(cached);
          setLoading(false);

          // 백그라운드에서 API 갱신 (UI 차단 없음)
          fetchAllData(null).then((result) => {
            setRawData(result.items);
            setCachedData(result.items);
          }).catch(() => {});
          return;
        }

        // 2. 캐시 없음: 첫 페이지 즉시 표시 → 나머지 완료 후 추가
        setLoading(true);
        const result = await fetchAllData((firstPage) => {
          setRawData(firstPage.items);
          setLoading(false);
        });
        // 기존 마커 유지, 새 아이템만 추가 (전체 교체 시 클러스터링 에러 방지)
        setRawData((prev) => {
          const existingIds = new Set(prev.map(i => i.id));
          const newItems = result.items.filter(i => !existingIds.has(i.id));
          const merged = newItems.length > 0 ? [...prev, ...newItems] : prev;
          setCachedData(merged);
          return merged;
        });
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
          식물 알레르기 지도
        </h1>
        <div className="header-info">
          <span className="data-badge">
            {filteredData.length.toLocaleString()}개 표시
            {loading ? ' (로딩 중...)' : ''}
          </span>
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
          {loading && rawData.length === 0 ? (
            <div className="loading-overlay">
              <div className="spinner" />
              <p>식물 데이터를 불러오는 중...</p>
            </div>
          ) : (
            <Map data={filteredData} onStreetViewClick={setStreetViewTree} />
          )}
        </main>
      </div>

      {streetViewTree && (
        <StreetViewModal
          treeData={streetViewTree}
          onClose={() => setStreetViewTree(null)}
        />
      )}
    </div>
  );
}

export default App;
