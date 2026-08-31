(() => {
  'use strict';

  // Capture Device Transfer data and remove it from the visible/current URL
  // before any third-party script can execute. app.js consumes the captured
  // value later during normal startup.
  const incomingTransferHash = location.hash.startsWith('#xfer=') ? location.hash : '';
  window.__textOMaticIncomingTransferHash = incomingTransferHash;
  if (incomingTransferHash) {
    history.replaceState(null, '', `${location.pathname}${location.search}`);
  }

  const host = window.location.hostname;

  // The production site increments the aggregate D1 pageview counter. The dev
  // site calls a separate dev Worker with no D1 binding so the same request,
  // CORS, and provenance path can be tested without polluting production counts.
  //
  // Both requests are empty POSTs with no cookies/credentials and no referrer.
  // Failures are intentionally ignored so analytics can never interfere with
  // the app or with offline use.
  const pageviewWorkerUrl =
    host === 'text-o-matic.nickspeelman.com'
      ? 'https://text-o-matic-pageviews.nick-958.workers.dev/view'
      : host === 'text-o-matic-dev.nickspeelman.com'
        ? 'https://text-o-matic-pageviews-dev.nick-958.workers.dev/view'
        : '';

  if (pageviewWorkerUrl) {
    fetch(pageviewWorkerUrl, {
      method: 'POST',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      keepalive: true
    }).catch(() => {});
  }

  if (host === 'text-o-matic.nickspeelman.com') {
    const canonical = document.createElement('link');
    canonical.rel = 'canonical';
    canonical.href = 'https://text-o-matic.nickspeelman.com/';
    document.head.appendChild(canonical);
  }

  if (host === 'text-o-matic-dev.nickspeelman.com') {
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex, nofollow';
    document.head.appendChild(robots);
  }
})();
