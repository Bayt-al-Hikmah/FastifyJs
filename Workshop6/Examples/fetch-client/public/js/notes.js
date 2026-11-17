import { apiRequest } from './api.js'


/**
 * This module owns the dashboard state and all DOM updates. Every piece of
 * text that came from the API is inserted with textContent, so a note body
 * containing HTML is shown as plain text rather than executed as markup.
 */

const elements = {

    list: document.querySelector('#note-list'),

    listStatus: document.querySelector('#list-status'),

    noteCount: document.querySelector('#note-count'),

    statVisible: document.querySelector('#stat-visible'),

    statImages: document.querySelector('#stat-images'),

    searchInput: document.querySelector('#search-input'),

    topicFilter: document.querySelector('#topic-filter'),

    topicSuggestions: document.querySelector('#topic-suggestions'),

    form: document.querySelector('#note-form'),

    formMessage: document.querySelector('#form-message'),

    titleInput: document.querySelector('#title-input'),

    topicInput: document.querySelector('#topic-input'),

    bodyInput: document.querySelector('#body-input'),

    saveButton: document.querySelector('#save-button'),

    uploadForm: document.querySelector('#upload-form'),

    uploadMessage: document.querySelector('#upload-message'),

    imageInput: document.querySelector('#image-input'),

    uploadButton: document.querySelector('#upload-button'),

    imagePreview: document.querySelector('#image-preview'),

    imageHint: document.querySelector('#image-hint'),

    toast: document.querySelector('#toast')

}


let editingId = null

let notesInView = []

let toastTimer = null


// ---------- Small presentation helpers ----------


function showToast(message, kind = 'success') {

    elements.toast.textContent = message

    elements.toast.classList.toggle('is-error', kind === 'error')

    elements.toast.hidden = false

    clearTimeout(toastTimer)

    toastTimer = setTimeout(() => {

        elements.toast.hidden = true

    }, 3200)

}


function setFormMessage(element, message, kind = '') {

    element.textContent = message

    element.classList.remove('is-error', 'is-success')

    if (kind) {
        element.classList.add(`is-${kind}`)
    }

}


function setListState(kind, message) {

    elements.listStatus.textContent = message

    elements.listStatus.className = kind
        ? `list-status is-${kind}`
        : 'list-status'

}


function formatDate(isoString) {

    const date = new Date(isoString)

    if (Number.isNaN(date.getTime())) {
        return isoString
    }

    return new Intl.DateTimeFormat('en', {

        day: 'numeric',

        month: 'short',

        year: 'numeric'

    }).format(date)

}


// ---------- Validation error display ----------


function inputForField(field) {

    if (field === 'title') {
        return elements.titleInput
    }

    if (field === 'body') {
        return elements.bodyInput
    }

    if (field === 'topic') {
        return elements.topicInput
    }

    return null

}


function clearFieldErrors() {

    const inputs = [
        elements.titleInput,
        elements.topicInput,
        elements.bodyInput
    ]

    for (const input of inputs) {
        input.removeAttribute('aria-invalid')
    }

}


function showValidationErrors(error) {

    const details = error.details ?? []

    clearFieldErrors()


    if (details.length === 0) {

        setFormMessage(
            elements.formMessage,
            error.message,
            'error'
        )

        return

    }


    const messages = []

    for (const item of details) {

        const input = inputForField(item.field)

        if (input) {
            input.setAttribute('aria-invalid', 'true')
        }

        messages.push(`${item.field}: ${item.message}`)

    }

    setFormMessage(
        elements.formMessage,
        messages.join('  •  '),
        'error'
    )

}


// ---------- Rendering ----------


