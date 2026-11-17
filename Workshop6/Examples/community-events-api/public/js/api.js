/*
 * Reusable Fetch helper for the Gather dashboard.
 *
 * The access token lives in memory only: a page refresh signs the user out.
 * That is intentional for this workshop (no localStorage token storage).
 */

let accessToken = null


export function setAccessToken(token) {

    accessToken = token

}


export function clearAccessToken() {

    accessToken = null

}


export function getAccessToken() {

    return accessToken

}


export async function apiRequest(url, options = {}) {

    const headers = new Headers(options.headers ?? {})


    if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`)
    }


    const isFormData = options.body instanceof FormData


    if (
        options.body &&
        !isFormData &&
        !headers.has('Content-Type')
    ) {
        headers.set('Content-Type', 'application/json')
    }


    const response = await fetch(url, {
        ...options,
        headers
    })


    // DELETE endpoints return 204 No Content — there is no JSON to parse.
    if (response.status === 204) {
        return null
    }


    const contentType =
        response.headers.get('content-type') ?? ''

    const result = contentType.includes('application/json')
        ? await response.json().catch(() => null)
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


/*
 * Cover images are served from private storage, so a plain <img src> cannot
 * send the Bearer token. Fetch the bytes with the helper's token, then hand
 * the browser a temporary object URL.
 */
export async function fetchCoverUrl(eventId) {

    const headers = new Headers()

    if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`)
    }

    const response = await fetch(
        `/api/events/${eventId}/cover`,
        { headers }
    )

    if (!response.ok) {
        throw new Error('Cover image could not be loaded.')
    }

    const blob = await response.blob()

    return URL.createObjectURL(blob)

}
