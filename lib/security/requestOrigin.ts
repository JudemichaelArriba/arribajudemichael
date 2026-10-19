import 'server-only';

/**
 * Accepts only requests made by this site's own pages: the browser-set `Origin` must match the
 * host the request was sent to, and `Sec-Fetch-Site` (when the browser sends it) must agree.
 * Requests without an `Origin` (curl, server-to-server) are rejected.
 */
export function isSameOriginRequest(request: Request): boolean {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');

    if (!origin || !host) return false;

    const fetchSite = request.headers.get('sec-fetch-site');
    if (fetchSite !== null && fetchSite !== 'same-origin') return false;

    try {
        const originUrl = new URL(origin);
        const isHttps = originUrl.protocol === 'https:';
        const isLocalHttp =
            originUrl.protocol === 'http:' && process.env.NODE_ENV !== 'production';

        return (isHttps || isLocalHttp) && originUrl.host === host.trim().toLowerCase();
    } catch {
        return false;
    }
}
