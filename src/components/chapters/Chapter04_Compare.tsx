import React, { useEffect, useState, useMemo } from 'react';
import {
  YearProfilesData,
  CityRainData,
  CityMetadata,
  ComparisonResult,
  CreativeSettings,
} from '../../types/rainfall';
import { compareNationalYears, compareCities } from '../../lib/dataService';
import { audioEngine } from '../../lib/audioEngine';
import {
  DAILY_RATE_NORMALIZATION_MM_DAY,
  NATIONAL_TOTAL_NORMALIZATION_MM,
} from '../../lib/sonification';
import { DoubleBezelCard } from '../common/DoubleBezelCard';
import { MathFormula } from '../common/MathFormula';
import {
  GitCompare,
  TrendingUp,
  TrendingDown,
  Minus,
  Play,
  Volume2,
  Info,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface Chapter04CompareProps {
  profilesData: YearProfilesData;
  cityData: CityRainData;
  cities: CityMetadata[];
  creativeSettings: CreativeSettings;
  isAudioPlaying: boolean;
  onAudioStateChange: (isPlaying: boolean) => void;
}

export const Chapter04_Compare: React.FC<Chapter04CompareProps> = ({
  profilesData,
  cityData,
  cities,
  creativeSettings,
  isAudioPlaying,
  onAudioStateChange,
}) => {
  const [compareScope, setCompareScope] = useState<'national' | 'city'>('national');
  const [yearA, setYearA] = useState<number>(2007);
  const [yearB, setYearB] = useState<number>(2024);

  // City scope selections
  const [cityA, setCityA] = useState<string>('Sylhet');
  const [cityYearA, setCityYearA] = useState<number>(2024);
  const [cityB, setCityB] = useState<string>('Rajshahi');
  const [cityYearB, setCityYearB] = useState<number>(2024);

  const [isDeltaPlaying, setIsDeltaPlaying] = useState<boolean>(false);
  useEffect(() => {
    if (!isAudioPlaying) setIsDeltaPlaying(false);
  }, [isAudioPlaying]);

  const years = profilesData.profiles.map((p) => p.year);

  // Calculate comparison result
  const comparison: ComparisonResult = useMemo(() => {
    if (compareScope === 'national') {
      return compareNationalYears(yearA, yearB, profilesData);
    } else {
      return compareCities(cityA, cityYearA, cityB, cityYearB, cityData);
    }
  }, [compareScope, yearA, yearB, cityA, cityYearA, cityB, cityYearB, profilesData, cityData]);

  // Handle Play Delta Sound
  const handlePlayDeltaSound = () => {
    if (isDeltaPlaying) {
      audioEngine.stopAll();
      setIsDeltaPlaying(false);
      onAudioStateChange(false);
      return;
    }
    setIsDeltaPlaying(true);
    onAudioStateChange(true);

    audioEngine.playDeltaRainfall(
      comparison.valueA,
      comparison.valueB,
      compareScope === 'national'
        ? NATIONAL_TOTAL_NORMALIZATION_MM
        : DAILY_RATE_NORMALIZATION_MM_DAY,
      creativeSettings,
      () => {
      setIsDeltaPlaying(false);
      onAudioStateChange(false);
      }
    );
  };

  // Preset Shortcuts
  const applyPreset = (yA: number, yB: number, scope: 'national' | 'city' = 'national') => {
    setCompareScope(scope);
    setYearA(yA);
    setYearB(yB);
  };

  return (
    <section id="compare" className="py-20 px-4 md:px-8 max-w-7xl mx-auto space-y-10">
      {/* Chapter header */}
      <div className="space-y-3">
        <div className="text-xs font-mono tracking-widest text-rain-400 uppercase flex items-center gap-2">
          <span>Chapter 03</span>
          <span className="w-1.5 h-1.5 rounded-full bg-rain-400" />
          <span>Comparative Analytics & Delta Acoustics</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white font-display">
          Compare & Hear the Difference
        </h2>
        <p className="text-slate-400 max-w-3xl text-sm sm:text-base leading-relaxed">
          The number quantifies the change; the sound communicates both direction and magnitude.
          Select any two years or divisional cities. Positive delta builds toward denser, brighter rain; negative delta eases toward lighter, sparser rain.
        </p>
      </div>

      <DoubleBezelCard glow="cyan">
        <div className="space-y-8">
          {/* Controls: Scope and Presets */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
            {/* National vs City Scope switch */}
            <div className="flex items-center gap-2 p-1 rounded-full bg-space-950/80 border border-white/[0.08]">
              <button
                onClick={() => setCompareScope('national')}
                className={`px-4 py-1.5 rounded-full text-xs font-mono font-medium transition-all ${
                  compareScope === 'national'
                    ? 'bg-rain-500 text-space-950 font-bold shadow-glow-cyan/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                National (Year vs Year)
              </button>
              <button
                onClick={() => setCompareScope('city')}
                className={`px-4 py-1.5 rounded-full text-xs font-mono font-medium transition-all ${
                  compareScope === 'city'
                    ? 'bg-monsoon-500 text-white font-bold shadow-glow-indigo/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Divisional (Place vs Place)
              </button>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="text-slate-500">Presets:</span>
              <button
                onClick={() => applyPreset(2007, 2024)}
                className="px-2.5 py-1 rounded-full bg-white/[0.04] text-slate-300 hover:bg-white/[0.09] border border-white/[0.08] transition-colors"
              >
                2007 vs 2024 (Signature)
              </button>
              <button
                onClick={() => applyPreset(2024, 2007)}
                className="px-2.5 py-1 rounded-full bg-white/[0.04] text-slate-300 hover:bg-white/[0.09] border border-white/[0.08] transition-colors"
              >
                2024 vs 2007 (Invert)
              </button>
              <button
                onClick={() => applyPreset(2024, 2026)}
                className="px-2.5 py-1 rounded-full bg-white/[0.04] text-amberRisk-300 hover:bg-white/[0.09] border border-amberRisk-500/30 transition-colors"
              >
                2024 vs 2026 (YTD Period)
              </button>
              <button
                onClick={() => {
                  setCompareScope('city');
                  setCityA('Sylhet');
                  setCityYearA(2024);
                  setCityB('Rajshahi');
                  setCityYearB(2024);
                }}
                className="px-2.5 py-1 rounded-full bg-white/[0.04] text-monsoon-300 hover:bg-white/[0.09] border border-monsoon-500/30 transition-colors"
              >
                Sylhet vs Rajshahi (2024)
              </button>
            </div>
          </div>

          {/* Selection Pickers Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Observer A */}
            <div className="p-5 rounded-2xl bg-space-950/80 border border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5 font-bold text-white uppercase tracking-wider">
                  <span className="w-2.5 h-2.5 rounded-full bg-rain-400" />
                  Observation A (Baseline Reference)
                </span>
                <span>Year A</span>
              </div>

              {compareScope === 'national' ? (
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">
                    Select Reference Year
                  </label>
                  <select
                    value={yearA}
                    onChange={(e) => setYearA(Number(e.target.value))}
                    className="w-full bg-space-900 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm font-mono focus:ring-1 focus:ring-rain-400"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y} {y === 2026 ? '(Observed to date)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">City A</label>
                    <select
                      value={cityA}
                      onChange={(e) => setCityA(e.target.value)}
                      className="w-full bg-space-900 border border-white/10 text-white rounded-xl px-3 py-2 text-xs font-mono"
                    >
                      {cities.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">Year</label>
                    <select
                      value={cityYearA}
                      onChange={(e) => setCityYearA(Number(e.target.value))}
                      className="w-full bg-space-900 border border-white/10 text-white rounded-xl px-3 py-2 text-xs font-mono"
                    >
                      {years.filter((y) => y <= 2025).map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Observer B */}
            <div className="p-5 rounded-2xl bg-space-950/80 border border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5 font-bold text-white uppercase tracking-wider">
                  <span className="w-2.5 h-2.5 rounded-full bg-monsoon-400" />
                  Observation B (Target Comparison)
                </span>
                <span>Year B</span>
              </div>

              {compareScope === 'national' ? (
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">
                    Select Comparison Year
                  </label>
                  <select
                    value={yearB}
                    onChange={(e) => setYearB(Number(e.target.value))}
                    className="w-full bg-space-900 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm font-mono focus:ring-1 focus:ring-monsoon-400"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y} {y === 2026 ? '(Observed to date)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">City B</label>
                    <select
                      value={cityB}
                      onChange={(e) => setCityB(e.target.value)}
                      className="w-full bg-space-900 border border-white/10 text-white rounded-xl px-3 py-2 text-xs font-mono"
                    >
                      {cities.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">Year</label>
                    <select
                      value={cityYearB}
                      onChange={(e) => setCityYearB(Number(e.target.value))}
                      className="w-full bg-space-900 border border-white/10 text-white rounded-xl px-3 py-2 text-xs font-mono"
                    >
                      {years.filter((y) => y <= 2025).map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ANALYTICAL COMPARISON INSTRUMENT READOUT */}
          <div className="p-6 md:p-8 rounded-3xl bg-space-950 border border-white/[0.08] shadow-bezel-inner space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Pillar A */}
              <div className="p-5 rounded-2xl bg-space-900/90 border border-rain-500/20 text-center space-y-1">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-widest block">
                  {compareScope === 'national' ? `Year ${comparison.yearA}` : `${comparison.placeA} (${comparison.yearA})`}
                </span>
                <div className="text-3xl sm:text-4xl font-bold font-display text-white">
                  {comparison.valueA.toLocaleString(undefined, {
                    minimumFractionDigits: compareScope === 'national' ? 1 : 2,
                    maximumFractionDigits: compareScope === 'national' ? 1 : 2,
                  })}
                  <span className="text-sm font-mono text-slate-400 font-normal ml-1">
                    {comparison.unit}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-slate-500">
                  Observation A
                </div>
              </div>

              {/* Center Delta Bridge */}
              <div className="p-6 rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.08] text-center space-y-3">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block">
                  Delta (<MathFormula expression="B - A" />)
                </span>

                <div
                  className={`text-4xl sm:text-5xl font-bold font-display flex items-center justify-center gap-2 ${
                    comparison.direction === 'up'
                      ? 'text-rain-400'
                      : comparison.direction === 'down'
                      ? 'text-coralRisk-400'
                      : 'text-slate-300'
                  }`}
                >
                  {comparison.direction === 'up' ? (
                    <TrendingUp className="w-8 h-8" />
                  ) : comparison.direction === 'down' ? (
                    <TrendingDown className="w-8 h-8" />
                  ) : (
                    <Minus className="w-8 h-8" />
                  )}
                  <span>
                    {comparison.delta >= 0 ? '+' : ''}
                    {comparison.delta.toLocaleString(undefined, {
                      minimumFractionDigits: compareScope === 'national' ? 1 : 2,
                      maximumFractionDigits: compareScope === 'national' ? 1 : 2,
                    })}
                  </span>
                  <span className="text-sm font-mono text-slate-400 font-normal">
                    {comparison.unit}
                  </span>
                </div>

                {comparison.percentChange !== null && (
                  <div className="text-xs font-mono font-semibold text-slate-300">
                    {comparison.percentChange >= 0 ? '+' : ''}
                    {comparison.percentChange}% difference
                  </div>
                )}

                <div className="text-[10px] font-mono text-slate-500">
                  Basis: {comparison.basis}
                </div>
                <div className="border-t border-white/[0.08] pt-3 text-[10px] font-mono text-slate-400">
                  <MathFormula
                    display
                    expression={`\\Delta = ${comparison.valueB.toFixed(2)} - ${comparison.valueA.toFixed(2)} = ${comparison.delta.toFixed(2)}\\,${comparison.unit === 'mm/day' ? '\\mathrm{mm/day}' : '\\mathrm{mm}'}`}
                  />
                  <MathFormula
                    display
                    expression={`f(r)=220\\left(\\frac{880}{220}\\right)^{\\min\\left(1,\\frac{r}{${compareScope === 'national' ? NATIONAL_TOTAL_NORMALIZATION_MM + '\\,\\mathrm{mm}' : DAILY_RATE_NORMALIZATION_MM_DAY + '\\,\\mathrm{mm/day}'}}\\right)}\\;\\mathrm{Hz}`}
                  />
                </div>
              </div>

              {/* Pillar B */}
              <div className="p-5 rounded-2xl bg-space-900/90 border border-monsoon-500/20 text-center space-y-1">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-widest block">
                  {compareScope === 'national' ? `Year ${comparison.yearB}` : `${comparison.placeB} (${comparison.yearB})`}
                </span>
                <div className="text-3xl sm:text-4xl font-bold font-display text-white">
                  {comparison.valueB.toLocaleString(undefined, {
                    minimumFractionDigits: compareScope === 'national' ? 1 : 2,
                    maximumFractionDigits: compareScope === 'national' ? 1 : 2,
                  })}
                  <span className="text-sm font-mono text-slate-400 font-normal ml-1">
                    {comparison.unit}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-slate-500">
                  Observation B
                </div>
              </div>
            </div>

            {/* Signature Delta Sound Trigger Section */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-rain-500/10 via-monsoon-500/10 to-transparent border border-white/10 flex flex-wrap items-center justify-between gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    Signature Interaction: Delta Sound
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                      comparison.direction === 'up'
                        ? 'bg-rain-500/20 text-rain-300 border-rain-500/30'
                        : comparison.direction === 'down'
                        ? 'bg-coralRisk-500/20 text-coralRisk-300 border-coralRisk-500/30'
                        : 'bg-white/10 text-slate-300 border-white/20'
                    }`}
                  >
                    {comparison.direction === 'up'
                      ? 'Ascending rain density'
                      : comparison.direction === 'down'
                      ? 'Descending rain density'
                      : 'Steady rain ambience'}
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-400">
                  Audio duration: {(comparison.deltaDuration / creativeSettings.speed).toFixed(2)}s • Start: {comparison.startHz.toFixed(0)} Hz → End: {comparison.endHz.toFixed(0)} Hz • Timbre: organic rain
                  • Normalization: {compareScope === 'national' ? `${NATIONAL_TOTAL_NORMALIZATION_MM} mm` : `${DAILY_RATE_NORMALIZATION_MM_DAY} mm/day`}
                </p>
              </div>

              <button
                onClick={handlePlayDeltaSound}
                className="flex items-center gap-3 px-8 py-3.5 rounded-full bg-gradient-to-r from-rain-500 to-monsoon-500 text-space-950 font-bold text-sm hover:brightness-110 shadow-glow-cyan/40 transition-all duration-300 active:scale-[0.98]"
              >
                <Play className={`w-4 h-4 fill-current ${isDeltaPlaying ? 'animate-ping' : ''}`} />
                <span>{isDeltaPlaying ? 'Stop Delta Sound' : 'Play Delta Sound'}</span>
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            {/* 2026 Common Period Clarification */}
            {comparison.is2026Comparison && (
              <div className="p-3.5 rounded-xl bg-amberRisk-500/10 border border-amberRisk-500/25 flex items-start gap-2.5 text-xs font-mono text-amberRisk-300">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>2026 Common Period Enforcement:</strong> Because 2026 data currently ends on 2026-09-24, the comparison automatically clips Observation A to the exact same calendar window (Jan 1 – Sep 24) to ensure mathematical and scientific equivalence.
                </p>
              </div>
            )}
          </div>
        </div>
      </DoubleBezelCard>
    </section>
  );
};
