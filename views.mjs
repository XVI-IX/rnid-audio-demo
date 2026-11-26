const fragmentViews = new Map([
  ['#listen', 'listen'],
  ['#nihl-examples', 'listen'],
  ['#freq-band-sim', 'listen'],
  ['#hearing-hangover', 'listen'],
  ['#tinnitus-panel', 'listen'],
  ['#demo', 'studio'],
  ['#studio-filter-response', 'studio'],
  ['#audiologist-sandbox', 'studio'],
  ['#render', 'your-audio'],
]);
const sectionAnchors = new Set(['#nihl-examples', '#freq-band-sim', '#hearing-hangover', '#tinnitus-panel', '#studio-filter-response', '#audiologist-sandbox']);

export function connectViewNavigation(onChange) {
  const sections = document.querySelectorAll('[data-view]');
  const links = document.querySelectorAll('nav [data-view-link]');
  let currentView;
  let previousLocation;

  function showView() {
    const { hash, search } = window.location;
    const location = `${search}${hash}`;
    if (location === previousLocation) return;
    previousLocation = location;

    const defaultView = new URLSearchParams(search).has('song') ? 'studio' : 'listen';
    const nextView = fragmentViews.get(hash) ?? (hash && currentView ? currentView : defaultView);
    const previousView = currentView;
    if (nextView !== previousView) {
      currentView = nextView;
      for (const section of sections) section.hidden = section.dataset.view !== nextView;
      for (const link of links) {
        if (link.dataset.viewLink === nextView) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      }
      onChange(nextView, previousView);
    }

    if (sectionAnchors.has(hash)) {
      const target = document.getElementById(hash.slice(1));
      const disclosure = target?.closest('details');
      if (disclosure) disclosure.open = true;
      requestAnimationFrame(() => {
        if (window.location.hash === hash) target?.scrollIntoView();
      });
    } else if (previousView && nextView !== previousView) {
      window.scrollTo(0, 0);
    }
  }

  window.addEventListener('hashchange', showView);
  window.addEventListener('popstate', showView);
  showView();
}
