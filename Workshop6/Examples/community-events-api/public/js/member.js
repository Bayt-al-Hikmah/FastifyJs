import { apiRequest } from './api.js'

import { state } from './state.js'

import {
    confirmAction,
    formatDate,
    formatDateTime,
    makeElement,
    qs,
    showLoading,
    showToast
} from './ui.js'


let notifyChanged = () => {}

let openEventDetail = () => {}


function renderRegistrations(registrations) {

    const list = qs('#my-registrations-list')


    if (registrations.length === 0) {

        const empty = makeElement('li', 'empty-state')

        empty.append(
            makeElement('h3', '', 'No registrations yet')
        )
        empty.append(
            makeElement(
                'p',
                '',
                'Find an event in the gallery and claim your spot.'
            )
        )

        list.replaceChildren(empty)

        return

    }


    const items = registrations.map((registration) => {

        const event = registration.event

        const item = makeElement('li', 'manage-item')

        const main = makeElement('div', 'manage-main')

        main.append(
            makeElement(
                'h3',
                'manage-title',
                event.title
            )
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
                `Registered ${formatDateTime(registration.registeredAt)}`
            )
        )

        item.append(main)


        const actions = makeElement('div', 'manage-actions')

        const viewButton = makeElement(
            'button',
            'button button-quiet button-small',
            'View'
        )
        viewButton.type = 'button'
        viewButton.addEventListener('click', () => {
            openEventDetail(event)
        })

        const cancelButton = makeElement(
            'button',
            'button button-danger button-small',
            'Cancel'
        )
        cancelButton.type = 'button'
        cancelButton.addEventListener('click', () => {
            cancelRegistration(event)
        })

        actions.append(viewButton, cancelButton)

        item.append(actions)

        return item

    })


    list.replaceChildren(...items)

}


export async function loadMyRegistrations() {

    const list = qs('#my-registrations-list')


    if (!state.currentUser) {
        list.replaceChildren()
        return
    }


    showLoading(list, 'Loading your registrations…')

    try {

        const result = await apiRequest(
            '/api/me/registrations'
        )

        state.registrations = result.data.registrations

        state.registeredEventIds = new Set(
            result.data.registrations.map(
                (registration) => registration.event.id
            )
        )

        renderRegistrations(result.data.registrations)

    } catch (error) {

        const failure = makeElement('li', 'empty-state')

        failure.append(
            makeElement(
                'h3',
                '',
                'Could not load registrations'
            )
        )
        failure.append(
            makeElement('p', '', error.message)
        )

        list.replaceChildren(failure)

    }

}


async function cancelRegistration(event) {

    const confirmed = confirmAction(
        `Cancel your registration for "${event.title}"?`
    )

    if (!confirmed) {
        return
    }


    try {

        await apiRequest(
            `/api/events/${event.id}/registrations/me`,
            { method: 'DELETE' }
        )

        showToast('Registration cancelled.')

        await loadMyRegistrations()

        notifyChanged()

    } catch (error) {

        showToast(error.message, 'error')

    }

}


export function initMember({ onChanged, onOpenDetail }) {

    notifyChanged = onChanged

    openEventDetail = onOpenDetail

}
