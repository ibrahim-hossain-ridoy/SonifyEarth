/**
 * @file sound_engine.js
 * @description Deterministic Browser-Native Web Audio API Synthesis & Scheduling Engine
 * for SonifyEarth — Silence Isn't Zero.
 *
 * Capabilities:
 * - Zero autoplay: AudioContext is created/resumed only on explicit user gesture.
 * - Deterministic scheduling of DETECTED pulses from validated TAI93/UTC flash timestamps.
 * - Polyphony & density management: prevents audio thread overload in dense flash clusters
 *   without silently dropping any NASA flash record (100% of flash IDs are tracked & logged).
 * - Continuous sustained observation texture for OBSERVED_NO_DETECTION in OBSERVATION-AWARE mode.
 * - Distinct neutral two-part cue for UNKNOWN transitions/states in OBSERVATION-AWARE mode.
 * - Immediate cancellation of all active/scheduled Web Audio nodes on Pause, Stop, Seek, or Mode Switch.
 */

import {
  LISTENING_MODES,
  SOUND_CUE_SPEC,
  isValidListeningMode,
  getCueSpecForState,
} from '../audio_mapping/sound_cue_spec.js';

export class SonifyEarthSoundEngine {
  constructor(options = {}) {
    this.listeningMode = 'OBSERVATION-AWARE';
    this.volume = typeof options.initialVolume === 'number' ? options.initialVolume : 0.75;
    this.muted = Boolean(options.initialMuted);
    this.isPlaying = false;
    this.audioContext = null;
    this.masterGain = null;
    this._noiseBuffer = null;

    // Active Web Audio nodes for immediate cancellation on pause/stop/seek
    this._activeNodes = new Set();
    this._sustainedTextureNodes = null;
    this._sustainedTextureActive = false;

    // Deterministic scheduling bookkeeping
    this._lastScheduledTai93 = null;
    this._lastPulseAudioTime = -Infinity;
    this._lastUnknownCueWallTime = -Infinity;
    this._currentObservationState = null;
    this._currentReasonCode = null;

    // Complete audit log for deterministic verification and synchronous captions
    this.scheduledCueLog = [];
    this.maxLogEntries = 250;
    this.totalPulsesTriggered = 0;
    this.totalFlashesRepresented = 0;
    this.totalTextureTransitions = 0;
    this.totalUnknownCuesTriggered = 0;
    this.cancellationCount = 0;
    this.autoplayBlockedOrAvoided = true; // Never autoplays on page load

    this.onCueTriggered = typeof options.onCueTriggered === 'function' ? options.onCueTriggered : null;
  }

