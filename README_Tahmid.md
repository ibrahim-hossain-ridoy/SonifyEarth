# SonifyEarth Rainfall MVP → Tahmid Integration Handoff

## What is already done
This package implements the **national Bangladesh rainfall** layer around the team's current NASA IMERG MVP dataset and audio:

1. **Compare:** any two years, with numeric values and Δ.
2. **Delta Sound:** Web Audio API generated from `Δ = Year_B - Year_A`, with signed direction and documented magnitude mapping.
3. **Risk Lens:** BMD daily rainfall reference class from the selected year's peak daily rainfall plus waterlogging/flood and terrain-dependent landslide context; low-rainfall dryness context uses anomaly z.
4. **Anomaly:** annual/observed-to-date anomaly and standardized anomaly, plus peak-day anomaly.
5. **Data Passport:** dataset, variable, unit, time coverage, spatial basis, frequency range, and formulas.
6. **Creative controls:** timbre, base frequency, pan, reset to scientific default. These alter expression, not the scientific data value or documented mapping.
7. **Historical context:** NASA-documented Bangladesh rainfall/flood/landslide examples for 2007, 2019, and 2024.
8. **National audio:** all 22 WAV files 2005–2026 are included.

## Important data caveat
The current national series is a **Giovanni area-average bounding box**, not an exact Bangladesh national-boundary mask. The Data Passport states the bounding box explicitly. Keep this wording in the UI until the exact Bangladesh polygon/grid mask is built.

The current source series contains five exact duplicate rows. The integration JSON removes only exact duplicates for derived feature calculations. The raw source CSV is kept unchanged for traceability.

**2026 is incomplete:** current coverage ends at **2026-09-24** in this package. Comparisons involving 2026 use the common date window instead of treating 2026 as a full year.

## How Tahmid should use this
Open or copy the structure from `demo/index.html` into the main UI. The main integration logic is in `src/sonifyearth_rainfall.js`.

### Fastest path
- Keep the existing project's visual design.
- Add the five feature blocks from the demo as UI sections/components.
- Use `data/year_profiles.json` for year-level cards.
- Use `data/daily_rainfall_2005_2026.json` when date-level detail is needed.
- Keep `data/data_passport.json` as the source-of-truth for labels/formulas.
- Use `audio/national/` for Listen mode.
- Use Web Audio for Delta Sound rather than creating a separate WAV for every pair.

## Compare behavior
**Complete years (2005–2025):** `Delta = Total_B - Total_A` using annual total rainfall (mm).

**Any comparison involving 2026:** use Jan 1 through `2026-09-24` for both years. Do not compare the 2026 YTD value against another full-year total.

## Risk Lens behavior
BMD daily reference classes used in this MVP:
- Light: 1–10 mm/day
- Moderate: 11–22 mm/day
- Moderately heavy: 23–43 mm/day
- Heavy: 44–88 mm/day
- Very heavy: >88 mm/day

These are **reference classes**, not a disaster-probability score. For the national area-average series, show the class as a reference context based on the selected year's peak daily value. Keep the caveat visible in an info/tooltip.

## Anomaly behavior
For a complete year:
`Annual anomaly (mm) = selected annual total - mean annual total (2005–2025)`

For 2026:
`YTD anomaly (mm) = 2026 cumulative rainfall through current coverage date - mean cumulative rainfall over the same dates in 2005–2025`

Standardized anomaly:
`z = (x - baseline_mean) / baseline_std`

A z-score is a statistical departure metric. Do not call it an official drought/flood probability.

## Delta Sound mapping
The number shown on screen remains authoritative.

`m = clip(|Delta_mm| / 1500, 0, 1)`

- positive Delta → upward glissando
- negative Delta → downward glissando
- magnitude controls duration and pitch excursion
- default timbre = sine

Creative controls are expressive controls only. The numeric Delta and sign are unchanged.

## City layer
The package contains a **city adapter contract**, but the actual 8-city JSON/WAV assets were not present in the files available to this coding pass. Put the team's real `bangladesh_rain_data.json` into `data/` and the existing city audio WAV files into `audio/city/`.

Use `data/city_data_schema.json` as the contract. Do not invent city rainfall numbers.

## Recommended UI wording
Use:
- “BMD reference class”
- “Dryness context”
- “Historical event context”
- “Rainfall signal”

Avoid:
- “This rainfall guarantees flooding.”
- “Drought confirmed.”
- “Landslide probability” unless a dedicated validated model is actually connected.

## Run the demo locally
From the package root, serve it with any simple static server, for example:

`python3 -m http.server 8000`

Then open:

`http://localhost:8000/demo/`

Do not open the module with `file://` when testing ES modules/fetch.

## Existing source assets carried forward
- `data/source_annual_summary.csv`
- `data/source_daily_summary.csv`
- `data/source_passport_v1.json`
- `audio/national/sonifyearth_rain_2005.wav` … `sonifyearth_rain_2026.wav`

## NASA/BMD references
- NASA GPM IMERG climatology: https://gpm.nasa.gov/data/imerg/precipitation-climatology
- BMD mobile reference: https://mobile.bmd.gov.bd/
- NASA Earth Observatory 2007 Chittagong event: https://science.nasa.gov/earth/earth-observatory/floods-in-bangladesh-18488/
- NASA GPM 2019 Cox's Bazar landslide context: https://gpm.nasa.gov/applications/disasters/gpm-data-tracks-landslides-bangladesh
- NASA Disasters 2024 Bangladesh flooding: https://disasters.nasa.gov/what-we-do/disasters/disasters-activations/bangladesh-flooding-august-2024

## Final acceptance checks for Tahmid
- Compare updates instantly when A/B changes.
- Delta number is always visible next to Delta Sound.
- 2026 clearly says YTD/available-to-date.
- BMD class is labelled as reference context.
- Risk text never turns rainfall alone into a certainty/probability.
- Anomaly shows both mm and z when available.
- Data Passport can be opened for every selection.
- Creative mode has Reset to Scientific Default.
- No invented city data.
