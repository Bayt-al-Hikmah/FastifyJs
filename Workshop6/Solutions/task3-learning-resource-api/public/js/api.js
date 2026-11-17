/* =========================================================
   Open Shelf — reusable Fetch helper.

   The access token lives in memory (never localStorage), so a page reload
   starts a clean session. apiRequest injects it into every API call.
   ========================================================= */

let accessToken = null;


export function setAccessToken(value) {
    accessToken = value || null;
}


export function getAccessToken() {
    return accessToken;
}


export function clearAccessToken() {
    accessToken = null;
}


export class ApiError extends Error {
    constructor(message, status, details) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.details = details;
    }
}


/**
 * Reusable request wrapper: adds the Bearer token, sets JSON content type
 * unless the body is FormData, handles 204, parses JSON safely, and throws an
 * ApiError carrying .status and .details for validation errors.
 */
export async function apiRequest(url, options = {}) {
    const headers = new Headers(options.headers || {});

    if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
    }

    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

    if (options.body && !isFormData && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, {
        ...options,
        headers
    });

    let payload = null;

    if (response.status !== 204) {
        const text = await response.text();

        if (text) {
            try {
                payload = JSON.parse(text);
            } catch {
                payload = null;
            }
        }
    }

    if (!response.ok) {
        const message = payload?.message || `Request failed (${response.status}).`;
        throw new ApiError(message, response.status, payload?.errors || null);
    }

    return payload;
}


/**
 * Authenticated binary download. The URL is always an API route that derives
 * the storage key from the database, never from a client-supplied path.
 */
export async function downloadBlob(url) {
    const headers = new Headers();

    if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
        let message = `Download failed (${response.status}).`;

        try {
            const payload = await response.json();
            message = payload?.message || message;
        } catch {
            // Keep the generic message.
        }

        throw new ApiError(message, response.status, null);
    }

    return response.blob();
}


export function describeError(error) {
    if (!(error instanceof ApiError) || !Array.isArray(error.details)) {
        return [];
    }

    return error.details.map((issue) => ({
        field: issue.field,
        message: issue.message
    }));
}
