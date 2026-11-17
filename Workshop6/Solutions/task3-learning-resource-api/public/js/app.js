/* =========================================================
   Open Shelf — dashboard behaviour.
   Plain ES modules + Fetch. User data is rendered with textContent.
   ========================================================= */

import {
    apiRequest,
    clearAccessToken,
    describeError,
    downloadBlob,
    setAccessToken
} from './api.js';

const PAGE_SIZE = 9;


const state = {
    user: null,
    view: 'catalogue',
    catalogue: {
        items: [],
        page: 1,
        limit: PAGE_SIZE,
        total: 0,
        totalPages: 0,
        search: '',
        subject: '',
        type: ''
    },
    studio: {
        items: [],
        status: '',
        search: ''
    },
    editingId: null,
    detailResourceId: null,
    objectUrls: [],
    toastTimer: null,
    busy: false
};


const elements = {
    authView: document.querySelector('#auth-view'),
    workspace: document.querySelector('#workspace'),
    sessionBar: document.querySelector('#session-bar'),
    sessionRole: document.querySelector('#session-role'),
    sessionName: document.querySelector('#session-name'),
    logoutButton: document.querySelector('#logout-button'),

    loginTab: document.querySelector('#login-tab'),
    registerTab: document.querySelector('#register-tab'),
    loginForm: document.querySelector('#login-form'),
    registerForm: document.querySelector('#register-form'),
    authMessage: document.querySelector('#auth-message'),
    authErrors: document.querySelector('#auth-errors'),

    headerUser: document.querySelector('#header-user'),
    headerRole: document.querySelector('#header-role'),
    statPublished: document.querySelector('#stat-published'),
    statPage: document.querySelector('#stat-page'),
    statSubjects: document.querySelector('#stat-subjects'),

    catalogueTab: document.querySelector('#catalogue-tab'),
    studioTab: document.querySelector('#studio-tab'),
    catalogueView: document.querySelector('#catalogue-view'),
    studioView: document.querySelector('#studio-view'),

    filterForm: document.querySelector('#filter-form'),
    filterSearch: document.querySelector('#filter-search'),
    filterSubject: document.querySelector('#filter-subject'),
    filterType: document.querySelector('#filter-type'),
    resetFilters: document.querySelector('#reset-filters'),
    resultsCount: document.querySelector('#results-count'),
    prevPage: document.querySelector('#prev-page'),
    nextPage: document.querySelector('#next-page'),
    pageLabel: document.querySelector('#page-label'),
    resourceGrid: document.querySelector('#resource-grid'),

    resourceForm: document.querySelector('#resource-form'),
    resourceFormTitle: document.querySelector('#resource-form-title'),
    resourceTitle: document.querySelector('#resource-title'),
    resourceDescription: document.querySelector('#resource-description'),
    resourceSubject: document.querySelector('#resource-subject'),
    resourceType: document.querySelector('#resource-type'),
    statusField: document.querySelector('#status-field'),
    resourceStatus: document.querySelector('#resource-status'),
    saveResource: document.querySelector('#save-resource'),
    cancelEdit: document.querySelector('#cancel-edit'),
    resourceMessage: document.querySelector('#resource-message'),
    resourceErrors: document.querySelector('#resource-errors'),

    attachmentBox: document.querySelector('#attachment-box'),
    attachmentName: document.querySelector('#attachment-name'),
    removeAttachment: document.querySelector('#remove-attachment'),
    uploadForm: document.querySelector('#upload-form'),
    attachmentInput: document.querySelector('#attachment-input'),
    uploadButton: document.querySelector('#upload-button'),
    uploadMessage: document.querySelector('#upload-message'),

    studioStatus: document.querySelector('#studio-status'),
    studioSearch: document.querySelector('#studio-search'),
    studioCount: document.querySelector('#studio-count'),
    studioList: document.querySelector('#studio-list'),

    drawerBackdrop: document.querySelector('#drawer-backdrop'),
    detailDrawer: document.querySelector('#detail-drawer'),
    detailTitle: document.querySelector('#detail-title'),
    detailBody: document.querySelector('#detail-body'),
    closeDetail: document.querySelector('#close-detail'),

    toast: document.querySelector('#toast')
};


document.addEventListener('DOMContentLoaded', init);


