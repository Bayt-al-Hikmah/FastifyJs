const TOKEN_KEY = 'w5-task3-token'
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png'])

const statusLabels = {
    TODO: 'To do',
    IN_PROGRESS: 'In progress',
    DONE: 'Done'
}

const state = {
    token: localStorage.getItem(TOKEN_KEY),
    user: null,
    tasks: [],
    selectedTaskId: null,
    attachments: [],
    selectedFile: null,
    thumbnailUrls: new Set()
}

const elements = {
    authView: byId('auth-view'),
    dashboardView: byId('dashboard-view'),
    userChip: byId('user-chip'),
    userName: byId('user-name'),
    logoutButton: byId('logout-button'),
    loginForm: byId('login-form'),
    registerForm: byId('register-form'),
    authTabs: Array.from(document.querySelectorAll('[data-auth-tab]')),
    createTaskForm: byId('create-task-form'),
    taskList: byId('task-list'),
    taskCount: byId('task-count'),
    noTasks: byId('no-tasks'),
    emptyWorkspace: byId('empty-workspace'),
    taskWorkspace: byId('task-workspace'),
    taskTitle: byId('task-title'),
    taskDescription: byId('task-description'),
    taskStatus: byId('task-status'),
    taskCreated: byId('task-created'),
    deleteTaskButton: byId('delete-task-button'),
    uploadForm: byId('upload-form'),
    fileInput: byId('file-input'),
    dropzone: byId('dropzone'),
    dropzoneTitle: byId('dropzone-title'),
    dropzoneHint: byId('dropzone-hint'),
    uploadButton: byId('upload-button'),
    uploadStatus: byId('upload-status'),
    attachmentGrid: byId('attachment-grid'),
    attachmentCount: byId('attachment-count'),
    noAttachments: byId('no-attachments'),
    toast: byId('toast')
}

let toastTimer = null

function byId(id) {
    const element = document.getElementById(id)

    if (!element) {
        throw new Error(`Missing element: ${id}`)
    }

    return element
}

function createElement(tagName, className, text) {
    const element = document.createElement(tagName)

    if (className) {
        element.className = className
    }

    if (text !== undefined) {
        element.textContent = text
    }

    return element
}

