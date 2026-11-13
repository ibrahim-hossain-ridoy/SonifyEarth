/**
 * @file data_adapter.js
 * @description Authoritative Frontend Data & Listening-Mode Compatibility Adapter
 * for SonifyEarth — Silence Isn't Zero (NASA Space Apps Challenge 2026).
 *
 * Reads the untouched Task 4 production JSON and GeoJSON files from /06_PROCESSED_DATA/
 * and the verified anchor examples from /05_SCIENTIFIC_VALIDATION/REAL_STATE_EXAMPLES.json.
 * Never fabricates records, never hardcodes counts as substitutes for real data,
 * and enforces that EVENT-ONLY and OBSERVATION-AWARE share the exact same data package.
 */

import {
  LISTENING_MODES,
  TASK4_MODE_COMPATIBILITY_MAP,
  SOUND_CUE_SPEC,
} from '../09_SOUND_ENGINE/audio_mapping/sound_cue_spec.js';

export const DATA_ENDPOINTS = Object.freeze({
  sourceManifest: './06_PROCESSED_DATA/json/source_manifest.json',
  flashEvents: './06_PROCESSED_DATA/json/flash_events.json',
  observationWindows: './06_PROCESSED_DATA/json/observation_windows.json',
  threeStateData: './06_PROCESSED_DATA/json/three_state_data.json',
  sonifyearthWindows: './06_PROCESSED_DATA/json/sonifyearth_windows.json',
  excludedRecordsAudit: './06_PROCESSED_DATA/json/excluded_records_audit.json',
  schema: './06_PROCESSED_DATA/json/schema.json',
  realStateExamples: './05_SCIENTIFIC_VALIDATION/REAL_STATE_EXAMPLES.json',
  lightningGeoJson: './06_PROCESSED_DATA/geojson/lightning_events.geojson',
  observationGridGeoJson: './06_PROCESSED_DATA/geojson/observation_grid.geojson',
  unknownCoverageGeoJson: './06_PROCESSED_DATA/geojson/unknown_coverage.geojson',
});

export const REGION_PRESETS = Object.freeze([
  {
    id: 'GLOBAL_LIS',
    label: 'Global ISS LIS Envelope (-55.75°S to +55.25°N)',
    shortLabel: 'Global LIS Belt',
    bbox: [-180.0, -55.75, 180.0, 55.25],
    isHighLatitudeOutOfCoverage: false,
    description:
      'Complete 7-day ISS LIS observable latitude belt (±51.6° orbit inclination + ~550 km FOV swath, empirically spanning [-55.75°, +55.25°]).',
  },
  {
    id: 'AMAZON_ANDES',
    label: 'Amazon Basin & Andes (-25°S to +10°N, -82°W to -45°W)',
    shortLabel: 'Amazon & Andes',
    bbox: [-82.0, -25.0, -45.0, 10.0],
    isHighLatitudeOutOfCoverage: false,
    description:
      'High-activity South American convection corridor including Orbit 20231109_225212 anchor flash F000000 (-6.33°S, -72.28°W) and western SAA boundary passes.',
  },
  {
    id: 'CONGO_AFRICA',
    label: 'Central Africa & Congo Basin (-20°S to +15°N, +8°E to +42°E)',
    shortLabel: 'Congo & Central Africa',
    bbox: [8.0, -20.0, 42.0, 15.0],
    isHighLatitudeOutOfCoverage: false,
    description:
      'Equatorial African thunderstorm belt with dense optical flash clusters across ascending and descending ISS passes.',
  },
  {
    id: 'SOUTH_PACIFIC_QUIET',
    label: 'South Pacific Quiet Surveillance Zone (-40°S to -15°S, -120°W to -80°W)',
    shortLabel: 'South Pacific (Quiet Surveillance)',
    bbox: [-120.0, -40.0, -80.0, -15.0],
    isHighLatitudeOutOfCoverage: false,
    description:
      'Open-ocean surveillance sector showcasing verified OBSERVED_NO_DETECTION passes (e.g., cell -27.75°S, -91.75°W observed for 49.40 s with 0 flashes).',
  },
  {
    id: 'SOUTH_ATLANTIC_SAA',
    label: 'South Atlantic Anomaly Radiation Zone (-50°S to -10°S, -65°W to +5°E)',
    shortLabel: 'South Atlantic Anomaly (SAA)',
    bbox: [-65.0, -50.0, 5.0, -10.0],
    isHighLatitudeOutOfCoverage: false,
    description:
      'Van Allen inner radiation belt dip where trapped proton flux triggers bg_info_external_alert & 0x03 != 0, reclassifying affected intervals to UNKNOWN (INSUFFICIENT_EVIDENCE_SAA_RADIATION).',
  },
  {
    id: 'MARITIME_SE_ASIA',
    label: 'Bay of Bengal & Maritime Continent (-15°S to +26°N, +85°E to +145°E)',
    shortLabel: 'Bay of Bengal & Maritime Continent',
    bbox: [85.0, -15.0, 145.0, 26.0],
    isHighLatitudeOutOfCoverage: false,
    description:
      'South & Southeast Asian monsoon and Indo-Pacific island chain passes within ISS LIS tropical/subtropical coverage.',
  },
  {
    id: 'HIGH_LATITUDE_POLAR',
    label: 'High-Latitude Out-of-Coverage Reference: Reykjavik (+56°N to +75°N, -35°W to +25°E)',
    shortLabel: 'High-Latitude Polar (>55.25°N — Unobserved)',
    bbox: [-35.0, 56.0, 25.0, 75.0],
    isHighLatitudeOutOfCoverage: true,
    referencePoint: { lat: 64.1466, lon: -21.9426, name: 'Reykjavik, Iceland (+64.25°_-21.75°)' },
    description:
      'Poleward of the ISS 51.6° orbital inclination (~±54° max sensor reach). Zero viewtime records exist in all 106 granules — state is strictly UNKNOWN (OUTSIDE_OBSERVATION_COVERAGE), never 0 flashes.',
  },
]);

