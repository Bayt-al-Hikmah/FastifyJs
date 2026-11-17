import { apiRequest } from './api.js'


/**
 * Browser controller for the Community Library API explorer.
 *
 * Every value that comes from the API is written to the page with textContent.
 * No response data is ever interpolated into innerHTML.
 */


const OPERATIONS = [

    {
        key: 'list',
        method: 'GET',
        path: '/api/books',
        label: 'List & filter'
    },
    {
        key: 'get',
        method: 'GET',
        path: '/api/books/:id',
        label: 'Get one book'
    },
    {
        key: 'create',
        method: 'POST',
        path: '/api/books',
        label: 'Add a book'
    },
    {
        key: 'update',
        method: 'PATCH',
        path: '/api/books/:id',
        label: 'Update a book'
    },
    {
        key: 'delete',
        method: 'DELETE',
        path: '/api/books/:id',
        label: 'Delete a book'
    },
    {
        key: 'genres',
        method: 'GET',
        path: '/api/meta/genres',
        label: 'List genres'
    }

]


const STATUS_TEXT = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    400: 'Bad Request',
    404: 'Not Found',
    409: 'Conflict',
    413: 'Content Too Large',
    429: 'Too Many Requests',
    500: 'Server Error'
}


const state = {

    operation: 'list',

    bookQuery: {},

    visibleBooks: [],

    lastBookResult: null

}


let toastTimer = null


function byId(id) {

    return document.getElementById(id)

}


const element = {

    main: byId('main'),

    endpointList: byId('endpoint-list'),

    requestUrl: byId('request-url'),

    consoleMessage: byId('console-message'),

    statusBadge: byId('status-badge'),

    timing: byId('timing'),

    responseRequest: byId('response-request'),

    responseEmpty: byId('response-empty'),

    responseCode: byId('response-code'),

    responseBody: byId('response-body'),

    errorDetails: byId('error-details'),

    errorList: byId('error-list'),

    statTotal: byId('stat-total'),

    statTotalFoot: byId('stat-total-foot'),

    statAvailable: byId('stat-available'),

    statGenres: byId('stat-genres'),

    librarySummary: byId('library-summary'),

    bookGrid: byId('book-grid'),

    pagination: byId('pagination'),

    pageLabel: byId('page-label'),

    prevPage: byId('prev-page'),

    nextPage: byId('next-page'),

    toast: byId('toast')

}


const forms = Array.from(
    document.querySelectorAll('.operation-form')
)


/** Renders the endpoint reference from one shared list of operation metadata. */

function buildEndpointList() {

    element.endpointList.replaceChildren()


    OPERATIONS.forEach((operation) => {

        const item = document.createElement('li')

        const button = document.createElement('button')

        button.type = 'button'

        button.className = 'endpoint-item'

        button.dataset.operation = operation.key

        button.setAttribute('aria-pressed', 'false')


        const method = document.createElement('span')

        method.className = `method method-${operation.method.toLowerCase()}`

        method.textContent = operation.method


        const path = document.createElement('span')

        path.className = 'endpoint-path'

        path.textContent = operation.path


        const label = document.createElement('span')

        label.className = 'endpoint-label'

        label.textContent = operation.label


        button.append(method, path, label)

        item.append(button)

        element.endpointList.append(item)

    })

}


function setOperation(key, options = {}) {

    const shouldFocus = options.focus ?? true

    const operation = OPERATIONS.find(
        (candidate) => candidate.key === key
    )

    if (!operation) {
        return
    }


    state.operation = key


    forms.forEach((form) => {

        form.hidden = form.dataset.operation !== key

    })


    element.endpointList
        .querySelectorAll('.endpoint-item')
        .forEach((button) => {

            const isActive = button.dataset.operation === key

            button.classList.toggle('is-active', isActive)

            button.setAttribute('aria-pressed', String(isActive))

        })


    element.requestUrl.textContent =
        `${operation.method} ${operation.path}`

    clearResponse()


    if (shouldFocus) {

        const activeForm = forms.find(
            (form) => form.dataset.operation === key
        )

        const firstControl = activeForm?.querySelector(
            'input, select, textarea, button'
        )

        firstControl?.focus()

    }

}


function getValue(form, name) {

    const control = form.elements.namedItem(name)

    if (!control || !('value' in control)) {
        return ''
    }

    return String(control.value)

}


function toBoundedInteger(value, fallback, minimum, maximum) {

    const numeric = Number(value)

    if (!Number.isFinite(numeric) || value === '') {
        return fallback
    }

    return Math.min(maximum, Math.max(minimum, Math.trunc(numeric)))

}