async function api(path, options = {}) {
    const headers = {
        Accept: 'application/json',
        ...(options.headers ?? {})
    }

    if (state.token) {
        headers.Authorization = `Bearer ${state.token}`
    }

    let body = options.body

    if (body !== undefined && !(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json'
        body = JSON.stringify(body)
    }

    const response = await fetch(`/api${path}`, {
        method: options.method ?? 'GET',
        headers,
        body
    })

    const text = await response.text()
    let payload = null

    if (text) {
        try {
            payload = JSON.parse(text)
        } catch {
            payload = text
        }
    }

    if (!response.ok) {
        const message =
            payload &&
            typeof payload === 'object' &&
            typeof payload.error === 'string'
                ? payload.error
                : `Request failed with status ${response.status}`

        const error = new Error(message)
        error.status = response.status
        throw error
    }

    return payload
}

function showToast(message, tone = 'info') {
    window.clearTimeout(toastTimer)

    elements.toast.textContent = message
    elements.toast.dataset.tone = tone
    elements.toast.hidden = false

    toastTimer = window.setTimeout(() => {
        elements.toast.hidden = true
    }, 4200)
}

function setButtonBusy(button, busy, busyLabel, idleLabel) {
    button.disabled = busy
    button.textContent = busy ? busyLabel : idleLabel
}

function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) {
        return 'unknown size'
    }

    if (bytes < 1024) {
        return `${bytes} B`
    }

    const units = ['KB', 'MB', 'GB']
    let value = bytes / 1024
    let unitIndex = 0

    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024
        unitIndex += 1
    }

    return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`
}

function formatDate(value, includeTime = false) {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return 'Unknown date'
    }

    return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        ...(includeTime ? { timeStyle: 'short' } : {})
    }).format(date)
}

function showAuth() {
    elements.authView.hidden = false
    elements.dashboardView.hidden = true
    elements.userChip.hidden = true
    elements.logoutButton.hidden = true
}

function showDashboard() {
    elements.authView.hidden = true
    elements.dashboardView.hidden = false
    elements.userChip.hidden = false
    elements.logoutButton.hidden = false
    elements.userName.textContent = state.user
        ? `${state.user.name} · ${state.user.role === 'ADMIN' ? 'Admin' : 'Member'}`
        : 'Signed in'
}

function showAuthTab(tabName) {
    for (const tab of elements.authTabs) {
        const isActive = tab.dataset.authTab === tabName
        tab.classList.toggle('is-active', isActive)
        tab.setAttribute('aria-selected', String(isActive))
    }

    elements.loginForm.hidden = tabName !== 'login'
    elements.registerForm.hidden = tabName !== 'register'
}

function clearSession() {
    localStorage.removeItem(TOKEN_KEY)
    state.token = null
    state.user = null
    state.tasks = []
    state.selectedTaskId = null
    state.attachments = []
    clearSelectedFile()
    clearThumbnailUrls()
    showAuth()
}

async function handleLogin(event) {
    event.preventDefault()

    const form = elements.loginForm
    const button = form.querySelector('button[type="submit"]')
    const data = new FormData(form)

    setButtonBusy(button, true, 'Signing in…', 'Enter the studio')

    try {
        const result = await api('/auth/login', {
            method: 'POST',
            body: {
                email: String(data.get('email') ?? '').trim(),
                password: String(data.get('password') ?? '')
            }
        })

        state.token = result.accessToken
        state.user = result.user
        localStorage.setItem(TOKEN_KEY, result.accessToken)

        form.reset()
        showDashboard()
        showToast(`Welcome back, ${result.user.name}`, 'success')
        await loadTasks()
    } catch (error) {
        showToast(error.message, 'error')
    } finally {
        setButtonBusy(button, false, 'Signing in…', 'Enter the studio')
    }
}

async function handleRegister(event) {
    event.preventDefault()

    const form = elements.registerForm
    const button = form.querySelector('button[type="submit"]')
    const data = new FormData(form)
    const email = String(data.get('email') ?? '').trim()
    const password = String(data.get('password') ?? '')

    setButtonBusy(button, true, 'Creating account…', 'Create account')

    try {
        await api('/auth/register', {
            method: 'POST',
            body: {
                name: String(data.get('name') ?? '').trim(),
                email,
                password
            }
        })

        const login = await api('/auth/login', {
            method: 'POST',
            body: {
                email,
                password
            }
        })

        state.token = login.accessToken
        state.user = login.user
        localStorage.setItem(TOKEN_KEY, login.accessToken)

        form.reset()
        showDashboard()
        showToast('Account created. Your workspace is ready.', 'success')
        await loadTasks()
    } catch (error) {
        showToast(error.message, 'error')
    } finally {
        setButtonBusy(button, false, 'Creating account…', 'Create account')
    }
}

function updateUserChip() {
    if (!state.user) {
        return
    }

    elements.userName.textContent =
        `${state.user.name} · ${state.user.role === 'ADMIN' ? 'Admin' : 'Member'}`
}

async function loadSession() {
    if (!state.token) {
        showAuth()
        return
    }

    try {
        state.user = await api('/users/me')
        showDashboard()
        updateUserChip()
        await loadTasks()
    } catch {
        clearSession()
    }
}

async function loadTasks(preferredTaskId = null) {
    const result = await api('/tasks?limit=100')

    state.tasks = Array.isArray(result.data) ? result.data : []

    const desiredId = preferredTaskId ?? state.selectedTaskId
    const nextTask =
        state.tasks.find((task) => task.id === desiredId) ??
        state.tasks[0] ??
        null

    state.selectedTaskId = nextTask ? nextTask.id : null

    renderTasks()

    if (nextTask) {
        await selectTask(nextTask.id)
    } else {
        clearTaskWorkspace()
    }
}

function renderTasks() {
    elements.taskList.replaceChildren()
    elements.taskCount.textContent = String(state.tasks.length)
    elements.noTasks.hidden = state.tasks.length > 0

    for (const task of state.tasks) {
        const item = createElement('li')
        const button = createElement('button', 'task-item')
        button.type = 'button'

        if (task.id === state.selectedTaskId) {
            button.classList.add('is-active')
        }

        const main = createElement('span', 'task-item-main')
        const title = createElement('span', 'task-item-title', task.title)
        const meta = createElement(
            'span',
            'task-item-meta',
            `${statusLabels[task.status] ?? task.status} · ${formatDate(task.createdAt)}`
        )

        main.append(title, meta)

        const dot = createElement('span', 'status-dot')
        dot.dataset.status = task.status

        button.append(main, dot)
        button.addEventListener('click', () => {
            void selectTask(task.id)
        })

        item.append(button)
        elements.taskList.append(item)
    }
}

async function selectTask(taskId) {
    const task = state.tasks.find((candidate) => candidate.id === taskId)

    if (!task) {
        return
    }

    state.selectedTaskId = task.id
    renderTasks()
    showTask(task)
    await loadAttachments(task.id)
}

function showTask(task) {
    elements.emptyWorkspace.hidden = true
    elements.taskWorkspace.hidden = false

    elements.taskTitle.textContent = task.title
    elements.taskDescription.textContent =
        task.description || 'No description was provided for this task.'
    elements.taskStatus.textContent = statusLabels[task.status] ?? task.status
    elements.taskStatus.dataset.status = task.status
    elements.taskCreated.textContent = `Created ${formatDate(task.createdAt, true)}`

    clearSelectedFile()
    setUploadStatus('')
    elements.deleteTaskButton.disabled = false
}

function clearTaskWorkspace() {
    elements.emptyWorkspace.hidden = false
    elements.taskWorkspace.hidden = true
    elements.attachmentGrid.replaceChildren()
    elements.attachmentCount.textContent = '0'
    elements.noAttachments.hidden = true
    state.attachments = []
    clearSelectedFile()
    clearThumbnailUrls()
}

async function handleCreateTask(event) {
    event.preventDefault()

    const form = elements.createTaskForm
    const button = form.querySelector('button[type="submit"]')
    const data = new FormData(form)
    const title = String(data.get('title') ?? '').trim()
    const description = String(data.get('description') ?? '').trim()

    if (!title) {
        showToast('A task title is required.', 'error')
        return
    }

    setButtonBusy(button, true, 'Creating…', 'Create task')

    try {
        const task = await api('/tasks', {
            method: 'POST',
            body: {
                title,
                ...(description ? { description } : {})
            }
        })

        form.reset()
        await loadTasks(task.id)
        showToast('Task created.', 'success')
    } catch (error) {
        showToast(error.message, 'error')
    } finally {
        setButtonBusy(button, false, 'Creating…', 'Create task')
    }
}

async function handleDeleteTask() {
    if (!state.selectedTaskId) {
        return
    }

    const task = state.tasks.find(
        (candidate) => candidate.id === state.selectedTaskId
    )

    if (!task) {
        return
    }

    const confirmed = window.confirm(
        `Delete "${task.title}" and all of its attachments? This cannot be undone.`
    )

    if (!confirmed) {
        return
    }

    setButtonBusy(
        elements.deleteTaskButton,
        true,
        'Deleting…',
        'Delete task'
    )

    try {
        await api(`/tasks/${task.id}`, {
            method: 'DELETE'
        })

        state.selectedTaskId = null
        await loadTasks()
        showToast('Task and stored files deleted.', 'success')
    } catch (error) {
        showToast(error.message, 'error')
        elements.deleteTaskButton.disabled = false
        elements.deleteTaskButton.textContent = 'Delete task'
    }
}

function guessedMimeType(file) {
    if (ALLOWED_MIME_TYPES.has(file.type)) {
        return file.type
    }

    const name = file.name.toLowerCase()

    if (name.endsWith('.png')) {
        return 'image/png'
    }

    if (name.endsWith('.jpg') || name.endsWith('.jpeg')) {
        return 'image/jpeg'
    }

    return ''
}

function setSelectedFile(file) {
    const mimeType = guessedMimeType(file)

    if (!mimeType) {
        setUploadStatus('Choose a JPEG or PNG image.', 'error')
        showToast('Only JPEG and PNG images are accepted.', 'error')
        return
    }

    if (file.size === 0) {
        setUploadStatus('Empty files are not accepted.', 'error')
        return
    }

    if (file.size > MAX_UPLOAD_SIZE) {
        setUploadStatus('The image is larger than the 10 MB limit.', 'error')
        showToast('The maximum upload size is 10 MB.', 'error')
        return
    }

    state.selectedFile = file

    elements.dropzone.classList.add('has-file')
    elements.dropzoneTitle.textContent = file.name
    elements.dropzoneHint.textContent = `${formatBytes(file.size)} · ready to upload`
    elements.uploadButton.disabled = false

    setUploadStatus('')
}

function clearSelectedFile() {
    state.selectedFile = null
    elements.fileInput.value = ''
    elements.dropzone.classList.remove('has-file', 'is-dragging')
    elements.dropzoneTitle.textContent = 'Drop a JPEG or PNG here'
    elements.dropzoneHint.textContent = 'or browse your device · maximum 10 MB'
    elements.uploadButton.disabled = true
}

function setUploadStatus(message, tone = 'info') {
    elements.uploadStatus.textContent = message
    elements.uploadStatus.dataset.tone = tone
    elements.uploadStatus.hidden = !message
}

async function handleUpload(event) {
    event.preventDefault()

    if (!state.selectedTaskId || !state.selectedFile) {
        return
    }

    const taskId = state.selectedTaskId
    const file = state.selectedFile

    setButtonBusy(
        elements.uploadButton,
        true,
        'Uploading…',
        'Upload and generate thumbnail'
    )
    setUploadStatus('Uploading and decoding safely…')

    const formData = new FormData()
    formData.append('file', file, file.name)

    try {
        await api(`/tasks/${taskId}/attachments`, {
            method: 'POST',
            body: formData
        })

        clearSelectedFile()
        setUploadStatus('Thumbnail generated successfully.', 'success')
        showToast('Image uploaded and thumbnailed.', 'success')
        await loadAttachments(taskId)
    } catch (error) {
        setUploadStatus(error.message, 'error')
        showToast(error.message, 'error')
    } finally {
        elements.uploadButton.disabled = state.selectedFile === null
        elements.uploadButton.textContent = 'Upload and generate thumbnail'
    }
}

async function loadAttachments(taskId) {
    try {
        const attachments = await api(`/tasks/${taskId}/attachments`)

        if (state.selectedTaskId !== taskId) {
            return
        }

        state.attachments = Array.isArray(attachments) ? attachments : []

        clearThumbnailUrls()
        renderAttachments()
    } catch (error) {
        showToast(error.message, 'error')
    }
}

function clearThumbnailUrls() {
    for (const url of state.thumbnailUrls) {
        URL.revokeObjectURL(url)
    }

    state.thumbnailUrls.clear()
}

function renderAttachments() {
    elements.attachmentGrid.replaceChildren()

    elements.attachmentCount.textContent = String(state.attachments.length)
    elements.noAttachments.hidden = state.attachments.length > 0

    for (const attachment of state.attachments) {
        elements.attachmentGrid.append(
            buildAttachmentCard(attachment)
        )
    }
}

function buildAttachmentCard(attachment) {
    const card = createElement('article', 'attachment-card')
    const frame = createElement('figure', 'thumb-frame')
    const placeholder = createElement(
        'span',
        'thumb-placeholder',
        'Loading preview…'
    )
    const image = document.createElement('img')

    image.alt = `Thumbnail for ${attachment.originalName}`
    image.loading = 'lazy'
    image.hidden = true

    frame.append(placeholder, image)

    const body = createElement('div', 'attachment-body')
    const name = createElement('h3', 'attachment-name', attachment.originalName)
    const meta = createElement(
        'p',
        'attachment-meta',
        `${attachment.mimeType} · ${formatBytes(attachment.size)}`
    )
    const thumbnailMeta = createElement(
        'p',
        'attachment-meta',
        `Thumbnail ${formatBytes(attachment.thumbnailSize)} · uploaded ${formatDate(attachment.createdAt, true)}`
    )

    const actions = createElement('div', 'attachment-actions')
    const downloadButton = createElement('button', 'btn btn-ghost btn-small', 'Download')
    downloadButton.type = 'button'
    downloadButton.addEventListener('click', () => {
        void downloadAttachment(attachment, downloadButton)
    })

    const deleteButton = createElement('button', 'btn btn-danger-ghost btn-small', 'Delete')
    deleteButton.type = 'button'
    deleteButton.addEventListener('click', () => {
        void deleteAttachment(attachment, deleteButton)
    })

    actions.append(downloadButton, deleteButton)
    body.append(name, meta, thumbnailMeta, actions)
    card.append(frame, body)

    void loadThumbnail(attachment.id, image, placeholder)

    return card
}

async function loadThumbnail(attachmentId, image, placeholder) {
    try {
        const response = await fetch(
            `/api/attachments/${attachmentId}/thumbnail`,
            {
                headers: {
                    Authorization: `Bearer ${state.token}`
                }
            }
        )

        if (!response.ok) {
            throw new Error('Thumbnail unavailable')
        }

        const blob = await response.blob()

        if (!image.isConnected) {
            return
        }

        const url = URL.createObjectURL(blob)
        state.thumbnailUrls.add(url)

        image.src = url
        image.hidden = false
        placeholder.hidden = true
    } catch {
        placeholder.textContent = 'Preview unavailable'
        placeholder.hidden = false
    }
}

async function downloadAttachment(attachment, button) {
    setButtonBusy(button, true, 'Preparing…', 'Download')

    try {
        const response = await fetch(
            `/api/attachments/${attachment.id}/download`,
            {
                headers: {
                    Authorization: `Bearer ${state.token}`
                }
            }
        )

        if (!response.ok) {
            let message = 'The file could not be downloaded.'

            try {
                const payload = await response.json()

                if (payload && typeof payload.error === 'string') {
                    message = payload.error
                }
            } catch {
                // Keep the generic message.
            }

            throw new Error(message)
        }

        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')

        link.href = url
        link.download = attachment.originalName
        document.body.append(link)
        link.click()
        link.remove()

        window.setTimeout(() => URL.revokeObjectURL(url), 2000)
    } catch (error) {
        showToast(error.message, 'error')
    } finally {
        setButtonBusy(button, false, 'Preparing…', 'Download')
    }
}

async function deleteAttachment(attachment, button) {
    const confirmed = window.confirm(
        `Delete "${attachment.originalName}"? The original and its thumbnail will be removed.`
    )

    if (!confirmed) {
        return
    }

    setButtonBusy(button, true, 'Deleting…', 'Delete')

    try {
        await api(`/attachments/${attachment.id}`, {
            method: 'DELETE'
        })

        if (state.selectedTaskId) {
            await loadAttachments(state.selectedTaskId)
        }

        showToast('Attachment deleted.', 'success')
    } catch (error) {
        showToast(error.message, 'error')
        setButtonBusy(button, false, 'Deleting…', 'Delete')
    }
}

function wireUploadEvents() {
    elements.fileInput.addEventListener('change', () => {
        const file = elements.fileInput.files?.[0]

        if (file) {
            setSelectedFile(file)
        }
    })

    for (const eventName of ['dragenter', 'dragover']) {
        elements.dropzone.addEventListener(eventName, (event) => {
            event.preventDefault()
            elements.dropzone.classList.add('is-dragging')
        })
    }

    for (const eventName of ['dragleave', 'drop']) {
        elements.dropzone.addEventListener(eventName, (event) => {
            event.preventDefault()
            elements.dropzone.classList.remove('is-dragging')
        })
    }

    elements.dropzone.addEventListener('drop', (event) => {
        const file = event.dataTransfer?.files?.[0]

        if (file) {
            setSelectedFile(file)
        }
    })
}

function wireEvents() {
    for (const tab of elements.authTabs) {
        tab.addEventListener('click', () => {
            showAuthTab(tab.dataset.authTab ?? 'login')
        })
    }

    elements.loginForm.addEventListener('submit', (event) => {
        void handleLogin(event)
    })

    elements.registerForm.addEventListener('submit', (event) => {
        void handleRegister(event)
    })

    elements.logoutButton.addEventListener('click', () => {
        clearSession()
        showAuthTab('login')
        showToast('Signed out.')
    })

    elements.createTaskForm.addEventListener('submit', (event) => {
        void handleCreateTask(event)
    })

    elements.deleteTaskButton.addEventListener('click', () => {
        void handleDeleteTask()
    })

    elements.uploadForm.addEventListener('submit', (event) => {
        void handleUpload(event)
    })

    wireUploadEvents()
}

async function bootstrap() {
    wireEvents()
    await loadSession()
}

void bootstrap()
