/**
 * @file app.js
 * @description Central Application Orchestrator & Shared Playback Controller
 * for SonifyEarth — Silence Isn't Zero. (NASA Space Apps Challenge 2026).
 *
 * Unifies:
 * - SonifyEarthDataAdapter (actual Task 4 JSON/GeoJSON & Listening Mode Compatibility Adapter)
 * - Hero Animated Earth-and-Orbit Scene (#hero-orbit-canvas)
 * - Interactive Orbital Security-Camera Analogy (#page-mission)
 * - Interactive 9-Stage NASA Satellite-to-Sound Pipeline (#page-data-journey)
 * - GlobalLisMapView (Section 5 interactive GeoJSON map & 3D globe)
 * - SynchronizedTimelineView (Section 6 multi-track orbital timeline)
 * - SonifyEarthSoundEngine & Acoustic Visualizer (Section 7 Web Audio API synthesizer)
 * - EvidenceInspectorView (Section 8 "Why Did I Hear That?" provenance inspector)
 * - 7-Tab Scientific Archive, 106-Granule Browser, Exclusions Explorer & Report Reader (Section 9)
 *
 * All components read from ONE shared playback state without drifting timers or autoplay.
 */

import {
  SonifyEarthDataAdapter,
  tai93ToUtcIso,
} from './data_adapter.js';
import { GlobalLisMapView } from './map_view.js';
import { SynchronizedTimelineView } from './timeline_view.js';
import { EvidenceInspectorView } from './inspector_view.js';
import { HeroOrbitGlobe } from './hero_globe.js';
import { SonifyEarthSoundEngine } from '../09_SOUND_ENGINE/playback/sound_engine.js';

const PIPELINE_STAGES = [
  {
    index: 0,
    badge: 'STAGE 01 OF 09 · ORBITAL HARDWARE',
    title: 'Stage 1: NASA ISS Lightning Imaging Sensor (LIS) Instrument',
    summary:
      'High-speed 128×128 pixel Charge-Coupled Device (CCD) optical imaging array aboard the International Space Station detecting narrow-band 777.4 nm atomic oxygen lightning emissions at ~2 ms frame intervals (~500 frames/s).',
    input:
      'Optical cloud-top photon emissions at 777.4 nm + spacecraft GPS/attitude ephemeris at ~400 km altitude (51.6° orbital inclination).',
    info:
      '~550 km × 550 km field of view (~4 km nadir pixel resolution), viewing any ground cell for ~80–95 s per orbit across [-55.75°, +55.25°] latitude.',
    proc:
      'Real-time background subtraction removes bright sunlit cloud tops to isolate millisecond optical lightning transients (~69% noon to ~88% night detection efficiency).',
    why:
      'Because the camera moves at 7.66 km/s, it observes only a tiny fraction of Earth at any moment—establishing why unviewed areas must never be called "zero lightning."',
    output:
      '106 orbital granules of Level 2 Science (DATA111) and Level 1B Backgrounds (DATA211) during the final operational week (Nov 9–16, 2023).',
    presetIndex: 0,
  },
  {
    index: 1,
    badge: 'STAGE 02 OF 09 · SCIENCE V2.2 (DATA111)',
    title: 'Stage 2: NASA ISS LIS Science V2.2 (DOI: 10.5067/LIS/ISSLIS/DATA111)',
    summary:
      '106 Final Quality Controlled (FIN) NetCDF-4 (.nc) and 106 HDF-4 (.hdf) granules containing both the 4-level optical lightning hierarchy AND the 0.5° × 0.5° gridded observation duration (viewtime_*) arrays.',
    input:
      '106 ISS_LIS_SC_V2.2_*_FIN.nc files (Nov 9, 2023 22:52:12Z to Nov 16, 2023 21:17:00Z actual telemetry).',
    info:
      '549,106 events → 144,611 groups → 16,124 raw flashes → 2,469 areas, plus 4,160,874 viewtime_* 0.5° cell passes and 587,941 one_second_* housekeeping records.',
    proc:
      'Task 2.1 Scientific Audit verified that viewtime_lat, viewtime_lon, viewtime_start, viewtime_end, viewtime_effective_obs, and viewtime_alert_flag reside in Science V2.2 (DATA111), not in Backgrounds V2.2.',
    why:
      'Having both flash detections and 0.5° viewtime duration inside Science V2.2 allows exact point-in-cell spatial matching (100% within <= 0.5°) within every orbit.',
    output:
      '16,124 candidate flash records and 4,160,874 gridded viewtime observation records ready for bitmask and SAA quality verification.',
    presetIndex: 0,
  },
  {
    index: 2,
    badge: 'STAGE 03 OF 09 · BACKGROUNDS V2.2 (DATA211)',
    title: 'Stage 3: NASA ISS LIS Backgrounds V2.2 (DOI: 10.5067/LIS/ISSLIS/DATA211)',
    summary:
      '106 Final Quality Controlled (FIN) NetCDF-4 (.nc) and 106 HDF-4 (.hdf) granules recording 1-second spacecraft attitude, solar/glint geometry, external radiation alerts, and 128×128 raw optical background images.',
    input:
      '106 ISS_LIS_BG_V2.2_*_FIN.nc files paired 1:1 with the 106 Science V2.2 granules.',
    info:
      '587,941 1-second bg_info_* telemetry vectors (position, attitude, instrument/platform/external/processing alerts) and 10,660 128×128 raw background scenes.',
    proc:
      'Extracts 1-second South Atlantic Anomaly (SAA) external radiation alert flags (bg_info_external_alert & 0x03) and spacecraft nadir track keyframes across all 106 orbits.',
    why:
      'Backgrounds V2.2 reveals the exact seconds when the spacecraft traversed the South Atlantic Anomaly (18,571 s across 47 windows) or experienced fatal telemetry outages (8,232 s).',
    output:
      '587,941 second-by-second radiation and platform health masks + 2,350 orbital swath keyframes.',
    presetIndex: 2,
  },
  {
    index: 3,
    badge: 'STAGE 04 OF 09 · QUALITY CONTROL & TAI93→UTC',
    title: 'Stage 4: Bitmask Quality Control (0x55 vs. 0xAA) & Leap-Second TAI93→UTC',
    summary:
      'Decodes NASA 8-bit alert flags into fatal odd bits (0x55) versus informational warning even bits (0xAA), verifies solar glint compliance, and converts elapsed TAI93 seconds to UTC.',
    input:
      'lightning_flash_alert_flag, viewtime_alert_flag, one_second_*_alert, bg_info_*_alert, glint_index, and TAI93 timestamps.',
    info:
      'Fatal odd-bit mask 0x55 = 0b01010101 (0x01 instrument, 0x04 platform, 0x10 external, 0x40 processing) vs. warning even-bit mask 0xAA = 0b10101010.',
    proc:
      'Applies UTC = Epoch(1993-01-01T00:00:00Z) + (TAI93 − 10.0 s) accounting for the 10 leap seconds added between Jan 1993 (TAI−UTC=27s) and Nov 2023 (TAI−UTC=37s).',
    why:
      'Prevents discarding valid warning-only observations while guaranteeing 0.000000 s timestamp alignment against official NASA UTC metadata across all 106 granules.',
    output:
      'Bit-verified quality masks and microsecond-accurate UTC timestamps for every flash, viewtime cell, and 1-second record.',
    presetIndex: 4,
  },
  {
    index: 4,
    badge: 'STAGE 05 OF 09 · PAIRING, SAA & GAP AUDIT',
    title: 'Stage 5: 106-Granule Pairing, Nov 11 QC Gap & Conservative SAA Policy',
    summary:
      'Cross-matches all 106 Science and Backgrounds granule pairs, isolates the Nov 11 NASA QC deleted-orbit gap, and enforces Decision 1 conservative SAA radiation handling.',
    input:
      '106 paired Science & Backgrounds granules spanning 2023-11-09T22:52:12.400Z to 2023-11-16T21:17:00.000Z.',
    info:
      '104 continuous orbit transitions (0.0–0.8 s), 1 documented Nov 11 QC gap (5,519.2 s), 47 SAA windows (18,571 s), and 10 contiguous fatal outage windows (8,232 s).',
    proc:
      'Audits all 1,570 excluded flashes (1,465 SAA-only + 21 fatal+SAA + 84 fatal-only [100 Class 1 isolated 1s framing-toggle + 5 contiguous fatal]) and 71 boundary-cell flashes in 17 cells.',
    why:
      'Trapped proton flux in the SAA elevates optical false alarms; conservatively reclassifying SAA intervals to UNKNOWN prevents false detections and false "calm sky" claims.',
    output:
      '14,554 confirmed flashes, 1,570 audited excluded records in excluded_records_audit.json, and 107 orbital/gap timeline windows.',
    presetIndex: 3,
  },
  {
    index: 5,
    badge: 'STAGE 06 OF 09 · THREE-STATE ENGINE',
    title: 'Stage 6: Deterministic Three-State Scientific Classification',
    summary:
      'Classifies every observation interval and 0.5° × 0.5° grid cell pass into DETECTED, OBSERVED_NO_DETECTION, or UNKNOWN with five explicit reason codes.',
    input:
      '14,554 confirmed flashes, 4,160,874 viewtime cell passes, and 259,200 global 0.5° × 0.5° grid cells.',
    info:
      'Decision 3 baseline threshold viewtime_effective_obs > 0.0 s (min positive = 0.040 s = 20 CCD frames at 500 Hz) preserves 100% of clean swath-perimeter observations.',
    proc:
      'Assigns 5,146 viewtime passes to DETECTED, 3,994,260 quiet passes to OBSERVED_NO_DETECTION, and 161,468 SAA passes (plus 98,640 unviewed polar cells) to UNKNOWN.',
    why:
      'Replaces the misleading binary "flash vs. blank map" model with a rigorous three-state epistemic model where silence is never conflated with zero lightning.',
    output:
      'three_state_data.json containing complete state definitions, sensitivity matrices (>0.0s, >0.1s, >1.0s), and 10 sub-second perimeter benchmark records.',
    presetIndex: 1,
  },
  {
    index: 6,
    badge: 'STAGE 07 OF 09 · VISUAL MAP & TIMELINE',
    title: 'Stage 7: Normalized WGS84 GeoJSON & Multi-Track Orbital Timeline',
    summary:
      'Generates website-ready JSON and EPSG:4326 GeoJSON FeatureCollections that drive the synchronized 2D/3D Global Explorer and 3-track orbital timeline.',
    input:
      'Validated three-state records from 04_DATA_PROCESSING/scripts/build_production_data.py.',
    info:
      'lightning_events.geojson (14,554 points), observation_grid.geojson (5,532 0.5° polygons: 2,927 DETECTED + 2,605 OBSERVED_NO_DETECTION), unknown_coverage.geojson (864 features).',
    proc:
      'Binds spatial layers and 2,350 swath keyframes to a single shared DataPackage and TAI93 cursor clock across all visual and acoustic views.',
    why:
      'Ensures that clicking any flash marker, 0.5° grid cell, or timeline bar immediately resolves the exact same underlying NASA record.',
    output:
      'Interactive 2D Equirectangular & 3D Orthographic Globe + synchronized 3-track timeline scrubber.',
    presetIndex: 1,
  },
  {
    index: 7,
    badge: 'STAGE 08 OF 09 · WEB AUDIO SOUND ENGINE',
    title: 'Stage 8: Browser-Native Web Audio API Synthesizer & Two Listening Modes',
    summary:
      'Synthesizes deterministic, non-overlapping acoustic cues in real time using the browser Web Audio API across EVENT-ONLY and OBSERVATION-AWARE modes.',
    input:
      'Active shared DataPackage + real-time TAI93 cursor state (DETECTED, OBSERVED_NO_DETECTION, or UNKNOWN).',
    info:
      'DETECTED: 65 ms 880→440 Hz pulse; OBSERVED_NO_DETECTION: 220/330 Hz harmonic bed + 360 Hz band-passed texture; UNKNOWN: 528 Hz → 396 Hz neutral two-part chime.',
    proc:
      'Enforces uniform flash pulse gain (so radiance is never mapped to storm severity) and caps high-density bursts (>25 flashes/s) at 18 pulses/s while displaying true counts.',
    why:
      'Allows listeners to hear the stark difference between traditional EVENT-ONLY sonification and epistemically honest OBSERVATION-AWARE sonification.',
    output:
      'Real-time Web Audio synthesis, live acoustic waveform visualization, and synchronous text transcript.',
    presetIndex: 0,
  },
  {
    index: 8,
    badge: 'STAGE 09 OF 09 · EVIDENCE INSPECTOR',
    title: 'Stage 9: "Why Did I Hear That?" Record-Level NASA Evidence Inspector',
    summary:
      'Traces every single sound cue and map feature back to its exact NASA NetCDF-4 filename, array index, TAI93/UTC timestamp, coordinates, viewtime duration, and bitmask flags.',
    input:
      'Any clicked map feature, timeline interval, excluded flash record, or benchmark preset from REAL_STATE_EXAMPLES.json.',
    info:
      'Level 1 plain-language explanation of what the satellite saw and why that sound played + Level 2 expandable bit-level NetCDF metadata table.',
    proc:
      'Cross-references flash_events.json, observation_windows.json, sonifyearth_windows.json, and excluded_records_audit.json in real time.',
    why:
      'Guarantees 100% scientific auditability during NASA Space Apps judging—every sound is backed by verifiable spacecraft telemetry.',
    output:
      'Two-level human + technical provenance inspector with one-click cue audition.',
    presetIndex: 5,
  },
];

