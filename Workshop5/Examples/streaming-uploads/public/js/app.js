const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

const refs = {
    dropzone: document.querySelector('#dropzone'),
    input: document.querySelector('#file-input'),
    title: document.querySelector('#dropzone-title'),
    selection: document.querySelector('#selection'),
    selectionName: document.querySelector('#selection-name'),
    selectionSize: document.querySelector('#selection-size'),
    button: document.querySelector('#upload-button'),
    progressPanel: document.querySelector('#progress-panel'),
    progressLabel: document.querySelector('#progress-label'),
    progressPercent: document.querySelector('#progress-percent'),
    progressTrack: document.querySelector('#progress-track'),
    progressBar: document.querySelector('#progress-bar'),
    progressMeta: document.querySelector('#progress-meta'),
    resultPanel: document.querySelector('#result-panel'),
    resultTitle: document.querySelector('#result-title'),
    resultMeta: document.querySelector('#result-meta'),
    resultChecksum: document.querySelector('#result-checksum'),
    resultCopy: document.querySelector('#result-copy'),
    error: document.querySelector('#upload-error'),
    list: document.querySelector('#upload-list'),
    listCount: document.querySelector('#list-count'),
    statCount: document.querySelector('#stat-count'),
    statSize: document.querySelector('#stat-size')
}

const TYPE_LABELS = {
    'image/png': 'PNG',
    'image/jpeg': 'JPG',
    'application/pdf': 'PDF',
    'text/plain': 'TXT'
}

const TYPE_CLASSES = {
    'image/png': 'type-image',
    'image/jpeg': 'type-image',
    'application/pdf': 'type-pdf',
    'text/plain': 'type-text'
}

let selectedFile = null
let uploading = false