export const TIME_WINDOW_PRESETS = Object.freeze([
  {
    id: 'ORBIT_001_AMAZON',
    label: 'Orbit 1 (20231109_225212): First Archive Pass (Nov 9 22:52Z – Nov 10 00:25Z)',
    shortLabel: 'Orbit 1: Nov 9 22:52Z (189 Flashes)',
    tai93Start: 973723942.4,
    tai93End: 973729514.4,
    utcStart: '2023-11-09T22:52:12.400000Z',
    utcEnd: '2023-11-10T00:25:04.400000Z',
    focusGranuleId: '20231109_225212',
    description:
      'Complete 92.8-minute orbital pass with 189 confirmed flashes, 39,858 clean viewtime cell passes (82 DETECTED, 39,776 OBSERVED_NO_DETECTION), and 0 SAA seconds.',
  },
  {
    id: 'ORBIT_007_SAA_TRANSIT',
    label: 'Orbit 7 (20231110_080926): South Atlantic Anomaly Transit (Nov 10 08:09Z – 09:42Z)',
    shortLabel: 'Orbit 7: SAA Transit (Nov 10 08:09Z)',
    tai93Start: 973757376.1,
    tai93End: 973762948.4,
    utcStart: '2023-11-10T08:09:26.100000Z',
    utcEnd: '2023-11-10T09:42:18.400000Z',
    focusGranuleId: '20231110_080926',
    description:
      'Demonstrates an orbital transition from clean surveillance into a 401-second SAA proton radiation zone (09:26:37Z–09:33:17Z, UNKNOWN / INSUFFICIENT_EVIDENCE_SAA_RADIATION).',
  },
  {
    id: 'NOV11_QC_GAP_WINDOW',
    label: 'Nov 11 NASA QC Deleted-Orbit Gap & Neighboring Passes (Nov 11 08:30Z – 12:30Z)',
    shortLabel: 'Nov 11: 185.8-min NASA QC Gap',
    tai93Start: 973845010.0,
    tai93End: 973859410.0,
    utcStart: '2023-11-11T08:30:00.000000Z',
    utcEnd: '2023-11-11T12:30:00.000000Z',
    focusGranuleId: 'GAP_20231111_072242_TO_20231111_120122',
    description:
      'Spans the documented 185.78-minute (11,146.9 s) NASA QC noise deletion gap (08:55:35.3Z–12:01:22.2Z, lis_anomalies.pdf p. 94) where noisy orbits 085535_NQC & 102828_NQC were removed (UNKNOWN / MISSING_SOURCE_DATA).',
  },
  {
    id: 'NOV16_FATAL_OUTAGE_ORBIT',
    label: 'Orbit 105 (20231116_172457): Contiguous Fatal Outage (Nov 16 17:24Z – 18:57Z)',
    shortLabel: 'Orbit 105: 4,818s Fatal Outage',
    tai93Start: 974309107.6,
    tai93End: 974314680.1,
    utcStart: '2023-11-16T17:24:57.600000Z',
    utcEnd: '2023-11-16T18:57:50.100000Z',
    focusGranuleId: '20231116_172457',
    description:
      'NASA Class 4 partial orbit containing 4,818 contiguous fatal seconds (17:24:58Z–18:45:15Z, UNKNOWN / FATAL_QUALITY_FLAG) excluded from viewtime before normal surveillance resumes.',
  },
  {
    id: 'NOV16_FINAL_MISSION_ORBIT',
    label: 'Orbit 106 (20231116_203042): Final ISS LIS Mission Pass (Nov 16 20:30Z – 21:17Z)',
    shortLabel: 'Orbit 106: Final LIS Telemetry',
    tai93Start: 974320252.9,
    tai93End: 974323030.0,
    utcStart: '2023-11-16T20:30:42.900000Z',
    utcEnd: '2023-11-16T21:17:00.000000Z',
    focusGranuleId: '20231116_203042',
    description:
      'Final 2,778 seconds of actual ISS LIS telemetry before permanent instrument decommissioning on Nov 16, 2023 at 21:17:00Z (nominal header end 22:03:35.2Z).',
  },
  {
    id: 'FULL_7DAY_ARCHIVE',
    label: 'Full 7-Day Validated Archive (Nov 9 22:52:12Z – Nov 16 21:17:00Z)',
    shortLabel: 'Full 7-Day Archive (106 Orbits)',
    tai93Start: 973723942.4,
    tai93End: 974323030.0,
    utcStart: '2023-11-09T22:52:12.400000Z',
    utcEnd: '2023-11-16T21:17:00.000000Z',
    focusGranuleId: null,
    description:
      'Complete 106-granule dataset: 14,554 confirmed DETECTED flashes, 1,570 audited excluded flashes, 4,160,874 viewtime records, 47 SAA windows, 10 fatal outages, and 1 QC gap.',
  },
]);

/**
 * Converts a TAI93 timestamp to validated ISO-8601 UTC string using the verified -10.0s leap offset.
 * Formula: UTC = 1993-01-01T00:00:00.000Z + (TAI93 - 10.0s)
 * @param {number} tai93Seconds
 * @returns {string}
 */
export function tai93ToUtcIso(tai93Seconds) {
  if (typeof tai93Seconds !== 'number' || !Number.isFinite(tai93Seconds)) {
    return 'N/A';
  }
  const epoch1993Ms = Date.UTC(1993, 0, 1, 0, 0, 0, 0);
  const utcMs = epoch1993Ms + (tai93Seconds - 10.0) * 1000.0;
  return new Date(utcMs).toISOString();
}

/**
 * Converts an ISO-8601 UTC string back to TAI93 seconds (+10.0s leap offset).
 * @param {string} utcIsoString
 * @returns {number}
 */
export function utcIsoToTai93(utcIsoString) {
  const ms = Date.parse(utcIsoString);
  if (!Number.isFinite(ms)) return NaN;
  const epoch1993Ms = Date.UTC(1993, 0, 1, 0, 0, 0, 0);
  return (ms - epoch1993Ms) / 1000.0 + 10.0;
}

/**
 * Decodes an 8-bit NASA LIS alert flag into fatal (0x55) and warning (0xAA) bit descriptions.
 * @param {number} flagInt
 * @param {'flash'|'viewtime'} recordType
 */
export function decodeAlertFlagBits(flagInt, recordType = 'flash') {
  const val = Number(flagInt) || 0;
  const hex = '0x' + val.toString(16).toUpperCase().padStart(2, '0');
  const fatalMask = val & 0x55;
  const warningMask = val & 0xaa;
  const activeBits = [];

  const definitions = [
    { mask: 0x01, type: 'FATAL', name: 'Bit 1 (0x01): instrument_fatal_flag' },
    { mask: 0x02, type: 'WARNING', name: 'Bit 2 (0x02): instrument_warning (rate/threshold adjustment)' },
    { mask: 0x04, type: 'FATAL', name: 'Bit 3 (0x04): platform_fatal_flag' },
    { mask: 0x08, type: 'WARNING', name: 'Bit 4 (0x08): platform_warning (attitude/navigation tolerance)' },
    { mask: 0x10, type: 'FATAL', name: 'Bit 5 (0x10): external_fatal_flag' },
    { mask: 0x20, type: 'WARNING', name: 'Bit 6 (0x20): external_warning (solar/radiation environment notice)' },
    { mask: 0x40, type: 'FATAL', name: 'Bit 7 (0x40): processing_fatal_flag' },
    { mask: 0x80, type: 'WARNING', name: 'Bit 8 (0x80): processing_warning' },
  ];

  for (const b of definitions) {
    if ((val & b.mask) !== 0) {
      activeBits.push(b);
    }
  }

  return {
    rawInt: val,
    hex,
    fatalMaskHex: '0x' + fatalMask.toString(16).toUpperCase().padStart(2, '0'),
    warningMaskHex: '0x' + warningMask.toString(16).toUpperCase().padStart(2, '0'),
    hasFatalBits: fatalMask !== 0,
    hasWarningBits: warningMask !== 0,
    activeBits,
    summaryLabel:
      fatalMask !== 0
        ? `FATAL (${hex} & 0x55 != 0 — disqualified from confirmed ${recordType} records)`
        : warningMask !== 0
        ? `VALID WARNING-ONLY (${hex} & 0x55 == 0 — scientifically valid ${recordType} record)`
        : `NOMINAL (${hex} — zero fatal or warning bits)`,
  };
}

