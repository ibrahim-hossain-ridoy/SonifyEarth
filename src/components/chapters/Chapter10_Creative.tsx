import React, { useEffect, useState } from 'react';
import { CreativeSettings, DailyRainfallRecord, SCIENTIFIC_DEFAULT_CREATIVE } from '../../types/rainfall';
import { DoubleBezelCard } from '../common/DoubleBezelCard';
import { AudioVisualizer } from '../common/AudioVisualizer';
import { audioEngine } from '../../lib/audioEngine';
import { CloudRain, Droplets, RotateCcw, Info, Play, Radio, Waves, BookOpen, X } from 'lucide-react';

interface Chapter10CreativeProps {
  settings: CreativeSettings;
  selectedYear: number;
  dailyRecords: DailyRainfallRecord[];
  isAudioPlaying: boolean;
  onChangeSettings: (newSettings: CreativeSettings) => void;
  onAudioStateChange: (isPlaying: boolean) => void;
}

export const Chapter10_Creative: React.FC<Chapter10CreativeProps> = ({
  settings,
  selectedYear,
  dailyRecords,
  isAudioPlaying,
  onChangeSettings,
  onAudioStateChange,
}) => {
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [hasVisited, setHasVisited] = useState(false);
  useEffect(() => {
    const key = 'sonifyearth-creative-intro-seen';
    const alreadyVisited = window.sessionStorage.getItem(key) === 'true';
    setHasVisited(alreadyVisited);
    if (!alreadyVisited) {
      setShowInstructions(true);
      window.sessionStorage.setItem(key, 'true');
    }
  }, []);
  useEffect(() => {
    if (!isAudioPlaying) setIsPreviewPlaying(false);
  }, [isAudioPlaying]);
  const isDefault =
    settings.timbre === SCIENTIFIC_DEFAULT_CREATIVE.timbre &&
    settings.baseHz === SCIENTIFIC_DEFAULT_CREATIVE.baseHz &&
    settings.pan === SCIENTIFIC_DEFAULT_CREATIVE.pan &&
    settings.speed === SCIENTIFIC_DEFAULT_CREATIVE.speed &&
    settings.gain === SCIENTIFIC_DEFAULT_CREATIVE.gain &&
    settings.preset === SCIENTIFIC_DEFAULT_CREATIVE.preset &&
    settings.rainNoiseLevel === SCIENTIFIC_DEFAULT_CREATIVE.rainNoiseLevel;
  const previewRecords = React.useMemo(() => {
    const yearRecords = dailyRecords
      .filter((record) => record.year === selectedYear)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (yearRecords.length === 0) return [];

    const peakIndex = yearRecords.reduce(
      (peak, record, index) => (record.rain_mm_day > yearRecords[peak].rain_mm_day ? index : peak),
      0
    );
    const start = Math.max(0, Math.min(peakIndex - 14, yearRecords.length - 30));
    return yearRecords.slice(start, start + 30);
  }, [dailyRecords, selectedYear]);

  const handleReset = () => {
    onChangeSettings({ ...SCIENTIFIC_DEFAULT_CREATIVE });
  };

  const applyPreset = (preset: NonNullable<CreativeSettings['preset']>) => {
    const presetSettings: Record<NonNullable<CreativeSettings['preset']>, CreativeSettings> = {
      natural_rain: {
        ...settings,
        preset,
        timbre: 'triangle',
        baseHz: 350,
        pan: 0,
        speed: 0.75,
        gain: 0.15,
        rainNoiseLevel: 0.65,
      },
      granular_drops: {
        ...settings,
        preset,
        timbre: 'triangle',
        baseHz: 560,
        pan: 0,
        speed: 1.25,
        gain: 0.14,
        rainNoiseLevel: 0.12,
      },
      scientific_calibrated: { ...SCIENTIFIC_DEFAULT_CREATIVE },
    };
    onChangeSettings(presetSettings[preset]);
  };

  const handleTestExpression = () => {
    if (isPreviewPlaying) {
      audioEngine.stopAll();
      setIsPreviewPlaying(false);
      onAudioStateChange(false);
      return;
    }
    if (previewRecords.length === 0) {
      setPreviewError(`No verified daily rainfall records are available for ${selectedYear}.`);
      return;
    }
    setPreviewError(null);
    setIsPreviewPlaying(true);
    onAudioStateChange(true);
    audioEngine.startSonification(previewRecords, 0, settings, undefined, () => {
      setIsPreviewPlaying(false);
      onAudioStateChange(false);
    });
  };

  return (
    <section id="creative" className="py-20 px-4 md:px-8 max-w-7xl mx-auto space-y-10">
      {/* Chapter header */}
      <div className="space-y-3">
        <div className="text-xs font-mono tracking-widest text-monsoon-400 uppercase flex items-center gap-2">
          <span>Chapter 07</span>
          <span className="w-1.5 h-1.5 rounded-full bg-monsoon-400" />
          <span>Auditory Instrument Expression</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white font-display">
          Creative Mode: Science Determines Meaning, You Determine Expression
        </h2>
        <p className="text-slate-400 max-w-3xl text-sm sm:text-base leading-relaxed">
          Shape an organic rain instrument with preset soundscapes, pitch register, stereo position, and tempo.
          Creative Mode allows exploratory auditory expression while strictly preserving numerical data honesty and the underlying scientific translation.
        </p>
        <button
          type="button"
          onClick={() => setShowInstructions(true)}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rain-300/20 bg-rain-400/10 px-4 py-2 text-xs font-semibold text-rain-100 transition-colors hover:bg-rain-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rain-300"
        >
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          {hasVisited ? 'Open Creative Mode instructions' : 'Creative Mode instructions'}
        </button>
      </div>

      {showInstructions && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-space-950/80 p-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="creative-instructions-title"
            className="w-full max-w-xl rounded-3xl border border-rain-300/20 bg-space-900 p-6 shadow-2xl shadow-cyan-950/50 sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-rain-300">Quick-start guide</p>
                <h3 id="creative-instructions-title" className="mt-2 text-2xl font-bold font-display text-white">
                  Use the rain sound lab
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowInstructions(false)}
                aria-label="Close Creative Mode instructions"
                className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rain-300"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <ol className="mt-5 space-y-3 text-sm leading-relaxed text-slate-300">
              <li><strong className="text-white">1. Choose a preset.</strong> Start with Natural Rain Ambience, Granular Drops, or Scientific Calibrated.</li>
              <li><strong className="text-white">2. Shape the expression.</strong> Adjust Base Register, Stereo Pan, Tempo, and Rain Ambience; these affect sound presentation only.</li>
              <li><strong className="text-white">3. Preview and compare.</strong> Play the sample soundscape, watch the live spectrum, then stop or reset to the scientific default.</li>
              <li><strong className="text-white">4. Keep the science intact.</strong> The preview demonstrates a light-to-heavier rainfall transition. Creative controls never alter NASA rainfall measurements or analysis.</li>
            </ol>
            <button
              type="button"
              autoFocus
              onClick={() => setShowInstructions(false)}
              className="mt-6 w-full rounded-xl bg-rain-400 px-4 py-3 text-sm font-bold text-space-950 transition-colors hover:bg-rain-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Start creating
            </button>
          </section>
        </div>
      )}

      <DoubleBezelCard glow="indigo">
        <div className="space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-rain-500/15 border border-rain-400/30 text-rain-300 flex items-center justify-center">
                <Radio className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500">Rain sound lab</span>
                <h3 className="text-lg font-bold font-display text-white">Instrument rack / channel 01</h3>
              </div>
            </div>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-emerald-300">
              Data mapping locked
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {([
              ['natural_rain', 'Natural Rain Ambience', 'Soft continuous bed · spacious drops', CloudRain],
              ['granular_drops', 'Granular Drops', 'Sparse detail · crisp water texture', Droplets],
              ['scientific_calibrated', 'Scientific Calibrated', 'Reference register · balanced output', Waves],
            ] as const).map(([preset, title, description, Icon]) => {
              const isActive = settings.preset === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => applyPreset(preset)}
                  className={`flex min-h-24 items-center gap-3 rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rain-400 ${
                    isActive
                      ? 'border-rain-400/60 bg-rain-500/10 shadow-glow-cyan/20'
                      : 'border-white/[0.08] bg-space-950/70 hover:border-white/20'
                  }`}
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                    isActive ? 'border-rain-400/30 bg-rain-400/10 text-rain-300' : 'border-white/10 bg-white/[0.04] text-slate-400'
                  }`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-white">{title}</span>
                    <span className="mt-1 block text-[10px] leading-relaxed text-slate-400">{description}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Register */}
            <div className="p-5 rounded-2xl bg-space-950/80 border border-white/[0.06] space-y-3">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400 uppercase">Base Register</span>
                <span className="text-rain-300 font-bold">{settings.baseHz} Hz</span>
              </div>
              <input
                aria-label="Base register"
                type="range"
                min={220}
                max={880}
                step={5}
                value={settings.baseHz}
                onChange={(e) =>
                  onChangeSettings({ ...settings, baseHz: Number(e.target.value) })
                }
                className="w-full h-2 bg-space-900 rounded-lg appearance-none cursor-pointer accent-rain-400"
              />

              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>Low</span>
                <span>Reference</span>
                <span>High</span>
              </div>
            </div>

            {/* Stereo Pan Slider */}
            <div className="p-5 rounded-2xl bg-space-950/80 border border-white/[0.06] space-y-3">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400 uppercase">Stereo Pan</span>
                <span className="text-white font-bold">
                  {settings.pan === 0
                    ? 'Center (0)'
                    : settings.pan < 0
                    ? `Left (${settings.pan.toFixed(2)})`
                    : `Right (+${settings.pan.toFixed(2)})`}
                </span>
              </div>

              <input
                aria-label="Stereo pan"
                type="range"
                min={-1}
                max={1}
                step={0.05}
                value={settings.pan}
                onChange={(e) =>
                  onChangeSettings({ ...settings, pan: Number(e.target.value) })
                }
                className="w-full h-2 bg-space-900 rounded-lg appearance-none cursor-pointer accent-monsoon-400"
              />

              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>L (-1.0)</span>
                <span>Center (0.0)</span>
                <span>R (+1.0)</span>
              </div>
            </div>

            {/* Playback Tempo Speed */}
            <div className="p-5 rounded-2xl bg-space-950/80 border border-white/[0.06] space-y-3">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400 uppercase">Sonification Tempo</span>
                <span className="text-amberRisk-300 font-bold">{settings.speed}x</span>
              </div>

              <input
                aria-label="Sonification tempo"
                type="range"
                min={0.5}
                max={2.0}
                step={0.25}
                value={settings.speed}
                onChange={(e) =>
                  onChangeSettings({ ...settings, speed: Number(e.target.value) })
                }
                className="w-full h-2 bg-space-900 rounded-lg appearance-none cursor-pointer accent-amberRisk-400"
              />

              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>0.5x (Slow)</span>
                <span>1.0x (Calibrated)</span>
                <span>2.0x (Rapid)</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-space-950/80 border border-white/[0.06] space-y-3">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400 uppercase">Rain ambience</span>
                <span className="text-rain-300 font-bold">{Math.round((settings.rainNoiseLevel ?? 0.25) * 100)}%</span>
              </div>
              <input
                aria-label="Rain ambience level"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.rainNoiseLevel ?? 0.25}
                onChange={(e) => onChangeSettings({ ...settings, rainNoiseLevel: Number(e.target.value) })}
                className="w-full h-2 bg-space-900 rounded-lg appearance-none cursor-pointer accent-rain-400"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>Individual drops</span>
                <span>Continuous wash</span>
              </div>
            </div>
          </div>

          <AudioVisualizer
            height={110}
            active={isPreviewPlaying}
            activity={Math.min(1, Math.max(0, ((settings.baseHz - 220) / 660) * 0.55 + (settings.rainNoiseLevel ?? 0.25) * 0.45))}
            label="LIVE RAIN SPECTRUM / OUTPUT MONITOR"
          />

          {/* Action Row: Test Expression + Reset */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-white/[0.08]">
            <div className="flex w-full sm:w-auto flex-wrap items-center gap-3">
              <button
                onClick={handleTestExpression}
                disabled={previewRecords.length === 0}
                className="flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-monsoon-500 text-white font-bold text-xs hover:bg-monsoon-400 disabled:cursor-not-allowed disabled:opacity-50 transition-colors shadow-glow-indigo/30"
              >
                <Play className={`w-3.5 h-3.5 fill-current ${isPreviewPlaying ? 'animate-pulse' : ''}`} />
                <span>{isPreviewPlaying ? 'Stop Rain Preview' : 'Preview Rain Soundscape'}</span>
              </button>
              {previewRecords.length > 0 && (
                <span className="w-full sm:w-auto text-[10px] font-mono text-slate-500">
                  30 measured days near the {selectedYear} rainfall peak
                </span>
              )}

              <button
                onClick={handleReset}
                disabled={isDefault}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-mono transition-colors ${
                  isDefault
                    ? 'opacity-40 cursor-not-allowed bg-white/[0.03] text-slate-500'
                    : 'bg-white/[0.06] text-slate-200 hover:bg-white/[0.12] border border-white/10'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Scientific Default</span>
              </button>
            </div>

            {previewError && (
              <p role="alert" className="text-xs text-amberRisk-300">
                {previewError}
              </p>
            )}

            {isDefault ? (
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Operating at Scientific Calibrated Default
              </span>
            ) : (
              <span className="text-xs font-mono text-amberRisk-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amberRisk-400 animate-pulse" />
                Custom Expression Active (Data Unaltered)
              </span>
            )}
          </div>

          {/* Scientific Invariance Guarantee Notice */}
          <div className="p-4 rounded-xl bg-space-950/90 border border-white/[0.08] flex items-start gap-3 text-xs font-mono text-slate-400">
            <Info className="w-4 h-4 text-monsoon-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200">Scientific Invariance Guarantee:</strong>
              <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                Creative settings alter rain ambience, register, playback tempo, and stereo panning only. They do not change underlying rainfall numbers, historical delta values, or the documented scientific mapping.
              </p>
            </div>
          </div>
        </div>
      </DoubleBezelCard>
    </section>
  );
};
