/* =========================================================
   Pawprint — reusable Fetch helper
   The access token lives in memory; localStorage is used only
   to restore a session after a page reload.
   ========================================================= */

const TOKEN_KEY = 'w6-pawprint-access-token';

let accessToken = window.localStorage.getItem(TOKEN_KEY);


export function getToken() {
    return accessToken;
}


export function setToken(token) {
    accessToken = token;

    if (token) {
        window.localStorage.setItem(TOKEN_KEY, token);
    } else {
        window.localStorage.removeItem(TOKEN_KEY);
    }
}


export function clearToken() {
    setToken(null);
}


/**
 * Send a request to the API, attach the Bearer token, and normalise both
 * success and error responses. Callers receive the response envelope, so
 * they can read `data` without repeating parsing logic.
 */
export async function apiRequest(url, options = {}) {
    const headers = new Headers(options.headers || {});

    if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
    }

    const hasBody = options.body !== undefined && options.body !== null;

    if (
        hasBody &&
        !(options.body instanceof FormData) &&
        !headers.has('Content-Type')
    ) {
        headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, {
        ...options,
        headers
    });

    if (response.status === 204) {
        return null;
    }

    const text = await response.text();

    let payload = null;

    if (text) {
        try {
            payload = JSON.parse(text);
        } catch {
            payload = null;
        }
    }

    if (!response.ok) {
        const error = new Error(
            (payload && payload.message) || `Request failed (${response.status}).`
        );

        error.status = response.status;
        error.details = (payload && payload.errors) || [];

        throw error;
    }

    return payload;
}
