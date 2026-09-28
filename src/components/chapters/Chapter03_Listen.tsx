import React, { useState, useEffect } from 'react';
import {
  DailyRainfallRecord,
  YearProfile,
  CreativeSettings,
  SCIENTIFIC_DEFAULT_CREATIVE,
} from '../../types/rainfall';
import { DoubleBezelCard } from '../common/DoubleBezelCard';
import { AudioVisualizer } from '../common/AudioVisualizer';
import { audioEngine } from '../../lib/audioEngine';
import { MathFormula } from '../common/MathFormula';
import {
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Volume2,
  VolumeX,
  FastForward,
  Info,
  Calendar,
  Activity,
  Radio,
} from 'lucide-react';

interface Chapter03ListenProps {
  selectedYear: number;
  selectedCity: string | null;
  activeLayer: 'national' | 'city';
  profile?: YearProfile;
  dailyRecords: DailyRainfallRecord[];
  creativeSettings: CreativeSettings;
  isAudioPlaying: boolean;
  onAudioStateChange: (isPlaying: boolean) => void;
}

export const Chapter03_Listen: React.FC<Chapter03ListenProps> = ({
  selectedYear,
  selectedCity,
  activeLayer,
  profile,
  dailyRecords,
  creativeSettings,
  isAudioPlaying,
  onAudioStateChange,
}) => {
  const [listenMode, setListenMode] = useState<'wav' | 'synth'>('synth');
  const [activeDayIndex, setActiveDayIndex] = useState<number>(0);
  const [currentFreq, setCurrentFreq] = useState<number>(220);
  const [synthRunning, setSynthRunning] = useState<boolean>(false);
  const [wavPlaying, setWavPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Filter daily records for currently selected year
  const yearDaily = dailyRecords.filter((r) => r.year === selectedYear);
  const activeRecord: DailyRainfallRecord | undefined = yearDaily[activeDayIndex] || yearDaily[0];

  // WAV URL determination
  const wavUrl =
    activeLayer === 'national'
      ? `/audio/national/rainfall_BD_${selectedYear}.wav`
      : `/audio/city/rainfall_city_${selectedCity || 'Dhaka'}.wav`;

  // Sync external stop
  useEffect(() => {
    if (!isAudioPlaying) {
      setSynthRunning(false);
      setWavPlaying(false);
    }
  }, [isAudioPlaying]);

  // Handle Mode A: WAV Playback
  const handleToggleWav = () => {
    if (wavPlaying) {
      audioEngine.pauseWav();
      setWavPlaying(false);
      onAudioStateChange(false);
    } else {
      audioEngine.playWav(wavUrl, () => {
        setWavPlaying(false);
        onAudioStateChange(false);
      });
      setWavPlaying(true);
      setSynthRunning(false);
      onAudioStateChange(true);
    }
  };

  // Handle Mode B: Scientific Daily Sonification
  const handleToggleSynth = () => {
    if (synthRunning) {
      audioEngine.pauseSonification();
      setSynthRunning(false);
      onAudioStateChange(false);
    } else {
      if (yearDaily.length === 0) return;
      const startIdx = activeDayIndex >= yearDaily.length ? 0 : activeDayIndex;

      audioEngine.startSonification(
        yearDaily,
        startIdx,
        {
          ...creativeSettings,
          speed: playbackSpeed,
          gain: isMuted ? 0 : creativeSettings.gain,
        },
        (idx, record, freq) => {
          setActiveDayIndex(idx);
          setCurrentFreq(freq);
        },
        () => {
          setSynthRunning(false);
          onAudioStateChange(false);
        }
      );
      setSynthRunning(true);
      setWavPlaying(false);
      onAudioStateChange(true);
    }
  };

  const handleRestartSynth = () => {
    audioEngine.stopSonification();
    setActiveDayIndex(0);
    setSynthRunning(false);
    if (yearDaily.length > 0) {
      audioEngine.startSonification(
        yearDaily,
        0,
        {
          ...creativeSettings,
          speed: playbackSpeed,
          gain: isMuted ? 0 : creativeSettings.gain,
        },
        (idx, record, freq) => {
          setActiveDayIndex(idx);
          setCurrentFreq(freq);
        },
        () => {
          setSynthRunning(false);
          onAudioStateChange(false);
        }
      );
      setSynthRunning(true);
      onAudioStateChange(true);
    }
  };

  const handleTimelineClick = (index: number) => {
    setActiveDayIndex(index);
    if (synthRunning) {
      audioEngine.stopSonification();
      audioEngine.startSonification(
        yearDaily,
        index,
        {
          ...creativeSettings,
          speed: playbackSpeed,
          gain: isMuted ? 0 : creativeSettings.gain,
        },
        (idx, record, freq) => {
          setActiveDayIndex(idx);
          setCurrentFreq(freq);
        },
        () => {
          setSynthRunning(false);
          onAudioStateChange(false);
        }
      );
    }
  };

  // Switch modes cleanly
  const handleSelectMode = (mode: 'wav' | 'synth') => {
    audioEngine.stopAll();
    setWavPlaying(false);
    setSynthRunning(false);
    onAudioStateChange(false);
    setListenMode(mode);
  };

  return (
    <section id="listen" className="py-20 px-4 md:px-8 max-w-7xl mx-auto space-y-10">
      {/* Chapter header */}
      <div className="space-y-3">
        <div className="text-xs font-mono tracking-widest text-rain-400 uppercase flex items-center gap-2">
          <span>Chapter 02</span>
          <span className="w-1.5 h-1.5 rounded-full bg-rain-400" />
          <span>Scientific Sonification Engine</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white font-display">
          Listen to Rainfall
        </h2>
        <p className="text-slate-400 max-w-3xl text-sm sm:text-base leading-relaxed">
          SonifyEarth provides dual-mode acoustic translation. Mode A presents the master 8-second organic rain audio recording, while Mode B synthesizes the numerical daily measurements directly via the Web Audio API using the documented mapping formula.
        </p>
      </div>

      <DoubleBezelCard glow="cyan">
        <div className="space-y-8">
          {/* Top Switcher: Mode A vs Mode B */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
            <div className="flex items-center gap-2 p-1 rounded-full bg-space-950/80 border border-white/[0.08]">
              <button
                onClick={() => handleSelectMode('synth')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono font-medium transition-all ${
                  listenMode === 'synth'
                    ? 'bg-rain-500 text-space-950 font-bold shadow-glow-cyan/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Mode B: Live Numerical Daily Synthesizer</span>
              </button>

              <button
                onClick={() => handleSelectMode('wav')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono font-medium transition-all ${
                  listenMode === 'wav'
                    ? 'bg-monsoon-500 text-white font-bold shadow-glow-indigo/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Mode A: Pre-Synthesized Master WAV ({activeLayer === 'national' ? '8s' : '5s'})</span>
              </button>
            </div>

            {/* Live Audio Oscilloscope & Spectrum Monitor */}
            <div className="w-full sm:w-64">
              <AudioVisualizer
                active={wavPlaying || synthRunning}
                barColor={listenMode === 'synth' ? '#38bdf8' : '#818cf8'}
                label={wavPlaying || synthRunning ? 'LIVE TRANSLATION MONITOR' : 'MONITOR IDLE'}
                height={55}
              />
            </div>
          </div>

          {/* ========================================================= */}
          {/* MODE B: LIVE DAILY NUMERICAL SYNTHESIZER (PRIMARY ENGINE) */}
          {/* ========================================================= */}
          {listenMode === 'synth' ? (
            <div className="space-y-6">
              {/* Daily Rain Bar Chart Timeline with Interactive Scrubbing */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs font-mono text-slate-400">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-rain-400" />
                    <span>
                      {selectedYear} Daily Precipitation Timeline ({yearDaily.length} days recorded)
                    </span>
                  </div>
                  <span className="text-rain-300">
                    Click any day on chart to seek playhead
                  </span>
                </div>

                {/* SVG Daily Bar Timeline */}
                <div className="relative w-full h-36 bg-space-950/90 rounded-2xl border border-white/[0.06] p-3 flex flex-col justify-end overflow-hidden group">
                  {/* Grid lines for BMD thresholds: Light (10), Moderate (22), Moderately Heavy (43), Heavy (88) */}
                  <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 opacity-20">
                    <div className="border-b border-coralRisk-400 text-[9px] font-mono text-coralRisk-300">
                      88 mm (Very Heavy)
                    </div>
                    <div className="border-b border-amberRisk-400 text-[9px] font-mono text-amberRisk-300">
                      44 mm (Heavy)
                    </div>
                    <div className="border-b border-rain-400 text-[9px] font-mono text-rain-300">
                      10 mm (Light)
                    </div>
                  </div>

                  {/* Daily Bars */}
                  <div className="relative w-full h-full flex items-end gap-[1px] z-10">
                    {yearDaily.map((d, idx) => {
                      const maxRain = 95; // scaling maximum
                      const heightPercent = Math.min(100, (d.rain_mm_day / maxRain) * 100);
                      const isCurrent = idx === activeDayIndex;

                      // Color based on BMD intensity
                      const barBg =
                        d.rain_mm_day > 88
                          ? 'bg-coralRisk-500'
                          : d.rain_mm_day > 44
                          ? 'bg-amberRisk-500'
                          : d.rain_mm_day > 10
                          ? 'bg-rain-400'
                          : 'bg-rain-600/60';

                      return (
                        <div
                          key={d.date}
                          onClick={() => handleTimelineClick(idx)}
                          className={`relative flex-1 cursor-pointer transition-all ${
                            isCurrent ? 'scale-y-110 z-20' : 'hover:opacity-80'
                          }`}
                          style={{ height: `${Math.max(4, heightPercent)}%` }}
                          title={`${d.date}: ${d.rain_mm_day.toFixed(2)} mm/day (${d.bmd_reference_category})`}
                        >
                          <div
                            className={`w-full h-full rounded-t-[1px] ${barBg} ${
                              isCurrent ? 'ring-2 ring-white shadow-glow-cyan' : ''
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Scrubber Info Strip */}
                {activeRecord && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-space-950/70 border border-white/[0.06] text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">
                        Current Day (DOY {activeRecord.doy})
                      </span>
                      <span className="font-bold text-white">{activeRecord.date}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">
                        Rainfall Input
                      </span>
                      <span className="font-bold text-rain-300">
                        {activeRecord.rain_mm_day.toFixed(2)} mm/day
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">
                        Mapped Audio Pitch
                      </span>
                      <span className="font-bold text-rain-400">
                        {currentFreq.toFixed(1)} Hz
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">
                        BMD Intensity
                      </span>
                      <span className="font-bold text-white">
                        {activeRecord.bmd_reference_category}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Synthesizer Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/[0.08]">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleToggleSynth}
                    className="flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-rain-500 text-space-950 font-bold text-xs hover:bg-rain-400 transition-colors shadow-glow-cyan/40"
                  >
                    {synthRunning ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current" />
                    )}
                    <span>{synthRunning ? 'Pause Sonification' : 'Synthesize Daily Series'}</span>
                  </button>

                  <button
                    onClick={handleRestartSynth}
                    title="Restart from Jan 01"
                    className="p-2.5 rounded-full bg-white/[0.05] text-slate-300 hover:bg-white/[0.1] border border-white/[0.08] transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>

                {/* Speed & Volume Controls */}
                <div className="flex items-center gap-4 text-xs font-mono">
                  {/* Speed buttons */}
                  <div className="flex items-center gap-1 bg-space-950/80 p-1 rounded-full border border-white/[0.08]">
                    <span className="text-slate-500 pl-2 pr-1">Speed:</span>
                    {[0.5, 1.0, 1.5, 2.0].map((spd) => (
                      <button
                        key={spd}
                        onClick={() => setPlaybackSpeed(spd)}
                        className={`px-2 py-0.5 rounded-full transition-colors ${
                          playbackSpeed === spd
                            ? 'bg-rain-500 text-space-950 font-bold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>

                  {/* Mute button */}
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-2 rounded-full bg-white/[0.05] text-slate-300 hover:bg-white/[0.1] border border-white/[0.08]"
                  >
                    {isMuted ? (
                      <VolumeX className="w-3.5 h-3.5 text-coralRisk-400" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5 text-slate-300" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================= */
            /* MODE A: PRE-SYNTHESIZED WAV AUDIO PLAYBACK                */
            /* ========================================================= */
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-space-950/80 border border-white/[0.06] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                      Master Acoustic Audio Recording
                    </span>
                    <h3 className="text-xl font-bold font-display text-white">
                      {activeLayer === 'national'
                        ? `rainfall_BD_${selectedYear}.wav`
                        : `rainfall_city_${selectedCity || 'Dhaka'}.wav`}
                    </h3>
                    <p className="text-xs font-mono text-slate-400">
                      Duration: {activeLayer === 'national' ? '8.0 seconds' : '5.0 seconds'} • 48 kHz Mono 16-bit PCM WAV
                    </p>
                  </div>

                  <button
                    onClick={handleToggleWav}
                    className="flex items-center gap-3 px-6 py-3 rounded-full bg-monsoon-500 text-white font-bold text-sm hover:bg-monsoon-400 shadow-glow-indigo/40 transition-colors"
                  >
                    {wavPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                    <span>{wavPlaying ? 'Pause Audio' : 'Play Master WAV'}</span>
                  </button>
                </div>

                <div className="pt-2 text-xs font-mono text-slate-400 leading-relaxed border-t border-white/[0.06]">
                  <strong>Synthesis engine notes:</strong> Organic rain model with randomized 800–3,000 Hz droplet impacts, short noise transients, rainfall-scaled pink ambience, and fundamental pitch resonance mapped directly from {selectedYear} data.
                </div>
              </div>
            </div>
          )}

          {/* Scientific Mapping Formula Disclosure */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-start gap-3 text-xs font-mono text-slate-400">
            <Info className="w-4 h-4 text-rain-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200">Documented Scientific Mapping:</strong>
              <div className="mt-2 space-y-1 text-rain-300">
                <MathFormula display expression="u=\operatorname{clip}\left(\frac{r}{100\;\mathrm{mm/day}},0,1\right)" />
                <MathFormula display expression="f(r)=220\left(\frac{880}{220}\right)^u\;\mathrm{Hz}" />
              </div>
              <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                Rainfall rate in mm/day is the scientific input. The mapped frequency represents statistical departure within a calibrated 220–880 Hz range. This mapping sonifies the numerical value; it is not claimed to be the physical sound produced by clouds or rain.
              </p>
            </div>
          </div>
        </div>
      </DoubleBezelCard>
    </section>
  );
};
