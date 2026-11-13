/**
 * @file map_view.js
 * @description Interactive Global ISS LIS Map & Orthographic Globe Renderer (Page 3)
 * for SonifyEarth — Silence Isn't Zero.
 *
 * Uses the actual GeoJSON files from /06_PROCESSED_DATA/geojson/:
 * - lightning_events.geojson (14,554 Point features)
 * - observation_grid.geojson (5,532 0.5° × 0.5° Polygon features)
 * - unknown_coverage.geojson (864 SAA footprints, SAA cells, fatal tracks, polar cell)
 *
 * Preserves exact record counts (zero silent drops), provides spatial clustering when zoomed
 * out over thousands of flashes, highlights the ISS ±54° ([-55.75°, +55.25°]) observation
 * envelope, shades unobserved polar latitudes clearly as out-of-coverage, and supports
 * click-to-inspect for any flash, grid cell, or unobserved location.
 */

// Simplified continental landmass polygons [lon, lat] for clear global geographic reference
const CONTINENT_OUTLINES = [
  // North America
  [[-168,65],[-140,70],[-125,70],[-95,72],[-75,62],[-55,50],[-67,44],[-80,25],[-88,18],[-80,8],[-92,15],[-105,20],[-117,32],[-124,48],[-140,60],[-168,65]],
  // South America
  [[-80,10],[-62,10],[-50,0],[-35,-6],[-38,-18],[-48,-28],[-58,-38],[-68,-54],[-75,-48],[-71,-30],[-70,-18],[-78,-5],[-80,10]],
  // Europe
  [[-10,36],[-9,43],[-2,48],[5,52],[10,58],[20,70],[40,68],[55,60],[45,45],[28,41],[22,37],[15,38],[5,43],[-5,36],[-10,36]],
  // Africa
  [[-17,15],[-6,35],[10,37],[32,31],[43,12],[51,11],[40,-10],[35,-25],[20,-35],[16,-28],[12,-6],[9,4],[-8,5],[-17,15]],
  // Asia
  [[28,41],[45,45],[55,60],[90,72],[140,70],[170,65],[142,50],[130,35],[122,23],[108,18],[103,2],[96,16],[88,22],[80,8],[72,20],[60,25],[48,30],[35,33],[28,41]],
  // Australia
  [[114,-22],[122,-14],[136,-12],[142,-11],[153,-26],[148,-38],[138,-35],[129,-32],[115,-34],[114,-22]],
  // Greenland & Iceland
  [[-52,60],[-44,60],[-22,70],[-20,80],[-55,81],[-60,75],[-52,60]],
  [[-24,63.5],[-14,63.5],[-14,66.5],[-24,66.5],[-24,63.5]],
];

export class GlobalLisMapView {
  constructor(canvasEl, options = {}) {
    this.canvas = canvasEl;
    this.ctx = canvasEl ? canvasEl.getContext('2d') : null;
    this.dataAdapter = options.dataAdapter || null;
    this.onFeatureInspected = typeof options.onFeatureInspected === 'function' ? options.onFeatureInspected : null;

    this.projection = 'EQUIRECTANGULAR'; // 'EQUIRECTANGULAR' | 'ORTHOGRAPHIC'
    this.zoom = 1.0;
    this.panCenterLon = 0.0;
    this.panCenterLat = 0.0;

    this.layers = {
      flashes: true,
      grid: true,
      unknown: true,
      swath: true,
    };

    this.activeDataPackage = null;
    this.cursorTai93 = 973723942.4;
    this.cursorStateInfo = null;
    this.selectedEvidenceItem = null;
    this.reducedMotion = false;

    // Interactive hit targets populated on each render pass
    this._hitTargets = [];
    this._isDragging = false;
    this._dragStartX = 0;
    this._dragStartY = 0;
    this._dragMoved = false;

    this._bindEvents();
  }

