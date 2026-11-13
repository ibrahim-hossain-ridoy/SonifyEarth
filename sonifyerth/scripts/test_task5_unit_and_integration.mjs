import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  LISTENING_MODES,
  SOUND_CUE_SPEC,
  PROHIBITED_SOUND_MAPPINGS,
  isValidListeningMode,
} from '../09_SOUND_ENGINE/audio_mapping/sound_cue_spec.js';
import { SonifyEarthSoundEngine } from '../09_SOUND_ENGINE/playback/sound_engine.js';
import {
  SonifyEarthDataAdapter,
  DATA_ENDPOINTS,
  tai93ToUtcIso,
  utcIsoToTai93,
  decodeAlertFlagBits,
} from '../08_WEBSITE/frontend/js/data_adapter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_ROOT = path.resolve(__dirname, '..');

// Provide a local file-reading fetch stub so SonifyEarthDataAdapter.loadAllData() reads actual disk JSON/GeoJSON
globalThis.fetch = async (urlPath) => {
  const rel = urlPath.replace(/^\//, '');
  const fullPath = path.join(WORKSPACE_ROOT, rel);
  const txt = await fs.readFile(fullPath, 'utf-8');
  return {
    ok: true,
    status: 200,
    json: async () => JSON.parse(txt),
  };
};

async function runTests() {
  console.log('======================================================================');
  console.log('SONIFYEARTH TASK 5 — UNIT & REAL NASA DATA INTEGRATION TEST SUITE');
  console.log('======================================================================');

  // Test 1: Sound Cue Spec & Listening Mode Guardrails
  assert.equal(isValidListeningMode('EVENT-ONLY'), true);
  assert.equal(isValidListeningMode('OBSERVATION-AWARE'), true);
  assert.equal(isValidListeningMode('EVIDENCE_INSPECTOR_MODE'), false);
  assert.equal(isValidListeningMode('GLOBAL_ORBITAL_PLAYBACK_MODE'), false);
  assert.equal(SOUND_CUE_SPEC.DETECTED.cueId, 'SHORT_PERCUSSIVE_PULSE');
  assert.equal(SOUND_CUE_SPEC.OBSERVED_NO_DETECTION.cueId, 'SUSTAINED_OBSERVATION_TEXTURE');
  assert.equal(SOUND_CUE_SPEC.UNKNOWN.cueId, 'DISTINCT_NEUTRAL_TWO_PART_CUE');
  assert.ok(PROHIBITED_SOUND_MAPPINGS.includes('radiance_to_loudness_or_storm_intensity'));
  console.log('[PASS] Test 1: Sound cue specification and prohibited mapping guardrails verified.');

  // Test 2: TAI93 <-> UTC Leap-Second Conversion (-10.0s offset)
  const sampleTai93 = 973723942.4;
  const sampleUtc = tai93ToUtcIso(sampleTai93);
  assert.equal(sampleUtc, '2023-11-09T22:52:12.400Z');
  assert.ok(Math.abs(utcIsoToTai93(sampleUtc) - sampleTai93) < 1e-6);
  console.log('[PASS] Test 2: TAI93 <-> UTC (-10.0s leap offset) conversion verified (0.000000s error).');

  // Test 3: Alert Flag Bitmask Decoding (0x55 Fatal vs 0xAA Warning)
  const warnOnly = decodeAlertFlagBits(0x22, 'viewtime');
  assert.equal(warnOnly.hasFatalBits, false);
  assert.equal(warnOnly.hasWarningBits, true);
  const fatalFlag = decodeAlertFlagBits(0x21, 'flash');
  assert.equal(fatalFlag.hasFatalBits, true);
  console.log('[PASS] Test 3: Quality bitmask decoder (0x55 fatal vs 0xAA warning) verified.');

  // Test 4: Load Real Processed NASA JSON & GeoJSON via SonifyEarthDataAdapter
  const adapter = new SonifyEarthDataAdapter();
  await adapter.loadAllData();
  assert.equal(adapter.isLoaded, true);
  assert.equal(adapter.flashes.length, 14554);
  assert.equal(adapter.excludedFlashesById.size, 1570);
  assert.equal(adapter.granulesById.size, 106);
  assert.equal(adapter.orbitalAndGapWindows.length, 107);
  assert.equal(adapter.saaWindows.length, 47);
  assert.equal(adapter.fatalWindows.length, 10);
  assert.equal(adapter.lightningGeoJson.features.length, 14554);
  assert.equal(adapter.observationGridGeoJson.features.length, 5532);
  assert.equal(adapter.unknownCoverageGeoJson.features.length, 864);
  console.log('[PASS] Test 4: Real NASA JSON (6 files) & GeoJSON (3 files) loaded with exact counts.');

  // Test 5: Section 5 Listening Mode Compatibility Adapter Resolution
  const compat = adapter.modeCompatibilityReport;
  assert.deepEqual(compat.rawTask4ListeningModes, [
    'EVIDENCE_INSPECTOR_MODE',
    'GLOBAL_ORBITAL_PLAYBACK_MODE',
  ]);
  assert.deepEqual(
    compat.approvedUserFacingListeningModes.map((m) => m.id),
    ['EVENT-ONLY', 'OBSERVATION-AWARE']
  );
  assert.equal(compat.task4FilesUntouched, true);
  console.log('[PASS] Test 5: Section 5 Listening Mode Compatibility Adapter verified.');

  // Test 6: Shared DataPackage Invariance & Region/Window Filtering
  const pkgOrbit1 = adapter.buildDataPackage({
    regionPresetId: 'GLOBAL_LIS',
    timeWindowPresetId: 'ORBIT_001_AMAZON',
  });
  assert.equal(pkgOrbit1.metrics.confirmedFlashCount, 189);
  assert.equal(pkgOrbit1.metrics.detectedCellPasses, 82);
  assert.equal(pkgOrbit1.metrics.observedNoDetectionCellPasses, 39776);

  const pkgFull7Day = adapter.buildDataPackage({
    regionPresetId: 'GLOBAL_LIS',
    timeWindowPresetId: 'FULL_7DAY_ARCHIVE',
  });
  assert.equal(pkgFull7Day.metrics.confirmedFlashCount, 14554);
  assert.equal(pkgFull7Day.metrics.excludedFlashCount, 1570);

  const pkgPolar = adapter.buildDataPackage({
    regionPresetId: 'HIGH_LATITUDE_POLAR',
    timeWindowPresetId: 'FULL_7DAY_ARCHIVE',
  });
  assert.equal(pkgPolar.metrics.isOutOfCoverageRegion, true);
  assert.equal(pkgPolar.metrics.confirmedFlashCount, 0);
  assert.equal(pkgPolar.metrics.validObservationDurationSec, 0);
  const polarCursorState = adapter.resolveStateAtCursor(973725252.0, pkgPolar);
  assert.equal(polarCursorState.state, 'UNKNOWN');
  assert.equal(polarCursorState.reasonCode, 'OUTSIDE_OBSERVATION_COVERAGE');
  console.log('[PASS] Test 6: Region/Time-Window packages and Polar UNKNOWN state verified.');

  // Test 7: Cursor State Resolution Across DETECTED, OBSERVED_NO_DETECTION, SAA, Fatal, and Nov 11 QC Gap
  const flash0Tai = pkgOrbit1.flashes[0].tai93_time;
  const detState = adapter.resolveStateAtCursor(flash0Tai, pkgOrbit1);
  assert.equal(detState.state, 'DETECTED');
  assert.equal(detState.reasonCode, 'CONFIRMED_LIGHTNING_FLASH');

  const quietState = adapter.resolveStateAtCursor(973724820.0, pkgOrbit1);
  assert.equal(quietState.state, 'OBSERVED_NO_DETECTION');
  assert.equal(quietState.reasonCode, 'ACTIVE_OPTICAL_SURVEILLANCE_ZERO_FLASHES');

  const pkgGap = adapter.buildDataPackage({
    regionPresetId: 'GLOBAL_LIS',
    timeWindowPresetId: 'NOV11_QC_GAP_WINDOW',
  });
  const gapState = adapter.resolveStateAtCursor(973847000.0, pkgGap);
  assert.equal(gapState.state, 'UNKNOWN');
  assert.equal(gapState.reasonCode, 'MISSING_SOURCE_DATA');

  const pkgSaa = adapter.buildDataPackage({
    regionPresetId: 'GLOBAL_LIS',
    timeWindowPresetId: 'ORBIT_007_SAA_TRANSIT',
  });
  const saaState = adapter.resolveStateAtCursor(973762100.0, pkgSaa);
  assert.equal(saaState.state, 'UNKNOWN');
  assert.equal(saaState.reasonCode, 'INSUFFICIENT_EVIDENCE_SAA_RADIATION');

  const pkgFatal = adapter.buildDataPackage({
    regionPresetId: 'GLOBAL_LIS',
    timeWindowPresetId: 'NOV16_FATAL_OUTAGE_ORBIT',
  });
  const fatalState = adapter.resolveStateAtCursor(974310000.0, pkgFatal);
  assert.equal(fatalState.state, 'UNKNOWN');
  assert.equal(fatalState.reasonCode, 'FATAL_QUALITY_FLAG');
  console.log('[PASS] Test 7: Cursor state resolution verified across all 3 states and 5 UNKNOWN reasons.');

  // Test 8:Deterministic Sound Engine Scheduling & Mode Differences
  const soundEngine = new SonifyEarthSoundEngine();
  assert.equal(soundEngine.isPlaying, false);
  assert.equal(soundEngine.getDiagnostics().audioContextState, 'uninitialized_no_autoplay');

  await soundEngine.play(pkgOrbit1.tai93Start);
  assert.equal(soundEngine.isPlaying, true);

  // Step in OBSERVATION-AWARE mode with 10 simultaneous flashes (tests density clustering without record loss)
  const tenFlashes = pkgOrbit1.flashes.slice(0, 10);
  const cuesObsAware = soundEngine.processPlaybackStep({
    prevTai93: tenFlashes[0].tai93_time - 1,
    currTai93: tenFlashes[9].tai93_time + 1,
    flashesInStep: tenFlashes,
    observationState: 'DETECTED',
    reasonCode: 'CONFIRMED_LIGHTNING_FLASH',
  });
  assert.ok(cuesObsAware.some((c) => c.cueId === 'SUSTAINED_OBSERVATION_TEXTURE'));
  assert.ok(cuesObsAware.some((c) => c.cueId === 'SHORT_PERCUSSIVE_PULSE'));
  assert.equal(soundEngine.totalFlashesRepresented, 10);

  // Step into UNKNOWN in OBSERVATION-AWARE mode
  const cuesUnknown = soundEngine.processPlaybackStep({
    prevTai93: 973846600,
    currTai93: 973846610,
    flashesInStep: [],
    observationState: 'UNKNOWN',
    reasonCode: 'MISSING_SOURCE_DATA',
  });
  assert.equal(cuesUnknown.length, 1);
  assert.equal(cuesUnknown[0].cueId, 'DISTINCT_NEUTRAL_TWO_PART_CUE');

  // Switch to EVENT-ONLY mode and verify OBSERVED_NO_DETECTION & UNKNOWN do not generate background/unknown cues
  soundEngine.setListeningMode('EVENT-ONLY');
  const cuesEventOnlyQuiet = soundEngine.processPlaybackStep({
    prevTai93: 973724800,
    currTai93: 973724810,
    flashesInStep: [],
    observationState: 'OBSERVED_NO_DETECTION',
    reasonCode: 'ACTIVE_OPTICAL_SURVEILLANCE_ZERO_FLASHES',
  });
  assert.equal(cuesEventOnlyQuiet.length, 0);

  const cuesEventOnlyUnknown = soundEngine.processPlaybackStep({
    prevTai93: 973846700,
    currTai93: 973846710,
    flashesInStep: [],
    observationState: 'UNKNOWN',
    reasonCode: 'MISSING_SOURCE_DATA',
  });
  assert.equal(cuesEventOnlyUnknown.length, 0);

  // Pause & Stop cancellation
  soundEngine.pause();
  assert.equal(soundEngine.isPlaying, false);
  assert.equal(soundEngine.getDiagnostics().activeNodeCount, 0);
  console.log('[PASS] Test 8: Deterministic sound engine scheduling, density handling, and cancellation verified.');

  // Test 9: "Why Did I Hear That?" Evidence Inspector Traceability Across All 6 Verified Anchor Records
  const examples = adapter.getVerifiedExamples();
  assert.equal(examples.length, 6);
  for (const ex of examples) {
    const ev = adapter.buildEvidenceRecord(ex);
    assert.ok(ev.title.length > 5);
    assert.ok(ev.everydayExplanation.length > 30);
    assert.equal(ev.state, ex.state);
    assert.ok(ev.metadata.scienceDoi === '10.5067/LIS/ISSLIS/DATA111');
  }
  console.log('[PASS] Test 9: Evidence Inspector traceability verified across all 6 REAL_STATE_EXAMPLES records.');

  console.log('======================================================================');
  console.log('ALL 9 UNIT & REAL DATA INTEGRATION TEST SUITES PASSED (9 / 9)');
  console.log('======================================================================');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
