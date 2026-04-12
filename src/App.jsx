import { useState, useEffect, useMemo } from 'react';
import Map from './components/Map';
import StreetViewModal from './components/StreetViewModal';
import FilterPanel from './components/FilterPanel';
import StatsPanel from './components/StatsPanel';
import { fetchAllData, loadSeoulTrees } from './services/api';
import { getCachedData, setCachedData } from './services/cache';
import { filterData, getUniqueCities, getUniqueSpecies, calculateStats } from './utils/helpers';
import './App.css';

function App() {
  const [nationwideData, setNationwideData] = useState([]);
  const [seoulData, setSeoulData] = useState([]);
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

  // 전국 가로수길(공공데이터) 로드: 캐시 우선 -> 백그라운드 갱신
  useEffect(() => {
    async function loadData() {
      try {
        setError(null);

        const cached = getCachedData();
        if (cached && cached.length > 0) {
          setNationwideData(cached);
          setLoading(false);
          fetchAllData(null).then((result) => {
            setNationwideData(result.items);
            setCachedData(result.items);
          }).catch(() => {});
          return;
        }

        setLoading(true);
        const result = await fetchAllData((firstPage) => {
          setNationwideData(firstPage.items);
          setLoading(false);
        });
        setNationwideData(result.items);
        setCachedData(result.items);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // 서울 개별 가로수(OA-1325) 백그라운드 로드
  useEffect(() => {
    let cancelled = false;
    loadSeoulTrees()
      .then((seoul) => { if (!cancelled) setSeoulData(seoul); })
      .catch((err) => console.warn('서울 가로수 로드 실패:', err.message));
    return () => { cancelled = true; };
  }, []);

  // 전국 + 서울 병합: 서울은 개별 그루 데이터로 전국 소스 서울 부분을 대체
  const rawData = useMemo(() => {
    if (seoulData.length === 0) return nationwideData;
    const nonSeoul = nationwideData.filter((it) => it.city !== '서울특별시');
    return [...nonSeoul, ...seoulData];
  }, [nationwideData, seoulData]);

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
