/**
 * @file timeline_view.js
 * @description Synchronized Multi-Track Orbital Timeline & Three-State Renderer (Page 4)
 * for SonifyEarth — Silence Isn't Zero.
 *
 * Displays three synchronized tracks over the active time window [tai93Start, tai93End]:
 * - Track 1 (DETECTED): Confirmed lightning flash event ticks & density bars (#FBBF24)
 * - Track 2 (OBSERVED_NO_DETECTION): Active orbital viewtime surveillance passes (#38BDF8)
 * - Track 3 (UNKNOWN): SAA radiation transits, contiguous fatal outages, and the Nov 11 NASA QC gap (#C084FC)
 *
 * Shares the single playback cursor with the global map, listening modes, sound engine,
 * and "Why Did I Hear That?" evidence inspector.
 */

import { tai93ToUtcIso } from './data_adapter.js';

export class SynchronizedTimelineView {
  constructor(canvasEl, options = {}) {
    this.canvas = canvasEl;
    this.ctx = canvasEl ? canvasEl.getContext('2d') : null;
    this.onSeekTai93 = typeof options.onSeekTai93 === 'function' ? options.onSeekTai93 : null;

    this.activeDataPackage = null;
    this.cursorTai93 = 973723942.4;
    this._isScrubbing = false;

    this._bindEvents();
  }

  _bindEvents() {
    if (!this.canvas) return;

    const seekFromMouse = (e) => {
      if (!this.activeDataPackage || !this.onSeekTai93) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const padLeft = 175 * (rect.width / this.canvas.width);
      const usableW = Math.max(10, rect.width - padLeft - 16);
      const ratio = Math.max(0, Math.min(1, (x - padLeft) / usableW));
      const { tai93Start, tai93End } = this.activeDataPackage;
      const targetTai93 = tai93Start + ratio * (tai93End - tai93Start);
      this.onSeekTai93(targetTai93);
    };

    this.canvas.addEventListener('mousedown', (e) => {
      this._isScrubbing = true;
      seekFromMouse(e);
    });

    window.addEventListener('mousemove', (e) => {
      if (!this._isScrubbing) return;
      seekFromMouse(e);
    });

    window.addEventListener('mouseup', () => {
      this._isScrubbing = false;
    });
  }

  updateState({ dataPackage, cursorTai93 }) {
    if (dataPackage) this.activeDataPackage = dataPackage;
    if (typeof cursorTai93 === 'number') this.cursorTai93 = cursorTai93;
    this.render();
  }

  render() {
    if (!this.ctx || !this.canvas || !this.activeDataPackage) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const padLeft = 175;
    const padRight = 18;
    const trackW = w - padLeft - padRight;

    const { tai93Start, tai93End } = this.activeDataPackage;
    const span = Math.max(1, tai93End - tai93Start);
    const timeToX = (tai) => padLeft + ((tai - tai93Start) / span) * trackW;

    // Background
    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, w, h);

    // Track geometries
    const tracks = [
      {
        label: '◆ DETECTED Flashes',
        sub: `${this.activeDataPackage.flashes.length.toLocaleString()} events`,
        y: 14,
        height: 44,
        color: '#fbbf24',
      },
      {
        label: '◎ OBSERVED Surveillance',
        sub: `${this.activeDataPackage.metrics.overlappingGranuleCount} orbits`,
        y: 72,
        height: 40,
        color: '#38bdf8',
      },
      {
        label: '⊘ UNKNOWN (SAA/Fatal/Gap)',
        sub: `${this.activeDataPackage.saaWindows.length} SAA · ${this.activeDataPackage.fatalWindows.length} Fatal · ${this.activeDataPackage.qcGaps.length} Gap`,
        y: 126,
        height: 40,
        color: '#c084fc',
      },
    ];

    // Draw track backgrounds and left labels
    for (const tr of tracks) {
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.fillRect(padLeft, tr.y, trackW, tr.height);
      ctx.strokeRect(padLeft, tr.y, trackW, tr.height);

      ctx.fillStyle = tr.color;
      ctx.font = '700 12px "JetBrains Mono", monospace';
      ctx.fillText(tr.label, 12, tr.y + 18);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '400 11px "JetBrains Mono", monospace';
      ctx.fillText(tr.sub, 12, tr.y + 34);
    }