function createNoteCard(note) {

    const listItem = document.createElement('li')

    const card = document.createElement('article')

    card.className = 'note-card'

    card.dataset.noteId = String(note.id)

    if (note.id === editingId) {
        card.classList.add('is-active')
    }


    const metaRow = document.createElement('div')

    metaRow.className = 'note-card-meta'


    const topicPill = document.createElement('span')

    topicPill.className = 'topic-pill'

    topicPill.textContent = note.topic


    const time = document.createElement('time')

    time.dateTime = note.createdAt

    time.textContent = formatDate(note.createdAt)

    metaRow.append(topicPill, time)


    const title = document.createElement('h3')

    title.className = 'note-title'

    title.textContent = note.title


    const body = document.createElement('p')

    body.className = 'note-excerpt'

    body.textContent = note.body


    const actions = document.createElement('div')

    actions.className = 'note-actions'


    const editButton = document.createElement('button')

    editButton.type = 'button'

    editButton.className = 'button button-quiet button-small'

    editButton.textContent = 'Edit'

    editButton.addEventListener('click', () => {

        selectNote(note.id)

    })


    const deleteButton = document.createElement('button')

    deleteButton.type = 'button'

    deleteButton.className = 'button button-danger button-small'

    deleteButton.textContent = 'Delete'

    deleteButton.addEventListener('click', () => {

        deleteNote(note)

    })

    actions.append(editButton, deleteButton)

    card.append(metaRow, title, body)

    if (note.imageName) {

        const imageFlag = document.createElement('span')

        imageFlag.className = 'image-flag'

        imageFlag.textContent = 'Image attached'

        card.append(imageFlag)

    }

    card.append(actions)

    listItem.append(card)

    return listItem

}


function renderNotes(notes) {

    elements.list.replaceChildren()

    for (const note of notes) {
        elements.list.append(createNoteCard(note))
    }

}


function updateStats() {

    const withImages = notesInView.filter(
        (note) => Boolean(note.imageName)
    )

    elements.statVisible.textContent = String(notesInView.length)

    elements.statImages.textContent = String(withImages.length)

    elements.noteCount.textContent = String(notesInView.length)

}


// ---------- Editor state ----------


function markActiveCard() {

    const cards = elements.list.querySelectorAll('.note-card')

    for (const card of cards) {

        const isActive =
            Number(card.dataset.noteId) === editingId

        card.classList.toggle('is-active', isActive)

    }

}


function fillEditor(note) {

    editingId = note.id

    elements.titleInput.value = note.title

    elements.topicInput.value = note.topic

    elements.bodyInput.value = note.body

    elements.saveButton.textContent = 'Update note'

    elements.uploadButton.disabled = false

    clearFieldErrors()


    if (note.imageName) {

        elements.imagePreview.hidden = false

        elements.imagePreview.src = `/api/notes/${note.id}/image`

        elements.imagePreview.alt = `Illustration for ${note.title}`

        elements.imageHint.textContent =
            'Uploading another image replaces the current one.'

    } else {

        elements.imagePreview.hidden = true

        elements.imagePreview.removeAttribute('src')

        elements.imagePreview.alt = ''

        elements.imageHint.textContent =
            'Add a small image to illustrate this note.'

    }


    markActiveCard()

}


export function resetEditor() {

    editingId = null

    elements.form.reset()

    elements.uploadForm.reset()

    elements.saveButton.textContent = 'Save note'

    elements.uploadButton.disabled = true

    elements.imagePreview.hidden = true

    elements.imagePreview.removeAttribute('src')

    elements.imagePreview.alt = ''

    elements.imageHint.textContent =
        'Save or select a note before uploading an image.'

    setFormMessage(elements.formMessage, '')

    setFormMessage(elements.uploadMessage, '')

    clearFieldErrors()

    markActiveCard()

}


async function selectNote(id) {

    setFormMessage(
        elements.formMessage,
        'Loading note…'
    )

    try {

        const result = await apiRequest(`/api/notes/${id}`)

        fillEditor(result.data.note)

        elements.titleInput.focus()

    } catch (error) {

        setFormMessage(
            elements.formMessage,
            error.message,
            'error'
        )

    }

}


// ---------- API operations ----------


export async function loadNotes() {

    setListState('loading', 'Loading notes…')

    elements.list.replaceChildren()


    const params = new URLSearchParams()

    const search = elements.searchInput.value.trim()

    const topic = elements.topicFilter.value.trim()

    if (search) {
        params.set('search', search)
    }

    if (topic) {
        params.set('topic', topic)
    }


    const query = params.toString()

    const url = query
        ? `/api/notes?${query}`
        : '/api/notes'


    try {

        const result = await apiRequest(url)

        notesInView = result?.data?.notes ?? []

        renderNotes(notesInView)

        updateStats()


        if (notesInView.length === 0) {

            setListState(
                'empty',
                'No notes match these filters. Try another search or write a new note.'
            )

        } else {

            const label = notesInView.length === 1
                ? 'note'
                : 'notes'

            setListState(
                '',
                `${notesInView.length} ${label} found.`
            )

        }

    } catch (error) {

        notesInView = []

        updateStats()

        setListState(
            'error',
            `Could not load notes: ${error.message}`
        )

    }

}


