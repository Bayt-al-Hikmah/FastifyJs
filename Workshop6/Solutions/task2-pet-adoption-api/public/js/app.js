/* =========================================================
   Pawprint — dashboard controller
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
    pets: [],
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
        species: '',
        status: ''
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
    statOther: document.querySelector('#stat-other'),
    itemCount: document.querySelector('#item-count'),
    filterForm: document.querySelector('#filter-form'),
    searchInput: document.querySelector('#search-input'),
    speciesChips: document.querySelector('#species-chips'),
    statusChips: document.querySelector('#status-chips'),
    resetFilters: document.querySelector('#reset-filters'),
    prevPage: document.querySelector('#prev-page'),
    nextPage: document.querySelector('#next-page'),
    pageLabel: document.querySelector('#page-label'),
    petList: document.querySelector('#pet-list'),
    createForm: document.querySelector('#create-form'),
    createName: document.querySelector('#create-name'),
    createSpecies: document.querySelector('#create-species'),
    createAge: document.querySelector('#create-age'),
    createDescription: document.querySelector('#create-description'),
    createStatus: document.querySelector('#create-status'),
    createMessage: document.querySelector('#create-message'),
    detailEmpty: document.querySelector('#detail-empty'),
    detailContent: document.querySelector('#detail-content'),
    detailStatus: document.querySelector('#detail-status'),
    detailDate: document.querySelector('#detail-date'),
    detailTitle: document.querySelector('#detail-title-text'),
    detailDescription: document.querySelector('#detail-description'),
    detailSpecies: document.querySelector('#detail-species'),
    detailAge: document.querySelector('#detail-age'),
    detailShelter: document.querySelector('#detail-shelter'),
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
    editSpecies: document.querySelector('#edit-species'),
    editAge: document.querySelector('#edit-age'),
    editDescription: document.querySelector('#edit-description'),
    editStatus: document.querySelector('#edit-status'),
    editMessage: document.querySelector('#edit-message'),
    cancelEdit: document.querySelector('#cancel-edit'),
    toast: document.querySelector('#toast')
};


document.addEventListener('DOMContentLoaded', init);


function init() {
    syncChips();
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
        void loadPets();
    });

    elements.logoutButton.addEventListener('click', () => {
        clearSession();
        showAuth();
        setMessage(elements.authMessage, 'You have been signed out.', 'success');
    });

    elements.filterForm.addEventListener('submit', (event) => {
        event.preventDefault();
        state.query.search = elements.searchInput.value.trim();
        state.query.page = 1;
        void loadPets();
    });

    elements.speciesChips.addEventListener('click', (event) => {
        const button = event.target.closest('[data-species]');

        if (!button) {
            return;
        }

        state.query.species = button.dataset.species || '';
        state.query.page = 1;
        syncChips();
        void loadPets();
    });

    elements.statusChips.addEventListener('click', (event) => {
        const button = event.target.closest('[data-status]');

        if (!button) {
            return;
        }

        state.query.status = button.dataset.status || '';
        state.query.page = 1;
        syncChips();
        void loadPets();
    });

    elements.resetFilters.addEventListener('click', () => {
        elements.searchInput.value = '';
        state.query.search = '';
        state.query.species = '';
        state.query.status = '';
        state.query.page = 1;
        syncChips();
        void loadPets();
    });

    elements.prevPage.addEventListener('click', () => changePage(-1));
    elements.nextPage.addEventListener('click', () => changePage(1));

    elements.petList.addEventListener('click', (event) => {
        const button = event.target.closest('[data-pet-id]');

        if (!button) {
            return;
        }

        selectPet(Number(button.dataset.petId));
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
        await loadPets();
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
        await loadPets();

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
    const isStaff = Boolean(
        state.user && state.user.role === 'STAFF'
    );

    elements.authView.hidden = true;
    elements.workspace.hidden = false;
    elements.sessionBar.hidden = !state.token;

    const name = state.user ? state.user.name : 'Guest';
    const email = state.user ? state.user.email : '';

    elements.sessionName.textContent = email ? `${name} · ${email}` : name;
    elements.sessionName.title = email;
    elements.sessionRole.textContent = state.user ? state.user.role : 'VIEW';
    elements.headerUser.textContent = state.user ? name : 'Browsing as guest';
    elements.createForm.hidden = !isStaff;
}


function clearSession() {
    clearToken();

    state.token = null;
    state.user = null;
    state.pets = [];
    state.selectedId = null;
    state.editing = false;

    clearPreview();
    elements.petList.replaceChildren();
    elements.createForm.reset();
    setMessage(elements.createMessage, '', '');
    setMessage(elements.uploadMessage, '', '');
    setMessage(elements.editMessage, '', '');
    closeEditor();
}


/* ---------- Gallery ---------- */

