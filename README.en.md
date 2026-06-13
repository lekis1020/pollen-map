# 🌳 Street Tree Allergy Map (pollen-map)

[한국어](README.md) · **English**

A web service that visualizes the distribution of street trees across South Korea alongside their **allergenic species** information.
People with plant allergies and clinicians can see the species, allergy grade, and pollen season of nearby street trees at a glance, and inspect their real-world locations via street view.

**🔗 Live:** https://pollen-map-dun.vercel.app

---

## 📸 Preview

| Nationwide tree map | Marker popup (allergy info) | Street view |
|:---:|:---:|:---:|
| ![Nationwide map](docs/screenshots/overview.png) | ![Marker popup](docs/screenshots/marker-popup.png) | ![Street view](docs/screenshots/roadview.png) |

## ✨ Features

- **Nationwide tree map** — ~10,350 public street-tree segment records + ~257,000 individual Seoul street trees
- **Allergy grades** — per-species allergen grade (Very High → None) and pollen-season guidance
- **Smart filters** — by province/city, species, allergy grade, or allergenic-only
- **Street view integration** — click a marker to open Naver Panorama at the tree's location
- **Road/species polylines** — consecutive same-species trees on a road are merged into a line for readability and performance
- **Viewport-based rendering + clustering** — smooth navigation over large datasets
- **Two-stage loading + cache** — instant cached display followed by background refresh

## 🛠️ Tech Stack

| Area | Technology |
|------|-----------|
| Frontend | React 19, Vite 8 |
| Map | Naver Maps API v3 (Panorama submodule) |
| Clustering | Naver MarkerClustering.js (self-hosted) |
| Data processing | Web Worker (road/species grouping), IndexedDB cache |
| Deploy | Vercel (auto-deploy on git push) |

## 🗂️ Data Sources

| Source | Provider | Scale | Unit |
|------|--------|------|------|
| National street-tree info | [data.go.kr](https://www.data.go.kr) `tn_pubr_public_sttree_stret_api` | ~10,350 records | Segment |
| Seoul street-tree locations | [Seoul Open Data Plaza](https://data.seoul.go.kr) OA-1325 `GeoInfoOfRoadsideTreeW` | ~257,000 trees | Individual tree |

- Seoul is replaced with individual-tree data; other regions use the segment-level source.
- Seoul data ships as a pre-collected static JSON (`public/data/seoul-trees.json`) instead of runtime API calls.

> ⚠️ Tree location/species data is based on municipal registries and may contain errors. Allergy grades are general reference information and do not replace medical diagnosis.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A [data.go.kr](https://www.data.go.kr) Open API key (apply for the street-tree standard dataset)

### Install & Run

```bash
# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Set VITE_DATA_API_KEY in the .env file

# Start the dev server
npm run dev

# Production build
npm run build

# Preview the build
npm run preview
```

### Environment Variables

| Variable | Description |
|------|------|
| `VITE_DATA_API_KEY` | data.go.kr Open API key (shared across street-tree datasets) |

The Naver Maps client key is loaded via the script tag (`ncpKeyId`) in `index.html`.

### Refreshing Seoul Data

To update the Seoul street-tree dataset:

```bash
node scripts/fetch-seoul-trees.mjs   # regenerates public/data/seoul-trees.json
```

## 📁 Project Structure

```
repo/
├── public/
│   ├── data/seoul-trees.json     # Seoul individual-tree static data
│   └── MarkerClustering.js       # Naver clustering (self-hosted)
├── scripts/
│   └── fetch-seoul-trees.mjs     # Seoul data pre-collection script
├── src/
│   ├── components/               # Map, FilterPanel, StatsPanel, Legend, StreetViewModal
│   ├── data/allergenDatabase.js  # Per-species allergen database
│   ├── services/                 # api, cache, idbCache, dataSources, normalizers
│   ├── utils/                    # groupByRoad, helpers
│   ├── workers/groupWorker.js    # Road/species grouping Web Worker
│   └── App.jsx
└── index.html
```

## 📜 License

Tree data follows the KOGL (Korea Open Government License) terms of data.go.kr and Seoul Open Data Plaza.
