/* =========================================================
   Attach — Workshop 5 Task 1 dashboard
   Plain browser JavaScript: fetch + Bearer JWT.
   ========================================================= */

const TOKEN_KEY = 'w5-task1-access-token';

const MAX_FILES_PER_REQUEST = 5;
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

const state = {
    token: window.localStorage.getItem(TOKEN_KEY),
    user: null,
    tasks: [],
    attachmentsByTask: new Map(),
    selectedTaskId: null,
    selectedFiles: [],
    selectionError: '',
    busy: false,
    toastTimer: null
};

const elements = {
    authView: document.querySelector('#auth-view'),
    workspace: document.querySelector('#workspace'),
    sessionBar: document.querySelector('#session-bar'),
    sessionName: document.querySelector('#session-name'),
    headerUser: document.querySelector('#header-user'),
    logoutButton: document.querySelector('#logout-button'),
    loginTab: document.querySelector('#login-tab'),
    registerTab: document.querySelector('#register-tab'),
    loginForm: document.querySelector('#login-form'),
    registerForm: document.querySelector('#register-form'),
    authMessage: document.querySelector('#auth-message'),
    taskForm: document.querySelector('#task-form'),
    taskMessage: document.querySelector('#task-message'),
    taskList: document.querySelector('#task-list'),
    taskCount: document.querySelector('#task-count'),
    taskStat: document.querySelector('#task-stat'),
    attachmentStat: document.querySelector('#attachment-stat'),
    quotaStat: document.querySelector('#quota-stat'),
    quotaFoot: document.querySelector('#quota-foot'),
    taskEmpty: document.querySelector('#task-empty'),
    taskContent: document.querySelector('#task-content'),
    detailStatus: document.querySelector('#detail-status'),
    detailDate: document.querySelector('#detail-date'),
    detailTitle: document.querySelector('#detail-title-text'),
    detailDescription: document.querySelector('#detail-description'),
    deleteTaskButton: document.querySelector('#delete-task-button'),
    attachmentCount: document.querySelector('#attachment-count'),
    attachmentList: document.querySelector('#attachment-list'),
    uploadForm: document.querySelector('#upload-form'),
    fileInput: document.querySelector('#file-input'),
    dropzone: document.querySelector('#dropzone'),
    selection: document.querySelector('#selection'),
    selectionSummary: document.querySelector('#selection-summary'),
    selectionList: document.querySelector('#selection-list'),
    clearSelection: document.querySelector('#clear-selection'),
    uploadButton: document.querySelector('#upload-button'),
    uploadMessage: document.querySelector('#upload-message'),
    toast: document.querySelector('#toast')
};

document.addEventListener('DOMContentLoaded', init);

function init() {
    wireEvents();
    void loadSession();
}

function wireEvents() {
    elements.loginTab.addEventListener('click', () => switchAuthTab('login'));
    elements.registerTab.addEventListener('click', () => switchAuthTab('register'));

    elements.loginForm.addEventListener('submit', (event) => {
        event.preventDefault();
        void handleLogin();
    });

    elements.registerForm.addEventListener('submit', (event) => {
        event.preventDefault();
        void handleRegister();
    });

    elements.logoutButton.addEventListener('click', logout);

    elements.taskForm.addEventListener('submit', (event) => {
        event.preventDefault();
        void handleCreateTask();
    });

    elements.taskList.addEventListener('click', (event) => {
        const button = event.target.closest('[data-task-id]');

        if (!button) {
            return;
        }

        const taskId = Number(button.dataset.taskId);
        void selectTask(taskId);
    });

    elements.deleteTaskButton.addEventListener('click', () => {
        void handleDeleteTask();
    });

    elements.fileInput.addEventListener('change', () => {
        applyFileSelection(Array.from(elements.fileInput.files || []));
    });

    elements.clearSelection.addEventListener('click', clearSelection);

    elements.uploadForm.addEventListener('submit', (event) => {
        event.preventDefault();
        void handleUpload();
    });

    elements.attachmentList.addEventListener('click', (event) => {
        const actionButton = event.target.closest('[data-action]');

        if (!actionButton) {
            return;
        }

        const attachmentId = Number(actionButton.dataset.attachmentId);

        if (actionButton.dataset.action === 'download') {
            void downloadAttachment(attachmentId);
        }

        if (actionButton.dataset.action === 'delete') {
            void deleteAttachment(attachmentId);
        }
    });

    const dropzone = elements.dropzone;

    for (const eventName of ['dragenter', 'dragover']) {
        dropzone.addEventListener(eventName, (event) => {
            event.preventDefault();
            dropzone.classList.add('is-dragging');
        });
    }

    for (const eventName of ['dragleave', 'dragend']) {
        dropzone.addEventListener(eventName, () => {
            dropzone.classList.remove('is-dragging');
        });
    }

    dropzone.addEventListener('drop', (event) => {
        event.preventDefault();
        dropzone.classList.remove('is-dragging');

        const files = Array.from(event.dataTransfer?.files || []);
        applyFileSelection(files);
    });
}