async function loadPets() {
    const params = new URLSearchParams();

    params.set('page', String(state.query.page));
    params.set('limit', String(state.query.limit));

    if (state.query.search) {
        params.set('search', state.query.search);
    }

    if (state.query.species) {
        params.set('species', state.query.species);
    }

    if (state.query.status) {
        params.set('status', state.query.status);
    }

    const loading = el('li', 'loading-row', 'Loading pets…');

    elements.petList.replaceChildren(loading);


    try {
        const result = await request(`/api/pets?${params.toString()}`);

        state.pets = result.data.pets;
        state.pagination = result.data.pagination;

        if (!state.pets.some((pet) => pet.id === state.selectedId)) {
            state.selectedId = null;
            clearPreview();
        }

        renderList();
        renderStats();
        renderPagination();
        renderDetail();
    } catch (error) {
        const row = el('li', 'list-empty', error.message);

        elements.petList.replaceChildren(row);
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
    void loadPets();
}


function syncChips() {
    const groups = [
        {
            container: elements.speciesChips,
            attribute: 'data-species',
            key: 'species'
        },
        {
            container: elements.statusChips,
            attribute: 'data-status',
            key: 'status'
        }
    ];


    for (const group of groups) {
        const buttons = group.container.querySelectorAll(group.attribute);

        for (const button of buttons) {
            const active = (button.dataset[group.key] || '') === state.query[group.key];

            button.classList.toggle('is-active', active);
            button.setAttribute('aria-pressed', String(active));
        }
    }
}


function renderList() {
    elements.petList.replaceChildren();
    elements.itemCount.textContent = String(state.pagination.total);


    if (state.pets.length === 0) {
        const row = el(
            'li',
            'list-empty',
            'No pets match these filters. Try clearing the search or chips.'
        );

        elements.petList.append(row);
        return;
    }


    for (const pet of state.pets) {
        const row = el('li');
        const button = el('button', 'pet-card');
        const avatar = el(
            'span',
            `pet-avatar pet-avatar-${String(pet.species).toLowerCase()}`,
            String(pet.name || '?').slice(0, 1).toUpperCase()
        );
        const top = el('span', 'pet-card-row');
        const pill = el(
            'span',
            `status-pill ${statusClass(pet.status)}`,
            formatEnum(pet.status)
        );

        avatar.setAttribute('aria-hidden', 'true');

        button.type = 'button';
        button.dataset.petId = String(pet.id);
        button.classList.toggle('is-active', pet.id === state.selectedId);

        top.append(
            el('span', 'pet-name', pet.name),
            pill
        );

        button.append(
            avatar,
            top,
            el('span', 'pet-sub', `${formatEnum(pet.species)} · ${formatAge(pet.age)}`)
        );

        row.append(button);
        elements.petList.append(row);
    }
}


function renderStats() {
    let available = 0;

    for (const pet of state.pets) {
        if (pet.status === 'AVAILABLE') {
            available += 1;
        }
    }

    elements.statTotal.textContent = String(state.pets.length);
    elements.statAvailable.textContent = String(available);
    elements.statOther.textContent = String(state.pets.length - available);
}


function renderPagination() {
    const { page, totalPages, total } = state.pagination;

    elements.pageLabel.textContent = `Page ${page} of ${Math.max(totalPages, 1)} · ${total} total`;
    elements.prevPage.disabled = page <= 1;
    elements.nextPage.disabled = page >= totalPages;
}


function selectPet(id) {
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
    return state.pets.find((pet) => pet.id === state.selectedId) || null;
}


function canManage(pet) {
    return Boolean(
        state.user &&
        state.user.role === 'STAFF' &&
        pet.shelter.id === state.user.id
    );
}


function renderDetail() {
    const pet = findSelected();

    if (!pet) {
        elements.detailEmpty.hidden = false;
        elements.detailContent.hidden = true;
        return;
    }

    elements.detailEmpty.hidden = true;
    elements.detailContent.hidden = false;

    elements.detailTitle.textContent = pet.name;
    elements.detailDescription.textContent = pet.description || 'No description has been added yet.';
    elements.detailSpecies.textContent = formatEnum(pet.species);
    elements.detailAge.textContent = formatAge(pet.age);
    elements.detailShelter.textContent = pet.shelter.name;
    elements.detailDate.textContent = `Listed ${formatDate(pet.dateAdded)}`;

    elements.detailStatus.textContent = formatEnum(pet.status);
    elements.detailStatus.className = `status-pill ${statusClass(pet.status)}`;

    const manageable = canManage(pet);

    elements.editButton.hidden = !manageable;
    elements.deleteButton.hidden = !manageable;
    elements.uploadForm.hidden = !manageable;
    elements.removeImageButton.hidden = !manageable || !pet.image;

    if (pet.image && state.token) {
        elements.mediaPlaceholder.hidden = true;
        elements.mediaCaption.textContent = `${pet.image.originalName} · ${formatBytes(pet.image.size)} · ${pet.image.mimeType}`;

        if (state.previewForId !== pet.id) {
            void loadPreview(pet);
        }
    } else {
        clearPreview();
        elements.mediaFrame.hidden = true;
        elements.mediaPlaceholder.hidden = false;
        elements.mediaPlaceholder.textContent = pet.image
            ? 'Sign in to view this private photo.'
            : 'No photo has been uploaded for this pet yet.';
    }
}


async function loadPreview(pet) {
    const requestId = ++state.previewRequest;

    clearPreview(false);


    try {
        const response = await fetch(pet.image.url, {
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
            throw new Error('The photo could not be loaded.');
        }


        const blob = await response.blob();


        if (requestId !== state.previewRequest) {
            return;
        }


        state.previewUrl = URL.createObjectURL(blob);
        state.previewForId = pet.id;

        elements.previewImage.src = state.previewUrl;
        elements.previewImage.alt = `Photo of ${pet.name}`;
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


/* ---------- Staff mutations ---------- */

async function handleCreate() {
    const name = elements.createName.value.trim();

    if (!name) {
        setMessage(elements.createMessage, 'A pet name is required.', 'error');
        return;
    }


    const button = elements.createForm.querySelector('button[type="submit"]');

    button.disabled = true;
    setMessage(elements.createMessage, 'Adding pet…', '');


    try {
        const result = await request('/api/pets', {
            method: 'POST',
            body: JSON.stringify({
                name,
                species: elements.createSpecies.value,
                age: Number(elements.createAge.value),
                description: elements.createDescription.value.trim() || undefined,
                status: elements.createStatus.value
            })
        });

        elements.createForm.reset();
        elements.createAge.value = '1';

        setMessage(elements.createMessage, '', '');

        state.query.page = 1;
        state.query.search = '';
        state.query.species = '';
        state.query.status = '';
        elements.searchInput.value = '';
        syncChips();

        await loadPets();

        state.selectedId = result.data.pet.id;
        renderList();
        renderDetail();

        toast('Pet added to the gallery.');
    } catch (error) {
        setMessage(elements.createMessage, describeError(error), 'error');
    } finally {
        button.disabled = false;
    }
}


function openEditor() {
    const pet = findSelected();

    if (!pet || !canManage(pet)) {
        return;
    }

    state.editing = true;

    elements.editName.value = pet.name;
    elements.editSpecies.value = pet.species;
    elements.editAge.value = String(pet.age);
    elements.editDescription.value = pet.description || '';
    elements.editStatus.value = pet.status;

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
    const pet = findSelected();

    if (!pet || !canManage(pet)) {
        return;
    }


    const button = elements.editForm.querySelector('button[type="submit"]');

    button.disabled = true;
    setMessage(elements.editMessage, 'Saving changes…', '');


    try {
        await request(`/api/pets/${pet.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
                name: elements.editName.value.trim(),
                species: elements.editSpecies.value,
                age: Number(elements.editAge.value),
                description: elements.editDescription.value.trim() || null,
                status: elements.editStatus.value
            })
        });

        closeEditor();
        await loadPets();

        state.selectedId = pet.id;
        renderList();
        renderDetail();

        toast('Pet details updated.');
    } catch (error) {
        setMessage(elements.editMessage, describeError(error), 'error');
    } finally {
        button.disabled = false;
    }
}


async function handleDelete() {
    const pet = findSelected();

    if (!pet || !canManage(pet)) {
        return;
    }


    const confirmed = window.confirm(
        `Remove "${pet.name}" from the gallery? Its private photo will be removed too.`
    );


    if (!confirmed) {
        return;
    }


    try {
        await request(`/api/pets/${pet.id}`, {
            method: 'DELETE'
        });

        state.selectedId = null;
        clearPreview();
        await loadPets();

        toast('Pet removed from the gallery.');
    } catch (error) {
        toast(describeError(error), 'error');
    }
}


async function handleUpload() {
    const pet = findSelected();

    if (!pet || !canManage(pet)) {
        return;
    }


    const file = elements.imageInput.files && elements.imageInput.files[0];


    if (!file) {
        setMessage(elements.uploadMessage, 'Choose a photo first.', 'error');
        return;
    }


    if (file.size > MAX_IMAGE_SIZE) {
        setMessage(elements.uploadMessage, 'Photos must be 5 MB or smaller.', 'error');
        return;
    }


    if (!/\.(jpe?g|png|webp)$/i.test(file.name)) {
        setMessage(elements.uploadMessage, 'Choose a JPEG, PNG, or WebP image.', 'error');
        return;
    }


    const formData = new FormData();

    formData.append('file', file);

    elements.uploadButton.disabled = true;
    setMessage(elements.uploadMessage, 'Checking and storing the photo…', '');


    try {
        await request(`/api/pets/${pet.id}/image`, {
            method: 'PUT',
            body: formData
        });

        elements.imageInput.value = '';
        clearPreview();

        await loadPets();

        state.selectedId = pet.id;
        renderList();
        renderDetail();

        setMessage(elements.uploadMessage, 'Photo uploaded successfully.', 'success');
        toast('Photo uploaded successfully.');
    } catch (error) {
        setMessage(elements.uploadMessage, describeError(error), 'error');
        toast(describeError(error), 'error');
    } finally {
        elements.uploadButton.disabled = false;
    }
}


async function handleRemoveImage() {
    const pet = findSelected();

    if (!pet || !canManage(pet) || !pet.image) {
        return;
    }


    const confirmed = window.confirm(`Remove the photo of "${pet.name}"?`);


    if (!confirmed) {
        return;
    }


    try {
        await request(`/api/pets/${pet.id}/image`, {
            method: 'DELETE'
        });

        clearPreview();
        await loadPets();

        state.selectedId = pet.id;
        renderList();
        renderDetail();

        toast('Photo removed.');
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


function formatAge(value) {
    const years = Number(value) || 0;

    return `${years} ${years === 1 ? 'year' : 'years'}`;
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