function buildListQuery() {

    const form = byId('form-list')

    const query = {

        sort: getValue(form, 'sort') || '-id',

        page: toBoundedInteger(
            getValue(form, 'page'), 1, 1, 1_000_000
        ),

        limit: toBoundedInteger(
            getValue(form, 'limit'), 10, 1, 50
        )

    }


    const search = getValue(form, 'search').trim()

    if (search) {
        query.search = search
    }


    const genre = getValue(form, 'genre')

    if (genre) {
        query.genre = genre
    }


    const available = getValue(form, 'available')

    if (available) {
        query.available = available === 'true'
    }


    return query

}


function buildCreateBody() {

    const form = byId('form-create')

    const availableControl = form.elements.namedItem('available')


    return {

        title: getValue(form, 'title').trim(),

        author: getValue(form, 'author').trim(),

        isbn: getValue(form, 'isbn').trim(),

        genre: getValue(form, 'genre'),

        publishedYear: Number(getValue(form, 'publishedYear')),

        copies: Number(getValue(form, 'copies')),

        available: availableControl instanceof HTMLInputElement
            ? availableControl.checked
            : true,

        description: getValue(form, 'description').trim()

    }

}


function buildUpdateBody() {

    const form = byId('form-update')

    const body = {}


    const textFields = [
        'title',
        'author',
        'isbn',
        'description'
    ]


    textFields.forEach((name) => {

        const value = getValue(form, name).trim()

        if (value) {
            body[name] = value
        }

    })


    const genre = getValue(form, 'genre')

    if (genre) {
        body.genre = genre
    }


    const year = getValue(form, 'publishedYear')

    if (year !== '') {
        body.publishedYear = Number(year)
    }


    const copies = getValue(form, 'copies')

    if (copies !== '') {
        body.copies = Number(copies)
    }


    const available = getValue(form, 'available')

    if (available) {
        body.available = available === 'true'
    }


    return body

}


function setMessage(message, kind = '') {

    element.consoleMessage.textContent = message

    element.consoleMessage.className = kind
        ? `form-message is-${kind}`
        : 'form-message'

}


function clearResponse() {

    element.statusBadge.hidden = true

    element.timing.textContent = ''

    element.responseRequest.textContent = 'No request sent yet.'

    element.responseEmpty.hidden = false

    element.responseCode.hidden = true

    element.responseBody.textContent = ''

    element.errorDetails.hidden = true

    element.errorList.replaceChildren()

    setMessage('')

}


function setBusy(isBusy) {

    document.querySelectorAll(
        '.submit-button, #refresh-books, #prev-page, #next-page'
    ).forEach((button) => {
        button.disabled = isBusy
    })

    element.main.setAttribute('aria-busy', String(isBusy))

}


function showToast(message, kind = 'success') {

    element.toast.textContent = message

    element.toast.className = `toast is-${kind}`

    element.toast.hidden = false

    window.clearTimeout(toastTimer)

    toastTimer = window.setTimeout(() => {
        element.toast.hidden = true
    }, 4200)

}


function renderSuccess(result, label, status, elapsed) {

    const statusName = STATUS_TEXT[status] ?? ''

    element.statusBadge.textContent = `${status} ${statusName}`.trim()

    element.statusBadge.className = 'status-badge is-success'

    element.statusBadge.hidden = false

    element.timing.textContent = `${elapsed} ms`

    element.responseRequest.textContent = label

    element.responseEmpty.hidden = true

    element.responseCode.hidden = false

    element.responseBody.textContent = result === null
        ? 'No response body (204 No Content).'
        : JSON.stringify(result, null, 2)

    element.errorDetails.hidden = true

    element.errorList.replaceChildren()

    setMessage(`${label} succeeded.`, 'success')

}


function renderFailure(error, label, elapsed) {

    const status = error.status

    element.statusBadge.textContent = status
        ? `${status} ${STATUS_TEXT[status] ?? 'Error'}`
        : 'Network error'

    element.statusBadge.className = 'status-badge is-error'

    element.statusBadge.hidden = false

    element.timing.textContent = `${elapsed} ms`

    element.responseRequest.textContent = label

    element.responseEmpty.hidden = true

    element.responseCode.hidden = false


    const details = Array.isArray(error.details)
        ? error.details
        : []

    const safePayload = {

        message: error.message,

        ...(details.length > 0 ? { errors: details } : {})

    }

    element.responseBody.textContent =
        JSON.stringify(safePayload, null, 2)


    element.errorList.replaceChildren()

    if (details.length > 0) {

        details.forEach((issue) => {

            const item = document.createElement('li')

            const field = document.createElement('code')

            field.textContent = issue.field ?? 'request'

            const message = document.createElement('span')

            message.textContent = issue.message ?? 'Invalid value.'

            item.append(field, message)

            element.errorList.append(item)

        })

        element.errorDetails.hidden = false

    } else {

        element.errorDetails.hidden = true

    }


    setMessage(error.message, 'error')

}


