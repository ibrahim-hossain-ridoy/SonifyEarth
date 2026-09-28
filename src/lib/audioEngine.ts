import { CreativeSettings, DailyRainfallRecord, SCIENTIFIC_DEFAULT_CREATIVE } from '../types/rainfall';
import {
  DAILY_RATE_NORMALIZATION_MM_DAY,
  rainfallToFrequencyHz,
} from './sonification';

/**
 * Organic Raindrop & Natural Ambience Sonification Engine
 * Eliminates harsh raw sine beeps and replaces them with physically-modeled
 * water drop air-cavity resonances, splash transients, and filtered pink noise rain beds.
 */
class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private panner: StereoPannerNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;

  // Rain Bed Ambience Layer
  private pinkNoiseBuffer: AudioBuffer | null = null;
  private rainBedSource: AudioBufferSourceNode | null = null;
  private rainBedGain: GainNode | null = null;
  private rainBedFilter: BiquadFilterNode | null = null;

  // Mode A: Audio Element
  private audioElement: HTMLAudioElement | null = null;
  private audioSourceNode: MediaElementAudioSourceNode | null = null;

  // Mode B: Scientific Sonification State
  private isSynthesizing: boolean = false;
  private synthTimeoutId: number | null = null;
  private currentDayIndex: number = 0;
  private deltaTimers: number[] = [];
  private dropSources = new Set<AudioBufferSourceNode>();
  private dropNodes = new Set<AudioNode>();

  // Callbacks
  private onStepCallback: ((index: number, record: DailyRainfallRecord, freq: number) => void) | null = null;
  private onSynthEndCallback: (() => void) | null = null;

  public init() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master output gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(0.28, this.ctx.currentTime + 0.04);

      // Analyser for real-time visualizer
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.85;
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-6, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(8, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(8, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.15, this.ctx.currentTime);
      this.compressor.connect(this.analyser);

      if (this.ctx.createStereoPanner) {
        this.panner = this.ctx.createStereoPanner();
        this.masterGain.connect(this.panner);
        this.panner.connect(this.compressor);
      } else {
        this.masterGain.connect(this.compressor);
      }
      this.analyser.connect(this.ctx.destination);

      // Generate Pink Noise Buffer (3 seconds loop) for organic rain ambience
      this.generatePinkNoiseBuffer();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch((error) => {
        console.warn('AudioContext could not resume:', error);
      });
    }
  }

  /**
   * Generates a 3-second stereo pink noise buffer using Paul Kellet's refined filter algorithm.
   * Produces a warm, natural rain-like acoustic bed with smooth energy distribution across frequencies.
   */
  private generatePinkNoiseBuffer() {
    if (!this.ctx) return;
    const sampleRate = this.ctx.sampleRate;
    const bufferSize = sampleRate * 3;
    const noiseBuffer = this.ctx.createBuffer(2, bufferSize, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const output = noiseBuffer.getChannelData(channel);
      let b0 = 0,
        b1 = 0,
        b2 = 0,
        b3 = 0,
        b4 = 0,
        b5 = 0,
        b6 = 0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        output[i] = Math.max(
          -0.55,
          Math.min(0.55, (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.18)
        );
        b6 = white * 0.115926;
      }
    }

    this.pinkNoiseBuffer = noiseBuffer;
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public getAudioContext(): AudioContext | null {
    return this.ctx;
  }

  // ==========================================
  // MODE A: Real WAV Audio Playback
  // ==========================================
  public playWav(rawUrl: string, onEnded?: () => void, onError?: (err: unknown) => void): HTMLAudioElement {
    this.init();
    this.stopAll();
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(0.28, now + 0.04);
    }

    // Normalize alternate naming in URL (Chattogram -> Chittagong, Barishal -> Barisal)
    let url = rawUrl
      .replace(/rainfall_city_Chattogram\.wav/i, 'rainfall_city_Chittagong.wav')
      .replace(/rainfall_city_Barishal\.wav/i, 'rainfall_city_Barisal.wav');

    if (!this.audioElement) {
      this.audioElement = new Audio();
      this.audioElement.crossOrigin = 'anonymous';

      if (this.ctx && this.masterGain) {
        try {
          this.audioSourceNode = this.ctx.createMediaElementSource(this.audioElement);
          this.audioSourceNode.connect(this.masterGain);
        } catch {
          // Already connected
        }
      }
    }

    this.audioElement.src = url;
    this.audioElement.onended = () => {
      if (onEnded) onEnded();
    };

    this.audioElement.onerror = (e) => {
      console.warn('WAV playback failed for URL:', url, e);
      if (onError) onError(e);
    };

    this.audioElement.play().catch((err) => {
      console.warn('WAV playback auto-resume:', err);
      if (onError) onError(err);
    });

    return this.audioElement;
  }

  public pauseWav() {
    if (this.audioElement) {
      this.audioElement.pause();
    }
  }

  public resumeWav() {
    if (this.audioElement) {
      this.init();
      this.audioElement.play().catch((error) => {
        console.warn('WAV playback could not resume:', error);
      });
    }
  }

  public isWavPlaying(): boolean {
    return !!(this.audioElement && !this.audioElement.paused && !this.audioElement.ended);
  }

  // ==========================================
  // ORGANIC WATER DROPLET SYNTHESIS
  // ==========================================
  /**
   * Synthesizes a soft droplet from two exponentially decaying filtered-noise layers.
   */
  public playOrganicDrop(
    targetHz: number,
    intensity: number = 0.5,
    startTime?: number,
    creative: CreativeSettings = SCIENTIFIC_DEFAULT_CREATIVE,
    panOffset: number = 0
  ) {
    if (!this.ctx || !this.masterGain) return;

    const now = startTime !== undefined ? startTime : this.ctx.currentTime;
    if (!this.pinkNoiseBuffer) return;

    const pitchJitter = 0.97 + Math.random() * 0.06;
    const centerHz = Math.max(220, Math.min(880, targetHz * pitchJitter));
    const splashHz = Math.max(
      800,
      Math.min(3000, 800 + ((centerHz - 220) / 660) * 2200 + (Math.random() - 0.5) * 260)
    );

    const dropDuration = 0.045 + 0.035 * (1 - Math.min(1, intensity));
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.pinkNoiseBuffer;

    // Resonant filtered noise gives the impact a water-like body without a pitched oscillator.
    const bodyFilter = this.ctx.createBiquadFilter();
    bodyFilter.type = 'bandpass';
    bodyFilter.frequency.setValueAtTime(centerHz, now);
    bodyFilter.Q.setValueAtTime(0.9, now);

    const bodyGain = this.ctx.createGain();
    const maxAmp = Math.min(0.48, 0.04 + 0.32 * Math.sqrt(Math.max(0.01, intensity)));
    const dropOutput = this.ctx.createGain();
    const dropPanner = this.ctx.createStereoPanner?.();
    bodyGain.gain.setValueAtTime(0.0001, now);
    bodyGain.gain.linearRampToValueAtTime(maxAmp, now + 0.003);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + dropDuration);
    noiseSource.connect(bodyFilter);
    bodyFilter.connect(bodyGain);

    // A short, higher filtered-noise transient adds a soft splash without a sharp tonal attack.
    const splashFilter = this.ctx.createBiquadFilter();
    splashFilter.type = 'bandpass';
    splashFilter.frequency.setValueAtTime(splashHz, now);
    splashFilter.Q.setValueAtTime(0.7, now);
    const splashGain = this.ctx.createGain();
    splashGain.gain.setValueAtTime(0.0001, now);
    splashGain.gain.linearRampToValueAtTime(maxAmp * 0.28, now + 0.002);
    splashGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.024);
    noiseSource.connect(splashFilter);
    splashFilter.connect(splashGain);

    dropOutput.gain.setValueAtTime(1, now);
    if (dropPanner) {
      dropPanner.pan.setValueAtTime(Math.max(-1, Math.min(1, creative.pan + panOffset)), now);
      bodyGain.connect(dropPanner);
      splashGain.connect(dropPanner);
      dropPanner.connect(dropOutput);
    } else {
      bodyGain.connect(dropOutput);
      splashGain.connect(dropOutput);
    }
    dropOutput.connect(this.masterGain);

    const offset = Math.random() * (this.pinkNoiseBuffer.duration - dropDuration);
    this.dropSources.add(noiseSource);
    this.dropNodes.add(bodyFilter);
    this.dropNodes.add(bodyGain);
    this.dropNodes.add(splashFilter);
    this.dropNodes.add(splashGain);
    this.dropNodes.add(dropOutput);
    if (dropPanner) this.dropNodes.add(dropPanner);
    noiseSource.onended = () => {
      this.dropSources.delete(noiseSource);
      for (const node of [bodyFilter, bodyGain, splashFilter, splashGain, dropOutput, dropPanner]) {
        if (!node) continue;
        this.dropNodes.delete(node);
        node.disconnect();
      }
      noiseSource.disconnect();
    };
    noiseSource.start(now, offset, dropDuration);
  }

  // ==========================================
  // CONTINUOUS RAIN NOISE AMBIENCE LAYER
  // ==========================================
  private startRainBed(creative: CreativeSettings) {
    if (!this.ctx || !this.pinkNoiseBuffer || !this.masterGain) return;
    this.stopRainBed();

    const now = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    source.buffer = this.pinkNoiseBuffer;
    source.loop = true;

    // Filter rain noise to natural rain frequencies (gentle lowpass at 1500 Hz)
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1600, now);
    filter.Q.setValueAtTime(0.7, now);

    const gainNode = this.ctx.createGain();
    const targetGain = Math.min(0.4, (creative.rainNoiseLevel ?? 0.25) * 0.9);
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.linearRampToValueAtTime(targetGain, now + 0.2);

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    source.start(now);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gainNode.disconnect();
    };
    this.rainBedSource = source;
    this.rainBedGain = gainNode;
    this.rainBedFilter = filter;
  }

  private updateRainBedIntensity(rainMm: number, creative: CreativeSettings) {
    if (!this.ctx || !this.rainBedGain || !this.rainBedFilter) return;

    const now = this.ctx.currentTime;
    const normalized = Math.min(1, Math.max(0, rainMm / 80));
    const userLevel = creative.rainNoiseLevel ?? 0.25;

    // Modulate volume and filter cutoff with rainfall intensity
    const targetGain = Math.min(0.4, 0.8 * userLevel * (0.18 + 0.82 * normalized));
    const targetCutoff = 800 + 1600 * normalized;

    this.rainBedGain.gain.linearRampToValueAtTime(targetGain, now + 0.05);
    this.rainBedFilter.frequency.linearRampToValueAtTime(targetCutoff, now + 0.05);
  }

  private stopRainBed() {
    if (this.rainBedSource) {
      try {
        const now = this.ctx?.currentTime ?? 0;
        if (this.rainBedGain && this.ctx) {
          this.rainBedGain.gain.cancelScheduledValues(now);
          this.rainBedGain.gain.setValueAtTime(this.rainBedGain.gain.value, now);
          this.rainBedGain.gain.linearRampToValueAtTime(0.0001, now + 0.08);
        }
        this.rainBedSource.stop(now + 0.09);
      } catch {
        // Already stopped
      }
      this.rainBedSource = null;
      this.rainBedGain = null;
      this.rainBedFilter = null;
    }
  }

  // ==========================================
  // MODE B: Real-Time Scientific Sonification
  // ==========================================
  public startSonification(
    dailyData: DailyRainfallRecord[],
    startIndex: number = 0,
    creative: CreativeSettings = SCIENTIFIC_DEFAULT_CREATIVE,
    onStep?: (index: number, record: DailyRainfallRecord, freq: number) => void,
    onEnd?: () => void
  ) {
    this.init();
    this.stopAll();

    if (!this.ctx || !this.masterGain || dailyData.length === 0) return;

    this.isSynthesizing = true;
    this.currentDayIndex = Math.max(0, Math.min(startIndex, dailyData.length - 1));
    this.onStepCallback = onStep || null;
    this.onSynthEndCallback = onEnd || null;

    // Apply stereo panner and master volume
    const now = this.ctx.currentTime;
    if (this.panner) {
      this.panner.pan.cancelScheduledValues(now);
      this.panner.pan.setValueAtTime(this.panner.pan.value, now);
      this.panner.pan.linearRampToValueAtTime(creative.pan, now + 0.04);
    }
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(creative.gain, now + 0.04);

    // Start background rain ambience bed
    this.startRainBed(creative);

    this.playNextDay(dailyData, creative);
  }

  private playNextDay(dailyData: DailyRainfallRecord[], creative: CreativeSettings) {
    if (!this.isSynthesizing || !this.ctx || !this.masterGain) return;

    if (this.currentDayIndex >= dailyData.length) {
      this.stopSonification();
      if (this.onSynthEndCallback) this.onSynthEndCallback();
      return;
    }

    const record = dailyData[this.currentDayIndex];
    const rain = Math.max(0, record.rain_mm_day);
    const transpositionRatio = creative.baseHz / 440;
    const baseScientificHz = rainfallToFrequencyHz(rain, 100);
    const targetHz = Math.max(80, Math.min(3200, baseScientificHz * transpositionRatio));

    const now = this.ctx.currentTime;
    const noteDuration = 0.08 / creative.speed;

    // Dynamically modulate background rain noise layer
    this.updateRainBedIntensity(rain, creative);

    // Synthesize organic droplets proportional to rainfall density:
    if (rain < 0.2) {
      if (Math.random() < 0.12) {
        this.playOrganicDrop(targetHz * 0.9, 0.08, now, creative, (Math.random() - 0.5) * 0.2);
      }
    } else if (rain < 15) {
      if (Math.random() < Math.min(0.7, 0.12 + rain / 30)) {
        this.playOrganicDrop(targetHz, 0.25, now, creative, 0);
      }
    } else if (rain < 45) {
      this.playOrganicDrop(targetHz, 0.5, now, creative, -0.15);
      if (rain > 30 && Math.random() < 0.5) {
        this.playOrganicDrop(targetHz * 1.06, 0.35, now + 0.03, creative, 0.2);
      }
    } else {
      const dropCount = rain > 80 ? 2 : 1;
      for (let d = 0; d < dropCount; d++) {
        const offsetSec = d * (noteDuration / (dropCount + 1));
        const panOffset = ((d % 3) - 1) * 0.3;
        const pitchMultiplier = 0.96 + Math.random() * 0.08;
        this.playOrganicDrop(
          targetHz * pitchMultiplier,
          0.85,
          now + offsetSec,
          creative,
          panOffset
        );
      }
    }

    if (this.onStepCallback) {
      this.onStepCallback(this.currentDayIndex, record, targetHz);
    }

    this.currentDayIndex++;

    const delayMs = noteDuration * 1000;
    this.synthTimeoutId = window.setTimeout(() => {
      this.playNextDay(dailyData, creative);
    }, delayMs);
  }

  public pauseSonification() {
    this.isSynthesizing = false;
    if (this.synthTimeoutId) {
      clearTimeout(this.synthTimeoutId);
      this.synthTimeoutId = null;
    }
    this.stopRainBed();
  }

  public stopSonification() {
    this.pauseSonification();
    this.currentDayIndex = 0;
  }

  public isSonificationRunning(): boolean {
    return this.isSynthesizing;
  }

  // ==========================================
  // SIGNATURE INTERACTION: Organic Rain Delta Sound
  // ==========================================
  /**
   * Replaces harsh raw oscillator sine glissandos with an organic
   * ascending or descending rain density and pitch sweep.
   * Positive Delta: Light rain building up to a dense, refreshing downpour.
   * Negative Delta: Torrential rain gently dispersing and tapering into calm droplets.
   * Flat Delta: Steady, balanced refreshing shower.
   */
  public playDeltaRainfall(
    rainfallA: number,
    rainfallB: number,
    normalizationMaximumMm: number,
    creative: CreativeSettings = SCIENTIFIC_DEFAULT_CREATIVE,
    onEnded?: () => void
  ) {
    this.init();
    this.stopAll();

    if (!this.ctx || !this.masterGain) return;
    const startHz = rainfallToFrequencyHz(rainfallA, normalizationMaximumMm);
    const endHz = rainfallToFrequencyHz(rainfallB, normalizationMaximumMm);
    const startIntensity = Math.min(1, rainfallA / normalizationMaximumMm);
    const endIntensity = Math.min(1, rainfallB / normalizationMaximumMm);
    const delta = rainfallB - rainfallA;

    const direction: 'up' | 'down' | 'flat' =
      delta > 0.05 ? 'up' : delta < -0.05 ? 'down' : 'flat';

    const normalizedDelta = Math.min(1, Math.abs(delta) / normalizationMaximumMm);
    const duration = (1.4 + 1.6 * normalizedDelta) / creative.speed;

    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(creative.gain, now + 0.04);
    if (this.panner) {
      this.panner.pan.cancelScheduledValues(now);
      this.panner.pan.setValueAtTime(this.panner.pan.value, now);
      this.panner.pan.linearRampToValueAtTime(creative.pan, now + 0.04);
    }

    // 1. Natural Ambient Rain Bed Swell
    this.startRainBed(creative);
    if (this.rainBedGain && this.rainBedFilter) {
      const startBedGain = Math.min(0.4, 0.8 * (creative.rainNoiseLevel ?? 0.25) * (0.18 + 0.82 * startIntensity));
      const endBedGain = Math.min(0.4, 0.8 * (creative.rainNoiseLevel ?? 0.25) * (0.18 + 0.82 * endIntensity));
      this.rainBedGain.gain.cancelScheduledValues(now);
      this.rainBedGain.gain.setValueAtTime(this.rainBedGain.gain.value, now);
      this.rainBedGain.gain.linearRampToValueAtTime(startBedGain, now + 0.04);
      this.rainBedGain.gain.linearRampToValueAtTime(endBedGain, now + duration * 0.8);
      this.rainBedGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      const startCutoff = 800 + 1600 * startIntensity;
      const endCutoff = 800 + 1600 * endIntensity;
      this.rainBedFilter.frequency.cancelScheduledValues(now);
      this.rainBedFilter.frequency.setValueAtTime(this.rainBedFilter.frequency.value, now);
      this.rainBedFilter.frequency.linearRampToValueAtTime(startCutoff, now + 0.04);
      this.rainBedFilter.frequency.linearRampToValueAtTime(endCutoff, now + duration);
    }

    // 2. Cascade of organic droplets following pitch and density curve
    const totalDrops = Math.max(4, Math.round(4 + 32 * Math.max(startIntensity, endIntensity)));
    this.deltaTimers = [];

    for (let i = 0; i < totalDrops; i++) {
      const progress = i / (totalDrops - 1);
      const tNorm =
        direction === 'up'
          ? Math.pow(progress, 1 / 1.35)
          : direction === 'down'
            ? Math.pow(progress, 1.35)
            : progress;

      const dropTime = now + tNorm * (duration - 0.15);
      const currentRainfall = rainfallA + (rainfallB - rainfallA) * progress;
      const currentIntensity = Math.min(1, currentRainfall / normalizationMaximumMm);
      const currentPitch = rainfallToFrequencyHz(currentRainfall, normalizationMaximumMm);
      const panOffset = (Math.sin(i * 1.5) * 0.4);

      const timerId = window.setTimeout(() => {
        this.playOrganicDrop(currentPitch, 0.18 + currentIntensity * 0.72, undefined, creative, panOffset);
      }, Math.max(0, (dropTime - now) * 1000));

      this.deltaTimers.push(timerId);
    }

    // Stop rain bed and cleanup when sequence completes
    const endTimerId = window.setTimeout(() => {
      this.stopRainBed();
      const stopAt = this.ctx?.currentTime ?? 0;
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.cancelScheduledValues(stopAt);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, stopAt);
        this.masterGain.gain.linearRampToValueAtTime(0.0001, stopAt + 0.08);
      }
      if (onEnded) onEnded();
    }, duration * 1000 + 100);

    this.deltaTimers.push(endTimerId);
  }

  // ==========================================
  // Stop All Active Audio
  // ==========================================
  public stopAll() {
    this.pauseWav();
    this.pauseSonification();
    this.stopRainBed();

    // Clear any pending delta timers
    for (const id of this.deltaTimers) {
      clearTimeout(id);
    }
    this.deltaTimers = [];

    const now = this.ctx?.currentTime ?? 0;
    for (const source of this.dropSources) {
      try {
        source.stop(now);
      } catch {
        // The one-shot source has already ended.
      }
    }
    this.dropSources.clear();
    for (const node of this.dropNodes) node.disconnect();
    this.dropNodes.clear();

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.08);
    }
  }
}

export const audioEngine = new AudioEngine();
