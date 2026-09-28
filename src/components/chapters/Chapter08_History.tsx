import React from 'react';
import { HistoricalEvent } from '../../types/rainfall';
import { DoubleBezelCard } from '../common/DoubleBezelCard';
import { ExternalLink, Calendar, AlertCircle, MapPin, ShieldAlert } from 'lucide-react';

interface Chapter08HistoryProps {
  events: HistoricalEvent[];
  selectedYear: number;
  onSelectYear: (year: number) => void;
}

export const Chapter08_History: React.FC<Chapter08HistoryProps> = ({
  events,
  selectedYear,
  onSelectYear,
}) => {
  // NASA Earth Observatory 2007 Chittagong event from year_profiles.json
  const allEvents = [
    {
      id: 'bd-2007-chittagong',
      year: 2007,
      label: 'Chittagong Floods & Landslides',
      period: 'June 4–11, 2007',
      hazards: ['flood', 'landslide'],
      context:
        'NASA Earth Observatory documented unusually heavy rainfall, flash floods, and severe landslides in Chittagong, reporting up to 400 mm in the city during this single storm sequence.',
      sources: [
        {
          publisher: 'NASA Earth Observatory',
          title: 'Floods in Bangladesh (EO-18488)',
          url: 'https://science.nasa.gov/earth/earth-observatory/floods-in-bangladesh-18488/',
        },
        {
          publisher: 'World Bank',
          title: 'Bangladesh Flood Restoration & Recovery Assistance Program',
          url: 'https://documents1.worldbank.org/curated/en/970691468206344752/pdf/417580BD.pdf',
        },
      ],
    },
    ...events.filter((e) => e.id !== 'bd-2007-floods'), // merge unique
  ];

  return (
    <section id="history" className="py-20 px-4 md:px-8 max-w-7xl mx-auto space-y-10">
      {/* Chapter header */}
      <div className="space-y-3">
        <div className="text-xs font-mono tracking-widest text-rain-400 uppercase flex items-center gap-2">
          <span>Chapter 06</span>
          <span className="w-1.5 h-1.5 rounded-full bg-rain-400" />
          <span>Documented Ground Reality</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white font-display">
          Historical Event Context
        </h2>
        <p className="text-slate-400 max-w-3xl text-sm sm:text-base leading-relaxed">
          Ground-truth records connect statistical precipitation signals with real human impacts.
          These historical accounts are compiled directly from NASA Earth Observatory, the World Bank, the World Health Organization, and the United Nations.
        </p>
      </div>

      <DoubleBezelCard glow="cyan">
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center gap-3 text-xs font-mono text-slate-300">
            <AlertCircle className="w-4 h-4 text-amberRisk-400 shrink-0" />
            <span>
              <strong>Scientific Causality Notice:</strong> Annual rainfall averages cannot establish singular disaster causality. Regional geography, upstream transboundary runoff, drainage capacity, and local exposure are essential co-factors.
            </span>
          </div>

          {/* Timeline of Verified Historical Events */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            {allEvents.map((evt) => {
              const isSelectedYear = evt.year === selectedYear;
              const location =
                evt.year === 2007
                  ? 'Chittagong'
                  : evt.year === 2024
                  ? 'Sylhet · Cox’s Bazar'
                  : 'Eastern BD';
              const eventTags = [
                evt.year === 2024
                  ? 'Flash Flood'
                  : evt.year === 2007
                  ? 'Monsoon Emergency'
                  : 'Monsoon Flood',
                ...(evt.hazards.some((hazard) => hazard.toLowerCase().includes('landslide'))
                  ? ['Landslide Risk']
                  : []),
              ];

              return (
                <div
                  key={evt.id}
                  className={`p-6 rounded-2xl border transition-all duration-300 flex flex-col justify-between space-y-4 ${
                    isSelectedYear
                      ? 'bg-space-950 border-rain-400/50 shadow-glow-cyan/20 ring-1 ring-rain-400/40'
                      : 'bg-space-950/70 border-white/[0.06] hover:border-white/20'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectYear(evt.year)}
                    aria-pressed={isSelectedYear}
                    className="w-full text-left space-y-4 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rain-400"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-white/[0.08] text-white font-bold font-mono text-xs">
                        Year {evt.year}
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-mono uppercase border ${
                          isSelectedYear
                            ? 'bg-rain-500/15 text-rain-200 border-rain-400/40'
                            : 'bg-white/[0.04] text-slate-400 border-white/10'
                        }`}
                      >
                        {isSelectedYear ? 'Year synced' : 'Historical record'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {eventTags.map((tag) => (
                        <span
                          key={tag}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold border ${
                            tag === 'Landslide Risk'
                              ? 'bg-amberRisk-500/10 text-amberRisk-300 border-amberRisk-500/25'
                              : tag === 'Flash Flood'
                              ? 'bg-coralRisk-500/10 text-coralRisk-300 border-coralRisk-500/25'
                              : 'bg-rain-500/10 text-rain-300 border-rain-500/25'
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <h3 className="text-lg font-bold font-display text-white">
                      {evt.label}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-mono text-slate-400">
                      {evt.period && (
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-rain-400" />
                          {evt.period}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5 rounded-full bg-white/[0.05] px-2.5 py-1 text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-rain-400" />
                        {location}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      {evt.context}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-rain-300">
                      {isSelectedYear ? 'Selected for analysis' : `Select ${evt.year}`}
                      <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
                    </span>
                  </button>

                  {/* Sources & Action */}
                  <div className="pt-4 border-t border-white/[0.08] space-y-3">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono uppercase text-slate-500 block">
                        Verified Sources:
                      </span>
                      {evt.sources.map((src, sIdx) => (
                        <a
                          key={sIdx}
                          href={src.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between text-xs font-mono text-rain-400 hover:text-rain-300 transition-colors group"
                        >
                          <span className="truncate pr-2">{src.publisher}: {src.title}</span>
                          <ExternalLink className="w-3 h-3 shrink-0 opacity-70 group-hover:opacity-100" />
                        </a>
                      ))}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DoubleBezelCard>
    </section>
  );
};
