import React from 'react';
import { Play, ArrowDown, Disc, Compass } from 'lucide-react';
import { DoubleBezelCard } from '../common/DoubleBezelCard';
import { MathFormula } from '../common/MathFormula';

interface Chapter01HeroProps {
  onQuickPlay: () => void;
  isPlaying: boolean;
}

export const Chapter01_Hero: React.FC<Chapter01HeroProps> = ({
  onQuickPlay,
  isPlaying,
}) => {
  return (
    <section id="hero" className="relative min-h-[92vh] overflow-x-clip flex flex-col justify-center pt-24 pb-16 px-4 md:px-8">
      {/* Background subtle atmospheric radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-b from-rain-500/10 via-monsoon-500/5 to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="max-w-5xl mx-auto w-full space-y-12">
        {/* Eyebrow badge */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-xs font-mono text-slate-300">
            <span className="w-2 h-2 rounded-full bg-rain-400 animate-pulse" />
            NASA SPACE APPS CHALLENGE 2026
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-monsoon-500/10 border border-monsoon-500/20 text-xs font-mono text-monsoon-300">
            GPM IMERG EARLY DAILY • V07
          </div>
        </div>

        {/* Hero Headline & Core Statement */}
        <div className="space-y-6">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white font-display leading-[1.08]">
            Hear the Change.
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-rain-300 via-rain-400 to-monsoon-400">
              Earth Rainfall Sonified.
            </span>
          </h1>
          <p className="text-lg sm:text-2xl text-slate-300 max-w-3xl font-light leading-relaxed">
            Most Earth visualizations show you what changed.{' '}
            <strong className="font-semibold text-white">
              SonifyEarth lets you hear the change.
            </strong>
          </p>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl leading-relaxed">
            Operating as an interactive scientific instrument, this system translates 22 years of NASA satellite precipitation measurements into audible soundwaves — allowing researchers, judges, and citizens to hear monsoon anomalies and comparative deltas across Bangladesh.
          </p>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-wrap items-center gap-4 pt-2">
          <a
            href="#explore"
            className="group flex items-center gap-3 px-6 py-3.5 rounded-full bg-rain-500 text-space-950 font-semibold text-sm hover:bg-rain-400 hover:shadow-glow-cyan/50 transition-all duration-300 active:scale-[0.98]"
          >
            <Compass className="w-4 h-4 text-space-950" />
            <span>Explore Bangladesh Rainfall</span>
            <div className="w-6 h-6 rounded-full bg-space-950/20 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
              <ArrowDown className="w-3.5 h-3.5" />
            </div>
          </a>

          <button
            onClick={onQuickPlay}
            className="flex items-center gap-3 px-6 py-3.5 rounded-full bg-white/[0.06] text-white font-medium text-sm border border-white/15 hover:bg-white/[0.12] hover:border-white/25 transition-all duration-300 active:scale-[0.98]"
          >
            <div className="w-6 h-6 rounded-full bg-rain-500/20 text-rain-300 flex items-center justify-center">
              <Play className={`w-3.5 h-3.5 fill-current ${isPlaying ? 'animate-pulse' : ''}`} />
            </div>
            <span>{isPlaying ? 'Pause 2024 National Audio' : 'Hear 2024 National Audio (8s)'}</span>
          </button>

          <a
            href="#science"
            className="text-xs font-mono text-slate-400 hover:text-slate-200 underline underline-offset-4 px-3 py-2 transition-colors"
          >
            How the science works →
          </a>
        </div>

        {/* Real Scientific Parameter Teaser Strip */}
        <DoubleBezelCard glow="cyan" className="mt-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.08]">
            <div className="pt-4 sm:pt-0 sm:pr-4">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                Spatial Domain
              </span>
              <div className="text-xl font-bold font-display text-white">Bangladesh</div>
              <span className="text-xs font-mono text-slate-500">
                88.05°E–92.65°E, 20.55°N–26.65°N
              </span>
            </div>

            <div className="pt-4 sm:pt-0 sm:px-4">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                Data Range
              </span>
              <div className="text-xl font-bold font-display text-white">2005 – 2026</div>
              <span className="text-xs font-mono text-rain-400">
                7,942 daily measurements
              </span>
            </div>

            <div className="pt-4 sm:pt-0 sm:px-4">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                2005–2025 Baseline
              </span>
              <div className="text-xl font-bold font-display text-white">2,626.8 mm</div>
              <span className="text-xs font-mono text-slate-500">
                Mean annual precipitation
              </span>
            </div>

            <div className="pt-4 sm:pt-0 sm:pl-4">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                Acoustic Mapping
              </span>
              <div className="text-xl font-bold font-display text-rain-300">220 – 880 Hz</div>
              <span className="text-xs font-mono text-slate-500">
                <MathFormula
                  display
                  className="text-[9px] sm:text-xs"
                  expression="f(r)=220\left(\frac{880}{220}\right)^{\operatorname{clip}\left(\frac{r}{100\;\mathrm{mm/day}},0,1\right)}\;\mathrm{Hz}"
                />
              </span>
            </div>
          </div>
        </DoubleBezelCard>
      </div>
    </section>
  );
};
