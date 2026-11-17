import { apiUrl, API_BASE_URL } from './config.js';


/**
 * A tiny reusable Fetch helper.
 *
 * The access token lives in memory only. It is injected into every request and
 * removed on sign out. Nothing is written to localStorage: a single XSS flaw
 * would then be able to read a persistent token. Production applications should
 * prefer secure HttpOnly cookies or a backend-for-frontend design.
 */
let accessToken = null;


export function setAccessToken(token) {

    accessToken = token ?? null;

}


export function clearAccessToken() {

    accessToken = null;

}


export function getAccessToken() {

    return accessToken;

}


function createApiError(message, status, details) {

    const error = new Error(message);

    error.name = 'ApiError';
    error.status = status;
    error.details = details;

    return error;

}


/**
 * 204 responses have no body. Some successful endpoints may also return a plain
 * text body, so we only parse JSON when the content type says we should.
 */
async function readResponseBody(response) {

    if (response.status === 204) {

        return null;

    }

    const contentType = response.headers.get('content-type') ?? '';

    if (!contentType.includes('application/json')) {

        return null;

    }

    try {

        return await response.json();

    } catch {

        return null;

    }

}


/**
 * Fetch does not reject on HTTP error statuses, so response.ok must be checked.
 * All callers receive the same error shape: message, status, and details.
 */
export async function apiRequest(path, options = {}) {

    const headers = new Headers(options.headers ?? {});

    if (accessToken) {

        headers.set('Authorization', `Bearer ${accessToken}`);

    }

    const isFormData = typeof FormData !== 'undefined'
        && options.body instanceof FormData;

    if (options.body && !isFormData && !headers.has('Content-Type')) {

        headers.set('Content-Type', 'application/json');

    }

    let response;

    try {

        response = await fetch(apiUrl(path), {
            ...options,
            headers
        });

    } catch (cause) {

        throw createApiError(
            `Could not reach the API at ${API_BASE_URL}. Check that the Community Events API is running and that it allows this frontend origin with FRONTEND_ORIGIN.`,
            0,
            []
        );

    }

    const result = await readResponseBody(response);

    if (!response.ok) {

        throw createApiError(
            result?.message ?? `Request failed with status ${response.status}.`,
            response.status,
            result?.errors ?? []
        );

    }

    return result;

}


/**
 * Covers are private and served through an authenticated endpoint. A plain
 * <img src="..."> cannot attach the Bearer token, so we fetch the bytes with
 * the same helper and hand the browser an object URL instead.
 */
export async function apiFetchBlob(path, options = {}) {

    const headers = new Headers(options.headers ?? {});

    if (accessToken) {

        headers.set('Authorization', `Bearer ${accessToken}`);

    }

    let response;

    try {

        response = await fetch(apiUrl(path), {
            ...options,
            headers
        });

    } catch (cause) {

        throw createApiError(
            `Could not reach the API at ${API_BASE_URL}.`,
            0,
            []
        );

    }

    if (!response.ok) {

        const contentType = response.headers.get('content-type') ?? '';

        let result = null;

        if (contentType.includes('application/json')) {

            try {

                result = await response.json();

            } catch {

                result = null;

            }

        }

        throw createApiError(
            result?.message ?? `Could not load the image (status ${response.status}).`,
            response.status,
            result?.errors ?? []
        );

    }

    return response.blob();

}
