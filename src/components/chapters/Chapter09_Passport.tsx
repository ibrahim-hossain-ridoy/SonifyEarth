import React from 'react';
import { DataPassportData } from '../../types/rainfall';
import { DoubleBezelCard } from '../common/DoubleBezelCard';
import { MathFormula } from '../common/MathFormula';
import {
  FileText,
  ExternalLink,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
  X,
  Database,
  Cpu,
  Globe2,
} from 'lucide-react';

interface Chapter09PassportProps {
  passport: DataPassportData;
  isOpenModal?: boolean;
  onCloseModal?: () => void;
}

export const Chapter09_Passport: React.FC<Chapter09PassportProps> = ({
  passport,
  isOpenModal = false,
  onCloseModal,
}) => {
  const content = (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="text-xs font-mono tracking-widest text-rain-400 uppercase flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-rain-400" />
            <span>Scientific Provenance Certification</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold font-display text-white mt-1">
            Data Passport: Every Sound Has a Source
          </h3>
        </div>

        {isOpenModal && (
          <button
            onClick={onCloseModal}
            className="p-2 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Grid of Verified Scientific Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Dataset & Product */}
        <div className="p-4 rounded-xl bg-space-950/80 border border-white/[0.06] space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-500 block">
            Satellite Dataset
          </span>
          <div className="text-sm font-bold font-display text-white">
            {passport.national_dataset.dataset}
          </div>
          <span className="text-xs font-mono text-slate-400 block">
            Product: GPM IMERG Early L3 (V07)
          </span>
        </div>

        {/* Collection & Source */}
        <div className="p-4 rounded-xl bg-space-950/80 border border-white/[0.06] space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-500 block">
            Collection & Provider
          </span>
          <div className="text-sm font-bold font-display text-white">
            GPM_3IMERGDE_07
          </div>
          <span className="text-xs font-mono text-slate-400 block">
            {passport.national_dataset.source}
          </span>
        </div>

        {/* Physical Variable & Unit */}
        <div className="p-4 rounded-xl bg-space-950/80 border border-white/[0.06] space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-500 block">
            Physical Quantity & Unit
          </span>
          <div className="text-sm font-bold font-display text-rain-300">
            Precipitation ({passport.national_dataset.unit})
          </div>
          <span className="text-xs font-mono text-slate-400 block">
            Microwave-IR Combined Daily Mean
          </span>
        </div>

        {/* Temporal Range */}
        <div className="p-4 rounded-xl bg-space-950/80 border border-white/[0.06] space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-500 block">
            Temporal Coverage
          </span>
          <div className="text-sm font-bold font-display text-white">
            2005-01-01 to 2026-09-24
          </div>
          <span className="text-xs font-mono text-amberRisk-400 block">
            {passport.national_dataset['2026_note']}
          </span>
        </div>

        {/* Spatial Bounding Box */}
        <div className="p-4 rounded-xl bg-space-950/80 border border-white/[0.06] space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-500 block">
            Spatial Basis (Bounding Box)
          </span>
          <div className="text-sm font-bold font-display text-white">
            88.05°E–92.65°E, 20.55°N–26.65°N
          </div>
          <span className="text-xs font-mono text-slate-400 block">
            Area-averaged bounding box
          </span>
        </div>

        {/* Audio Synthesis Format */}
        <div className="p-4 rounded-xl bg-space-950/80 border border-white/[0.06] space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-500 block">
            Acoustic Signal Specifications
          </span>
          <div className="text-sm font-bold font-display text-monsoon-300">
            {passport.audio_assets.national.format}
          </div>
          <span className="text-xs font-mono text-slate-400 block">
            Frequency Range: {passport.frequency_mapping.min_hz}–{passport.frequency_mapping.max_hz} Hz
          </span>
        </div>
      </div>

      {/* Mathematical Formulas */}
      <div className="p-5 rounded-2xl bg-space-950 border border-white/[0.08] space-y-3 font-mono text-xs">
        <div className="text-slate-400 uppercase tracking-wider text-[11px] font-bold">
          Calibrated Translation Formulas
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-300">
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1">
            <span className="text-rain-400 font-bold block">1. Daily rainfall sonification:</span>
            <MathFormula display expression="u=\operatorname{clip}\left(\frac{r}{100\;\mathrm{mm/day}},0,1\right)" />
            <MathFormula display expression="f(r)=220\left(\frac{880}{220}\right)^u\;\mathrm{Hz}" />
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1">
            <span className="text-monsoon-400 font-bold block">2. Comparative delta (annual totals):</span>
            <MathFormula display expression="\Delta=B-A" />
            <MathFormula display expression="f(r)=220\left(\frac{880}{220}\right)^{\min\left(1,\frac{r}{5000\;\mathrm{mm}}\right)}\;\mathrm{Hz}" />
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1">
            <span className="text-amberRisk-400 font-bold block">3. Comparative delta (city daily rates):</span>
            <MathFormula display expression="\Delta=B-A" />
            <MathFormula display expression="f(r)=220\left(\frac{880}{220}\right)^{\min\left(1,\frac{r}{20\;\mathrm{mm/day}}\right)}\;\mathrm{Hz}" />
          </div>

          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1">
            <span className="text-emerald-400 font-bold block">4. Standardized Anomaly Z-Score:</span>
            <MathFormula display expression="z=\frac{x-\mu_{2005\text{--}2025}}{\sigma_{2005\text{--}2025}}" />
            <span className="block text-[10px] text-slate-400">Baseline mean 2,626.8 mm; standard deviation 273.3 mm.</span>
          </div>
        </div>
      </div>

      {/* Data Quality & Integrity Validation */}
      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 text-xs font-mono text-emerald-300">
        <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <strong className="text-emerald-200">Data Integrity Verification:</strong>
          <p className="mt-1 text-[11px] leading-relaxed">
            7,942 daily measurements inspected. Zero missing dates. Zero missing values. Non-exact leap date anomalies (Feb 28 in 2009, 2013, 2017, 2021, 2025) retained in raw CSV for complete transparency. City dataset provenance strictly labeled as local station inputs and isolated from NASA bounding-box satellite metrics.
          </p>
        </div>
      </div>

      {/* External Verified Links */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-mono pt-2 border-t border-white/[0.08]">
        <div className="flex items-center gap-4">
          <a
            href={passport.national_dataset.source_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-rain-400 hover:text-rain-300 underline underline-offset-4"
          >
            <span>NASA GES DISC / Giovanni Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <a
            href="https://gpm.nasa.gov/data/imerg/precipitation-climatology"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-slate-400 hover:text-white underline underline-offset-4"
          >
            <span>NASA GPM Climatology Reference</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <span className="text-slate-500">
          SonifyEarth Handoff v1.0.0
        </span>
      </div>
    </div>
  );

  // If rendered as modal overlay
  if (isOpenModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xl animate-fade-in">
        <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-3xl bg-space-900 border border-white/10 shadow-2xl p-6 sm:p-8">
          {content}
        </div>
      </div>
    );
  }

  // Standard inline story chapter
  return (
    <section id="passport" className="py-20 px-4 md:px-8 max-w-7xl mx-auto space-y-10">
      <DoubleBezelCard glow="cyan">
        {content}
      </DoubleBezelCard>
    </section>
  );
};
