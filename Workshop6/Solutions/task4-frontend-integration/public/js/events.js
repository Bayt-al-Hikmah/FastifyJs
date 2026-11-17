import { apiRequest, apiFetchBlob } from './api.js';
import { isAuthenticated, getUserId } from './auth.js';
import {
    toast,
    renderApiError,
    clearError,
    setInlineMessage,
    setButtonBusy,
    toDateTimeLocalValue,
    toIsoString,
    formatDateTime,
    formatShortDate,
    titleCase
} from './ui.js';


/**
 * Event gallery, organiser studio, and detail dialog.
 *
 * This module owns every DOM update that depends on event data. It talks to the
 * Community Events API through apiRequest(), which means the same token/JSON/204
 * handling applies to all operations. No page navigation is used: after a write
 * we refresh only the affected parts of the interface.
 */


const DEFAULT_COVER_PLACEHOLDER = 'No cover image yet';

let dom = {};
let hooks = {};

let events = [];
let myEvents = [];
let registeredEventIds = new Set();

let filters = {
    search: '',
    category: '',
    scope: 'all'
};

let selectedEvent = null;
let editingEventId = null;

let detailCoverUrl = null;
let coverGeneration = 0;

const cardCoverUrls = new Set();


/* -------------------------------------------------------------------------
   Small normalisation helpers — API variants may shape envelopes slightly
   differently, so we read defensively and never trust a field to exist.
   ------------------------------------------------------------------------- */


function extractEvents(result) {

    const data = result?.data ?? {};

    if (Array.isArray(data)) {

        return data;

    }

    if (Array.isArray(data.events)) {

        return data.events;

    }

    if (Array.isArray(result?.events)) {

        return result.events;

    }

    return [];

}


function eventId(event) {

    return Number(event?.id ?? event?.eventId ?? 0);

}


function hasCover(event) {

    return Boolean(
        event?.cover?.id ||
        event?.coverUrl ||
        event?.coverId ||
        event?.hasCover
    );

}


function organizerIdOf(event) {

    const organizer = event?.organizer ?? event?.organiser;

    return Number(
        organizer?.id ??
        event?.organizerId ??
        event?.organiserId ??
        0
    );

}


function organizerNameOf(event) {

    const organizer = event?.organizer ?? event?.organiser;

    return organizer?.username ?? organizer?.name ?? 'Community member';

}


function isOwnEvent(event) {

    const id = eventId(event);

    if (myEvents.some((item) => eventId(item) === id)) {

        return true;

    }

    const organizer = organizerIdOf(event);
    const userId = getUserId();

    return Boolean(userId && organizer && organizer === userId);

}


function statusClass(status) {

    return `status-pill status-${String(status ?? 'DRAFT').toLowerCase()}`;

}


/* -------------------------------------------------------------------------
   DOM construction helpers
   ------------------------------------------------------------------------- */


function createPill(className, text) {

    const pill = document.createElement('span');

    pill.className = className;
    pill.textContent = text;

    return pill;

}


function createMetaRow(iconText, value) {

    const row = document.createElement('p');

    row.className = 'meta-row';

    const icon = document.createElement('span');

    icon.className = 'meta-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = iconText;

    const text = document.createElement('span');

    text.textContent = value;

    row.append(icon, text);

    return row;

}


function stateElement(message, kind) {

    const wrapper = document.createElement('div');

    wrapper.className = `state-message state-${kind}`;

    const icon = document.createElement('span');

    icon.className = 'state-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = kind === 'error' ? '!' : kind === 'loading' ? '…' : '✦';

    const text = document.createElement('p');

    text.textContent = message;

    wrapper.append(icon, text);

    return wrapper;

}


/* -------------------------------------------------------------------------
   Cover images
   ------------------------------------------------------------------------- */


function revokeCardCovers() {

    for (const url of cardCoverUrls) {

        URL.revokeObjectURL(url);

    }

    cardCoverUrls.clear();

}


/**
 * Cover downloads are authenticated, so an <img src> would receive a 401. Fetch
 * the bytes with the Bearer token and use an object URL instead.
 */
