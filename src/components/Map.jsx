import { useState } from 'react';
import { MapContainer, TileLayer, Polyline, useMap, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import TreeMarker from './TreeMarker';
import Legend from './Legend';
import { useStreetViewCheck } from '../hooks/useStreetViewCheck';
import './Map.css';

// 지도 뷰 변경 컴포넌트
function MapViewController({ center, zoom }) {
  const map = useMap();
  if (center) {
    map.setView(center, zoom || map.getZoom());
  }
  return null;
}

// 줌 레벨 추적 컴포넌트
function ZoomTracker({ onZoomChange }) {
  useMapEvents({
    zoomend: (e) => {
      onZoomChange(e.target.getZoom());
    },
  });
  return null;
}

// 가로수길 구간 폴리라인 (줌 레벨 12 이상에서만 표시)
function TreeLines({ data, availability }) {
  return data.map((item) => {
    if (!item.startLat || !item.endLat) return null;
    if (item.startLat === item.endLat && item.startLng === item.endLng) return null;

    const isAvailable = availability.get(item.id);
    const checked = availability.has(item.id);

    return (
      <Polyline
        key={`line_${item.id}`}
        positions={[[item.startLat, item.startLng], [item.endLat, item.endLng]]}
        color={checked ? (isAvailable ? '#2ecc71' : '#bdc3c7') : '#2ecc71'}
        weight={checked ? (isAvailable ? 5 : 3) : 4}
        opacity={checked ? (isAvailable ? 0.8 : 0.4) : 0.7}
        dashArray={checked && !isAvailable ? '8 6' : undefined}
      />
    );
  });
}

export default function Map({ data, mapCenter, mapZoom, onStreetViewClick }) {
  const defaultCenter = [36.5, 127.5]; // 대한민국 중앙
  const defaultZoom = 7;
  const [zoom, setZoom] = useState(mapZoom || defaultZoom);
  const streetViewAvail = useStreetViewCheck(data, zoom >= 12);

  return (
    <div className="map-wrapper">
      <MapContainer
        center={mapCenter || defaultCenter}
        zoom={mapZoom || defaultZoom}
        className="map-container"
        maxZoom={18}
        minZoom={5}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {mapCenter && <MapViewController center={mapCenter} zoom={mapZoom} />}
        <ZoomTracker onZoomChange={setZoom} />
        {zoom >= 12 && <TreeLines data={data} availability={streetViewAvail} />}
        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={60}
          spiderfyOnMaxZoom
          showCoverageOnHover={false}
        >
          {data.map((item, index) => (
            <TreeMarker key={item.id || index} data={item} onStreetViewClick={onStreetViewClick} streetViewAvail={streetViewAvail} />
          ))}
        </MarkerClusterGroup>
        <Legend />
      </MapContainer>
    </div>
  );
}