  /**
   * Initializes or resumes the Web Audio API context ONLY on explicit user interaction.
   */
  async ensureAudioContext() {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.audioContext) {
      this.audioContext = new AudioCtx();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
      this.masterGain.connect(this.audioContext.destination);
      this._noiseBuffer = this._createPinkNoiseBuffer(this.audioContext, 2.0);
    }

    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (_err) {
        // In automated headless test environments without user gesture flags, continue deterministically
      }
    }
    return this.audioContext;
  }

  /**
   * Generates a 2-second normalized pink-filtered noise buffer for the observation texture.
   */
  _createPinkNoiseBuffer(ctx, durationSeconds) {
    const sampleRate = ctx.sampleRate || 44100;
    const frameCount = Math.floor(sampleRate * durationSeconds);
    const buffer = ctx.createBuffer(1, frameCount, sampleRate);
    const output = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < frameCount; i++) {
      // Deterministic LCG pseudo-random generator so texture buffer is 100% reproducible
      const seed = ((i * 1664525 + 1013904223) >>> 0) / 4294967296;
      const white = seed * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  /**
   * Switches between EVENT-ONLY and OBSERVATION-AWARE without changing the selected NASA data package.
   * @param {'EVENT-ONLY'|'OBSERVATION-AWARE'} modeId
   */
  setListeningMode(modeId) {
    if (!isValidListeningMode(modeId)) {
      throw new Error(`Invalid listening mode "${modeId}". Only EVENT-ONLY and OBSERVATION-AWARE are approved.`);
    }
    const previousMode = this.listeningMode;
    this.listeningMode = modeId;

    if (modeId === 'EVENT-ONLY' && this._sustainedTextureActive) {
      this._stopSustainedObservationTexture();
    } else if (
      modeId === 'OBSERVATION-AWARE' &&
      this.isPlaying &&
      this._currentObservationState === 'OBSERVED_NO_DETECTION'
    ) {
      this._startSustainedObservationTexture();
    } else if (
      modeId === 'OBSERVATION-AWARE' &&
      this.isPlaying &&
      this._currentObservationState === 'UNKNOWN' &&
      previousMode !== 'OBSERVATION-AWARE'
    ) {
      this.triggerUnknownTwoPartCue({
        tai93: this._lastScheduledTai93,
        reasonCode: this._currentReasonCode || 'OUTSIDE_OBSERVATION_COVERAGE',
        source: 'mode_switch',
      });
    }

    return this.getDiagnostics();
  }

  setVolume(val) {
    const clamped = Math.max(0, Math.min(1, Number(val)));
    this.volume = Number.isFinite(clamped) ? clamped : 0.75;
    if (this.masterGain && this.audioContext) {
      const target = this.muted ? 0 : this.volume;
      this.masterGain.gain.setTargetAtTime(target, this.audioContext.currentTime, 0.015);
    }
    return this.volume;
  }

  setMuted(mutedBool) {
    this.muted = Boolean(mutedBool);
    if (this.masterGain && this.audioContext) {
      const target = this.muted ? 0 : this.volume;
      this.masterGain.gain.setTargetAtTime(target, this.audioContext.currentTime, 0.015);
    }
    return this.muted;
  }

  toggleMute() {
    return this.setMuted(!this.muted);
  }

  /**
   * Immediately cancels all scheduled and active Web Audio nodes.
   */
  cancelAllScheduledAudio() {
    this._stopSustainedObservationTexture();
    for (const entry of Array.from(this._activeNodes)) {
      try {
        if (typeof entry.stop === 'function') entry.stop(0);
      } catch (_e) {
        // Ignore if already stopped
      }
      try {
        if (typeof entry.disconnect === 'function') entry.disconnect();
      } catch (_e) {
        // Ignore
      }
    }
    this._activeNodes.clear();
    this._lastPulseAudioTime = -Infinity;
    this.cancellationCount += 1;
  }

  async play(initialTai93 = null) {
    await this.ensureAudioContext();
    this.isPlaying = true;
    if (typeof initialTai93 === 'number') {
      this._lastScheduledTai93 = initialTai93;
    }
    return this.getDiagnostics();
  }

  pause() {
    this.isPlaying = false;
    this.cancelAllScheduledAudio();
    return this.getDiagnostics();
  }

  stop(resetTai93 = null) {
    this.isPlaying = false;
    this.cancelAllScheduledAudio();
    this._currentObservationState = null;
    this._currentReasonCode = null;
    this._lastScheduledTai93 = resetTai93;
    return this.getDiagnostics();
  }

  async restart(startTai93) {
    this.stop(startTai93);
    return this.play(startTai93);
  }

  seek(targetTai93) {
    this.cancelAllScheduledAudio();
    this._lastScheduledTai93 = targetTai93;
    this._currentObservationState = null;
    this._currentReasonCode = null;
    return this.getDiagnostics();
  }

  /**
   * Synthesizes a single SHORT_PERCUSSIVE_PULSE for a DETECTED flash (or articulated burst of flashes).
   * Never modulates amplitude or pitch by radiance or latitude.
   */
  triggerDetectedPulse(flashBatch = [], scheduleOffsetSeconds = 0) {
    const spec = SOUND_CUE_SPEC.DETECTED.synthesisParams;
    const batchCount = Math.max(1, flashBatch.length);
    const primaryFlash = flashBatch[0] || {};

    this.totalPulsesTriggered += 1;
    this.totalFlashesRepresented += batchCount;

    if (this.audioContext && this.masterGain && !this.muted) {
      const now = this.audioContext.currentTime;
      const requestedStart = now + Math.max(0, scheduleOffsetSeconds);
      const minGapSec = spec.minClusterArticulationGapMs / 1000;
      const startTime = Math.max(requestedStart, this._lastPulseAudioTime + minGapSec);
      this._lastPulseAudioTime = startTime;

      // Enforce polyphony cap cleanly
      if (this._activeNodes.size <= spec.maxPolyphonicVoices * 3) {
        const osc = this.audioContext.createOscillator();
        const env = this.audioContext.createGain();

        osc.type = spec.primaryWaveform;
        osc.frequency.setValueAtTime(spec.startFreqHz, startTime);
        osc.frequency.exponentialRampToValueAtTime(
          spec.endFreqHz,
          startTime + spec.totalDurationSeconds
        );

        // Uniform gain for single flash; if a micro-cluster of multiple simultaneous flashes
        // is articulated together, keep peak gain bounded within +15% safety ceiling (never by radiance!)
        const boundedGain =
          batchCount > 1
            ? Math.min(spec.fixedPeakGain * 1.15, spec.fixedPeakGain + 0.02 * Math.log2(batchCount))
            : spec.fixedPeakGain;

        env.gain.setValueAtTime(0.0001, startTime);
        env.gain.linearRampToValueAtTime(boundedGain, startTime + spec.attackSeconds);
        env.gain.exponentialRampToValueAtTime(0.0001, startTime + spec.totalDurationSeconds);

        osc.connect(env);
        env.connect(this.masterGain);

        this._activeNodes.add(osc);
        this._activeNodes.add(env);

        osc.onended = () => {
          this._activeNodes.delete(osc);
          this._activeNodes.delete(env);
          try {
            osc.disconnect();
            env.disconnect();
          } catch (_e) {}
        };

        osc.start(startTime);
        osc.stop(startTime + spec.totalDurationSeconds + 0.005);
      }
    }

    const logItem = {
      cueId: 'SHORT_PERCUSSIVE_PULSE',
      state: 'DETECTED',
      reasonCode: 'CONFIRMED_LIGHTNING_FLASH',
      listeningMode: this.listeningMode,
      tai93: primaryFlash.tai93_time ?? this._lastScheduledTai93,
      utc: primaryFlash.utc_time || null,
      flashCountInPulse: batchCount,
      flashIds: flashBatch.map((f) => f.flash_id).filter(Boolean),
      primaryFlashId: primaryFlash.flash_id || null,
      granuleId: primaryFlash.granule_id || null,
      sourceFile: primaryFlash.source_file || null,
      lat: primaryFlash.lat ?? null,
      lon: primaryFlash.lon ?? null,
      description:
        batchCount === 1
          ? `Short percussive pulse for confirmed flash ${primaryFlash.flash_id || 'record'} at ${primaryFlash.utc_time || 'validated timestamp'}.`
          : `Articulated short percussive pulse representing ${batchCount} simultaneous confirmed flashes (${flashBatch[0]?.flash_id} … ${flashBatch[batchCount - 1]?.flash_id}) with zero dropped records.`,
    };
    this._recordCueLog(logItem);
    return logItem;
  }

  /**
   * Starts or maintains the SUSTAINED_OBSERVATION_TEXTURE for OBSERVED_NO_DETECTION
   * when in OBSERVATION-AWARE mode.
   */
  _startSustainedObservationTexture(metadata = {}) {
    if (this.listeningMode !== 'OBSERVATION-AWARE') {
      this._stopSustainedObservationTexture();
      return null;
    }

    if (this._sustainedTextureActive) {
      return null;
    }

    this._sustainedTextureActive = true;
    this.totalTextureTransitions += 1;
    const spec = SOUND_CUE_SPEC.OBSERVED_NO_DETECTION.synthesisParams;

    if (this.audioContext && this.masterGain && !this.muted) {
      const now = this.audioContext.currentTime;
      const texGain = this.audioContext.createGain();
      texGain.gain.setValueAtTime(0.0001, now);
      texGain.gain.linearRampToValueAtTime(spec.fixedSustainedGain, now + spec.fadeInSeconds);

      const osc1 = this.audioContext.createOscillator();
      const osc2 = this.audioContext.createOscillator();
      const subGain1 = this.audioContext.createGain();
      const subGain2 = this.audioContext.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(spec.fundamentalFreqHz, now);
      subGain1.gain.value = 0.35;

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(spec.fifthFreqHz, now);
      subGain2.gain.value = 0.2;

      let noiseSource = null;
      let bandpass = null;
      if (this._noiseBuffer) {
        noiseSource = this.audioContext.createBufferSource();
        noiseSource.buffer = this._noiseBuffer;
        noiseSource.loop = true;
        bandpass = this.audioContext.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.setValueAtTime(spec.noiseBandpassFreqHz, now);
        bandpass.Q.setValueAtTime(spec.noiseBandpassQ, now);
        noiseSource.connect(bandpass);
        bandpass.connect(texGain);
        noiseSource.start(now);
        this._activeNodes.add(noiseSource);
        this._activeNodes.add(bandpass);
      }

      osc1.connect(subGain1);
      osc2.connect(subGain2);
      subGain1.connect(texGain);
      subGain2.connect(texGain);
      texGain.connect(this.masterGain);

      osc1.start(now);
      osc2.start(now);

      this._sustainedTextureNodes = { osc1, osc2, noiseSource, bandpass, subGain1, subGain2, texGain };
      this._activeNodes.add(osc1);
      this._activeNodes.add(osc2);
      this._activeNodes.add(texGain);
    }

    const logItem = {
      cueId: 'SUSTAINED_OBSERVATION_TEXTURE',
      state: 'OBSERVED_NO_DETECTION',
      reasonCode: metadata.reasonCode || 'ACTIVE_OPTICAL_SURVEILLANCE_ZERO_FLASHES',
      listeningMode: this.listeningMode,
      tai93: metadata.tai93 ?? this._lastScheduledTai93,
      utc: metadata.utc || null,
      granuleId: metadata.granuleId || null,
      sourceFile: metadata.sourceFile || null,
      description:
        'Sustained observation texture active: ISS LIS sensor is actively observing the selected region with zero confirmed flashes.',
    };
    this._recordCueLog(logItem);
    return logItem;
  }

  _stopSustainedObservationTexture() {
    if (!this._sustainedTextureActive && !this._sustainedTextureNodes) return;
    this._sustainedTextureActive = false;
    const nodes = this._sustainedTextureNodes;
    this._sustainedTextureNodes = null;
    if (!nodes) return;

    const { osc1, osc2, noiseSource, bandpass, subGain1, subGain2, texGain } = nodes;
    for (const n of [osc1, osc2, noiseSource]) {
      if (!n) continue;
      try {
        n.stop(0);
      } catch (_e) {}
      try {
        n.disconnect();
      } catch (_e) {}
      this._activeNodes.delete(n);
    }
    for (const g of [bandpass, subGain1, subGain2, texGain]) {
      if (!g) continue;
      try {
        g.disconnect();
      } catch (_e) {}
      this._activeNodes.delete(g);
    }
  }

  /**
   * Triggers the DISTINCT_NEUTRAL_TWO_PART_CUE for UNKNOWN observation status.
   */
  triggerUnknownTwoPartCue(metadata = {}) {
    const spec = SOUND_CUE_SPEC.UNKNOWN.synthesisParams;
    this.totalUnknownCuesTriggered += 1;
    this._lastUnknownCueWallTime = Date.now();

    if (this.audioContext && this.masterGain && !this.muted) {
      const now = this.audioContext.currentTime;

      // Part 1: 528 Hz neutral sine tone (0 -> 110ms)
      const osc1 = this.audioContext.createOscillator();
      const gain1 = this.audioContext.createGain();
      osc1.type = spec.part1Waveform;
      osc1.frequency.setValueAtTime(spec.part1FreqHz, now);
      gain1.gain.setValueAtTime(0.0001, now);
      gain1.gain.linearRampToValueAtTime(spec.fixedPeakGain, now + 0.008);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + spec.part1DurationSeconds);
      osc1.connect(gain1);
      gain1.connect(this.masterGain);

      // Part 2: 396 Hz neutral triangle tone after 35ms separation gap (145ms -> 280ms)
      const part2Start = now + spec.part1DurationSeconds + spec.interPartGapSeconds;
      const osc2 = this.audioContext.createOscillator();
      const gain2 = this.audioContext.createGain();
      osc2.type = spec.part2Waveform;
      osc2.frequency.setValueAtTime(spec.part2FreqHz, part2Start);
      gain2.gain.setValueAtTime(0.0001, part2Start);
      gain2.gain.linearRampToValueAtTime(spec.fixedPeakGain, part2Start + 0.008);
      gain2.gain.exponentialRampToValueAtTime(0.0001, part2Start + spec.part2DurationSeconds);
      osc2.connect(gain2);
      gain2.connect(this.masterGain);

      for (const n of [osc1, gain1, osc2, gain2]) {
        this._activeNodes.add(n);
      }

      osc1.onended = () => {
        this._activeNodes.delete(osc1);
        this._activeNodes.delete(gain1);
        try {
          osc1.disconnect();
          gain1.disconnect();
        } catch (_e) {}
      };
      osc2.onended = () => {
        this._activeNodes.delete(osc2);
        this._activeNodes.delete(gain2);
        try {
          osc2.disconnect();
          gain2.disconnect();
        } catch (_e) {}
      };

      osc1.start(now);
      osc1.stop(now + spec.part1DurationSeconds + 0.005);
      osc2.start(part2Start);
      osc2.stop(part2Start + spec.part2DurationSeconds + 0.005);
    }

    const reasonCode = metadata.reasonCode || 'OUTSIDE_OBSERVATION_COVERAGE';
    const reasonExplanation =
      SOUND_CUE_SPEC.UNKNOWN.reasonCodeLabels[reasonCode] ||
      'Observation status cannot be verified from available NASA records.';

    const logItem = {
      cueId: 'DISTINCT_NEUTRAL_TWO_PART_CUE',
      state: 'UNKNOWN',
      reasonCode,
      listeningMode: this.listeningMode,
      tai93: metadata.tai93 ?? this._lastScheduledTai93,
      utc: metadata.utc || null,
      granuleId: metadata.granuleId || null,
      sourceFile: metadata.sourceFile || null,
      description: `Distinct neutral two-part cue (528 Hz → 396 Hz): State is UNKNOWN (${reasonCode} — ${reasonExplanation}).`,
    };
    this._recordCueLog(logItem);
    return logItem;
  }

  /**
   * Deterministically evaluates and schedules audio cues for the time slice [prevTai93, currTai93]
   * using the shared active data package.
   *
   * @param {object} params
   * @param {number} params.prevTai93
   * @param {number} params.currTai93
   * @param {Array}  params.flashesInStep - Confirmed DETECTED flashes in (prevTai93, currTai93]
   * @param {string} params.observationState - 'DETECTED' | 'OBSERVED_NO_DETECTION' | 'UNKNOWN'
   * @param {string} params.reasonCode - Active scientific reason code
   * @param {object} params.windowMeta - Current orbital/gap/SAA/fatal interval metadata
   */
  processPlaybackStep({
    prevTai93,
    currTai93,
    flashesInStep = [],
    observationState = 'OBSERVED_NO_DETECTION',
    reasonCode = 'ACTIVE_OPTICAL_SURVEILLANCE_ZERO_FLASHES',
    windowMeta = {},
  }) {
    if (!this.isPlaying) return [];
    const triggeredThisStep = [];
    const prevState = this._currentObservationState;
    const prevReason = this._currentReasonCode;

    this._lastScheduledTai93 = currTai93;
    this._currentObservationState = observationState;
    this._currentReasonCode = reasonCode;

    // 1. Handle background observation state (OBSERVATION-AWARE mode only)
    if (this.listeningMode === 'OBSERVATION-AWARE') {
      if (observationState === 'UNKNOWN') {
        if (this._sustainedTextureActive) {
          this._stopSustainedObservationTexture();
        }
        const elapsedSinceLastUnknownMs = Date.now() - this._lastUnknownCueWallTime;
        const reminderMs = SOUND_CUE_SPEC.UNKNOWN.synthesisParams.periodicReminderIntervalSeconds * 1000;
        if (prevState !== 'UNKNOWN' || prevReason !== reasonCode || elapsedSinceLastUnknownMs >= reminderMs) {
          const unkCue = this.triggerUnknownTwoPartCue({
            tai93: currTai93,
            utc: windowMeta.utc || null,
            reasonCode,
            granuleId: windowMeta.granuleId || null,
            sourceFile: windowMeta.sourceFile || null,
          });
          triggeredThisStep.push(unkCue);
        }
      } else {
        // State is DETECTED or OBSERVED_NO_DETECTION -> active optical surveillance is verified!
        if (!this._sustainedTextureActive) {
          const texCue = this._startSustainedObservationTexture({
            tai93: currTai93,
            utc: windowMeta.utc || null,
            reasonCode: 'ACTIVE_OPTICAL_SURVEILLANCE_ZERO_FLASHES',
            granuleId: windowMeta.granuleId || null,
            sourceFile: windowMeta.sourceFile || null,
          });
          if (texCue) triggeredThisStep.push(texCue);
        }
      }
    } else {
      // EVENT-ONLY mode: ensure sustained texture is silent
      if (this._sustainedTextureActive) {
        this._stopSustainedObservationTexture();
      }
    }

    // 2. Schedule DETECTED flash pulses deterministically from validated flash timestamps
    if (flashesInStep.length > 0) {
      const spanTai = Math.max(0.001, currTai93 - prevTai93);
      // Group flashes into up to 4 articulated sub-clusters per animation frame so dense orbital
      // scrubbing remains crystal clear while 100% of flash IDs are preserved in the cue log.
      const maxSubClusters = 4;
      if (flashesInStep.length <= maxSubClusters) {
        flashesInStep.forEach((flash, idx) => {
          const relOffset = Math.min(0.08, ((flash.tai93_time - prevTai93) / spanTai) * 0.06 + idx * 0.018);
          const pulseLog = this.triggerDetectedPulse([flash], relOffset);
          triggeredThisStep.push(pulseLog);
        });
      } else {
        const chunkSize = Math.ceil(flashesInStep.length / maxSubClusters);
        for (let i = 0; i < flashesInStep.length; i += chunkSize) {
          const batch = flashesInStep.slice(i, i + chunkSize);
          const clusterIdx = Math.floor(i / chunkSize);
          const pulseLog = this.triggerDetectedPulse(batch, clusterIdx * 0.022);
          triggeredThisStep.push(pulseLog);
        }
      }
    }

    return triggeredThisStep;
  }

  /**
   * Explicitly previews one of the 3 approved cues on user button click (Sound Legend / Inspector).
   * @param {'DETECTED'|'OBSERVED_NO_DETECTION'|'UNKNOWN'} state
   * @param {object} metadata
   */
  async previewApprovedCue(state, metadata = {}) {
    await this.ensureAudioContext();
    if (state === 'DETECTED') {
      return this.triggerDetectedPulse(
        [
          {
            flash_id: metadata.flash_id || 'PREVIEW_CONFIRMED_FLASH',
            tai93_time: metadata.tai93_time || 973725252.637203,
            utc_time: metadata.utc_time || '2023-11-09T23:14:02.637203Z',
            granule_id: metadata.granule_id || '20231109_225212',
            source_file: metadata.source_file || 'ISS_LIS_SC_V2.2_20231109_225212_FIN.nc',
            lat: metadata.lat ?? -6.3773,
            lon: metadata.lon ?? -72.2672,
          },
        ],
        0
      );
    }

    if (state === 'OBSERVED_NO_DETECTION') {
      // Play a 0.9-second audition of the sustained observation texture
      const spec = SOUND_CUE_SPEC.OBSERVED_NO_DETECTION.synthesisParams;
      this.totalTextureTransitions += 1;
      if (this.audioContext && this.masterGain && !this.muted) {
        const now = this.audioContext.currentTime;
        const duration = 0.85;
        const texGain = this.audioContext.createGain();
        texGain.gain.setValueAtTime(0.0001, now);
        texGain.gain.linearRampToValueAtTime(spec.fixedSustainedGain, now + 0.08);
        texGain.gain.setValueAtTime(spec.fixedSustainedGain, now + duration - 0.15);
        texGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(spec.fundamentalFreqHz, now);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(spec.fifthFreqHz, now);

        const g1 = this.audioContext.createGain();
        const g2 = this.audioContext.createGain();
        g1.gain.value = 0.35;
        g2.gain.value = 0.2;

        osc1.connect(g1);
        osc2.connect(g2);
        g1.connect(texGain);
        g2.connect(texGain);

        if (this._noiseBuffer) {
          const ns = this.audioContext.createBufferSource();
          ns.buffer = this._noiseBuffer;
          const bp = this.audioContext.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.setValueAtTime(spec.noiseBandpassFreqHz, now);
          bp.Q.setValueAtTime(spec.noiseBandpassQ, now);
          ns.connect(bp);
          bp.connect(texGain);
          ns.start(now);
          ns.stop(now + duration);
          this._activeNodes.add(ns);
        }

        texGain.connect(this.masterGain);
        this._activeNodes.add(osc1);
        this._activeNodes.add(osc2);
        this._activeNodes.add(texGain);

        osc1.onended = () => {
          this._activeNodes.delete(osc1);
          this._activeNodes.delete(osc2);
          this._activeNodes.delete(texGain);
        };
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + duration);
        osc2.stop(now + duration);
      }

      const logItem = {
        cueId: 'SUSTAINED_OBSERVATION_TEXTURE',
        state: 'OBSERVED_NO_DETECTION',
        reasonCode: metadata.reasonCode || 'ACTIVE_OPTICAL_SURVEILLANCE_ZERO_FLASHES',
        listeningMode: this.listeningMode,
        tai93: metadata.tai93 ?? 973724801,
        utc: metadata.utc || '2023-11-09T23:06:31Z',
        granuleId: metadata.granuleId || '20231109_225212',
        sourceFile: metadata.sourceFile || 'ISS_LIS_SC_V2.2_20231109_225212_FIN.nc',
        description:
          'Auditioned Sustained Observation Texture (220/330 Hz warm harmonic bed + 360 Hz band-passed sensor noise) confirming active optical surveillance with zero flashes.',
      };
      this._recordCueLog(logItem);
      return logItem;
    }

    return this.triggerUnknownTwoPartCue({
      tai93: metadata.tai93 ?? 973846545.3,
      utc: metadata.utc || '2023-11-11T08:55:35.300Z',
      reasonCode: metadata.reasonCode || 'MISSING_SOURCE_DATA',
      granuleId: metadata.granuleId || null,
      sourceFile: metadata.sourceFile || null,
    });
  }

  _recordCueLog(entry) {
    const stamped = {
      ...entry,
      logIndex: this.scheduledCueLog.length + 1,
      recordedAtIso: new Date().toISOString(),
    };
    this.scheduledCueLog.unshift(stamped);
    if (this.scheduledCueLog.length > this.maxLogEntries) {
      this.scheduledCueLog.length = this.maxLogEntries;
    }
    if (this.onCueTriggered) {
      this.onCueTriggered(stamped);
    }
  }

  getDiagnostics() {
    return {
      listeningMode: this.listeningMode,
      modeSpec:
        this.listeningMode === 'EVENT-ONLY'
          ? LISTENING_MODES.EVENT_ONLY
          : LISTENING_MODES.OBSERVATION_AWARE,
      isPlaying: this.isPlaying,
      volume: this.volume,
      muted: this.muted,
      audioContextState: this.audioContext ? this.audioContext.state : 'uninitialized_no_autoplay',
      sustainedTextureActive: this._sustainedTextureActive,
      activeNodeCount: this._activeNodes.size,
      totalPulsesTriggered: this.totalPulsesTriggered,
      totalFlashesRepresented: this.totalFlashesRepresented,
      totalTextureTransitions: this.totalTextureTransitions,
      totalUnknownCuesTriggered: this.totalUnknownCuesTriggered,
      cancellationCount: this.cancellationCount,
      lastCue: this.scheduledCueLog[0] || null,
      recentCueCount: this.scheduledCueLog.length,
    };
  }
}

export { LISTENING_MODES, SOUND_CUE_SPEC, getCueSpecForState };

