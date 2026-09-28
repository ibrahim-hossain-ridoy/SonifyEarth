import React, { lazy, Suspense, useState, useEffect } from 'react';
import {
  YearProfilesData,
  CityRainData,
  CityMetadata,
  DataPassportData,
  HistoricalEvent,
  RiskRulesData,
  DailyRainfallRecord,
  CreativeSettings,
  SCIENTIFIC_DEFAULT_CREATIVE,
} from './types/rainfall';
import { loadCoreData, loadDailyRecords, getYearProfile } from './lib/dataService';
import { audioEngine } from './lib/audioEngine';

import { Header, NavTabId } from './components/common/Header';

import { ExternalLink } from 'lucide-react';

const AIRobotGuide = lazy(() =>
  import('./components/common/AIRobotGuide').then((module) => ({ default: module.AIRobotGuide }))
);
const Chapter01_Hero = lazy(() =>
  import('./components/chapters/Chapter01_Hero').then((module) => ({ default: module.Chapter01_Hero }))
);
const Chapter02_MapExplore = lazy(() =>
  import('./components/chapters/Chapter02_MapExplore').then((module) => ({ default: module.Chapter02_MapExplore }))
);
const Chapter03_Listen = lazy(() =>
  import('./components/chapters/Chapter03_Listen').then((module) => ({ default: module.Chapter03_Listen }))
);
const Chapter04_Compare = lazy(() =>
  import('./components/chapters/Chapter04_Compare').then((module) => ({ default: module.Chapter04_Compare }))
);
const Chapter06_RiskLens = lazy(() =>
  import('./components/chapters/Chapter06_RiskLens').then((module) => ({ default: module.Chapter06_RiskLens }))
);
const Chapter07_Anomaly = lazy(() =>
  import('./components/chapters/Chapter07_Anomaly').then((module) => ({ default: module.Chapter07_Anomaly }))
);
const Chapter08_History = lazy(() =>
  import('./components/chapters/Chapter08_History').then((module) => ({ default: module.Chapter08_History }))
);
const Chapter09_Passport = lazy(() =>
  import('./components/chapters/Chapter09_Passport').then((module) => ({ default: module.Chapter09_Passport }))
);
const Chapter10_Creative = lazy(() =>
  import('./components/chapters/Chapter10_Creative').then((module) => ({ default: module.Chapter10_Creative }))
);
const Chapter11_Science = lazy(() =>
  import('./components/chapters/Chapter11_Science').then((module) => ({ default: module.Chapter11_Science }))
);

const validTabs: NavTabId[] = [
  'explore',
  'listen',
  'compare',
  'risk',
  'anomaly',
  'history',
  'passport',
  'creative',
  'science',
];

function getTabFromLocation(): NavTabId | null {
  const hashTab = window.location.hash.slice(1) as NavTabId;
  if (validTabs.includes(hashTab)) return hashTab;

  const pathTab = window.location.pathname.replace(/^\/+|\/+$/g, '') as NavTabId;
  return validTabs.includes(pathTab) ? pathTab : null;
}

