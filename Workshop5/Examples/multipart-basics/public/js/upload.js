const form = document.querySelector('#upload-form')
const input = document.querySelector('#file')
const dropzone = document.querySelector('#dropzone')
const selected = document.querySelector('#selected-file')
const selectedName = document.querySelector('#selected-name')
const selectedSize = document.querySelector('#selected-size')
const button = document.querySelector('#upload-button')

function formatBytes(bytes) {
    if (bytes < 1024) {
        return `${bytes} B`
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function showSelection(file) {
    if (!file) {
        selected.hidden = true
        dropzone.classList.remove('has-file')
        return
    }

    selectedName.textContent = file.name
    selectedSize.textContent = formatBytes(file.size)
    selected.hidden = false
    dropzone.classList.add('has-file')
}

if (input && dropzone) {
    input.addEventListener('change', () => {
        showSelection(input.files?.[0])
    })

    for (const eventName of ['dragenter', 'dragover']) {
        dropzone.addEventListener(eventName, (event) => {
            event.preventDefault()
            dropzone.classList.add('is-dragging')
        })
    }

    for (const eventName of ['dragleave', 'drop']) {
        dropzone.addEventListener(eventName, (event) => {
            event.preventDefault()
            dropzone.classList.remove('is-dragging')
        })
    }

    dropzone.addEventListener('drop', (event) => {
        const files = event.dataTransfer?.files

        if (!files || files.length === 0) {
            return
        }

        const transfer = new DataTransfer()
        transfer.items.add(files[0])
        input.files = transfer.files
        showSelection(files[0])
    })
}

if (form && button) {
    form.addEventListener('submit', () => {
        button.disabled = true
        button.textContent = 'Uploading…'
    })
}

for (const deleteForm of document.querySelectorAll('[data-confirm]')) {
    deleteForm.addEventListener('submit', (event) => {
        const message = deleteForm.getAttribute('data-confirm')

        if (message && !window.confirm(message)) {
            event.preventDefault()
        }
    })
}
