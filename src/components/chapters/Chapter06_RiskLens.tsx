import React, { useState } from 'react';
import { YearProfile, RiskRulesData } from '../../types/rainfall';
import { evaluateRiskClass } from '../../lib/dataService';
import { DoubleBezelCard } from '../common/DoubleBezelCard';
import { MathFormula } from '../common/MathFormula';
import {
  ShieldAlert,
  AlertTriangle,
  Droplets,
  Mountain,
  Info,
  Waves,
  Calendar,
  Layers,
  Gauge,
} from 'lucide-react';

interface Chapter06RiskLensProps {
  selectedYear: number;
  profile?: YearProfile;
  riskRules: RiskRulesData;
}

export const Chapter06_RiskLens: React.FC<Chapter06RiskLensProps> = ({
  selectedYear,
  profile,
  riskRules,
}) => {
  const peakMm = profile?.max_daily_mm ?? 45;
  const riskClass = evaluateRiskClass(peakMm, riskRules);
  const [inspectedClassId, setInspectedClassId] = useState<string | null>(null);

  // Dryness context calculation based on z-score
  const isDeficit = (profile?.annual_anomaly_z ?? 0) < -0.75;
  const isSevereDeficit = (profile?.annual_anomaly_z ?? 0) < -1.5;

  // Gauge calculation (0 to 140 mm/day scale)
  const maxScaleMm = 140;
  const peakPercent = Math.min(100, Math.max(0, (peakMm / maxScaleMm) * 100));

  return (
    <section id="risk" className="py-20 px-4 md:px-8 max-w-7xl mx-auto space-y-10">
      {/* Chapter header */}
      <div className="space-y-3">
        <div className="text-xs font-mono tracking-widest text-amberRisk-400 uppercase flex items-center gap-2">
          <span>Chapter 04</span>
          <span className="w-1.5 h-1.5 rounded-full bg-amberRisk-400" />
          <span>Contextual Interpretation Layer</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white font-display">
          Risk Lens & Hydrological Context
        </h2>
        <p className="text-slate-400 max-w-3xl text-sm sm:text-base leading-relaxed">
          Rainfall does not act alone. Risk Lens translates physical precipitation rates into Bangladesh Meteorological Department (BMD) meteorological reference categories and multi-factor catchment dynamics. It is an analytical interpretation aid, not an emergency directive.
        </p>
      </div>

      <DoubleBezelCard glow="amber">
        <div className="space-y-8">
          {/* ========================================================================= */}
          {/* TOP BANNER: ACTIVE PEAK DAY & DYNAMIC SPECTRUM GAUGE */}
          {/* ========================================================================= */}
          <div className="p-6 rounded-2xl bg-space-950/90 border border-white/[0.08] space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-xl ${
                    riskClass.classId === 'very_heavy'
                      ? 'bg-coralRisk-500/20 text-coralRisk-400 border-coralRisk-500/40 shadow-glow-coral/30'
                      : riskClass.classId === 'heavy'
                      ? 'bg-amberRisk-500/20 text-amberRisk-400 border-amberRisk-500/40 shadow-glow-amber/30'
                      : 'bg-rain-500/20 text-rain-400 border-rain-500/40 shadow-glow-cyan/30'
                  }`}
                >
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block">
                    {selectedYear} Peak Intensity Status
                  </span>
                  <div className="text-2xl sm:text-3xl font-bold font-display text-white flex items-center gap-3">
                    <span>{riskClass.label}</span>
                    <span className="text-xs font-mono px-3 py-1 rounded-full bg-white/[0.08] text-slate-200 border border-white/10 font-normal">
                      {peakMm.toFixed(1)} mm/day
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">
                  Peak Occurrence Date
                </span>
                <span className="text-sm font-mono font-bold text-white flex items-center justify-end gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-monsoon-400" />
                  {profile?.peak_date || 'N/A'}
                </span>
                <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                  Annual breakdown: <strong className="text-slate-200">{profile?.heavy_days ?? 0}</strong> heavy • <strong className="text-slate-200">{profile?.very_heavy_days ?? 0}</strong> very heavy days
                </span>
              </div>
            </div>

            {/* DYNAMIC PROGRESS SPECTRUM GAUGE */}
            <div className="space-y-2 pt-2 border-t border-white/[0.06]">
              <div className="flex justify-between items-center text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-monsoon-400" />
                  Daily Intensity Spectrum (0 to 140+ mm/day)
                </span>
                <span className="text-white font-bold font-mono">
                  {peakMm.toFixed(1)} mm/day ({riskClass.label})
                </span>
              </div>

              {/* Multi-Segment Track */}
              <div className="relative w-full h-4 rounded-full bg-space-900 border border-white/10 overflow-hidden flex">
                {/* Segment 1: Light (0 to 44 mm) = 31.4% */}
                <div
                  className="h-full bg-gradient-to-r from-blue-600/40 to-sky-400/50 border-r border-white/20"
                  style={{ width: `${(44 / maxScaleMm) * 100}%` }}
                />
                {/* Segment 2: Heavy (44 to 88 mm) = 31.4% */}
                <div
                  className="h-full bg-gradient-to-r from-amber-500/40 to-amber-400/50 border-r border-white/20"
                  style={{ width: `${(44 / maxScaleMm) * 100}%` }}
                />
                {/* Segment 3: Very Heavy (88 to 140+ mm) = 37.2% */}
                <div
                  className="h-full bg-gradient-to-r from-rose-500/40 to-coralRisk-400/60"
                  style={{ width: `${((maxScaleMm - 88) / maxScaleMm) * 100}%` }}
                />

                {/* Progress Fill to Current Peak */}
                <div
                  className={`absolute top-0 bottom-0 left-0 transition-all duration-500 ${
                    riskClass.classId === 'very_heavy'
                      ? 'bg-gradient-to-r from-coralRisk-500/60 to-coralRisk-400'
                      : riskClass.classId === 'heavy'
                      ? 'bg-gradient-to-r from-amberRisk-500/60 to-amberRisk-400'
                      : 'bg-gradient-to-r from-rain-500/60 to-rain-400'
                  }`}
                  style={{ width: `${peakPercent}%`, opacity: 0.65 }}
                />
              </div>

              {/* Threshold Labels Below Track */}
              <div className="relative w-full text-[10px] font-mono text-slate-500 h-5">
                <span className="absolute left-0">0 mm/day</span>
                <span
                  className="absolute -translate-x-1/2 text-slate-400"
                  style={{ left: `${(44 / maxScaleMm) * 100}%` }}
                >
                  ▲ 44 mm (Light Threshold)
                </span>
                <span
                  className="absolute -translate-x-1/2 text-amberRisk-400"
                  style={{ left: `${(88 / maxScaleMm) * 100}%` }}
                >
                  ▲ 88 mm (Very Heavy Threshold)
                </span>
                <span className="absolute right-0">140+ mm/day</span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* INTERACTIVE BMD REFERENCE CATEGORY CARDS */}
          {/* ========================================================================= */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="uppercase tracking-wider text-slate-400 font-bold">
                Official Bangladesh Meteorological Department (BMD) Reference Categories
              </span>
              <span className="text-slate-500">Interactive: click to inspect thresholds</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {riskRules.classes.map((c) => {
                const isSelectedYearClass = riskClass.classId === c.id;
                const isUserInspected = inspectedClassId === c.id;
                const categoryMax = c.maxMm ?? maxScaleMm;
                const categoryProgress =
                  peakMm <= c.minMm
                    ? 0
                    : peakMm >= categoryMax
                    ? 100
                    : ((peakMm - c.minMm) / (categoryMax - c.minMm)) * 100;

                // Threshold boundaries
                const minVal = c.minMm;
                const maxVal = c.maxMm;
                const rangeLabel =
                  maxVal !== null
                    ? `${minVal}–${maxVal} mm/day`
                    : `>${minVal} mm/day`;

                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={isUserInspected}
                    onClick={() => setInspectedClassId(isUserInspected ? null : c.id)}
                    className={`p-5 rounded-2xl border text-left transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rain-400 ${
                      isSelectedYearClass
                        ? c.id === 'very_heavy'
                          ? 'bg-space-950/95 border-coralRisk-500/70 shadow-glow-coral/30 ring-2 ring-coralRisk-400/50'
                          : c.id === 'heavy'
                          ? 'bg-space-950/95 border-amberRisk-500/70 shadow-glow-amber/30 ring-2 ring-amberRisk-400/50'
                          : 'bg-space-950/95 border-rain-500/70 shadow-glow-cyan/30 ring-2 ring-rain-400/50'
                        : isUserInspected
                        ? 'bg-space-950/90 border-white/30 ring-1 ring-white/20 opacity-100'
                        : 'bg-space-950/60 border-white/[0.06] hover:border-white/20 opacity-80 hover:opacity-100'
                    }`}
                  >
                    {/* Active Ribbon for Selected Year */}
                    {isSelectedYearClass && (
                      <div
                        className={`absolute top-0 right-0 px-3 py-0.5 text-[9px] font-mono font-bold uppercase rounded-bl-xl ${
                          c.id === 'very_heavy'
                            ? 'bg-coralRisk-500 text-white'
                            : c.id === 'heavy'
                            ? 'bg-amberRisk-500 text-space-950'
                            : 'bg-rain-500 text-space-950'
                        }`}
                      >
                        Active in {selectedYear}
                      </div>
                    )}
                    {isUserInspected && !isSelectedYearClass && (
                      <span className="absolute top-0 right-0 px-3 py-0.5 text-[9px] font-mono font-bold uppercase rounded-bl-xl bg-white/15 text-white">
                        Threshold details
                      </span>
                    )}

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${
                            c.id === 'very_heavy'
                              ? 'bg-coralRisk-500/20 text-coralRisk-300 border border-coralRisk-500/30'
                              : c.id === 'heavy'
                              ? 'bg-amberRisk-500/20 text-amberRisk-300 border border-amberRisk-500/30'
                              : 'bg-rain-500/20 text-rain-300 border border-rain-500/30'
                          }`}
                        >
                          {rangeLabel}
                        </span>
                      </div>

                      <h3 className="text-xl font-bold font-display text-white">
                        {c.label}
                      </h3>

                      <p className="text-xs text-slate-300 leading-relaxed font-sans">
                        {c.floodLandslideText}
                      </p>
                    </div>

                    {/* Progress representation within this class */}
                    <div className="pt-4 border-t border-white/[0.08] mt-4 space-y-1.5">
                      <div className="flex justify-between text-[10px] font-mono text-slate-400">
                        <span>Category Inundation Risk</span>
                        <span className="text-white font-semibold">
                          {c.id === 'very_heavy'
                            ? 'Extreme / Flash Flood'
                            : c.id === 'heavy'
                            ? 'Localized Waterlogging'
                            : 'Standard Seasonal Runoff'}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-[width] duration-500 ${
                            c.id === 'very_heavy'
                              ? 'bg-coralRisk-400'
                              : c.id === 'heavy'
                                ? 'bg-amberRisk-400'
                                : 'bg-rain-400'
                          }`}
                          style={{ width: `${categoryProgress}%` }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* STRUCTURED VISUAL CARDS: WATERLOGGING & MOUNTAIN/SLOPE INSTABILITY */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* CARD 1: WATERLOGGING & DRAINAGE DYNAMICS */}
            <div className="p-6 rounded-2xl bg-space-950/80 border border-white/[0.08] space-y-4 relative overflow-hidden">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rain-500/15 border border-rain-500/30 flex items-center justify-center text-rain-400 shrink-0">
                  <Waves className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-400 block tracking-wider">
                    Hydrodynamic Factor Analysis
                  </span>
                  <h4 className="text-base font-bold font-display text-white">
                    Waterlogging & River Inundation Dynamics
                  </h4>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Satellite data captures rainfall accumulation, but real flooding severity is governed by compounding catchment conditions across Bangladesh's delta:
              </p>

              {/* Structured Visual Factor Chips */}
              <div className="grid grid-cols-1 gap-2.5 pt-1">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-start gap-2.5">
                  <Droplets className="w-4 h-4 text-rain-400 shrink-0 mt-0.5" />
                  <div className="text-xs font-mono">
                    <strong className="text-white block font-sans">Transboundary River Inundation</strong>
                    <span className="text-slate-400 text-[11px] leading-tight block mt-0.5">
                      Over 90% of river discharge originates outside Bangladesh borders (Brahmaputra, Ganges, Meghna basins).
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-start gap-2.5">
                  <Layers className="w-4 h-4 text-monsoon-400 shrink-0 mt-0.5" />
                  <div className="text-xs font-mono">
                    <strong className="text-white block font-sans">Metropolitan Drainage Bottlenecks</strong>
                    <span className="text-slate-400 text-[11px] leading-tight block mt-0.5">
                      Canal encroachment, silted stormwater drains, and high urban imperviousness cause rapid street waterlogging in Dhaka & Chattogram.
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-start gap-2.5">
                  <Waves className="w-4 h-4 text-amberRisk-400 shrink-0 mt-0.5" />
                  <div className="text-xs font-mono">
                    <strong className="text-white block font-sans">Tidal Backwater Constraints</strong>
                    <span className="text-slate-400 text-[11px] leading-tight block mt-0.5">
                      High spring tides in the Bay of Bengal push back against outgoing river flows in coastal Khulna and Barishal estuaries.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2: SLOPE INSTABILITY & LANDSLIDE DYNAMICS */}
            <div className="p-6 rounded-2xl bg-space-950/80 border border-white/[0.08] space-y-4 relative overflow-hidden">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amberRisk-500/15 border border-amberRisk-500/30 flex items-center justify-center text-amberRisk-400 shrink-0">
                  <Mountain className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-slate-400 block tracking-wider">
                    Geotechnical Slope Dynamics
                  </span>
                  <h4 className="text-base font-bold font-display text-white">
                    Slope Instability & Landslide Mechanics
                  </h4>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                In Bangladesh's hilly southeastern administrative divisions (Chattogram, Cox's Bazar, Bandarban), sustained or intense storms trigger severe geotechnical shear failures:
              </p>

              {/* Structured Visual Factor Chips */}
              <div className="grid grid-cols-1 gap-2.5 pt-1">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-start gap-2.5">
                  <Mountain className="w-4 h-4 text-amberRisk-400 shrink-0 mt-0.5" />
                  <div className="text-xs font-mono">
                    <strong className="text-white block font-sans">Sedimentary Shear Failure</strong>
                    <span className="text-slate-400 text-[11px] leading-tight block mt-0.5">
                      Loose, unconsolidated sandstone and shale layers rapidly liquefy under full moisture saturation.
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-coralRisk-400 shrink-0 mt-0.5" />
                  <div className="text-xs font-mono">
                    <strong className="text-white block font-sans">High-Intensity Storm Thresholds</strong>
                    <span className="text-slate-400 text-[11px] leading-tight block mt-0.5">
                      Short-interval cloudbursts (&gt;100 mm in 24–48 hours) dramatically surpass the soil pore-water drainage rate.
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-start gap-2.5">
                  <Layers className="w-4 h-4 text-monsoon-400 shrink-0 mt-0.5" />
                  <div className="text-xs font-mono">
                    <strong className="text-white block font-sans">Anthropogenic Hill Cutting</strong>
                    <span className="text-slate-400 text-[11px] leading-tight block mt-0.5">
                      Unregulated slope excavation and deforestation destroy root tensile stability on critical hill settlements.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dryness Context / Deficit Card if negative departure */}
          <div className="p-4 rounded-xl bg-space-950/90 border border-white/[0.08] flex items-start gap-3">
            <Info className="w-4 h-4 text-amberRisk-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs font-mono">
              <div className="font-bold text-white">
                Climatological Deficit & Dryness Interpretation:
              </div>
              <p className="text-slate-400 leading-relaxed">
                {isSevereDeficit
                  ? `Year ${selectedYear} experienced notable rainfall deficit. Low rainfall in pre-monsoon months impacts agricultural transplantation, groundwater recharge, and river baseflows. Note: This indicates statistical deficit, not an official drought declaration.`
                  : isDeficit
                  ? `Year ${selectedYear} fell below the 2005–2025 baseline mean. Rainfall deficit conditions reduce reservoir replenishment but vary significantly by regional division.`
                  : `Year ${selectedYear} showed adequate or above-baseline precipitation. Standardized departure indicates normal to surplus hydrological input.`}
              </p>
              {profile?.annual_anomaly_z !== null && profile?.annual_anomaly_z !== undefined && (
                <div className="text-amberRisk-300">
                  <MathFormula
                    expression={`z=${profile.annual_anomaly_z.toFixed(2)}`}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Mandatory Scientific Non-Warning Disclaimer */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[11px] font-mono text-slate-400 leading-relaxed">
            <strong className="text-slate-200">Mandatory Scientific Disclaimer:</strong> {riskRules.disclaimer}
          </div>
        </div>
      </DoubleBezelCard>
    </section>
  );
};
