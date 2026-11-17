import {
    apiRequest,
    fetchCoverUrl
} from './api.js'

import {
    isOwner,
    rememberCoverUrl,
    releaseCoverUrls,
    state
} from './state.js'

import {
    CATEGORY_LABELS,
    categoryLabel,
    formatDate,
    makeElement,
    qs,
    showLoading
} from './ui.js'


function populateCategoryOptions(select) {

    for (const [value, label] of Object.entries(CATEGORY_LABELS)) {

        const option = makeElement('option', '', label)

        option.value = value

        select.append(option)

    }

}


function createCoverImage(event) {

    const wrapper = makeElement(
        'div',
        'card-cover card-cover-loading'
    )

    const image = makeElement('img', '', '')

    image.alt = `Cover image for ${event.title}`
    image.loading = 'lazy'

    wrapper.append(image)

    fetchCoverUrl(event.id)
        .then((url) => {
            image.src = url
            rememberCoverUrl(url)
            wrapper.classList.remove('card-cover-loading')
        })
        .catch(() => {
            wrapper.remove()
        })

    return wrapper

}


function createEventCard(event, onOpenDetail) {

    const card = makeElement('article', 'event-card')

    card.tabIndex = 0
    card.setAttribute(
        'aria-label',
        `View details for ${event.title}`
    )

    if (event.hasCover) {
        card.append(createCoverImage(event))
    } else {
        card.append(
            makeElement(
                'div',
                'card-cover card-cover-placeholder',
                categoryLabel(event.category).slice(0, 1)
            )
        )
    }


    const body = makeElement('div', 'card-body')

    const meta = makeElement('div', 'card-meta')

    meta.append(
        makeElement(
            'span',
            'category-pill',
            categoryLabel(event.category)
        )
    )

    if (event.status === 'DRAFT') {
        meta.append(
            makeElement('span', 'status-pill status-draft', 'Draft')
        )
    }

    body.append(meta)

    body.append(
        makeElement('h3', 'card-title', event.title)
    )

    const location = makeElement('p', 'card-location')

    location.append(
        document.createTextNode('⌖ ')
    )
    location.append(
        document.createTextNode(event.location)
    )

    body.append(location)

    const footer = makeElement('div', 'card-footer')

    const time = makeElement('time', 'card-date', formatDate(event.startsAt))

    time.dateTime = event.startsAt

    footer.append(time)
    footer.append(
        makeElement(
            'span',
            'card-spots',
            event.spotsLeft === 0
                ? 'Full'
                : `${event.spotsLeft} spots left`
        )
    )

    body.append(footer)

    card.append(body)


    const open = () => onOpenDetail(event)

    card.addEventListener('click', open)

    card.addEventListener('keydown', (keyEvent) => {
        if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
            keyEvent.preventDefault()
            open()
        }
    })


    if (isOwner(event)) {
        card.append(
            makeElement(
                'span',
                'owner-flag',
                'Yours'
            )
        )
    }

    return card

}


function renderPagination(pagination, reload) {

    const container = qs('#pagination')

    container.replaceChildren()


    if (!pagination || pagination.totalPages <= 1) {
        return
    }


    const previous = makeElement(
        'button',
        'button button-quiet button-small',
        '← Previous'
    )

    previous.type = 'button'
    previous.disabled = pagination.page <= 1
    previous.addEventListener('click', () => {
        reload(pagination.page - 1)
    })


    const label = makeElement(
        'span',
        'page-label',
        `Page ${pagination.page} of ${pagination.totalPages}`
    )


    const next = makeElement(
        'button',
        'button button-quiet button-small',
        'Next →'
    )

    next.type = 'button'
    next.disabled = pagination.page >= pagination.totalPages
    next.addEventListener('click', () => {
        reload(pagination.page + 1)
    })


    container.append(previous, label, next)

}


export function initGallery({ onOpenDetail }) {

    const filterForm = qs('#filter-form')
    const searchInput = qs('#search-input')
    const categorySelect = qs('#category-select')
    const resetButton = qs('#reset-filters')
    const grid = qs('#events-grid')
    const resultCount = qs('#result-count')

    populateCategoryOptions(categorySelect)


    async function loadEvents(page = 1) {

        showLoading(grid, 'Loading events…')

        const params = new URLSearchParams({
            page: String(page),
            limit: '9'
        })

        if (searchInput.value.trim()) {
            params.set('search', searchInput.value.trim())
        }

        if (categorySelect.value) {
            params.set('category', categorySelect.value)
        }


        try {

            const result = await apiRequest(
                `/api/events?${params.toString()}`
            )

            releaseCoverUrls()

            state.events = result.data.events
            state.pagination = result.data.pagination

            const { events, pagination } = result.data


            if (events.length === 0) {

                const empty = makeElement('div', 'empty-state')

                empty.append(
                    makeElement(
                        'h3',
                        '',
                        'No events found'
                    )
                )
                empty.append(
                    makeElement(
                        'p',
                        '',
                        'Try a different search or category — or be the first to host one.'
                    )
                )

                grid.replaceChildren(empty)

            } else {

                const cards = events.map((event) =>
                    createEventCard(event, onOpenDetail)
                )

                grid.replaceChildren(...cards)

            }


            resultCount.textContent =
                `${pagination.total} event${pagination.total === 1 ? '' : 's'}`

            renderPagination(pagination, loadEvents)

        } catch (error) {

            const failure = makeElement('div', 'empty-state')

            failure.append(
                makeElement('h3', '', 'Could not load events')
            )
            failure.append(
                makeElement('p', '', error.message)
            )

            grid.replaceChildren(failure)

            resultCount.textContent = ''

        }

    }


    filterForm.addEventListener('submit', (event) => {
        event.preventDefault()
        loadEvents(1)
    })


    resetButton.addEventListener('click', () => {
        searchInput.value = ''
        categorySelect.value = ''
        loadEvents(1)
    })


    loadEvents()

    return loadEvents

}