export async function loadTopics() {

    try {

        const result = await apiRequest('/api/meta/topics')

        const topics = result?.data?.topics ?? []

        const previousFilter = elements.topicFilter.value


        elements.topicFilter.replaceChildren()

        const allOption = document.createElement('option')

        allOption.value = ''

        allOption.textContent = 'All topics'

        elements.topicFilter.append(allOption)


        elements.topicSuggestions.replaceChildren()


        for (const topic of topics) {

            const suggestion = document.createElement('option')

            suggestion.value = topic

            elements.topicSuggestions.append(suggestion)


            const filterOption = document.createElement('option')

            filterOption.value = topic

            filterOption.textContent = topic

            elements.topicFilter.append(filterOption)

        }


        if (topics.includes(previousFilter)) {
            elements.topicFilter.value = previousFilter
        }


    } catch {

        // Topic suggestions are a convenience. The list works without them.

    }

}


export async function saveNoteFromForm() {

    clearFieldErrors()

    setFormMessage(elements.formMessage, '')


    const payload = {

        title: elements.titleInput.value.trim(),

        body: elements.bodyInput.value.trim(),

        topic: elements.topicInput.value.trim()

    }

    const isUpdate = editingId !== null

    const url = isUpdate
        ? `/api/notes/${editingId}`
        : '/api/notes'

    const method = isUpdate
        ? 'PATCH'
        : 'POST'


    elements.saveButton.disabled = true

    setFormMessage(
        elements.formMessage,
        isUpdate ? 'Updating note…' : 'Saving note…'
    )


    try {

        const result = await apiRequest(url, {

            method,

            body: JSON.stringify(payload)

        })

        const note = result.data.note

        fillEditor(note)

        setFormMessage(
            elements.formMessage,
            isUpdate
                ? 'Note updated successfully.'
                : 'Note created successfully.',
            'success'
        )

        showToast(
            isUpdate
                ? 'Note updated.'
                : 'Note created.'
        )

        await loadTopics()

        await loadNotes()


    } catch (error) {

        showValidationErrors(error)

        showToast(error.message, 'error')

    } finally {

        elements.saveButton.disabled = false

    }

}


async function deleteNote(note) {

    const confirmed = window.confirm(
        `Delete “${note.title}”? This cannot be undone.`
    )

    if (!confirmed) {
        return
    }


    try {

        // A 204 has no body. apiRequest returns null for that case.
        await apiRequest(`/api/notes/${note.id}`, {
            method: 'DELETE'
        })

        if (editingId === note.id) {
            resetEditor()
        }

        showToast('Note deleted.')

        await loadNotes()

    } catch (error) {

        showToast(error.message, 'error')

    }

}


export async function uploadSelectedImage() {

    if (editingId === null) {

        setFormMessage(
            elements.uploadMessage,
            'Save or select a note first.',
            'error'
        )

        return

    }


    const file = elements.imageInput.files?.[0]


    if (!file) {

        setFormMessage(
            elements.uploadMessage,
            'Choose an image first.',
            'error'
        )

        return

    }


    // FormData builds the multipart body. apiRequest deliberately leaves the
    // Content-Type header alone so the browser can add the correct boundary.

    const formData = new FormData()

    formData.append('image', file)


    elements.uploadButton.disabled = true

    setFormMessage(
        elements.uploadMessage,
        'Uploading…'
    )


    try {

        const result = await apiRequest(
            `/api/notes/${editingId}/image`,
            {
                method: 'POST',
                body: formData
            }
        )

        const note = result.data.note

        fillEditor(note)

        elements.imageInput.value = ''

        setFormMessage(
            elements.uploadMessage,
            `Uploaded ${file.name}.`,
            'success'
        )

        showToast('Image uploaded.')

        await loadNotes()


    } catch (error) {

        const details = error.details ?? []

        const message = details.length > 0
            ? details.map((item) => item.message).join('  •  ')
            : error.message

        setFormMessage(
            elements.uploadMessage,
            message,
            'error'
        )

        showToast(error.message, 'error')

    } finally {

        elements.uploadButton.disabled = false

    }

}
