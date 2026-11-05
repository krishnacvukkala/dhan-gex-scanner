/**
 * DhanHQ CORS Reverse Proxy — Cloudflare Worker
 *
 * Why this is needed:
 * The DhanHQ API (https://api.dhan.co/v2) does not include CORS (Cross-Origin Resource Sharing)
 * headers, which blocks modern web browsers from fetching data directly from GitHub Pages or
 * custom web domains.
 *
 * This lightweight Cloudflare Worker sits between your browser and DhanHQ:
 * 1. Accepts incoming requests from your Dhan GEX Scanner web app
 * 2. Adds standard CORS headers (Access-Control-Allow-Origin: *)
 * 3. Handles preflight OPTIONS requests
 * 4. Forwards GET/POST requests directly to https://api.dhan.co
 * 5. Returns the JSON response to your browser
 *
 * Cloudflare Workers provides 100,000 requests/day for FREE.
 *
 * How to deploy in 2 minutes:
 * 1. Log in to Cloudflare Dashboard (https://dash.cloudflare.com)
 * 2. Navigate to "Workers & Pages" -> "Create application" -> "Create Worker"
 * 3. Name your worker (e.g. "dhan-cors-proxy")
 * 4. Click "Deploy" -> then click "Edit code"
 * 5. Paste this entire file contents into `worker.js` and click "Deploy"
 * 6. Copy your worker URL (e.g. `https://dhan-cors-proxy.<subdomain>.workers.dev`)
 * 7. Open Dhan GEX Scanner -> Click ⚙️ API Settings -> Paste your worker URL into "CORS Proxy URL"
 */

export default {
  async fetch(request) {
    // 1. Handle CORS Preflight (OPTIONS)
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, access-token, client-id, Accept',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    try {
      const url = new URL(request.url);

      // Support two URL patterns:
      // Pattern A: https://worker.dev/https://api.dhan.co/v2/...
      // Pattern B: https://worker.dev/v2/...
      let targetUrl = url.pathname.slice(1) + url.search;

      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        const cleanPath = targetUrl.startsWith('/') ? targetUrl : `/${targetUrl}`;
        targetUrl = `https://api.dhan.co${cleanPath}`;
      }

      // Prohibit non-dhan target hosts for security
      const parsedTarget = new URL(targetUrl);
      if (parsedTarget.hostname !== 'api.dhan.co') {
        return new Response(
          JSON.stringify({ error: 'Proxy only forwards requests to api.dhan.co' }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }

      // Strictly enforce read-only safety (prohibit order execution)
      const lowerPath = parsedTarget.pathname.toLowerCase();
      if (
        lowerPath.includes('/orders') ||
        lowerPath.includes('/trade') ||
        lowerPath.includes('/place') ||
        lowerPath.includes('/cancel') ||
        lowerPath.includes('/modify')
      ) {
        return new Response(
          JSON.stringify({ error: 'Trade execution endpoints are strictly prohibited.' }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }

      // Clone headers and forward to DhanHQ
      const forwardHeaders = new Headers();
      const accessToken = request.headers.get('access-token');
      const clientId = request.headers.get('client-id');
      const contentType = request.headers.get('content-type') || 'application/json';

      if (accessToken) forwardHeaders.set('access-token', accessToken);
      if (clientId) forwardHeaders.set('client-id', clientId);
      forwardHeaders.set('Content-Type', contentType);
      forwardHeaders.set('Accept', 'application/json');

      const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer();

      const response = await fetch(targetUrl, {
        method: request.method,
        headers: forwardHeaders,
        body,
      });

      // Forward response back with permissive CORS headers
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, access-token, client-id, Accept');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: err.message || 'CORS Proxy Error' }),
        {
          status: 502,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
  },
};