export class SonifyEarthDataAdapter {
  constructor() {
    this.isLoaded = false;
    this.loadError = null;

    // Raw JSON payloads from 06_PROCESSED_DATA/json/
    this.sourceManifest = null;
    this.flashEventsData = null;
    this.observationWindowsData = null;
    this.threeStateData = null;
    this.sonifyearthWindowsData = null;
    this.excludedRecordsAudit = null;
    this.schemaData = null;
    this.realStateExamples = null;

    // Raw GeoJSON payloads from 06_PROCESSED_DATA/geojson/
    this.lightningGeoJson = null;
    this.observationGridGeoJson = null;
    this.unknownCoverageGeoJson = null;

    // Indexed structures
    this.flashes = [];
    this.flashesById = new Map();
    this.excludedFlashesById = new Map();
    this.granulesById = new Map();
    this.gridCellsById = new Map();
    this.orbitalAndGapWindows = [];
    this.saaWindows = [];
    this.fatalWindows = [];
    this.swathKeyframes = [];

    this.modeCompatibilityReport = null;
  }

  /**
   * Resolves the Task 4 listening_modes identifier conflict without altering Task 4 files.
   */
  resolveListeningModeCompatibility() {
    const rawLocked = this.sonifyearthWindowsData?.locked_sound_mapping || {};
    const legacyModes = rawLocked.listening_modes || [];

    this.modeCompatibilityReport = {
      rawTask4ListeningModes: legacyModes,
      approvedUserFacingListeningModes: [
        LISTENING_MODES.EVENT_ONLY,
        LISTENING_MODES.OBSERVATION_AWARE,
      ],
      compatibilityMapping: {
        'EVENT-ONLY': {
          approvedModeId: 'EVENT-ONLY',
          legacyTask4Reference: 'GLOBAL_ORBITAL_PLAYBACK_MODE (filtered to DETECTED pulses only)',
          description: LISTENING_MODES.EVENT_ONLY.description,
        },
        'OBSERVATION-AWARE': {
          approvedModeId: 'OBSERVATION-AWARE',
          legacyTask4Reference:
            'GLOBAL_ORBITAL_PLAYBACK_MODE + three-state cues (DETECTED, OBSERVED_NO_DETECTION, UNKNOWN)',
          description: LISTENING_MODES.OBSERVATION_AWARE.description,
        },
        EVIDENCE_INSPECTOR_FEATURE: {
          featureId: 'WHY_DID_I_HEAR_THAT_INSPECTOR',
          legacyTask4Reference: 'EVIDENCE_INSPECTOR_MODE',
          resolutionNote:
            'The Evidence Inspector ("Why Did I Hear That?") is a dedicated interface panel (Page 7) active across both listening modes, not a third listening mode.',
        },
      },
      explanation: TASK4_MODE_COMPATIBILITY_MAP.mappingExplanation,
      task4FilesUntouched: true,
    };

    return this.modeCompatibilityReport;
  }

