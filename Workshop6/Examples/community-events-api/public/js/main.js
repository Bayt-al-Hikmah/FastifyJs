import {
    clearSession,
    isOrganizer,
    state
} from './state.js'

import { initAuth } from './auth.js'
import { initGallery } from './events.js'
import {
    initOrganizer,
    loadMyEvents,
    openEditor
} from './organizer.js'
import {
    initMember,
    loadMyRegistrations
} from './member.js'
import {
    initDetail,
    openDetail
} from './detail.js'

import {
    qs,
    showToast
} from './ui.js'


let loadEvents = () => {}


function showDashboard(user) {

    qs('#auth-card').hidden = true
    qs('#welcome-card').hidden = false
    qs('#session-bar').hidden = false
    qs('#workspace').hidden = false

    const organizer = isOrganizer()

    qs('#host-button').hidden = !organizer
    qs('#welcome-host').hidden = !organizer

    qs('#session-user').textContent = user.username

    const roleBadge = qs('#session-role')

    roleBadge.textContent =
        user.role === 'ORGANIZER'
            ? 'Organizer'
            : 'Member'
    roleBadge.className =
        `role-badge role-${user.role.toLowerCase()}`

    qs('#welcome-title').textContent =
        `Hello, ${user.username}.`

    qs('#welcome-copy').textContent = organizer
        ? 'Ready to bring people together? Host an event, publish it, and watch the guest list grow.'
        : 'Browse upcoming events and claim your spot. Choose the organiser option when you register to host your own.'


    selectWorkspaceTab('events')

}


function showAuthView() {

    qs('#auth-card').hidden = false
    qs('#welcome-card').hidden = true
    qs('#session-bar').hidden = true
    qs('#host-button').hidden = true
    qs('#workspace').hidden = true

}


function selectWorkspaceTab(which) {

    const eventsActive = which === 'events'

    const eventsTab = qs('#tab-events')
    const registrationsTab = qs('#tab-registrations')

    eventsTab.classList.toggle('is-active', eventsActive)
    registrationsTab.classList.toggle('is-active', !eventsActive)

    eventsTab.setAttribute(
        'aria-selected',
        String(eventsActive)
    )
    registrationsTab.setAttribute(
        'aria-selected',
        String(!eventsActive)
    )

    qs('#panel-my-events').hidden = !eventsActive
    qs('#panel-my-registrations').hidden = eventsActive

}


function refreshDashboardData() {

    loadEvents(state.pagination?.page ?? 1)

    loadMyEvents()

    loadMyRegistrations()

}


async function handleAuthenticated(user, justRegistered) {

    showDashboard(user)

    await Promise.all([
        loadMyEvents(),
        loadMyRegistrations()
    ])

    loadEvents(state.pagination?.page ?? 1)


    if (!justRegistered) {
        showToast(`Welcome back, ${user.username}.`)
    }

}


function handleSignedOut() {

    clearSession()

    showAuthView()

    loadEvents(1)

    showToast('You have been signed out.')

}


function startApplication() {

    loadEvents = initGallery({
        onOpenDetail: openDetail
    })

    initAuth({
        onAuthenticated: handleAuthenticated
    })

    initOrganizer({
        onChanged: refreshDashboardData
    })

    initMember({
        onChanged: refreshDashboardData,
        onOpenDetail: openDetail
    })

    initDetail({
        onEdit: (event) => openEditor(event),
        onChanged: refreshDashboardData
    })


    qs('#logout-button').addEventListener(
        'click',
        handleSignedOut
    )

    qs('#host-button').addEventListener(
        'click',
        () => openEditor(null)
    )

    qs('#welcome-host').addEventListener(
        'click',
        () => openEditor(null)
    )

    qs('#tab-events').addEventListener(
        'click',
        () => selectWorkspaceTab('events')
    )

    qs('#tab-registrations').addEventListener(
        'click',
        () => selectWorkspaceTab('registrations')
    )


    showAuthView()

}


startApplication()