/**
 * Sends one request, paints the response panel, and rethrows expected errors
 * so form handlers can stop without duplicating error-rendering logic.
 */

async function performRequest(url, options, expectedStatus) {

    clearResponse()

    setBusy(true)

    const label = `${options.method ?? 'GET'} ${url}`

    const startedAt = performance.now()


    try {

        const result = await apiRequest(url, options)

        const elapsed = Math.round(performance.now() - startedAt)

        renderSuccess(result, label, expectedStatus, elapsed)

        showToast(`${label} → ${expectedStatus}`, 'success')

        return result

    } catch (error) {

        const elapsed = Math.round(performance.now() - startedAt)

        renderFailure(error, label, elapsed)

        showToast(error.message, 'error')

        throw error

    } finally {

        setBusy(false)

    }

}


function renderBooks(books, pagination) {

    element.bookGrid.replaceChildren()

    state.visibleBooks = books


    if (books.length === 0) {

        const empty = document.createElement('div')

        empty.className = 'empty-state'

        empty.textContent =
            'No books match these filters. Try clearing the search or choosing another genre.'

        element.bookGrid.append(empty)

        return

    }


    books.forEach((book) => {

        const card = document.createElement('article')

        card.className = 'book-card'


        const top = document.createElement('div')

        top.className = 'book-card-top'


        const genre = document.createElement('span')

        genre.className = 'genre-pill'

        genre.textContent = book.genre


        const availability = document.createElement('span')

        availability.className = book.available
            ? 'availability-pill is-available'
            : 'availability-pill is-unavailable'

        availability.textContent = book.available
            ? 'Available'
            : 'On loan'


        top.append(genre, availability)


        const title = document.createElement('h3')

        title.className = 'book-title'

        title.textContent = book.title


        const author = document.createElement('p')

        author.className = 'book-author'

        author.textContent = `by ${book.author}`


        const description = document.createElement('p')

        description.className = 'book-description'

        description.textContent = book.description ||
            'No description has been added yet.'


        const meta = document.createElement('dl')

        meta.className = 'book-meta'


        const metaItems = [
            ['ISBN', book.isbn],
            ['Published', String(book.publishedYear)],
            ['Copies', String(book.copies)]
        ]


        metaItems.forEach(([name, value]) => {

            const term = document.createElement('dt')

            term.textContent = name

            const detail = document.createElement('dd')

            detail.textContent = value

            meta.append(term, detail)

        })


        const actions = document.createElement('div')

        actions.className = 'book-actions'


        const detailsButton = document.createElement('button')

        detailsButton.type = 'button'

        detailsButton.className = 'button button-quiet button-small'

        detailsButton.dataset.action = 'view'

        detailsButton.dataset.id = String(book.id)

        detailsButton.textContent = 'Details'


        const editButton = document.createElement('button')

        editButton.type = 'button'

        editButton.className = 'button button-quiet button-small'

        editButton.dataset.action = 'edit'

        editButton.dataset.id = String(book.id)

        editButton.textContent = 'Edit'


        actions.append(detailsButton, editButton)

        card.append(
            top,
            title,
            author,
            description,
            meta,
            actions
        )

        element.bookGrid.append(card)

    })

}


function renderPagination(pagination) {

    if (!pagination || pagination.totalPages <= 1) {

        element.pagination.hidden = true

        return

    }


    element.pagination.hidden = false

    element.pageLabel.textContent =
        `Page ${pagination.page} of ${pagination.totalPages}`

    element.prevPage.disabled = pagination.page <= 1

    element.nextPage.disabled =
        pagination.page >= pagination.totalPages

}


function applyBooks(result) {

    const books = Array.isArray(result.data) ? result.data : []

    const pagination = result.pagination ?? {
        page: 1,
        limit: books.length,
        total: books.length,
        totalPages: 1
    }


    state.lastBookResult = result

    renderBooks(books, pagination)

    renderPagination(pagination)


    element.statTotal.textContent = String(pagination.total)

    element.statTotalFoot.textContent =
        `Page ${pagination.page} of ${Math.max(1, pagination.totalPages)}`

    element.statAvailable.textContent = String(
        books.filter((book) => book.available).length
    )

    element.librarySummary.textContent =
        `Showing ${books.length} of ${pagination.total} matching titles`

}


/** GET /books, either shown in the response panel or used as a quiet refresh. */

