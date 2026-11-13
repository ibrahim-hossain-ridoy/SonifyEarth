/**
 * @file inspector_view.js
 * @description "Why Did I Hear That?" Scientific Evidence Inspector (Page 7)
 * for SonifyEarth — Silence Isn't Zero.
 *
 * Implements:
 * - Everyday-language explanation first
 * - Key summary tiles for immediate comprehension
 * - Expandable <details> technical metadata table with full NASA file, granule,
 *   TAI93, UTC, quality flag hex bitmask, SAA, and DOI provenance
 * - 6 one-click verified NASA anchor presets from 05_SCIENTIFIC_VALIDATION/REAL_STATE_EXAMPLES.json
 */

const HUMAN_READABLE_FIELD_LABELS = {
  stateLabel: 'Scientific Observation State',
  reasonCode: 'Classification Reason Code',
  flashId: 'NASA Flash Identifier (flash_id)',
  flashAddress: 'NetCDF Flash Index (flash_address)',
  granuleId: 'NASA Orbit / Granule Identifier',
  utcTimestamp: 'Validated UTC Timestamp (TAI93 − 10.0s)',
  rawTai93Timestamp: 'Original Raw TAI93 Timestamp',
  tai93ToUtcFormula: 'Time Conversion Formula',
  coordinates: 'Geodetic Coordinates (WGS84)',
  gridCellId: '0.5° × 0.5° Grid Cell ID',
  gridCellCenter: 'Grid-Cell Centre Coordinates',
  matchedViewtimeIndex: 'Matched Viewtime Record Index',
  viewtimeRecordIndex: 'Viewtime Record Index',
  observationIntervalUtc: 'Observation Interval (Validated UTC)',
  observationIntervalTai93: 'Observation Interval (Raw TAI93)',
  effectiveObservationDuration: 'Effective Observation Duration (viewtime_effective_obs)',
  flashDurationSeconds: 'Optical Flash Duration (delta_time)',
  opticalRadiance: 'Calibrated Optical Radiance (Metadata Only)',
  footprintAreaKm2: 'Illuminated Cloud-Top Footprint Area',
  childGroupCount: 'Child Optical Group Count',
  grandchildEventCount: 'Grandchild Pixel Event Count',
  validFlashCount: 'Valid Confirmed Flash Count in Cell/Window',
  qualityFlagsHex: 'Flash Quality Alert Flag (Bitmask Decoded)',
  qualityAndAlertInfo: 'Viewtime Quality Alert Flag (Bitmask Decoded)',
  glintIndex: 'Solar Glint Filter Index',
  saaStatus: 'South Atlantic Anomaly (SAA) Status',
  saaOverlapStatus: 'SAA Overlap Status',
  soundCueTriggered: 'Approved Web Audio Sound Cue',
  intervalOrTimestampUtc: 'Affected Interval / Timestamp (UTC)',
  intervalOrTimestampTai93: 'Affected Interval / Timestamp (Raw TAI93)',
  missingInvalidOrInsufficientEvidence: 'Missing, Invalid, or Insufficient Evidence Details',
  whatCannotBeEstablished: 'What Cannot Be Scientifically Established',
  sourceReferences: 'Source NASA File & Anomaly References',
  sourceScienceFile: 'Source NASA Science V2.2 File',
  sourceBackgroundsFile: 'Source NASA Backgrounds V2.2 File',
  datasetCollectionVersion: 'Dataset Collection & QC Version',
  scienceDoi: 'NASA Science V2.2 DOI',
  backgroundsDoi: 'NASA Backgrounds V2.2 DOI',
};

export class EvidenceInspectorView {
  constructor(options = {}) {
    this.dataAdapter = options.dataAdapter || null;
    this.onAuditionRecord = typeof options.onAuditionRecord === 'function' ? options.onAuditionRecord : null;
    this.onPresetSelected = typeof options.onPresetSelected === 'function' ? options.onPresetSelected : null;

    this.currentEvidence = null;
    this.presetsContainer = document.getElementById('inspector-presets-container');
    this.stateBadgeEl = document.getElementById('inspector-state-badge');
    this.reasonBadgeEl = document.getElementById('inspector-reason-badge');
    this.titleEl = document.getElementById('inspector-record-title');
    this.everydayEl = document.getElementById('inspector-everyday-explanation');
    this.cueExplanationEl = document.getElementById('inspector-cue-explanation');
    this.quickGridEl = document.getElementById('inspector-quick-grid');
    this.metadataTbodyEl = document.getElementById('inspector-metadata-tbody');
    this.auditionBtn = document.getElementById('inspector-audition-current-btn');

    if (this.auditionBtn) {
      this.auditionBtn.addEventListener('click', () => {
        if (this.currentEvidence && this.onAuditionRecord) {
          this.onAuditionRecord(this.currentEvidence);
        }
      });
    }
  }