function init() {
    wireEvents();
    showAuth();
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

    elements.catalogueTab.addEventListener('click', () => switchView('catalogue'));
    elements.studioTab.addEventListener('click', () => switchView('studio'));

    elements.filterForm.addEventListener('submit', (event) => {
        event.preventDefault();
        state.catalogue.search = elements.filterSearch.value.trim();
        state.catalogue.subject = elements.filterSubject.value;
        state.catalogue.type = elements.filterType.value;
        state.catalogue.page = 1;
        void loadCatalogue();
    });

    elements.resetFilters.addEventListener('click', () => {
        elements.filterForm.reset();
        state.catalogue.search = '';
        state.catalogue.subject = '';
        state.catalogue.type = '';
        state.catalogue.page = 1;
        void loadCatalogue();
    });

    elements.prevPage.addEventListener('click', () => changePage(-1));
    elements.nextPage.addEventListener('click', () => changePage(1));

    elements.resourceGrid.addEventListener('click', (event) => {
        const button = event.target.closest('[data-action]');
        if (!button) {
            return;
        }

        const resourceId = Number(button.dataset.resourceId);

        if (button.dataset.action === 'detail') {
            void openDetail(resourceId);
        }

        if (button.dataset.action === 'edit') {
            void startEdit(resourceId);
        }

        if (button.dataset.action === 'download') {
            void downloadAttachment(resourceId);
        }
    });

    elements.resourceForm.addEventListener('submit', (event) => {
        event.preventDefault();
        void handleResourceSubmit();
    });

    elements.cancelEdit.addEventListener('click', resetResourceForm);

    elements.uploadForm.addEventListener('submit', (event) => {
        event.preventDefault();
        void handleUpload();
    });

    elements.attachmentInput.addEventListener('change', () => {
        elements.uploadButton.disabled = elements.attachmentInput.files.length === 0;
        setMessage(elements.uploadMessage, '', '');
    });

    elements.removeAttachment.addEventListener('click', () => {
        void handleRemoveAttachment();
    });

    elements.studioList.addEventListener('click', (event) => {
        const button = event.target.closest('[data-action]');
        if (!button) {
            return;
        }

        const resourceId = Number(button.dataset.resourceId);
        const action = button.dataset.action;

        if (action === 'edit') {
            void startEdit(resourceId);
        }

        if (action === 'status') {
            void toggleStatus(resourceId);
        }

        if (action === 'delete') {
            void deleteResource(resourceId);
        }

        if (action === 'detail') {
            void openDetail(resourceId);
        }
    });

    elements.studioStatus.addEventListener('change', () => {
        state.studio.status = elements.studioStatus.value;
        void loadStudio();
    });

    elements.studioSearch.addEventListener('input', () => {
        state.studio.search = elements.studioSearch.value.trim();
        void loadStudio();
    });

    elements.closeDetail.addEventListener('click', closeDetail);
    elements.drawerBackdrop.addEventListener('click', closeDetail);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !elements.detailDrawer.hidden) {
            closeDetail();
        }
    });
}


/* ---------- Authentication ---------- */

function switchAuthTab(mode) {
    const isLogin = mode === 'login';

    elements.loginTab.classList.toggle('is-active', isLogin);
    elements.registerTab.classList.toggle('is-active', !isLogin);
    elements.loginTab.setAttribute('aria-selected', String(isLogin));
    elements.registerTab.setAttribute('aria-selected', String(!isLogin));
    elements.loginForm.hidden = !isLogin;
    elements.registerForm.hidden = isLogin;
    setMessage(elements.authMessage, '', '');
    renderErrors(elements.authErrors, []);
}


