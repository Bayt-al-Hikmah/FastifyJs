/**
 * Small shared DOM helpers.
 *
 * Everything inserted into the page uses textContent, never innerHTML with API
 * data. Validation messages and event titles are untrusted input as far as the
 * browser is concerned, so treating them as text avoids accidental markup.
 */


let toastRegion = null;


export function initUi() {

    toastRegion = document.querySelector('#toast-region');

}


/**
 * Show a transient notification in the bottom-right corner.
 */
export function toast(message, type = 'info') {

    if (!toastRegion) {

        return;

    }

    const item = document.createElement('div');

    item.className = `toast toast-${type}`;

    const marker = document.createElement('span');

    marker.className = 'toast-marker';
    marker.setAttribute('aria-hidden', 'true');
    marker.textContent = type === 'error' ? '!' : '•';

    const text = document.createElement('span');

    text.className = 'toast-text';
    text.textContent = message;

    item.append(marker, text);
    toastRegion.append(item);

    window.setTimeout(() => {

        item.classList.add('is-leaving');

        window.setTimeout(() => {

            item.remove();

        }, 220);

    }, 4200);

}


export function clearError(container) {

    if (!container) {

        return;

    }

    container.replaceChildren();
    container.hidden = true;
    container.classList.remove('is-error', 'is-success');

}


/**
 * Render either the `errors` array from a 400 response or a single safe message.
 * Field names are matched to elements with data-field attributes so the relevant
 * input is highlighted and announced as invalid.
 */
export function renderApiError(error, container, form = null) {

    if (!container) {

        return;

    }

    container.replaceChildren();
    container.hidden = false;
    container.classList.remove('is-success');
    container.classList.add('is-error');

    if (form) {

        for (const input of form.querySelectorAll('[data-field]')) {

            input.removeAttribute('aria-invalid');
            input.classList.remove('is-invalid');

        }

    }

    const details = Array.isArray(error?.details) ? error.details : [];

    if (details.length > 0) {

        const list = document.createElement('ul');

        list.className = 'error-list';

        for (const detail of details) {

            const item = document.createElement('li');

            const field = document.createElement('strong');

            field.textContent = detail.field ?? 'Request';

            const separator = document.createElement('span');

            separator.textContent = ' — ';

            const message = document.createElement('span');

            message.textContent = detail.message ?? 'Invalid value.';

            item.append(field, separator, message);
            list.append(item);

            if (form && detail.field) {

                const fieldName = String(detail.field);

                const escapedFieldName = typeof CSS !== 'undefined' && CSS.escape
                    ? CSS.escape(fieldName)
                    : fieldName.replace(/["\\]/g, '\\$&');

                const matchingInput = form.querySelector(
                    `[data-field="${escapedFieldName}"]`
                );

                if (matchingInput) {

                    matchingInput.setAttribute('aria-invalid', 'true');
                    matchingInput.classList.add('is-invalid');

                }

            }

        }

        container.append(list);

        return;

    }

    const paragraph = document.createElement('p');

    paragraph.className = 'error-message-text';
    paragraph.textContent = error?.message ?? 'Something went wrong. Please try again.';

    container.append(paragraph);

}


export function setInlineMessage(container, message, type = 'info') {

    if (!container) {

        return;

    }

    container.replaceChildren();
    container.hidden = false;
    container.classList.remove('is-error', 'is-success');
    container.classList.add(`is-${type}`);

    const paragraph = document.createElement('p');

    paragraph.className = 'error-message-text';
    paragraph.textContent = message;

    container.append(paragraph);

}


/**
 * Disable a button while a request is in flight and restore its original label.
 */
export function setButtonBusy(button, isBusy, busyLabel = 'Working…') {

    if (!button) {

        return;

    }

    if (isBusy) {

        if (!button.dataset.originalLabel) {

            button.dataset.originalLabel = button.textContent.trim();

        }

        button.disabled = true;
        button.classList.add('is-busy');
        button.textContent = busyLabel;

        return;

    }

    button.disabled = false;
    button.classList.remove('is-busy');
    button.textContent = button.dataset.originalLabel ?? button.textContent;

    delete button.dataset.originalLabel;

}


/**
 * Convert an ISO timestamp from the API into the value expected by
 * <input type="datetime-local">, in the visitor's local timezone.
 */
export function toDateTimeLocalValue(isoString) {

    if (!isoString) {

        return '';

    }

    const date = new Date(isoString);

    if (Number.isNaN(date.getTime())) {

        return '';

    }

    const pad = (value) => String(value).padStart(2, '0');

    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());

    return `${year}-${month}-${day}T${hours}:${minutes}`;

}


/**
 * Convert a datetime-local input value into the ISO string the API expects.
 */
export function toIsoString(localValue) {

    if (!localValue) {

        return '';

    }

    const date = new Date(localValue);

    if (Number.isNaN(date.getTime())) {

        return localValue;

    }

    return date.toISOString();

}


export function formatDateTime(isoString) {

    if (!isoString) {

        return 'Date to be announced';

    }

    const date = new Date(isoString);

    if (Number.isNaN(date.getTime())) {

        return 'Date to be announced';

    }

    return date.toLocaleString(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

}


export function formatShortDate(isoString) {

    if (!isoString) {

        return '';

    }

    const date = new Date(isoString);

    if (Number.isNaN(date.getTime())) {

        return '';

    }

    return date.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });

}


export function titleCase(value) {

    if (!value) {

        return 'Other';

    }

    return String(value)
        .toLowerCase()
        .replace(/(^|_)([a-z])/g, (match, separator, letter) => ` ${letter.toUpperCase()}`)
        .trim();

}
