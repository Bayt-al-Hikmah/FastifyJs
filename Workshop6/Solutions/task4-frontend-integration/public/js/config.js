/**
 * Eventide configuration.
 *
 * This project deliberately makes the API origin obvious and configurable so we
 * can demonstrate CORS. The browser page is served from http://127.0.0.1:5173
 * while the Community Events API runs on http://127.0.0.1:3000 — two different
 * origins. Every request therefore needs the API to allow this frontend origin.
 *
 * Override the API origin, in priority order, with:
 *   1. A query string:  http://127.0.0.1:5173/?apiBaseUrl=http://localhost:3000
 *   2. A global:        window.__EVENTIDE_CONFIG__ = { apiBaseUrl: '...' }
 *   3. The meta tag:    <meta name="api-base-url" content="...">
 *   4. The default below.
 */


const DEFAULT_API_BASE_URL = 'http://127.0.0.1:3000';


function readConfiguredApiBaseUrl() {

    if (typeof window === 'undefined') {

        return DEFAULT_API_BASE_URL;

    }

    const queryValue = new URLSearchParams(window.location.search)
        .get('apiBaseUrl');

    const globalValue = window.__EVENTIDE_CONFIG__?.apiBaseUrl;

    const metaValue = document
        .querySelector('meta[name="api-base-url"]')
        ?.getAttribute('content');

    const candidate = queryValue ?? globalValue ?? metaValue ?? DEFAULT_API_BASE_URL;

    return candidate.replace(/\/+$/, '') || DEFAULT_API_BASE_URL;

}


export const API_BASE_URL = readConfiguredApiBaseUrl();


/**
 * Join a path such as '/api/events' onto the configured API origin.
 * Absolute URLs are returned untouched so the helper stays predictable.
 */
export function apiUrl(path) {

    if (/^https?:\/\//i.test(path)) {

        return path;

    }

    const suffix = path.startsWith('/') ? path : `/${path}`;

    return `${API_BASE_URL}${suffix}`;

}


/**
 * A short, human-friendly label for the header badge.
 */
export function apiHostLabel() {

    try {

        return new URL(API_BASE_URL).host;

    } catch {

        return API_BASE_URL;

    }

}
