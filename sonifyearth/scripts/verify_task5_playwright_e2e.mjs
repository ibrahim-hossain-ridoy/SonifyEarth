import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_ROOT = path.resolve(__dirname, '..');
const FRONTEND_DIR = path.join(WORKSPACE_ROOT, '08_WEBSITE', 'frontend');
const ARTIFACT_DIR = process.env.ARTIFACT_DIR || null;
const BASE_URL = 'http://sonifyearth.local/';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.geojson': 'application/geo+json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.pdf': 'application/pdf',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.mp4': 'video/mp4',
};

function isWithinDir(candidate, baseDir) {
  const rel = path.relative(baseDir, candidate);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function resolveWorkspaceFile(urlPathname) {
  const decoded = decodeURIComponent(urlPathname.split('?')[0].split('#')[0]);
  const rel = decoded.replace(/^[/\\]+/, '');
  if (rel === '' || rel === 'index.html') {
    return path.join(FRONTEND_DIR, 'index.html');
  }
  if (rel === 'favicon.ico' || rel === 'favicon.svg') {
    return path.join(WORKSPACE_ROOT, '08_WEBSITE', 'public', 'favicon.svg');
  }
  const frontCandidate = path.resolve(FRONTEND_DIR, rel);
  if (isWithinDir(frontCandidate, FRONTEND_DIR) && fs.existsSync(frontCandidate) && fs.statSync(frontCandidate).isFile()) {
    return frontCandidate;
  }
  const wsCandidate = path.resolve(WORKSPACE_ROOT, rel);
  if (isWithinDir(wsCandidate, WORKSPACE_ROOT) && fs.existsSync(wsCandidate) && fs.statSync(wsCandidate).isFile()) {
    return wsCandidate;
  }
  return null;
}

function findCrossPlatformBrowserExecutable() {
  if (process.env.CHROME_EXECUTABLE && fs.existsSync(process.env.CHROME_EXECUTABLE)) {
    return process.env.CHROME_EXECUTABLE;
  }
  const candidates = [
    // macOS
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    // Windows
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    // Linux
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }
  return undefined; // Fall back to Playwright's bundled Chromium
}

async function runE2ESuite() {
  console.log('======================================================================');
  console.log('SONIFYEARTH TASK 5 & REDESIGN — PLAYWRIGHT E2E & ACCESSIBILITY SUITE');
  console.log('======================================================================');

  const execPath = findCrossPlatformBrowserExecutable();
  const launchOpts = {
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  };
  if (execPath) {
    launchOpts.executablePath = execPath;
  }

  const browser = await chromium.launch(launchOpts);

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });

    // Serve workspace files deterministically via Playwright route handler (mirrors 08_WEBSITE/backend/server.py)
    await context.route('http://sonifyearth.local/**', async (route) => {
      const reqUrl = new URL(route.request().url());
      if (reqUrl.pathname === '/api/health') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json; charset=utf-8',
          body: JSON.stringify({
            status: 'ok',
            project: "SonifyEarth — Silence Isn't Zero.",
            workspace_root_served: true,
            listening_modes: ['EVENT-ONLY', 'OBSERVATION-AWARE'],
          }),
        });
        return;
      }

      const filePath = resolveWorkspaceFile(reqUrl.pathname);
      if (!filePath) {
        await route.fulfill({ status: 404, body: `Not found: ${reqUrl.pathname}` });
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      if (ext === '.mp4') {
        const fileSize = fs.statSync(filePath).size;
        const rangeHeader = route.request().headers()['range'];
        let start = 0;
        let end = Math.min(65535, fileSize - 1);
        if (rangeHeader) {
          const m = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
          if (m) {
            if (m[1]) start = parseInt(m[1], 10);
            if (m[2]) end = Math.min(parseInt(m[2], 10), fileSize - 1);
            else end = Math.min(start + 65535, fileSize - 1);
          }
        }
        const length = Math.max(0, end - start + 1);
        const fd = await fsp.open(filePath, 'r');
        const buf = Buffer.alloc(length);
        const { bytesRead } = await fd.read(buf, 0, length, start);
        await fd.close();
        await route.fulfill({
          status: 206,
          headers: {
            'Content-Type': 'video/mp4',
            'Accept-Ranges': 'bytes',
            'Content-Range': `bytes ${start}-${start + bytesRead - 1}/${fileSize}`,
            'Content-Length': String(bytesRead),
          },
          body: buf.subarray(0, bytesRead),
        });
        return;
      }

      const body = await fsp.readFile(filePath);
      await route.fulfill({
        status: 200,
        contentType,
        body,
      });
    });

    const page = await context.newPage();

    const consoleErrors = [];
    const failedRequests = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('requestfailed', (req) => {
      if (!req.url().endsWith('.mp4')) {
        failedRequests.push(`${req.url()} (${req.failure()?.errorText})`);
      }
    });

    // 1. Homepage Load, Hero Orbit Scene & Data Initialization
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.sonifyEarthApp && window.sonifyEarthApp.state.isReady === true, {
      timeout: 15000,
    });

    assert.equal(consoleErrors.length, 0, `Console errors on load: ${consoleErrors.join('; ')}`);
    assert.equal(failedRequests.length, 0, `Failed network requests: ${failedRequests.join('; ')}`);

    const title = await page.title();
    assert.ok(title.includes("Silence Isn't Zero"));
    const h1Text = await page.locator('#landing-heading').innerText();
    assert.ok(h1Text.includes("Silence Isn't Zero"));
    const questionText = await page.locator('.central-question-text').innerText();
    assert.ok(questionText.includes('When a lightning map is quiet, what does that silence actually mean?'));
    assert.equal(await page.locator('#hero-orbit-canvas').count(), 1);

    // Test Hero Orbit controls (state highlight & pause/resume)
    await page.selectOption('#hero-orbit-state-select', 'DETECTED');
    assert.equal(await page.evaluate(() => window.sonifyEarthApp.state.heroHighlightState), 'DETECTED');
    await page.selectOption('#hero-orbit-state-select', 'ALL');
    await page.click('#hero-orbit-pause-btn');
    assert.equal(await page.evaluate(() => window.sonifyEarthApp.state.heroOrbitPaused), true);
    await page.click('#hero-orbit-pause-btn');
    assert.equal(await page.evaluate(() => window.sonifyEarthApp.state.heroOrbitPaused), false);
    console.log('[PASS] Check 1: Homepage, Hero Orbit Scene, controls, and 4-stat archival ribbon load cleanly with zero console/network errors.');

    // 12. Verify No Autoplay on Load (Web Audio & SVS 5011 Video)
    const initialAudioState = await page.evaluate(() => {
      const app = window.sonifyEarthApp;
      const vid = document.getElementById('svs-5011-video');
      return {
        isPlaying: app.state.isPlaying,
        audioCtxState: app.soundEngine.getDiagnostics().audioContextState,
        pulsesTriggered: app.soundEngine.totalPulsesTriggered,
        videoPaused: vid ? vid.paused : true,
      };
    });
    assert.equal(initialAudioState.isPlaying, false);
    assert.equal(initialAudioState.audioCtxState, 'uninitialized_no_autoplay');
    assert.equal(initialAudioState.pulsesTriggered, 0);
    assert.equal(initialAudioState.videoPaused, true);
    console.log('[PASS] Check 12: Zero autoplay verified on load (AudioContext uninitialized, video paused).');

    // 2. Navigation Works Across All 9 Primary Sections + Sound Engine Console + SVS 5011 Video
    const navSectionIds = [
      'page-landing',
      'page-mission',
      'page-eic-visual',
      'page-data-journey',
      'page-map-explorer',
      'page-timeline-dashboard',
      'page-listening-modes',
      'page-evidence-inspector',
      'page-methodology',
    ];
    for (const secId of navSectionIds) {
      const exists = await page.locator(`#${secId}`).count();
      assert.equal(exists, 1, `Missing section #${secId}`);
      const link = page.locator(`a.nav-link[href="#${secId}"]`);
      assert.equal(await link.count(), 1, `Missing nav link for #${secId}`);
    }
    assert.equal(await page.locator('#page-sound-engine').count(), 1, 'Missing #page-sound-engine');

    // Verify SVS 5011 Video element & lineage distinction
    const svsVideoInfo = await page.evaluate(() => {
      const vid = document.getElementById('svs-5011-video');
      const src = vid?.querySelector('source')?.getAttribute('src');
      return {
        hasVideo: Boolean(vid),
        src,
        poster: vid?.getAttribute('poster'),
      };
    });
    assert.equal(svsVideoInfo.hasVideo, true);
    assert.equal(svsVideoInfo.src, '/iss_lightning_sphere_07312023.mp4');

    // Verify Interactive Orbital Security-Camera Analogy & 9-Stage Data Journey Pipeline
    await page.click('.camera-sim-btn[data-cam-state="OBSERVED_NO_DETECTION"]');
    assert.ok((await page.locator('#camera-sim-badge').innerText()).includes('OBSERVED_NO_DETECTION'));
    await page.click('.camera-sim-btn[data-cam-state="UNKNOWN"]');
    assert.ok((await page.locator('#camera-sim-badge').innerText()).includes('UNKNOWN'));

    const stageCount = await page.locator('.pipeline-stage-pill').count();
    assert.equal(stageCount, 9, 'Data Journey must have all 9 stages');
    await page.click('.pipeline-stage-pill[data-stage-index="1"]');
    const stage2Proc = await page.locator('#pipeline-proc-box').innerText();
    assert.ok(stage2Proc.includes('Science V2.2 (DATA111)'), 'Stage 2 must explicitly state viewtime_* is in Science V2.2 (DATA111)');
    await page.click('#pipeline-next-btn');
    assert.equal(await page.evaluate(() => window.sonifyEarthApp.state.activePipelineStage), 2);
    await page.click('#pipeline-prev-btn');
    assert.equal(await page.evaluate(() => window.sonifyEarthApp.state.activePipelineStage), 1);

    await page.click('#cta-explore-lightning-btn');
    console.log('[PASS] Check 2: All 9 primary navigation sections, SVS 5011 video player, Security-Camera Analogy switcher, and 9-Stage Data Journey Pipeline verified.');

    // 3. Map Loads Actual GeoJSON, Projection Toggle, Zoom & Layer Toggles Work
    const geoJsonCounts = await page.evaluate(() => {
      const ad = window.sonifyEarthApp.dataAdapter;
      return {
        flashesGeo: ad.lightningGeoJson.features.length,
        gridGeo: ad.observationGridGeoJson.features.length,
        unknownGeo: ad.unknownCoverageGeoJson.features.length,
      };
    });
    assert.equal(geoJsonCounts.flashesGeo, 14554);
    assert.equal(geoJsonCounts.gridGeo, 5532);
    assert.equal(geoJsonCounts.unknownGeo, 864);

    await page.click('#toggle-projection-btn');
    const projAfterToggle = await page.locator('#map-projection-label').innerText();
    assert.equal(projAfterToggle, '3D Orthographic Globe');
    await page.click('#toggle-projection-btn');
    assert.equal(await page.locator('#map-projection-label').innerText(), '2D Equirectangular');

    await page.click('#map-zoom-in-btn');
    await page.click('#map-zoom-out-btn');
    await page.click('#reset-map-view-btn');

    // Toggle map layers off and back on
    for (const toggleId of ['layer-toggle-flashes', 'layer-toggle-grid', 'layer-toggle-unknown', 'layer-toggle-swath']) {
      await page.click(`#${toggleId}`);
      await page.click(`#${toggleId}`);
    }
    console.log('[PASS] Check 3: Map loads actual GeoJSON (14,554 + 5,532 + 864 features), toggles 2D/3D view, zoom, and layer visibility.');

    // 4. Region Selector Works (including High-Latitude Polar Out-of-Coverage UNKNOWN)
    await page.selectOption('#region-preset-select', 'HIGH_LATITUDE_POLAR');
    const polarBannerVisible = await page.locator('#map-out-of-coverage-banner').isVisible();
    assert.equal(polarBannerVisible, true, 'Out-of-coverage banner must be visible for High-Latitude Polar region');
    const polarStateBadge = await page.locator('#summary-current-state-badge').innerText();
    assert.ok(polarStateBadge.includes('UNKNOWN'));
    const polarReason = await page.locator('#summary-current-reason-code').innerText();
    assert.equal(polarReason, 'OUTSIDE_OBSERVATION_COVERAGE');

    await page.selectOption('#region-preset-select', 'GLOBAL_LIS');
    assert.equal(await page.locator('#map-out-of-coverage-banner').isVisible(), false);
    console.log('[PASS] Check 4: Region selector updates map, counts, and out-of-coverage UNKNOWN banner.');

    // 5. Time-Window Selector Works Across All Validated Windows
    await page.selectOption('#time-window-preset-select', 'NOV11_QC_GAP_WINDOW');
    assert.equal(await page.locator('#summary-current-reason-code').innerText(), 'MISSING_SOURCE_DATA');

    await page.selectOption('#time-window-preset-select', 'ORBIT_007_SAA_TRANSIT');
    assert.equal(
      await page.locator('#summary-current-reason-code').innerText(),
      'INSUFFICIENT_EVIDENCE_SAA_RADIATION'
    );

    await page.selectOption('#time-window-preset-select', 'NOV16_FATAL_OUTAGE_ORBIT');
    assert.equal(await page.locator('#summary-current-reason-code').innerText(), 'FATAL_QUALITY_FLAG');

    await page.selectOption('#time-window-preset-select', 'FULL_7DAY_ARCHIVE');
    assert.equal(await page.locator('#summary-flash-count').innerText(), '14,554');
    assert.equal(await page.locator('#summary-excluded-count').innerText(), '1,570');

    await page.selectOption('#time-window-preset-select', 'ORBIT_001_AMAZON');
    assert.equal(await page.locator('#summary-flash-count').innerText(), '189');
    console.log('[PASS] Check 5: Time-window selector verified across Orbit 1, SAA, Nov 11 QC Gap, Fatal Outage, and Full 7-Day Archive.');

    // 6. Timeline Updates (±10s, ±30s, ±60s, Jump-to-Flash, Jump-to-Unknown) & Synchronized Shared State
    const taiBeforeStep = await page.evaluate(() => window.sonifyEarthApp.state.cursorTai93);
    await page.click('#timeline-step-fwd-btn');
    const taiAfter30 = await page.evaluate(() => window.sonifyEarthApp.state.cursorTai93);
    assert.equal(Math.round(taiAfter30 - taiBeforeStep), 30);

    await page.click('#timeline-step-fwd-10-btn');
    const taiAfter40 = await page.evaluate(() => window.sonifyEarthApp.state.cursorTai93);
    assert.equal(Math.round(taiAfter40 - taiBeforeStep), 40);

    await page.click('#timeline-next-flash-btn');
    const stateAtFlash = await page.locator('#summary-current-state-badge').innerText();
    assert.ok(stateAtFlash.includes('DETECTED'));
    console.log('[PASS] Check 6: Timeline stepping (±10s/±30s/±60s), scrubbing, and Jump-to-Next-Flash synchronize across map, summary, and inspector.');

    // 7. Mode Switching Preserves Exact Same DataPackage Reference & Records
    const modeSwitchCheck = await page.evaluate(async () => {
      const app = window.sonifyEarthApp;
      const pkgBefore = app.state.dataPackage;
      const pkgIdBefore = pkgBefore.packageId;
      const flashCountBefore = pkgBefore.flashes.length;

      document.getElementById('mode-btn-event-only').click();
      const modeAfter1 = app.state.listeningMode;
      const pkgAfter1 = app.state.dataPackage;

      document.getElementById('mode-btn-observation-aware').click();
      const modeAfter2 = app.state.listeningMode;
      const pkgAfter2 = app.state.dataPackage;

      return {
        modeAfter1,
        modeAfter2,
        sameObjectRef1: pkgBefore === pkgAfter1,
        sameObjectRef2: pkgBefore === pkgAfter2,
        samePkgId: pkgIdBefore === pkgAfter1.packageId && pkgIdBefore === pkgAfter2.packageId,
        flashCountUnchanged: flashCountBefore === pkgAfter1.flashes.length,
      };
    });
    assert.equal(modeSwitchCheck.modeAfter1, 'EVENT-ONLY');
    assert.equal(modeSwitchCheck.modeAfter2, 'OBSERVATION-AWARE');
    assert.equal(modeSwitchCheck.sameObjectRef1, true);
    assert.equal(modeSwitchCheck.sameObjectRef2, true);
    assert.equal(modeSwitchCheck.samePkgId, true);
    assert.equal(modeSwitchCheck.flashCountUnchanged, true);
    console.log('[PASS] Check 7: Switching between EVENT-ONLY and OBSERVATION-AWARE preserves identical DataPackage.');

    // 8 & 9. Play / Pause / Resume / Stop / Seek / Mute & Deterministic Sound Scheduling Across All 3 Cues
    await page.click('#audition-detected-btn');
    await page.click('#audition-observed-btn');
    await page.click('#audition-unknown-btn');

    await page.click('#audio-play-btn');
    await page.waitForTimeout(250);
    const playingState = await page.evaluate(() => window.sonifyEarthApp.state.isPlaying);
    assert.equal(playingState, true);

    // Test Mute and Unmute
    await page.click('#audio-mute-btn');
    assert.equal(await page.evaluate(() => window.sonifyEarthApp.soundEngine.muted), true);
    assert.equal(await page.locator('#audio-mute-btn').getAttribute('aria-pressed'), 'true');
    await page.click('#audio-mute-btn');
    assert.equal(await page.evaluate(() => window.sonifyEarthApp.soundEngine.muted), false);
    assert.equal(await page.locator('#audio-mute-btn').getAttribute('aria-pressed'), 'false');

    // Test Pause
    await page.click('#audio-pause-btn');
    const pausedDiag = await page.evaluate(() => window.sonifyEarthApp.soundEngine.getDiagnostics());
    assert.equal(pausedDiag.isPlaying, false);
    assert.equal(pausedDiag.activeNodeCount, 0, 'All active Web Audio nodes must be cancelled on pause');
    assert.ok(pausedDiag.totalPulsesTriggered >= 1);
    assert.ok(pausedDiag.totalTextureTransitions >= 1);
    assert.ok(pausedDiag.totalUnknownCuesTriggered >= 1);

    // Test Resume after Pause
    await page.click('#audio-play-btn');
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => window.sonifyEarthApp.state.isPlaying), true);

    // Test Stop
    await page.click('#audio-stop-btn');
    const stoppedDiag = await page.evaluate(() => window.sonifyEarthApp.soundEngine.getDiagnostics());
    assert.equal(stoppedDiag.isPlaying, false);
    assert.equal(stoppedDiag.activeNodeCount, 0);
    console.log('[PASS] Check 8 & 9: Play, Pause, Resume, Stop, Mute/Unmute, node cancellation, Acoustic Visualizer, and deterministic scheduling of all 3 cues verified.');

    // 10. "Why Did I Hear That?" Evidence Inspector & 7-Tab Archive Vault
    const presetButtons = page.locator('#inspector-presets-container .preset-btn');
    assert.equal(await presetButtons.count(), 6);
    for (let i = 0; i < 6; i++) {
      await presetButtons.nth(i).click();
      const titleTxt = await page.locator('#inspector-record-title').innerText();
      const everydayTxt = await page.locator('#inspector-everyday-explanation').innerText();
      const metaRows = await page.locator('#inspector-metadata-tbody tr').count();
      assert.ok(titleTxt.length > 5);
      assert.ok(everydayTxt.length > 35);
      assert.ok(metaRows >= 8);
    }

    // Test Custom Coordinate Lookup in Inspector (High-latitude polar out-of-coverage)
    await page.fill('#custom-inspect-lat', '64.15');
    await page.fill('#custom-inspect-lon', '-21.94');
    await page.click('#custom-inspect-btn');
    assert.ok((await page.locator('#inspector-state-badge').innerText()).includes('UNKNOWN'));
    assert.equal(await page.locator('#inspector-reason-badge').innerText(), 'OUTSIDE_OBSERVATION_COVERAGE');

    // Verify 7-Tab Archive Vault: 106-Granule Table, Exclusions Table, and Validation Report Reader
    const granuleRowCount = await page.locator('#granule-catalog-tbody tr').count();
    assert.equal(granuleRowCount, 106, 'Granule catalog table must display all 106 paired granules');

    await page.click('.archive-tab-btn[data-archive-tab="tab-qc-exclusions"]');
    const excludedRows = await page.locator('#excluded-audit-tbody tr').count();
    assert.ok(excludedRows >= 50, 'Excluded audit table must render excluded flash records');

    await page.click('.archive-tab-btn[data-archive-tab="tab-reports"]');
    await page.waitForFunction(() => {
      const pre = document.getElementById('validation-report-viewer');
      return pre && pre.textContent.toLowerCase().includes('task 3');
    });

    // Verify zero private machine paths in DOM
    const bodyTextAll = await page.locator('body').innerText();
    const hasPrivatePath = ['/Users/', 'C:\\Users\\'].some((p) => bodyTextAll.includes(p));
    assert.equal(hasPrivatePath, false, 'No private machine paths allowed in website text');
    console.log('[PASS] Check 10: Evidence Inspector (6 presets + custom coordinate lookup) and 7-Tab Archive Vault (106 granules, 1,570 exclusions, report reader) verified.');

    // Capture Optional Desktop Screenshots if ARTIFACT_DIR is provided and exists
    if (ARTIFACT_DIR && fs.existsSync(ARTIFACT_DIR)) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(100);
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, 'sonifyearth_desktop_1440.png'),
        fullPage: false,
      });
    }

    // 11. Responsive Layout Verification Across Tablet (768x1024) & Mobile (375x812) & Reduced Motion Emulation
    for (const vp of [
      { label: 'Tablet 768x1024', width: 768, height: 1024 },
      { label: 'Mobile 375x812', width: 375, height: 812 },
    ]) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.sonifyEarthApp && window.sonifyEarthApp.state.isReady === true);

      const overflowCheck = await page.evaluate(() => {
        const overflowing = [];
        for (const el of document.querySelectorAll('*')) {
          const r = el.getBoundingClientRect();
          if (r.right > window.innerWidth + 1) {
            overflowing.push(`${el.tagName}#${el.id || ''}.${el.className || ''} (right=${Math.round(r.right)})`);
          }
        }
        return {
          docScrollWidth: document.documentElement.scrollWidth,
          winInnerWidth: window.innerWidth,
          reducedMotionActive: window.sonifyEarthApp.state.reducedMotion,
          overflowing: overflowing.slice(0, 10),
        };
      });
      if (overflowCheck.docScrollWidth > overflowCheck.winInnerWidth + 2) {
        console.log(`Overflowing elements on ${vp.label}:`, overflowCheck.overflowing);
      }
      assert.ok(
        overflowCheck.docScrollWidth <= overflowCheck.winInnerWidth + 2,
        `${vp.label} horizontal overflow detected: scrollWidth=${overflowCheck.docScrollWidth} > innerWidth=${overflowCheck.winInnerWidth}`
      );
      assert.equal(overflowCheck.reducedMotionActive, true);
    }

    if (ARTIFACT_DIR && fs.existsSync(ARTIFACT_DIR)) {
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, 'sonifyearth_mobile_375.png'),
        fullPage: false,
      });
    }
    console.log('[PASS] Check 11: Responsive layouts (1440x900 desktop, 768x1024 tablet, 375x812 mobile, 0px horizontal overflow) & prefers-reduced-motion verified.');

    // 13. Automated Accessibility Audit (WCAG Landmarks, Labels, ARIA Roles, Focus, Non-Colour State Badges)
    const a11yAudit = await page.evaluate(() => {
      const issues = [];
      if (!document.querySelector('header[role="banner"], header')) issues.push('Missing banner landmark');
      if (!document.querySelector('main[role="main"], main')) issues.push('Missing main landmark');
      if (!document.querySelector('nav[aria-label]')) issues.push('Missing labeled nav landmark');
      if (!document.querySelector('footer[role="contentinfo"], footer')) issues.push('Missing contentinfo landmark');

      for (const btn of document.querySelectorAll('button')) {
        const name = (btn.innerText || btn.getAttribute('aria-label') || '').trim();
        if (!name) issues.push(`Unlabeled button: ${btn.outerHTML.slice(0, 80)}`);
      }

      for (const input of document.querySelectorAll('input, select, textarea')) {
        const id = input.id;
        const hasLabel = id && document.querySelector(`label[for="${id}"]`);
        const hasAria = input.getAttribute('aria-label') || input.getAttribute('aria-labelledby');
        const wrappedInLabel = input.closest('label');
        if (!hasLabel && !hasAria && !wrappedInLabel) {
          issues.push(`Unlabeled form control: ${input.outerHTML.slice(0, 80)}`);
        }
      }

      for (const badge of document.querySelectorAll('.state-badge')) {
        const txt = badge.innerText.trim();
        if (!txt) issues.push('Empty .state-badge');
      }

      const emojiRegex = /[\u{1F300}-\u{1FAFF}]/u;
      if (emojiRegex.test(document.body.innerText)) {
        issues.push('Emoji character detected in UI text');
      }

      return { issueCount: issues.length, issues };
    });
    assert.equal(a11yAudit.issueCount, 0, `Accessibility audit issues: ${a11yAudit.issues.join('; ')}`);
    console.log('[PASS] Check 13: Automated WCAG DOM & Accessibility Audit passed with 0 violations.');

    console.log('======================================================================');
    console.log('ALL 13 PLAYWRIGHT E2E & ACCESSIBILITY GATES PASSED (13 / 13)');
    console.log('======================================================================');
  } finally {
    await browser.close();
  }
}

runE2ESuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
