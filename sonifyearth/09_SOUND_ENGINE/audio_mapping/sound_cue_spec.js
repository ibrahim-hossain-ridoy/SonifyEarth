/**
 * @file sound_cue_spec.js
 * @description Authoritative acoustic synthesis specification and scientific guardrails
 * for SonifyEarth — Silence Isn't Zero (NASA Space Apps Challenge 2026).
 *
 * Strictly enforces:
 * - Two approved listening modes: EVENT-ONLY and OBSERVATION-AWARE
 * - Three approved sound cues:
 *   1. DETECTED -> SHORT_PERCUSSIVE_PULSE
 *   2. OBSERVED_NO_DETECTION -> SUSTAINED_OBSERVATION_TEXTURE
 *   3. UNKNOWN -> DISTINCT_NEUTRAL_TWO_PART_CUE
 * - Hard prohibitions against radiance-to-loudness, latitude-to-pitch,
 *   background-radiance-to-drone, solar-vector modulation, and prerecorded thunder.
 */

export const LISTENING_MODES = Object.freeze({
  EVENT_ONLY: {
    id: 'EVENT-ONLY',
    label: 'Event-Only Mode',
    shortLabel: 'EVENT-ONLY',
    description:
      'Audibly triggers short percussive pulses only for quality-confirmed DETECTED lightning flashes at their validated UTC/TAI93 timestamps. Visual telemetry and the Evidence Inspector still explicitly distinguish OBSERVED_NO_DETECTION from UNKNOWN so missing coverage is never mistaken for zero lightning.',
    cuesActive: Object.freeze({
      DETECTED: true,
      OBSERVED_NO_DETECTION: false,
      UNKNOWN: false,
    }),
  },
  OBSERVATION_AWARE: {
    id: 'OBSERVATION-AWARE',
    label: 'Observation-Aware Mode',
    shortLabel: 'OBSERVATION-AWARE',
    description:
      'Sonifies all three scientific observation states over the exact same selected data package: crisp percussive pulses for DETECTED flashes, a clearly audible sustained observation texture during verified OBSERVED_NO_DETECTION surveillance, and a distinct neutral two-part cue whenever observation status is UNKNOWN.',
    cuesActive: Object.freeze({
      DETECTED: true,
      OBSERVED_NO_DETECTION: true,
      UNKNOWN: true,
    }),
  },
});

export const TASK4_MODE_COMPATIBILITY_MAP = Object.freeze({
  legacyTask4Identifiers: Object.freeze([
    'EVIDENCE_INSPECTOR_MODE',
    'GLOBAL_ORBITAL_PLAYBACK_MODE',
  ]),
  approvedProductListeningModes: Object.freeze([
    'EVENT-ONLY',
    'OBSERVATION-AWARE',
  ]),
  mappingExplanation:
    'Task 4 configuration (processing_config.json and sonifyearth_windows.json) recorded UI workflow labels (EVIDENCE_INSPECTOR_MODE, GLOBAL_ORBITAL_PLAYBACK_MODE) under listening_modes. Per the Master Project Specification (Conflict Q1 & Task 5 Section 5), the frontend compatibility adapter maps user-facing listening modes strictly to EVENT-ONLY and OBSERVATION-AWARE while preserving the Why Did I Hear That? Evidence Inspector as a dedicated core interface panel available in both modes.',
});