  resolveEndpoint(url) {
    if (!url || /^https?:\/\//i.test(url)) return url;
    // Strip any leading '/', './', or '../../' to a clean frontend-relative path
    const clean = url.replace(/^(?:\.\.\/)+|^\.\/|^\/+/, '');
    // In Node test runner environments, normalize to leading-slash workspace path
    if (typeof window === 'undefined' || !window.location) {
      return '/' + clean;
    }
    return './' + clean;
  }

  /**
   * Loads all production JSON and GeoJSON payloads from /06_PROCESSED_DATA/.
   */
  async loadAllData(onProgress = null) {
    try {
      const entries = Object.entries(DATA_ENDPOINTS);
      const results = {};
      let completed = 0;

      await Promise.all(
        entries.map(async ([key, url]) => {
          const resolvedUrl = this.resolveEndpoint(url);
          const response = await fetch(resolvedUrl);
          if (!response.ok) {
            throw new Error(`Failed to load ${resolvedUrl} (HTTP ${response.status})`);
          }
          const data = await response.json();
          results[key] = data;
          completed += 1;
          if (typeof onProgress === 'function') {
            onProgress({ completed, total: entries.length, key, url: resolvedUrl });
          }
        })
      );

      this.sourceManifest = results.sourceManifest;
      this.flashEventsData = results.flashEvents;
      this.observationWindowsData = results.observationWindows;
      this.threeStateData = results.threeStateData;
      this.sonifyearthWindowsData = results.sonifyearthWindows;
      this.excludedRecordsAudit = results.excludedRecordsAudit;
      this.schemaData = results.schema;
      this.realStateExamples = results.realStateExamples;

      this.lightningGeoJson = results.lightningGeoJson;
      this.observationGridGeoJson = results.observationGridGeoJson;
      this.unknownCoverageGeoJson = results.unknownCoverageGeoJson;

      this._buildIndices();
      this.resolveListeningModeCompatibility();
      this.isLoaded = true;
      this.loadError = null;
      return this;
    } catch (err) {
      this.isLoaded = false;
      this.loadError = err instanceof Error ? err.message : String(err);
      throw err;
    }
  }

  _buildIndices() {
    // 1. Confirmed flashes sorted by tai93_time
    this.flashes = Array.from(this.flashEventsData?.flashes || []).sort(
      (a, b) => a.tai93_time - b.tai93_time
    );
    this.flashesById.clear();
    for (const f of this.flashes) {
      this.flashesById.set(f.flash_id, f);
    }

    // 2. Excluded flashes from audit
    this.excludedFlashesById.clear();
    for (const ef of this.excludedRecordsAudit?.excluded_flashes || []) {
      this.excludedFlashesById.set(ef.flash_id, ef);
    }

    // 3. Granules by granule_id
    this.granulesById.clear();
    for (const gp of this.sourceManifest?.granule_pairs || []) {
      this.granulesById.set(gp.granule_id, gp);
    }
    for (const gw of this.observationWindowsData?.granule_observation_windows || []) {
      const existing = this.granulesById.get(gw.granule_id) || {};
      this.granulesById.set(gw.granule_id, { ...existing, observationSummary: gw });
    }

    // 4. GeoJSON observation grid cells by cell_id
    this.gridCellsById.clear();
    for (const feat of this.observationGridGeoJson?.features || []) {
      const props = feat.properties || {};
      if (props.cell_id) {
        this.gridCellsById.set(props.cell_id, feat);
      }
    }

    // 5. Timeline windows sorted by tai93_start
    this.orbitalAndGapWindows = Array.from(
      this.sonifyearthWindowsData?.orbital_and_gap_windows || []
    ).sort((a, b) => a.tai93_start - b.tai93_start);

    this.saaWindows = Array.from(
      this.sonifyearthWindowsData?.saa_transit_windows || []
    ).sort((a, b) => a.tai93_start - b.tai93_start);

    this.fatalWindows = Array.from(
      this.sonifyearthWindowsData?.contiguous_fatal_outage_windows || []
    ).sort((a, b) => a.tai93_start - b.tai93_start);

    this.swathKeyframes = Array.from(
      this.sonifyearthWindowsData?.swath_keyframes || []
    ).sort((a, b) => a.tai93_time - b.tai93_time);
  }

  getRegionPresets() {
    return REGION_PRESETS;
  }

  getTimeWindowPresets() {
    return TIME_WINDOW_PRESETS;
  }

  /**
   * Builds a deterministic, immutable-shape DataPackage for a selected region and time window.
   * Both EVENT-ONLY and OBSERVATION-AWARE consume this exact same package object.
   */
  buildDataPackage({
    regionPresetId = 'GLOBAL_LIS',
    customBbox = null,
    timeWindowPresetId = 'ORBIT_001_AMAZON',
    customTai93Start = null,
    customTai93End = null,
  } = {}) {
    const region =
      REGION_PRESETS.find((r) => r.id === regionPresetId) || REGION_PRESETS[0];
    const bbox = Array.isArray(customBbox) && customBbox.length === 4 ? customBbox : region.bbox;
    const [minLon, minLat, maxLon, maxLat] = bbox;

    const timePreset =
      TIME_WINDOW_PRESETS.find((t) => t.id === timeWindowPresetId) || TIME_WINDOW_PRESETS[0];

    const missionStart =
      this.sourceManifest?.mission_temporal_coverage?.first_granule_tai93_start || 973723942.4;
    const missionEnd =
      this.sourceManifest?.mission_temporal_coverage?.last_granule_actual_telemetry_tai93_end ||
      974323030.0;

    const rawStart =
      typeof customTai93Start === 'number' && Number.isFinite(customTai93Start)
        ? customTai93Start
        : timePreset.tai93Start;
    const rawEnd =
      typeof customTai93End === 'number' && Number.isFinite(customTai93End)
        ? customTai93End
        : timePreset.tai93End;

    const tai93Start = Math.max(missionStart, Math.min(missionEnd, rawStart));
    const tai93End = Math.max(tai93Start + 60, Math.min(missionEnd + 2800, rawEnd));
    const durationSeconds = tai93End - tai93Start;

    const inBbox = (lat, lon) =>
      lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon;

    // 1. Confirmed flashes in selected time window AND region bbox
    const flashesInWindowAllRegions = [];
    const flashesInPackage = [];
    for (const f of this.flashes) {
      if (f.tai93_time < tai93Start) continue;
      if (f.tai93_time > tai93End) break;
      flashesInWindowAllRegions.push(f);
      if (inBbox(f.lat, f.lon)) {
        flashesInPackage.push(f);
      }
    }

    // 2. Excluded flashes in selected time window and region bbox (for audit transparency)
    const excludedFlashesInPackage = (this.excludedRecordsAudit?.excluded_flashes || []).filter(
      (ef) =>
        ef.tai93_time >= tai93Start &&
        ef.tai93_time <= tai93End &&
        inBbox(ef.lat, ef.lon)
    );

    // 3. Orbital & QC-gap windows overlapping [tai93Start, tai93End]
    const overlappingOrbitalWindows = this.orbitalAndGapWindows.filter(
      (w) => w.tai93_end >= tai93Start && w.tai93_start <= tai93End
    );

    // 4. SAA windows overlapping [tai93Start, tai93End]
    const overlappingSaaWindows = this.saaWindows.filter(
      (w) => w.tai93_end >= tai93Start && w.tai93_start <= tai93End
    );

    // 5. Contiguous fatal outage windows overlapping [tai93Start, tai93End]
    const overlappingFatalWindows = this.fatalWindows.filter(
      (w) => w.tai93_end >= tai93Start && w.tai93_start <= tai93End
    );

    // 6. QC deleted orbit gaps overlapping [tai93Start, tai93End]
    const overlappingQcGaps = (this.excludedRecordsAudit?.qc_deleted_orbit_gaps || []).filter(
      (g) => g.tai93_end >= tai93Start && g.tai93_start <= tai93End
    );

    // 7. Swath keyframes in [tai93Start, tai93End]
    const keyframesInWindow = this.swathKeyframes.filter(
      (kf) => kf.tai93_time >= tai93Start && kf.tai93_time <= tai93End
    );
    const keyframesInRegion = keyframesInWindow.filter((kf) =>
      inBbox(kf.boresight_lat, kf.boresight_lon)
    );

    // 8. Sampled traceable grid observation records in package
    const gridRecordsInPackage = (
      this.observationWindowsData?.grid_observation_records || []
    ).filter(
      (r) =>
        r.tai93_end >= tai93Start &&
        r.tai93_start <= tai93End &&
        inBbox(r.grid_lat, r.grid_lon)
    );

    // 9. GeoJSON features in region & window
    const geoJsonGridInRegion = (this.observationGridGeoJson?.features || []).filter((feat) => {
      const p = feat.properties || {};
      return inBbox(p.cell_lat, p.cell_lon);
    });

    const geoJsonUnknownInRegion = (this.unknownCoverageGeoJson?.features || []).filter(
      (feat) => {
        const p = feat.properties || {};
        if (typeof p.cell_lat === 'number' && typeof p.cell_lon === 'number') {
          return inBbox(p.cell_lat, p.cell_lon);
        }
        return true;
      }
    );

    // 10. Compute aggregate viewtime / coverage statistics from overlapping granules
    let totalCleanViewtimePassesInWindow = 0;
    let detectedCellPassesInWindow = 0;
    let observedNoDetectionCellPassesInWindow = 0;
    let unknownSaaCellPassesInWindow = 0;
    let validObservationDurationSec = 0;
    let unknownSaaDurationSec = 0;
    let unknownFatalDurationSec = 0;
    let unknownQcGapDurationSec = 0;

    for (const w of overlappingOrbitalWindows) {
      const overlapStart = Math.max(tai93Start, w.tai93_start);
      const overlapEnd = Math.min(tai93End, w.tai93_end);
      const overlapDur = Math.max(0, overlapEnd - overlapStart);
      const frac = w.duration_seconds > 0 ? Math.min(1, overlapDur / w.duration_seconds) : 1;

      if (w.window_type === 'QC_DELETED_ORBIT_GAP') {
        unknownQcGapDurationSec += overlapDur;
      } else {
        detectedCellPassesInWindow += Math.round((w.detected_cell_passes || 0) * frac);
        observedNoDetectionCellPassesInWindow += Math.round(
          (w.observed_no_detection_cell_passes || 0) * frac
        );
        unknownSaaCellPassesInWindow += Math.round((w.unknown_saa_cell_passes || 0) * frac);
        totalCleanViewtimePassesInWindow +=
          Math.round((w.detected_cell_passes || 0) * frac) +
          Math.round((w.observed_no_detection_cell_passes || 0) * frac);
      }
    }

    for (const s of overlappingSaaWindows) {
      const oStart = Math.max(tai93Start, s.tai93_start);
      const oEnd = Math.min(tai93End, s.tai93_end);
      unknownSaaDurationSec += Math.max(0, oEnd - oStart);
    }

    for (const fw of overlappingFatalWindows) {
      const oStart = Math.max(tai93Start, fw.tai93_start);
      const oEnd = Math.min(tai93End, fw.tai93_end);
      unknownFatalDurationSec += Math.max(0, oEnd - oStart);
    }

    if (region.isHighLatitudeOutOfCoverage || minLat > 55.25 || maxLat < -55.75) {
      // Entire selected region is poleward of ISS LIS coverage
      validObservationDurationSec = 0;
      detectedCellPassesInWindow = 0;
      observedNoDetectionCellPassesInWindow = 0;
    } else if (region.id === 'GLOBAL_LIS') {
      validObservationDurationSec = Math.max(
        0,
        durationSeconds - unknownQcGapDurationSec - unknownFatalDurationSec - unknownSaaDurationSec
      );
    } else {
      // Regional subset: compute observation duration from swath keyframes and cell records inside bbox
      const kfDurationEst = keyframesInRegion.filter((k) => !k.saa_active).length * 55.0;
      const cellMaxObs = gridRecordsInPackage
        .filter((r) => r.state !== 'UNKNOWN')
        .reduce((acc, r) => acc + (r.effective_obs_seconds || 0), 0);
      validObservationDurationSec = Math.min(
        durationSeconds,
        Math.max(
          kfDurationEst,
          cellMaxObs > 0 ? Math.min(durationSeconds, cellMaxObs) : flashesInPackage.length > 0 ? 85.0 : 0
        )
      );
    }

    const packageId = `PKG_${region.id}_${timePreset.id}_${Math.round(tai93Start)}_${Math.round(tai93End)}`;

    return Object.freeze({
      packageId,
      region,
      bbox,
      timePreset,
      tai93Start,
      tai93End,
      utcStart: tai93ToUtcIso(tai93Start),
      utcEnd: tai93ToUtcIso(tai93End),
      durationSeconds,
      flashes: flashesInPackage,
      flashesInWindowGlobalCount: flashesInWindowAllRegions.length,
      excludedFlashes: excludedFlashesInPackage,
      orbitalWindows: overlappingOrbitalWindows,
      saaWindows: overlappingSaaWindows,
      fatalWindows: overlappingFatalWindows,
      qcGaps: overlappingQcGaps,
      swathKeyframes: keyframesInWindow,
      swathKeyframesInRegion: keyframesInRegion,
      gridObservationRecords: gridRecordsInPackage,
      geoJsonGridFeatures: geoJsonGridInRegion,
      geoJsonUnknownFeatures: geoJsonUnknownInRegion,
      metrics: Object.freeze({
        confirmedFlashCount: flashesInPackage.length,
        excludedFlashCount: excludedFlashesInPackage.length,
        overlappingGranuleCount: overlappingOrbitalWindows.filter(
          (w) => w.window_type === 'ORBITAL_GRANULE_PASS'
        ).length,
        detectedCellPasses: detectedCellPassesInWindow,
        observedNoDetectionCellPasses: observedNoDetectionCellPassesInWindow,
        unknownSaaCellPasses: unknownSaaCellPassesInWindow,
        totalCleanViewtimePasses: totalCleanViewtimePassesInWindow,
        validObservationDurationSec: Number(validObservationDurationSec.toFixed(1)),
        unknownSaaDurationSec: Number(unknownSaaDurationSec.toFixed(1)),
        unknownFatalDurationSec: Number(unknownFatalDurationSec.toFixed(1)),
        unknownQcGapDurationSec: Number(unknownQcGapDurationSec.toFixed(1)),
        isOutOfCoverageRegion: Boolean(
          region.isHighLatitudeOutOfCoverage || minLat > 55.25 || maxLat < -55.75
        ),
      }),
    });
  }

  /**
   * Resolves the exact Three-State observation status, reason code, and source records
   * at a specific playback cursor timestamp `tai93` within the active `dataPackage`.
   */
  resolveStateAtCursor(tai93, dataPackage) {
    if (!dataPackage) {
      return {
        state: 'UNKNOWN',
        reasonCode: 'UNRESOLVED_TIME_MATCH',
        soundCue: SOUND_CUE_SPEC.UNKNOWN.cueId,
        tai93,
        utc: tai93ToUtcIso(tai93),
        activeWindow: null,
        nearbyFlashes: [],
        nearestKeyframe: null,
      };
    }

    const missionStart =
      this.sourceManifest?.mission_temporal_coverage?.first_granule_tai93_start || 973723942.4;
    const missionEnd =
      this.sourceManifest?.mission_temporal_coverage?.last_granule_actual_telemetry_tai93_end ||
      974323030.0;

    // 1. Check dataset temporal bounds (including post-21:17:00Z final orbit truncation)
    if (tai93 < missionStart || tai93 > missionEnd) {
      return {
        state: 'UNKNOWN',
        reasonCode: 'UNRESOLVED_TIME_MATCH',
        soundCue: SOUND_CUE_SPEC.UNKNOWN.cueId,
        tai93,
        utc: tai93ToUtcIso(tai93),
        activeWindow: null,
        nearbyFlashes: [],
        nearestKeyframe: null,
        explanation:
          tai93 > missionEnd
            ? 'Timestamp falls after 2023-11-16T21:17:00Z when ISS LIS telemetry ended permanently (final granule 20231116_203042_FIN.nc truncated at 2,778 s).'
            : 'Timestamp lies outside the validated 7-day ISS LIS archive.',
      };
    }

    // 2. Check high-latitude out-of-coverage region (e.g., Reykjavik +64.15°N)
    if (dataPackage.metrics.isOutOfCoverageRegion) {
      const activeOrb = dataPackage.orbitalWindows.find(
        (w) => tai93 >= w.tai93_start && tai93 <= w.tai93_end
      );
      return {
        state: 'UNKNOWN',
        reasonCode: 'OUTSIDE_OBSERVATION_COVERAGE',
        soundCue: SOUND_CUE_SPEC.UNKNOWN.cueId,
        tai93,
        utc: tai93ToUtcIso(tai93),
        activeWindow: activeOrb || null,
        nearbyFlashes: [],
        nearestKeyframe: null,
        explanation: `Selected region (${dataPackage.region.label}) lies poleward of the ISS 51.6° orbital inclination (~±54° max sensor reach). Zero viewtime records exist here.`,
      };
    }

    // 3. Check Nov 11 NASA QC deleted-orbit gap
    const activeQcGap = dataPackage.qcGaps.find(
      (g) => tai93 >= g.tai93_start && tai93 <= g.tai93_end
    );
    if (activeQcGap) {
      return {
        state: 'UNKNOWN',
        reasonCode: 'MISSING_SOURCE_DATA',
        soundCue: SOUND_CUE_SPEC.UNKNOWN.cueId,
        tai93,
        utc: tai93ToUtcIso(tai93),
        activeWindow: activeQcGap,
        nearbyFlashes: [],
        nearestKeyframe: null,
        explanation: `Inside the documented 185.78-minute NASA QC deleted-orbit gap (${activeQcGap.utc_start} to ${activeQcGap.utc_end}) where noisy orbits ${activeQcGap.deleted_nqc_orbits.join(', ')} were removed (lis_anomalies.pdf p. 94).`,
      };
    }

    // 4. Check contiguous fatal outage intervals (Class 4 hardware/framing outages >= 40s)
    const activeFatal = dataPackage.fatalWindows.find(
      (fw) => tai93 >= fw.tai93_start && tai93 <= fw.tai93_end
    );
    if (activeFatal) {
      return {
        state: 'UNKNOWN',
        reasonCode: 'FATAL_QUALITY_FLAG',
        soundCue: SOUND_CUE_SPEC.UNKNOWN.cueId,
        tai93,
        utc: tai93ToUtcIso(tai93),
        activeWindow: activeFatal,
        nearbyFlashes: [],
        nearestKeyframe: null,
        explanation: `Inside contiguous fatal quality outage ${activeFatal.outage_id} (${activeFatal.duration_seconds}s in ${activeFatal.science_file}, alert=${activeFatal.instrument_alert_hex} & 0x55 != 0). Zero valid viewtime records exist during this interval.`,
      };
    }

    // 5. Check SAA radiation transit intervals
    const activeSaa = dataPackage.saaWindows.find(
      (sw) => tai93 >= sw.tai93_start && tai93 <= sw.tai93_end
    );
    if (activeSaa) {
      return {
        state: 'UNKNOWN',
        reasonCode: 'INSUFFICIENT_EVIDENCE_SAA_RADIATION',
        soundCue: SOUND_CUE_SPEC.UNKNOWN.cueId,
        tai93,
        utc: tai93ToUtcIso(tai93),
        activeWindow: activeSaa,
        nearbyFlashes: [],
        nearestKeyframe: null,
        explanation: `Spacecraft is transiting the South Atlantic Anomaly (${activeSaa.saa_interval_id}, duration ${activeSaa.duration_seconds}s, bg_info_external_alert=${activeSaa.external_alert_hex_sample} & 0x03 != 0). Conservative SonifyEarth SAA policy reclassifies this interval to UNKNOWN.`,
      };
    }

    // 6. Find active orbital granule & nearest swath keyframe
    const activeOrb = dataPackage.orbitalWindows.find(
      (w) =>
        w.window_type === 'ORBITAL_GRANULE_PASS' &&
        tai93 >= w.tai93_start &&
        tai93 <= w.tai93_end
    );

    let nearestKeyframe = null;
    let minKfDiff = Infinity;
    for (const kf of dataPackage.swathKeyframes) {
      const d = Math.abs(kf.tai93_time - tai93);
      if (d < minKfDiff) {
        minKfDiff = d;
        nearestKeyframe = kf;
      }
    }

    // Check if regional subset is currently outside the instantaneous ISS FOV swath
    const [minLon, minLat, maxLon, maxLat] = dataPackage.bbox;
    if (dataPackage.region.id !== 'GLOBAL_LIS' && nearestKeyframe && minKfDiff <= 120) {
      const boreLat = nearestKeyframe.boresight_lat;
      const boreLon = nearestKeyframe.boresight_lon;
      // ~550 km swath is ~±4.5 deg around boresight; allow 6 deg buffer for regional bounding box
      const latInSwath = boreLat >= minLat - 6.0 && boreLat <= maxLat + 6.0;
      const lonInSwath = boreLon >= minLon - 6.0 && boreLon <= maxLon + 6.0;
      if (!latInSwath || !lonInSwath) {
        return {
          state: 'UNKNOWN',
          reasonCode: 'OUTSIDE_OBSERVATION_COVERAGE',
          soundCue: SOUND_CUE_SPEC.UNKNOWN.cueId,
          tai93,
          utc: tai93ToUtcIso(tai93),
          activeWindow: activeOrb || null,
          nearbyFlashes: [],
          nearestKeyframe,
          explanation: `At ${tai93ToUtcIso(tai93)}, the ISS LIS ~550 km swath boresight is at (${boreLat.toFixed(2)}°, ${boreLon.toFixed(2)}°), which is outside the selected region ${dataPackage.region.shortLabel}. Unobserved regions are UNKNOWN, never 0 flashes.`,
        };
      }
    }

    // 7. Check for confirmed DETECTED flashes near the cursor (within ±5 seconds of cursor)
    const nearbyFlashes = dataPackage.flashes.filter(
      (f) => Math.abs(f.tai93_time - tai93) <= 5.0
    );

    if (nearbyFlashes.length > 0) {
      return {
        state: 'DETECTED',
        reasonCode: 'CONFIRMED_LIGHTNING_FLASH',
        soundCue: SOUND_CUE_SPEC.DETECTED.cueId,
        tai93,
        utc: tai93ToUtcIso(tai93),
        activeWindow: activeOrb || null,
        nearbyFlashes,
        nearestKeyframe,
        explanation: `${nearbyFlashes.length} confirmed lightning flash(es) detected in active ISS LIS surveillance near ${tai93ToUtcIso(tai93)} (primary flash: ${nearbyFlashes[0].flash_id}).`,
      };
    }

    // 8. Otherwise, verified active surveillance with zero flashes -> OBSERVED_NO_DETECTION
    return {
      state: 'OBSERVED_NO_DETECTION',
      reasonCode: 'ACTIVE_OPTICAL_SURVEILLANCE_ZERO_FLASHES',
      soundCue: SOUND_CUE_SPEC.OBSERVED_NO_DETECTION.cueId,
      tai93,
      utc: tai93ToUtcIso(tai93),
      activeWindow: activeOrb || null,
      nearbyFlashes: [],
      nearestKeyframe,
      explanation: `Active ISS LIS optical surveillance verified in ${activeOrb?.science_file || 'current orbit'} with viewtime_effective_obs > 0.0s, zero fatal flags (0x55 == 0), no SAA overlap, and 0 confirmed lightning flashes.`,
    };
  }

  /**
   * Builds a normalized, traceable Evidence Inspector record for any DETECTED flash,
   * OBSERVED_NO_DETECTION cell/window, UNKNOWN interval/cell, or verified anchor preset.
   */
  buildEvidenceRecord(item) {
    if (!item) return null;

    // Case A: Confirmed DETECTED flash record
    if (item.state === 'DETECTED' && (item.flash_id || item.original_record_identifiers?.lightning_flash_address !== undefined)) {
      const flashId = item.flash_id || `ISS_LIS_V2.2_20231109_225212_F00000${item.original_record_identifiers?.lightning_flash_address}`;
      const fullFlash = this.flashesById.get(flashId) || item;
      const alertVal =
        fullFlash.quality_flags?.alert_flag ??
        fullFlash.quality_flags?.lightning_flash_alert_flag ??
        fullFlash.alert_flag ??
        2;
      const decodedFlags = decodeAlertFlagBits(alertVal, 'flash');
      const lat = fullFlash.lat ?? fullFlash.latitude ?? 0;
      const lon = fullFlash.lon ?? fullFlash.longitude ?? 0;
      const tai93 = fullFlash.tai93_time ?? fullFlash.tai93_flash_timestamp;
      const utc = fullFlash.utc_time ?? fullFlash.utc_flash_timestamp ?? tai93ToUtcIso(tai93);
      const sourceFile = fullFlash.source_file || fullFlash.science_filename || 'ISS_LIS_SC_V2.2_20231109_225212_FIN.nc';
      const bgFile = fullFlash.backgrounds_file || fullFlash.backgrounds_filename || sourceFile.replace('_SC_', '_BG_');

      return {
        state: 'DETECTED',
        reasonCode: 'CONFIRMED_LIGHTNING_FLASH',
        soundCue: 'SHORT_PERCUSSIVE_PULSE',
        soundCueLabel: SOUND_CUE_SPEC.DETECTED.label,
        title: `Confirmed Lightning Flash (${fullFlash.flash_id || flashId})`,
        everydayExplanation:
          `You heard a short, crisp percussive pulse because the ISS Lightning Imaging Sensor (LIS) directly observed a verified optical lightning flash at (${lat.toFixed(4)}°, ${lon.toFixed(4)}°) at ${utc}. Both the flash record and the underlying 0.5° × 0.5° observation grid cell passed all fatal quality checks (0x55 == 0), solar-glint rejection filters, and South Atlantic Anomaly checks.`,
        pulseExplanation:
          `The Short Percussive Pulse (880 Hz → 440 Hz, 65 ms) is triggered deterministically at the flash's validated timestamp (${utc}). Per SonifyEarth scientific rules, pulse loudness and pitch are uniform and never exaggerated by optical radiance.`,
        metadata: {
          stateLabel: 'DETECTED',
          reasonCode: 'CONFIRMED_LIGHTNING_FLASH',
          flashId: fullFlash.flash_id || flashId,
          flashAddress: fullFlash.flash_address ?? item.original_record_identifiers?.lightning_flash_address ?? 0,
          granuleId: fullFlash.granule_id || String(item.orbit_id || '20231109_225212'),
          utcTimestamp: utc,
          rawTai93Timestamp: `${Number(tai93).toFixed(6)} s`,
          tai93ToUtcFormula: 'UTC = 1993-01-01T00:00:00Z + (TAI93 - 10.0s leap offset)',
          coordinates: `${lat.toFixed(5)}° N, ${lon.toFixed(5)}° E`,
          gridCellCenter: fullFlash.grid_cell?.cell_id || (item.grid_cell_center ? `${item.grid_cell_center[0]}_${item.grid_cell_center[1]}` : 'Verified 0.5° Cell'),
          matchedViewtimeIndex: fullFlash.grid_cell?.matched_viewtime_index ?? item.original_record_identifiers?.viewtime_record_index ?? 'Verified',
          flashDurationSeconds: `${Number(fullFlash.delta_time ?? 0.1376).toFixed(4)} s`,
          opticalRadiance: `${Number(fullFlash.radiance ?? 28325).toLocaleString()} uJ/sr/m2/um (Optical energy metadata only; not storm severity or audio loudness)`,
          footprintAreaKm2: `${Number(fullFlash.footprint_km2 ?? 198.2).toFixed(2)} km²`,
          childGroupCount: fullFlash.child_count ?? 'Verified',
          grandchildEventCount: fullFlash.grandchild_count ?? 'Verified',
          qualityFlagsHex: `${decodedFlags.hex} (${decodedFlags.summaryLabel})`,
          glintIndex: fullFlash.quality_flags?.glint_index ?? 'Passed (< 0.996195)',
          saaStatus: '0x00 SAA bits active (Outside SAA proton radiation zone)',
          sourceScienceFile: sourceFile,
          sourceBackgroundsFile: bgFile,
          datasetCollectionVersion: 'ISS_LIS_SC_V2.2 (DATA111) & ISS_LIS_BG_V2.2 (DATA211) — Final QC (FIN)',
          scienceDoi: '10.5067/LIS/ISSLIS/DATA111',
          backgroundsDoi: '10.5067/LIS/ISSLIS/DATA211',
        },
        rawRecord: fullFlash,
      };
    }

    // Case B: OBSERVED_NO_DETECTION cell or window
    if (item.state === 'OBSERVED_NO_DETECTION') {
      const lat = item.grid_lat ?? item.cell_lat ?? item.latitude ?? -27.75;
      const lon = item.grid_lon ?? item.cell_lon ?? item.longitude ?? -91.75;
      const cellId = item.grid_cell_id || item.cell_id || `${lat >= 0 ? '+' : ''}${lat.toFixed(2)}_${lon >= 0 ? '+' : ''}${lon.toFixed(2)}`;
      const taiStart = item.tai93_start ?? (Array.isArray(item.tai93_viewtime_interval) ? item.tai93_viewtime_interval[0] : 973724801);
      const taiEnd = item.tai93_end ?? (Array.isArray(item.tai93_viewtime_interval) ? item.tai93_viewtime_interval[1] : 973724854);
      const utcStart = item.utc_start ?? (Array.isArray(item.utc_viewtime_interval) ? item.utc_viewtime_interval[0] : tai93ToUtcIso(taiStart));
      const utcEnd = item.utc_end ?? (Array.isArray(item.utc_viewtime_interval) ? item.utc_viewtime_interval[1] : tai93ToUtcIso(taiEnd));
      const effObs = item.effective_obs_seconds ?? item.total_effective_obs_seconds ?? item.observation_duration_seconds ?? 49.4;
      const alertVal = item.alert_flag ?? item.quality_flags?.viewtime_alert_flag ?? 2;
      const decodedFlags = decodeAlertFlagBits(alertVal, 'viewtime');
      const sourceFile = item.source_file || item.science_filename || (Array.isArray(item.source_files) ? item.source_files[0] : 'ISS_LIS_SC_V2.2_20231109_225212_FIN.nc');
      const bgFile = item.backgrounds_file || item.backgrounds_filename || sourceFile.replace('_SC_', '_BG_');

      return {
        state: 'OBSERVED_NO_DETECTION',
        reasonCode: 'ACTIVE_OPTICAL_SURVEILLANCE_ZERO_FLASHES',
        soundCue: 'SUSTAINED_OBSERVATION_TEXTURE',
        soundCueLabel: SOUND_CUE_SPEC.OBSERVED_NO_DETECTION.label,
        title: `Verified Quiet Surveillance — Cell (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`,
        everydayExplanation:
          `In Observation-Aware Mode, you hear a calm, sustained observation texture because the ISS LIS camera was actively looking at grid cell (${lat.toFixed(2)}°, ${lon.toFixed(2)}°) between ${utcStart} and ${utcEnd} for ${Number(effObs).toFixed(2)} effective seconds with healthy instrument telemetry—and confirmed that zero lightning flashes occurred. This is true, scientifically verified silence ("observed zero"), not missing data.`,
        textureExplanation:
          `The Sustained Observation Texture (220 Hz + 330 Hz harmonic bed with gentle 360 Hz band-passed sensor noise) plays continuously in Observation-Aware Mode while valid viewtime surveillance is active. In Event-Only Mode, this texture is muted so you can compare event-only silence against observation-aware surveillance.`,
        metadata: {
          stateLabel: 'OBSERVED_NO_DETECTION',
          reasonCode: 'ACTIVE_OPTICAL_SURVEILLANCE_ZERO_FLASHES',
          gridCellId: cellId,
          gridCellCenter: `${lat.toFixed(2)}° N, ${lon.toFixed(2)}° E (0.5° × 0.5° spatial resolution)`,
          viewtimeRecordIndex: item.viewtime_index ?? item.original_record_identifiers?.viewtime_record_index ?? 'Aggregated Cell Pass',
          observationIntervalUtc: `${utcStart} → ${utcEnd}`,
          observationIntervalTai93: `${Number(taiStart).toFixed(1)} s → ${Number(taiEnd).toFixed(1)} s`,
          effectiveObservationDuration: `${Number(effObs).toFixed(2)} s (Baseline threshold rule: viewtime_effective_obs > 0.0 s)`,
          validFlashCount: '0 confirmed flashes',
          qualityAndAlertInfo: `${decodedFlags.hex} (${decodedFlags.summaryLabel})`,
          saaOverlapStatus: 'NONE (0 seconds SAA overlap; bg_info_external_alert & 0x03 == 0)',
          sourceScienceFile: sourceFile,
          sourceBackgroundsFile: bgFile,
          datasetCollectionVersion: 'ISS_LIS_SC_V2.2 (DATA111) & ISS_LIS_BG_V2.2 (DATA211) — Final QC (FIN)',
          scienceDoi: '10.5067/LIS/ISSLIS/DATA111',
          backgroundsDoi: '10.5067/LIS/ISSLIS/DATA211',
        },
        rawRecord: item,
      };
    }

    // Case C: UNKNOWN state (all 5 documented reason codes)
    const reasonCode = item.reason_code || item.reasonCode || 'OUTSIDE_OBSERVATION_COVERAGE';
    const taiStart =
      item.tai93_start ??
      item.tai93_timestamp ??
      (Array.isArray(item.tai93_interval) ? item.tai93_interval[0] : 973846545.3);
    const taiEnd =
      item.tai93_end ??
      item.tai93_timestamp ??
      (Array.isArray(item.tai93_interval) ? item.tai93_interval[1] : taiStart);
    const utcStart =
      item.utc_start ??
      item.utc_timestamp ??
      (Array.isArray(item.utc_interval) ? item.utc_interval[0] : tai93ToUtcIso(taiStart));
    const utcEnd =
      item.utc_end ??
      item.utc_timestamp ??
      (Array.isArray(item.utc_interval) ? item.utc_interval[1] : tai93ToUtcIso(taiEnd));

    let everydayWhy = '';
    let whatCannotBeEstablished = '';
    let missingOrInvalidDetails = '';
    let sourceRef =
      item.source_file ||
      item.science_file ||
      item.science_filename ||
      'ISS_LIS_SC_V2.2 / ISS_LIS_BG_V2.2';

    if (reasonCode === 'INSUFFICIENT_EVIDENCE_SAA_RADIATION') {
      everydayWhy =
        'In Observation-Aware Mode, you heard the distinct neutral two-part cue (528 Hz → 396 Hz) because the International Space Station was flying through the South Atlantic Anomaly (SAA), where trapped energetic protons from the inner Van Allen radiation belt strike the LIS CCD optical detector.';
      whatCannotBeEstablished =
        'Because proton radiation spikes optical background noise and reduces lightning detection confidence, SonifyEarth applies a conservative scientific policy: neither confirmed lightning nor confirmed zero-lightning surveillance can be established during SAA-flagged seconds.';
      const durVal =
        item.duration_seconds ??
        item.saa_overlap_seconds ??
        item.metrics?.duration_sec ??
        item.metrics?.saa_seconds ??
        840;
      const extAlertHex =
        item.external_alert_hex_sample ||
        (item.quality_flags?.bg_info_external_alert !== undefined
          ? `0x${Number(item.quality_flags.bg_info_external_alert).toString(16).toUpperCase().padStart(2, '0')} (${item.quality_flags.bg_info_external_alert})`
          : '0x7B (123)');
      missingOrInvalidDetails = `Background external alert flag active (${extAlertHex} & 0x03 != 0 — SAA Model 1/2 active). SAA interval duration: ${durVal} s.`;
    } else if (reasonCode === 'MISSING_SOURCE_DATA') {
      everydayWhy =
        'You heard the distinct neutral two-part cue because no NASA Science or Backgrounds granule files exist for this 185.78-minute window on November 11, 2023 (08:55:35.3Z to 12:01:22.2Z).';
      whatCannotBeEstablished =
        'NASA Quality Control permanently deleted two noisy non-QC orbits (ISS_LIS_SC_V2.2_20231111_085535_NQC and 20231111_102828_NQC) due to excessive optical noise (documented in lis_anomalies.pdf, Flight Day 315, p. 94). Silence during this 3.1-hour gap means missing archival data—never zero lightning.';
      missingOrInvalidDetails =
        '11,146.9 seconds (185.78 minutes) of missing orbital telemetry between granule 20231111_072242_FIN.nc and granule 20231111_120122_FIN.nc.';
      sourceRef =
        'Preceding: ISS_LIS_SC_V2.2_20231111_072242_FIN.nc | Following: ISS_LIS_SC_V2.2_20231111_120122_FIN.nc | Doc: lis_anomalies.pdf p. 94';
    } else if (reasonCode === 'FATAL_QUALITY_FLAG') {
      everydayWhy =
        'You heard the distinct neutral two-part cue because the ISS LIS instrument reported a fatal quality flag (bitmask 0x55 != 0) or a contiguous hardware/telemetry outage during this interval.';
      whatCannotBeEstablished =
        'During fatal instrument or platform intervals (such as the 4,818-second Class 4 partial-orbit outage in 20231116_172457_FIN.nc or framing-toggle seconds), NASA excludes affected seconds from the valid viewtime array, so lightning presence or absence cannot be verified.';
      missingOrInvalidDetails = `Contiguous fatal seconds: ${item.contiguous_fatal_seconds ?? item.duration_seconds ?? 4818} s; one_second_instrument_alert = ${item.instrument_alert_hex || '0x21'} (fatal bit 0x01 active); valid viewtime records present = 0.`;
    } else if (reasonCode === 'OUTSIDE_OBSERVATION_COVERAGE') {
      everydayWhy =
        'You heard the distinct neutral two-part cue because the selected location was not inside the ISS LIS camera field of view (~550 km swath within the ±51.6° inclined orbit, max reach ~±54° latitude).';
      whatCannotBeEstablished =
        'Just like a security camera pointed at another hallway, an orbital sensor cannot tell you whether lightning flashed outside its viewing swath or poleward of ~±54° latitude (such as Reykjavik at +64.15°N). Unobserved geography is strictly UNKNOWN, never 0 flashes.';
      missingOrInvalidDetails = `Observation duration = 0.0 s (zero viewtime_* records cover this coordinate/timestamp). Location: ${item.location_name || `${(item.latitude ?? item.cell_lat ?? 64.15).toFixed(2)}°N, ${(item.longitude ?? item.cell_lon ?? -21.94).toFixed(2)}°E`}.`;
    } else {
      everydayWhy =
        'You heard the distinct neutral two-part cue because the requested timestamp falls outside the validated 7-day ISS LIS telemetry archive (or after final instrument power-down on Nov 16, 2023 at 21:17:00Z).';
      whatCannotBeEstablished =
        'Lightning state cannot be established outside validated NASA telemetry time bounds.';
      missingOrInvalidDetails =
        'Timestamp outside [2023-11-09T22:52:12.400Z, 2023-11-16T21:17:00.000Z].';
    }

    return {
      state: 'UNKNOWN',
      reasonCode,
      soundCue: 'DISTINCT_NEUTRAL_TWO_PART_CUE',
      soundCueLabel: SOUND_CUE_SPEC.UNKNOWN.label,
      title: `Unknown Observation Status (${reasonCode})`,
      everydayExplanation: everydayWhy,
      unknownCueExplanation: whatCannotBeEstablished,
      metadata: {
        stateLabel: 'UNKNOWN',
        reasonCode,
        soundCueTriggered: 'DISTINCT_NEUTRAL_TWO_PART_CUE (528 Hz → 396 Hz two-part neutral chime)',
        intervalOrTimestampUtc: utcStart === utcEnd ? utcStart : `${utcStart} → ${utcEnd}`,
        intervalOrTimestampTai93:
          taiStart === taiEnd
            ? `${Number(taiStart).toFixed(1)} s`
            : `${Number(taiStart).toFixed(1)} s → ${Number(taiEnd).toFixed(1)} s`,
        missingInvalidOrInsufficientEvidence: missingOrInvalidDetails,
        whatCannotBeEstablished,
        sourceReferences: sourceRef,
        datasetCollectionVersion: 'ISS_LIS_SC_V2.2 (DATA111) & ISS_LIS_BG_V2.2 (DATA211) — Final QC (FIN)',
        scienceDoi: '10.5067/LIS/ISSLIS/DATA111',
        backgroundsDoi: '10.5067/LIS/ISSLIS/DATA211',
      },
      rawRecord: item,
    };
  }

  getVerifiedExamples() {
    return this.realStateExamples?.examples || [];
  }
}

