const EASTERN_TIME_ZONE = 'America/New_York';

function easternDay(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: EASTERN_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function versionInfo(env) {
  const metadata = env.CF_VERSION_METADATA || {};
  return {
    commit: metadata.tag || 'unknown',
    workerVersion: metadata.id || 'unknown',
    created: metadata.timestamp || null
  };
}

function provenanceHeaders(env) {
  const info = versionInfo(env);
  return {
    'Cache-Control': 'no-store',
    'X-Text-O-Matic-Commit': info.commit,
    'X-Text-O-Matic-Worker-Version': info.workerVersion,
    'X-Text-O-Matic-Worker-Environment': env.DEPLOYMENT_ENV || 'unknown'
  };
}

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Expose-Headers':
      'X-Text-O-Matic-Commit, X-Text-O-Matic-Worker-Version, X-Text-O-Matic-Worker-Environment, X-Text-O-Matic-Pageview-Stored',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const provenance = provenanceHeaders(env);

    // Public, read-only provenance endpoint. It does not read from or write to D1.
    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
      const info = versionInfo(env);
      return Response.json(
        {
          ok: true,
          environment: env.DEPLOYMENT_ENV || 'unknown',
          gitCommit: info.commit,
          workerVersion: info.workerVersion,
          workerCreated: info.created,
          source: env.SOURCE_URL || null,
          schema: env.SCHEMA_URL || null,
          pageviewStorage: env.DB ? 'D1 daily aggregate only' : 'disabled'
        },
        { headers: provenance }
      );
    }

    if (request.method === 'OPTIONS') {
      if (url.pathname !== '/view' || origin !== env.ALLOWED_ORIGIN) {
        return new Response(null, { status: 403, headers: provenance });
      }
      return new Response(null, {
        status: 204,
        headers: { ...provenance, ...corsHeaders(env) }
      });
    }

    if (url.pathname !== '/view' || request.method !== 'POST') {
      return new Response(null, { status: 404, headers: provenance });
    }

    if (origin !== env.ALLOWED_ORIGIN) {
      return new Response(null, { status: 403, headers: provenance });
    }

    // The request body is deliberately never read. Text-o-Matic sends an empty POST.
    // Development deploys intentionally have no DB binding, so they exercise the
    // request/CORS/provenance path without adding test traffic to production analytics.
    let stored = false;

    if (env.DB) {
      const day = easternDay();
      await env.DB.prepare(`
        INSERT INTO daily_pageviews (day, views)
        VALUES (?, 1)
        ON CONFLICT(day) DO UPDATE SET views = views + 1
      `).bind(day).run();
      stored = true;
    } else if ((env.DEPLOYMENT_ENV || '').toLowerCase() === 'production') {
      // Fail visibly if production was accidentally deployed without its declared D1 binding.
      return new Response(null, {
        status: 500,
        headers: {
          ...provenance,
          ...corsHeaders(env),
          'X-Text-O-Matic-Pageview-Stored': 'no'
        }
      });
    }

    return new Response(null, {
      status: 204,
      headers: {
        ...provenance,
        ...corsHeaders(env),
        'X-Text-O-Matic-Pageview-Stored': stored ? 'yes' : 'no'
      }
    });
  }
};