/* ---------- Authentication ---------- */

async function loadSession() {
    if (!state.token) {
        showAuth();
        return;
    }

    try {
        state.user = await api('/api/users/me');
        showWorkspace();
        await loadTasks();
    } catch (error) {
        clearSession();
        showAuth();
        setMessage(elements.authMessage, error.message, 'error');
    }
}

function switchAuthTab(mode) {
    const isLogin = mode === 'login';

    elements.loginTab.classList.toggle('is-active', isLogin);
    elements.registerTab.classList.toggle('is-active', !isLogin);
    elements.loginTab.setAttribute('aria-selected', String(isLogin));
    elements.registerTab.setAttribute('aria-selected', String(!isLogin));
    elements.loginForm.hidden = !isLogin;
    elements.registerForm.hidden = isLogin;
    setMessage(elements.authMessage, '', '');
}

async function handleLogin() {
    const email = document.querySelector('#login-email').value.trim();
    const password = document.querySelector('#login-password').value;

    setMessage(elements.authMessage, 'Signing in…', '');

    try {
        const data = await api('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        state.token = data.accessToken;
        state.user = data.user;
        window.localStorage.setItem(TOKEN_KEY, data.accessToken);

        elements.loginForm.reset();
        setMessage(elements.authMessage, '', '');

        showWorkspace();
        await loadTasks();
        toast(`Welcome back, ${data.user.name}.`);
    } catch (error) {
        setMessage(elements.authMessage, error.message, 'error');
    }
}

async function handleRegister() {
    const name = document.querySelector('#register-name').value.trim();
    const email = document.querySelector('#register-email').value.trim();
    const password = document.querySelector('#register-password').value;

    setMessage(elements.authMessage, 'Creating your account…', '');

    try {
        await api('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        });

        elements.loginForm.reset();
        document.querySelector('#login-email').value = email;

        elements.registerForm.reset();
        switchAuthTab('login');
        setMessage(elements.authMessage, 'Account created. Sign in to continue.', 'success');
        toast('Account created. Sign in to continue.');
    } catch (error) {
        setMessage(elements.authMessage, error.message, 'error');
    }
}

function showAuth() {
    elements.authView.hidden = false;
    elements.workspace.hidden = true;
    elements.sessionBar.hidden = true;
}

function showWorkspace() {
    elements.authView.hidden = true;
    elements.workspace.hidden = false;
    elements.sessionBar.hidden = false;

    const name = state.user?.name || 'Signed in';
    const email = state.user?.email || '';

    elements.sessionName.textContent = email ? `${name} · ${email}` : name;
    elements.sessionName.title = email;
    elements.headerUser.textContent = name;
}

function logout() {
    clearSession();
    showAuth();
    setMessage(elements.authMessage, 'You have been signed out.', 'success');
}

function clearSession() {
    state.token = null;
    state.user = null;
    state.tasks = [];
    state.attachmentsByTask.clear();
    state.selectedTaskId = null;
    state.selectedFiles = [];
    state.selectionError = '';
    window.localStorage.removeItem(TOKEN_KEY);

    elements.taskList.innerHTML = '';
    elements.attachmentList.innerHTML = '';
    elements.taskContent.hidden = true;
    elements.taskEmpty.hidden = false;
    elements.uploadForm.reset();
    clearSelection();
    updateStats();
}

/* ---------- Tasks ---------- */

async function loadTasks() {
    try {
        const data = await api('/api/tasks?limit=100');
        state.tasks = Array.isArray(data.data) ? data.data : [];

        state.attachmentsByTask.clear();

        await Promise.all(
            state.tasks.map(async (task) => {
                try {
                    await loadAttachments(task.id);
                } catch {
                    state.attachmentsByTask.set(task.id, []);
                }
            })
        );

        if (
            state.selectedTaskId !== null &&
            !state.tasks.some((task) => task.id === state.selectedTaskId)
        ) {
            state.selectedTaskId = null;
        }

        if (state.selectedTaskId === null && state.tasks.length > 0) {
            state.selectedTaskId = state.tasks[0].id;
        }

        renderTaskList();
        renderTaskDetail();
        updateStats();
    } catch (error) {
        setMessage(elements.taskMessage, error.message, 'error');
    }
}

async function loadAttachments(taskId) {
    const attachments = await api(`/api/tasks/${taskId}/attachments`);
    state.attachmentsByTask.set(taskId, Array.isArray(attachments) ? attachments : []);
    return state.attachmentsByTask.get(taskId);
}

async function selectTask(taskId) {
    if (!Number.isInteger(taskId) || taskId <= 0) {
        return;
    }

    state.selectedTaskId = taskId;
    clearSelection();
    setMessage(elements.uploadMessage, '', '');
    renderTaskList();
    renderTaskDetail();

    if (!state.attachmentsByTask.has(taskId)) {
        try {
            await loadAttachments(taskId);
            renderTaskDetail();
            updateStats();
        } catch (error) {
            setMessage(elements.uploadMessage, error.message, 'error');
        }
    }
}

async function handleCreateTask() {
    const titleInput = document.querySelector('#task-title');
    const descriptionInput = document.querySelector('#task-description');

    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();

    if (!title) {
        setMessage(elements.taskMessage, 'A task title is required.', 'error');
        return;
    }

    setMessage(elements.taskMessage, 'Creating task…', '');

    try {
        const task = await api('/api/tasks', {
            method: 'POST',
            body: JSON.stringify({
                title,
                description: description || undefined
            })
        });

        titleInput.value = '';
        descriptionInput.value = '';
        setMessage(elements.taskMessage, '', '');

        state.selectedTaskId = task.id;
        state.attachmentsByTask.set(task.id, []);
        await loadTasks();
        toast('Task created. Add your first attachment.');
    } catch (error) {
        setMessage(elements.taskMessage, error.message, 'error');
    }
}

async function handleDeleteTask() {
    const taskId = state.selectedTaskId;

    if (!taskId) {
        return;
    }

    const task = findTask(taskId);

    if (!task) {
        return;
    }

    const confirmed = window.confirm(
        `Delete "${task.title}"? Its attachment files will be removed too.`
    );

    if (!confirmed) {
        return;
    }

    try {
        await api(`/api/tasks/${taskId}`, {
            method: 'DELETE'
        });

        state.attachmentsByTask.delete(taskId);
        state.selectedTaskId = null;
        await loadTasks();
        toast('Task deleted.');
    } catch (error) {
        setMessage(elements.uploadMessage, error.message, 'error');
    }
}

function findTask(taskId) {
    return state.tasks.find((task) => task.id === taskId) || null;
}

/* ---------- Attachments ---------- */

function applyFileSelection(files) {
    const accepted = [];
    let error = '';

    if (files.length > MAX_FILES_PER_REQUEST) {
        error = `Choose at most ${MAX_FILES_PER_REQUEST} files per upload. Only the first five were kept.`;
    }

    for (const file of files.slice(0, MAX_FILES_PER_REQUEST)) {
        if (file.size > MAX_ATTACHMENT_SIZE) {
            error = `${file.name} is larger than 10 MB.`;
            continue;
        }

        if (!isAllowedFile(file.name)) {
            error = `${file.name} is not a PNG, JPEG, PDF, or TXT file.`;
            continue;
        }

        if (file.size === 0) {
            error = `${file.name} is empty.`;
            continue;
        }

        accepted.push(file);
    }

    state.selectedFiles = accepted;
    state.selectionError = error;

    renderSelection();
    elements.fileInput.value = '';
}

function isAllowedFile(name) {
    return /\.(png|jpe?g|pdf|txt)$/i.test(name);
}

function clearSelection() {
    state.selectedFiles = [];
    state.selectionError = '';
    elements.fileInput.value = '';
    renderSelection();
    setMessage(elements.uploadMessage, '', '');
}

function renderSelection() {
    const files = state.selectedFiles;

    elements.selection.hidden = files.length === 0;
    elements.selectionList.innerHTML = '';

    if (files.length === 0) {
        elements.uploadButton.disabled = true;
        return;
    }

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    elements.selectionSummary.textContent =
        `${files.length} file${files.length === 1 ? '' : 's'} · ${formatBytes(totalSize)}`;

    for (const file of files) {
        const item = document.createElement('li');
        const name = document.createElement('span');
        const size = document.createElement('span');

        name.textContent = file.name;
        size.textContent = formatBytes(file.size);

        item.append(name, size);
        elements.selectionList.append(item);
    }

    elements.uploadButton.disabled = files.length === 0 || Boolean(state.selectionError) || state.busy;

    if (state.selectionError) {
        setMessage(elements.uploadMessage, state.selectionError, 'error');
    }
}

async function handleUpload() {
    const taskId = state.selectedTaskId;

    if (!taskId || state.selectedFiles.length === 0 || state.busy) {
        return;
    }

    if (state.selectionError) {
        setMessage(elements.uploadMessage, state.selectionError, 'error');
        return;
    }

    const formData = new FormData();

    for (const file of state.selectedFiles) {
        formData.append('files', file);
    }

    state.busy = true;
    elements.uploadButton.disabled = true;
    elements.uploadButton.textContent = 'Uploading…';
    setMessage(elements.uploadMessage, 'Streaming files to private storage…', '');

    try {
        const result = await api(`/api/tasks/${taskId}/attachments`, {
            method: 'POST',
            body: formData
        });

        const uploaded = result?.attachments?.length ?? 0;

        state.selectedFiles = [];
        state.selectionError = '';
        elements.fileInput.value = '';
        renderSelection();

        await loadAttachments(taskId);
        renderTaskList();
        renderTaskDetail();
        updateStats();

        setMessage(elements.uploadMessage, `${uploaded} attachment${uploaded === 1 ? '' : 's'} uploaded.`, 'success');
        toast(`${uploaded} attachment${uploaded === 1 ? '' : 's'} uploaded.`);
    } catch (error) {
        setMessage(elements.uploadMessage, error.message, 'error');
        toast(error.message, 'error');
    } finally {
        state.busy = false;
        elements.uploadButton.textContent = 'Upload attachments';
        renderSelection();
    }
}

async function downloadAttachment(attachmentId) {
    const attachment = findAttachment(attachmentId);

    if (!attachment) {
        return;
    }

    try {
        const response = await fetch(`/api/attachments/${attachmentId}/download`, {
            headers: authHeaders()
        });

        if (response.status === 401) {
            clearSession();
            showAuth();
            setMessage(elements.authMessage, 'Your session expired. Sign in again.', 'error');
            return;
        }

        if (!response.ok) {
            throw new Error(`Download failed (${response.status}).`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = attachment.originalName;
        document.body.append(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);

        toast(`Downloaded ${attachment.originalName}.`);
    } catch (error) {
        toast(error.message, 'error');
    }
}

async function deleteAttachment(attachmentId) {
    const attachment = findAttachment(attachmentId);

    if (!attachment) {
        return;
    }

    const confirmed = window.confirm(`Delete "${attachment.originalName}"?`);

    if (!confirmed) {
        return;
    }

    try {
        await api(`/api/attachments/${attachmentId}`, {
            method: 'DELETE'
        });

        const taskId = attachment.taskId;
        const remaining = (state.attachmentsByTask.get(taskId) || [])
            .filter((item) => item.id !== attachmentId);

        state.attachmentsByTask.set(taskId, remaining);
        renderTaskList();
        renderTaskDetail();
        updateStats();
        toast('Attachment deleted.');
    } catch (error) {
        toast(error.message, 'error');
    }
}

function findAttachment(attachmentId) {
    for (const attachments of state.attachmentsByTask.values()) {
        const match = attachments.find((attachment) => attachment.id === attachmentId);

        if (match) {
            return match;
        }
    }

    return null;
}

/* ---------- Rendering ---------- */

function renderTaskList() {
    elements.taskList.innerHTML = '';
    elements.taskCount.textContent = String(state.tasks.length);

    if (state.tasks.length === 0) {
        const item = document.createElement('li');
        item.className = 'task-empty';
        item.textContent = 'No tasks yet. Create one above to begin.';
        elements.taskList.append(item);
        return;
    }

    for (const task of state.tasks) {
        const attachments = state.attachmentsByTask.get(task.id) || [];
        const item = document.createElement('li');
        const button = document.createElement('button');

        button.type = 'button';
        button.className = 'task-item';
        button.dataset.taskId = String(task.id);
        button.classList.toggle('is-active', task.id === state.selectedTaskId);

        button.innerHTML = `
            <span class="task-row">
                <span class="task-title">${escapeHtml(task.title)}</span>
                <span class="task-badge">${attachments.length} file${attachments.length === 1 ? '' : 's'}</span>
            </span>
            <span class="task-sub">
                <span>${escapeHtml(formatStatus(task.status))}</span>
                <span aria-hidden="true">·</span>
                <span>${escapeHtml(formatDate(task.createdAt))}</span>
            </span>
        `;

        item.append(button);
        elements.taskList.append(item);
    }
}

function renderTaskDetail() {
    const task = state.selectedTaskId ? findTask(state.selectedTaskId) : null;

    if (!task) {
        elements.taskContent.hidden = true;
        elements.taskEmpty.hidden = false;
        return;
    }

    elements.taskEmpty.hidden = true;
    elements.taskContent.hidden = false;

    elements.detailTitle.textContent = task.title;
    elements.detailDescription.textContent = task.description || 'No description yet.';
    elements.detailDate.textContent = `Created ${formatDate(task.createdAt)}`;

    elements.detailStatus.textContent = formatStatus(task.status);
    elements.detailStatus.className = `status-pill status-${String(task.status).toLowerCase()}`;

    renderAttachmentList(task.id);
}

function renderAttachmentList(taskId) {
    const attachments = state.attachmentsByTask.get(taskId);

    elements.attachmentList.innerHTML = '';
    elements.attachmentCount.textContent = String(attachments?.length ?? 0);

    if (attachments === undefined) {
        const item = document.createElement('li');
        item.className = 'loading-row';
        item.textContent = 'Loading attachments…';
        elements.attachmentList.append(item);
        return;
    }

    if (attachments.length === 0) {
        const item = document.createElement('li');
        item.className = 'attachment-empty';
        item.textContent = 'No attachments yet. Upload up to five files at once.';
        elements.attachmentList.append(item);
        return;
    }

    for (const attachment of attachments) {
        const item = document.createElement('li');
        item.className = 'attachment-item';

        item.innerHTML = `
            <span class="file-icon ${escapeHtml(fileIconClass(attachment.extension))}">${escapeHtml(fileIconLabel(attachment.extension))}</span>
            <span class="file-body">
                <span class="file-name">${escapeHtml(attachment.originalName)}</span>
                <span class="file-meta">${escapeHtml(formatMime(attachment.mimeType))} · ${escapeHtml(formatBytes(attachment.size))} · ${escapeHtml(formatDate(attachment.createdAt))}</span>
            </span>
            <span class="file-actions">
                <button class="icon-button" type="button" title="Download" aria-label="Download ${escapeHtml(attachment.originalName)}" data-action="download" data-attachment-id="${attachment.id}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M12 3v12"/>
                        <path d="m7 10 5 5 5-5"/>
                        <path d="M5 21h14"/>
                    </svg>
                </button>
                <button class="icon-button is-danger" type="button" title="Delete" aria-label="Delete ${escapeHtml(attachment.originalName)}" data-action="delete" data-attachment-id="${attachment.id}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M4 7h16"/>
                        <path d="M9 7V4h6v3"/>
                        <path d="m6 7 1 13h10l1-13"/>
                        <path d="M10 11v5M14 11v5"/>
                    </svg>
                </button>
            </span>
        `;

        elements.attachmentList.append(item);
    }
}

async function updateStats() {
    elements.taskStat.textContent = String(state.tasks.length);
    elements.taskCount.textContent = String(state.tasks.length);

    let total = 0;

    for (const attachments of state.attachmentsByTask.values()) {
        total += attachments.length;
    }

    elements.attachmentStat.textContent = String(total);

    try {
        if (state.token) {
            const quota = await api('/api/users/me/storage-quota');
            if (elements.quotaStat && quota) {
                elements.quotaStat.textContent = `${quota.usedMb} MB / ${quota.quotaMb} MB`;
                if (elements.quotaFoot) {
                    const pct = Math.round((quota.usedBytes / quota.quotaBytes) * 100);
                    elements.quotaFoot.textContent = `${pct}% used · ${quota.attachmentCount} files total`;
                }
            }
        }
    } catch {
        // ignore background quota stat refresh failure
    }
}

/* ---------- API and formatting ---------- */

async function api(path, options = {}) {
    const headers = new Headers(options.headers || {});

    if (state.token) {
        headers.set('Authorization', `Bearer ${state.token}`);
    }

    if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(path, {
        ...options,
        headers
    });

    const text = await response.text();
    let data = null;

    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            data = { error: text };
        }
    }

    if (response.status === 401) {
        clearSession();
        showAuth();
        throw new Error('Your session expired. Sign in again.');
    }

    if (!response.ok) {
        const error = new Error(data?.error || `Request failed (${response.status}).`);
        error.status = response.status;
        error.code = data?.code;
        throw error;
    }

    return data;
}

function authHeaders() {
    return state.token
        ? { Authorization: `Bearer ${state.token}` }
        : {};
}

function setMessage(element, message, kind) {
    element.textContent = message;
    element.classList.toggle('is-error', kind === 'error');
    element.classList.toggle('is-success', kind === 'success');
}

function toast(message, kind = 'success') {
    window.clearTimeout(state.toastTimer);

    elements.toast.textContent = message;
    elements.toast.classList.toggle('is-error', kind === 'error');
    elements.toast.hidden = false;

    state.toastTimer = window.setTimeout(() => {
        elements.toast.hidden = true;
    }, 4200);
}

function formatStatus(status) {
    return String(status || 'TODO').replaceAll('_', ' ');
}

function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) {
        return '0 B';
    }

    if (bytes < 1024) {
        return `${bytes} B`;
    }

    const units = ['KB', 'MB', 'GB'];
    let value = bytes / 1024;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }

    const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;

    return `${rounded} ${units[unitIndex]}`;
}

function formatDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return 'Unknown date';
    }

    return new Intl.DateTimeFormat(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }).format(date);
}

function formatMime(mimeType) {
    if (mimeType === 'image/png') {
        return 'PNG image';
    }

    if (mimeType === 'image/jpeg') {
        return 'JPEG image';
    }

    if (mimeType === 'application/pdf') {
        return 'PDF document';
    }

    if (mimeType === 'text/plain') {
        return 'Plain text';
    }

    return mimeType || 'File';
}

function fileIconLabel(extension) {
    const value = String(extension || '').toLowerCase();

    if (value === 'pdf') {
        return 'PDF';
    }

    if (value === 'txt') {
        return 'TXT';
    }

    if (value === 'png') {
        return 'PNG';
    }

    if (value === 'jpg' || value === 'jpeg') {
        return 'JPG';
    }

    return 'FILE';
}

function fileIconClass(extension) {
    const value = String(extension || '').toLowerCase();

    if (value === 'pdf') {
        return 'file-pdf';
    }

    if (value === 'txt') {
        return 'file-txt';
    }

    return '';
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}