function formatBytes(bytes) {
    if (bytes < 1024) {
        return `${bytes} B`
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatDate(value) {
    return new Intl.DateTimeFormat('en', {
        dateStyle: 'medium',
        timeStyle: 'short'
    }).format(new Date(value))
}

function shortDigest(digest) {
    return `${digest.slice(0, 12)}…${digest.slice(-6)}`
}

function setProgress(percent, loaded, total) {
    const rounded = Math.max(0, Math.min(100, Math.round(percent)))

    refs.progressBar.style.width = `${rounded}%`
    refs.progressPercent.textContent = `${rounded}%`
    refs.progressTrack.setAttribute('aria-valuenow', String(rounded))
    refs.progressMeta.textContent = `${formatBytes(loaded)} of ${formatBytes(total)}`
}

function showError(message) {
    refs.error.textContent = message
    refs.error.hidden = false
}

function clearError() {
    refs.error.hidden = true
    refs.error.textContent = ''
}

function selectFile(file) {
    if (!file) {
        return
    }

    selectedFile = file

    refs.selectionName.textContent = file.name
    refs.selectionSize.textContent = formatBytes(file.size)
    refs.selection.hidden = false
    refs.title.textContent = 'Ready to stream'
    refs.dropzone.classList.add('has-file')

    refs.resultPanel.hidden = true
    refs.progressPanel.hidden = true
    clearError()

    if (file.size > MAX_UPLOAD_BYTES) {
        showError('That file is larger than 10 MB and will be rejected.')
        refs.button.disabled = true
        return
    }

    refs.button.disabled = false
}

function resetSelection() {
    selectedFile = null

    refs.input.value = ''
    refs.selection.hidden = true
    refs.title.textContent = 'Drop a file or click to browse'
    refs.dropzone.classList.remove('has-file')
    refs.button.disabled = true
}

function renderResult(upload) {
    refs.resultPanel.hidden = false
    refs.resultTitle.textContent = 'Upload verified and stored'

    refs.resultMeta.textContent =
        `${upload.originalName} · ${formatBytes(upload.size)} · ${upload.mimeType}`

    refs.resultChecksum.textContent = upload.sha256
    refs.resultCopy.dataset.copy = upload.sha256
}

function createEmptyState() {
    const empty = document.createElement('div')
    empty.className = 'empty-state'

    empty.innerHTML = `
        <span class="empty-icon" aria-hidden="true">∅</span>
        <h3>No objects yet</h3>
        <p>Send a small image, PDF, or text file. The checksum and byte count
        appear here as soon as the stream finishes.</p>
        <a class="btn btn-secondary" href="#upload">Start the first stream</a>
    `

    return empty
}

function createUploadCard(upload) {
    const card = document.createElement('article')
    card.className = 'upload-card'
    card.dataset.uploadId = upload.id

    const type = document.createElement('div')
    type.className = `upload-type ${TYPE_CLASSES[upload.mimeType] ?? 'type-other'}`
    type.setAttribute('aria-hidden', 'true')
    type.textContent = TYPE_LABELS[upload.mimeType] ?? 'FILE'

    const body = document.createElement('div')
    body.className = 'upload-body'

    const name = document.createElement('h3')
    name.className = 'upload-name'
    name.title = upload.originalName
    name.textContent = upload.originalName

    const meta = document.createElement('p')
    meta.className = 'upload-meta'

    const size = document.createElement('span')
    size.textContent = formatBytes(upload.size)

    const dotOne = document.createElement('span')
    dotOne.className = 'dot'
    dotOne.setAttribute('aria-hidden', 'true')
    dotOne.textContent = '·'

    const date = document.createElement('span')
    date.textContent = formatDate(upload.createdAt)

    const dotTwo = document.createElement('span')
    dotTwo.className = 'dot'
    dotTwo.setAttribute('aria-hidden', 'true')
    dotTwo.textContent = '·'

    const mime = document.createElement('span')
    mime.className = 'upload-mime'
    mime.textContent = upload.mimeType

    meta.append(size, dotOne, date, dotTwo, mime)

    const checksum = document.createElement('div')
    checksum.className = 'checksum-row'

    const label = document.createElement('span')
    label.className = 'checksum-label'
    label.textContent = 'SHA-256'

    const code = document.createElement('code')
    code.title = upload.sha256
    code.textContent = shortDigest(upload.sha256)

    const copy = document.createElement('button')
    copy.className = 'copy-button'
    copy.type = 'button'
    copy.dataset.copy = upload.sha256
    copy.dataset.copyLabel = 'checksum'
    copy.textContent = 'Copy'

    checksum.append(label, code, copy)

    body.append(name, meta, checksum)

    const actions = document.createElement('div')
    actions.className = 'upload-actions'

    const download = document.createElement('a')
    download.className = 'btn btn-secondary btn-sm'
    download.href = upload.downloadUrl
    download.textContent = 'Download'

    const remove = document.createElement('button')
    remove.className = 'btn btn-danger btn-sm'
    remove.type = 'button'
    remove.dataset.delete = upload.id
    remove.dataset.name = upload.originalName
    remove.textContent = 'Delete'

    actions.append(download, remove)
    card.append(type, body, actions)

    return card
}

async function refreshUploads() {
    const response = await fetch('/api/uploads')

    if (!response.ok) {
        throw new Error('Could not load the upload list.')
    }

    const uploads = await response.json()
    const totalBytes = uploads.reduce(
        (total, upload) => total + upload.size,
        0
    )

    refs.list.replaceChildren()

    if (uploads.length === 0) {
        refs.list.append(createEmptyState())
    } else {
        const fragment = document.createDocumentFragment()

        for (const upload of uploads) {
            fragment.append(createUploadCard(upload))
        }

        refs.list.append(fragment)
    }

    refs.listCount.textContent =
        `${uploads.length} objects · ${formatBytes(totalBytes)}`

    refs.statCount.textContent = String(uploads.length)
    refs.statSize.textContent = formatBytes(totalBytes)
}

function uploadSelectedFile() {
    if (!selectedFile || uploading) {
        return
    }

    if (selectedFile.size > MAX_UPLOAD_BYTES) {
        showError('That file is larger than 10 MB and will be rejected.')
        return
    }

    uploading = true
    clearError()
    refs.button.disabled = true
    refs.resultPanel.hidden = true
    refs.progressPanel.hidden = false
    refs.progressLabel.textContent = 'Uploading'
    setProgress(0, 0, selectedFile.size)

    const formData = new FormData()
    formData.append('file', selectedFile, selectedFile.name)

    const xhr = new XMLHttpRequest()

    xhr.open('POST', '/api/uploads')

    xhr.upload.addEventListener('progress', (event) => {
        if (!event.lengthComputable) {
            return
        }

        const percent = (event.loaded / event.total) * 100

        setProgress(percent, event.loaded, event.total)

        if (percent >= 100) {
            refs.progressLabel.textContent = 'Verifying signature'
        }
    })

    xhr.addEventListener('load', () => {
        uploading = false
        refs.button.disabled = true
        refs.progressPanel.hidden = true

        let payload = null

        try {
            payload = JSON.parse(xhr.responseText)
        } catch {
            payload = null
        }

        if (xhr.status === 201 && payload) {
            renderResult(payload)
            resetSelection()
            refreshUploads().catch(() => {
                showError('The file was stored, but the list could not refresh.')
            })
            return
        }

        showError(
            payload?.error ??
                `The upload failed with status ${xhr.status}.`
        )
    })

    xhr.addEventListener('error', () => {
        uploading = false
        refs.button.disabled = false
        refs.progressPanel.hidden = true
        showError('The network connection dropped during the upload.')
    })

    xhr.send(formData)
}

function showToast(message, tone = 'success') {
    const toast = document.createElement('div')
    toast.className = `toast toast-${tone}`
    toast.setAttribute('role', 'status')
    toast.textContent = message

    document.body.append(toast)

    window.setTimeout(() => {
        toast.remove()
    }, 3200)
}

async function copyText(value, button) {
    if (!value) {
        return
    }

    try {
        await navigator.clipboard.writeText(value)

        const original = button.textContent
        button.textContent = 'Copied'

        window.setTimeout(() => {
            button.textContent = original
        }, 1400)
    } catch {
        showToast('Clipboard access was blocked by the browser.', 'error')
    }
}

async function deleteUpload(button) {
    const id = button.dataset.delete
    const name = button.dataset.name ?? 'this object'

    if (!id || !window.confirm(`Delete “${name}” permanently?`)) {
        return
    }

    button.disabled = true

    try {
        const response = await fetch(`/api/uploads/${id}`, {
            method: 'DELETE'
        })

        if (response.status !== 204) {
            let message = 'The object could not be deleted.'

            try {
                const payload = await response.json()
                message = payload.error ?? message
            } catch {
                // Keep the generic message.
            }

            throw new Error(message)
        }

        await refreshUploads()
        showToast('Object and metadata removed.')
    } catch (error) {
        button.disabled = false
        showToast(
            error instanceof Error ? error.message : 'Delete failed.',
            'error'
        )
    }
}

if (refs.input) {
    refs.input.addEventListener('change', () => {
        selectFile(refs.input.files?.[0])
    })
}

if (refs.dropzone) {
    for (const eventName of ['dragenter', 'dragover']) {
        refs.dropzone.addEventListener(eventName, (event) => {
            event.preventDefault()
            refs.dropzone.classList.add('is-dragging')
        })
    }

    for (const eventName of ['dragleave', 'drop']) {
        refs.dropzone.addEventListener(eventName, (event) => {
            event.preventDefault()
            refs.dropzone.classList.remove('is-dragging')
        })
    }

    refs.dropzone.addEventListener('drop', (event) => {
        const file = event.dataTransfer?.files?.[0]

        if (!file) {
            return
        }

        const transfer = new DataTransfer()
        transfer.items.add(file)
        refs.input.files = transfer.files

        selectFile(file)
    })
}

if (refs.button) {
    refs.button.addEventListener('click', uploadSelectedFile)
}

if (refs.resultCopy) {
    refs.resultCopy.addEventListener('click', () => {
        copyText(refs.resultCopy.dataset.copy, refs.resultCopy)
    })
}

if (refs.list) {
    refs.list.addEventListener('click', (event) => {
        if (!(event.target instanceof Element)) {
            return
        }

        const copyButton = event.target.closest('[data-copy]')

        if (copyButton) {
            copyText(copyButton.dataset.copy, copyButton)
            return
        }

        const deleteButton = event.target.closest('[data-delete]')

        if (deleteButton) {
            deleteUpload(deleteButton)
        }
    })
}

refreshUploads().catch(() => {
    showError('The upload list could not be loaded from the API.')
})