async function handleLogin() {
    const email = document.querySelector('#login-email').value.trim();
    const password = document.querySelector('#login-password').value;

    setMessage(elements.authMessage, 'Signing in…', '');

    try {
        const payload = await apiRequest('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        setAccessToken(payload.data.accessToken);
        state.user = payload.data.user;

        elements.loginForm.reset();
        setMessage(elements.authMessage, '', '');
        renderErrors(elements.authErrors, []);

        showWorkspace();
        await loadSubjects();
        await loadCatalogue();
        await loadStudio();
        toast(`Welcome back, ${state.user.name}.`);
    } catch (error) {
        setMessage(elements.authMessage, error.message, 'error');
        renderErrors(elements.authErrors, describeError(error));
    }
}


async function handleRegister() {
    const name = document.querySelector('#register-name').value.trim();
    const email = document.querySelector('#register-email').value.trim();
    const password = document.querySelector('#register-password').value;
    const role = document.querySelector('#register-role').value;

    setMessage(elements.authMessage, 'Creating your account…', '');

    try {
        await apiRequest('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password, role })
        });

        elements.registerForm.reset();
        document.querySelector('#login-email').value = email;
        switchAuthTab('login');
        setMessage(elements.authMessage, 'Account created. Sign in to continue.', 'success');
        toast('Account created. Sign in to continue.');
    } catch (error) {
        setMessage(elements.authMessage, error.message, 'error');
        renderErrors(elements.authErrors, describeError(error));
    }
}


function showAuth() {
    elements.authView.hidden = false;
    elements.workspace.hidden = true;
    elements.sessionBar.hidden = true;
    closeDetail();
}


function showWorkspace() {
    elements.authView.hidden = true;
    elements.workspace.hidden = false;
    elements.sessionBar.hidden = false;

    elements.sessionName.textContent = state.user.name;
    elements.sessionRole.textContent = state.user.role;
    elements.headerUser.textContent = state.user.name;
    elements.headerRole.textContent = state.user.role;

    const isInstructor = state.user.role === 'INSTRUCTOR';
    elements.studioTab.hidden = !isInstructor;

    if (!isInstructor && state.view === 'studio') {
        switchView('catalogue');
    }
}


function logout() {
    clearAccessToken();
    state.user = null;
    state.editingId = null;
    state.catalogue.items = [];
    state.studio.items = [];
    switchView('catalogue');
    showAuth();
    toast('You have been signed out.');
}


/* ---------- Views and data loading ---------- */

function switchView(view) {
    state.view = view;

    const isCatalogue = view === 'catalogue';

    elements.catalogueTab.classList.toggle('is-active', isCatalogue);
    elements.studioTab.classList.toggle('is-active', !isCatalogue);
    elements.catalogueTab.setAttribute('aria-selected', String(isCatalogue));
    elements.studioTab.setAttribute('aria-selected', String(!isCatalogue));
    elements.catalogueView.hidden = !isCatalogue;
    elements.studioView.hidden = isCatalogue;

    if (isCatalogue) {
        void loadCatalogue();
    } else {
        void loadStudio();
    }
}


function changePage(direction) {
    const next = state.catalogue.page + direction;

    if (next < 1 || next > state.catalogue.totalPages) {
        return;
    }

    state.catalogue.page = next;
    void loadCatalogue();
}


async function loadSubjects() {
    try {
        const payload = await apiRequest('/api/resources/subjects');
        const subjects = payload.data.subjects;

        const current = elements.filterSubject.value;

        elements.filterSubject.innerHTML = '';
        const all = createElement('option', '', 'All subjects');
        all.value = '';
        elements.filterSubject.append(all);

        for (const subject of subjects) {
            const option = createElement('option', '', subject);
            option.value = subject;
            elements.filterSubject.append(option);
        }

        elements.filterSubject.value = subjects.includes(current) ? current : '';
    } catch {
        // A failed subject refresh is not fatal; the catalogue still loads.
    }
}


function buildCatalogueQuery() {
    const query = state.catalogue;
    const params = new URLSearchParams({
        page: String(query.page),
        limit: String(query.limit)
    });

    if (query.search) {
        params.set('search', query.search);
    }

    if (query.subject) {
        params.set('subject', query.subject);
    }

    if (query.type) {
        params.set('type', query.type);
    }

    return params.toString();
}


async function loadCatalogue() {
    elements.resultsCount.textContent = 'Loading resources…';

    try {
        const payload = await apiRequest(`/api/resources?${buildCatalogueQuery()}`);

        state.catalogue.items = payload.data;
        state.catalogue.page = payload.pagination.page;
        state.catalogue.total = payload.pagination.total;
        state.catalogue.totalPages = payload.pagination.totalPages;

        renderCatalogue();
        updateStats();
    } catch (error) {
        elements.resultsCount.textContent = error.message;
        elements.resourceGrid.innerHTML = '';
        elements.resourceGrid.append(
            createElement('li', 'empty-card', error.message)
        );
    }
}


