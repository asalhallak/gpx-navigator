# GPX Driving Prep

A focused web app for reviewing practical driving exam training routes from GPX files.

[Open the live app](https://asalhallak.github.io/gpx-navigator/)

## Tech Stack

- Vite + React + TypeScript for a small, fast single-page app.
- React Leaflet with OpenStreetMap tiles for an interactive map without API keys.
- Browser IndexedDB for local route persistence without a backend.
- Vitest for parser and route-stat tests.

## Current Features

- Upload one or more GPX files.
- Parse GPX tracks, routes, route points, track segments, and waypoints.
- Display the full route on an interactive OpenStreetMap map.
- Show start, end, and waypoint markers.
- Summarize route name, distance, point count, duration, and import time.
- Save imported routes locally in the browser.
- Simulate driving the route with car mode, play/pause, persistent play speed, step controls, map following, and route progress.
- Open the current simulated position in Google Street View for real-road preview.
- Load best-effort OpenStreetMap road cues for signals, crossings, roundabouts, speed-limit tags, priority controls, signs, and road types.

## Setup

Install dependencies:

```bash
pnpm install
```

Start the development server:

```bash
pnpm dev
```

Optional embedded Street View preview:

```bash
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key pnpm dev
```

Without a key, car mode still provides a Street View link for the current route point.

Run tests:

```bash
pnpm test
```

Build for production:

```bash
pnpm build
```

Preview the production build:

```bash
pnpm preview
```

## Smoke Test

1. Start the dev server with `pnpm dev`.
2. Open the app.
3. Import `public/sample-driving-route.gpx`.
4. Confirm the route line, start/end markers, waypoint markers, and route summary appear.
5. Refresh the page and confirm the saved route remains available.

## Roadmap

- Optional embedded Google Street View preview with `VITE_GOOGLE_MAPS_API_KEY`.
- More precise along-route filtering for OSM cues using map-matching instead of nearest recorded GPX point.
- Saved notes and custom exam reminders per route point.

## License

This project is licensed under the GNU Affero General Public License v3.0 or later (`AGPL-3.0-or-later`). See [LICENSE](LICENSE) for details.
