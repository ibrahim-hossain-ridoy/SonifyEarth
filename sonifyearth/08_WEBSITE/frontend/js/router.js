/**
 * @file router.js
 * @description Lightweight multi-page router for SonifyEarth.
 *
 * The app keeps ONE shared playback state (map, timeline, sound engine, inspector),
 * so the "pages" are route views inside a single document. Switching pages never
 * reloads JS, never resets the playback cursor and never touches any element id.
 *
 * Any hash that is a page id (#explorer) OR a section id (#page-map-explorer) works,
 * so every existing in-page link and bookmark keeps resolving.
 *
 * Exposes window.sonifyGo(sectionOrPageId) for programmatic navigation.
 */
const ROUTES = [
  { id: 'overview',   title: 'Overview',   sections: ['page-landing', 'page-mission'] },
  { id: 'technology', title: 'Technology', sections: ['page-eic-visual', 'page-data-journey'] },
  { id: 'explorer',   title: 'Explorer',   sections: ['page-map-explorer', 'page-timeline-dashboard'] },
  { id: 'listen',     title: 'Listen',     sections: ['page-listening-modes', 'page-evidence-inspector'] },
  { id: 'archive',    title: 'Archive',    sections: ['page-methodology'] },
];

const BASE_TITLE = "SonifyEarth — Silence Isn't Zero.";

function routeFor(id) {
  return (
    ROUTES.find((r) => r.id === id) ||
    ROUTES.find((r) => r.sections.includes(id)) ||
    null
  );
}

function show(route, sectionId, { smooth = true } = {}) {
  document.querySelectorAll('.route-page').forEach((el) => {
    const on = el.dataset.route === route.id;
    el.hidden = !on;
    el.classList.toggle('is-active', on);
  });

  document.querySelectorAll('.nav-link').forEach((a) => {
    const on = a.dataset.route === route.id;
    a.classList.toggle('active', on);
    if (on) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });

  document.title = `${route.title} · ${BASE_TITLE}`;

  const target = sectionId && sectionId !== route.id ? document.getElementById(sectionId) : null;
  const first = route.sections[0];
  requestAnimationFrame(() => {
    if (target && sectionId !== first) {
      target.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
    }
    // let canvases (globe, map, timeline) re-measure and resume
    window.dispatchEvent(new CustomEvent('sonify:route', { detail: { route: route.id } }));
    window.dispatchEvent(new Event('resize'));
  });
}

function go(id, opts) {
  const route = routeFor(id);
  if (!route) return;
  const hash = '#' + id;
  if (location.hash !== hash) {
    history.pushState(null, '', hash);
  }
  show(route, id, opts);
}

function fromHash(initial = false) {
  const id = decodeURIComponent(location.hash.replace(/^#/, ''));
  const route = routeFor(id) || ROUTES[0];
  show(route, id || route.id, { smooth: !initial });
}

window.sonifyGo = go;

window.addEventListener('DOMContentLoaded', () => {
  // Intercept in-page links to pages/sections (even when the hash is unchanged)
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = decodeURIComponent(a.getAttribute('href').slice(1));
    if (!id || id === 'main-content') return;
    if (!routeFor(id)) return;
    e.preventDefault();
    go(id);
  });

  window.addEventListener('popstate', () => fromHash(false));
  window.addEventListener('hashchange', () => fromHash(false));
  fromHash(true);
});
