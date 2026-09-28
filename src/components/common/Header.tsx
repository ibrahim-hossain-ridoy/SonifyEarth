import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Menu,
  X,
  Compass,
  Headphones,
  GitCompare,
  ShieldAlert,
  Layers,
  Sparkles,
  BookOpen,
  FileCheck2,
  History,
} from 'lucide-react';
import { audioEngine } from '../../lib/audioEngine';

export type NavTabId =
  | 'explore'
  | 'listen'
  | 'compare'
  | 'risk'
  | 'anomaly'
  | 'history'
  | 'passport'
  | 'creative'
  | 'science';

interface HeaderProps {
  currentTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
  isAudioPlaying: boolean;
  activeLayer: 'national' | 'city';
  selectedYear: number;
  selectedCity: string | null;
  onStopAudio: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  isAudioPlaying,
  activeLayer,
  selectedYear,
  selectedCity,
  onStopAudio,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tabs: Array<{ id: NavTabId; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'explore', label: 'Map Dashboard', icon: Compass },
    { id: 'listen', label: 'Listen', icon: Headphones },
    { id: 'compare', label: 'Compare & Delta', icon: GitCompare },
    { id: 'risk', label: 'Risk Lens', icon: ShieldAlert },
    { id: 'anomaly', label: 'Anomaly', icon: Layers },
    { id: 'history', label: 'History', icon: History },
    { id: 'passport', label: 'Passport', icon: FileCheck2 },
    { id: 'creative', label: 'Creative', icon: Sparkles },
    { id: 'science', label: 'Science', icon: BookOpen },
  ];

  return (
    <header className="sticky top-0 z-50 px-3 min-[420px]:px-4 md:px-8 py-3 bg-space-950/85 backdrop-blur-2xl border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 min-[420px]:gap-4">
        {/* Brand */}
        <div
          onClick={() => onSelectTab('explore')}
          className="flex items-center gap-3 cursor-pointer group shrink-0"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rain-600 to-monsoon-500 flex items-center justify-center p-0.5 shadow-glow-cyan/40">
            <div className="w-full h-full rounded-full bg-space-950 flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-rain-400 group-hover:scale-125 transition-transform" />
            </div>
          </div>
          <div>
            <div className="text-sm max-[420px]:text-xs font-bold tracking-tight text-white flex items-center gap-1.5 font-display">
              SonifyEarth
                <span className="max-[420px]:hidden text-[10px] px-1.5 py-0.5 rounded bg-rain-500/20 text-rain-300 font-mono font-medium border border-rain-500/30">
                NASA 2026
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono tracking-wider">
              HEAR THE CHANGE
            </div>
          </div>
        </div>

        {/* Tab Navigation (Desktop) */}
        <nav className="hidden xl:flex items-center gap-1 text-xs font-mono">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
                  isActive
                    ? 'bg-rain-500 text-space-950 font-bold shadow-glow-cyan/40 scale-[1.02]'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-space-950' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Active Focus Readout & Audio Stop Control */}
        <div className="flex items-center gap-1.5 min-[420px]:gap-2.5 shrink-0">
          {/* Active selection tag */}
          <div
            onClick={() => onSelectTab('explore')}
            title="Click to jump to Map Dashboard"
            className="cursor-pointer flex items-center gap-2 px-2 min-[420px]:px-3 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono transition-colors"
          >
            <span className="hidden min-[420px]:inline-block w-2 h-2 rounded-full bg-rain-400 animate-pulse" />
            <span className="text-slate-400">
              <span className="max-[420px]:hidden">{activeLayer === 'national' ? 'National' : selectedCity}:</span>
            </span>
            <span className="text-white font-bold">{selectedYear}</span>
          </div>

          {/* Audio Stop Button */}
          {isAudioPlaying ? (
            <button
              onClick={() => {
                audioEngine.stopAll();
                onStopAudio();
              }}
              title="Stop active audio"
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-coralRisk-500/20 text-coralRisk-400 border border-coralRisk-500/40 text-xs font-mono hover:bg-coralRisk-500/30 transition-colors animate-pulse"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>STOP AUDIO</span>
            </button>
          ) : (
            <div
              title="Acoustic translation engine ready"
              className="p-1.5 rounded-full bg-white/[0.04] text-slate-400 border border-white/[0.08]"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 rounded-full bg-white/[0.05] text-slate-300 border border-white/10"
            aria-label="Toggle navigation tabs"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Tab Dropdown */}
      {mobileMenuOpen && (
        <div className="xl:hidden mt-3 p-4 rounded-2xl bg-space-900 border border-white/10 shadow-2xl space-y-2 animate-fade-in">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest pb-1 border-b border-white/[0.08]">
            Experience Pages
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    onSelectTab(tab.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-colors ${
                    isActive
                      ? 'bg-rain-500 text-space-950 font-bold'
                      : 'bg-white/[0.03] text-slate-200 hover:bg-white/[0.08]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