function renderCatalogue() {
    const catalogue = state.catalogue;

    elements.resourceGrid.innerHTML = '';

    if (catalogue.items.length === 0) {
        elements.resultsCount.textContent = 'No resources match these filters.';
        elements.resourceGrid.append(
            createElement('li', 'empty-card', 'Try a different search or clear the filters.')
        );
    } else {
        const start = (catalogue.page - 1) * catalogue.limit + 1;
        const end = start + catalogue.items.length - 1;
        elements.resultsCount.textContent =
            `Showing ${start}–${end} of ${catalogue.total} published resources.`;

        for (const resource of catalogue.items) {
            elements.resourceGrid.append(createResourceCard(resource));
        }
    }

    elements.pageLabel.textContent = `Page ${catalogue.page} of ${Math.max(catalogue.totalPages, 1)}`;
    elements.prevPage.disabled = catalogue.page <= 1;
    elements.nextPage.disabled = catalogue.page >= catalogue.totalPages;
}


function createResourceCard(resource) {
    const item = createElement('li', 'resource-card');

    const top = createElement('div', 'card-top');
    top.append(
        createElement('span', 'type-pill', formatType(resource.type)),
        createElement('span', `status-pill status-${resource.status.toLowerCase()}`, formatStatus(resource.status))
    );
    item.append(top);

    item.append(createElement('span', 'card-subject', resource.subject));
    item.append(createElement('h3', 'card-title', resource.title));
    item.append(createElement('p', 'card-description', resource.description));

    const meta = createElement('div', 'card-meta');
    meta.append(
        createElement('span', '', `by ${resource.instructorName}`),
        createElement('span', 'dot', '·'),
        createElement('span', '', formatDate(resource.createdAt))
    );
    item.append(meta);

    if (resource.attachment) {
        const chip = createElement('span', 'attachment-chip', `📎 ${resource.attachment.originalName}`);
        item.append(chip);
    }

    const actions = createElement('div', 'card-actions');

    actions.append(
        createActionButton('Details', 'button-secondary', 'detail', resource.id)
    );

    if (state.user && resource.attachment) {
        actions.append(
            createActionButton('Attachment', 'button-quiet', 'download', resource.id)
        );
    }

    if (
        state.user?.role === 'INSTRUCTOR' &&
        resource.instructorId === state.user.id
    ) {
        actions.append(
            createActionButton('Edit', 'button-quiet', 'edit', resource.id)
        );
    }

    item.append(actions);

    return item;
}


function createActionButton(label, className, action, resourceId) {
    const button = createElement('button', `button button-small ${className}`, label);
    button.type = 'button';
    button.dataset.action = action;
    button.dataset.resourceId = String(resourceId);
    return button;
}


function updateStats() {
    elements.statPublished.textContent = String(state.catalogue.total);
    elements.statPage.textContent = String(state.catalogue.items.length);

    const subjects = new Set(state.catalogue.items.map((item) => item.subject));
    elements.statSubjects.textContent = String(subjects.size);
}


/* ---------- Instructor studio ---------- */

async function loadStudio() {
    if (state.user?.role !== 'INSTRUCTOR') {
        return;
    }

    elements.studioList.innerHTML = '';
    elements.studioList.append(createElement('li', 'loading-row', 'Loading your resources…'));

    const params = new URLSearchParams({ limit: '100' });

    if (state.studio.status) {
        params.set('status', state.studio.status);
    }

    if (state.studio.search) {
        params.set('search', state.studio.search);
    }

    try {
        const payload = await apiRequest(`/api/me/resources?${params.toString()}`);
        state.studio.items = payload.data;
        renderStudioList();
    } catch (error) {
        elements.studioList.innerHTML = '';
        elements.studioList.append(createElement('li', 'empty-card', error.message));
    }
}


