import { apiRequest } from './api.js'

import {
    isOrganizer,
    state
} from './state.js'

import {
    categoryLabel,
    confirmAction,
    formatDate,
    makeElement,
    qs,
    setMessage,
    showLoading,
    showToast,
    statusLabel
} from './ui.js'


let notifyChanged = () => {}

let editingEvent = null


function toLocalInputValue(iso) {

    const date = new Date(iso)

    const pad = (value) => String(value).padStart(2, '0')

    return (
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-` +
        `${pad(date.getDate())}T${pad(date.getHours())}:` +
        `${pad(date.getMinutes())}`
    )

}


function defaultStartValue() {

    const date = new Date()

    date.setDate(date.getDate() + 7)
    date.setHours(18, 0, 0, 0)

    return toLocalInputValue(date.toISOString())

}


function toIso(localValue) {

    return new Date(localValue).toISOString()

}


function describeError(error) {

    const details = error.details?.length
        ? ` ${error.details
            .map((item) => `${item.field}: ${item.message}`)
            .join(' ')}`
        : ''

    return `${error.message}${details}`

}


function renderMyEvents(events) {

    const list = qs('#my-events-list')

    if (events.length === 0) {

        const empty = makeElement('li', 'empty-state')

        empty.append(
            makeElement('h3', '', 'No events yet')
        )
        empty.append(
            makeElement(
                'p',
                '',
                'Host your first event and it will appear here as a draft.'
            )
        )

        list.replaceChildren(empty)

        return

    }


    const items = events.map((event) => {

        const item = makeElement('li', 'manage-item')

        const main = makeElement('div', 'manage-main')

        const meta = makeElement('div', 'manage-meta')

        meta.append(
            makeElement(
                'span',
                `status-pill status-${event.status.toLowerCase()}`,
                statusLabel(event.status)
            )
        )
        meta.append(
            makeElement(
                'span',
                'category-pill',
                categoryLabel(event.category)
            )
        )

        main.append(meta)

        main.append(
            makeElement('h3', 'manage-title', event.title)
        )

        main.append(
            makeElement(
                'p',
                'manage-sub',
                `${formatDate(event.startsAt)} · ${event.location}`
            )
        )

        main.append(
            makeElement(
                'p',
                'manage-sub',
                `${event.registeredCount} of ${event.capacity} places filled`
            )
        )

        item.append(main)


        const actions = makeElement('div', 'manage-actions')

        const editButton = makeElement(
            'button',
            'button button-quiet button-small',
            'Edit'
        )
        editButton.type = 'button'
        editButton.addEventListener('click', () => {
            openEditor(event)
        })

        const publishButton = makeElement(
            'button',
            'button button-small',
            event.status === 'PUBLISHED'
                ? 'Unpublish'
                : 'Publish'
        )
        publishButton.type = 'button'
        publishButton.addEventListener('click', () => {
            togglePublish(event)
        })

        const deleteButton = makeElement(
            'button',
            'button button-danger button-small',
            'Delete'
        )
        deleteButton.type = 'button'
        deleteButton.addEventListener('click', () => {
            removeEvent(event)
        })

        actions.append(
            editButton,
            publishButton,
            deleteButton
        )

        item.append(actions)

        return item

    })


    list.replaceChildren(...items)

}


export async function loadMyEvents() {

    const list = qs('#my-events-list')


    if (!state.currentUser) {
        list.replaceChildren()
        return
    }


    showLoading(list, 'Loading your events…')

    try {

        const result = await apiRequest(
            '/api/me/events?limit=50'
        )

        state.myEvents = result.data.events

        renderMyEvents(result.data.events)

    } catch (error) {

        const failure = makeElement('li', 'empty-state')

        failure.append(
            makeElement('h3', '', 'Could not load your events')
        )
        failure.append(
            makeElement('p', '', error.message)
        )

        list.replaceChildren(failure)

    }

}


async function togglePublish(event) {

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

        showToast(
            nextStatus === 'PUBLISHED'
                ? 'Event published — it is now visible to everyone.'
                : 'Event moved back to draft.'
        )

        await loadMyEvents()

        notifyChanged()

    } catch (error) {

        showToast(error.message, 'error')

    }

}


async function removeEvent(event) {

    const confirmed = confirmAction(
        `Delete "${event.title}"? Registrations and its cover will be removed too.`
    )

    if (!confirmed) {
        return
    }


    try {

        await apiRequest(
            `/api/events/${event.id}`,
            { method: 'DELETE' }
        )

        showToast('Event deleted.')

        await loadMyEvents()

        notifyChanged()

    } catch (error) {

        showToast(error.message, 'error')

    }

}


export function openEditor(event = null) {

    if (!isOrganizer()) {

        showToast(
            'Only organiser accounts can host events.',
            'error'
        )

        return

    }


    editingEvent = event

    qs('#editor-form').reset()

    setMessage(qs('#editor-message'), '')

    const isEdit = event !== null

    qs('#editor-kicker').textContent =
        isEdit ? 'Edit event' : 'New event'

    qs('#editor-heading').textContent =
        isEdit ? event.title : 'Host an event'

    qs('#editor-submit').textContent =
        isEdit ? 'Save changes' : 'Create draft'

    qs('#editor-status-field').hidden = !isEdit
    qs('#editor-cover-field').hidden = !isEdit
    qs('#editor-remove-cover').hidden =
        !(isEdit && event.hasCover)


    if (isEdit) {

        qs('#editor-title').value = event.title
        qs('#editor-description').value =
            event.description ?? ''
        qs('#editor-location').value = event.location
        qs('#editor-startsAt').value =
            toLocalInputValue(event.startsAt)
        qs('#editor-capacity').value =
            String(event.capacity)
        qs('#editor-category').value = event.category
        qs('#editor-status').value = event.status

    } else {

        qs('#editor-category').value = 'COMMUNITY'
        qs('#editor-startsAt').value = defaultStartValue()

    }


    qs('#editor-dialog').showModal()

    qs('#editor-title').focus()

}


async function handleEditorSubmit(submitEvent) {

    submitEvent.preventDefault()

    const isEdit = editingEvent !== null

    const submit = qs('#editor-submit')
    const message = qs('#editor-message')

    submit.disabled = true

    setMessage(message, isEdit ? 'Saving changes…' : 'Creating draft…')


    const payload = {

        title: qs('#editor-title').value.trim(),

        description: qs('#editor-description').value.trim(),

        location: qs('#editor-location').value.trim(),

        startsAt: toIso(qs('#editor-startsAt').value),

        capacity: Number(qs('#editor-capacity').value),

        category: qs('#editor-category').value

    }


    if (isEdit) {
        payload.status = qs('#editor-status').value
    }


    try {

        let savedEvent


        if (isEdit) {

            const result = await apiRequest(
                `/api/events/${editingEvent.id}`,
                {
                    method: 'PATCH',
                    body: JSON.stringify(payload)
                }
            )

            savedEvent = result.data.event

        } else {

            const result = await apiRequest(
                '/api/events',
                {
                    method: 'POST',
                    body: JSON.stringify(payload)
                }
            )

            savedEvent = result.data.event

        }


        const file = qs('#editor-cover').files[0]


        if (isEdit && file) {

            setMessage(message, 'Uploading cover image…')

            const formData = new FormData()

            formData.append('cover', file)

            await apiRequest(
                `/api/events/${savedEvent.id}/cover`,
                {
                    method: 'PUT',
                    body: formData
                }
            )

        }


        qs('#editor-dialog').close()

        editingEvent = null

        showToast(
            isEdit
                ? 'Event updated.'
                : 'Draft created — publish it when you are ready.'
        )

        await loadMyEvents()

        notifyChanged()

    } catch (error) {

        setMessage(
            message,
            describeError(error),
            'is-error'
        )

    } finally {

        submit.disabled = false

    }

}


async function handleRemoveCover() {

    if (!editingEvent) {
        return
    }


    const confirmed = confirmAction(
        'Remove the current cover image?'
    )

    if (!confirmed) {
        return
    }


    const message = qs('#editor-message')

    setMessage(message, 'Removing cover…')

    try {

        await apiRequest(
            `/api/events/${editingEvent.id}/cover`,
            { method: 'DELETE' }
        )

        editingEvent = {
            ...editingEvent,
            hasCover: false
        }

        qs('#editor-remove-cover').hidden = true
        qs('#editor-cover').value = ''

        setMessage(
            message,
            'Cover image removed.',
            'is-success'
        )

        await loadMyEvents()

        notifyChanged()

    } catch (error) {

        setMessage(
            message,
            describeError(error),
            'is-error'
        )

    }

}


export function initOrganizer({ onChanged }) {

    notifyChanged = onChanged

    qs('#editor-form').addEventListener(
        'submit',
        handleEditorSubmit
    )

    qs('#editor-close').addEventListener('click', () => {
        qs('#editor-dialog').close()
    })

    qs('#editor-cancel').addEventListener('click', () => {
        qs('#editor-dialog').close()
    })

    qs('#editor-remove-cover').addEventListener(
        'click',
        handleRemoveCover
    )

}
