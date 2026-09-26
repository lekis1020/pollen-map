# Design

## Source of truth

- **Status:** Active
- **Updated:** 2026-09-26
- **Product surfaces:** React web app, installable PWA, Vercel serverless pollen endpoint
- **Evidence reviewed:** `README.md`, `src/App.jsx`, `src/App.css`, `src/components/Map.jsx`, `src/components/PollenPanel.jsx`, component styles and tests, `docs/screenshots/`, `docs/superpowers/specs/2026-07-24-data-reality-gap-design.md`, `docs/superpowers/specs/2026-07-26-pollen-realtime-push-design.md`, and the approved 2026-09-26 pollen/map separation mockups.
- Feature-level decisions live in `docs/superpowers/specs/`; this file governs cross-feature product and UI decisions. When they conflict, the newer approved feature spec wins and this file must be refreshed.

## Brand

- **Personality:** calm, clinical without feeling institutional, locally useful, evidence-conscious.
- **Trust signals:** name the data source, distinguish observation from forecast, show reference dates, preserve source-record caveats, and avoid overstating precision.
- **Avoid:** alarmist medical language, decorative dashboards that compete with the map, hidden data provenance, and ambiguous use of “real-time.”

## Product goals

- Help allergy-sensitive users and clinicians understand which plants are nearby and what pollen risk is forecast for the current region.
- Keep plant-location data and daily pollen-risk data visually and semantically distinct.
- Make uncertainty, seasonality, and source limitations visible without blocking map use.
- Preserve responsive map usability with hundreds of thousands of source records.

Non-goals:

- Medical diagnosis or individual treatment advice.
- Claiming that the service operates a real-time pollen sensor network.
- Full offline map operation.

Success signals:

- Users can identify the current pollen-risk summary before interacting with the map.
- Users can explain that the map shows registered plant locations while the top panel shows regional forecasts.
- The map remains usable on desktop and mobile after status information is added.

## Personas and jobs

- **Allergy-sensitive resident:** check today’s regional risk and inspect nearby potentially relevant trees.
- **Clinician or educator:** demonstrate the difference between environmental risk forecasts and registered plant distribution.
- **Data contributor:** identify questionable plant records and report them with enough context for verification.

Primary contexts are quick mobile checks outdoors and detailed desktop exploration.

## Information architecture

The single-screen hierarchy is:

1. Product header and global controls.
2. Persistent “오늘의 꽃가루 위험지수” region summary.
3. Plant-data workspace:
   - filters and statistics;
   - plant location/species map;
   - marker details, road-view verification, and report links.

The top pollen summary is not a map legend. The map labels itself as plant location/species data and retains its own allergen-grade legend.

## Design principles

1. **Separate unlike evidence.** Daily regional forecasts and registered plant snapshots must not share an unlabeled visual container.
2. **State the epistemic status.** Use “예보 위험지수” and “실시간 측정 아님” where users could otherwise infer live sensing.
3. **Map first, dashboard second.** Status information remains readable but does not consume unnecessary map height.
4. **Progressive disclosure on small screens.** Show the most important risk in one line and place complete category details behind an accessible disclosure.
5. **Graceful degradation.** Pollen API, location, or map-provider failure must not take down the other product surface.

## Visual language

- **Color:** white and slate surfaces; teal (`#0f766e`) for product actions and location context; pollen levels retain green/yellow/orange/red risk semantics; neutral gray denotes offseason or unavailable data.
- **Typography:** system sans-serif stack with `Noto Sans KR` fallback; compact numeric labels use tabular numerals where helpful.
- **Spacing:** 4/8/12/16/20px rhythm; dense status cards remain at least 40px high on touch layouts.
- **Shape/elevation:** 8–12px radii, restrained borders, light shadows only for floating map surfaces.
- **Motion:** short 120–300ms state transitions; no essential information conveyed only through animation.
- **Imagery/iconography:** functional symbols and map markers; avoid decorative medical imagery.

## Components

- **AppHeader:** product identity, sidebar toggle, record-count/loading badge, refresh.
- **PollenPanel:** persistent page-level forecast region with desktop cards and a mobile disclosure summary.
- **FilterPanel / StatsPanel:** controls and aggregate information for plant records only.
- **Map:** plant locations, road/species groupings, map-specific legend, and explicit plant-data label.
- **StreetViewModal:** visual location verification and report entry points.
- **ContactPanel:** reporting and contact channels.

Component state and copy must use existing data contracts before introducing new API fields. Feature-specific PollenPanel behavior is defined by `docs/superpowers/specs/2026-09-26-pollen-map-data-separation-design.md`.

## Accessibility

- Target WCAG 2.1 AA for authored UI.
- Use semantic headings and sections for the forecast and map workspace.
- Mobile disclosure is a real button with `aria-expanded` and `aria-controls`.
- Maintain visible keyboard focus and at least 44px touch targets for primary controls where layout permits.
- Do not rely on risk color alone; always pair color with a text label.
- Loading and error copy remains readable without motion; respect reduced-motion preferences for nonessential transitions.

## Responsive behavior

- **Desktop/tablet above 768px:** the pollen region shows current region plus four category cards in one row; details remain expanded.
- **Mobile at 768px and below:** show region plus the highest active risk in a compact default-collapsed row; expanding reveals a 2×2 category grid and provenance.
- The plant map receives the remaining viewport height. The sidebar retains its existing collapsible mobile behavior.
- Browser resize must not permanently hide desktop details or force a mobile disclosure state onto desktop.

## Interaction states

- **No location:** persistent pollen region explains that location is needed and points to the existing location control.
- **Loading:** stable-height summary with loading copy; no layout jump.
- **Success:** region, category levels, reference date, and sources.
- **All offseason:** collapsed summary says “주요 꽃가루 비시즌.”
- **Partial upstream failure:** available categories remain visible; failed categories say “정보 없음,” not “비시즌.”
- **Error:** compact retry guidance; plant map remains functional.
- **Offline/slow network:** retain the pollen region and show availability state; never imply cached data is current without a date.

## Content voice

- Short, factual Korean with plain-language explanations.
- Preferred terms: “오늘의 꽃가루 위험지수,” “예보,” “기준일,” “비시즌,” “정보 없음,” “식물 위치·수종 지도.”
- Avoid “실시간 꽃가루” unless a future measured real-time source is actually introduced.
- Medical disclaimer remains calm and specific: reference information, not diagnosis.

## Implementation constraints

- React 19, Vite 8, CSS modules are not in use; follow existing component-level CSS files.
- Keep the existing `/api/pollen` response contract and map/data-loading pipeline unless an approved spec explicitly changes them.
- Large plant JSON files stay outside the service-worker precache.
- Changes require test-first component behavior, then full lint, Vitest, and production build verification.
- Avoid new dependencies for layout, disclosure, or date formatting.

## Open questions

- [ ] Confirm the production Naver Maps client key has referrer/domain restrictions. **Owner:** maintainer. **Impact:** deployment security, not the approved layout.
- [ ] Decide whether a future region selector should supplement location-based pollen lookup. **Owner:** product. **Impact:** users who deny location permission; outside the current feature scope.