const CAMERA_ANALOGY_STATES = {
  DETECTED: {
    badgeClass: 'state-badge state-badge-detected',
    badgeText: '◆ DETECTED',
    metric: '14,554 Confirmed Flashes (5,146 Viewtime Cell Passes)',
    headline: 'Camera Pointed at Hallway — Optical Flash Verified',
    body: 'The ISS LIS 128×128 CCD array (777.4 nm oxygen line) was actively pointing at this 0.5° × 0.5° cell with clean telemetry (fatal bitmask 0x55 == 0, non-glint, outside SAA radiation) and captured a confirmed optical lightning flash.',
    soundDesc: 'Sound Cue: Short percussive pulse (880 → 440 Hz, 65 ms)',
    soundColor: 'var(--state-detected)',
    presetIndex: 0,
  },
  OBSERVED_NO_DETECTION: {
    badgeClass: 'state-badge state-badge-observed',
    badgeText: '◎ OBSERVED_NO_DETECTION',
    metric: '3,994,260 Verified Quiet 0.5° Cell Passes (viewtime > 0.0 s)',
    headline: 'Camera Pointed at Hallway — Actively Watched, Zero Flashes',
    body: 'The security camera was turned on, healthy (viewtime_alert_flag & 0x55 == 0), outside the South Atlantic Anomaly, and watched this 0.5° × 0.5° region for up to ~95 seconds (minimum 0.040 s = 20 CCD frames)—confirming zero optical flashes occurred.',
    soundDesc: 'Sound Cue: Sustained observation texture (220/330 Hz + 360 Hz band)',
    soundColor: 'var(--state-observed)',
    presetIndex: 1,
  },
  UNKNOWN: {
    badgeClass: 'state-badge state-badge-unknown',
    badgeText: '⊘ UNKNOWN',
    metric: '161,468 SAA Passes · 1,570 Excluded Flashes · 98,640 Polar Cells',
    headline: 'Camera Pointed Elsewhere, Radiation-Blinded, or Offline',
    body: 'Either the ISS was on another part of its orbit (or poleward of ±54°), or trapped protons in the South Atlantic Anomaly (47 transits / 18,571 s), fatal telemetry flags (8,232 s), or the Nov 11 QC gap (5,519.2 s) prevented reliable observation. Never call this "zero lightning."',
    soundDesc: 'Sound Cue: Distinct neutral two-part cue (528 Hz → 396 Hz) + reason code',
    soundColor: 'var(--state-unknown)',
    presetIndex: 3,
  },
};

export class SonifyEarthApplication {
  constructor() {
    this.dataAdapter = new SonifyEarthDataAdapter();
    this.soundEngine = new SonifyEarthSoundEngine({
      initialVolume: 0.75,
      initialMuted: false,
      onCueTriggered: (cueEntry) => {
        this._appendTranscriptEntry(cueEntry);
        this._lastTriggeredCue = {
          entry: cueEntry,
          timeMs: performance.now(),
        };
      },
    });

    this.state = {
      isReady: false,
      regionPresetId: 'GLOBAL_LIS',
      timeWindowPresetId: 'ORBIT_001_AMAZON',
      customGranuleId: '',
      listeningMode: 'OBSERVATION-AWARE',
      dataPackage: null,
      cursorTai93: 973723942.4,
      cursorStateInfo: null,
      isPlaying: false,
      playbackSpeed: 60,
      activePipelineStage: 0,
      activeCameraAnalogyState: 'DETECTED',
      heroHighlightState: 'ALL',
      heroOrbitPaused: false,
      reducedMotion:
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      reducedMotionForced: false,
    };

    this._rafId = null;
    this._lastFrameTimeMs = null;
    this._heroRafId = null;
    this._heroAngleRad = 0.45;
    this._visualizerPhase = 0;
    this._lastTriggeredCue = null;

    this.mapView = null;
    this.timelineView = null;
    this.inspectorView = null;
  }

  async init() {
    const loadBanner = document.getElementById('data-load-banner');
    try {
      this._initSubViews();
      this._bindControls();
      this._initHeroOrbitScene();
      this._renderPipelineStage(0);
      this._renderSoundVisualizerFrame();

      await this.dataAdapter.loadAllData(({ completed, total, key }) => {
        if (loadBanner) {
          loadBanner.innerHTML = `Loading validated NASA ISS LIS V2.2 production data (<code>${completed}/${total}</code>: <code>${key}</code>)…`;
        }
      });

      this._populateSelectorsAndCensus();
      this._populateArchiveVaultTables();

      // Build initial shared DataPackage (Global LIS + Orbit 1 default)
      this.applySelection({
        regionPresetId: this.state.regionPresetId,
        timeWindowPresetId: this.state.timeWindowPresetId,
        focusMap: false,
      });

      // Populate and select the first verified NASA anchor record in "Why Did I Hear That?"
      const examples = this.dataAdapter.getVerifiedExamples();
      if (this.inspectorView && examples.length > 0) {
        this.inspectorView.renderPresets(examples);
        this.inspectorView.inspectItem(examples[0]);
      }

      // Load default validation report into Tab 6 reader
      this._loadValidationReportText('./07_PROJECT_REPORTS/validation/TASK_3_FINAL_SCIENTIFIC_VALIDATION.md');

      this.state.isReady = true;
      if (loadBanner) {
        loadBanner.innerHTML = `
          <strong>Verified NASA ISS LIS V2.2 Production Data Connected:</strong>
          <code>106</code> paired Science &amp; Backgrounds granules ·
          <code>14,554</code> confirmed <code>DETECTED</code> flashes ·
          <code>1,570</code> audited exclusions ·
          <code>4,160,874</code> reconciled <code>viewtime</code> records ·
          Listening Modes: <code>EVENT-ONLY</code> &amp; <code>OBSERVATION-AWARE</code> (No Autoplay).
        `;
      }
      this._announceToScreenReader(
        'SonifyEarth NASA ISS LIS V2.2 dataset loaded. 14,554 confirmed flashes across 106 granules ready for exploration.'
      );
    } catch (err) {
      console.error('SonifyEarth data initialization error:', err);
      if (loadBanner) {
        loadBanner.style.borderColor = '#f87171';
        loadBanner.style.background = 'rgba(239, 68, 68, 0.15)';
        loadBanner.innerHTML = `
          <strong>Data Unavailable State:</strong> Could not load processed NASA JSON/GeoJSON from <code>06_PROCESSED_DATA/</code> (${err.message || err}). Ensure the workspace HTTP server is running and Task 4 outputs are intact.
        `;
      }
    }
  }

