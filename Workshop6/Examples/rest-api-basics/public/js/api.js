/**
 * A tiny reusable Fetch helper.
 *
 * This library API has no authentication, but the token helpers are included
 * so the same pattern can be reused by the authenticated Workshop 6 projects.
 * The token stays in JavaScript memory: it is never written to localStorage.
 */

let accessToken = null


export function setAccessToken(token) {

    accessToken = token ?? null

}


export function clearAccessToken() {

    accessToken = null

}


/**
 * Sends a request and returns the parsed JSON body (or null for a 204).
 *
 * Errors carry `.status` (the HTTP status code) and `.details` (the validation
 * error array from the API) so callers can render them without guessing.
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


    const response = await fetch(url, {
        ...options,
        headers
    })


    if (response.status === 204) {

        return null

    }


    const contentType = response.headers.get('content-type') ?? ''

    const result = contentType.includes('application/json')
        ? await response.json()
        : null


    if (!response.ok) {

        const error = new Error(
            result?.message ??
            `Request failed with status ${response.status}.`
        )

        error.status = response.status

        error.details = result?.errors ?? []

        throw error

    }


    return result

}
