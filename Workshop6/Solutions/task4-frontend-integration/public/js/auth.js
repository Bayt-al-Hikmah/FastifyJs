import { apiRequest, setAccessToken, clearAccessToken } from './api.js';


/**
 * Authentication state for the Eventide client.
 *
 * The access token is stored by api.js in memory. This module keeps the matching
 * user profile in memory too, so refreshing the page signs the visitor out — a
 * deliberate teaching trade-off for this workshop. A real application would use
 * a refresh-token flow or HttpOnly cookies.
 */
let currentUser = null;

const listeners = new Set();


function notifyListeners() {

    for (const listener of listeners) {

        listener(currentUser);

    }

}


export function onAuthChange(listener) {

    listeners.add(listener);

    return () => {

        listeners.delete(listener);

    };

}


export function getCurrentUser() {

    return currentUser;

}


export function isAuthenticated() {

    return currentUser !== null;

}


export function getUserId() {

    return currentUser?.id ?? null;

}


function normaliseUser(payload) {

    if (!payload) {

        return null;

    }

    if (payload.user) {

        return payload.user;

    }

    return payload;

}


/**
 * Log in and remember the access token. The API returns:
 * { message, data: { accessToken, tokenType, expiresIn, user } }
 */
export async function login(credentials) {

    const result = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
            email: credentials.email,
            password: credentials.password
        })
    });

    const data = result?.data ?? {};
    const token = data.accessToken;

    if (!token) {

        throw new Error('The API did not return an access token.');

    }

    setAccessToken(token);

    currentUser = normaliseUser(data.user) ?? {
        email: credentials.email
    };

    notifyListeners();

    return currentUser;

}


/**
 * Register an account. Some API variants return a token immediately; others ask
 * the visitor to sign in afterwards. Both behaviours are handled here.
 */
export async function register(details) {

    const payload = {
        username: details.username,
        email: details.email,
        password: details.password
    };

    if (details.role) {

        payload.role = details.role;

    }

    const result = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    const data = result?.data ?? {};
    const token = data.accessToken;

    if (token) {

        setAccessToken(token);

        currentUser = normaliseUser(data.user) ?? {
            username: details.username,
            email: details.email,
            role: details.role
        };

        notifyListeners();

        return {
            signedIn: true,
            user: currentUser
        };

    }

    return {
        signedIn: false,
        user: null
    };

}


/**
 * Confirm the in-memory token against the API. Useful after a reload if the
 * project later persists a token in a more secure mechanism.
 */
export async function fetchCurrentUser() {

    const result = await apiRequest('/api/auth/me');

    currentUser = normaliseUser(result?.data);

    notifyListeners();

    return currentUser;

}


export function logout() {

    clearAccessToken();

    currentUser = null;

    notifyListeners();

}