function renderStudioList() {
    elements.studioList.innerHTML = '';
    elements.studioCount.textContent = String(state.studio.items.length);

    if (state.studio.items.length === 0) {
        elements.studioList.append(
            createElement('li', 'empty-card', 'Nothing here yet. Create your first draft in the form.')
        );
        return;
    }

    for (const resource of state.studio.items) {
        const item = createElement('li', 'studio-item');
        item.classList.toggle('is-editing', resource.id === state.editingId);

        const row = createElement('div', 'studio-row');
        const copy = createElement('div');

        const title = createElement('h3', 'studio-title', resource.title);
        const sub = createElement(
            'p',
            'studio-sub',
            `${resource.subject} · ${formatType(resource.type)} · ${formatDate(resource.updatedAt)}`
        );
        copy.append(title, sub);

        row.append(copy);
        row.append(
            createElement(
                'span',
                `status-pill status-${resource.status.toLowerCase()}`,
                formatStatus(resource.status)
            )
        );
        item.append(row);

        const actions = createElement('div', 'studio-actions');
        actions.append(
            createActionButton('Edit', 'button-secondary', 'edit', resource.id),
            createActionButton(
                resource.status === 'DRAFT' ? 'Publish' : 'Unpublish',
                'button-quiet',
                'status',
                resource.id
            ),
            createActionButton('Details', 'button-quiet', 'detail', resource.id),
            createActionButton('Delete', 'button-danger', 'delete', resource.id)
        );
        item.append(actions);

        elements.studioList.append(item);
    }
}


async function startEdit(resourceId) {
    const resource = state.studio.items.find((item) => item.id === resourceId)
        || state.catalogue.items.find((item) => item.id === resourceId);

    if (!resource) {
        toast('Reload your resources and try again.', 'error');
        return;
    }

    if (state.user?.role !== 'INSTRUCTOR' || resource.instructorId !== state.user.id) {
        toast('You can only edit your own resources.', 'error');
        return;
    }

    state.editingId = resource.id;

    elements.resourceFormTitle.textContent = 'Edit resource';
    elements.resourceTitle.value = resource.title;
    elements.resourceDescription.value = resource.description;
    elements.resourceSubject.value = resource.subject;
    elements.resourceType.value = resource.type;
    elements.resourceStatus.value = resource.status;
    elements.statusField.hidden = false;
    elements.saveResource.textContent = 'Save changes';
    elements.cancelEdit.hidden = false;
    elements.resourceForm.scrollIntoView({ behavior: 'smooth', block: 'start' });

    setMessage(elements.resourceMessage, '', '');
    renderErrors(elements.resourceErrors, []);

    renderAttachmentBox(resource);

    if (state.view !== 'studio') {
        switchView('studio');
    } else {
        renderStudioList();
    }
}


function resetResourceForm() {
    state.editingId = null;

    elements.resourceForm.reset();
    elements.resourceFormTitle.textContent = 'New resource';
    elements.saveResource.textContent = 'Create draft';
    elements.statusField.hidden = true;
    elements.cancelEdit.hidden = true;
    elements.attachmentBox.hidden = true;
    elements.removeAttachment.hidden = true;
    elements.uploadButton.disabled = true;
    elements.attachmentInput.value = '';

    setMessage(elements.resourceMessage, '', '');
    setMessage(elements.uploadMessage, '', '');
    renderErrors(elements.resourceErrors, []);
    renderStudioList();
}


function renderAttachmentBox(resource) {
    elements.attachmentBox.hidden = false;

    if (resource.attachment) {
        elements.attachmentName.textContent = resource.attachment.originalName;
        elements.removeAttachment.hidden = false;
        elements.uploadButton.textContent = 'Replace attachment';
    } else {
        elements.attachmentName.textContent = 'No attachment yet';
        elements.removeAttachment.hidden = true;
        elements.uploadButton.textContent = 'Upload attachment';
    }

    elements.attachmentInput.value = '';
    elements.uploadButton.disabled = true;
    setMessage(elements.uploadMessage, '', '');
}


