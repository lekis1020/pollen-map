import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import TreeMarker from './TreeMarker';
import Legend from './Legend';
import './Map.css';

// 지도 뷰 변경 컴포넌트
function MapViewController({ center, zoom }) {
  const map = useMap();
  if (center) {
    map.setView(center, zoom || map.getZoom());
  }
  return null;
}

export default function Map({ data, mapCenter, mapZoom, onStreetViewClick }) {
  const defaultCenter = [36.5, 127.5]; // 대한민국 중앙
  const defaultZoom = 7;

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
        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={60}
          spiderfyOnMaxZoom
          showCoverageOnHover={false}
        >
          {data.map((item, index) => (
            <TreeMarker key={item.id || index} data={item} onStreetViewClick={onStreetViewClick} />
          ))}
        </MarkerClusterGroup>
        <Legend />
      </MapContainer>
    </div>
  );
}
