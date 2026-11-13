/**
 * @file hero_globe.js
 * @description Interactive 3D Earth-and-ISS hero scene for SonifyEarth.
 *
 * Replaces the old 2D "orbit track schematic" with a real 3D scene:
 *  - dotted Earth globe (land mass dots, graticule, atmosphere limb)
 *  - 51.6° inclined orbit ring with a 3D-modelled ISS (truss, modules, solar arrays)
 *  - the LIS camera frustum + ~550 km swath footprint painted on the surface
 *  - ◆ DETECTED flashes (gold), ◎ OBSERVED swath (cyan), ⊘ UNKNOWN zones (violet:
 *    South Atlantic Anomaly + unviewed polar belts beyond ±54°)
 *
 * Pure Canvas 2D with a hand-rolled 3D pipeline — zero dependencies, works offline.
 * Drag to rotate. Honors reduced motion, pause, and the existing state selector.
 *
 * Public API (used by app.js):
 *   new HeroOrbitGlobe(canvas, { getState })
 *   .syncMotion()  — draw once and (re)start the animation loop if motion is allowed
 *   .renderOnce()  — draw a single frame
 */

const DEG = Math.PI / 180;

const COLORS = {
  detected: '#fbbf24',
  observed: '#38bdf8',
  unknown: '#c084fc',
  text: '#e6edf5',
  textMuted: '#8b97a8',
  border: '#1e2530',
  accent: '#2563eb',
};

// Coarse continental outlines [lon, lat] — used only to classify land dots
const LAND = [
  [[-168,65],[-140,70],[-125,70],[-95,72],[-75,62],[-55,50],[-67,44],[-80,25],[-88,18],[-80,8],[-92,15],[-105,20],[-117,32],[-124,48],[-140,60],[-168,65]],
  [[-80,10],[-62,10],[-50,0],[-35,-6],[-38,-18],[-48,-28],[-58,-38],[-68,-54],[-75,-48],[-71,-30],[-70,-18],[-78,-5],[-80,10]],
  [[-10,36],[-9,43],[-2,48],[5,52],[10,58],[20,70],[40,68],[55,60],[45,45],[28,41],[22,37],[15,38],[5,43],[-5,36],[-10,36]],
  [[-17,15],[-6,35],[10,37],[32,31],[43,12],[51,11],[40,-10],[35,-25],[20,-35],[16,-28],[12,-6],[9,4],[-8,5],[-17,15]],
  [[28,41],[45,45],[55,60],[90,72],[140,70],[170,65],[142,50],[130,35],[122,23],[108,18],[103,2],[96,16],[88,22],[80,8],[72,20],[60,25],[48,30],[35,33],[28,41]],
  [[114,-22],[122,-14],[136,-12],[142,-11],[153,-26],[148,-38],[138,-35],[129,-32],[115,-34],[114,-22]],
  [[-52,60],[-44,60],[-22,70],[-20,80],[-55,81],[-60,75],[-52,60]],
  // Indonesia / Maritime Continent, Japan, UK, Madagascar, New Zealand (small blobs)
  [[95,5],[106,-6],[116,-8],[120,-4],[110,2],[98,6],[95,5]],
  [[130,32],[141,36],[142,44],[140,36],[130,32]],
  [[-6,50],[1,52],[-3,58],[-6,50]],
  [[44,-16],[50,-14],[47,-25],[44,-16]],
  [[167,-46],[174,-41],[178,-38],[170,-44],[167,-46]],
];