async function loadCoverIntoImage(id, image, generation) {

    const blob = await apiFetchBlob(`/api/events/${id}/cover`);
    const url = URL.createObjectURL(blob);

    if (generation !== coverGeneration) {

        URL.revokeObjectURL(url);

        return;

    }

    cardCoverUrls.add(url);
    image.src = url;
    image.hidden = false;

    const placeholder = image.parentElement?.querySelector('.card-cover-placeholder');

    if (placeholder) {

        placeholder.hidden = true;

    }

}


function resetDetailCover() {

    if (detailCoverUrl) {

        URL.revokeObjectURL(detailCoverUrl);
        detailCoverUrl = null;

    }

    dom.detailCover.removeAttribute('src');
    dom.detailCover.hidden = true;

    dom.detailCoverPlaceholder.hidden = false;
    dom.detailCoverPlaceholder.textContent = DEFAULT_COVER_PLACEHOLDER;

    dom.coverRemoveButton.hidden = true;

}


async function loadDetailCover(id) {

    const generation = coverGeneration;

    try {

        const blob = await apiFetchBlob(`/api/events/${id}/cover`);
        const url = URL.createObjectURL(blob);

        if (generation !== coverGeneration) {

            URL.revokeObjectURL(url);

            return;

        }

        detailCoverUrl = url;
        dom.detailCover.src = url;
        dom.detailCover.hidden = false;
        dom.detailCoverPlaceholder.hidden = true;

        if (isOwnEvent(selectedEvent)) {

            dom.coverRemoveButton.hidden = false;

        }

    } catch (error) {

        if (generation !== coverGeneration) {

            return;

        }

        dom.detailCover.hidden = true;
        dom.detailCoverPlaceholder.hidden = false;
        dom.detailCoverPlaceholder.textContent = isAuthenticated()
            ? 'Cover unavailable'
            : 'Sign in to view this cover';

    }

}


/* -------------------------------------------------------------------------
   Gallery rendering
   ------------------------------------------------------------------------- */


function createEventCard(event) {

    const id = eventId(event);

    const article = document.createElement('article');

    article.className = 'event-card';
    article.dataset.eventId = String(id);

    const cover = document.createElement('div');

    cover.className = 'card-cover';

    const placeholder = document.createElement('div');

    placeholder.className = 'card-cover-placeholder';
    placeholder.setAttribute('aria-hidden', 'true');
    placeholder.textContent = String(event.category ?? 'OTHER').slice(0, 1);

    cover.append(placeholder);

    if (hasCover(event)) {

        const image = document.createElement('img');

        image.className = 'cover-image';
        image.alt = `Cover image for ${event.title ?? 'event'}`;
        image.loading = 'lazy';
        image.hidden = true;

        cover.append(image);

        const generation = coverGeneration;

        loadCoverIntoImage(id, image, generation).catch(() => {

            image.hidden = true;
            placeholder.hidden = false;

        });

    }

    const body = document.createElement('div');

    body.className = 'card-body';

    const header = document.createElement('div');

    header.className = 'card-header';

    const badges = document.createElement('div');

    badges.className = 'card-badges';

    badges.append(
        createPill('category-pill', titleCase(event.category)),
        createPill(statusClass(event.status), titleCase(event.status))
    );

    const title = document.createElement('h3');

    title.className = 'card-title';
    title.textContent = event.title ?? 'Untitled event';

    const description = document.createElement('p');

    description.className = 'card-description';
    description.textContent = event.description ?? '';

    const meta = document.createElement('div');

    meta.className = 'card-meta';

    const capacity = Number(event.capacity ?? 0);
    const registered = Number(event.registeredCount ?? 0);

    meta.append(
        createMetaRow('◷', formatDateTime(event.startsAt)),
        createMetaRow('⌖', event.location ?? 'Location to be announced'),
        createMetaRow('◉', `${registered} / ${capacity} places taken`)
    );

    header.append(badges, title, description);
    body.append(header, meta);

    const footer = document.createElement('div');

    footer.className = 'card-footer';

    const organizer = document.createElement('span');

    organizer.className = 'organizer';
    organizer.textContent = `by ${organizerNameOf(event)}`;

    const viewButton = document.createElement('button');

    viewButton.className = 'button button-quiet button-small card-cta';
    viewButton.type = 'button';
    viewButton.textContent = 'View details →';
    viewButton.dataset.action = 'view';

    footer.append(organizer, viewButton);
    article.append(cover, body, footer);

    return article;

}