  _bindEvents() {
    if (!this.canvas) return;

    this.canvas.addEventListener('mousedown', (e) => {
      this._isDragging = true;
      this._dragMoved = false;
      this._dragStartX = e.clientX;
      this._dragStartY = e.clientY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this._isDragging) return;
      const dx = e.clientX - this._dragStartX;
      const dy = e.clientY - this._dragStartY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        this._dragMoved = true;
      }
      if (this._dragMoved) {
        const degPerPx = 180 / (this.canvas.width * this.zoom);
        this.panCenterLon = Math.max(-180, Math.min(180, this.panCenterLon - dx * degPerPx * 2));
        this.panCenterLat = Math.max(-80, Math.min(80, this.panCenterLat + dy * degPerPx * 2));
        this._dragStartX = e.clientX;
        this._dragStartY = e.clientY;
        this.render();
      }
    });

    window.addEventListener('mouseup', () => {
      this._isDragging = false;
    });

    this.canvas.addEventListener('click', (e) => {
      if (this._dragMoved) return;
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      this._handleCanvasClick(x, y);
    });

    this.canvas.addEventListener('keydown', (e) => {
      const step = 12 / this.zoom;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.panCenterLon = Math.max(-180, this.panCenterLon - step);
        this.render();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.panCenterLon = Math.min(180, this.panCenterLon + step);
        this.render();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.panCenterLat = Math.min(80, this.panCenterLat + step);
        this.render();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.panCenterLat = Math.max(-80, this.panCenterLat - step);
        this.render();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        this.zoomBy(1.3);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        this.zoomBy(1 / 1.3);
      }
    });
  }

  setProjection(proj) {
    this.projection = proj === 'ORTHOGRAPHIC' ? 'ORTHOGRAPHIC' : 'EQUIRECTANGULAR';
    this.render();
    return this.projection;
  }

  toggleProjection() {
    return this.setProjection(
      this.projection === 'EQUIRECTANGULAR' ? 'ORTHOGRAPHIC' : 'EQUIRECTANGULAR'
    );
  }

  zoomBy(factor) {
    this.zoom = Math.max(1.0, Math.min(8.0, this.zoom * factor));
    if (this.zoom === 1.0 && this.projection === 'EQUIRECTANGULAR') {
      this.panCenterLon = 0.0;
      this.panCenterLat = 0.0;
    }
    this.render();
    return this.zoom;
  }

  resetView() {
    this.zoom = 1.0;
    this.panCenterLon = 0.0;
    this.panCenterLat = 0.0;
    this.render();
  }

  focusOnBbox(bbox) {
    if (!Array.isArray(bbox) || bbox.length !== 4) return;
    const [minLon, minLat, maxLon, maxLat] = bbox;
    const spanLon = maxLon - minLon;
    const spanLat = maxLat - minLat;
    if (spanLon >= 340) {
      this.zoom = 1.0;
      this.panCenterLon = 0.0;
      this.panCenterLat = 0.0;
    } else {
      this.panCenterLon = (minLon + maxLon) / 2;
      this.panCenterLat = (minLat + maxLat) / 2;
      const zoomLon = 300 / Math.max(25, spanLon);
      const zoomLat = 150 / Math.max(15, spanLat);
      this.zoom = Math.max(1.2, Math.min(4.5, Math.min(zoomLon, zoomLat)));
    }
    this.render();
  }

  setLayerVisibility(layerKey, visible) {
    if (Object.prototype.hasOwnProperty.call(this.layers, layerKey)) {
      this.layers[layerKey] = Boolean(visible);
      this.render();
    }
  }

  updateState({ dataPackage, cursorTai93, cursorStateInfo, reducedMotion }) {
    if (dataPackage) this.activeDataPackage = dataPackage;
    if (typeof cursorTai93 === 'number') this.cursorTai93 = cursorTai93;
    if (cursorStateInfo) this.cursorStateInfo = cursorStateInfo;
    if (typeof reducedMotion === 'boolean') this.reducedMotion = reducedMotion;
    this.render();
  }

  /**
   * Projects (lon, lat) -> { x, y, visible } on canvas.
   */
  project(lon, lat) {
    const w = this.canvas.width;
    const h = this.canvas.height;

    if (this.projection === 'ORTHOGRAPHIC') {
      const rad = Math.PI / 180;
      const lam = lon * rad;
      const phi = lat * rad;
      const lam0 = this.panCenterLon * rad;
      const phi0 = this.panCenterLat * rad;

      const cosc =
        Math.sin(phi0) * Math.sin(phi) +
        Math.cos(phi0) * Math.cos(phi) * Math.cos(lam - lam0);
      if (cosc < 0) {
        return { x: -999, y: -999, visible: false };
      }

      const radius = Math.min(w, h) * 0.43 * Math.min(2.2, this.zoom);
      const x = w / 2 + radius * Math.cos(phi) * Math.sin(lam - lam0);
      const y =
        h / 2 -
        radius *
          (Math.cos(phi0) * Math.sin(phi) -
            Math.sin(phi0) * Math.cos(phi) * Math.cos(lam - lam0));
      return { x, y, visible: true };
    }

    // Equirectangular projection with pan & zoom
    const normX = (lon - this.panCenterLon) / (360 / this.zoom) + 0.5;
    const normY = 0.5 - (lat - this.panCenterLat) / (180 / this.zoom);
    const x = normX * w;
    const y = normY * h;
    const visible = x >= -20 && x <= w + 20 && y >= -20 && y <= h + 20;
    return { x, y, visible };
  }

  /**
   * Unprojects canvas pixel (x, y) -> { lon, lat }
   */
  unproject(x, y) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (this.projection === 'ORTHOGRAPHIC') {
      const radius = Math.min(w, h) * 0.43 * Math.min(2.2, this.zoom);
      const dx = (x - w / 2) / radius;
      const dy = (h / 2 - y) / radius;
      const rho = Math.sqrt(dx * dx + dy * dy);
      if (rho > 1) return null;
      const c = Math.asin(rho);
      const rad = Math.PI / 180;
      const phi0 = this.panCenterLat * rad;
      const lam0 = this.panCenterLon * rad;
      const phi =
        rho === 0
          ? phi0
          : Math.asin(
              Math.cos(c) * Math.sin(phi0) + (dy * Math.sin(c) * Math.cos(phi0)) / rho
            );
      const lam =
        lam0 +
        Math.atan2(
          dx * Math.sin(c),
          rho * Math.cos(phi0) * Math.cos(c) - dy * Math.sin(phi0) * Math.sin(c)
        );
      return {
        lon: Math.max(-180, Math.min(180, lam / rad)),
        lat: Math.max(-90, Math.min(90, phi / rad)),
      };
    }

    const lon = (x / w - 0.5) * (360 / this.zoom) + this.panCenterLon;
    const lat = (0.5 - y / h) * (180 / this.zoom) + this.panCenterLat;
    return {
      lon: Math.max(-180, Math.min(180, lon)),
      lat: Math.max(-90, Math.min(90, lat)),
    };
  }

  _handleCanvasClick(x, y) {
    // 1. Check rendered interactive hit targets (flashes, clusters, grid cells, unknown features)
    let bestTarget = null;
    let bestDist = 16;
    for (const t of this._hitTargets) {
      const d = Math.hypot(t.x - x, t.y - y);
      if (d <= (t.radius || 10) && d < bestDist) {
        bestDist = d;
        bestTarget = t;
      }
    }

    if (bestTarget && this.onFeatureInspected) {
      this.selectedEvidenceItem = bestTarget.record;
      this.render();
      this.onFeatureInspected(bestTarget.record);
      return;
    }

    // 2. Otherwise unproject coordinate and resolve state at clicked coordinate
    const coord = this.unproject(x, y);
    if (!coord || !this.onFeatureInspected) return;

    if (coord.lat > 55.25 || coord.lat < -55.75) {
      const polarRecord = {
        state: 'UNKNOWN',
        reason_code: 'OUTSIDE_OBSERVATION_COVERAGE',
        latitude: coord.lat,
        longitude: coord.lon,
        tai93_timestamp: this.cursorTai93,
        location_name: `High-Latitude Coordinate (${coord.lat.toFixed(2)}°N, ${coord.lon.toFixed(2)}°E — Outside ~±54° ISS LIS Swath Envelope)`,
      };
      this.selectedEvidenceItem = polarRecord;
      this.render();
      this.onFeatureInspected(polarRecord);
      return;
    }

    // Check if near any flash in activeDataPackage
    if (this.activeDataPackage?.flashes?.length) {
      let nearestFlash = null;
      let minDeg = 3.0;
      for (const f of this.activeDataPackage.flashes) {
        const deg = Math.hypot(f.lat - coord.lat, f.lon - coord.lon);
        if (deg < minDeg) {
          minDeg = deg;
          nearestFlash = f;
        }
      }
      if (nearestFlash) {
        this.selectedEvidenceItem = nearestFlash;
        this.render();
        this.onFeatureInspected(nearestFlash);
        return;
      }
    }

    // Otherwise inspect coordinate as OBSERVED_NO_DETECTION or OUTSIDE_OBSERVATION_COVERAGE
    const gridCellRecord = this.activeDataPackage?.gridObservationRecords?.find(
      (r) => Math.hypot(r.grid_lat - coord.lat, r.grid_lon - coord.lon) <= 2.5
    );
    if (gridCellRecord) {
      this.selectedEvidenceItem = gridCellRecord;
      this.render();
      this.onFeatureInspected(gridCellRecord);
      return;
    }

    const fallbackRecord = {
      state: 'UNKNOWN',
      reason_code: 'OUTSIDE_OBSERVATION_COVERAGE',
      latitude: coord.lat,
      longitude: coord.lon,
      tai93_timestamp: this.cursorTai93,
      location_name: `Coordinate (${coord.lat.toFixed(2)}°N, ${coord.lon.toFixed(2)}°E) Outside Instantaneous ISS Swath at Cursor`,
    };
    this.selectedEvidenceItem = fallbackRecord;
    this.render();
    this.onFeatureInspected(fallbackRecord);
  }

  render() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    this._hitTargets = [];

    // 1. Deep space/ocean background
    ctx.fillStyle = '#080a0d';
    ctx.fillRect(0, 0, w, h);

    if (this.projection === 'ORTHOGRAPHIC') {
      const radius = Math.min(w, h) * 0.43 * Math.min(2.2, this.zoom);
      ctx.save();
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#0f1216';
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.clip();
      this._renderMapContents(ctx, w, h);
      ctx.restore();
    } else {
      this._renderMapContents(ctx, w, h);
    }
  }

  _renderMapContents(ctx, w, h) {
    // 1. Unobserved Polar Belts (> +55.25°N and < -55.75°S) with subtle diagonal hatch
    if (this.projection === 'EQUIRECTANGULAR') {
      const northBoundY = this.project(0, 55.25).y;
      const southBoundY = this.project(0, -55.75).y;

      ctx.fillStyle = 'rgba(148, 163, 184, 0.06)';
      if (northBoundY > 0) {
        ctx.fillRect(0, 0, w, Math.min(h, northBoundY));
      }
      if (southBoundY < h) {
        ctx.fillRect(0, Math.max(0, southBoundY), w, h - Math.max(0, southBoundY));
      }

      // Dashed ISS ±54° / empirical [-55.75°, +55.25°] coverage boundary lines
      ctx.save();
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.48)';
      ctx.lineWidth = 1.25;
      ctx.setLineDash([6, 4]);
      for (const boundLat of [55.25, -55.75]) {
        const py = this.project(0, boundLat).y;
        if (py >= 0 && py <= h) {
          ctx.beginPath();
          ctx.moveTo(0, py);
          ctx.lineTo(w, py);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // 2. Graticule (Every 30° lon, 30° lat)
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.35)';
    ctx.lineWidth = 0.8;
    for (let lon = -180; lon <= 180; lon += 30) {
      ctx.beginPath();
      let started = false;
      for (let lat = -85; lat <= 85; lat += 5) {
        const p = this.project(lon, lat);
        if (!p.visible) {
          started = false;
          continue;
        }
        if (!started) {
          ctx.moveTo(p.x, p.y);
          started = true;
        } else {
          ctx.lineTo(p.x, p.y);
        }
      }
      ctx.stroke();
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      ctx.beginPath();
      let started = false;
      for (let lon = -180; lon <= 180; lon += 5) {
        const p = this.project(lon, lat);
        if (!p.visible) {
          started = false;
          continue;
        }
        if (!started) {
          ctx.moveTo(p.x, p.y);
          started = true;
        } else {
          ctx.lineTo(p.x, p.y);
        }
      }
      ctx.stroke();
    }

    // 3. Continental Outlines
    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.55)';
    ctx.lineWidth = 1.1;
    for (const poly of CONTINENT_OUTLINES) {
      ctx.beginPath();
      let started = false;
      for (const [lon, lat] of poly) {
        const p = this.project(lon, lat);
        if (!p.visible) continue;
        if (!started) {
          ctx.moveTo(p.x, p.y);
          started = true;
        } else {
          ctx.lineTo(p.x, p.y);
        }
      }
      if (started) {
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    // 4. GeoJSON Layer: UNKNOWN Coverage (SAA FOV polygons, SAA cells, Fatal Ground Tracks, Reykjavik reference cell)
    if (this.layers.unknown && this.activeDataPackage?.geoJsonUnknownFeatures) {
      const unkFeatures = this.activeDataPackage.geoJsonUnknownFeatures;
      for (let i = 0; i < unkFeatures.length; i++) {
        const feat = unkFeatures[i];
        const props = feat.properties || {};
        const geom = feat.geometry;
        if (!geom) continue;

        if (props.feature_category === 'SAA_AFFECTED_SWATH_FOOTPRINT' && geom.type === 'Polygon') {
          // Sample every 4th SAA footprint polygon to keep visual clarity high
          if (i % 4 !== 0) continue;
          const ring = geom.coordinates[0] || [];
          ctx.save();
          ctx.beginPath();
          let validPts = 0;
          for (const [lon, lat] of ring) {
            const p = this.project(lon, lat);
            if (!p.visible) continue;
            if (validPts === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
            validPts++;
          }
          if (validPts >= 3) {
            ctx.closePath();
            ctx.fillStyle = 'rgba(192, 132, 252, 0.045)';
            ctx.strokeStyle = 'rgba(192, 132, 252, 0.25)';
            ctx.setLineDash([4, 3]);
            ctx.lineWidth = 1;
            ctx.fill();
            ctx.stroke();
          }
          ctx.restore();
        } else if (
          props.feature_category === 'CONTIGUOUS_FATAL_OUTAGE_GROUND_TRACK' &&
          geom.type === 'LineString'
        ) {
          ctx.save();
          ctx.beginPath();
          let started = false;
          for (const [lon, lat] of geom.coordinates) {
            const p = this.project(lon, lat);
            if (!p.visible) continue;
            if (!started) {
              ctx.moveTo(p.x, p.y);
              started = true;
            } else {
              ctx.lineTo(p.x, p.y);
            }
          }
          ctx.strokeStyle = '#f472b6';
          ctx.setLineDash([5, 3]);
          ctx.lineWidth = 2.2;
          ctx.stroke();
          ctx.restore();
        } else if (
          props.feature_category === 'SAA_AFFECTED_VIEWTIME_CELL' ||
          props.feature_category === 'UNOBSERVED_HIGH_LATITUDE_REFERENCE_CELL'
        ) {
          const cLat = props.cell_lat ?? 64.25;
          const cLon = props.cell_lon ?? -21.75;
          const p = this.project(cLon, cLat);
          if (!p.visible) continue;
          const sz = Math.max(3.5, 3.5 * Math.sqrt(this.zoom));
          ctx.save();
          ctx.strokeStyle = '#c084fc';
          ctx.fillStyle = 'rgba(192, 132, 252, 0.25)';
          ctx.setLineDash([2, 2]);
          ctx.lineWidth = 1.2;
          ctx.strokeRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
          ctx.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
          ctx.restore();
          this._hitTargets.push({
            x: p.x,
            y: p.y,
            radius: Math.max(7, sz),
            record: props,
          });
        }
      }
    }

    // 5. GeoJSON Layer: 0.5° × 0.5° Observation Grid (OBSERVED_NO_DETECTION & DETECTED cells)
    if (this.layers.grid && this.activeDataPackage?.geoJsonGridFeatures) {
      const gridFeatures = this.activeDataPackage.geoJsonGridFeatures;
      const cellPx = Math.max(2.2, (w / 720) * this.zoom);
      for (let i = 0; i < gridFeatures.length; i++) {
        const feat = gridFeatures[i];
        const props = feat.properties || {};
        const p = this.project(props.cell_lon, props.cell_lat);
        if (!p.visible) continue;

        if (props.state === 'OBSERVED_NO_DETECTION') {
          ctx.fillStyle = 'rgba(56, 189, 248, 0.24)';
          ctx.fillRect(p.x - cellPx / 2, p.y - cellPx / 2, cellPx, cellPx);
          if (i % 3 === 0 || this.zoom >= 2.0) {
            this._hitTargets.push({
              x: p.x,
              y: p.y,
              radius: Math.max(6, cellPx),
              record: props,
            });
          }
        } else if (props.state === 'DETECTED' && !this.layers.flashes) {
          ctx.fillStyle = 'rgba(251, 191, 36, 0.45)';
          ctx.fillRect(p.x - cellPx / 2, p.y - cellPx / 2, cellPx, cellPx);
        }
      }
    }

    // 6. Selected Region Bounding Box Highlight
    if (this.activeDataPackage?.bbox && this.activeDataPackage.region.id !== 'GLOBAL_LIS') {
      const [minLon, minLat, maxLon, maxLat] = this.activeDataPackage.bbox;
      const nw = this.project(minLon, maxLat);
      const se = this.project(maxLon, minLat);
      if (nw.visible && se.visible) {
        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([6, 3]);
        ctx.strokeRect(nw.x, nw.y, se.x - nw.x, se.y - nw.y);
        ctx.restore();
      }
    }

    // 7. GeoJSON Layer: Confirmed Lightning Flash Events (with viewport/grid clustering when > 1,200 flashes)
    let renderedPointCount = 0;
    let renderedClusterCount = 0;
    if (this.layers.flashes && this.activeDataPackage?.flashes) {
      const flashes = this.activeDataPackage.flashes;
      const useClustering = flashes.length > 1200 && this.zoom < 2.5;

      if (useClustering) {
        const cellDeg = this.zoom < 1.5 ? 4.0 : 2.0;
        const clusters = new Map();
        for (const f of flashes) {
          const gx = Math.floor((f.lon + 180) / cellDeg);
          const gy = Math.floor((f.lat + 90) / cellDeg);
          const key = `${gx}_${gy}`;
          let c = clusters.get(key);
          if (!c) {
            c = {
              count: 0,
              sumLat: 0,
              sumLon: 0,
              primaryFlash: f,
              nearCursor: false,
            };
            clusters.set(key, c);
          }
          c.count += 1;
          c.sumLat += f.lat;
          c.sumLon += f.lon;
          if (Math.abs(f.tai93_time - this.cursorTai93) <= 15.0) {
            c.nearCursor = true;
            c.primaryFlash = f;
          }
        }

        for (const c of clusters.values()) {
          const lat = c.sumLat / c.count;
          const lon = c.sumLon / c.count;
          const p = this.project(lon, lat);
          if (!p.visible) continue;
          renderedClusterCount += 1;

          const size = Math.min(13, 4.5 + Math.log2(c.count + 1) * 1.4);
          this._drawDiamondMarker(ctx, p.x, p.y, size, c.nearCursor);
          this._hitTargets.push({
            x: p.x,
            y: p.y,
            radius: size + 4,
            record: c.primaryFlash,
          });
        }
      } else {
        for (const f of flashes) {
          const p = this.project(f.lon, f.lat);
          if (!p.visible) continue;
          renderedPointCount += 1;
          const isNearCursor = Math.abs(f.tai93_time - this.cursorTai93) <= 12.0;
          const sz = isNearCursor ? 7.5 : Math.max(4.2, 3.8 * Math.sqrt(this.zoom));
          this._drawDiamondMarker(ctx, p.x, p.y, sz, isNearCursor);
          this._hitTargets.push({
            x: p.x,
            y: p.y,
            radius: sz + 5,
            record: f,
          });
        }
      }
    }

    // 8. Instantaneous ISS LIS Swath Keyframe Footprint & Boresight at Playback Cursor
    if (this.layers.swath && this.cursorStateInfo?.nearestKeyframe) {
      const kf = this.cursorStateInfo.nearestKeyframe;
      const p = this.project(kf.boresight_lon, kf.boresight_lat);
      if (p.visible) {
        const swathDeg = 5.0; // ~550 km optical swath width
        const topLeft = this.project(kf.boresight_lon - swathDeg / 2, kf.boresight_lat + swathDeg / 2);
        const botRight = this.project(kf.boresight_lon + swathDeg / 2, kf.boresight_lat - swathDeg / 2);
        const swW = Math.max(18, Math.abs(botRight.x - topLeft.x));
        const swH = Math.max(18, Math.abs(botRight.y - topLeft.y));

        ctx.save();
        ctx.strokeStyle = kf.saa_active ? '#c084fc' : '#38bdf8';
        ctx.fillStyle = kf.saa_active ? 'rgba(192, 132, 252, 0.16)' : 'rgba(56, 189, 248, 0.16)';
        ctx.lineWidth = 2;
        if (kf.saa_active) ctx.setLineDash([4, 3]);
        ctx.fillRect(p.x - swW / 2, p.y - swH / 2, swW, swH);
        ctx.strokeRect(p.x - swW / 2, p.y - swH / 2, swW, swH);

        // Center sensor crosshair
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#f8fafc';
        ctx.fill();
        ctx.restore();
      }
    }

    // Update HUD render stats text
    const hudStats = document.getElementById('hud-render-stats');
    if (hudStats) {
      const totalFlashes = this.activeDataPackage?.flashes?.length || 0;
      hudStats.textContent =
        renderedClusterCount > 0
          ? `${renderedClusterCount} Clusters (${totalFlashes.toLocaleString()} exact flashes)`
          : `${renderedPointCount.toLocaleString()} Flash Points (${totalFlashes.toLocaleString()} total)`;
    }
  }

  _drawDiamondMarker(ctx, x, y, radius, isHighlighted = false) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, y - radius);
    ctx.lineTo(x + radius, y);
    ctx.lineTo(x, y + radius);
    ctx.lineTo(x - radius, y);
    ctx.closePath();

    ctx.fillStyle = isHighlighted ? '#fef08a' : '#fbbf24';
    ctx.strokeStyle = isHighlighted ? '#ffffff' : '#b45309';
    ctx.lineWidth = isHighlighted ? 1.8 : 1.0;
    ctx.fill();
    ctx.stroke();

    if (isHighlighted && !this.reducedMotion) {
      ctx.beginPath();
      ctx.arc(x, y, radius + 4.5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.75)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();
  }
}

