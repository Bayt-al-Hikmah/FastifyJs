export const CATEGORY_LABELS = {
    TECHNOLOGY: 'Technology',
    EDUCATION: 'Education',
    ART: 'Art',
    COMMUNITY: 'Community',
    SPORTS: 'Sports',
    OTHER: 'Other'
}


export const STATUS_LABELS = {
    DRAFT: 'Draft',
    PUBLISHED: 'Published'
}


let toastTimer = null


export function qs(selector, root = document) {

    return root.querySelector(selector)

}


export function makeElement(tag, className, text) {

    const element = document.createElement(tag)

    if (className) {
        element.className = className
    }

    if (text !== undefined && text !== null) {
        element.textContent = String(text)
    }

    return element

}


export function categoryLabel(value) {

    return CATEGORY_LABELS[value] ?? value ?? 'Other'

}


export function statusLabel(value) {

    return STATUS_LABELS[value] ?? value ?? 'Draft'

}


export function formatDate(iso) {

    if (!iso) {
        return 'Date to be announced'
    }

    return new Date(iso).toLocaleDateString(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    })

}


export function formatDateTime(iso) {

    if (!iso) {
        return 'Date to be announced'
    }

    return new Date(iso).toLocaleString(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })

}


export function formatBytes(sizeBytes) {

    if (!sizeBytes && sizeBytes !== 0) {
        return ''
    }

    if (sizeBytes < 1024) {
        return `${sizeBytes} B`
    }

    return `${(sizeBytes / 1024).toFixed(0)} KB`

}


export function setMessage(element, text, kind = '') {

    if (!element) {
        return
    }

    element.textContent = text ?? ''
    element.className = `form-message ${kind}`.trim()

}


export function showToast(message, kind = 'info') {

    const toast = qs('#toast')

    if (!toast) {
        return
    }

    toast.textContent = message
    toast.className = `toast ${kind === 'error' ? 'is-error' : ''}`.trim()
    toast.hidden = false

    if (toastTimer) {
        clearTimeout(toastTimer)
    }

    toastTimer = setTimeout(() => {
        toast.hidden = true
    }, 3800)

}


export function showLoading(container, message = 'Loading…') {

    const loading = makeElement('p', 'loading-state', message)

    container.replaceChildren(loading)

}


export function confirmAction(message) {

    return window.confirm(message)

}
