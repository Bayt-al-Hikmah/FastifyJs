/* =========================================================
   Kitbase — dashboard controller
   Plain ES modules, Fetch, and textContent-based rendering.
   ========================================================= */

import {
    apiRequest,
    clearToken,
    getToken,
    setToken
} from './api.js';


const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const state = {
    token: getToken(),
    user: null,
    items: [],
    pagination: {
        page: 1,
        limit: 12,
        total: 0,
        totalPages: 0
    },
    query: {
        page: 1,
        limit: 12,
        search: '',
        category: '',
        availability: ''
    },
    selectedId: null,
    editing: false,
    previewUrl: null,
    previewRequest: 0,
    previewForId: null,
    toastTimer: null
};


const elements = {
    authView: document.querySelector('#auth-view'),
    workspace: document.querySelector('#workspace'),
    sessionBar: document.querySelector('#session-bar'),
    sessionName: document.querySelector('#session-name'),
    sessionRole: document.querySelector('#session-role'),
    headerUser: document.querySelector('#header-user'),
    logoutButton: document.querySelector('#logout-button'),
    guestButton: document.querySelector('#guest-button'),
    loginTab: document.querySelector('#login-tab'),
    registerTab: document.querySelector('#register-tab'),
    loginForm: document.querySelector('#login-form'),
    registerForm: document.querySelector('#register-form'),
    authMessage: document.querySelector('#auth-message'),
    statTotal: document.querySelector('#stat-total'),
    statAvailable: document.querySelector('#stat-available'),
    statUnavailable: document.querySelector('#stat-unavailable'),
    itemCount: document.querySelector('#item-count'),
    filterForm: document.querySelector('#filter-form'),
    searchInput: document.querySelector('#search-input'),
    categorySelect: document.querySelector('#category-select'),
    availabilitySelect: document.querySelector('#availability-select'),
    resetFilters: document.querySelector('#reset-filters'),
    prevPage: document.querySelector('#prev-page'),
    nextPage: document.querySelector('#next-page'),
    pageLabel: document.querySelector('#page-label'),
    equipmentList: document.querySelector('#equipment-list'),
    createForm: document.querySelector('#create-form'),
    createName: document.querySelector('#create-name'),
    createDescription: document.querySelector('#create-description'),
    createCategory: document.querySelector('#create-category'),
    createAvailability: document.querySelector('#create-availability'),
    createQuantity: document.querySelector('#create-quantity'),
    createMessage: document.querySelector('#create-message'),
    detailEmpty: document.querySelector('#detail-empty'),
    detailContent: document.querySelector('#detail-content'),
    detailStatus: document.querySelector('#detail-status'),
    detailDate: document.querySelector('#detail-date'),
    detailTitle: document.querySelector('#detail-title-text'),
    detailDescription: document.querySelector('#detail-description'),
    detailCategory: document.querySelector('#detail-category'),
    detailQuantity: document.querySelector('#detail-quantity'),
    detailOwner: document.querySelector('#detail-owner'),
    editButton: document.querySelector('#edit-button'),
    deleteButton: document.querySelector('#delete-button'),
    mediaFrame: document.querySelector('#media-frame'),
    mediaPlaceholder: document.querySelector('#media-placeholder'),
    previewImage: document.querySelector('#preview-image'),
    mediaCaption: document.querySelector('#media-caption'),
    uploadForm: document.querySelector('#upload-form'),
    imageInput: document.querySelector('#image-input'),
    uploadButton: document.querySelector('#upload-button'),
    removeImageButton: document.querySelector('#remove-image-button'),
    uploadMessage: document.querySelector('#upload-message'),
    editForm: document.querySelector('#edit-form'),
    editName: document.querySelector('#edit-name'),
    editDescription: document.querySelector('#edit-description'),
    editCategory: document.querySelector('#edit-category'),
    editAvailability: document.querySelector('#edit-availability'),
    editQuantity: document.querySelector('#edit-quantity'),
    editMessage: document.querySelector('#edit-message'),
    cancelEdit: document.querySelector('#cancel-edit'),
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

    elements.guestButton.addEventListener('click', () => {
        clearSession();
        showWorkspace();
        void loadEquipment();
    });

    elements.logoutButton.addEventListener('click', () => {
        clearSession();
        showAuth();
        setMessage(elements.authMessage, 'You have been signed out.', 'success');
    });

    elements.filterForm.addEventListener('submit', (event) => {
        event.preventDefault();
        state.query.search = elements.searchInput.value.trim();
        state.query.category = elements.categorySelect.value;
        state.query.availability = elements.availabilitySelect.value;
        state.query.page = 1;
        void loadEquipment();
    });

    elements.resetFilters.addEventListener('click', () => {
        elements.searchInput.value = '';
        elements.categorySelect.value = '';
        elements.availabilitySelect.value = '';
        state.query.search = '';
        state.query.category = '';
        state.query.availability = '';
        state.query.page = 1;
        void loadEquipment();
    });

    elements.prevPage.addEventListener('click', () => changePage(-1));
    elements.nextPage.addEventListener('click', () => changePage(1));

    elements.equipmentList.addEventListener('click', (event) => {
        const button = event.target.closest('[data-equipment-id]');

        if (!button) {
            return;
        }

        selectEquipment(Number(button.dataset.equipmentId));
    });

    elements.createForm.addEventListener('submit', (event) => {
        event.preventDefault();
        void handleCreate();
    });

    elements.editButton.addEventListener('click', openEditor);
    elements.cancelEdit.addEventListener('click', closeEditor);

    elements.editForm.addEventListener('submit', (event) => {
        event.preventDefault();
        void handleUpdate();
    });

    elements.deleteButton.addEventListener('click', () => {
        void handleDelete();
    });

    elements.uploadForm.addEventListener('submit', (event) => {
        event.preventDefault();
        void handleUpload();
    });

    elements.removeImageButton.addEventListener('click', () => {
        void handleRemoveImage();
    });
}