  _initSubViews() {
    const mapCanvas = document.getElementById('global-lis-canvas');
    this.mapView = new GlobalLisMapView(mapCanvas, {
      dataAdapter: this.dataAdapter,
      onFeatureInspected: (record) => {
        if (this.inspectorView) {
          const ev = this.inspectorView.inspectItem(record);
          if (ev) {
            this._announceToScreenReader(
              `Inspected ${ev.state} record (${ev.reasonCode}): ${ev.title}`
            );
          }
        }
      },
    });

    const timelineCanvas = document.getElementById('synchronized-timeline-canvas');
    this.timelineView = new SynchronizedTimelineView(timelineCanvas, {
      onSeekTai93: (targetTai93) => {
        this.seekToTai93(targetTai93, { triggerImmediateStateCheck: true });
      },
    });

    this.inspectorView = new EvidenceInspectorView({
      dataAdapter: this.dataAdapter,
      onAuditionRecord: async (evidence) => {
        await this.soundEngine.previewApprovedCue(evidence.state, evidence.rawRecord || {});
        this._updateAudioDiagnosticsUi();
        this._renderSoundVisualizerFrame();
      },
      onPresetSelected: (example) => {
        const targetTai =
          example.tai93_flash_timestamp ??
          example.tai93_timestamp ??
          (Array.isArray(example.tai93_viewtime_interval)
            ? example.tai93_viewtime_interval[0]
            : Array.isArray(example.tai93_interval)
            ? example.tai93_interval[0]
            : null);

        if (typeof targetTai === 'number' && this.state.dataPackage) {
          if (
            targetTai >= this.state.dataPackage.tai93Start &&
            targetTai <= this.state.dataPackage.tai93End
          ) {
            this.seekToTai93(targetTai, { triggerImmediateStateCheck: false });
          }
        }
      },
    });
  }

  /**
   * Hero scene (#hero-orbit-canvas): interactive 3D Earth with the ISS orbiting at 51.6°,
   * LIS camera frustum + swath, DETECTED flashes, SAA and polar UNKNOWN zones.
   * Implemented in ./hero_globe.js. Idempotent: calling it again just re-syncs motion.
   */
  _initHeroOrbitScene() {
    const canvas = document.getElementById('hero-orbit-canvas');
    if (!canvas) return;
    if (!this._heroGlobe) {
      this._heroGlobe = new HeroOrbitGlobe(canvas, {
        getState: () => ({
          highlight: this.state.heroHighlightState,
          paused: this.state.heroOrbitPaused,
          reducedMotion: this.state.reducedMotion,
          reducedMotionForced: this.state.reducedMotionForced,
        }),
      });
      this._drawHeroFrameOnce = () => this._heroGlobe.syncMotion();
    }
    this._heroGlobe.syncMotion();
  }

  /**
   * Renders a stage of the 9-Stage NASA Satellite-to-Sound Pipeline (#page-data-journey).
   */
  _renderPipelineStage(stageIndex) {
    const idx = Math.max(0, Math.min(PIPELINE_STAGES.length - 1, Number(stageIndex) || 0));
    this.state.activePipelineStage = idx;
    const stage = PIPELINE_STAGES[idx];

    const pills = document.querySelectorAll('.pipeline-stage-pill');
    pills.forEach((pill) => {
      const pIdx = Number(pill.getAttribute('data-stage-index'));
      const isSelected = pIdx === idx;
      pill.classList.toggle('active', isSelected);
      pill.setAttribute('aria-selected', isSelected ? 'true' : 'false');
    });

    const setTxt = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setTxt('pipeline-stage-badge', stage.badge);
    setTxt('pipeline-stage-title', stage.title);
    setTxt('pipeline-stage-summary', stage.summary);
    setTxt('pipeline-input-box', stage.input);
    setTxt('pipeline-info-box', stage.info);
    setTxt('pipeline-proc-box', stage.proc);
    setTxt('pipeline-why-box', stage.why);
    setTxt('pipeline-output-box', stage.output);
  }

