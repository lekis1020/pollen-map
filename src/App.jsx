import { useState, useEffect, useMemo, useCallback } from 'react';
import Map from './components/Map';
import StreetViewModal from './components/StreetViewModal';
import FilterPanel from './components/FilterPanel';
import StatsPanel from './components/StatsPanel';
import { fetchInitialData, fetchRemainingData } from './services/api';
import { filterData, getUniqueCities, getUniqueSpecies, calculateStats } from './utils/helpers';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import './App.css';

// Leaflet 기본 마커 아이콘 경로 수정
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function App() {
  const [rawData, setRawData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detailLoaded, setDetailLoaded] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [streetViewTree, setStreetViewTree] = useState(null);
  const [filters, setFilters] = useState({
    city: '',
    species: '',
    allergenLevels: [],
    allergenOnly: false,
  });

  // 초기 로드: 첫 페이지만
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchInitialData();
        setRawData(result.items);
        setTotalCount(result.totalCount);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // 줌 인 시 나머지 데이터 로드
  const loadDetailData = useCallback(async () => {
    if (detailLoaded || detailLoading) return;
    setDetailLoading(true);
    try {
      await fetchRemainingData((newItems) => {
        setRawData((prev) => {
          const existingIds = new Set(prev.map((item) => item.id));
          const unique = newItems.filter((item) => !existingIds.has(item.id));
          return unique.length > 0 ? [...prev, ...unique] : prev;
        });
      });
      setDetailLoaded(true);
    } catch {
      // silently ignore detail load errors
    } finally {
      setDetailLoading(false);
    }
  }, [detailLoaded, detailLoading]);

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
            {loading
              ? ' (로딩 중...)'
              : detailLoading
              ? ` (로딩 중...)`
              : !detailLoaded && totalCount > rawData.length
              ? ` (전체 ${totalCount.toLocaleString()}개)`
              : ''}
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
            <Map data={filteredData} onStreetViewClick={setStreetViewTree} onZoomDetail={loadDetailData} />
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