function renderEvents() {

    coverGeneration += 1;

    revokeCardCovers();

    dom.eventsGrid.replaceChildren();

    if (events.length === 0) {

        const message = filters.scope === 'mine'
            ? 'You have not created any events yet.'
            : 'No events match your search. Try a different term or category.';

        dom.eventsGrid.append(stateElement(message, 'empty'));

        return;

    }

    const fragment = document.createDocumentFragment();

    for (const event of events) {

        fragment.append(createEventCard(event));

    }

    dom.eventsGrid.append(fragment);

}


export async function loadEvents() {

    if (filters.scope === 'mine' && !isAuthenticated()) {

        events = [];
        renderEvents();
        dom.resultsCount.textContent = 'Sign in to see your own events.';
        dom.eventsGrid.replaceChildren(
            stateElement('Sign in to browse and manage your own events.', 'empty')
        );

        return;

    }

    dom.eventsGrid.replaceChildren(
        stateElement('Loading events from the API…', 'loading')
    );

    const query = new URLSearchParams();

    if (filters.search.trim()) {

        query.set('search', filters.search.trim());

    }

    if (filters.category) {

        query.set('category', filters.category);

    }

    query.set('limit', '24');

    const path = filters.scope === 'mine'
        ? '/api/me/events'
        : '/api/events';

    try {

        const result = await apiRequest(`${path}?${query.toString()}`);

        events = extractEvents(result);

        renderEvents();

        const label = events.length === 1 ? 'event' : 'events';
        const scopeLabel = filters.scope === 'mine' ? 'in your collection' : 'published';

        dom.resultsCount.textContent = `${events.length} ${label} ${scopeLabel}.`;
        dom.statEvents.textContent = String(events.length);

    } catch (error) {

        events = [];
        dom.eventsGrid.replaceChildren(stateElement(error.message, 'error'));
        dom.resultsCount.textContent = 'Could not load events.';

        if (error.status === 401) {

            hooks.onUnauthorized?.(error);

        }

    }

}


/* -------------------------------------------------------------------------
   Organiser collection and edit form
   ------------------------------------------------------------------------- */


function renderMyEvents() {

    dom.myEventsCount.textContent = String(myEvents.length);
    dom.myEventsList.replaceChildren();

    if (!isAuthenticated()) {

        dom.myEventsList.append(
            stateElement('Sign in to manage your events.', 'empty')
        );

        return;

    }

    if (myEvents.length === 0) {

        dom.myEventsList.append(
            stateElement('No events yet. Create your first draft above.', 'empty')
        );

        return;

    }

    for (const event of myEvents) {

        const id = eventId(event);

        const item = document.createElement('li');

        item.className = 'my-event-item';
        item.dataset.eventId = String(id);

        const main = document.createElement('button');

        main.className = 'my-event-main';
        main.type = 'button';
        main.dataset.action = 'view';

        const title = document.createElement('strong');

        title.className = 'my-event-title';
        title.textContent = event.title ?? 'Untitled event';

        const sub = document.createElement('span');

        sub.className = 'my-event-sub';
        sub.textContent = `${titleCase(event.status)} · ${formatShortDate(event.startsAt)}`;

        main.append(title, sub);

        const actions = document.createElement('div');

        actions.className = 'my-event-actions';

        const editButton = document.createElement('button');

        editButton.className = 'button button-quiet button-small';
        editButton.type = 'button';
        editButton.textContent = 'Edit';
        editButton.dataset.action = 'edit';

        const deleteButton = document.createElement('button');

        deleteButton.className = 'button button-danger button-small';
        deleteButton.type = 'button';
        deleteButton.textContent = 'Delete';
        deleteButton.dataset.action = 'delete';

        actions.append(editButton, deleteButton);
        item.append(main, actions);
        dom.myEventsList.append(item);

    }

}


