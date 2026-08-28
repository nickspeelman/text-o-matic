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
