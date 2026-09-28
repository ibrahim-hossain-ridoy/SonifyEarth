import React, { useState } from 'react';
import { AUTHENTIC_DIVISION_PATHS, PROJECTED_CITY_COORDS } from '../../lib/authenticBangladeshMap';
import { CityMetadata, YearProfilesData, YearProfile } from '../../types/rainfall';
import { DoubleBezelCard } from '../common/DoubleBezelCard';
import { NavTabId } from '../common/Header';
import {
  Play,
  Pause,
  MapPin,
  Info,
  Volume2,
  ShieldCheck,
  Headphones,
  GitCompare,
  ShieldAlert,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface Chapter02MapExploreProps {
  profilesData: YearProfilesData;
  cities: CityMetadata[];
  selectedYear: number;
  selectedCity: string | null;
  activeLayer: 'national' | 'city';
  isPlaying: boolean;
  onSelectYear: (year: number) => void;
  onSelectCity: (cityName: string | null) => void;
  onSelectLayer: (layer: 'national' | 'city') => void;
  onPlaySelected: () => void;
  onNavigateTab: (tabId: NavTabId) => void;
}

export const Chapter02_MapExplore: React.FC<Chapter02MapExploreProps> = ({
  profilesData,
  cities,
  selectedYear,
  selectedCity,
  activeLayer,
  isPlaying,
  onSelectYear,
  onSelectCity,
  onSelectLayer,
  onPlaySelected,
  onNavigateTab,
}) => {
  const [hoveredCity, setHoveredCity] = useState<CityMetadata | null>(null);
  const [hoveredDivision, setHoveredDivision] = useState<string | null>(null);
  const [showBbox, setShowBbox] = useState<boolean>(true);

  const currentProfile: YearProfile | undefined = profilesData.profiles.find(
    (p) => p.year === selectedYear
  );

  // Selected city object if any
  const currentCityObj = cities.find(
    (c) => c.id === selectedCity || (selectedCity === 'Chattogram' && c.id === 'Chittagong') || (selectedCity === 'Barishal' && c.id === 'Barisal')
  );
  const cityYearValue = currentCityObj?.years[String(selectedYear)];

  // NASA Giovanni Bounding Box in 600x760 canvas coordinates
  // 88.05E, 20.55N to 92.65E, 26.65N
  const bboxRect = {
    x: 35,
    y: 35,
    width: 530,
    height: 690,
  };

  const divisionDisplayNames: Record<string, { en: string; bn: string }> = {
    Dhaka: { en: 'Dhaka', bn: 'ঢাকা' },
    Chittagong: { en: 'Chattogram', bn: 'চট্টগ্রাম' },
    Sylhet: { en: 'Sylhet', bn: 'সিলেট' },
    Rajshahi: { en: 'Rajshahi', bn: 'রাজশাহী' },
    Khulna: { en: 'Khulna', bn: 'খুলনা' },
    Barisal: { en: 'Barishal', bn: 'বরিশাল' },
    Rangpur: { en: 'Rangpur', bn: 'রংপুর' },
    Mymensingh: { en: 'Mymensingh', bn: 'ময়মনসিংহ' },
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Intro Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <span className="text-[10px] font-mono tracking-widest text-rain-400 uppercase block mb-1">
            Spatial Observation & Exploration Instrument
          </span>
          <h2 className="text-2xl sm:text-4xl font-bold font-display text-white">
            Bangladesh Rainfall Dashboard
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mt-1">
            Interactive geographical boundary rendered from authentic national survey coordinates.
            Click any division or city pin to inspect localized observations, or toggle the national area-average view.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              onSelectLayer('national');
              onSelectCity(null);
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-mono transition-all ${
              activeLayer === 'national'
                ? 'bg-rain-500 text-space-950 font-bold shadow-glow-cyan/40'
                : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.1]'
            }`}
          >
            🇧🇩 National Layer
          </button>
          <button
            onClick={() => {
              onSelectLayer('city');
              if (!selectedCity) onSelectCity('Dhaka');
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-mono transition-all ${
              activeLayer === 'city'
                ? 'bg-monsoon-500 text-white font-bold shadow-glow-indigo/40'
                : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.1]'
            }`}
          >
            📍 8 Divisional Stations
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* MAP INSTRUMENT SURFACE (COL 7) */}
        <div className="lg:col-span-7">
          <DoubleBezelCard glow="cyan" className="overflow-hidden">
            {/* Map Top Control Strip */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/[0.08] text-xs font-mono">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-rain-400 animate-pulse" />
                <span>
                  Focus:{' '}
                  <strong className="text-white">
                    {activeLayer === 'national' ? 'National Bangladesh' : currentCityObj?.name || 'Selected City'}
                  </strong>
                </span>
              </div>

              {/* Bbox Toggle */}
              <label className="flex items-center gap-2 text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showBbox}
                  onChange={(e) => setShowBbox(e.target.checked)}
                  className="rounded bg-space-950 border-white/20 text-rain-500 focus:ring-0"
                />
                <span>NASA Bounding Box</span>
              </label>
            </div>

            {/* SVG Map Canvas with authentic Bangladesh contours */}
            <div className="relative w-full aspect-[600/760] mt-3 bg-space-950/80 rounded-2xl border border-white/[0.05] p-2 flex items-center justify-center overflow-hidden">
              <svg
                viewBox="0 0 600 760"
                className="w-full h-full max-h-[680px] drop-shadow-2xl select-none"
              >
                <defs>
                  {/* Subtle Bay gradient */}
                  <linearGradient id="bayGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#0284c7" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity="0.25" />
                  </linearGradient>
                  {/* Division Selected Glow */}
                  <filter id="glowDiv" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#818cf8" floodOpacity="0.5" />
                  </filter>
                </defs>

                {/* Bay of Bengal backdrop */}
                <rect x="0" y="520" width="600" height="240" fill="url(#bayGradient)" />
                <text
                  x="300"
                  y="730"
                  fill="rgba(56, 189, 248, 0.25)"
                  fontSize="13"
                  fontFamily="monospace"
                  textAnchor="middle"
                  letterSpacing="0.25em"
                >
                  BAY OF BENGAL
                </text>

                {/* NASA Giovanni Bounding Box */}
                {showBbox && (
                  <g opacity="0.6">
                    <rect
                      x={bboxRect.x}
                      y={bboxRect.y}
                      width={bboxRect.width}
                      height={bboxRect.height}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                      strokeDasharray="6 4"
                    />
                    <text
                      x={bboxRect.x + 8}
                      y={bboxRect.y + 16}
                      fill="#38bdf8"
                      fontSize="9"
                      fontFamily="monospace"
                      letterSpacing="0.05em"
                    >
                      NASA GIOVANNI BBOX (88.05°E–92.65°E, 20.55°N–26.65°N)
                    </text>
                  </g>
                )}

                {/* Authentic Regional Division Vector Paths */}
                {Object.entries(AUTHENTIC_DIVISION_PATHS).map(([divName, pathData]) => {
                  const isSelected = activeLayer === 'city' && (selectedCity === divName || (divName === 'Chittagong' && selectedCity === 'Chattogram') || (divName === 'Barisal' && selectedCity === 'Barishal'));
                  const isHovered = hoveredDivision === divName;

                  return (
                    <path
                      key={divName}
                      d={pathData}
                      fill={
                        isSelected
                          ? 'rgba(99, 102, 241, 0.35)'
                          : isHovered
                          ? 'rgba(56, 189, 248, 0.2)'
                          : activeLayer === 'national'
                          ? 'rgba(30, 41, 59, 0.7)'
                          : 'rgba(15, 23, 42, 0.75)'
                      }
                      stroke={
                        isSelected
                          ? '#818cf8'
                          : isHovered
                          ? '#38bdf8'
                          : 'rgba(255, 255, 255, 0.22)'
                      }
                      strokeWidth={isSelected ? '2' : '1'}
                      filter={isSelected ? 'url(#glowDiv)' : undefined}
                      className="cursor-pointer transition-all duration-200"
                      onMouseEnter={() => setHoveredDivision(divName)}
                      onMouseLeave={() => setHoveredDivision(null)}
                      onClick={() => {
                        onSelectLayer('city');
                        onSelectCity(divName);
                      }}
                    />
                  );
                })}

                {/* 8 Divisional City Location Markers */}
                {Object.entries(PROJECTED_CITY_COORDS).map(([cityName, pt]) => {
                  const isSelected =
                    activeLayer === 'city' &&
                    (selectedCity === cityName ||
                      (cityName === 'Chittagong' && selectedCity === 'Chattogram') ||
                      (cityName === 'Barisal' && selectedCity === 'Barishal'));
                  const cityMeta = cities.find(
                    (c) =>
                      c.id === cityName ||
                      (cityName === 'Chittagong' && c.id === 'Chattogram') ||
                      (cityName === 'Barisal' && c.id === 'Barishal')
                  );
                  const isHovered = hoveredCity?.id === cityName;

                  return (
                    <g
                      key={cityName}
                      className="cursor-pointer group"
                      onMouseEnter={() => cityMeta && setHoveredCity(cityMeta)}
                      onMouseLeave={() => setHoveredCity(null)}
                      onClick={() => {
                        onSelectLayer('city');
                        onSelectCity(cityName);
                      }}
                    >
                      {/* Pulse ring for selected location */}
                      {isSelected && (
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="15"
                          fill="none"
                          stroke="#818cf8"
                          strokeWidth="2"
                          className="animate-ping origin-center"
                          opacity="0.7"
                        />
                      )}

                      {/* City Marker Pin */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isSelected ? '7' : isHovered ? '6' : '4.5'}
                        fill={isSelected ? '#6366f1' : '#38bdf8'}
                        stroke="#070c18"
                        strokeWidth="2"
                        className="transition-all duration-200"
                      />

                      {/* City Name Label */}
                      <text
                        x={pt.x + 8}
                        y={pt.y + 4}
                        fill={isSelected ? '#ffffff' : '#e2e8f0'}
                        fontSize={isSelected ? '12' : '10.5'}
                        fontWeight={isSelected ? '700' : '600'}
                        fontFamily="sans-serif"
                        className="pointer-events-none drop-shadow-md select-none"
                      >
                        {cityName}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Hover Tooltip Overlay */}
              {hoveredCity && (
                <div className="absolute bottom-4 left-4 p-3 rounded-xl bg-space-900/95 border border-rain-500/30 shadow-2xl backdrop-blur-md pointer-events-none z-20 text-xs font-mono space-y-1">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rain-400" />
                    <span>{hoveredCity.name}</span>
                    <span className="text-slate-400">({hoveredCity.bengaliName})</span>
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    Lat: {hoveredCity.lat.toFixed(2)}°N • Lon: {hoveredCity.lon.toFixed(2)}°E
                  </div>
                  <div className="text-rain-300 font-semibold">
                    2005–2025 Avg: {hoveredCity.avgRainfallMmDay} mm/day
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Click pin to select station
                  </div>
                </div>
              )}
            </div>

            {/* Spatial disclaimer */}
            <div className="flex items-center gap-2 mt-3 text-[11px] font-mono text-slate-400">
              <Info className="w-3.5 h-3.5 text-rain-400 shrink-0" />
              <span>
                {activeLayer === 'national'
                  ? 'National dataset reflects an area-weighted arithmetic mean across the rectangular bounding box.'
                  : `City station dataset reflects observed time-series for ${selectedCity || 'the 8 divisional centers'}. We do not interpolate synthetic values between stations.`}
              </span>
            </div>
          </DoubleBezelCard>
        </div>

        {/* DATA CONTROL & READOUT PANEL (COL 5) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Active selection badge card */}
          <DoubleBezelCard glow={activeLayer === 'city' ? 'indigo' : 'cyan'}>
            <div className="space-y-5">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block mb-0.5">
                    Current Spatial Selection
                  </span>
                  <div className="text-2xl font-bold font-display text-white flex items-center gap-2">
                    {activeLayer === 'national' ? 'National Bangladesh' : currentCityObj?.name}
                    {activeLayer === 'city' && (
                      <span className="text-sm font-normal text-slate-400 font-sans">
                        ({currentCityObj?.bengaliName})
                      </span>
                    )}
                  </div>
                </div>

                <div className="px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-xs font-mono font-semibold text-slate-200">
                  {selectedYear}
                </div>
              </div>

              {/* Year Selector Slider */}
              <div className="space-y-2 pt-2 border-t border-white/[0.08]">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-400">Observation Year</span>
                  <span className="font-bold text-rain-300">{selectedYear}</span>
                </div>
                <input
                  type="range"
                  min={2005}
                  max={2026}
                  value={selectedYear}
                  onChange={(e) => onSelectYear(Number(e.target.value))}
                  className="w-full h-2 bg-space-950 rounded-lg appearance-none cursor-pointer accent-rain-400"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>2005</span>
                  <span>2010</span>
                  <span>2015</span>
                  <span>2020</span>
                  <span className="text-rain-400 font-bold">2026 (YTD)</span>
                </div>
              </div>

              {/* 2026 Caveat Banner */}
              {selectedYear === 2026 && (
                <div className="p-3 rounded-xl bg-amberRisk-500/10 border border-amberRisk-500/30 text-amberRisk-300 text-xs font-mono space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>2026 Incomplete Calendar Year</span>
                  </div>
                  <p className="text-[11px] text-amberRisk-300/80 leading-relaxed">
                    Coverage ends at <strong>2026-09-24</strong>. Must not be treated as a completed annual total.
                  </p>
                </div>
              )}

              {/* Primary Metric Readout */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-xl bg-space-950/80 border border-white/[0.06]">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                    {activeLayer === 'national' ? 'Annual Total' : 'City Mean Daily'}
                  </span>
                  <div className="text-xl sm:text-2xl font-bold font-display text-white">
                    {activeLayer === 'national'
                      ? `${currentProfile?.annual_total_mm.toFixed(1)} mm`
                      : cityYearValue !== undefined
                      ? `${cityYearValue.toFixed(2)} mm/d`
                      : 'N/A for 2026'}
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    {activeLayer === 'national'
                      ? `${currentProfile?.mean_daily_mm.toFixed(2)} mm/day avg`
                      : 'Observed annual value'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-space-950/80 border border-white/[0.06]">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                    Peak Day (Max)
                  </span>
                  <div className="text-xl sm:text-2xl font-bold font-display text-rain-300">
                    {currentProfile ? `${currentProfile.max_daily_mm.toFixed(1)} mm` : '—'}
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    {currentProfile ? currentProfile.peak_date : 'Daily record'}
                  </span>
                </div>
              </div>

              {/* BMD Reference Class */}
              {currentProfile && (
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">
                      BMD Reference Category
                    </span>
                    <span className="font-bold text-white">
                      {currentProfile.peak_bmd_reference_category}
                    </span>
                  </div>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-rain-500/20 text-rain-300 border border-rain-500/30">
                    {currentProfile.heavy_days} heavy days
                  </span>
                </div>
              )}

              {/* Action Button: Play Audio for Selected Year/City */}
              <button
                onClick={onPlaySelected}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-full bg-gradient-to-r from-rain-500 to-monsoon-500 text-space-950 font-bold text-sm hover:brightness-110 shadow-glow-cyan/30 transition-all duration-200 active:scale-[0.99]"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                <span>
                  {isPlaying
                    ? `Pause ${activeLayer === 'national' ? `National ${selectedYear}` : `${selectedCity} Audio`}`
                    : `Listen to ${activeLayer === 'national' ? `National ${selectedYear}` : `${selectedCity}`} Audio`}
                </span>
                <Volume2 className="w-4 h-4" />
              </button>

              {/* Direct Dynamic Page Jump Actions */}
              <div className="pt-2 border-t border-white/[0.08] space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                  Explore Dedicated Experience Views:
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <button
                    onClick={() => onNavigateTab('listen')}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 transition-colors group"
                  >
                    <span className="flex items-center gap-1.5">
                      <Headphones className="w-3.5 h-3.5 text-rain-400" />
                      <span>Listen Page</span>
                    </span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <button
                    onClick={() => onNavigateTab('compare')}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 transition-colors group"
                  >
                    <span className="flex items-center gap-1.5">
                      <GitCompare className="w-3.5 h-3.5 text-monsoon-400" />
                      <span>Compare Page</span>
                    </span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <button
                    onClick={() => onNavigateTab('risk')}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 transition-colors group"
                  >
                    <span className="flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-amberRisk-400" />
                      <span>Risk Lens</span>
                    </span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <button
                    onClick={() => onNavigateTab('anomaly')}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 transition-colors group"
                  >
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-rain-300" />
                      <span>Anomaly Page</span>
                    </span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          </DoubleBezelCard>

          {/* Quick city selector pills when in city mode */}
          {activeLayer === 'city' && (
            <div className="p-4 rounded-2xl bg-space-900/60 border border-white/[0.06] space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                Quick Jump Division
              </span>
              <div className="flex flex-wrap gap-1.5">
                {cities.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => onSelectCity(c.id)}
                    className={`px-3 py-1 rounded-full text-xs font-mono transition-colors ${
                      selectedCity === c.id
                        ? 'bg-monsoon-500 text-white font-bold'
                        : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