export async function loadMyEvents() {

    if (!isAuthenticated()) {

        myEvents = [];
        renderMyEvents();
        dom.statMine.textContent = '0';

        return;

    }

    try {

        const result = await apiRequest('/api/me/events');

        myEvents = extractEvents(result);

    } catch (error) {

        myEvents = [];

        if (error.status === 401) {

            hooks.onUnauthorized?.(error);

        }

    }

    renderMyEvents();
    dom.statMine.textContent = String(myEvents.length);

}


async function loadMyRegistrations() {

    if (!isAuthenticated()) {

        registeredEventIds.clear();

        return;

    }

    try {

        const result = await apiRequest('/api/me/registrations');

        const data = result?.data ?? {};

        const list = Array.isArray(data)
            ? data
            : Array.isArray(data.registrations)
                ? data.registrations
                : [];

        registeredEventIds = new Set(
            list
                .map((item) => Number(item.eventId ?? item.event?.id ?? item.id))
                .filter((id) => Number.isFinite(id) && id > 0)
        );

    } catch (error) {

        registeredEventIds.clear();

    }

}


export async function refreshAll() {

    await Promise.all([
        loadEvents(),
        loadMyEvents(),
        loadMyRegistrations()
    ]);

}


export function clearEditForm() {

    editingEventId = null;
    dom.editForm.reset();
    dom.editPanel.hidden = true;
    clearError(dom.editError);

}


function fillEditForm(event) {

    editingEventId = eventId(event);

    dom.editTitle.value = event.title ?? '';
    dom.editDescription.value = event.description ?? '';
    dom.editLocation.value = event.location ?? '';
    dom.editStartsAt.value = toDateTimeLocalValue(event.startsAt);
    dom.editCapacity.value = String(event.capacity ?? 1);
    dom.editCategory.value = String(event.category ?? 'OTHER');
    dom.editStatus.value = String(event.status ?? 'DRAFT');

    clearError(dom.editError);
    dom.editPanel.hidden = false;
    dom.editPanel.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
    });
    dom.editTitle.focus();

}


function editEvent(id) {

    const event = myEvents.find((item) => eventId(item) === Number(id))
        ?? events.find((item) => eventId(item) === Number(id));

    if (!event) {

        toast('That event is no longer available.', 'error');

        return;

    }

    fillEditForm(event);

}


/* -------------------------------------------------------------------------
   Create / update / delete
   ------------------------------------------------------------------------- */


export async function createEvent(payload, submitButton) {

    setButtonBusy(submitButton, true, 'Creating…');

    try {

        const result = await apiRequest('/api/events', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        toast('Draft event created. Publish it when it is ready.', 'success');

        await refreshAll();

        return result;

    } catch (error) {

        if (error.status === 401) {

            hooks.onUnauthorized?.(error);

        }

        throw error;

    } finally {

        setButtonBusy(submitButton, false);

    }

}


async function submitEdit() {

    if (!editingEventId) {

        return;

    }

    const payload = {
        title: dom.editTitle.value.trim(),
        description: dom.editDescription.value.trim(),
        location: dom.editLocation.value.trim(),
        startsAt: toIsoString(dom.editStartsAt.value),
        capacity: Number(dom.editCapacity.value),
        category: dom.editCategory.value,
        status: dom.editStatus.value
    };

    setButtonBusy(dom.editSubmitButton, true, 'Saving…');

    try {

        await apiRequest(`/api/events/${editingEventId}`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
        });

        toast('Event updated.', 'success');

        clearEditForm();
        await refreshAll();

    } catch (error) {

        renderApiError(error, dom.editError, dom.editForm);

        if (error.status === 401) {

            hooks.onUnauthorized?.(error);

        }

    } finally {

        setButtonBusy(dom.editSubmitButton, false);

    }

}


async function deleteEvent(id) {

    const shouldDelete = window.confirm(
        'Delete this event permanently? This action cannot be undone.'
    );

    if (!shouldDelete) {

        return;

    }

    try {

        await apiRequest(`/api/events/${id}`, {
            method: 'DELETE'
        });

        toast('Event deleted.', 'success');

        closeDetail();

        if (editingEventId === Number(id)) {

            clearEditForm();

        }

        await refreshAll();

    } catch (error) {

        renderApiError(error, dom.detailError);

    }

}


