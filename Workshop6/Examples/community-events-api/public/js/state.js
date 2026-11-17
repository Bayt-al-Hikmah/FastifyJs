import {
    clearAccessToken,
    setAccessToken
} from './api.js'


export const state = {

    currentUser: null,

    events: [],

    pagination: null,

    myEvents: [],

    registrations: [],

    registeredEventIds: new Set(),

    selectedEvent: null,

    coverUrls: []

}


export function setSession(user, token) {

    state.currentUser = user

    setAccessToken(token)

}


export function clearSession() {

    state.currentUser = null

    state.registeredEventIds = new Set()

    clearAccessToken()

}


export function isSignedIn() {

    return state.currentUser !== null

}


export function isOrganizer() {

    return state.currentUser?.role === 'ORGANIZER'

}


export function isOwner(event) {

    return (
        state.currentUser !== null &&
        event?.organizer?.id === state.currentUser.id
    )

}


export function rememberCoverUrl(url) {

    state.coverUrls.push(url)

}


export function releaseCoverUrls() {

    for (const url of state.coverUrls) {
        URL.revokeObjectURL(url)
    }

    state.coverUrls = []

}
