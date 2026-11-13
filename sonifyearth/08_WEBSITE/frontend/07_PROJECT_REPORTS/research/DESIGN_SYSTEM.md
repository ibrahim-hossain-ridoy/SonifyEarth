# SONIFYEARTH — REDESIGNED VISUAL IDENTITY & DESIGN SYSTEM
## *Silence Isn't Zero — Cinematic Space-Science Documentary & Data Observatory*

- **Project**: SonifyEarth — *Silence Isn't Zero.* (*An Observation-Aware Lightning Jukebox*)
- **Design Direction**: Cinematic Space-Science Documentary × NASA Earth Information Center × Interactive Scientific Storytelling Platform

---

## 1. Visual Philosophy & Anti-Slop Principles

1. **No Walls of Cards**: Instead of placing every number inside an identical bordered box, the interface uses generous atmospheric canvases, typographic hierarchy, inline statistical ribbons, interactive diagrams, and progressive-disclosure tabs/drawers.
2. **Multi-Dimensional Atmospheric Palette**:
   - **Deep Orbital Space Backgrounds**: `#03060D` (void canvas), `#070D19` (elevated observatory surface), `#0C1526` (interactive module surface), `#121F36` (hover/active surface).
   - **Semantic Three-State Tokens (Never Color Alone)**:
     - **`◆ DETECTED` (Confirmed Lightning Flash)**: Warm Electric Amber `#FBBF24` (glow `#FEF08A`, surface `rgba(251, 191, 36, 0.12)`, border `rgba(251, 191, 36, 0.48)`, solid diamond icon `◆`).
     - **`◎ OBSERVED_NO_DETECTION` (Active Surveillance, 0 Flashes)**: Orbital Surveillance Cyan `#38BDF8` (surface `rgba(56, 189, 248, 0.12)`, border `rgba(56, 189, 248, 0.45)`, concentric target icon `◎`).
     - **`⊘ UNKNOWN` (Unavailable / SAA / Fatal / Out-of-Swath)**: Unavailable Violet-Purple `#C084FC` (surface `rgba(192, 132, 252, 0.12)`, dashed border `rgba(192, 132, 252, 0.55)`, diagonal hatch pattern + null-set symbol `⊘`).
3. **Typography & Tabular Numerals**:
   - **Display & Headings**: `'Space Grotesk', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif` with `text-wrap: balance` and tight tracking (`-0.025em`).
   - **Body & Storytelling Prose**: `'Inter', system-ui, sans-serif` at `60ch–72ch` readable line lengths with `text-wrap: pretty`.
   - **Scientific Telemetry, Timestamps & Counters**: `'JetBrains Mono', 'SFMono-Regular', monospace` with `font-variant-numeric: tabular-nums` so dynamic counters and UTC/TAI93 clocks never jitter horizontally during orbital playback.

---

## 2. Purposeful Motion & Reduced-Motion Contract

- **Hero Animated Earth-and-Orbit Scene (`#hero-orbit-canvas`)**: Renders a curved Earth horizon, inclined `51.6°` ISS orbital track, moving `~550 km` optical camera swath, transient amber lightning flashes inside the swath, cyan observed footprint trail, and purple hatched SAA/unobserved zones.
- **Interactive Mission & Pipeline Transitions**: Smooth state transitions (`180ms cubic-bezier(0.22, 1, 0.36, 1)`) using explicit properties (`transform, opacity, border-color, background-color, box-shadow` — never `transition: all`).
- **Live Acoustic Visualizer (`#sound-visualizer-canvas`)**: Synchronizes directly with `SonifyEarthSoundEngine` to render transient `880→440 Hz` pulse spikes (`DETECTED`), calm `220/330 Hz` harmonic waves (`OBSERVED_NO_DETECTION` in `OBSERVATION-AWARE` mode), and dual `528→396 Hz` neutral rings (`UNKNOWN`).
- **Strict Reduced-Motion Support**: Respects `@media (prefers-reduced-motion: reduce)` and the in-page **Reduced Motion** toggle (`#footer-reduced-motion-btn`), halting continuous canvas sweeps while keeping all scientific states, labels, and interactive step controls 100% accessible.
