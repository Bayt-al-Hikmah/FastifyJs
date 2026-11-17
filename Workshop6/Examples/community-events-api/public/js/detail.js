import {
    apiRequest,
    fetchCoverUrl
} from './api.js'

import {
    isOwner,
    rememberCoverUrl,
    state
} from './state.js'

import {
    categoryLabel,
    confirmAction,
    formatDateTime,
    qs,
    setMessage,
    showToast,
    statusLabel
} from './ui.js'


let onEdit = () => {}

let onChanged = () => {}


function updateCapacityText(event) {

    qs('#detail-capacity').textContent =
        `${event.registeredCount} of ${event.capacity} places filled` +
        (event.spotsLeft === 0 ? ' · Full' : '')

}


function updateActionButtons(event) {

    const owner = isOwner(event)
    const registered = state.registeredEventIds.has(event.id)
    const full = event.spotsLeft === 0

    const registerButton = qs('#detail-register')
    const cancelButton = qs('#detail-cancel')

    qs('#detail-owner-actions').hidden = !owner

    qs('#detail-publish').textContent =
        event.status === 'PUBLISHED'
            ? 'Unpublish'
            : 'Publish'

    registerButton.hidden = owner || registered
    registerButton.disabled = full
    registerButton.textContent =
        full ? 'Event full' : 'Register'

    cancelButton.hidden = owner || !registered

}


function loadDetailCover(event) {

    const cover = qs('#detail-cover')
    const image = qs('#detail-cover-img')

    if (!event.hasCover) {
        cover.hidden = true
        return
    }

    cover.hidden = false
    image.removeAttribute('src')
    image.alt = `Cover image for ${event.title}`

    fetchCoverUrl(event.id)
        .then((url) => {
            image.src = url
            rememberCoverUrl(url)
        })
        .catch(() => {
            cover.hidden = true
        })

}


export function openDetail(event) {

    state.selectedEvent = event

    setMessage(qs('#detail-message'), '')

    qs('#detail-title').textContent = event.title
    qs('#detail-description').textContent =
        event.description ?? ''
    qs('#detail-date').textContent =
        formatDateTime(event.startsAt)
    qs('#detail-location').textContent = event.location
    qs('#detail-organizer').textContent =
        `@${event.organizer.username}`

    qs('#detail-status').textContent =
        statusLabel(event.status)
    qs('#detail-status').className =
        `status-pill status-${event.status.toLowerCase()}`

    qs('#detail-category').textContent =
        categoryLabel(event.category)

    updateCapacityText(event)
    updateActionButtons(event)
    loadDetailCover(event)

    qs('#event-dialog').showModal()

}


async function register() {

    const event = state.selectedEvent


    if (!state.currentUser) {
        showToast(
            'Sign in to register for events.',
            'error'
        )
        return
    }


    const button = qs('#detail-register')
    const message = qs('#detail-message')

    button.disabled = true

    setMessage(message, 'Reserving your place…')

    try {

        await apiRequest(
            `/api/events/${event.id}/registrations`,
            { method: 'POST' }
        )

        state.registeredEventIds.add(event.id)

        event.registeredCount += 1
        event.spotsLeft = Math.max(
            event.capacity - event.registeredCount,
            0
        )

        updateCapacityText(event)
        updateActionButtons(event)

        setMessage(
            message,
            'You are registered. See you there!',
            'is-success'
        )

        showToast('Registration confirmed.')

        onChanged()

    } catch (error) {

        setMessage(
            message,
            error.message,
            'is-error'
        )

        button.disabled = false

    }

}


async function cancel() {

    const event = state.selectedEvent
    const message = qs('#detail-message')

    setMessage(message, 'Cancelling registration…')

    try {

        await apiRequest(
            `/api/events/${event.id}/registrations/me`,
            { method: 'DELETE' }
        )

        state.registeredEventIds.delete(event.id)

        event.registeredCount = Math.max(
            event.registeredCount - 1,
            0
        )
        event.spotsLeft = Math.max(
            event.capacity - event.registeredCount,
            0
        )

        updateCapacityText(event)
        updateActionButtons(event)

        setMessage(
            message,
            'Your registration has been cancelled.',
            'is-success'
        )

        showToast('Registration cancelled.')

        onChanged()

    } catch (error) {

        setMessage(
            message,
            error.message,
            'is-error'
        )

    }

}


async function togglePublish() {

    const event = state.selectedEvent

    const nextStatus = event.status === 'PUBLISHED'
        ? 'DRAFT'
        : 'PUBLISHED'

    try {

        await apiRequest(
            `/api/events/${event.id}`,
            {
                method: 'PATCH',
                body: JSON.stringify({
                    status: nextStatus
                })
            }
        )

        qs('#event-dialog').close()

        showToast(
            nextStatus === 'PUBLISHED'
                ? 'Event published.'
                : 'Event moved back to draft.'
        )

        onChanged()

    } catch (error) {

        setMessage(
            qs('#detail-message'),
            error.message,
            'is-error'
        )

    }

}


async function remove() {

    const event = state.selectedEvent

    const confirmed = confirmAction(
        `Delete "${event.title}"? This cannot be undone.`
    )

    if (!confirmed) {
        return
    }


    try {

        await apiRequest(
            `/api/events/${event.id}`,
            { method: 'DELETE' }
        )

        qs('#event-dialog').close()

        showToast('Event deleted.')

        onChanged()

    } catch (error) {

        setMessage(
            qs('#detail-message'),
            error.message,
            'is-error'
        )

    }

}


export function initDetail({ onEdit: editCallback, onChanged: changedCallback }) {

    onEdit = editCallback
    onChanged = changedCallback

    qs('#detail-close').addEventListener('click', () => {
        qs('#event-dialog').close()
    })

    qs('#detail-register').addEventListener(
        'click',
        register
    )

    qs('#detail-cancel').addEventListener(
        'click',
        cancel
    )

    qs('#detail-edit').addEventListener('click', () => {
        const event = state.selectedEvent

        qs('#event-dialog').close()

        onEdit(event)
    })

    qs('#detail-publish').addEventListener(
        'click',
        togglePublish
    )

    qs('#detail-delete').addEventListener(
        'click',
        remove
    )

}
