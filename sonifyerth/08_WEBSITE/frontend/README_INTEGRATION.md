# SonifyEarth premium UI — integration

Drop these over your frontend, same folder layout (index.html, css/, js/):

| File | Status |
|---|---|
| index.html | CHANGED: pages wrapped in `.route-page`, 5-link nav, fonts, 2 new includes. Every original `id` is kept. |
| css/premium.css | NEW: loaded after styles.css, holds the whole obsidian theme |
| css/styles.css | UNCHANGED |
| js/router.js | NEW: 5 pages (Overview, Technology, Explorer, Listen, Archive), no reload, shared playback state |
| js/hero_globe.js | NEW: 3D Earth + orbiting ISS hero (replaces the 2D orbit schematic) |
| js/app.js | CHANGED (3 small edits): imports hero_globe, `_initHeroOrbitScene()` delegates to it, 3 `scrollIntoView` calls go through `window.sonifyGo` |
| js/map_view.js, js/timeline_view.js | canvas background hex values only |
| js/data_adapter.js, js/inspector_view.js | UNCHANGED |

Not touched: 06_PROCESSED_DATA, 09_SOUND_ENGINE, your server.
Old URLs like `#page-map-explorer` still work.