export const SOUND_CUE_SPEC = Object.freeze({
  DETECTED: Object.freeze({
    state: 'DETECTED',
    cueId: 'SHORT_PERCUSSIVE_PULSE',
    label: 'Short Percussive Pulse',
    badgeSymbol: '◆',
    summary:
      'Crisp 65 ms synthesized optical transient (880 Hz -> 440 Hz pitch-drop sine/triangle core with 2.2 kHz transient click).',
    scientificMeaning:
      'A quality-accepted ISS LIS lightning flash (fatal bitmask 0x55 == 0, non-glint, zero 1-second SAA overlap) occurred at this validated TAI93/UTC timestamp.',
    synthesisParams: Object.freeze({
      primaryWaveform: 'triangle',
      startFreqHz: 880,
      endFreqHz: 440,
      clickFilterFreqHz: 2200,
      attackSeconds: 0.004,
      decaySeconds: 0.061,
      totalDurationSeconds: 0.065,
      fixedPeakGain: 0.34,
      minClusterArticulationGapMs: 22,
      maxPolyphonicVoices: 12,
    }),
    prohibitions: Object.freeze([
      'Fixed amplitude: never modulated by lightning_flash_radiance',
      'Fixed pitch: never modulated by flash latitude or footprint area',
    ]),
  }),

  OBSERVED_NO_DETECTION: Object.freeze({
    state: 'OBSERVED_NO_DETECTION',
    cueId: 'SUSTAINED_OBSERVATION_TEXTURE',
    label: 'Sustained Observation Texture',
    badgeSymbol: '◎',
    summary:
      'Calm, continuous band-passed orbital sensor texture (220 Hz + 330 Hz warm harmonic bed with 360 Hz band-passed airy noise).',
    scientificMeaning:
      'ISS LIS was actively viewing this 0.5° × 0.5° region (viewtime_effective_obs > 0.0 s, 0x55 fatal == 0, no SAA) and confirmed zero lightning flashes during the observation window.',
    synthesisParams: Object.freeze({
      fundamentalFreqHz: 220,
      fifthFreqHz: 330,
      noiseBandpassFreqHz: 360,
      noiseBandpassQ: 3.5,
      lfoRateHz: 0.25,
      fadeInSeconds: 0.12,
      fadeOutSeconds: 0.15,
      fixedSustainedGain: 0.16,
    }),
    prohibitions: Object.freeze([
      'Fixed spectral profile: never modulated by bg_data background radiance or solar zenith angle',
    ]),
  }),

  UNKNOWN: Object.freeze({
    state: 'UNKNOWN',
    cueId: 'DISTINCT_NEUTRAL_TWO_PART_CUE',
    label: 'Distinct Neutral Two-Part Cue',
    badgeSymbol: '⊘',
    summary:
      'Unmistakable two-part neutral chime (Part 1: 528 Hz for 110 ms -> 35 ms gap -> Part 2: 396 Hz for 135 ms).',
    scientificMeaning:
      'Observation status cannot be established as either confirmed lightning or confirmed zero-flash surveillance (due to SAA proton radiation, fatal hardware flag, Nov 11 NASA QC deleted-orbit gap, or location outside the ~±54° ISS swath).',
    synthesisParams: Object.freeze({
      part1Waveform: 'sine',
      part1FreqHz: 528,
      part1DurationSeconds: 0.11,
      interPartGapSeconds: 0.035,
      part2Waveform: 'triangle',
      part2FreqHz: 396,
      part2DurationSeconds: 0.135,
      totalDurationSeconds: 0.28,
      fixedPeakGain: 0.26,
      periodicReminderIntervalSeconds: 2.4,
    }),
    reasonCodeLabels: Object.freeze({
      INSUFFICIENT_EVIDENCE_SAA_RADIATION:
        'South Atlantic Anomaly (SAA) radiation zone — trapped proton flux saturates CCD optical background',
      FATAL_QUALITY_FLAG:
        'Fatal instrument/platform/processing quality flag (bitmask 0x55 != 0 or contiguous hardware outage)',
      MISSING_SOURCE_DATA:
        'Documented NASA QC orbit deletion gap (Nov 11, 2023 08:55:35Z–12:01:22Z noisy orbits removed)',
      OUTSIDE_OBSERVATION_COVERAGE:
        'Coordinate lies outside the instantaneous ~550 km ISS LIS swath or poleward of the ~±54° orbital envelope',
      UNRESOLVED_TIME_MATCH:
        'Requested timestamp lies outside the validated 7-day archival dataset bounds',
    }),
  }),
});

export const PROHIBITED_SOUND_MAPPINGS = Object.freeze([
  'radiance_to_loudness_or_storm_intensity',
  'latitude_to_pitch',
  'background_radiance_to_ambient_drone',
  'solar_vector_to_audio_modulation',
  'prerecorded_thunder_or_music',
]);

/**
 * Validates that a requested listening mode is one of the two locked product modes.
 * @param {string} modeId
 * @returns {boolean}
 */
export function isValidListeningMode(modeId) {
  return modeId === 'EVENT-ONLY' || modeId === 'OBSERVATION-AWARE';
}

/**
 * Returns the formal sound cue specification for a given scientific state.
 * @param {'DETECTED'|'OBSERVED_NO_DETECTION'|'UNKNOWN'} state
 */
export function getCueSpecForState(state) {
  return SOUND_CUE_SPEC[state] || SOUND_CUE_SPEC.UNKNOWN;
}