  renderPresets(examples = []) {
    if (!this.presetsContainer) return;
    this.presetsContainer.innerHTML = '';

    const presetTitles = [
      '1. DETECTED: Confirmed Amazon Flash (Orbit 225212)',
      '2. OBSERVED_NO_DETECTION: Quiet South Pacific Cell (49.4s)',
      '3. UNKNOWN (OUTSIDE_OBSERVATION_COVERAGE): Reykjavik (+64.15°N)',
      '4. UNKNOWN (MISSING_SOURCE_DATA): Nov 11 185.8-min NASA QC Gap',
      '5. UNKNOWN (FATAL_QUALITY_FLAG): Nov 16 4,818s Fatal Outage',
      '6. UNKNOWN (INSUFFICIENT_EVIDENCE_SAA_RADIATION): SAA Transit',
    ];

    examples.forEach((ex, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `preset-btn ${idx === 0 ? 'active' : ''}`;
      btn.dataset.presetIndex = String(idx);

      const badgeSymbol =
        ex.state === 'DETECTED' ? '◆' : ex.state === 'OBSERVED_NO_DETECTION' ? '◎' : '⊘';
      const reason = ex.reason_code || (ex.state === 'DETECTED' ? 'CONFIRMED_LIGHTNING_FLASH' : 'ACTIVE_OPTICAL_SURVEILLANCE_ZERO_FLASHES');

      btn.innerHTML = `
        <span class="mono" style="font-size: 0.75rem; color: var(--accent-earth-blue); font-weight: 700;">
          ${badgeSymbol} ${ex.state} · ${reason}
        </span>
        <span style="font-size: 0.85rem; font-weight: 600;">
          ${presetTitles[idx] || `${ex.state} Example ${idx + 1}`}
        </span>
      `;

      btn.addEventListener('click', () => {
        this.presetsContainer.querySelectorAll('.preset-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.inspectItem(ex);
        if (this.onPresetSelected) {
          this.onPresetSelected(ex, idx);
        }
      });

      this.presetsContainer.appendChild(btn);
    });
  }

  inspectItem(rawItem) {
    if (!this.dataAdapter || !rawItem) return null;
    const ev = this.dataAdapter.buildEvidenceRecord(rawItem);
    if (!ev) return null;
    this.currentEvidence = ev;

    // 1. State Badge & Reason Code
    if (this.stateBadgeEl) {
      this.stateBadgeEl.className =
        ev.state === 'DETECTED'
          ? 'state-badge state-badge-detected'
          : ev.state === 'OBSERVED_NO_DETECTION'
          ? 'state-badge state-badge-observed'
          : 'state-badge state-badge-unknown';
      const sym = ev.state === 'DETECTED' ? '◆' : ev.state === 'OBSERVED_NO_DETECTION' ? '◎' : '⊘';
      this.stateBadgeEl.textContent = `${sym} ${ev.state}`;
    }

    if (this.reasonBadgeEl) {
      this.reasonBadgeEl.textContent = ev.reasonCode;
    }

    if (this.titleEl) {
      this.titleEl.textContent = ev.title;
    }

    // 2. Everyday-language explanation first
    if (this.everydayEl) {
      this.everydayEl.textContent = ev.everydayExplanation;
    }

    if (this.cueExplanationEl) {
      this.cueExplanationEl.textContent =
        ev.pulseExplanation || ev.textureExplanation || ev.unknownCueExplanation || '';
    }

    // 3. Quick Summary Grid
    if (this.quickGridEl) {
      const m = ev.metadata || {};
      const cards = [
        {
          label: 'Approved Sound Cue',
          value: ev.soundCueLabel || ev.soundCue,
        },
        {
          label: 'Validated UTC Timestamp',
          value: m.utcTimestamp || m.observationIntervalUtc || m.intervalOrTimestampUtc || 'Verified',
        },
        {
          label: 'Original TAI93 Time',
          value: m.rawTai93Timestamp || m.observationIntervalTai93 || m.intervalOrTimestampTai93 || 'Verified',
        },
        {
          label: 'NASA Source Provenance',
          value: m.sourceScienceFile || m.sourceReferences || 'ISS_LIS_SC_V2.2',
        },
      ];

      this.quickGridEl.innerHTML = cards
        .map(
          (c) => `
        <div class="metric-card" style="padding: var(--space-3);">
          <p class="metric-card-header">${c.label}</p>
          <p class="mono" style="margin: 0; font-size: 0.83rem; font-weight: 600; word-break: break-word;">${c.value}</p>
        </div>
      `
        )
        .join('');
    }

    // 4. Expandable Technical Metadata Table
    if (this.metadataTbodyEl) {
      const entries = Object.entries(ev.metadata || {});
      this.metadataTbodyEl.innerHTML = entries
        .map(([key, val]) => {
          const label = HUMAN_READABLE_FIELD_LABELS[key] || key;
          return `
            <tr>
              <th scope="row">${label}</th>
              <td class="mono">${val ?? 'N/A'}</td>
            </tr>
          `;
        })
        .join('');
    }

    return ev;
  }
}