async function handleResourceSubmit() {
    if (state.busy) {
        return;
    }

    const body = {
        title: elements.resourceTitle.value.trim(),
        description: elements.resourceDescription.value.trim(),
        subject: elements.resourceSubject.value.trim(),
        type: elements.resourceType.value
    };

    setMessage(elements.resourceMessage, state.editingId ? 'Saving…' : 'Creating draft…', '');
    renderErrors(elements.resourceErrors, []);

    state.busy = true;
    elements.saveResource.disabled = true;

    try {
        let resource;

        if (state.editingId) {
            const payload = await apiRequest(`/api/resources/${state.editingId}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    ...body,
                    status: elements.resourceStatus.value
                })
            });
            resource = payload.data;
            setMessage(elements.resourceMessage, 'Resource saved.', 'success');
            toast('Resource saved.');
        } else {
            const payload = await apiRequest('/api/resources', {
                method: 'POST',
                body: JSON.stringify(body)
            });
            resource = payload.data;
            setMessage(elements.resourceMessage, 'Draft created.', 'success');
            toast('Draft created. Add an attachment and publish when ready.');
        }

        await loadStudio();
        await loadCatalogue();
        await loadSubjects();
        startEdit(resource.id);
    } catch (error) {
        setMessage(elements.resourceMessage, error.message, 'error');
        renderErrors(elements.resourceErrors, describeError(error));
    } finally {
        state.busy = false;
        elements.saveResource.disabled = false;
    }
}


async function toggleStatus(resourceId) {
    const resource = state.studio.items.find((item) => item.id === resourceId);

    if (!resource) {
        return;
    }

    const nextStatus = resource.status === 'DRAFT' ? 'PUBLISHED' : 'DRAFT';

    try {
        await apiRequest(`/api/resources/${resourceId}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: nextStatus })
        });

        await loadStudio();
        await loadCatalogue();
        await loadSubjects();

        if (state.editingId === resourceId) {
            elements.resourceStatus.value = nextStatus;
        }

        toast(nextStatus === 'PUBLISHED' ? 'Resource published.' : 'Resource moved back to drafts.');
    } catch (error) {
        toast(error.message, 'error');
    }
}


async function deleteResource(resourceId) {
    const resource = state.studio.items.find((item) => item.id === resourceId);

    if (!resource) {
        return;
    }

    if (!window.confirm(`Delete "${resource.title}"? Its attachment file will be removed too.`)) {
        return;
    }

    try {
        await apiRequest(`/api/resources/${resourceId}`, {
            method: 'DELETE'
        });

        if (state.editingId === resourceId) {
            resetResourceForm();
        }

        await loadStudio();
        await loadCatalogue();
        await loadSubjects();
        toast('Resource deleted.');
    } catch (error) {
        toast(error.message, 'error');
    }
}


/* ---------- Attachment upload and download ---------- */