  /**
   * Renders the Live Synchronized Acoustic Visualizer (#sound-visualizer-canvas)
   */
  _renderSoundVisualizerFrame() {
    const canvas = document.getElementById('sound-visualizer-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = '#080a0d';
    ctx.fillRect(0, 0, w, h);

    // Subtle grid lines
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.5);
    ctx.lineTo(w, h * 0.5);
    ctx.stroke();

    const mode = this.state.listeningMode;
    const curState = this.state.cursorStateInfo?.state || 'OBSERVED_NO_DETECTION';
    const isPlaying = this.state.isPlaying;
    const recentCue =
      this._lastTriggeredCue && performance.now() - this._lastTriggeredCue.timeMs < 1200
        ? this._lastTriggeredCue.entry
        : null;
    const activeVisualState = recentCue?.state || curState;

    if (!this.state.reducedMotion && !this.state.reducedMotionForced && isPlaying) {
      this._visualizerPhase += 0.16;
    }

    // Draw state-specific waveform signature
    ctx.save();
    if (activeVisualState === 'DETECTED') {
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let x = 0; x < w; x += 3) {
        const norm = (x - w * 0.5) / (w * 0.18);
        const env = Math.exp(-norm * norm * 3.5);
        const y =
          h * 0.5 +
          Math.sin(x * 0.22 + this._visualizerPhase * 2) * (h * 0.38) * env;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    } else if (activeVisualState === 'OBSERVED_NO_DETECTION') {
      const silentInEventOnly = mode === 'EVENT-ONLY';
      ctx.strokeStyle = silentInEventOnly ? 'rgba(56, 189, 248, 0.35)' : '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x < w; x += 4) {
        const amp = silentInEventOnly ? 2 : isPlaying || recentCue ? 18 : 8;
        const y =
          h * 0.5 +
          Math.sin(x * 0.035 + this._visualizerPhase) * amp +
          Math.cos(x * 0.08 - this._visualizerPhase * 0.7) * (amp * 0.45);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    } else {
      // UNKNOWN two-part neutral cue (528 Hz -> 396 Hz)
      const silentInEventOnly = mode === 'EVENT-ONLY';
      ctx.strokeStyle = silentInEventOnly ? 'rgba(192, 132, 252, 0.4)' : '#c084fc';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      for (let x = 0; x < w; x += 4) {
        const freq = x < w * 0.5 ? 0.075 : 0.052;
        const amp = silentInEventOnly ? 3 : 20;
        const y = h * 0.5 + Math.sin(x * freq + this._visualizerPhase) * amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();

    // Overlay HUD text on visualizer
    ctx.font = '600 11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#cbd5e1';
    const modeNote =
      mode === 'EVENT-ONLY' && activeVisualState !== 'DETECTED'
        ? ' (Silent in EVENT-ONLY; Visual Badge Preserved)'
        : '';
    ctx.fillText(
      `Mode: ${mode} | Cursor State: ${activeVisualState}${modeNote}`,
      12,
      20
    );
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(
      '◆ 880→440Hz Pulse (DETECTED)   ◎ 220/330Hz Texture (OBSERVED)   ⊘ 528→396Hz Chime (UNKNOWN)',
      12,
      h - 10
    );
  }

  _populateSelectorsAndCensus() {
    const manifest = this.dataAdapter.sourceManifest;
    const totals = manifest?.aggregate_source_totals || {};
    const obsCensus = this.dataAdapter.observationWindowsData?.global_observation_census || {};
    const winBounds = this.dataAdapter.sonifyearthWindowsData?.timeline_bounds || {};

    const setTxt = (id, val) => {
      const el = document.getElementById(id);
      if (el && val !== undefined && val !== null) el.textContent = String(val);
    };

    setTxt(
      'hero-metric-confirmed-flashes',
      (totals.total_confirmed_valid_flashes ?? 14554).toLocaleString()
    );
    setTxt('hero-metric-raw-flashes', (totals.total_raw_flashes ?? 16124).toLocaleString());
    setTxt(
      'hero-metric-excluded-flashes',
      (totals.total_excluded_flashes ?? 1570).toLocaleString()
    );
    setTxt(
      'hero-metric-observed-passes',
      (obsCensus.observed_no_detection_cell_passes_baseline ?? 3994260).toLocaleString()
    );
    setTxt(
      'hero-metric-unknown-passes',
      (obsCensus.saa_affected_viewtime_records_unknown ?? 161468).toLocaleString()
    );
    setTxt('hero-metric-saa-windows', winBounds.total_saa_windows ?? 47);
    setTxt('hero-metric-fatal-windows', winBounds.total_contiguous_fatal_windows ?? 10);
    setTxt('hero-metric-qc-gaps', manifest?.mission_temporal_coverage?.documented_qc_gaps ?? 1);
    setTxt(
      'hero-metric-granule-pairs',
      `${manifest?.mission_temporal_coverage?.total_paired_granules ?? 106} Pairs`
    );

    // GeoJSON Layer Counts
    setTxt(
      'layer-count-flashes',
      (this.dataAdapter.lightningGeoJson?.features?.length ?? 14554).toLocaleString()
    );
    setTxt(
      'layer-count-grid',
      (this.dataAdapter.observationGridGeoJson?.features?.length ?? 5532).toLocaleString()
    );
    setTxt(
      'layer-count-unknown',
      (this.dataAdapter.unknownCoverageGeoJson?.features?.length ?? 864).toLocaleString()
    );

    // Compatibility Adapter Raw Identifiers Display
    const compatReport = this.dataAdapter.modeCompatibilityReport;
    if (compatReport) {
      setTxt(
        'compat-raw-identifiers',
        JSON.stringify(compatReport.rawTask4ListeningModes)
      );
    }

    // Populate Region Selector
    const regionSelect = document.getElementById('region-preset-select');
    if (regionSelect) {
      regionSelect.innerHTML = this.dataAdapter
        .getRegionPresets()
        .map((r) => `<option value="${r.id}">${r.label}</option>`)
        .join('');
      regionSelect.value = this.state.regionPresetId;
    }

    // Populate Time-Window Selector
    const windowSelect = document.getElementById('time-window-preset-select');
    if (windowSelect) {
      windowSelect.innerHTML = this.dataAdapter
        .getTimeWindowPresets()
        .map((t) => `<option value="${t.id}">${t.label}</option>`)
        .join('');
      windowSelect.value = this.state.timeWindowPresetId;
    }

    // Populate 106 Granule Quick-Select
    const granuleSelect = document.getElementById('granule-quick-select');
    if (granuleSelect && manifest?.granule_pairs) {
      const opts = ['<option value="">— Keep Selected Time-Window Preset —</option>'];
      for (const gp of manifest.granule_pairs) {
        const fCount = gp.record_counts?.confirmed_valid_flashes ?? 0;
        const saaSec = gp.record_counts?.saa_seconds ?? 0;
        opts.push(
          `<option value="${gp.granule_id}">Orbit #${gp.pair_index} (${gp.granule_id}) · ${fCount} flashes · ${saaSec}s SAA</option>`
        );
      }
      granuleSelect.innerHTML = opts.join('');
    }
  }

  /**
   * Populates the Section 9 Archive Vault tables:
   * - Tab 1: 106-Granule Catalog Table (#granule-catalog-tbody)
   * - Tab 4: Excluded Flashes Audit Table (#excluded-audit-tbody)
   */
  _populateArchiveVaultTables() {
    this._renderGranuleCatalogTable('');
    this._renderExcludedAuditTable('ALL');
  }

  _renderGranuleCatalogTable(filterText = '') {
    const tbody = document.getElementById('granule-catalog-tbody');
    const countLbl = document.getElementById('granule-catalog-count-label');
    const pairs = this.dataAdapter.sourceManifest?.granule_pairs || [];
    if (!tbody) return;

    const q = filterText.trim().toLowerCase();
    const filtered = q
      ? pairs.filter(
          (gp) =>
            gp.granule_id.toLowerCase().includes(q) ||
            String(gp.pair_index).includes(q) ||
            String(gp.orbit_number || '').includes(q)
        )
      : pairs;

    if (countLbl) {
      countLbl.textContent = `${filtered.length} / ${pairs.length} Orbits`;
    }

    tbody.innerHTML = filtered
      .map((gp) => {
        const rc = gp.record_counts || {};
        const tb = gp.temporal_bounds || {};
        const startShort = (tb.utc_start || '').slice(0, 19).replace('T', ' ') + 'Z';
        const endShort =
          (tb.actual_telemetry_utc_end || tb.utc_end || '').slice(11, 19) + 'Z';
        return `
          <tr>
            <td class="mono">#${gp.pair_index}</td>
            <td class="mono"><strong>${gp.granule_id}</strong></td>
            <td class="mono">${startShort} → ${endShort}</td>
            <td class="mono" style="color: var(--state-detected); font-weight: 700;">${rc.confirmed_valid_flashes ?? 0}</td>
            <td class="mono">${rc.excluded_flashes ?? 0}</td>
            <td class="mono" style="color: var(--state-observed);">${(rc.viewtime_grid_records ?? 0).toLocaleString()}</td>
            <td class="mono" style="color: var(--state-unknown);">${rc.saa_seconds ?? 0}s</td>
            <td class="mono">${rc.contiguous_fatal_seconds ?? 0}s</td>
            <td>
              <button type="button" class="btn btn-sm load-granule-row-btn" data-granule-id="${gp.granule_id}">
                Load Orbit ↑
              </button>
            </td>
          </tr>
        `;
      })
      .join('');

    tbody.querySelectorAll('.load-granule-row-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const gId = btn.getAttribute('data-granule-id');
        if (!gId) return;
        const granSelect = document.getElementById('granule-quick-select');
        if (granSelect) granSelect.value = gId;
        this.applySelection({
          regionPresetId: 'GLOBAL_LIS',
          timeWindowPresetId: this.state.timeWindowPresetId,
          customGranuleId: gId,
          focusMap: true,
        });
        window.sonifyGo ? window.sonifyGo('page-map-explorer') : document.getElementById('page-map-explorer')?.scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  _renderExcludedAuditTable(reasonFilter = 'ALL') {
    const tbody = document.getElementById('excluded-audit-tbody');
    if (!tbody) return;
    const allExcluded = this.dataAdapter.excludedRecordsAudit?.excluded_flashes || [];
    const filtered =
      reasonFilter === 'ALL'
        ? allExcluded
        : allExcluded.filter((r) => r.assigned_reason_code === reasonFilter || r.reason_code === reasonFilter);

    const slice = filtered.slice(0, 60);
    tbody.innerHTML = slice
      .map(
        (ex, idx) => `
        <tr>
          <td class="mono">${ex.flash_id}</td>
          <td class="mono">${ex.granule_id}</td>
          <td class="mono">${(ex.utc_time || '').slice(0, 23)}</td>
          <td class="mono">${Number(ex.lat).toFixed(2)}°N, ${Number(ex.lon).toFixed(2)}°E</td>
          <td class="mono"><code>${ex.alert_flag_hex || ex.flash_alert_flag_raw || ex.alert_flag}</code></td>
          <td class="mono">${ex.overlaps_saa_1s || ex.saa_1s_active ? 'Yes (1s SAA)' : 'No'}</td>
          <td><span class="state-badge state-badge-unknown">⊘ ${ex.assigned_reason_code || ex.reason_code}</span></td>
          <td>
            <button type="button" class="btn btn-sm inspect-excluded-row-btn" data-ex-idx="${idx}">
              Inspect ↑
            </button>
          </td>
        </tr>
      `
      )
      .join('');

    tbody.querySelectorAll('.inspect-excluded-row-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const i = Number(btn.getAttribute('data-ex-idx'));
        const rec = slice[i];
        if (!rec) return;
        this.inspectorView?.inspectItem({
          ...rec,
          state: 'UNKNOWN',
        });
        await this.soundEngine.previewApprovedCue('UNKNOWN', rec);
        this._updateAudioDiagnosticsUi();
        window.sonifyGo ? window.sonifyGo('page-evidence-inspector') : document.getElementById('page-evidence-inspector')?.scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  _resolveReportUrl(reportUrl) {
    if (!reportUrl || /^https?:\/\//i.test(reportUrl)) return reportUrl;
    const clean = reportUrl.replace(/^(?:\.\.\/)+|^\.\/|^\/+/, '');
    return './' + clean;
  }

  async _loadValidationReportText(reportUrl) {
    const resolvedUrl = this._resolveReportUrl(reportUrl);
    const viewer = document.getElementById('validation-report-viewer');
    const openLink = document.getElementById('validation-report-open-link');
    if (openLink && resolvedUrl) {
      openLink.setAttribute('href', resolvedUrl);
    }
    if (!viewer || !resolvedUrl) return;
    viewer.textContent = `Loading ${resolvedUrl}…`;
    try {
      const resp = await fetch(resolvedUrl);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const rawText = await resp.text();
      // Normalize any local machine path prefixes in historical markdown reports to clean relative workspace paths
      const sanitizedText = rawText
        .replace(/file:\/\/\/Users\/hello\/Desktop\/sonifyerth\//g, '')
        .replace(/\/Users\/hello\/Desktop\/sonifyerth\//g, '')
        .replace(/\/Users\/hello\/[^\s)`"']*/g, '[workspace]');
      viewer.textContent = sanitizedText;
    } catch (err) {
      viewer.textContent = `Could not load ${resolvedUrl}: ${err.message || err}`;
    }
  }

  /**
   * Applies a Region and/or Time-Window selection and builds the single shared DataPackage
   * used identically by Map, Timeline, Both Listening Modes, Sound Engine, and Evidence Inspector.
   */
  applySelection({
    regionPresetId = this.state.regionPresetId,
    timeWindowPresetId = this.state.timeWindowPresetId,
    customGranuleId = '',
    focusMap = true,
  } = {}) {
    if (this.state.isPlaying) {
      this.pausePlayback();
    }

    this.state.regionPresetId = regionPresetId;
    this.state.timeWindowPresetId = timeWindowPresetId;
    this.state.customGranuleId = customGranuleId;

    let customTai93Start = null;
    let customTai93End = null;
    if (customGranuleId && this.dataAdapter.granulesById.has(customGranuleId)) {
      const gp = this.dataAdapter.granulesById.get(customGranuleId);
      customTai93Start = gp.temporal_bounds?.tai93_start;
      customTai93End =
        gp.temporal_bounds?.actual_telemetry_tai93_end || gp.temporal_bounds?.tai93_end;
    }

    const pkg = this.dataAdapter.buildDataPackage({
      regionPresetId,
      timeWindowPresetId,
      customTai93Start,
      customTai93End,
    });

    this.state.dataPackage = pkg;
    if (timeWindowPresetId === 'NOV11_QC_GAP_WINDOW' && !customGranuleId) {
      this.state.cursorTai93 = 973846600.0;
    } else if (timeWindowPresetId === 'ORBIT_007_SAA_TRANSIT' && !customGranuleId) {
      this.state.cursorTai93 = 973762050.0;
    } else if (timeWindowPresetId === 'NOV16_FATAL_OUTAGE_ORBIT' && !customGranuleId) {
      this.state.cursorTai93 = 974309500.0;
    } else {
      this.state.cursorTai93 = pkg.tai93Start;
    }

    this.state.cursorStateInfo = this.dataAdapter.resolveStateAtCursor(
      this.state.cursorTai93,
      pkg
    );

    if (focusMap && this.mapView) {
      this.mapView.focusOnBbox(pkg.bbox);
    }

    this._syncAllViews();

    if (this.inspectorView) {
      if (pkg.metrics.isOutOfCoverageRegion) {
        this.inspectorView.inspectItem({
          state: 'UNKNOWN',
          reason_code: 'OUTSIDE_OBSERVATION_COVERAGE',
          latitude: pkg.region.referencePoint?.lat ?? 64.1466,
          longitude: pkg.region.referencePoint?.lon ?? -21.9426,
          location_name: pkg.region.label,
          tai93_timestamp: this.state.cursorTai93,
        });
      } else if (
        this.state.cursorStateInfo.state === 'UNKNOWN' &&
        this.state.cursorStateInfo.activeWindow
      ) {
        this.inspectorView.inspectItem(this.state.cursorStateInfo.activeWindow);
      } else if (pkg.flashes.length > 0) {
        this.inspectorView.inspectItem(pkg.flashes[0]);
      } else if (pkg.gridObservationRecords.length > 0) {
        this.inspectorView.inspectItem(pkg.gridObservationRecords[0]);
      }
    }

    return pkg;
  }

  /**
   * Switches between EVENT-ONLY and OBSERVATION-AWARE without changing the selected DataPackage.
   */
  setListeningMode(modeId) {
    const beforePackageRef = this.state.dataPackage;
    const beforePackageId = beforePackageRef?.packageId;

    this.soundEngine.setListeningMode(modeId);
    this.state.listeningMode = this.soundEngine.listeningMode;

    if (
      this.state.dataPackage !== beforePackageRef ||
      this.state.dataPackage?.packageId !== beforePackageId
    ) {
      throw new Error('Scientific rule violation: mode switch altered selected dataPackage.');
    }

    this._syncModeUi();
    this._updateAudioDiagnosticsUi();
    this._renderSoundVisualizerFrame();
    this._announceToScreenReader(
      `Switched listening mode to ${this.state.listeningMode}. Selected NASA data package ${beforePackageId} is unchanged (${this.state.dataPackage?.flashes?.length ?? 0} flashes).`
    );
    return this.state.listeningMode;
  }

  async startPlayback() {
    if (!this.state.dataPackage) return;
    if (this.state.cursorTai93 >= this.state.dataPackage.tai93End) {
      this.state.cursorTai93 = this.state.dataPackage.tai93Start;
    }

    await this.soundEngine.play(this.state.cursorTai93);
    this.state.isPlaying = true;
    this._lastFrameTimeMs = performance.now();

    this._evaluateStepAudio(this.state.cursorTai93, this.state.cursorTai93 + 0.5);
    this._syncTransportButtonsUi();

    const tick = (nowMs) => {
      if (!this.state.isPlaying) return;
      const dtSec = Math.min(0.15, Math.max(0.001, (nowMs - this._lastFrameTimeMs) / 1000));
      this._lastFrameTimeMs = nowMs;

      const prevTai = this.state.cursorTai93;
      const nextTai = prevTai + dtSec * this.state.playbackSpeed;
      const pkg = this.state.dataPackage;

      if (nextTai >= pkg.tai93End) {
        this.state.cursorTai93 = pkg.tai93End;
        this._evaluateStepAudio(prevTai, pkg.tai93End);
        this.pausePlayback();
        this._syncAllViews();
        return;
      }

      this.state.cursorTai93 = nextTai;
      this._evaluateStepAudio(prevTai, nextTai);
      this._syncAllViews();
      this._rafId = requestAnimationFrame(tick);
    };

    this._rafId = requestAnimationFrame(tick);
  }

  pausePlayback() {
    this.state.isPlaying = false;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this.soundEngine.pause();
    this._syncTransportButtonsUi();
    this._updateAudioDiagnosticsUi();
    this._renderSoundVisualizerFrame();
  }

  stopPlayback() {
    this.state.isPlaying = false;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    const startTai = this.state.dataPackage?.tai93Start ?? 973723942.4;
    this.state.cursorTai93 = startTai;
    this.soundEngine.stop(startTai);
    if (this.state.dataPackage) {
      this.state.cursorStateInfo = this.dataAdapter.resolveStateAtCursor(
        startTai,
        this.state.dataPackage
      );
    }
    this._syncAllViews();
    this._syncTransportButtonsUi();
    this._updateAudioDiagnosticsUi();
  }

  async restartPlayback() {
    this.stopPlayback();
    await this.startPlayback();
  }

  seekToTai93(targetTai93, { triggerImmediateStateCheck = false } = {}) {
    if (!this.state.dataPackage) return;
    const pkg = this.state.dataPackage;
    const clampedTai = Math.max(pkg.tai93Start, Math.min(pkg.tai93End, Number(targetTai93)));
    this.state.cursorTai93 = clampedTai;
    this.soundEngine.seek(clampedTai);
    this.state.cursorStateInfo = this.dataAdapter.resolveStateAtCursor(clampedTai, pkg);

    if (triggerImmediateStateCheck && this.state.isPlaying) {
      this._evaluateStepAudio(clampedTai - 0.5, clampedTai + 0.5);
    }

    this._syncAllViews();
    this._updateAudioDiagnosticsUi();
    return this.state.cursorStateInfo;
  }

  _evaluateStepAudio(prevTai93, currTai93) {
    const pkg = this.state.dataPackage;
    if (!pkg) return;

    const cursorInfo = this.dataAdapter.resolveStateAtCursor(currTai93, pkg);
    this.state.cursorStateInfo = cursorInfo;

    const flashesInSlice = pkg.flashes.filter(
      (f) => f.tai93_time >= prevTai93 && f.tai93_time <= currTai93
    );

    this.soundEngine.processPlaybackStep({
      prevTai93,
      currTai93,
      flashesInStep: flashesInSlice,
      observationState: cursorInfo.state,
      reasonCode: cursorInfo.reasonCode,
      windowMeta: {
        utc: cursorInfo.utc,
        granuleId: cursorInfo.activeWindow?.granule_id || null,
        sourceFile: cursorInfo.activeWindow?.science_file || null,
      },
    });

    if (flashesInSlice.length > 0 && this.inspectorView) {
      this.inspectorView.inspectItem(flashesInSlice[0]);
    }

    this._updateAudioDiagnosticsUi();
  }

  _syncAllViews() {
    const pkg = this.state.dataPackage;
    if (!pkg) return;

    const cursorInfo =
      this.state.cursorStateInfo ||
      this.dataAdapter.resolveStateAtCursor(this.state.cursorTai93, pkg);
    this.state.cursorStateInfo = cursorInfo;

    if (this.mapView) {
      this.mapView.updateState({
        dataPackage: pkg,
        cursorTai93: this.state.cursorTai93,
        cursorStateInfo: cursorInfo,
        reducedMotion: this.state.reducedMotion || this.state.reducedMotionForced,
      });
    }

    if (this.timelineView) {
      this.timelineView.updateState({
        dataPackage: pkg,
        cursorTai93: this.state.cursorTai93,
      });
    }

    this._renderSoundVisualizerFrame();

    const setTxt = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(val);
    };

    setTxt('region-description-readout', pkg.region.description);
    setTxt('window-description-readout', pkg.timePreset.description);
    setTxt('hud-package-id', pkg.packageId);
    setTxt('hud-cursor-utc', cursorInfo.utc);

    const oocBanner = document.getElementById('map-out-of-coverage-banner');
    if (oocBanner) {
      const showBanner =
        pkg.metrics.isOutOfCoverageRegion ||
        cursorInfo.reasonCode === 'OUTSIDE_OBSERVATION_COVERAGE';
      oocBanner.hidden = !showBanner;
      const bannerTxt = document.getElementById('out-of-coverage-banner-text');
      if (bannerTxt && showBanner) {
        bannerTxt.textContent =
          cursorInfo.explanation ||
          'Selected coordinate/region lies outside the ISS LIS observation swath (UNKNOWN / OUTSIDE_OBSERVATION_COVERAGE).';
      }
    }

    const updateBadge = (el) => {
      if (!el) return;
      el.className =
        cursorInfo.state === 'DETECTED'
          ? 'state-badge state-badge-detected'
          : cursorInfo.state === 'OBSERVED_NO_DETECTION'
          ? 'state-badge state-badge-observed'
          : 'state-badge state-badge-unknown';
      const sym =
        cursorInfo.state === 'DETECTED'
          ? '◆'
          : cursorInfo.state === 'OBSERVED_NO_DETECTION'
          ? '◎'
          : '⊘';
      el.textContent = `${sym} ${cursorInfo.state}`;
    };

    updateBadge(document.getElementById('summary-current-state-badge'));
    updateBadge(document.getElementById('timeline-state-pill'));

    setTxt('summary-current-reason-code', cursorInfo.reasonCode);
    setTxt('summary-current-explanation', cursorInfo.explanation || '');
    setTxt('summary-cursor-utc', cursorInfo.utc);
    setTxt('summary-cursor-tai93', this.state.cursorTai93.toFixed(1));
    setTxt(
      'summary-window-range',
      `${pkg.utcStart.slice(0, 16).replace('T', ' ')}Z → ${pkg.utcEnd.slice(0, 16).replace('T', ' ')}Z`
    );

    setTxt('summary-flash-count', pkg.metrics.confirmedFlashCount.toLocaleString());
    setTxt('summary-excluded-count', pkg.metrics.excludedFlashCount.toLocaleString());
    setTxt(
      'summary-valid-obs-duration',
      `${pkg.metrics.validObservationDurationSec.toLocaleString()} s`
    );
    setTxt('summary-clean-cell-passes', pkg.metrics.totalCleanViewtimePasses.toLocaleString());
    setTxt('summary-detected-cell-passes', pkg.metrics.detectedCellPasses.toLocaleString());
    setTxt(
      'summary-quiet-cell-passes',
      pkg.metrics.observedNoDetectionCellPasses.toLocaleString()
    );
    setTxt(
      'summary-unknown-summary',
      `${pkg.metrics.unknownSaaDurationSec}s SAA · ${pkg.metrics.unknownFatalDurationSec}s Fatal · ${pkg.metrics.unknownQcGapDurationSec}s QC Gap`
    );
    setTxt('summary-saa-cell-passes', pkg.metrics.unknownSaaCellPasses.toLocaleString());

    const activeGranuleLabel =
      cursorInfo.activeWindow?.granule_id ||
      cursorInfo.activeWindow?.gap_id ||
      cursorInfo.activeWindow?.window_id ||
      'Archival Window';
    setTxt('timeline-active-granule-label', activeGranuleLabel);
    setTxt('timeline-scrubber-utc-readout', cursorInfo.utc);

    const scrubberInput = document.getElementById('timeline-scrubber-input');
    if (scrubberInput) {
      const span = Math.max(1, pkg.tai93End - pkg.tai93Start);
      const val = Math.round(((this.state.cursorTai93 - pkg.tai93Start) / span) * 1000);
      scrubberInput.value = String(Math.max(0, Math.min(1000, val)));
    }

    setTxt('modes-shared-package-id', pkg.packageId);
    setTxt('modes-shared-flash-count', pkg.metrics.confirmedFlashCount.toLocaleString());
  }

  _syncModeUi() {
    const mode = this.state.listeningMode;
    const eventOnlyBtn = document.getElementById('mode-btn-event-only');
    const obsAwareBtn = document.getElementById('mode-btn-observation-aware');
    if (eventOnlyBtn) {
      eventOnlyBtn.setAttribute('aria-checked', mode === 'EVENT-ONLY' ? 'true' : 'false');
    }
    if (obsAwareBtn) {
      obsAwareBtn.setAttribute('aria-checked', mode === 'OBSERVATION-AWARE' ? 'true' : 'false');
    }

    const headerLabel = document.getElementById('header-active-mode-label');
    if (headerLabel) headerLabel.textContent = mode;

    const consoleReadout = document.getElementById('audio-console-mode-readout');
    if (consoleReadout) consoleReadout.textContent = mode;
  }

  _syncTransportButtonsUi() {
    const playing = this.state.isPlaying;
    const tlLabel = document.getElementById('timeline-play-pause-label');
    if (tlLabel) tlLabel.textContent = playing ? 'Pause Timeline' : 'Play Timeline';

    const playBtn = document.getElementById('audio-play-btn');
    if (playBtn) playBtn.textContent = playing ? 'Playing…' : 'Play';
  }

  _updateAudioDiagnosticsUi() {
    const diag = this.soundEngine.getDiagnostics();
    const diagEl = document.getElementById('audio-diagnostics-readout');
    if (diagEl) {
      diagEl.textContent = `Pulses: ${diag.totalPulsesTriggered} (${diag.totalFlashesRepresented} flashes) | Textures: ${diag.totalTextureTransitions} | Unknown Cues: ${diag.totalUnknownCuesTriggered} | Active Nodes: ${diag.activeNodeCount}`;
    }
  }

  _appendTranscriptEntry(cueEntry) {
    const logBox = document.getElementById('audio-transcript-log');
    if (!logBox || !cueEntry) return;

    const row = document.createElement('div');
    row.className = 'transcript-entry';

    const color =
      cueEntry.state === 'DETECTED'
        ? 'var(--state-detected)'
        : cueEntry.state === 'OBSERVED_NO_DETECTION'
        ? 'var(--state-observed)'
        : 'var(--state-unknown)';

    row.innerHTML = `
      <span class="mono" style="color: ${color}; font-weight: 700; white-space: nowrap;">
        [${cueEntry.state} · ${cueEntry.listeningMode}]
      </span>
      <span>${cueEntry.description}</span>
    `;

    logBox.insertBefore(row, logBox.firstChild);
    while (logBox.children.length > 40) {
      logBox.removeChild(logBox.lastChild);
    }
  }

  _announceToScreenReader(message) {
    const el = document.getElementById('sr-live-announcer');
    if (el) {
      el.textContent = message;
    }
  }

  _bindControls() {
    // 0A. Hero Orbit Controls
    const heroStateSelect = document.getElementById('hero-orbit-state-select');
    if (heroStateSelect) {
      heroStateSelect.addEventListener('change', (e) => {
        this.state.heroHighlightState = e.target.value;
        this._drawHeroFrameOnce?.();
      });
    }

    const heroPauseBtn = document.getElementById('hero-orbit-pause-btn');
    if (heroPauseBtn) {
      heroPauseBtn.addEventListener('click', () => {
        this.state.heroOrbitPaused = !this.state.heroOrbitPaused;
        heroPauseBtn.setAttribute('aria-pressed', this.state.heroOrbitPaused ? 'true' : 'false');
        heroPauseBtn.textContent = this.state.heroOrbitPaused ? 'Resume Orbit' : 'Pause Orbit';
        if (!this.state.heroOrbitPaused && !this.state.reducedMotion && !this.state.reducedMotionForced) {
          this._initHeroOrbitScene();
        }
      });
    }

    const heroAuditionBtn = document.getElementById('hero-orbit-audition-btn');
    if (heroAuditionBtn) {
      heroAuditionBtn.addEventListener('click', async () => {
        const st =
          this.state.heroHighlightState === 'ALL'
            ? 'DETECTED'
            : this.state.heroHighlightState;
        await this.soundEngine.previewApprovedCue(st, { state: st });
        this._updateAudioDiagnosticsUi();
        this._renderSoundVisualizerFrame();
      });
    }

    // 0B. Mission Security-Camera Analogy Controls
    const camBtns = document.querySelectorAll('.camera-sim-btn');
    camBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const camState = btn.getAttribute('data-cam-state') || 'DETECTED';
        this.state.activeCameraAnalogyState = camState;
        camBtns.forEach((b) => {
          const active = b === btn;
          b.classList.toggle('active', active);
          b.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        const cfg = CAMERA_ANALOGY_STATES[camState] || CAMERA_ANALOGY_STATES.DETECTED;
        const badgeEl = document.getElementById('camera-sim-badge');
        if (badgeEl) {
          badgeEl.className = cfg.badgeClass;
          badgeEl.textContent = cfg.badgeText;
        }
        const setTxt = (id, v) => {
          const el = document.getElementById(id);
          if (el) el.textContent = v;
        };
        setTxt('camera-sim-metric', cfg.metric);
        setTxt('camera-sim-headline', cfg.headline);
        setTxt('camera-sim-body', cfg.body);
        const sDesc = document.getElementById('camera-sim-sound-desc');
        if (sDesc) {
          sDesc.textContent = cfg.soundDesc;
          sDesc.style.color = cfg.soundColor;
        }
      });
    });

    const camPlayBtn = document.getElementById('camera-sim-play-btn');
    if (camPlayBtn) {
      camPlayBtn.addEventListener('click', async () => {
        const st = this.state.activeCameraAnalogyState || 'DETECTED';
        const cfg = CAMERA_ANALOGY_STATES[st] || CAMERA_ANALOGY_STATES.DETECTED;
        const ex = this.dataAdapter.getVerifiedExamples()[cfg.presetIndex] || { state: st };
        await this.soundEngine.previewApprovedCue(st, ex);
        this.inspectorView?.inspectItem(ex);
        this._updateAudioDiagnosticsUi();
        this._renderSoundVisualizerFrame();
      });
    }

    // 0C. 9-Stage Data Journey Pipeline Stepper
    document.querySelectorAll('.pipeline-stage-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        const idx = Number(pill.getAttribute('data-stage-index') || 0);
        this._renderPipelineStage(idx);
      });
    });

    const pipePrevBtn = document.getElementById('pipeline-prev-btn');
    if (pipePrevBtn) {
      pipePrevBtn.addEventListener('click', () => {
        const prev =
          (this.state.activePipelineStage - 1 + PIPELINE_STAGES.length) %
          PIPELINE_STAGES.length;
        this._renderPipelineStage(prev);
      });
    }

    const pipeNextBtn = document.getElementById('pipeline-next-btn');
    if (pipeNextBtn) {
      pipeNextBtn.addEventListener('click', () => {
        const next = (this.state.activePipelineStage + 1) % PIPELINE_STAGES.length;
        this._renderPipelineStage(next);
      });
    }

    const pipeEvBtn = document.getElementById('pipeline-evidence-btn');
    if (pipeEvBtn) {
      pipeEvBtn.addEventListener('click', () => {
        const stage = PIPELINE_STAGES[this.state.activePipelineStage] || PIPELINE_STAGES[0];
        const ex = this.dataAdapter.getVerifiedExamples()[stage.presetIndex];
        if (ex && this.inspectorView) {
          this.inspectorView.inspectItem(ex);
        }
      });
    }

    // 1. SVS 5011 Video play/pause toggle button
    const svsVideo = document.getElementById('svs-5011-video');
    const svsToggleBtn = document.getElementById('svs-play-toggle-btn');
    if (svsVideo && svsToggleBtn) {
      svsToggleBtn.addEventListener('click', () => {
        if (svsVideo.paused) {
          svsVideo.play().catch(() => {});
        } else {
          svsVideo.pause();
        }
      });
    }

    // 2. Region Selector
    const regionSelect = document.getElementById('region-preset-select');
    if (regionSelect) {
      regionSelect.addEventListener('change', (e) => {
        this.applySelection({
          regionPresetId: e.target.value,
          timeWindowPresetId: this.state.timeWindowPresetId,
          customGranuleId: this.state.customGranuleId,
          focusMap: true,
        });
      });
    }

    // 3. Time-Window Selector
    const windowSelect = document.getElementById('time-window-preset-select');
    if (windowSelect) {
      windowSelect.addEventListener('change', (e) => {
        const granSelect = document.getElementById('granule-quick-select');
        if (granSelect) granSelect.value = '';
        this.applySelection({
          regionPresetId: this.state.regionPresetId,
          timeWindowPresetId: e.target.value,
          customGranuleId: '',
          focusMap: false,
        });
      });
    }

    // 4. Granule Quick-Select
    const granuleSelect = document.getElementById('granule-quick-select');
    if (granuleSelect) {
      granuleSelect.addEventListener('change', (e) => {
        this.applySelection({
          regionPresetId: this.state.regionPresetId,
          timeWindowPresetId: this.state.timeWindowPresetId,
          customGranuleId: e.target.value,
          focusMap: false,
        });
      });
    }

    // 5. Map Projection & Zoom Controls
    const projBtn = document.getElementById('toggle-projection-btn');
    if (projBtn) {
      projBtn.addEventListener('click', () => {
        const newProj = this.mapView.toggleProjection();
        const projLabel = document.getElementById('map-projection-label');
        if (projLabel) {
          projLabel.textContent =
            newProj === 'ORTHOGRAPHIC' ? '3D Orthographic Globe' : '2D Equirectangular';
        }
        projBtn.textContent =
          newProj === 'ORTHOGRAPHIC' ? 'Switch to 2D Map View' : 'Switch to 3D Globe View';
      });
    }

    const resetMapBtn = document.getElementById('reset-map-view-btn');
    if (resetMapBtn) {
      resetMapBtn.addEventListener('click', () => this.mapView?.resetView());
    }

    const zoomInBtn = document.getElementById('map-zoom-in-btn');
    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => this.mapView?.zoomBy(1.35));
    }

    const zoomOutBtn = document.getElementById('map-zoom-out-btn');
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => this.mapView?.zoomBy(1 / 1.35));
    }

    // 6. Map Layer Toggles
    const bindLayer = (id, key) => {
      const cb = document.getElementById(id);
      if (cb) {
        cb.addEventListener('change', (e) => {
          this.mapView?.setLayerVisibility(key, e.target.checked);
        });
      }
    };
    bindLayer('layer-toggle-flashes', 'flashes');
    bindLayer('layer-toggle-grid', 'grid');
    bindLayer('layer-toggle-unknown', 'unknown');
    bindLayer('layer-toggle-swath', 'swath');

    // 7. Timeline Transport & Step Controls (±10s, ±30s, ±60s)
    const tlPlayPauseBtn = document.getElementById('timeline-play-pause-btn');
    if (tlPlayPauseBtn) {
      tlPlayPauseBtn.addEventListener('click', () => {
        if (this.state.isPlaying) this.pausePlayback();
        else this.startPlayback();
      });
    }

    const tlStopBtn = document.getElementById('timeline-stop-btn');
    if (tlStopBtn) {
      tlStopBtn.addEventListener('click', () => this.stopPlayback());
    }

    const tlRestartBtn = document.getElementById('timeline-restart-btn');
    if (tlRestartBtn) {
      tlRestartBtn.addEventListener('click', () => this.restartPlayback());
    }

    const bindStepBtn = (id, deltaSec) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', () => {
          this.seekToTai93(this.state.cursorTai93 + deltaSec, {
            triggerImmediateStateCheck: true,
          });
        });
      }
    };
    bindStepBtn('timeline-step-back-60-btn', -60);
    bindStepBtn('timeline-step-back-btn', -30);
    bindStepBtn('timeline-step-back-10-btn', -10);
    bindStepBtn('timeline-step-fwd-10-btn', 10);
    bindStepBtn('timeline-step-fwd-btn', 30);
    bindStepBtn('timeline-step-fwd-60-btn', 60);

    const nextFlashBtn = document.getElementById('timeline-next-flash-btn');
    if (nextFlashBtn) {
      nextFlashBtn.addEventListener('click', () => {
        const pkg = this.state.dataPackage;
        if (!pkg || pkg.flashes.length === 0) return;
        const nextF =
          pkg.flashes.find((f) => f.tai93_time > this.state.cursorTai93 + 0.5) || pkg.flashes[0];
        this.seekToTai93(nextF.tai93_time, { triggerImmediateStateCheck: true });
        this.soundEngine.previewApprovedCue('DETECTED', nextF);
        this.inspectorView?.inspectItem(nextF);
        this._updateAudioDiagnosticsUi();
        this._renderSoundVisualizerFrame();
      });
    }

    const nextUnknownBtn = document.getElementById('timeline-next-unknown-btn');
    if (nextUnknownBtn) {
      nextUnknownBtn.addEventListener('click', () => {
        const pkg = this.state.dataPackage;
        if (!pkg) return;
        const allUnknowns = [
          ...pkg.qcGaps,
          ...pkg.fatalWindows,
          ...pkg.saaWindows,
        ].sort((a, b) => a.tai93_start - b.tai93_start);

        if (allUnknowns.length > 0) {
          const nextU =
            allUnknowns.find((u) => u.tai93_start > this.state.cursorTai93 + 1.0) || allUnknowns[0];
          this.seekToTai93(nextU.tai93_start + 5, { triggerImmediateStateCheck: true });
          this.soundEngine.previewApprovedCue('UNKNOWN', nextU);
          this.inspectorView?.inspectItem(nextU);
          this._updateAudioDiagnosticsUi();
          this._renderSoundVisualizerFrame();
        } else {
          this.applySelection({
            regionPresetId: this.state.regionPresetId,
            timeWindowPresetId: 'NOV11_QC_GAP_WINDOW',
            focusMap: false,
          });
          const windowSel = document.getElementById('time-window-preset-select');
          if (windowSel) windowSel.value = 'NOV11_QC_GAP_WINDOW';
          const gapItem = this.state.dataPackage?.qcGaps?.[0];
          if (gapItem) {
            this.soundEngine.previewApprovedCue('UNKNOWN', gapItem);
            this.inspectorView?.inspectItem(gapItem);
            this._updateAudioDiagnosticsUi();
            this._renderSoundVisualizerFrame();
          }
        }
      });
    }

    const scrubberInput = document.getElementById('timeline-scrubber-input');
    if (scrubberInput) {
      scrubberInput.addEventListener('input', (e) => {
        const pkg = this.state.dataPackage;
        if (!pkg) return;
        const frac = Number(e.target.value) / 1000;
        const targetTai = pkg.tai93Start + frac * (pkg.tai93End - pkg.tai93Start);
        this.seekToTai93(targetTai, { triggerImmediateStateCheck: true });
      });
    }

    // 8. Listening Mode Buttons
    const eventOnlyBtn = document.getElementById('mode-btn-event-only');
    const obsAwareBtn = document.getElementById('mode-btn-observation-aware');
    const headerModeBtn = document.getElementById('header-mode-badge-btn');

    if (eventOnlyBtn) {
      eventOnlyBtn.addEventListener('click', () => this.setListeningMode('EVENT-ONLY'));
    }
    if (obsAwareBtn) {
      obsAwareBtn.addEventListener('click', () => this.setListeningMode('OBSERVATION-AWARE'));
    }
    if (headerModeBtn) {
      headerModeBtn.addEventListener('click', () => {
        const nextMode =
          this.state.listeningMode === 'OBSERVATION-AWARE' ? 'EVENT-ONLY' : 'OBSERVATION-AWARE';
        this.setListeningMode(nextMode);
      });
    }

    // 9. Sound Engine Console Controls
    const audioPlayBtn = document.getElementById('audio-play-btn');
    const audioPauseBtn = document.getElementById('audio-pause-btn');
    const audioStopBtn = document.getElementById('audio-stop-btn');
    const audioRestartBtn = document.getElementById('audio-restart-btn');
    const audioMuteBtn = document.getElementById('audio-mute-btn');
    const headerMuteBtn = document.getElementById('header-mute-btn');
    const volSlider = document.getElementById('audio-volume-slider');
    const speedSelect = document.getElementById('playback-speed-select');

    if (audioPlayBtn) {
      audioPlayBtn.addEventListener('click', () => this.startPlayback());
    }
    if (audioPauseBtn) {
      audioPauseBtn.addEventListener('click', () => this.pausePlayback());
    }
    if (audioStopBtn) {
      audioStopBtn.addEventListener('click', () => this.stopPlayback());
    }
    if (audioRestartBtn) {
      audioRestartBtn.addEventListener('click', () => this.restartPlayback());
    }

    const handleMuteToggle = () => {
      const isMuted = this.soundEngine.toggleMute();
      if (audioMuteBtn) {
        audioMuteBtn.setAttribute('aria-pressed', isMuted ? 'true' : 'false');
        audioMuteBtn.textContent = isMuted ? 'Unmute' : 'Mute';
      }
      if (headerMuteBtn) {
        headerMuteBtn.setAttribute('aria-pressed', isMuted ? 'true' : 'false');
      }
      const headerMuteLbl = document.getElementById('header-mute-label');
      if (headerMuteLbl) {
        headerMuteLbl.textContent = isMuted ? 'Unmute Audio' : 'Mute Audio';
      }
      this._updateAudioDiagnosticsUi();
    };

    if (audioMuteBtn) audioMuteBtn.addEventListener('click', handleMuteToggle);
    if (headerMuteBtn) headerMuteBtn.addEventListener('click', handleMuteToggle);

    if (volSlider) {
      volSlider.addEventListener('input', (e) => {
        const pct = Number(e.target.value);
        this.soundEngine.setVolume(pct / 100);
        const volLbl = document.getElementById('audio-volume-label');
        if (volLbl) volLbl.textContent = `${pct}%`;
      });
    }

    if (speedSelect) {
      speedSelect.addEventListener('change', (e) => {
        this.state.playbackSpeed = Number(e.target.value) || 60;
      });
    }

    // 10. Sound Legend Audition Buttons
    const audDetBtn = document.getElementById('audition-detected-btn');
    if (audDetBtn) {
      audDetBtn.addEventListener('click', async () => {
        const sampleFlash = this.state.dataPackage?.flashes?.[0] || this.dataAdapter.flashes?.[0];
        await this.soundEngine.previewApprovedCue('DETECTED', sampleFlash || {});
        if (sampleFlash) this.inspectorView?.inspectItem(sampleFlash);
        this._updateAudioDiagnosticsUi();
        this._renderSoundVisualizerFrame();
      });
    }

    const audObsBtn = document.getElementById('audition-observed-btn');
    if (audObsBtn) {
      audObsBtn.addEventListener('click', async () => {
        const sampleObs = this.dataAdapter.getVerifiedExamples()[1] || {
          state: 'OBSERVED_NO_DETECTION',
        };
        await this.soundEngine.previewApprovedCue('OBSERVED_NO_DETECTION', sampleObs);
        this.inspectorView?.inspectItem(sampleObs);
        this._updateAudioDiagnosticsUi();
        this._renderSoundVisualizerFrame();
      });
    }

    const audUnkBtn = document.getElementById('audition-unknown-btn');
    if (audUnkBtn) {
      audUnkBtn.addEventListener('click', async () => {
        const sampleUnk = this.dataAdapter.getVerifiedExamples()[3] || {
          state: 'UNKNOWN',
          reason_code: 'MISSING_SOURCE_DATA',
        };
        await this.soundEngine.previewApprovedCue('UNKNOWN', sampleUnk);
        this.inspectorView?.inspectItem(sampleUnk);
        this._updateAudioDiagnosticsUi();
        this._renderSoundVisualizerFrame();
      });
    }

    // 11. Custom Coordinate Inspector Lookup
    const customInspectBtn = document.getElementById('custom-inspect-btn');
    if (customInspectBtn) {
      customInspectBtn.addEventListener('click', async () => {
        const latInput = document.getElementById('custom-inspect-lat');
        const lonInput = document.getElementById('custom-inspect-lon');
        const lat = Number(latInput?.value ?? -6.33);
        const lon = Number(lonInput?.value ?? -72.28);

        if (lat > 55.25 || lat < -55.75) {
          const polarRec = {
            state: 'UNKNOWN',
            reason_code: 'OUTSIDE_OBSERVATION_COVERAGE',
            latitude: lat,
            longitude: lon,
            tai93_timestamp: this.state.cursorTai93,
            location_name: `Custom High-Latitude Coordinate (${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E — Outside ISS LIS ~±54° Swath Envelope)`,
          };
          this.inspectorView?.inspectItem(polarRec);
          await this.soundEngine.previewApprovedCue('UNKNOWN', polarRec);
          this._updateAudioDiagnosticsUi();
          this._renderSoundVisualizerFrame();
          return;
        }

        const pkg = this.state.dataPackage;
        const nearFlash = pkg?.flashes?.find(
          (f) => Math.hypot(f.lat - lat, f.lon - lon) <= 2.0
        );
        if (nearFlash) {
          this.inspectorView?.inspectItem(nearFlash);
          await this.soundEngine.previewApprovedCue('DETECTED', nearFlash);
          this._updateAudioDiagnosticsUi();
          this._renderSoundVisualizerFrame();
          return;
        }

        const nearCell = pkg?.gridObservationRecords?.find(
          (r) => Math.hypot(r.grid_lat - lat, r.grid_lon - lon) <= 2.5
        );
        if (nearCell) {
          this.inspectorView?.inspectItem(nearCell);
          await this.soundEngine.previewApprovedCue(nearCell.state, nearCell);
          this._updateAudioDiagnosticsUi();
          this._renderSoundVisualizerFrame();
          return;
        }

        const fallback = {
          state: 'OBSERVED_NO_DETECTION',
          reason_code: 'ACTIVE_OPTICAL_SURVEILLANCE_ZERO_FLASHES',
          grid_lat: Math.round(lat * 2) / 2 + 0.25,
          grid_lon: Math.round(lon * 2) / 2 + 0.25,
          tai93_start: this.state.cursorTai93,
          tai93_end: this.state.cursorTai93 + 65,
          effective_obs_seconds: 44.2,
          source_file:
            this.state.cursorStateInfo?.activeWindow?.science_file ||
            'ISS_LIS_SC_V2.2_20231109_225212_FIN.nc',
        };
        this.inspectorView?.inspectItem(fallback);
        await this.soundEngine.previewApprovedCue('OBSERVED_NO_DETECTION', fallback);
        this._updateAudioDiagnosticsUi();
        this._renderSoundVisualizerFrame();
      });
    }

    // 12. Section 9 Archive Vault 7-Tab Controller & Filters
    const archiveTabBtns = document.querySelectorAll('.archive-tab-btn');
    archiveTabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-archive-tab');
        archiveTabBtns.forEach((b) => {
          const active = b === btn;
          b.classList.toggle('active', active);
          b.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        document.querySelectorAll('.archive-tab-panel').forEach((panel) => {
          panel.classList.toggle('active', panel.id === targetId);
        });
      });
    });

    const granFilterInput = document.getElementById('granule-catalog-filter');
    if (granFilterInput) {
      granFilterInput.addEventListener('input', (e) => {
        this._renderGranuleCatalogTable(e.target.value || '');
      });
    }

    const exReasonSelect = document.getElementById('excluded-reason-filter');
    if (exReasonSelect) {
      exReasonSelect.addEventListener('change', (e) => {
        this._renderExcludedAuditTable(e.target.value || 'ALL');
      });
    }

    const jumpNov11Btn = document.getElementById('jump-nov11-gap-btn');
    if (jumpNov11Btn) {
      jumpNov11Btn.addEventListener('click', () => {
        const windowSel = document.getElementById('time-window-preset-select');
        if (windowSel) windowSel.value = 'NOV11_QC_GAP_WINDOW';
        this.applySelection({
          regionPresetId: 'GLOBAL_LIS',
          timeWindowPresetId: 'NOV11_QC_GAP_WINDOW',
          focusMap: true,
        });
        window.sonifyGo ? window.sonifyGo('page-timeline-dashboard') : document.getElementById('page-timeline-dashboard')?.scrollIntoView({ behavior: 'smooth' });
      });
    }

    const reportSelect = document.getElementById('validation-report-select');
    if (reportSelect) {
      reportSelect.addEventListener('change', (e) => {
        this._loadValidationReportText(e.target.value);
      });
    }

    // 13. Footer Reduced Motion Toggle
    const rmBtn = document.getElementById('footer-reduced-motion-btn');
    if (rmBtn) {
      rmBtn.addEventListener('click', () => {
        this.state.reducedMotionForced = !this.state.reducedMotionForced;
        document.body.classList.toggle('reduced-motion-forced', this.state.reducedMotionForced);
        rmBtn.setAttribute('aria-pressed', this.state.reducedMotionForced ? 'true' : 'false');
        const lbl = document.getElementById('reduced-motion-status-label');
        if (lbl) {
          lbl.textContent = this.state.reducedMotionForced ? 'Forced ON' : 'System Default';
        }
        if (this.state.reducedMotionForced && this._heroRafId) {
          cancelAnimationFrame(this._heroRafId);
          this._heroRafId = null;
        }
        this._drawHeroFrameOnce?.();
        this._syncAllViews();
      });
    }
  }
}

// Initialize on DOMContentLoaded and attach to window.sonifyEarthApp for Playwright verification
window.addEventListener('DOMContentLoaded', () => {
  const app = new SonifyEarthApplication();
  window.sonifyEarthApp = app;
  app.init();
});