    // Track 1: Confirmed Lightning Flashes (Histogram bins + ticks)
    const flashes = this.activeDataPackage.flashes;
    if (flashes.length > 0 && !this.activeDataPackage.metrics.isOutOfCoverageRegion) {
      const numBins = 160;
      const bins = new Int32Array(numBins);
      let maxBin = 1;
      for (const f of flashes) {
        const idx = Math.min(
          numBins - 1,
          Math.max(0, Math.floor(((f.tai93_time - tai93Start) / span) * numBins))
        );
        bins[idx] += 1;
        if (bins[idx] > maxBin) maxBin = bins[idx];
      }

      const binW = trackW / numBins;
      ctx.fillStyle = '#fbbf24';
      for (let i = 0; i < numBins; i++) {
        if (bins[i] === 0) continue;
        const barH = Math.max(5, (bins[i] / maxBin) * (tracks[0].height - 8));
        const bx = padLeft + i * binW;
        const by = tracks[0].y + tracks[0].height - barH - 2;
        ctx.fillRect(bx, by, Math.max(2, binW - 0.8), barH);
      }
    }

    // Track 2: Orbital Observation Intervals (OBSERVED_NO_DETECTION & Active Surveillance)
    if (!this.activeDataPackage.metrics.isOutOfCoverageRegion) {
      for (const ow of this.activeDataPackage.orbitalWindows) {
        if (ow.window_type !== 'ORBITAL_GRANULE_PASS') continue;
        const x1 = Math.max(padLeft, timeToX(ow.tai93_start));
        const x2 = Math.min(padLeft + trackW, timeToX(ow.tai93_end));
        if (x2 <= x1) continue;
        ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
        ctx.fillRect(x1, tracks[1].y + 5, Math.max(2, x2 - x1 - 1), tracks[1].height - 10);
        ctx.strokeRect(x1, tracks[1].y + 5, Math.max(2, x2 - x1 - 1), tracks[1].height - 10);
      }
    }

    // Track 3: UNKNOWN Intervals (SAA transits, Contiguous Fatal Outages, Nov 11 QC Gap, or Full Polar Out-of-Coverage)
    const drawUnknownBar = (startTai, endTai, fill, border) => {
      const x1 = Math.max(padLeft, timeToX(startTai));
      const x2 = Math.min(padLeft + trackW, timeToX(endTai));
      const bw = Math.max(3, x2 - x1);
      ctx.fillStyle = fill;
      ctx.strokeStyle = border;
      ctx.fillRect(x1, tracks[2].y + 4, bw, tracks[2].height - 8);
      ctx.strokeRect(x1, tracks[2].y + 4, bw, tracks[2].height - 8);
    };

    if (this.activeDataPackage.metrics.isOutOfCoverageRegion) {
      drawUnknownBar(tai93Start, tai93End, 'rgba(192, 132, 252, 0.45)', '#c084fc');
    } else {
      for (const sw of this.activeDataPackage.saaWindows) {
        drawUnknownBar(sw.tai93_start, sw.tai93_end, 'rgba(192, 132, 252, 0.5)', '#c084fc');
      }
      for (const fw of this.activeDataPackage.fatalWindows) {
        drawUnknownBar(fw.tai93_start, fw.tai93_end, 'rgba(244, 114, 182, 0.65)', '#f472b6');
      }
      for (const qg of this.activeDataPackage.qcGaps) {
        drawUnknownBar(qg.tai93_start, qg.tai93_end, 'rgba(239, 68, 68, 0.6)', '#f87171');
      }
    }

    // Bottom UTC Time Axis Ticks
    ctx.fillStyle = '#94a3b8';
    ctx.font = '400 10.5px "JetBrains Mono", monospace';
    const tickCount = 5;
    for (let i = 0; i <= tickCount; i++) {
      const frac = i / tickCount;
      const tTai = tai93Start + frac * span;
      const tx = padLeft + frac * trackW;
      const utcShort = tai93ToUtcIso(tTai).replace('T', ' ').slice(0, 19) + 'Z';
      ctx.fillStyle = '#475569';
      ctx.fillRect(tx, 168, 1, 6);
      ctx.fillStyle = '#94a3b8';
      const align = i === 0 ? 'left' : i === tickCount ? 'right' : 'center';
      ctx.textAlign = align;
      ctx.fillText(utcShort, tx, 186);
    }
    ctx.textAlign = 'left';

    // Synchronized Playhead Cursor
    const cursorX = Math.max(padLeft, Math.min(padLeft + trackW, timeToX(this.cursorTai93)));
    ctx.save();
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(cursorX, 8);
    ctx.lineTo(cursorX, 170);
    ctx.stroke();

    // Playhead cap triangle
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(cursorX - 6, 8);
    ctx.lineTo(cursorX + 6, 8);
    ctx.lineTo(cursorX, 16);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

