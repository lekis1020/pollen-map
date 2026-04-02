import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { ALLERGEN_LEVELS } from '../data/allergenDatabase';

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
      `;
      return div;
    };

    legend.addTo(map);
    return () => legend.remove();
  }, [map]);

  return null;
}
