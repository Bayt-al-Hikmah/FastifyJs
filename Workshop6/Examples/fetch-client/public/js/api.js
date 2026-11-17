/**
 * A tiny reusable Fetch wrapper.
 *
 * Instead of repeating fetch() + response.ok + response.json() in every
 * module, we keep all of that logic in one place. Any module that needs the
 * API imports apiRequest() from this file.
 */

let accessToken = null


/**
 * The token lives in memory only. This keeps the workshop simple and avoids
 * teaching localStorage as a default home for credentials. In a real app,
 * prefer secure HttpOnly cookies (with CSRF protection) or a backend-for-
 * frontend. This example's API is public, so the token is not required here,
 * but the helper demonstrates where it would be injected.
 */

export function setAccessToken(token) {
    accessToken = token
}


export function clearAccessToken() {
    accessToken = null
}


/**
 * Safely parse a JSON body. A proxy or an error page can return non-JSON, and
 * calling response.json() on that would throw a confusing SyntaxError.
 */

async function parseJsonBody(response) {
    try {
        return await response.json()
    } catch {
        return null
    }
}


/**
 * Make an API request and return its parsed data.
 *
 * @param {string} url
 * @param {RequestInit} options
 * @returns {Promise<any>} the success envelope, or null for a 204 response
 * @throws {Error} with .status and .details for non-2xx responses
 */
export async function apiRequest(url, options = {}) {
    const headers = new Headers(options.headers ?? {})

    if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`)
    }

    const isFormData = options.body instanceof FormData

    if (options.body && !isFormData && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json')
    }

    // Important: when body is FormData we DO NOT set Content-Type. The browser
    // adds multipart/form-data with the correct boundary automatically.

    const response = await fetch(url, {
        ...options,
        headers
    })

    // A 204 has no body at all. Calling response.json() here would fail.
    if (response.status === 204) {
        return null
    }

    const contentType = response.headers.get('content-type') ?? ''

    const result = contentType.includes('application/json')
        ? await parseJsonBody(response)
        : null

    // Fetch does not reject on 400/404/500. We must check response.ok ourselves.
    if (!response.ok) {
        const error = new Error(
            result?.message ?? `Request failed with status ${response.status}.`
        )

        error.status = response.status
        error.details = result?.errors ?? []

        throw error
    }

    return result
}