function pointInPoly(lon, lat, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function buildLandDots() {
  const dots = [];
  for (let lat = -84; lat <= 84; lat += 2.6) {
    const step = 2.6 / Math.max(0.2, Math.cos(lat * DEG));
    for (let lon = -180; lon < 180; lon += step) {
      if (LAND.some((p) => pointInPoly(lon, lat, p))) dots.push([lat, lon]);
    }
  }
  return dots;
}

// Deterministic convective-region flashes (Amazon, Congo, Maritime, Bay of Bengal, N. America…)
function buildFlashes() {
  const clusters = [
    [-5, -65, 14, 9], [0, 22, 14, 10], [4, 108, 14, 8], [23, 90, 11, 6],
    [-18, -50, 9, 4], [28, -88, 9, 4], [-28, 28, 8, 3], [8, -75, 7, 3],
    [-8, 140, 7, 3], [35, 110, 6, 2],
  ];
  let seed = 20231109;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const out = [];
  for (const [clat, clon, spread, n] of clusters) {
    for (let i = 0; i < n * 2; i++) {
      out.push([clat + (rnd() - 0.5) * spread, clon + (rnd() - 0.5) * spread * 1.4]);
    }
  }
  return out;
}

const SAA = { lat: -27, lon: -48, a: 30, b: 16 };

export class HeroOrbitGlobe {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.getState = typeof options.getState === 'function' ? options.getState : () => ({});

    this.landDots = buildLandDots();
    this.flashes = buildFlashes();

    this.inclination = 51.6 * DEG;
    this.u = 0.9; // satellite orbital phase (rad)
    this.theta = 0.0; // Earth rotation (rad)
    this.yaw = 0.35; // camera yaw (user drag)
    this.elev = 22 * DEG; // camera elevation
    this.cssW = 580;
    this.cssH = 420;
    this.dpr = 1;
    this.trail = [];

    this._raf = null;
    this._last = 0;
    this._drag = null;
    this._hover = false;

    this._resize();
    this._bind();
  }

  /* ----------------------------- lifecycle ----------------------------- */

  _bind() {
    const c = this.canvas;
    c.style.touchAction = 'none';
    c.style.cursor = 'grab';
    c.setAttribute('tabindex', '0');

    c.addEventListener('pointerdown', (e) => {
      this._drag = { x: e.clientX, y: e.clientY };
      c.setPointerCapture?.(e.pointerId);
      c.style.cursor = 'grabbing';
    });
    c.addEventListener('pointermove', (e) => {
      if (!this._drag) return;
      const dx = e.clientX - this._drag.x;
      const dy = e.clientY - this._drag.y;
      this._drag = { x: e.clientX, y: e.clientY };
      this.yaw += dx * 0.008;
      this.elev = Math.max(-55 * DEG, Math.min(70 * DEG, this.elev + dy * 0.006));
      if (!this._loopRunning()) this.renderOnce();
    });
    const end = () => {
      this._drag = null;
      c.style.cursor = 'grab';
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('keydown', (e) => {
      const k = e.key;
      if (k === 'ArrowLeft') this.yaw -= 0.12;
      else if (k === 'ArrowRight') this.yaw += 0.12;
      else if (k === 'ArrowUp') this.elev = Math.min(70 * DEG, this.elev + 0.08);
      else if (k === 'ArrowDown') this.elev = Math.max(-55 * DEG, this.elev - 0.08);
      else return;
      e.preventDefault();
      if (!this._loopRunning()) this.renderOnce();
    });

    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(() => {
        this._resize();
        this.renderOnce();
      });
      this._ro.observe(c);
    }
    // Router fires this when a page becomes visible again
    window.addEventListener('sonify:route', () => this.syncMotion());
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.syncMotion();
    });
  }

  _resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.cssW = rect.width;
    this.cssH = rect.height;
    this.canvas.width = Math.round(rect.width * this.dpr);
    this.canvas.height = Math.round(rect.height * this.dpr);
  }

  _motionAllowed() {
    const s = this.getState();
    return !(s.reducedMotion || s.reducedMotionForced || s.paused) && !this._drag;
  }

  _loopRunning() {
    return this._raf !== null;
  }

  /** Draw once, and (re)start the loop if motion is allowed and the canvas is visible. */
  syncMotion() {
    this._resize();
    this.renderOnce();
    const s = this.getState();
    const allowed = !(s.reducedMotion || s.reducedMotionForced || s.paused);
    if (allowed && !this._loopRunning() && this.canvas.offsetParent !== null && !document.hidden) {
      this._last = performance.now();
      this._raf = requestAnimationFrame((t) => this._tick(t));
    }
  }

  _tick(now) {
    this._raf = null;
    if (this.canvas.offsetParent === null || document.hidden) return; // resumes on sonify:route
    const s = this.getState();
    if (s.reducedMotion || s.reducedMotionForced || s.paused) {
      this.renderOnce();
      return;
    }
    const dt = Math.min(0.05, Math.max(0.001, (now - this._last) / 1000));
    this._last = now;
    if (!this._drag) {
      this.u = (this.u + dt * 0.55) % (Math.PI * 2);
      this.theta = (this.theta + dt * 0.06) % (Math.PI * 2);
    }
    this.renderOnce();
    this._raf = requestAnimationFrame((t) => this._tick(t));
  }

  /* ------------------------------ 3D math ------------------------------ */

  /** inertial (X,Y,Z; Z north) → screen {x,y,d} with d>0 facing the viewer */
  _view(x, y, z) {
    const ca = Math.cos(this.yaw), sa = Math.sin(this.yaw);
    const x1 = x * ca - y * sa;
    const y1 = x * sa + y * ca;
    const ce = Math.cos(this.elev), se = Math.sin(this.elev);
    return {
      x: this.cx + y1 * this.R,
      y: this.cy - (z * ce - x1 * se) * this.R,
      d: x1 * ce + z * se,
    };
  }

  /** Earth-fixed (lat,lon deg) → inertial unit vector */
  _surface(lat, lon) {
    const la = lat * DEG;
    const lo = lon * DEG + this.theta;
    return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
  }

  _orbitPos(u, r = 1) {
    const ci = Math.cos(this.inclination), si = Math.sin(this.inclination);
    return [Math.cos(u) * r, Math.sin(u) * ci * r, Math.sin(u) * si * r];
  }

  _orbitVel(u) {
    const ci = Math.cos(this.inclination), si = Math.sin(this.inclination);
    return [-Math.sin(u), Math.cos(u) * ci, Math.cos(u) * si];
  }

  /** Ground point (lat/lon, deg) under the satellite */
  _subPoint(u) {
    const [x, y, z] = this._orbitPos(u);
    return {
      lat: Math.asin(z) / DEG,
      lon: ((Math.atan2(y, x) - this.theta) / DEG + 540) % 360 - 180,
    };
  }

  /* ------------------------------ drawing ------------------------------ */

  renderOnce() {
    const ctx = this.ctx;
    if (!ctx) return;
    const W = this.cssW, H = this.cssH;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const s = this.getState();
    const hl = s.highlight || 'ALL';
    this.cx = W * 0.5;
    this.cy = H * 0.5;
    this.R = Math.min(W * 0.3, H * 0.3);
    const orbitR = 1.26;

    this._drawBackdrop(ctx, W, H);

    // --- satellite state ---
    const satPos = this._orbitPos(this.u, orbitR);
    const satV = this._view(...satPos);
    const satBehind = satV.d < 0 && Math.hypot(satV.x - this.cx, satV.y - this.cy) < this.R;

    // ground-track trail (Earth-fixed so it traces the familiar sinusoid on the globe)
    this._updateTrail();

    // 1. back half of orbit ring (+ satellite if hidden behind the Earth)
    this._drawOrbitRing(ctx, orbitR, false);
    if (satBehind) this._drawSatellite(ctx, satPos, true);

    // 2. Earth
    this._drawGlobe(ctx, hl);
    this._drawFlashesAndZones(ctx, hl);
    this._drawTrail(ctx);
    const swath = this._drawSwath(ctx, hl);

    // 3. front half of orbit ring + frustum + satellite
    this._drawOrbitRing(ctx, orbitR, true);
    if (!satBehind) {
      this._drawFrustum(ctx, satPos, swath, hl);
      this._drawSatellite(ctx, satPos, false);
    }

    this._drawHud(ctx, W, H, hl, satV, satBehind);
  }

  _drawBackdrop(ctx, W, H) {
    ctx.fillStyle = '#080a0d';
    ctx.fillRect(0, 0, W, H);
    // deterministic starfield
    for (let i = 0; i < 70; i++) {
      const sx = (i * 137.508) % W;
      const sy = (i * 71.37 + (i * i) % 53) % H;
      ctx.fillStyle = `rgba(230,237,245,${i % 5 === 0 ? 0.55 : 0.25})`;
      ctx.fillRect(sx, sy, i % 7 === 0 ? 1.6 : 1, i % 7 === 0 ? 1.6 : 1);
    }
  }

  _drawGlobe(ctx, hl) {
    const { cx, cy, R } = this;

    // atmosphere
    const atm = ctx.createRadialGradient(cx, cy, R * 0.96, cx, cy, R * 1.16);
    atm.addColorStop(0, 'rgba(37,99,235,0.30)');
    atm.addColorStop(1, 'rgba(37,99,235,0)');
    ctx.fillStyle = atm;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.16, 0, Math.PI * 2);
    ctx.fill();

    // sphere body
    const body = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
    body.addColorStop(0, '#16202e');
    body.addColorStop(0.7, '#0c121a');
    body.addColorStop(1, '#07090d');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();

    // graticule
    ctx.lineWidth = 0.7;
    ctx.strokeStyle = 'rgba(120,140,165,0.14)';
    for (let lon = -180; lon < 180; lon += 30) this._strokeSurfaceLine(ctx, (t) => [t, lon], -90, 90, 4);
    for (let lat = -60; lat <= 60; lat += 30) this._strokeSurfaceLine(ctx, (t) => [lat, t], -180, 180, 5);

    // land dots
    const dim = hl === 'UNKNOWN' ? 0.5 : 1;
    for (const [lat, lon] of this.landDots) {
      const [x, y, z] = this._surface(lat, lon);
      const p = this._view(x, y, z);
      if (p.d <= 0.02) continue;
      const polar = Math.abs(lat) > 54;
      const inSaa = this._inSaa(lat, lon);
      const unk = polar || inSaa;
      const a = (0.25 + 0.6 * p.d) * dim;
      ctx.fillStyle = unk && hl !== 'DETECTED' && hl !== 'OBSERVED_NO_DETECTION'
        ? `rgba(192,132,252,${a})`
        : `rgba(158,176,200,${a * 0.9})`;
      const r = 0.9 + p.d * 0.7;
      ctx.fillRect(p.x - r / 2, p.y - r / 2, r, r);
    }

    // ±54° coverage boundary (dashed violet)
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.1;
    ctx.strokeStyle = hl === 'UNKNOWN' ? 'rgba(192,132,252,0.95)' : 'rgba(192,132,252,0.5)';
    this._strokeSurfaceLine(ctx, (t) => [54, t], -180, 180, 4);
    this._strokeSurfaceLine(ctx, (t) => [-54, t], -180, 180, 4);
    ctx.restore();

    // limb
    ctx.strokeStyle = 'rgba(56,130,246,0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();
  }

  /** stroke a line defined on the sphere, only the visible hemisphere */
  _strokeSurfaceLine(ctx, fn, t0, t1, stepDeg) {
    ctx.beginPath();
    let pen = false;
    for (let t = t0; t <= t1; t += stepDeg) {
      const [lat, lon] = fn(t);
      const p = this._view(...this._surface(lat, lon));
      if (p.d <= 0) { pen = false; continue; }
      if (!pen) { ctx.moveTo(p.x, p.y); pen = true; } else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  _inSaa(lat, lon) {
    let dLon = lon - SAA.lon;
    if (dLon > 180) dLon -= 360;
    if (dLon < -180) dLon += 360;
    const dLat = lat - SAA.lat;
    return (dLon * dLon) / (SAA.a * SAA.a) + (dLat * dLat) / (SAA.b * SAA.b) <= 1;
  }

  _drawFlashesAndZones(ctx, hl) {
    // South Atlantic Anomaly (⊘ UNKNOWN)
    const alpha = hl === 'UNKNOWN' ? 0.34 : hl === 'ALL' ? 0.18 : 0.07;
    ctx.beginPath();
    let pen = false;
    for (let k = 0; k <= 48; k++) {
      const a = (k / 48) * Math.PI * 2;
      const p = this._view(...this._surface(SAA.lat + Math.sin(a) * SAA.b, SAA.lon + Math.cos(a) * SAA.a));
      if (p.d <= 0) { pen = false; continue; }
      if (!pen) { ctx.moveTo(p.x, p.y); pen = true; } else ctx.lineTo(p.x, p.y);
    }
    ctx.fillStyle = `rgba(192,132,252,${alpha})`;
    ctx.fill();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = hl === 'UNKNOWN' ? '#c084fc' : 'rgba(192,132,252,0.6)';
    ctx.lineWidth = hl === 'UNKNOWN' ? 1.8 : 1.1;
    ctx.stroke();
    ctx.setLineDash([]);

    // ◆ confirmed flashes
    const sp = this._subPoint(this.u);
    const sub = this._view(...this._surface(sp.lat, sp.lon));
    const scale = hl === 'DETECTED' ? 1.4 : 1;
    const base = hl === 'OBSERVED_NO_DETECTION' || hl === 'UNKNOWN' ? 0.35 : 0.8;
    for (const [lat, lon] of this.flashes) {
      const p = this._view(...this._surface(lat, lon));
      if (p.d <= 0.03) continue;
      const near = this._angDist(lat, lon, sp.lat, sp.lon) < 9;
      const r = (near ? 3.6 : 2.4) * scale * (0.6 + 0.5 * p.d);
      ctx.fillStyle = near ? '#ffd35a' : `rgba(251,191,36,${base * (0.5 + 0.5 * p.d)})`;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - r);
      ctx.lineTo(p.x + r, p.y);
      ctx.lineTo(p.x, p.y + r);
      ctx.lineTo(p.x - r, p.y);
      ctx.closePath();
      ctx.fill();
      if (near) {
        ctx.strokeStyle = 'rgba(251,191,36,0.55)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    this._subScreen = sub;
  }

  _angDist(lat1, lon1, lat2, lon2) {
    const a = lat1 * DEG, b = lat2 * DEG;
    const dl = (lon1 - lon2) * DEG;
    const c = Math.sin(a) * Math.sin(b) + Math.cos(a) * Math.cos(b) * Math.cos(dl);
    return Math.acos(Math.max(-1, Math.min(1, c))) / DEG;
  }

  _updateTrail() {
    const pts = [];
    for (let k = 0; k <= 90; k++) {
      pts.push(this._subPoint(this.u - k * 0.028));
    }
    this.trail = pts;
  }

  _drawTrail(ctx) {
    ctx.lineWidth = 1.6;
    for (let k = 0; k < this.trail.length - 1; k++) {
      const a = this.trail[k], b = this.trail[k + 1];
      if (Math.abs(a.lon - b.lon) > 180) continue;
      const pa = this._view(...this._surface(a.lat, a.lon));
      const pb = this._view(...this._surface(b.lat, b.lon));
      if (pa.d <= 0 || pb.d <= 0) continue;
      ctx.strokeStyle = `rgba(56,189,248,${0.8 * (1 - k / this.trail.length)})`;
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    }
  }

  /** ~550 km swath footprint on the surface (angular radius exaggerated for legibility) */
  _drawSwath(ctx, hl) {
    const c = this._orbitPos(this.u, 1);
    const f = this._orbitVel(this.u);
    const e2 = [c[1] * f[2] - c[2] * f[1], c[2] * f[0] - c[0] * f[2], c[0] * f[1] - c[1] * f[0]];
    const rho = 0.13;
    const ring = [];
    for (let k = 0; k < 48; k++) {
      const a = (k / 48) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      const v = [0, 1, 2].map((i) => c[i] * Math.cos(rho) + Math.sin(rho) * (f[i] * ca + e2[i] * sa));
      ring.push(this._view(v[0] * 1.004, v[1] * 1.004, v[2] * 1.004));
    }
    const sp = this._subPoint(this.u);
    const unknown = this._inSaa(sp.lat, sp.lon);
    const col = unknown ? '192,132,252' : '56,189,248';
    const alpha = hl === 'OBSERVED_NO_DETECTION' ? 0.34 : hl === 'ALL' ? 0.22 : 0.1;

    ctx.beginPath();
    let pen = false;
    for (const p of ring) {
      if (p.d <= 0) continue;
      if (!pen) { ctx.moveTo(p.x, p.y); pen = true; } else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.fillStyle = `rgba(${col},${alpha})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(${col},0.95)`;
    ctx.lineWidth = hl === 'OBSERVED_NO_DETECTION' ? 2 : 1.4;
    ctx.stroke();
    return { ring, col };
  }

  _drawOrbitRing(ctx, r, front) {
    ctx.save();
    ctx.lineWidth = front ? 1.6 : 1;
    ctx.strokeStyle = front ? 'rgba(96,165,250,0.85)' : 'rgba(96,165,250,0.28)';
    ctx.beginPath();
    let pen = false;
    for (let k = 0; k <= 120; k++) {
      const p = this._view(...this._orbitPos((k / 120) * Math.PI * 2, r));
      const behindGlobe = p.d < 0 && Math.hypot(p.x - this.cx, p.y - this.cy) < this.R;
      const isFront = !behindGlobe;
      if (isFront !== front) { pen = false; continue; }
      if (!pen) { ctx.moveTo(p.x, p.y); pen = true; } else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  /** Camera frustum: apex at the ISS, base = swath footprint */
  _drawFrustum(ctx, satPos, swath, hl) {
    const apex = this._view(...satPos);
    const faint = hl === 'OBSERVED_NO_DETECTION' ? 0.7 : 0.38;
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(${swath.col},${faint})`;
    for (let k = 0; k < swath.ring.length; k += 12) {
      const p = swath.ring[k];
      if (p.d <= 0) continue;
      ctx.beginPath();
      ctx.moveTo(apex.x, apex.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* --------------------------- ISS 3D model --------------------------- */

  _drawSatellite(ctx, satPos, behind) {
    const pos = satPos;
    const r = Math.hypot(...pos);
    const n = pos.map((v) => v / r); // up (radial)
    const f = this._orbitVel(this.u); // forward
    const s = [n[1] * f[2] - n[2] * f[1], n[2] * f[0] - n[0] * f[2], n[0] * f[1] - n[1] * f[0]]; // side
    const U = 0.19; // model unit in world space

    const boxes = [
      // [cx,cy,cz (f,s,n), hx,hy,hz, colour]
      [0, 0, 0, 0.55, 0.11, 0.11, '#d8dee8'], // core modules (forward axis)
      [0.15, 0, 0.0, 0.2, 0.17, 0.17, '#c5cdd9'], // node
      [-0.5, 0, 0, 0.22, 0.14, 0.14, '#b4bdcb'], // aft module
      [0, 0, 0.0, 0.05, 1.25, 0.05, '#9aa5b5'], // integrated truss (side axis)
      [0, 0.75, 0.22, 0.1, 0.12, 0.28, '#e8edf4'], // radiator +
      [0, -0.75, 0.22, 0.1, 0.12, 0.28, '#e8edf4'], // radiator −
    ];
    // four solar-array wings (two per side), thin panels in the f-n plane
    for (const sd of [-1, 1]) {
      for (const fo of [-0.62, 0.62]) {
        boxes.push([fo, sd * 1.12, 0, 0.5, 0.018, 0.2, '#1d3f9e']);
        boxes.push([fo, sd * 1.12, 0.0, 0.5, 0.019, 0.02, '#fbbf24']);
      }
    }

    const toWorld = (lf, ls, ln) => {
      const x = pos[0] + U * (lf * f[0] + ls * s[0] + ln * n[0]);
      const y = pos[1] + U * (lf * f[1] + ls * s[1] + ln * n[1]);
      const z = pos[2] + U * (lf * f[2] + ls * s[2] + ln * n[2]);
      return this._view(x, y, z);
    };

    const corners = [
      [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
      [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
    ];
    const faces = [
      [0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [0, 3, 7, 4],
    ];

    const out = [];
    for (const [cx, cy, cz, hx, hy, hz, col] of boxes) {
      const vs = corners.map(([a, b, c]) => toWorld(cx + a * hx, cy + b * hy, cz + c * hz));
      for (const fc of faces) {
        const p = fc.map((i) => vs[i]);
        // signed area → back-face cull
        const area =
          (p[1].x - p[0].x) * (p[2].y - p[0].y) - (p[1].y - p[0].y) * (p[2].x - p[0].x);
        const depth = (p[0].d + p[1].d + p[2].d + p[3].d) / 4;
        out.push({ p, area: Math.abs(area), depth, col, face: fc });
      }
    }
    out.sort((a, b) => a.depth - b.depth);

    ctx.save();
    ctx.globalAlpha = behind ? 0.0 : 1;
    if (!behind) {
      for (const q of out) {
        if (q.area < 0.15) continue;
        ctx.beginPath();
        ctx.moveTo(q.p[0].x, q.p[0].y);
        for (let i = 1; i < 4; i++) ctx.lineTo(q.p[i].x, q.p[i].y);
        ctx.closePath();
        const shade = 0.62 + 0.38 * Math.max(0, Math.min(1, (q.depth + 1) / 2));
        ctx.fillStyle = this._shade(q.col, shade);
        ctx.fill();
        ctx.strokeStyle = 'rgba(8,10,13,0.55)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
    ctx.restore();

    // marker + label
    const c = this._view(...pos);
    if (!behind) {
      ctx.strokeStyle = 'rgba(37,99,235,0.9)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 34, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = '600 11px "Geist Mono", "JetBrains Mono", ui-monospace, monospace';
      ctx.fillStyle = COLORS.text;
      ctx.textAlign = 'left';
      const lx = c.x + 40 > this.cssW - 80 ? c.x - 112 : c.x + 40;
      ctx.fillText('ISS · LIS', lx, c.y + 3);
    }
  }

  _shade(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.round(((n >> 16) & 255) * k);
    const g = Math.round(((n >> 8) & 255) * k);
    const b = Math.round((n & 255) * k);
    return `rgb(${r},${g},${b})`;
  }

  /* -------------------------------- HUD -------------------------------- */

  _drawHud(ctx, W, H, hl, satV, satBehind) {
    const sp = this._subPoint(this.u);
    const inSaa = this._inSaa(sp.lat, sp.lon);
    const nearFlash = this.flashes.some(([la, lo]) => this._angDist(la, lo, sp.lat, sp.lon) < 7);
    const st = inSaa ? '⊘ UNKNOWN (SAA)' : nearFlash ? '◆ DETECTED' : '◎ OBSERVED_NO_DETECTION';
    const stCol = inSaa ? COLORS.unknown : nearFlash ? COLORS.detected : COLORS.observed;

    ctx.font = '500 11px "Geist Mono", "JetBrains Mono", ui-monospace, monospace';
    const narrow = W < 460;
    ctx.textAlign = 'right';
    const lat = `${Math.abs(sp.lat).toFixed(1)}°${sp.lat >= 0 ? 'N' : 'S'}`;
    const lon = `${Math.abs(sp.lon).toFixed(1)}°${sp.lon >= 0 ? 'E' : 'W'}`;
    if (!narrow) {
      ctx.fillStyle = COLORS.textMuted;
      ctx.fillText(`Nadir ${lat} ${lon}`, W - 14, H - 32);
    }
    ctx.fillStyle = stCol;
    ctx.fillText(st, W - 14, H - 16);

    ctx.textAlign = 'left';
    const rows = [
      [COLORS.detected, '◆ DETECTED'],
      [COLORS.observed, '◎ OBSERVED_NO_DETECTION'],
      [COLORS.unknown, '⊘ UNKNOWN · SAA, >±54°'],
    ];
    rows.forEach(([col, txt], i) => {
      ctx.fillStyle = col;
      ctx.fillText(txt, 14, H - 46 + i * 15);
    });
    ctx.textAlign = 'left';
  }
}