/* ---------- Session ---------- */

async function loadSession() {
    if (!state.token) {
        showAuth();
        return;
    }

    try {
        const result = await request('/api/auth/me');

        state.user = result.data.user;

        showWorkspace();
        await loadEquipment();
    } catch (error) {
        clearSession();
        showAuth();

        if (error.status !== 401) {
            setMessage(elements.authMessage, error.message, 'error');
        }
    }
}


async function handleLogin() {
    const email = document.querySelector('#login-email').value.trim();
    const password = document.querySelector('#login-password').value;

    setMessage(elements.authMessage, 'Signing in…', '');

    try {
        const result = await request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        state.token = result.data.accessToken;
        state.user = result.data.user;
        setToken(state.token);

        elements.loginForm.reset();
        setMessage(elements.authMessage, '', '');

        showWorkspace();
        await loadEquipment();

        toast(`Welcome back, ${state.user.name}.`);
    } catch (error) {
        setMessage(elements.authMessage, describeError(error), 'error');
    }
}


async function handleRegister() {
    const name = document.querySelector('#register-name').value.trim();
    const email = document.querySelector('#register-email').value.trim();
    const password = document.querySelector('#register-password').value;

    setMessage(elements.authMessage, 'Creating your account…', '');

    try {
        await request('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        });

        elements.registerForm.reset();
        document.querySelector('#login-email').value = email;

        switchAuthTab('login');
        setMessage(elements.authMessage, 'Account created. Sign in to continue.', 'success');
        toast('Account created. Sign in to continue.');
    } catch (error) {
        setMessage(elements.authMessage, describeError(error), 'error');
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


function showAuth() {
    elements.authView.hidden = false;
    elements.workspace.hidden = true;
    elements.sessionBar.hidden = true;
}


function showWorkspace() {
    elements.authView.hidden = true;
    elements.workspace.hidden = false;
    elements.sessionBar.hidden = !state.token;

    const name = state.user ? state.user.name : 'Guest';
    const email = state.user ? state.user.email : '';

    elements.sessionName.textContent = email ? `${name} · ${email}` : name;
    elements.sessionName.title = email;
    elements.sessionRole.textContent = state.user ? state.user.role : 'VIEW';
    elements.headerUser.textContent = state.user ? name : 'Browsing as guest';
    elements.createForm.hidden = !state.user;
}


function clearSession() {
    clearToken();

    state.token = null;
    state.user = null;
    state.items = [];
    state.selectedId = null;
    state.editing = false;

    clearPreview();
    elements.equipmentList.replaceChildren();
    elements.createForm.reset();
    setMessage(elements.createMessage, '', '');
    setMessage(elements.uploadMessage, '', '');
    setMessage(elements.editMessage, '', '');
    closeEditor();
}


/* ---------- Catalogue ---------- */

async function loadEquipment() {
    const params = new URLSearchParams();

    params.set('page', String(state.query.page));
    params.set('limit', String(state.query.limit));

    if (state.query.search) {
        params.set('search', state.query.search);
    }

    if (state.query.category) {
        params.set('category', state.query.category);
    }

    if (state.query.availability) {
        params.set('availability', state.query.availability);
    }

    const loading = el('li', 'loading-row', 'Loading equipment…');

    elements.equipmentList.replaceChildren(loading);


    try {
        const result = await request(`/api/equipment?${params.toString()}`);

        state.items = result.data.equipment;
        state.pagination = result.data.pagination;

        if (!state.items.some((item) => item.id === state.selectedId)) {
            state.selectedId = null;
            clearPreview();
        }

        renderList();
        renderStats();
        renderPagination();
        renderDetail();
    } catch (error) {
        const row = el('li', 'list-empty', error.message);

        elements.equipmentList.replaceChildren(row);
        setMessage(elements.createMessage, error.message, 'error');
    }
}


function changePage(direction) {
    const target = state.query.page + direction;

    if (target < 1 || target > Math.max(state.pagination.totalPages, 1)) {
        return;
    }

    state.query.page = target;
    state.selectedId = null;
    clearPreview();
    void loadEquipment();
}


function renderList() {
    elements.equipmentList.replaceChildren();
    elements.itemCount.textContent = String(state.pagination.total);


    if (state.items.length === 0) {
        const row = el(
            'li',
            'list-empty',
            'No equipment matches these filters. Try clearing the search or filters.'
        );

        elements.equipmentList.append(row);
        return;
    }


    for (const item of state.items) {
        const row = el('li');
        const button = el('button', 'equipment-item');
        const top = el('span', 'equipment-row');
        const sub = el('span', 'equipment-sub');
        const pill = el(
            'span',
            `status-pill ${statusClass(item.availability)}`,
            formatEnum(item.availability)
        );

        button.type = 'button';
        button.dataset.equipmentId = String(item.id);
        button.classList.toggle('is-active', item.id === state.selectedId);

        top.append(
            el('span', 'equipment-name', item.name),
            pill
        );

        sub.append(
            el('span', '', formatEnum(item.category)),
            el('span', '', '·'),
            el('span', '', `${item.quantity} in stock`)
        );

        button.append(top, sub);
        row.append(button);
        elements.equipmentList.append(row);
    }
}


function renderStats() {
    let available = 0;

    for (const item of state.items) {
        if (item.availability === 'AVAILABLE') {
            available += 1;
        }
    }

    elements.statTotal.textContent = String(state.items.length);
    elements.statAvailable.textContent = String(available);
    elements.statUnavailable.textContent = String(state.items.length - available);
}


function renderPagination() {
    const { page, totalPages, total } = state.pagination;

    elements.pageLabel.textContent = `Page ${page} of ${Math.max(totalPages, 1)} · ${total} total`;
    elements.prevPage.disabled = page <= 1;
    elements.nextPage.disabled = page >= totalPages;
}


function selectEquipment(id) {
    if (!Number.isInteger(id) || id <= 0) {
        return;
    }

    state.selectedId = id;
    closeEditor();
    setMessage(elements.uploadMessage, '', '');

    renderList();
    renderDetail();
}


function findSelected() {
    return state.items.find((item) => item.id === state.selectedId) || null;
}


function canManage(item) {
    return Boolean(
        state.user &&
        (state.user.role === 'ADMIN' || item.owner.id === state.user.id)
    );
}


function renderDetail() {
    const item = findSelected();

    if (!item) {
        elements.detailEmpty.hidden = false;
        elements.detailContent.hidden = true;
        return;
    }

    elements.detailEmpty.hidden = true;
    elements.detailContent.hidden = false;

    elements.detailTitle.textContent = item.name;
    elements.detailDescription.textContent = item.description || 'No description has been added.';
    elements.detailCategory.textContent = formatEnum(item.category);
    elements.detailQuantity.textContent = String(item.quantity);
    elements.detailOwner.textContent = item.owner.name;
    elements.detailDate.textContent = `Added ${formatDate(item.createdAt)}`;

    elements.detailStatus.textContent = formatEnum(item.availability);
    elements.detailStatus.className = `status-pill ${statusClass(item.availability)}`;

    const manageable = canManage(item);

    elements.editButton.hidden = !manageable;
    elements.deleteButton.hidden = !manageable;
    elements.uploadForm.hidden = !manageable;
    elements.removeImageButton.hidden = !manageable || !item.image;

    if (item.image) {
        elements.mediaPlaceholder.hidden = true;
        elements.mediaFrame.hidden = false;
        elements.mediaCaption.textContent = `${item.image.originalName} · ${formatBytes(item.image.size)} · ${item.image.mimeType}`;
    } else {
        elements.mediaFrame.hidden = true;
        elements.mediaPlaceholder.hidden = false;
        elements.mediaPlaceholder.textContent = 'No image has been uploaded for this item yet.';
    }

    if (item.image && state.token) {
        if (state.previewForId !== item.id) {
            void loadPreview(item);
        }
    } else {
        if (item.image && !state.token) {
            elements.mediaPlaceholder.hidden = false;
            elements.mediaPlaceholder.textContent = 'Sign in to view this private image.';
        }

        clearPreview();
    }
}


async function loadPreview(item) {
    const requestId = ++state.previewRequest;

    clearPreview(false);


    try {
        const response = await fetch(item.image.url, {
            headers: {
                Authorization: `Bearer ${getToken()}`
            }
        });


        if (response.status === 401) {
            clearSession();
            showAuth();
            return;
        }


        if (!response.ok) {
            throw new Error('The image could not be loaded.');
        }


        const blob = await response.blob();


        if (requestId !== state.previewRequest) {
            return;
        }


        state.previewUrl = URL.createObjectURL(blob);
        state.previewForId = item.id;

        elements.previewImage.src = state.previewUrl;
        elements.previewImage.alt = `Photo of ${item.name}`;
        elements.mediaFrame.hidden = false;
        elements.mediaPlaceholder.hidden = true;
    } catch (error) {
        if (requestId === state.previewRequest) {
            elements.mediaFrame.hidden = true;
            elements.mediaPlaceholder.hidden = false;
            elements.mediaPlaceholder.textContent = error.message;
        }
    }
}


function clearPreview(invalidate = true) {
    if (invalidate) {
        state.previewRequest += 1;
    }

    if (state.previewUrl) {
        URL.revokeObjectURL(state.previewUrl);
        state.previewUrl = null;
    }

    state.previewForId = null;
    elements.previewImage.removeAttribute('src');
}


/* ---------- Mutations ---------- */

async function handleCreate() {
    const name = elements.createName.value.trim();

    if (!name) {
        setMessage(elements.createMessage, 'An item name is required.', 'error');
        return;
    }


    const button = elements.createForm.querySelector('button[type="submit"]');

    button.disabled = true;
    setMessage(elements.createMessage, 'Adding item…', '');


    try {
        const result = await request('/api/equipment', {
            method: 'POST',
            body: JSON.stringify({
                name,
                description: elements.createDescription.value.trim() || undefined,
                category: elements.createCategory.value,
                availability: elements.createAvailability.value,
                quantity: Number(elements.createQuantity.value)
            })
        });

        elements.createForm.reset();
        elements.createQuantity.value = '1';

        setMessage(elements.createMessage, '', '');

        state.query.page = 1;
        state.query.search = '';
        state.query.category = '';
        state.query.availability = '';
        elements.searchInput.value = '';
        elements.categorySelect.value = '';
        elements.availabilitySelect.value = '';

        await loadEquipment();

        state.selectedId = result.data.equipment.id;
        renderList();
        renderDetail();

        toast('Equipment added to the catalogue.');
    } catch (error) {
        setMessage(elements.createMessage, describeError(error), 'error');
    } finally {
        button.disabled = false;
    }
}


function openEditor() {
    const item = findSelected();

    if (!item || !canManage(item)) {
        return;
    }

    state.editing = true;

    elements.editName.value = item.name;
    elements.editDescription.value = item.description || '';
    elements.editCategory.value = item.category;
    elements.editAvailability.value = item.availability;
    elements.editQuantity.value = String(item.quantity);

    elements.editForm.hidden = false;
    setMessage(elements.editMessage, '', '');
    elements.editName.focus();
}


function closeEditor() {
    state.editing = false;
    elements.editForm.hidden = true;
    setMessage(elements.editMessage, '', '');
}


async function handleUpdate() {
    const item = findSelected();

    if (!item || !canManage(item)) {
        return;
    }


    const button = elements.editForm.querySelector('button[type="submit"]');

    button.disabled = true;
    setMessage(elements.editMessage, 'Saving changes…', '');


    try {
        await request(`/api/equipment/${item.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
                name: elements.editName.value.trim(),
                description: elements.editDescription.value.trim() || null,
                category: elements.editCategory.value,
                availability: elements.editAvailability.value,
                quantity: Number(elements.editQuantity.value)
            })
        });

        closeEditor();
        await loadEquipment();
        state.selectedId = item.id;
        renderList();
        renderDetail();

        toast('Equipment details updated.');
    } catch (error) {
        setMessage(elements.editMessage, describeError(error), 'error');
    } finally {
        button.disabled = false;
    }
}


async function handleDelete() {
    const item = findSelected();

    if (!item || !canManage(item)) {
        return;
    }


    const confirmed = window.confirm(
        `Delete "${item.name}"? Its private image will be removed too.`
    );


    if (!confirmed) {
        return;
    }


    try {
        await request(`/api/equipment/${item.id}`, {
            method: 'DELETE'
        });

        state.selectedId = null;
        clearPreview();
        await loadEquipment();

        toast('Equipment deleted.');
    } catch (error) {
        toast(describeError(error), 'error');
    }
}


async function handleUpload() {
    const item = findSelected();

    if (!item || !canManage(item)) {
        return;
    }


    const file = elements.imageInput.files && elements.imageInput.files[0];


    if (!file) {
        setMessage(elements.uploadMessage, 'Choose an image first.', 'error');
        return;
    }


    if (file.size > MAX_IMAGE_SIZE) {
        setMessage(elements.uploadMessage, 'Images must be 5 MB or smaller.', 'error');
        return;
    }


    if (!/\.(jpe?g|png|webp)$/i.test(file.name)) {
        setMessage(elements.uploadMessage, 'Choose a JPEG, PNG, or WebP image.', 'error');
        return;
    }


    const formData = new FormData();

    formData.append('file', file);

    elements.uploadButton.disabled = true;
    setMessage(elements.uploadMessage, 'Checking and storing the image…', '');


    try {
        await request(`/api/equipment/${item.id}/image`, {
            method: 'PUT',
            body: formData
        });

        elements.imageInput.value = '';
        clearPreview();

        await loadEquipment();

        state.selectedId = item.id;
        renderList();
        renderDetail();

        setMessage(elements.uploadMessage, 'Image uploaded successfully.', 'success');
        toast('Image uploaded successfully.');
    } catch (error) {
        setMessage(elements.uploadMessage, describeError(error), 'error');
        toast(describeError(error), 'error');
    } finally {
        elements.uploadButton.disabled = false;
    }
}


async function handleRemoveImage() {
    const item = findSelected();

    if (!item || !canManage(item) || !item.image) {
        return;
    }


    const confirmed = window.confirm(`Remove the image from "${item.name}"?`);


    if (!confirmed) {
        return;
    }


    try {
        await request(`/api/equipment/${item.id}/image`, {
            method: 'DELETE'
        });

        clearPreview();
        await loadEquipment();

        state.selectedId = item.id;
        renderList();
        renderDetail();

        toast('Image removed.');
    } catch (error) {
        toast(describeError(error), 'error');
    }
}


/* ---------- API and helpers ---------- */

async function request(url, options = {}) {
    try {
        return await apiRequest(url, options);
    } catch (error) {
        if (error.status === 401) {
            clearSession();
            showAuth();
            setMessage(
                elements.authMessage,
                'Your session expired. Sign in again.',
                'error'
            );
        }

        throw error;
    }
}


function describeError(error) {
    const details = Array.isArray(error.details) ? error.details : [];


    if (details.length > 0) {
        return details
            .map((detail) => `${detail.field}: ${detail.message}`)
            .join(' · ');
    }

    return error.message || 'The request could not be completed.';
}


function el(tag, className, text) {
    const node = document.createElement(tag);

    if (className) {
        node.className = className;
    }

    if (text !== undefined) {
        node.textContent = text;
    }

    return node;
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


function formatEnum(value) {
    const words = String(value || '')
        .toLowerCase()
        .replaceAll('_', ' ');

    return words.replace(/\b\w/g, (letter) => letter.toUpperCase());
}


function statusClass(value) {
    return `status-${String(value || '').toLowerCase().replaceAll('_', '-')}`;
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

    const units = ['KB', 'MB', 'GB'];
    let value = bytes / 1024;
    let index = 0;

    while (value >= 1024 && index < units.length - 1) {
        value /= 1024;
        index += 1;
    }

    const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;

    return `${rounded} ${units[index]}`;
}
