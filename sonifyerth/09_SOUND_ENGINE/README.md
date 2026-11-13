# 09_SOUND_ENGINE — Observation-Aware Web Audio API Engine

This directory contains the authoritative Web Audio API sound specification and deterministic playback engine for **SonifyEarth — Silence Isn't Zero** (*An Observation-Aware Lightning Jukebox*).

## Structure
- [`audio_mapping/sound_cue_spec.js`](./audio_mapping/sound_cue_spec.js): Defines the two locked listening modes (`EVENT-ONLY` and `OBSERVATION-AWARE`), the Task 4 compatibility mapping, the three approved sound cues (`SHORT_PERCUSSIVE_PULSE`, `SUSTAINED_OBSERVATION_TEXTURE`, `DISTINCT_NEUTRAL_TWO_PART_CUE`), and explicit runtime prohibitions against unapproved acoustic mappings.
- [`playback/sound_engine.js`](./playback/sound_engine.js): Browser-native Web Audio API synthesis and deterministic scheduler (`SonifyEarthSoundEngine`) featuring zero autoplay, polyphony density management without silent record loss, and immediate node cancellation on pause/stop/seek.

## Scientific Sound Rules (Locked)
1. **`DETECTED` $\to$ `SHORT_PERCUSSIVE_PULSE`**: Triggered at validated flash `TAI93` / `UTC` timestamps (`880 Hz -> 440 Hz` 65 ms transient pulse). Amplitude and pitch are uniform and never modulated by `lightning_flash_radiance` or latitude.
2. **`OBSERVED_NO_DETECTION` $\to$ `SUSTAINED_OBSERVATION_TEXTURE`**: Active in `OBSERVATION-AWARE` mode (`220 Hz + 330 Hz` harmonic bed + `360 Hz` band-passed pink noise) when ISS LIS actively observes a cell/window with zero flashes. Never modulated by `bg_data` background radiance.
3. **`UNKNOWN` $\to$ `DISTINCT_NEUTRAL_TWO_PART_CUE`**: Active in `OBSERVATION-AWARE` mode (`528 Hz` $\to$ `396 Hz` two-part chime) when observation status cannot be established (`INSUFFICIENT_EVIDENCE_SAA_RADIATION`, `FATAL_QUALITY_FLAG`, `MISSING_SOURCE_DATA`, `OUTSIDE_OBSERVATION_COVERAGE`, `UNRESOLVED_TIME_MATCH`).
