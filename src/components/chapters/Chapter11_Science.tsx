import React, { useState } from 'react';
import { DoubleBezelCard } from '../common/DoubleBezelCard';
import {
  Satellite,
  Database,
  Calculator,
  Music,
  GitCompare,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { MathFormula } from '../common/MathFormula';

export const Chapter11_Science: React.FC = () => {
  const [showFormulas, setShowFormulas] = useState<boolean>(false);

  const steps = [
    {
      step: '01',
      title: 'NASA Satellite Observation',
      icon: Satellite,
      summary:
        'NASA GES DISC / Giovanni GPM IMERG Early Run (0.1° × 0.1° grid, daily resolution) records combined microwave-infrared atmospheric precipitation rates over Bangladesh.',
      detail:
        'Product GPM_3IMERGDE_07 aggregates multi-satellite microwave radiometer observations with geosynchronous infrared soundings, providing uninterrupted daily estimates across the 88.05°E–92.65°E, 20.55°N–26.65°N bounding box.',
    },
    {
      step: '02',
      title: 'Spatial & Daily Extraction',
      icon: Database,
      summary:
        '7,942 consecutive calendar days (Jan 1, 2005 to Sep 24, 2026) are verified. Area-weighted mean computes daily precipitation rates in millimeters per day (mm/day).',
      detail:
        'The continuous series preserves daily totals, rolling 3-day, 7-day, and 30-day cumulative sums, along with station-level records for 8 divisional administrative centers.',
    },
    {
      step: '03',
      title: 'Scientific Normalization',
      icon: Calculator,
      summary:
        'Daily measurements are mapped onto an acoustic domain using a normalized index, preserving non-destructive dynamic range.',
      detail:
        'Extreme precipitation days exceeding 100 mm/day are smoothly clamped to prevent piercing auditory distortion while clearly distinguishing heavy rain events from trace drizzles.',
    },
    {
      step: '04',
      title: 'Frequency & Pitch Translation',
      icon: Music,
      summary:
        'Normalized rainfall is converted to frequency in Hertz across the calibrated A3 (220 Hz) to A5 (880 Hz) span.',
      detail:
        'Human pitch perception is logarithmic; doubling acoustic frequency corresponds to one musical octave. An exponential mapping ensures equal relative percentage increases in rainfall sound proportionally equivalent.',
    },
    {
      step: '05',
      title: 'Comparative Delta & Context',
      icon: GitCompare,
      summary:
        'The measured rainfall at observations A and B sets the direction and pitch endpoints of an organic rain transition. Hydrological risk is contextualized via BMD reference classes.',
      detail:
        'Transition duration scales with the normalized difference. Standardized anomaly scores reveal departure from the 2005–2025 climatological baseline.',
    },
    {
      step: '06',
      title: 'Data Passport Traceability',
      icon: ShieldCheck,
      summary:
        'Every sound is accompanied by verifiable provenance, bounding box parameters, source URLs, and explicit scientific disclaimers.',
      detail:
        'No synthetic data, no uncalibrated forecast claims, and full visibility into data bounds, incomplete periods (such as 2026), and processing algorithms.',
    },
  ];

  return (
    <section id="science" className="py-20 px-4 md:px-8 max-w-7xl mx-auto space-y-10">
      {/* Chapter header */}
      <div className="space-y-3">
        <div className="text-xs font-mono tracking-widest text-rain-400 uppercase flex items-center gap-2">
          <span>Chapter 08</span>
          <span className="w-1.5 h-1.5 rounded-full bg-rain-400" />
          <span>Full Scientific Pipeline</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white font-display">
          Understand the Science & Method
        </h2>
        <p className="text-slate-400 max-w-3xl text-sm sm:text-base leading-relaxed">
          How does atmospheric rainfall become sound?
          Follow the end-to-end data processing chain from NASA satellites to calibrated auditory perception.
        </p>
      </div>

      <DoubleBezelCard glow="cyan">
        <div className="space-y-8">
          {/* Visual Step-by-Step Chain */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {steps.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.step}
                  className="p-5 rounded-2xl bg-space-950/80 border border-white/[0.06] flex flex-col justify-between space-y-4 hover:border-rain-500/30 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-rain-400">
                        STAGE {s.step}
                      </span>
                      <div className="p-2 rounded-xl bg-white/[0.04] text-slate-300">
                        <Icon className="w-4 h-4 text-rain-400" />
                      </div>
                    </div>

                    <h3 className="text-base font-bold font-display text-white">
                      {s.title}
                    </h3>

                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      {s.summary}
                    </p>
                    {s.step === '03' && (
                      <div className="rounded-lg bg-space-900 p-2 text-white">
                        <MathFormula display expression="u=\operatorname{clip}\left(\frac{r}{100\;\mathrm{mm/day}},0,1\right)" />
                      </div>
                    )}
                    {s.step === '04' && (
                      <div className="rounded-lg bg-space-900 p-2 text-white">
                        <MathFormula display expression="f(r)=220\left(\frac{880}{220}\right)^u\;\mathrm{Hz}" />
                      </div>
                    )}
                    {s.step === '05' && (
                      <div className="rounded-lg bg-space-900 p-2 text-white">
                        <MathFormula display expression="\Delta=B-A" />
                        <MathFormula display expression="f(r)=220\left(\frac{880}{220}\right)^{\min(1,r/R)}\;\mathrm{Hz}" />
                        <p className="mt-1 text-[10px] text-slate-400">
                          <MathFormula expression="R=5000\;\mathrm{mm}" /> for national totals or <MathFormula expression="R=20\;\mathrm{mm/day}" /> for city rates.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-white/[0.06] text-[11px] font-mono text-slate-500 leading-normal">
                    {s.detail}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Toggle for In-Depth Mathematical Formulation */}
          <div className="pt-2">
            <button
              onClick={() => setShowFormulas(!showFormulas)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-xs font-mono text-slate-200 transition-colors"
            >
              <span>{showFormulas ? 'Collapse Mathematical Details' : 'Expand Mathematical & Statistical Formulations'}</span>
              {showFormulas ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showFormulas && (
              <div className="mt-4 p-6 rounded-2xl bg-space-950 border border-white/10 space-y-4 font-mono text-xs text-slate-300 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <span className="text-rain-300 font-bold block uppercase tracking-wider text-[11px]">
                      A. Daily Logarithmic Pitch Equation
                    </span>
                    <p className="text-slate-400 text-[11px]">
                      Converts continuous daily rainfall rate into human-audible frequency:
                    </p>
                    <div className="p-3 bg-space-900 rounded-lg text-white font-bold">
                      <MathFormula display expression="f(r)=f_{\min}\left(\frac{f_{\max}}{f_{\min}}\right)^{\min(1,r/r_{\mathrm{norm}})}" />
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Where <MathFormula expression="f_{\min}=220\;\mathrm{Hz}" /> (A3), <MathFormula expression="f_{\max}=880\;\mathrm{Hz}" /> (A5), and <MathFormula expression="r_{\mathrm{norm}}=100\;\mathrm{mm/day}" />.
                    </p>
                  </div>

                  <div className="space-y-2 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <span className="text-monsoon-300 font-bold block uppercase tracking-wider text-[11px]">
                      B. Climatological Standardized Anomaly
                    </span>
                    <p className="text-slate-400 text-[11px]">
                      Statistical standard deviation from the multi-decadal baseline:
                    </p>
                    <div className="p-3 bg-space-900 rounded-lg text-white font-bold">
                      <MathFormula display expression="z=\frac{x-\mu_{2005\text{--}2025}}{\sigma_{2005\text{--}2025}}" />
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Baseline Mean μ = 2,626.79 mm, Standard Deviation σ = 273.33 mm.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DoubleBezelCard>
    </section>
  );
};