async function loadBooks(query, showResponse) {

    const searchParams = new URLSearchParams()


    Object.entries(query).forEach(([name, value]) => {

        if (value !== '' && value !== null && value !== undefined) {
            searchParams.set(name, String(value))
        }

    })


    const queryString = searchParams.toString()

    const url = `/api/books${queryString ? `?${queryString}` : ''}`

    const options = { method: 'GET' }


    if (showResponse) {

        const result = await performRequest(url, options, 200)

        applyBooks(result)

        return

    }


    setBusy(true)


    try {

        const result = await apiRequest(url, options)

        applyBooks(result)

    } catch (error) {

        showToast(`Shelf refresh failed: ${error.message}`, 'error')

    } finally {

        setBusy(false)

    }

}


async function loadGenres() {

    try {

        const result = await apiRequest('/api/meta/genres')

        element.statGenres.textContent = String(
            result.data.genres.length
        )

    } catch (error) {

        element.statGenres.textContent = '—'

        showToast(`Could not load genres: ${error.message}`, 'error')

    }

}


function fillUpdateForm(book) {

    byId('update-id').value = String(book.id)

    byId('update-title').value = book.title

    byId('update-author').value = book.author

    byId('update-isbn').value = book.isbn

    byId('update-genre').value = book.genre

    byId('update-year').value = String(book.publishedYear)

    byId('update-copies').value = String(book.copies)

    byId('update-available').value = String(book.available)

    byId('update-description').value = book.description ?? ''

}


function goToPage(page) {

    state.bookQuery = { ...state.bookQuery, page }

    byId('list-page').value = String(page)

    loadBooks(state.bookQuery, true).catch(() => {
        // The response panel already explains the failure.
    })

}


function wireEvents() {

    element.endpointList.addEventListener('click', (event) => {

        const target = event.target instanceof Element
            ? event.target.closest('button[data-operation]')
            : null

        if (target) {
            setOperation(target.dataset.operation)
        }

    })


    const handlers = {

        list: async () => {

            state.bookQuery = buildListQuery()

            await loadBooks(state.bookQuery, true)

        },

        get: async () => {

            const id = Number(getValue(byId('form-get'), 'id'))

            await performRequest(
                `/api/books/${id}`,
                { method: 'GET' },
                200
            )

        },

        create: async () => {

            const body = buildCreateBody()

            await performRequest(
                '/api/books',
                {
                    method: 'POST',
                    body: JSON.stringify(body)
                },
                201
            )

            await loadBooks(state.bookQuery, false)

        },

        update: async () => {

            const form = byId('form-update')

            const id = getValue(form, 'id')

            const body = buildUpdateBody()

            if (Object.keys(body).length === 0) {

                setMessage(
                    'Fill in at least one field before sending a PATCH request.',
                    'error'
                )

                return

            }


            await performRequest(
                `/api/books/${id}`,
                {
                    method: 'PATCH',
                    body: JSON.stringify(body)
                },
                200
            )

            await loadBooks(state.bookQuery, false)

        },

        delete: async () => {

            const id = getValue(byId('form-delete'), 'id')

            await performRequest(
                `/api/books/${id}`,
                { method: 'DELETE' },
                204
            )

            await loadBooks(state.bookQuery, false)

        },

        genres: async () => {

            await performRequest(
                '/api/meta/genres',
                { method: 'GET' },
                200
            )

        }

    }


    forms.forEach((form) => {

        form.addEventListener('submit', async (event) => {

            event.preventDefault()

            const handler = handlers[form.dataset.operation]

            if (!handler) {
                return
            }

            try {
                await handler()
            } catch (error) {
                // performRequest has already rendered the failure.
            }

        })

    })


    element.bookGrid.addEventListener('click', (event) => {

        const target = event.target instanceof Element
            ? event.target.closest('button[data-action]')
            : null

        if (!target) {
            return
        }


        const book = state.visibleBooks.find(
            (candidate) =>
                String(candidate.id) === target.dataset.id
        )

        if (!book) {
            return
        }


        if (target.dataset.action === 'view') {

            setOperation('get')

            byId('get-id').value = String(book.id)

        } else if (target.dataset.action === 'edit') {

            setOperation('update')

            fillUpdateForm(book)

        }

    })


    byId('refresh-books').addEventListener('click', () => {

        loadBooks(state.bookQuery, false).catch(() => {
            // Refresh failures surface as a toast.
        })

    })


    element.prevPage.addEventListener('click', () => {

        const page = Math.max(
            1,
            Number(state.bookQuery.page ?? 1) - 1
        )

        goToPage(page)

    })


    element.nextPage.addEventListener('click', () => {

        const page = Number(state.bookQuery.page ?? 1) + 1

        goToPage(page)

    })

}


async function initialise() {

    wireEvents()

    buildEndpointList()

    setOperation('list', { focus: false })

    state.bookQuery = buildListQuery()

    try {

        await Promise.all([
            loadGenres(),
            loadBooks(state.bookQuery, true)
        ])

    } catch (error) {
        // performRequest has already rendered the failure in the panel.
    }

}


initialise()
