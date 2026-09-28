import React, { useState } from 'react';
import { YearProfilesData, YearProfile } from '../../types/rainfall';
import { DoubleBezelCard } from '../common/DoubleBezelCard';
import { MathFormula } from '../common/MathFormula';
import { TrendingUp, TrendingDown, Info, Calendar, BarChart3, HelpCircle } from 'lucide-react';

interface Chapter07AnomalyProps {
  profilesData: YearProfilesData;
  selectedYear: number;
  onSelectYear: (year: number) => void;
}

export const Chapter07_Anomaly: React.FC<Chapter07AnomalyProps> = ({
  profilesData,
  selectedYear,
  onSelectYear,
}) => {
  const [hoveredProfile, setHoveredProfile] = useState<YearProfile | null>(null);

  const currentProfile: YearProfile | undefined = profilesData.profiles.find(
    (p) => p.year === selectedYear
  );

  const baselineAnnualTotal = profilesData.baseline_annual_total_mm;
  const getBaselineForProfile = (profile: YearProfile) =>
    profile.year === 2026
      ? profilesData['2026_common_period_baseline_total_mm']
      : baselineAnnualTotal;
  const baselineStd = profilesData.baseline_annual_std_total_mm;
  const selectedBaseline = currentProfile ? getBaselineForProfile(currentProfile) : baselineAnnualTotal;

  const is2026 = selectedYear === 2026;
  const selectedAnomalyMm = currentProfile?.annual_anomaly_mm ?? 0;
  const selectedZ = currentProfile?.annual_anomaly_z;

  // Chart layout geometry
  const chartWidth = 920;
  const chartHeight = 320;
  const paddingTop = 36;
  const paddingBottom = 48;
  const paddingLeft = 68;
  const paddingRight = 24;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;
  const zeroY = paddingTop + innerHeight / 2; // Exact horizontal zero-line

  const maxDeparture = 650; // mm domain (-650 to +650)
  const yScale = (val: number) => zeroY - (val / maxDeparture) * (innerHeight / 2);

  const profiles = profilesData.profiles;
  const barCount = profiles.length;
  const colWidth = innerWidth / barCount;
  const barWidth = Math.max(16, Math.min(26, colWidth * 0.72));

  // Determine which profile is currently previewed (hovered or selected)
  const activeProfile = hoveredProfile || currentProfile || profiles[0];
  const activeAnomalyMm = activeProfile.annual_anomaly_mm;
  const activeZ = activeProfile.annual_anomaly_z;
  const isActivePositive = activeAnomalyMm >= 0;

  return (
    <section id="anomaly" className="py-20 px-4 md:px-8 max-w-7xl mx-auto space-y-10">
      {/* Chapter header */}
      <div className="space-y-3">
        <div className="text-xs font-mono tracking-widest text-monsoon-400 uppercase flex items-center gap-2">
          <span>Chapter 05</span>
          <span className="w-1.5 h-1.5 rounded-full bg-monsoon-400" />
          <span>Climatological Departure Engine</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white font-display">
          Anomaly & Baseline Departures
        </h2>
        <p className="text-slate-400 max-w-3xl text-sm sm:text-base leading-relaxed">
          How unusual was each year compared to the long-term normal? The Anomaly Engine maps annual precipitation against the verified 2005–2025 baseline mean ({baselineAnnualTotal.toFixed(1)} mm). Blue/cyan bars represent hydrological surplus; warm amber bars represent precipitation deficits.
        </p>
      </div>

      <DoubleBezelCard glow="indigo">
        <div className="space-y-8">
          {/* Top Metric Readout Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Selected Value vs Baseline */}
            <div className="p-4 rounded-2xl bg-space-950/80 border border-white/[0.06] space-y-1 relative overflow-hidden">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">
                {is2026 ? '2026 YTD Observed' : `${selectedYear} Total Rainfall`}
              </span>
              <div className="text-2xl sm:text-3xl font-bold font-display text-white">
                {currentProfile?.annual_total_mm.toFixed(1)} <span className="text-sm font-normal text-slate-400">mm</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 block">
                Baseline Normal: {selectedBaseline.toFixed(1)} mm
              </span>
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-mono bg-white/[0.05] text-slate-400">
                Year {selectedYear}
              </div>
            </div>

            {/* Absolute Anomaly in mm */}
            <div className="p-4 rounded-2xl bg-space-950/80 border border-white/[0.06] space-y-1">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">
                Net Departure from Mean
              </span>
              <div
                className={`text-2xl sm:text-3xl font-bold font-display flex items-center gap-1.5 ${
                  selectedAnomalyMm >= 0 ? 'text-rain-400' : 'text-amberRisk-400'
                }`}
              >
                {selectedAnomalyMm >= 0 ? (
                  <TrendingUp className="w-5 h-5 shrink-0" />
                ) : (
                  <TrendingDown className="w-5 h-5 shrink-0" />
                )}
                <span>
                  {selectedAnomalyMm >= 0 ? '+' : ''}
                  {selectedAnomalyMm.toFixed(1)} mm
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 block">
                {selectedAnomalyMm >= 0 ? 'Hydrological Surplus (+mm)' : 'Rainfall Deficit (-mm)'}
              </span>
            </div>

            {/* Standardized Anomaly Z-Score */}
            <div className="p-4 rounded-2xl bg-space-950/80 border border-white/[0.06] space-y-1">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">
                Standardized Anomaly (z)
              </span>
              <div className="text-2xl sm:text-3xl font-bold font-display text-white">
                {selectedZ !== null && selectedZ !== undefined
                  ? `${selectedZ >= 0 ? '+' : ''}${selectedZ.toFixed(2)} σ`
                  : 'N/A'}
              </div>
              <span className="text-[10px] font-mono text-slate-500 block">
                Standard Deviation σ = {baselineStd.toFixed(1)} mm
              </span>
            </div>

            {/* Peak-Day Anomaly */}
            <div className="p-4 rounded-2xl bg-space-950/80 border border-white/[0.06] space-y-1">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">
                Peak-Day Departure
              </span>
              <div className="text-2xl sm:text-3xl font-bold font-display text-monsoon-300">
                {currentProfile?.peak_day_anomaly_mm !== null &&
                currentProfile?.peak_day_anomaly_mm !== undefined
                  ? `${currentProfile.peak_day_anomaly_mm >= 0 ? '+' : ''}${currentProfile.peak_day_anomaly_mm.toFixed(1)} mm`
                  : 'N/A'}
              </div>
              <span className="text-[10px] font-mono text-slate-500 block">
                Peak Day Rate: {currentProfile?.max_daily_mm.toFixed(1)} mm/day
              </span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* MODERN SVG ANOMALY BAR CHART WITH ZERO-BASELINE & INTERACTIVE TOOLTIP */}
          {/* ========================================================================= */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-3">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-monsoon-400" />
                  Historical Climatological Departure (2005–2026)
                </span>
                <span className="text-slate-500 hidden sm:inline">• Click any bar to select year</span>
              </div>
              <MathFormula expression="A_y=P_y-\mu_y" className="text-slate-300" />

              {/* Chart Legend */}
              <div className="flex items-center gap-4 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-gradient-to-t from-blue-600 to-sky-400 inline-block" />
                  <span>Surplus (+mm)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-gradient-to-b from-amber-400 to-orange-600 inline-block" />
                  <span>Deficit (-mm)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-white inline-block shadow-glow-cyan" />
                  <span>Baseline (0)</span>
                </span>
              </div>
            </div>

            {/* SVG Visualizer Container */}
            <div className="relative w-full rounded-2xl bg-space-950/90 border border-white/[0.08] p-4 overflow-hidden">
              {/* Floating Dynamic Tooltip Card */}
              {hoveredProfile && (
                <div
                  className="absolute z-20 pointer-events-none transition-all duration-150 transform -translate-x-1/2 p-3 rounded-xl bg-space-900/95 border border-white/20 shadow-2xl backdrop-blur-md space-y-1"
                  style={{
                    left: `${Math.max(18, Math.min(82, ((profiles.findIndex((p) => p.year === hoveredProfile.year) + 0.5) / barCount) * 100))}%`,
                    top: hoveredProfile.annual_anomaly_mm >= 0 ? '12px' : 'auto',
                    bottom: hoveredProfile.annual_anomaly_mm < 0 ? '12px' : 'auto',
                    minWidth: '190px',
                  }}
                >
                  <div className="flex items-center justify-between text-xs font-mono pb-1 border-b border-white/10">
                    <span className="font-bold text-white">Year {hoveredProfile.year}</span>
                    <span
                      className={`font-semibold ${
                        hoveredProfile.annual_anomaly_mm >= 0 ? 'text-rain-400' : 'text-amberRisk-400'
                      }`}
                    >
                      {hoveredProfile.annual_anomaly_mm >= 0 ? '+' : ''}
                      {hoveredProfile.annual_anomaly_mm.toFixed(1)} mm
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-300 space-y-0.5 pt-0.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Total rainfall:</span>
                      <span className="text-white font-bold">{hoveredProfile.annual_total_mm.toFixed(1)} mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Baseline mean:</span>
                      <span>{getBaselineForProfile(hoveredProfile).toFixed(1)} mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Anomaly value:</span>
                      <span className="font-semibold text-white">
                        {hoveredProfile.annual_anomaly_mm >= 0 ? '+' : ''}
                        {hoveredProfile.annual_anomaly_mm.toFixed(1)} mm
                      </span>
                    </div>
                  </div>
                  <div className="text-[9px] font-mono text-slate-400 pt-1 text-center italic border-t border-white/5">
                    Click to load Year {hoveredProfile.year}
                  </div>
                </div>
              )}

              {/* Main SVG Graphic */}
              <div className="overflow-x-auto">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  role="group"
                  aria-label="Annual rainfall anomalies from 2005 to 2026. Surpluses extend above the zero baseline and deficits below."
                  className="block w-full min-w-[720px] h-auto max-h-[380px]"
                >
                <defs>
                  {/* Positive Surplus Linear Gradient */}
                  <linearGradient id="surplusGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#2563eb" />
                  </linearGradient>

                  {/* Active Positive Surplus Gradient */}
                  <linearGradient id="surplusActiveGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#67e8f9" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>

                  {/* Negative Deficit Linear Gradient */}
                  <linearGradient id="deficitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ea580c" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>

                  {/* Active Negative Deficit Gradient */}
                  <linearGradient id="deficitActiveGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#fde047" />
                  </linearGradient>

                  {/* Drop Shadow Filter for Active Selection */}
                  <filter id="glowSurplus" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#38bdf8" floodOpacity="0.7" />
                  </filter>
                  <filter id="glowDeficit" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#fb923c" floodOpacity="0.7" />
                  </filter>
                </defs>

                {/* Horizontal Grid Lines */}
                {[
                  { val: 400, label: '+400 mm' },
                  { val: 200, label: '+200 mm' },
                  { val: -200, label: '-200 mm' },
                  { val: -400, label: '-400 mm' },
                ].map(({ val, label }) => {
                  const y = yScale(val);
                  return (
                    <g key={val}>
                      <line
                        x1={paddingLeft}
                        y1={y}
                        x2={chartWidth - paddingRight}
                        y2={y}
                        stroke="rgba(255, 255, 255, 0.08)"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                      />
                      <text
                        x={paddingLeft - 10}
                        y={y + 3}
                        textAnchor="end"
                        className="fill-slate-500 text-[10px] font-mono"
                      >
                        {label}
                      </text>
                    </g>
                  );
                })}

                {/* PROMINENT BASELINE ZERO-LINE (0 mm Departure) */}
                <line
                  x1={paddingLeft - 8}
                  y1={zeroY}
                  x2={chartWidth - paddingRight}
                  y2={zeroY}
                  stroke="rgba(255, 255, 255, 0.4)"
                  strokeWidth="1.5"
                />
                <text
                  x={paddingLeft - 10}
                  y={zeroY + 4}
                  textAnchor="end"
                  className="fill-white font-bold text-[11px] font-mono"
                >
                  0 mm
                </text>

                {/* Baseline Tag Badge */}
                <rect
                  x={chartWidth - paddingRight - 150}
                  y={zeroY - 11}
                  width="145"
                  height="22"
                  rx="6"
                  fill="#030712"
                  stroke="rgba(255, 255, 255, 0.2)"
                  strokeWidth="1"
                />
                <text
                  x={chartWidth - paddingRight - 78}
                  y={zeroY + 4}
                  textAnchor="middle"
                  className="fill-slate-300 font-mono text-[9px] uppercase tracking-wider font-semibold"
                >
                  Baseline μ ({baselineAnnualTotal.toLocaleString(undefined, { maximumFractionDigits: 1 })} mm)
                </text>

                {/* Render Individual Year Anomaly Bars */}
                {profiles.map((p, idx) => {
                  const isCurrent = p.year === selectedYear;
                  const isHovered = hoveredProfile?.year === p.year;
                  const anom = p.annual_anomaly_mm;
                  const isPositive = anom >= 0;

                  const centerX = paddingLeft + idx * colWidth + colWidth / 2;
                  const barX = centerX - barWidth / 2;

                  const rawY = yScale(anom);
                  const barY = isPositive ? rawY : zeroY;
                  const barH = Math.max(3, Math.abs(zeroY - rawY));

                  return (
                    <g
                      key={p.year}
                      className="cursor-pointer transition-all duration-200"
                      role="button"
                      tabIndex={0}
                      aria-label={`${p.year}: rainfall ${p.annual_total_mm.toFixed(1)} mm, baseline mean ${getBaselineForProfile(p).toFixed(1)} mm, anomaly ${p.annual_anomaly_mm >= 0 ? 'plus ' : ''}${p.annual_anomaly_mm.toFixed(1)} mm`}
                      onClick={() => onSelectYear(p.year)}
                      onMouseEnter={() => setHoveredProfile(p)}
                      onMouseLeave={() => setHoveredProfile(null)}
                      onFocus={() => setHoveredProfile(p)}
                      onBlur={() => setHoveredProfile(null)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onSelectYear(p.year);
                        }
                      }}
                    >
                      {/* Transparent hit target for reliable hover */}
                      <rect
                        x={centerX - colWidth / 2}
                        y={paddingTop}
                        width={colWidth}
                        height={innerHeight + 30}
                        fill="transparent"
                      />

                      {/* Subtle hover/active vertical beam behind bar */}
                      {(isHovered || isCurrent) && (
                        <rect
                          x={centerX - colWidth / 2 + 1}
                          y={paddingTop}
                          width={colWidth - 2}
                          height={innerHeight}
                          fill={isPositive ? 'rgba(56, 189, 248, 0.08)' : 'rgba(251, 146, 60, 0.08)'}
                          rx="4"
                        />
                      )}

                      {/* Main Anomaly Bar */}
                      <rect
                        x={barX}
                        y={barY}
                        width={barWidth}
                        height={barH}
                        rx="4"
                        fill={
                          isPositive
                            ? isCurrent
                              ? 'url(#surplusActiveGradient)'
                              : 'url(#surplusGradient)'
                            : isCurrent
                            ? 'url(#deficitActiveGradient)'
                            : 'url(#deficitGradient)'
                        }
                        stroke={isCurrent ? '#ffffff' : isHovered ? 'rgba(255,255,255,0.6)' : 'none'}
                        strokeWidth={isCurrent ? 1.5 : isHovered ? 1 : 0}
                        filter={
                          isCurrent
                            ? isPositive
                              ? 'url(#glowSurplus)'
                              : 'url(#glowDeficit)'
                            : undefined
                        }
                        opacity={isCurrent ? 1 : isHovered ? 0.95 : 0.78}
                      />

                      {/* Active indicator bead on baseline */}
                      {isCurrent && (
                        <circle
                          cx={centerX}
                          cy={zeroY}
                          r="3"
                          fill="#ffffff"
                          stroke={isPositive ? '#38bdf8' : '#fb923c'}
                          strokeWidth="1.5"
                        />
                      )}

                      {/* Year Label Underneath */}
                      <text
                        x={centerX}
                        y={chartHeight - 16}
                        textAnchor="middle"
                        className={`text-[10px] font-mono transition-colors ${
                          isCurrent
                            ? 'fill-white font-bold'
                            : isHovered
                            ? 'fill-slate-200'
                            : 'fill-slate-500'
                        }`}
                      >
                        {p.year === 2026 ? "'26*" : `'${String(p.year).slice(2)}`}
                      </text>
                    </g>
                  );
                })}
                </svg>
              </div>
            </div>
          </div>

          {/* Departure Narrative & Scientific Definition */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-start gap-3 text-xs font-mono text-slate-300">
              <Info className="w-4 h-4 text-monsoon-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Active Observation: Year {activeProfile.year}</strong>
                <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
                  {activeProfile.year === 2026
                    ? `2026 records reflect measurements to date. Compared to the equivalent 2005–2025 common-period mean (${getBaselineForProfile(activeProfile).toFixed(1)} mm), the current departure is ${activeAnomalyMm >= 0 ? '+' : ''}${activeAnomalyMm.toFixed(1)} mm.`
                    : `In ${activeProfile.year}, Bangladesh received a total of ${activeProfile.annual_total_mm.toFixed(1)} mm of rainfall. This represents a ${
                        isActivePositive ? 'surplus' : 'deficit'
                      } of ${Math.abs(activeAnomalyMm).toFixed(1)} mm (${activeZ !== null ? `${activeZ >= 0 ? '+' : ''}${activeZ.toFixed(2)} σ` : 'N/A'}) relative to the 21-year baseline.`}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-start gap-3 text-xs font-mono text-slate-300">
              <HelpCircle className="w-4 h-4 text-rain-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Scientific Metric Discipline</strong>
                <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
                  The standardized anomaly z-score represents the standard deviation distance from the climatological mean. It is an objective descriptive metric and must not be used as an official government flood or drought emergency declaration.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DoubleBezelCard>
    </section>
  );
};
