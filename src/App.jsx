import { useState, useEffect, useMemo } from 'react';
import Map from './components/Map';
import StreetViewModal from './components/StreetViewModal';
import FilterPanel from './components/FilterPanel';
import StatsPanel from './components/StatsPanel';
import PollenPanel from './components/PollenPanel.jsx';
import ContactPanel from './components/ContactPanel.jsx';
import { useGeolocation } from './hooks/useGeolocation.js';
import { fetchAllData, loadFamousForests, loadSeoulTrees } from './services/api';
import { getCachedData, setCachedData } from './services/cache';
import { filterData, getUniqueCities, getUniqueSpecies, calculateStats } from './utils/helpers';
import { mailHref } from './data/contact.js';
import './App.css';

function App() {
  const [nationwideData, setNationwideData] = useState([]);
  const [seoulData, setSeoulData] = useState([]);
  const [famousForestData, setFamousForestData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState(''); // nationwide | seoul | processing
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [streetViewTree, setStreetViewTree] = useState(null);
  const geo = useGeolocation();
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
        setLoadingStage('nationwide');
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
    setLoadingStage('seoul');
    loadSeoulTrees()
      .then((seoul) => {
        if (!cancelled) {
          setLoadingStage('processing');
          setSeoulData(seoul);
          // 병합·그룹화 완료 후 stage 클리어 (다음 렌더에서 useMemo 실행)
          requestAnimationFrame(() => { if (!cancelled) setLoadingStage(''); });
        }
      })
      .catch((err) => {
        console.warn('서울 가로수 로드 실패:', err.message);
        if (!cancelled) setLoadingStage('');
      });
    return () => { cancelled = true; };
  }, []);

  // 산림청 국유림 명품숲: 지오코딩된 정적 데이터를 백그라운드 로드
  useEffect(() => {
    let cancelled = false;
    loadFamousForests()
      .then((forests) => { if (!cancelled) setFamousForestData(forests); })
      .catch((err) => console.warn('명품숲 로드 실패:', err.message));
    return () => { cancelled = true; };
  }, []);

  // 전국 + 서울 병합: 서울은 개별 그루 데이터로 전국 소스 서울 부분을 대체
  const rawData = useMemo(() => {
    const baseData = seoulData.length === 0
      ? nationwideData
      : [...nationwideData.filter((it) => it.city !== '서울특별시'), ...seoulData];
    return [...baseData, ...famousForestData];
  }, [nationwideData, seoulData, famousForestData]);

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
          <span className={`data-badge${loadingStage ? ' loading-badge' : ''}`}>
            {filteredData.length.toLocaleString()}개 표시
            {loadingStage === 'nationwide' && ' (전국 데이터...)'}
            {loadingStage === 'seoul' && ' (서울 데이터...)'}
            {loadingStage === 'processing' && ' (처리 중...)'}
            {loading && !loadingStage && rawData.length > 0 ? ' (로딩 중...)' : ''}
          </span>
          {/*
            홈 화면에 설치하면 주소창이 사라져 브라우저 새로고침 버튼도 같이
            없어진다. 설치 여부를 감지해 조건부로 띄우지 않는 이유는, 감지가
            틀렸을 때 정작 필요한 설치 사용자에게 버튼이 안 보이기 때문이다.
            브라우저 사용자에게 하나 중복되는 쪽이 안전한 실패다.
            좌표는 useGeolocation이 세션에 남기므로 리로드해도 유지된다.
          */}
          <button
            className="refresh-button"
            onClick={() => window.location.reload()}
            aria-label="새로고침"
            title="새로고침"
          >
            {'\u21bb'}
          </button>
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
          <ContactPanel />
        </aside>

        <main className="main-content">
          <PollenPanel coords={geo.coords} />
          {error && (
            <div className="error-banner">
              {/*
                데이터 로드가 깨진 순간이 사용자가 실제로 제보하고 싶어지는
                순간이다. 그때 사이드바를 뒤지게 하지 말고 여기서 바로
                보낼 수 있게 한다 — 오류 메시지를 본문에 미리 채워둔다.
              */}
              <p>
                데이터 로드 실패: {error}
                {' — '}
                <a
                  className="error-report-link"
                  href={`${mailHref('데이터 로드 실패')}&body=${encodeURIComponent(
                    `오류 메시지: ${error}`
                  )}`}
                >
                  계속 안 되면 제보해 주세요
                </a>
              </p>
              <button onClick={() => window.location.reload()}>
                다시 시도
              </button>
            </div>
          )}
          {loading && rawData.length === 0 ? (
            <div className="loading-overlay">
              <div className="spinner" />
              <p>
                {loadingStage === 'nationwide' && '전국 가로수 데이터를 불러오는 중...'}
                {loadingStage === 'seoul' && '서울 개별 가로수 데이터를 불러오는 중...'}
                {loadingStage === 'processing' && '데이터를 처리하는 중...'}
                {!loadingStage && '식물 데이터를 불러오는 중...'}
              </p>
            </div>
          ) : (
            <Map data={filteredData} onStreetViewClick={setStreetViewTree} geo={geo} />
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
