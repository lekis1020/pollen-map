import { useState, useRef } from 'react';
import { readCSVFile } from '../utils/csvParser';
import './CsvUploader.css';

export default function CsvUploader({ onDataLoaded }) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  async function handleFile(file) {
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      setError('CSV 파일만 업로드 가능합니다.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const parsed = await readCSVFile(file);
      setResult(parsed);
      onDataLoaded(parsed.items);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }

  function handleDragOver(e) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave() {
    setDragging(false);
  }

  function handleClick() {
    fileInputRef.current?.click();
  }

  function handleInputChange(e) {
    const file = e.target.files[0];
    handleFile(file);
    e.target.value = '';
  }

  return (
    <div className="csv-uploader">
      <h3>CSV 데이터 업로드</h3>
      <p className="csv-desc">
        data.go.kr에서 다운로드한 식물 데이터 CSV 파일을 업로드하세요.
        <br />
        <small>가로수길, 보호수, 도시공원, 수목원 데이터를 자동 감지합니다.</small>
      </p>

      <div
        className={`drop-zone ${dragging ? 'dragging' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleInputChange}
          style={{ display: 'none' }}
        />
        {loading ? (
          <div className="drop-loading">
            <div className="drop-spinner" />
            <span>파싱 중...</span>
          </div>
        ) : (
          <>
            <span className="drop-icon">&#128194;</span>
            <span>CSV 파일을 여기에 드래그하거나 클릭</span>
          </>
        )}
      </div>

      {error && <div className="csv-error">{error}</div>}

      {result && (
        <div className="csv-result">
          <strong>{result.items.length.toLocaleString()}건</strong>{' '}
          <span className="csv-source-tag">{result.detectedSourceLabel}</span> 데이터 로드 완료
          {result.skipped > 0 && (
            <span className="csv-skipped">
              ({result.skipped}건 좌표 없음으로 제외)
            </span>
          )}
        </div>
      )}
    </div>
  );
}