async function handleUpload() {
    const file = elements.attachmentInput.files[0];

    if (!state.editingId || !file || state.busy) {
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        setMessage(elements.uploadMessage, 'Choose an image smaller than 5 MB.', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    state.busy = true;
    elements.uploadButton.disabled = true;
    elements.uploadButton.textContent = 'Uploading…';
    setMessage(elements.uploadMessage, 'Validating signature and storing privately…', '');

    try {
        const payload = await apiRequest(`/api/resources/${state.editingId}/attachment`, {
            method: 'PUT',
            body: formData
        });

        setMessage(elements.uploadMessage, 'Attachment stored successfully.', 'success');
        elements.attachmentInput.value = '';
        toast('Attachment stored successfully.');

        await loadStudio();
        await loadCatalogue();

        const refreshed = state.studio.items.find((item) => item.id === state.editingId);

        if (refreshed) {
            renderAttachmentBox(refreshed);
        }
    } catch (error) {
        setMessage(elements.uploadMessage, error.message, 'error');
        renderErrors(elements.resourceErrors, describeError(error));
    } finally {
        state.busy = false;
        elements.uploadButton.disabled = elements.attachmentInput.files.length === 0;
        if (elements.attachmentName.textContent !== 'No attachment yet') {
            elements.uploadButton.textContent = 'Replace attachment';
        } else {
            elements.uploadButton.textContent = 'Upload attachment';
        }
    }
}


async function handleRemoveAttachment() {
    if (!state.editingId) {
        return;
    }

    if (!window.confirm('Remove this attachment from the resource?')) {
        return;
    }

    try {
        await apiRequest(`/api/resources/${state.editingId}/attachment`, {
            method: 'DELETE'
        });

        await loadStudio();
        await loadCatalogue();

        const refreshed = state.studio.items.find((item) => item.id === state.editingId);

        if (refreshed) {
            renderAttachmentBox(refreshed);
        }

        toast('Attachment removed.');
    } catch (error) {
        toast(error.message, 'error');
    }
}


async function downloadAttachment(resourceId) {
    try {
        const payload = await apiRequest(`/api/resources/${resourceId}`);
        const attachment = payload.data.attachment;

        if (!attachment) {
            toast('This resource has no attachment.', 'error');
            return;
        }

        const blob = await downloadBlob(attachment.downloadUrl);
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


/* ---------- Detail drawer ---------- */

async function openDetail(resourceId) {
    state.detailResourceId = resourceId;

    elements.detailTitle.textContent = 'Loading…';
    elements.detailBody.innerHTML = '';
    elements.detailDrawer.hidden = false;
    elements.drawerBackdrop.hidden = false;

    try {
        const payload = await apiRequest(`/api/resources/${resourceId}`);
        const resource = payload.data;

        elements.detailTitle.textContent = resource.title;
        elements.detailBody.innerHTML = '';

        const badges = createElement('div', 'detail-badges');
        badges.append(
            createElement('span', 'type-pill', formatType(resource.type)),
            createElement(
                'span',
                `status-pill status-${resource.status.toLowerCase()}`,
                formatStatus(resource.status)
            )
        );
        elements.detailBody.append(badges);

        elements.detailBody.append(
            createDetailSection('Subject', resource.subject),
            createDetailSection('Instructor', resource.instructorName),
            createDetailSection('Added', formatDate(resource.createdAt)),
            createDetailSection('Description', resource.description)
        );

        if (resource.attachment) {
            const fileBox = createElement('div', 'detail-file');
            const label = createElement(
                'span',
                '',
                `${resource.attachment.originalName} · ${formatBytes(resource.attachment.size)}`
            );
            const download = createElement('button', 'button button-secondary button-small', 'Download');
            download.type = 'button';
            download.addEventListener('click', () => void downloadAttachment(resourceId));
            fileBox.append(label, download);
            elements.detailBody.append(fileBox);

            // Only images are accepted by the API, so an authenticated blob
            // fetch can be shown as a safe preview inside the drawer.
            void renderImagePreview(resource.attachment.downloadUrl);
        }
    } catch (error) {
        elements.detailTitle.textContent = 'Unavailable';
        elements.detailBody.append(createElement('p', 'form-message', error.message));
    }
}


function createDetailSection(heading, text) {
    const section = createElement('section', 'detail-section');
    section.append(createElement('h3', '', heading), createElement('p', '', text));
    return section;
}


async function renderImagePreview(url) {
    try {
        const blob = await downloadBlob(url);
        const objectUrl = URL.createObjectURL(blob);

        // A second request may have replaced this drawer while the blob was
        // loading; only attach an image for the still-open resource.
        if (!elements.detailDrawer.hidden) {
            const image = createElement('img', 'detail-image');
            image.alt = 'Resource attachment preview';
            image.src = objectUrl;
            state.objectUrls.push(objectUrl);
            elements.detailBody.prepend(image);
        } else {
            URL.revokeObjectURL(objectUrl);
        }
    } catch {
        // A preview failure should not hide the rest of the detail panel.
    }
}


function closeDetail() {
    elements.detailDrawer.hidden = true;
    elements.drawerBackdrop.hidden = true;
    elements.detailBody.innerHTML = '';
    state.detailResourceId = null;

    for (const url of state.objectUrls) {
        URL.revokeObjectURL(url);
    }

    state.objectUrls = [];
}


/* ---------- Helpers ---------- */

function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== undefined) {
        element.textContent = text;
    }

    return element;
}


function setMessage(element, message, kind) {
    element.textContent = message;
    element.classList.toggle('is-error', kind === 'error');
    element.classList.toggle('is-success', kind === 'success');
}


function renderErrors(list, errors) {
    list.innerHTML = '';

    for (const issue of errors) {
        const item = createElement('li', '', `${issue.field}: ${issue.message}`);
        list.append(item);
    }
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


function formatType(value) {
    const labels = {
        VIDEO: 'Video',
        ARTICLE: 'Article',
        BOOK: 'Book',
        EXERCISE: 'Exercise'
    };

    return labels[value] || String(value);
}


function formatStatus(value) {
    return value === 'PUBLISHED' ? 'Published' : 'Draft';
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


function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) {
        return '0 B';
    }

    if (bytes < 1024) {
        return `${bytes} B`;
    }

    const value = Math.round(bytes / 1024);
    return `${value} KB`;
}
