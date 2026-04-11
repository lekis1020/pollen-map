import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { ALLERGEN_LEVELS } from '../data/allergenDatabase';
import { SOURCE_LIST } from '../services/dataSources';

export default function Legend() {
  const map = useMap();

  useEffect(() => {
    const legend = L.control({ position: 'bottomright' });

    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'map-legend');
      div.innerHTML = `
        <h4>알레르기 등급</h4>
        ${Object.entries(ALLERGEN_LEVELS)
          .sort(([a], [b]) => Number(b) - Number(a))
          .map(
            ([, info]) =>
              `<div class="legend-item">
                <span class="legend-color" style="background:${info.color}"></span>
                <span>${info.label}</span>
              </div>`
          )
          .join('')}
        <h4 style="margin-top:8px">데이터 소스</h4>
        ${SOURCE_LIST
          .map(
            (source) =>
              `<div class="legend-item">
                <span class="legend-color" style="background:${source.color}"></span>
                <span>${source.label}</span>
              </div>`
          )
          .join('')}
        <h4 style="margin-top:8px">로드뷰 구간</h4>
        <div class="legend-item">
          <span class="legend-line" style="background:#2ecc71;height:4px;border-radius:2px;opacity:0.8"></span>
          <span>로드뷰 가능 구간</span>
        </div>
        <div class="legend-item">
          <span class="legend-line legend-line--dashed" style="background:#bdc3c7;height:3px;border-radius:2px;opacity:0.4"></span>
          <span>로드뷰 미지원 구간</span>
        </div>
      `;
      return div;
    };

    legend.addTo(map);
    return () => legend.remove();
  }, [map]);

  return null;
}
