# 05_SCIENTIFIC_VALIDATION

This directory contains automated scientific validation gates and tests to ensure total data veracity and consistency.

## Structure
- `time_validation/`: Granule start/stop time verification, gap detection, and timeline continuity checks across the 7-day mission period.
- `granule_matching/`: 1-to-1 temporal and spatial alignment checks between Science V2.2 and Backgrounds V2.2 products.
- `three_state_validation/`: Rigorous validation of the 3-state detection logic:
  - State 1: Active Lightning Detected (Valid flash/group events).
  - State 2: Clear / Quiet Earth (Instrument operational, zero lightning above threshold).
  - State 3: Blind / Anomaly / Dropout (Instrument degraded, SAA radiation hit, or orbital night calibration).