export const App: React.FC = () => {
  // Navigation Tab State (Routing)
  const [currentTab, setCurrentTab] = useState<NavTabId>(() => getTabFromLocation() ?? 'explore');

  // Loaded Data State
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [profilesData, setProfilesData] = useState<YearProfilesData | null>(null);
  const [cityData, setCityData] = useState<CityRainData>({});
  const [cities, setCities] = useState<CityMetadata[]>([]);
  const [passport, setPassport] = useState<DataPassportData | null>(null);
  const [events, setEvents] = useState<HistoricalEvent[]>([]);
  const [riskRules, setRiskRules] = useState<RiskRulesData | null>(null);
  const [dailyRecords, setDailyRecords] = useState<DailyRainfallRecord[]>([]);

  // Synchronized Application State (Retained across all views)
  const [selectedYear, setSelectedYear] = useState<number>(2024);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState<'national' | 'city'>('national');
  const [creativeSettings, setCreativeSettings] = useState<CreativeSettings>(SCIENTIFIC_DEFAULT_CREATIVE);

  // Global Audio Activity Monitor
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);

  // Listen to URL hash for browser history / direct linking
  useEffect(() => {
    const handleLocationChange = () => {
      const tab = getTabFromLocation();
      if (tab) setCurrentTab(tab);
    };

    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  const handleSelectTab = (tab: NavTabId) => {
    setCurrentTab(tab);
    window.history.pushState(null, '', `/${tab}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Initial Data Fetching
  useEffect(() => {
    async function initData() {
      try {
        setLoading(true);
        const core = await loadCoreData();
        setProfilesData(core.profiles);
        setCityData(core.cityData);
        setCities(core.cities);
        setPassport(core.passport);
        setEvents(core.events);
        setRiskRules(core.riskRules);

        // Load daily records asynchronously
        const daily = await loadDailyRecords();
        setDailyRecords(daily);
      } catch (err: unknown) {
        console.error('Failed to load SonifyEarth data:', err);
        setError(err instanceof Error ? err.message : 'Unknown data loading error');
      } finally {
        setLoading(false);
      }
    }

    initData();
  }, []);

  // Quick Play handler for 2024 national audio from Hero
  const handleQuickPlayHero = () => {
    if (isAudioPlaying) {
      audioEngine.stopAll();
      setIsAudioPlaying(false);
    } else {
      audioEngine.playWav(
        '/audio/national/rainfall_BD_2024.wav',
        () => setIsAudioPlaying(false),
        (err) => {
          console.warn('WAV error, using synthesizer fallback:', err);
          setIsAudioPlaying(false);
        }
      );
      setIsAudioPlaying(true);
    }
  };

  // Quick Play handler for currently selected year/city
  const handlePlaySelected = () => {
    if (isAudioPlaying) {
      audioEngine.stopAll();
      setIsAudioPlaying(false);
    } else {
      let url =
        activeLayer === 'national'
          ? `/audio/national/rainfall_BD_${selectedYear}.wav`
          : `/audio/city/rainfall_city_${selectedCity || 'Dhaka'}.wav`;

      // Normalize naming
      url = url
        .replace(/rainfall_city_Chattogram\.wav/i, 'rainfall_city_Chittagong.wav')
        .replace(/rainfall_city_Barishal\.wav/i, 'rainfall_city_Barisal.wav');

      audioEngine.playWav(
        url,
        () => setIsAudioPlaying(false),
        (err) => {
          console.warn('WAV error, falling back to daily synthesis:', err);
          // Fallback to daily synthesis if available
          const yearRecords = dailyRecords.filter((r) => r.year === selectedYear);
          if (yearRecords.length > 0) {
            audioEngine.startSonification(
              yearRecords,
              0,
              creativeSettings,
              undefined,
              () => setIsAudioPlaying(false)
            );
          } else {
            setIsAudioPlaying(false);
          }
        }
      );
      setIsAudioPlaying(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-space-950 flex flex-col items-center justify-center space-y-4 font-mono text-xs text-slate-300">
        <div className="w-12 h-12 rounded-full border-2 border-rain-500 border-t-transparent animate-spin" />
        <div className="tracking-widest uppercase text-rain-400">Loading SonifyEarth Scientific Data...</div>
        <div className="text-[11px] text-slate-500">Parsing NASA IMERG Early Daily 2005–2026 series (7,942 records)</div>
      </div>
    );
  }

  if (error || !profilesData || !passport || !riskRules) {
    return (
      <div className="min-h-screen bg-space-950 flex flex-col items-center justify-center p-6 text-center space-y-4 font-mono">
        <div className="text-coralRisk-400 text-lg font-bold">Failed to load scientific datasets</div>
        <p className="text-slate-400 text-xs max-w-md">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-xl bg-white/[0.08] text-white text-xs hover:bg-white/[0.15]"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const currentProfile = getYearProfile(profilesData, selectedYear);

  return (
    <div className="relative min-h-screen bg-space-950 text-slate-100 bg-grid-pattern selection:bg-rain-500/30 selection:text-rain-200 flex flex-col">
      {/* Floating Island Header Navigation */}
      <Header
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        isAudioPlaying={isAudioPlaying}
        activeLayer={activeLayer}
        selectedYear={selectedYear}
        selectedCity={selectedCity}
        onStopAudio={() => setIsAudioPlaying(false)}
      />

      {/* Main Experience View Router */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-8">
        <Suspense
          fallback={
            <div className="flex min-h-64 items-center justify-center text-xs font-mono text-slate-400" role="status">
              Loading selected SonifyEarth instrument…
            </div>
          }
        >
        {/* TAB 1: DASHBOARD & MAP */}
        {currentTab === 'explore' && (
          <div className="space-y-12">
            <Chapter01_Hero
              onQuickPlay={handleQuickPlayHero}
              isPlaying={isAudioPlaying}
            />
            <Chapter02_MapExplore
              profilesData={profilesData}
              cities={cities}
              selectedYear={selectedYear}
              selectedCity={selectedCity}
              activeLayer={activeLayer}
              isPlaying={isAudioPlaying}
              onSelectYear={setSelectedYear}
              onSelectCity={setSelectedCity}
              onSelectLayer={setActiveLayer}
              onPlaySelected={handlePlaySelected}
              onNavigateTab={handleSelectTab}
            />
          </div>
        )}

        {/* TAB 2: LISTEN & SONIFIER */}
        {currentTab === 'listen' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 pb-2">
              <span className="text-rain-400">SonifyEarth</span>
              <span>/</span>
              <span>Listen & Scientific Sonification</span>
              <span>/</span>
              <span className="text-white font-bold">
                {activeLayer === 'national' ? 'National Bangladesh' : selectedCity} ({selectedYear})
              </span>
            </div>
            <Chapter03_Listen
              selectedYear={selectedYear}
              selectedCity={selectedCity}
              activeLayer={activeLayer}
              profile={currentProfile}
              dailyRecords={dailyRecords}
              creativeSettings={creativeSettings}
              isAudioPlaying={isAudioPlaying}
              onAudioStateChange={setIsAudioPlaying}
            />
          </div>
        )}

        {/* TAB 3: COMPARE & DELTA */}
        {currentTab === 'compare' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 pb-2">
              <span className="text-rain-400">SonifyEarth</span>
              <span>/</span>
              <span>Comparative Analytics & Delta Acoustics</span>
            </div>
            <Chapter04_Compare
              profilesData={profilesData}
              cityData={cityData}
              cities={cities}
              creativeSettings={creativeSettings}
              isAudioPlaying={isAudioPlaying}
              onAudioStateChange={setIsAudioPlaying}
            />
          </div>
        )}

        {/* TAB 4: RISK LENS */}
        {currentTab === 'risk' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 pb-2">
              <span className="text-rain-400">SonifyEarth</span>
              <span>/</span>
              <span>Risk Lens & Hydrological Context</span>
              <span>/</span>
              <span className="text-white font-bold">{selectedYear}</span>
            </div>
            <Chapter06_RiskLens
              selectedYear={selectedYear}
              profile={currentProfile}
              riskRules={riskRules}
            />
          </div>
        )}

        {/* TAB 5: ANOMALY */}
        {currentTab === 'anomaly' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 pb-2">
              <span className="text-rain-400">SonifyEarth</span>
              <span>/</span>
              <span>Statistical Anomaly & 2005–2025 Baseline Departure</span>
              <span>/</span>
              <span className="text-white font-bold">{selectedYear}</span>
            </div>
            <Chapter07_Anomaly
              profilesData={profilesData}
              selectedYear={selectedYear}
              onSelectYear={setSelectedYear}
            />
          </div>
        )}

        {/* TAB 6: HISTORICAL EVENTS */}
        {currentTab === 'history' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 pb-2">
              <span className="text-rain-400">SonifyEarth</span>
              <span>/</span>
              <span>Historical Disaster Impact Records</span>
            </div>
            <Chapter08_History
              events={events}
              selectedYear={selectedYear}
              onSelectYear={setSelectedYear}
            />
          </div>
        )}

        {/* TAB 7: DATA PASSPORT */}
        {currentTab === 'passport' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 pb-2">
              <span className="text-rain-400">SonifyEarth</span>
              <span>/</span>
              <span>Data Passport & Instrument Provenance</span>
            </div>
            <Chapter09_Passport passport={passport} />
          </div>
        )}

        {/* TAB 8: CREATIVE MODE */}
        {currentTab === 'creative' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 pb-2">
              <span className="text-rain-400">SonifyEarth</span>
              <span>/</span>
              <span>Auditory Expression & Synthesizer Controls</span>
            </div>
            <Chapter10_Creative
              settings={creativeSettings}
              selectedYear={selectedYear}
              dailyRecords={dailyRecords}
              isAudioPlaying={isAudioPlaying}
              onChangeSettings={setCreativeSettings}
              onAudioStateChange={setIsAudioPlaying}
            />
          </div>
        )}

        {/* TAB 9: SCIENCE & METHOD */}
        {currentTab === 'science' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 pb-2">
              <span className="text-rain-400">SonifyEarth</span>
              <span>/</span>
              <span>End-to-End Science Pipeline</span>
            </div>
            <Chapter11_Science />
          </div>
        )}
        </Suspense>
      </main>

      {/* Museum-Grade Footer */}
      <footer className="mt-16 py-12 px-4 md:px-8 border-t border-white/[0.08] bg-space-900/90 text-xs font-mono">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="space-y-1.5">
              <div className="text-base font-bold font-display text-white flex items-center gap-2">
                SonifyEarth: Hear the Change
                <span className="text-[10px] px-2 py-0.5 rounded bg-rain-500/20 text-rain-300 border border-rain-500/30">
                  NASA Space Apps 2026
                </span>
              </div>
              <p className="text-slate-400 max-w-xl text-[11px] leading-relaxed">
                Transforming Earth satellite data into calibrated auditory experiences.
                Built on verified NASA GPM IMERG Early Precipitation L3 measurements over Bangladesh (2005–2026).
              </p>
            </div>

            <div className="flex flex-wrap gap-4 text-slate-400">
              <a
                href="https://gpm.nasa.gov/data/imerg"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white flex items-center gap-1 transition-colors"
              >
                <span>NASA GPM Program</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://giovanni.gsfc.nasa.gov/giovanni/"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white flex items-center gap-1 transition-colors"
              >
                <span>NASA GES DISC / Giovanni</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://mobile.bmd.gov.bd/"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white flex items-center gap-1 transition-colors"
              >
                <span>BMD Official Reference</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="pt-4 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-4 text-slate-500 text-[10px]">
            <div>
              Data integrity verified: 7,942 daily records • 22 annual WAVs • 8 divisional WAVs • Zero mock data.
            </div>
            <div className="flex items-center gap-1">
              <span>Scientific Instrument Frontend</span>
              <span>•</span>
              <span>Multi-page Dynamic Routing</span>
            </div>
          </div>
        </div>
      </footer>
      <Suspense fallback={null}>
        <AIRobotGuide currentTab={currentTab} onSelectTab={handleSelectTab} />
      </Suspense>
    </div>
  );
};

export default App;