async function toggleStatus() {

    const event = selectedEvent;

    if (!event) {

        return;

    }

    const current = String(event.status ?? 'DRAFT').toUpperCase();
    const next = current === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';

    setButtonBusy(dom.detailStatusButton, true, 'Saving…');

    try {

        await apiRequest(`/api/events/${eventId(event)}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: next })
        });

        toast(
            next === 'PUBLISHED'
                ? 'Event published. It is now visible to visitors.'
                : 'Event moved back to drafts.',
            'success'
        );

        closeDetail();
        await refreshAll();

    } catch (error) {

        renderApiError(error, dom.detailError);

    } finally {

        setButtonBusy(dom.detailStatusButton, false);

    }

}


/* -------------------------------------------------------------------------
   Cover upload via FormData
   ------------------------------------------------------------------------- */


async function uploadCover() {

    const event = selectedEvent;

    if (!event) {

        return;

    }

    const file = dom.coverInput.files?.[0];

    if (!file) {

        setInlineMessage(
            dom.coverMessage,
            'Choose a JPEG, PNG, or WebP image first.',
            'error'
        );

        return;

    }

    const formData = new FormData();

    formData.append('cover', file);

    clearError(dom.coverMessage);
    setButtonBusy(dom.coverUploadButton, true, 'Uploading…');

    try {

        await apiRequest(`/api/events/${eventId(event)}/cover`, {
            method: 'PUT',
            body: formData
        });

        dom.coverInput.value = '';

        toast('Cover uploaded.', 'success');
        setInlineMessage(dom.coverMessage, 'Cover uploaded successfully.', 'success');

        resetDetailCover();
        await loadDetailCover(eventId(event));
        await refreshAll();

    } catch (error) {

        renderApiError(error, dom.coverMessage);

    } finally {

        setButtonBusy(dom.coverUploadButton, false);

    }

}


async function removeCover() {

    const event = selectedEvent;

    if (!event) {

        return;

    }

    setButtonBusy(dom.coverRemoveButton, true, 'Removing…');

    try {

        await apiRequest(`/api/events/${eventId(event)}/cover`, {
            method: 'DELETE'
        });

        toast('Cover removed.', 'success');

        resetDetailCover();
        await refreshAll();

    } catch (error) {

        renderApiError(error, dom.coverMessage);

    } finally {

        setButtonBusy(dom.coverRemoveButton, false);

    }

}


/* -------------------------------------------------------------------------
   Registrations (a natural companion to the Task 4 event dashboard)
   ------------------------------------------------------------------------- */


async function toggleRegistration(isRegistered) {

    const event = selectedEvent;

    if (!event) {

        return;

    }

    if (!isAuthenticated()) {

        hooks.onRequireAuth?.();

        return;

    }

    const id = eventId(event);

    const path = isRegistered
        ? `/api/events/${id}/registrations/me`
        : `/api/events/${id}/registrations`;

    const button = isRegistered
        ? dom.detailCancelButton
        : dom.detailRegisterButton;

    setButtonBusy(button, true, 'Please wait…');

    try {

        await apiRequest(path, {
            method: isRegistered ? 'DELETE' : 'POST'
        });

        toast(
            isRegistered
                ? 'Your registration was cancelled.'
                : 'You are registered for this event.',
            'success'
        );

        closeDetail();
        await loadMyRegistrations();
        await loadEvents();

    } catch (error) {

        renderApiError(error, dom.detailError);

    } finally {

        setButtonBusy(button, false);

    }

}


/* -------------------------------------------------------------------------
   Detail dialog
   ------------------------------------------------------------------------- */


function updateRegistrationButtons(event) {

    const id = eventId(event);
    const registered = registeredEventIds.has(id);
    const own = isOwnEvent(event);
    const published = String(event.status ?? 'DRAFT').toUpperCase() === 'PUBLISHED';

    dom.detailRegisterButton.hidden = registered || !published;
    dom.detailCancelButton.hidden = !registered;

    dom.detailRegisterButton.textContent = 'Register for this event';
    dom.detailCancelButton.textContent = 'Cancel my registration';

    if (own) {

        dom.detailRsvpHint.textContent = 'This is one of your events.';

    } else if (!isAuthenticated()) {

        dom.detailRsvpHint.textContent = 'Sign in to register for events.';

    } else if (!published) {

        dom.detailRsvpHint.textContent = 'Draft events are not open for registration.';

    } else {

        dom.detailRsvpHint.textContent = registered
            ? 'You are registered for this event.'
            : 'Registration is handled by the API.';

    }

}


function openDetail(event) {

    selectedEvent = event;
    coverGeneration += 1;

    dom.detailTitle.textContent = event.title ?? 'Untitled event';
    dom.detailDescription.textContent = event.description ?? '';
    dom.detailWhen.textContent = formatDateTime(event.startsAt);
    dom.detailWhere.textContent = event.location ?? 'Location to be announced';

    const capacity = Number(event.capacity ?? 0);
    const registered = Number(event.registeredCount ?? 0);

    dom.detailCapacity.textContent = `${registered} of ${capacity} places taken`;
    dom.detailOrganizer.textContent = organizerNameOf(event);

    dom.detailStatus.className = statusClass(event.status);
    dom.detailStatus.textContent = titleCase(event.status);
    dom.detailCategory.className = 'category-pill';
    dom.detailCategory.textContent = titleCase(event.category);

    dom.detailStatusButton.textContent = String(event.status ?? 'DRAFT').toUpperCase() === 'PUBLISHED'
        ? 'Move to drafts'
        : 'Publish event';

    clearError(dom.detailError);
    clearError(dom.coverMessage);

    dom.coverInput.value = '';

    const own = isOwnEvent(event);

    dom.detailOwnActions.hidden = !own;
    dom.coverSection.hidden = !own;
    dom.detailPublicActions.hidden = own;

    if (!own) {

        updateRegistrationButtons(event);

    }

    resetDetailCover();

    if (hasCover(event)) {

        loadDetailCover(eventId(event));

    }

    if (typeof dom.dialog.showModal === 'function') {

        dom.dialog.showModal();

    } else {

        dom.dialog.setAttribute('open', '');

    }

    dom.dialogCloseButton.focus();

}


export function closeDetail() {

    coverGeneration += 1;

    if (detailCoverUrl) {

        URL.revokeObjectURL(detailCoverUrl);
        detailCoverUrl = null;

    }

    if (typeof dom.dialog.close === 'function') {

        dom.dialog.close();

    } else {

        dom.dialog.removeAttribute('open');

    }

    selectedEvent = null;

}


async function fetchEventById(id) {

    const known = myEvents.find((item) => eventId(item) === id)
        ?? events.find((item) => eventId(item) === id);

    if (known) {

        return known;

    }

    try {

        const result = await apiRequest(`/api/events/${id}`);

        return result?.data?.event ?? result?.data ?? null;

    } catch {

        return null;

    }

}


export async function selectEvent(id) {

    const numericId = Number(id);

    let event = await fetchEventById(numericId);

    if (!event) {

        toast('That event could not be found.', 'error');

        return;

    }

    openDetail(event);

}


/* -------------------------------------------------------------------------
   Initial wiring
   ------------------------------------------------------------------------- */


export function initEvents(options = {}) {

    hooks = options;

    dom = {
        eventsGrid: document.querySelector('#events-grid'),
        resultsCount: document.querySelector('#results-count'),
        statEvents: document.querySelector('#stat-events'),
        statMine: document.querySelector('#stat-mine'),

        myEventsList: document.querySelector('#my-events-list'),
        myEventsCount: document.querySelector('#my-events-count'),

        editPanel: document.querySelector('#edit-panel'),
        editForm: document.querySelector('#edit-form'),
        editTitle: document.querySelector('#edit-title'),
        editDescription: document.querySelector('#edit-description'),
        editLocation: document.querySelector('#edit-location'),
        editStartsAt: document.querySelector('#edit-starts-at'),
        editCapacity: document.querySelector('#edit-capacity'),
        editCategory: document.querySelector('#edit-category'),
        editStatus: document.querySelector('#edit-status'),
        editError: document.querySelector('#edit-error'),
        editSubmitButton: document.querySelector('#edit-submit-button'),
        editCancelButton: document.querySelector('#edit-cancel-button'),

        dialog: document.querySelector('#event-dialog'),
        dialogCloseButton: document.querySelector('#dialog-close-button'),
        detailTitle: document.querySelector('#detail-title'),
        detailStatus: document.querySelector('#detail-status'),
        detailCategory: document.querySelector('#detail-category'),
        detailDescription: document.querySelector('#detail-description'),
        detailWhen: document.querySelector('#detail-when'),
        detailWhere: document.querySelector('#detail-where'),
        detailCapacity: document.querySelector('#detail-capacity'),
        detailOrganizer: document.querySelector('#detail-organizer'),
        detailError: document.querySelector('#detail-error'),

        detailOwnActions: document.querySelector('#detail-own-actions'),
        detailPublicActions: document.querySelector('#detail-public-actions'),
        detailEditButton: document.querySelector('#detail-edit-button'),
        detailStatusButton: document.querySelector('#detail-status-button'),
        detailDeleteButton: document.querySelector('#detail-delete-button'),
        detailRegisterButton: document.querySelector('#detail-register-button'),
        detailCancelButton: document.querySelector('#detail-cancel-button'),
        detailRsvpHint: document.querySelector('#detail-rsvp-hint'),

        detailCover: document.querySelector('#detail-cover'),
        detailCoverPlaceholder: document.querySelector('#detail-cover-placeholder'),
        coverSection: document.querySelector('#cover-section'),
        coverInput: document.querySelector('#cover-input'),
        coverUploadButton: document.querySelector('#cover-upload-button'),
        coverRemoveButton: document.querySelector('#cover-remove-button'),
        coverMessage: document.querySelector('#cover-message')
    };

    dom.eventsGrid.addEventListener('click', (clickEvent) => {

        const card = clickEvent.target.closest('.event-card');

        if (!card) {

            return;

        }

        selectEvent(card.dataset.eventId);

    });

    dom.myEventsList.addEventListener('click', (clickEvent) => {

        const item = clickEvent.target.closest('.my-event-item');

        if (!item) {

            return;

        }

        const action = clickEvent.target.closest('[data-action]')?.dataset.action;

        if (action === 'edit') {

            editEvent(item.dataset.eventId);

            return;

        }

        if (action === 'delete') {

            deleteEvent(item.dataset.eventId);

            return;

        }

        selectEvent(item.dataset.eventId);

    });

    dom.editForm.addEventListener('submit', (submitEvent) => {

        submitEvent.preventDefault();
        submitEdit();

    });

    dom.editCancelButton.addEventListener('click', () => {

        clearEditForm();

    });

    dom.dialogCloseButton.addEventListener('click', () => {

        closeDetail();

    });

    dom.dialog.addEventListener('click', (clickEvent) => {

        if (clickEvent.target === dom.dialog) {

            closeDetail();

        }

    });

    dom.dialog.addEventListener('close', () => {

        coverGeneration += 1;

        if (detailCoverUrl) {

            URL.revokeObjectURL(detailCoverUrl);
            detailCoverUrl = null;

        }

        selectedEvent = null;

    });

    dom.detailEditButton.addEventListener('click', () => {

        const id = selectedEvent ? eventId(selectedEvent) : null;

        closeDetail();

        if (id) {

            editEvent(id);

        }

    });

    dom.detailStatusButton.addEventListener('click', () => {

        toggleStatus();

    });

    dom.detailDeleteButton.addEventListener('click', () => {

        if (!selectedEvent) {

            return;

        }

        deleteEvent(eventId(selectedEvent));

    });

    dom.detailRegisterButton.addEventListener('click', () => {

        if (!selectedEvent) {

            return;

        }

        toggleRegistration(false);

    });

    dom.detailCancelButton.addEventListener('click', () => {

        if (!selectedEvent) {

            return;

        }

        toggleRegistration(true);

    });

    dom.coverUploadButton.addEventListener('click', () => {

        uploadCover();

    });

    dom.coverRemoveButton.addEventListener('click', () => {

        removeCover();

    });

}


export function setFilters(nextFilters) {

    filters = {
        ...filters,
        ...nextFilters
    };

}


export function getFilters() {

    return { ...filters };

}
