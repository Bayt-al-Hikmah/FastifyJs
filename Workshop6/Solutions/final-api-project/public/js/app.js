/* =========================================================
   Mise — dashboard behaviour.

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
    view: 'box',
    box: {
        items: [],
        page: 1,
        limit: PAGE_SIZE,
        total: 0,
        totalPages: 0,
        search: '',
        category: '',
        maxPrep: ''
    },
    favorites: {
        items: [],
        total: 0
    },
    studio: {
        items: [],
        status: '',
        search: ''
    },
    editingId: null,
    detailRecipeId: null,
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
    statTotal: document.querySelector('#stat-total'),
    statPage: document.querySelector('#stat-page'),
    statFavorites: document.querySelector('#stat-favorites'),

    boxTab: document.querySelector('#box-tab'),
    favoritesTab: document.querySelector('#favorites-tab'),
    studioTab: document.querySelector('#studio-tab'),
    boxView: document.querySelector('#box-view'),
    favoritesView: document.querySelector('#favorites-view'),
    studioView: document.querySelector('#studio-view'),

    filterForm: document.querySelector('#filter-form'),
    filterSearch: document.querySelector('#filter-search'),
    filterCategory: document.querySelector('#filter-category'),
    filterPrep: document.querySelector('#filter-prep'),
    resetFilters: document.querySelector('#reset-filters'),
    resultsCount: document.querySelector('#results-count'),
    prevPage: document.querySelector('#prev-page'),
    nextPage: document.querySelector('#next-page'),
    pageLabel: document.querySelector('#page-label'),
    recipeGrid: document.querySelector('#recipe-grid'),

    refreshFavorites: document.querySelector('#refresh-favorites'),
    favoriteGrid: document.querySelector('#favorite-grid'),

    recipeForm: document.querySelector('#recipe-form'),
    recipeFormTitle: document.querySelector('#recipe-form-title'),
    recipeTitle: document.querySelector('#recipe-title'),
    recipeSummary: document.querySelector('#recipe-summary'),
    recipeCategory: document.querySelector('#recipe-category'),
    recipePrep: document.querySelector('#recipe-prep'),
    recipeIngredients: document.querySelector('#recipe-ingredients'),
    recipeSteps: document.querySelector('#recipe-steps'),
    statusField: document.querySelector('#status-field'),
    recipeStatus: document.querySelector('#recipe-status'),
    saveRecipe: document.querySelector('#save-recipe'),
    cancelEdit: document.querySelector('#cancel-edit'),
    recipeMessage: document.querySelector('#recipe-message'),
    recipeErrors: document.querySelector('#recipe-errors'),

    photoBox: document.querySelector('#photo-box'),
    photoName: document.querySelector('#photo-name'),
    removePhoto: document.querySelector('#remove-photo'),
    uploadForm: document.querySelector('#upload-form'),
    photoInput: document.querySelector('#photo-input'),
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

    elements.boxTab.addEventListener('click', () => switchView('box'));
    elements.favoritesTab.addEventListener('click', () => switchView('favorites'));
    elements.studioTab.addEventListener('click', () => switchView('studio'));

    elements.filterForm.addEventListener('submit', (event) => {
        event.preventDefault();
        state.box.search = elements.filterSearch.value.trim();
        state.box.category = elements.filterCategory.value;
        state.box.maxPrep = elements.filterPrep.value;
        state.box.page = 1;
        void loadBox();
    });

    elements.resetFilters.addEventListener('click', () => {
        elements.filterForm.reset();
        state.box.search = '';
        state.box.category = '';
        state.box.maxPrep = '';
        state.box.page = 1;
        void loadBox();
    });

    elements.prevPage.addEventListener('click', () => changePage(-1));
    elements.nextPage.addEventListener('click', () => changePage(1));

    elements.recipeGrid.addEventListener('click', handleCardAction);
    elements.favoriteGrid.addEventListener('click', handleCardAction);
    elements.refreshFavorites.addEventListener('click', () => void loadFavorites());

    elements.recipeForm.addEventListener('submit', (event) => {
        event.preventDefault();
        void handleRecipeSubmit();
    });

    elements.cancelEdit.addEventListener('click', resetRecipeForm);

    elements.uploadForm.addEventListener('submit', (event) => {
        event.preventDefault();
        void handleUpload();
    });

    elements.photoInput.addEventListener('change', () => {
        elements.uploadButton.disabled = elements.photoInput.files.length === 0;
        setMessage(elements.uploadMessage, '', '');
    });

    elements.removePhoto.addEventListener('click', () => {
        void handleRemovePhoto();
    });

    elements.studioList.addEventListener('click', (event) => {
        const button = event.target.closest('[data-action]');

        if (!button) {
            return;
        }

        const recipeId = Number(button.dataset.recipeId);
        const action = button.dataset.action;

        if (action === 'edit') {
            startEdit(recipeId);
        }

        if (action === 'status') {
            void toggleStatus(recipeId);
        }

        if (action === 'delete') {
            void deleteRecipe(recipeId);
        }

        if (action === 'detail') {
            void openDetail(recipeId);
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

    elements.detailBody.addEventListener('click', (event) => {
        const button = event.target.closest('[data-action]');

        if (!button || !state.detailRecipeId) {
            return;
        }

        if (button.dataset.action === 'favorite') {
            void toggleFavorite(state.detailRecipeId);
        }

        if (button.dataset.action === 'download') {
            void downloadPhoto(state.detailRecipeId);
        }
    });

    elements.closeDetail.addEventListener('click', closeDetail);
    elements.drawerBackdrop.addEventListener('click', closeDetail);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !elements.detailDrawer.hidden) {
            closeDetail();
        }
    });
}


function handleCardAction(event) {
    const button = event.target.closest('[data-action]');

    if (!button) {
        return;
    }

    const recipeId = Number(button.dataset.recipeId);

    if (button.dataset.action === 'detail') {
        void openDetail(recipeId);
    }

    if (button.dataset.action === 'favorite') {
        void toggleFavorite(recipeId);
    }

    if (button.dataset.action === 'edit') {
        startEdit(recipeId);
    }
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
        await loadBox();
        await loadFavorites();
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

    const isChef = state.user.role === 'CHEF';
    elements.studioTab.hidden = !isChef;

    if (!isChef && state.view === 'studio') {
        switchView('box');
    }
}


function logout() {
    clearAccessToken();
    state.user = null;
    state.editingId = null;
    state.box.items = [];
    state.favorites.items = [];
    state.studio.items = [];
    switchView('box');
    showAuth();
    toast('You have been signed out.');
}


/* ---------- Views and collections ---------- */

function switchView(view) {
    state.view = view;

    const isBox = view === 'box';
    const isFavorites = view === 'favorites';

    elements.boxTab.classList.toggle('is-active', isBox);
    elements.favoritesTab.classList.toggle('is-active', isFavorites);
    elements.studioTab.classList.toggle('is-active', view === 'studio');
    elements.boxTab.setAttribute('aria-selected', String(isBox));
    elements.favoritesTab.setAttribute('aria-selected', String(isFavorites));
    elements.studioTab.setAttribute('aria-selected', String(view === 'studio'));
    elements.boxView.hidden = !isBox;
    elements.favoritesView.hidden = !isFavorites;
    elements.studioView.hidden = view !== 'studio';

    if (isBox) {
        void loadBox();
    }

    if (isFavorites) {
        void loadFavorites();
    }

    if (view === 'studio') {
        void loadStudio();
    }
}


function changePage(direction) {
    const next = state.box.page + direction;

    if (next < 1 || next > state.box.totalPages) {
        return;
    }

    state.box.page = next;
    void loadBox();
}


function buildBoxQuery() {
    const query = state.box;
    const params = new URLSearchParams({
        page: String(query.page),
        limit: String(query.limit)
    });

    if (query.search) {
        params.set('search', query.search);
    }

    if (query.category) {
        params.set('category', query.category);
    }

    if (query.maxPrep) {
        params.set('maxPrep', query.maxPrep);
    }

    return params.toString();
}


async function loadBox() {
    elements.resultsCount.textContent = 'Loading recipes…';

    try {
        const payload = await apiRequest(`/api/recipes?${buildBoxQuery()}`);

        state.box.items = payload.data;
        state.box.page = payload.pagination.page;
        state.box.total = payload.pagination.total;
        state.box.totalPages = payload.pagination.totalPages;

        renderBox();
        updateStats();
    } catch (error) {
        elements.resultsCount.textContent = error.message;
        elements.recipeGrid.replaceChildren(
            createElement('li', 'empty-card', error.message)
        );
    }
}


function renderBox() {
    const box = state.box;

    elements.recipeGrid.replaceChildren();

    if (box.items.length === 0) {
        elements.resultsCount.textContent = 'No recipes match these filters.';
        elements.recipeGrid.append(
            createElement('li', 'empty-card', 'Try a different search or clear the filters.')
        );
    } else {
        const start = (box.page - 1) * box.limit + 1;
        const end = start + box.items.length - 1;

        elements.resultsCount.textContent =
            `Showing ${start}–${end} of ${box.total} published recipes.`;

        for (const recipe of box.items) {
            elements.recipeGrid.append(createRecipeCard(recipe));
        }
    }

    elements.pageLabel.textContent =
        `Page ${box.page} of ${Math.max(box.totalPages, 1)}`;
    elements.prevPage.disabled = box.page <= 1;
    elements.nextPage.disabled = box.page >= box.totalPages;
}


async function loadFavorites() {
    try {
        const payload = await apiRequest('/api/me/favorites?limit=100');

        state.favorites.items = payload.data;
        state.favorites.total = payload.pagination.total;

        elements.favoriteGrid.replaceChildren();

        if (payload.data.length === 0) {
            elements.favoriteGrid.append(
                createElement('li', 'empty-card', 'No favorites yet. Use Save on any recipe card to add one.')
            );
        } else {
            for (const recipe of payload.data) {
                elements.favoriteGrid.append(createRecipeCard(recipe));
            }
        }

        updateStats();
    } catch (error) {
        elements.favoriteGrid.replaceChildren(
            createElement('li', 'empty-card', error.message)
        );
    }
}


function createRecipeCard(recipe) {
    const item = createElement('li', 'recipe-card');

    const top = createElement('div', 'card-top');
    top.append(
        createElement('span', 'type-pill', formatCategory(recipe.category)),
        createElement('span', 'card-chip', `${recipe.prepMinutes} min`)
    );
    item.append(top);

    item.append(createElement('h3', 'card-title', recipe.title));
    item.append(createElement('p', 'card-summary', recipe.summary));

    const meta = createElement('div', 'card-meta');
    meta.append(
        createElement('span', '', `by ${recipe.authorName}`),
        createElement('span', 'card-chip', `♥ ${recipe.favoriteCount}`)
    );

    if (recipe.photo) {
        meta.append(createElement('span', 'card-chip', 'Photo attached'));
    }

    item.append(meta);

    const actions = createElement('div', 'card-actions');
    actions.append(
        createActionButton('Recipe card', 'button-secondary', 'detail', recipe.id),
        createFavoriteButton(recipe)
    );

    if (
        state.user &&
        state.user.role === 'CHEF' &&
        recipe.authorId === state.user.id
    ) {
        actions.append(
            createActionButton('Edit', 'button-quiet', 'edit', recipe.id)
        );
    }

    item.append(actions);

    return item;
}


function createActionButton(label, className, action, recipeId) {
    const button = createElement(
        'button',
        `button button-small ${className}`,
        label
    );

    button.type = 'button';
    button.dataset.action = action;
    button.dataset.recipeId = String(recipeId);

    return button;
}


function createFavoriteButton(recipe) {
    const label = recipe.isFavorite ? '♥ Saved' : '♡ Save';
    const button = createActionButton(
        label,
        `button-quiet favorite-button${recipe.isFavorite ? ' is-active' : ''}`,
        'favorite',
        recipe.id
    );

    button.setAttribute(
        'aria-label',
        recipe.isFavorite
            ? `Remove ${recipe.title} from favorites`
            : `Save ${recipe.title} to favorites`
    );

    return button;
}


function updateStats() {
    elements.statTotal.textContent = String(state.box.total);
    elements.statPage.textContent = String(state.box.items.length);
    elements.statFavorites.textContent = String(state.favorites.total);
}


/**
 * Apply a favorite toggle response to every cached collection so the UI does
 * not have to wait for three separate refetches before looking correct.
 */

function applyFavoriteResult(result) {
    const collections = [
        state.box.items,
        state.favorites.items,
        state.studio.items
    ];

    for (const collection of collections) {
        const recipe = collection.find((item) => item.id === result.recipeId);

        if (recipe) {
            recipe.isFavorite = result.isFavorite;
            recipe.favoriteCount = result.favoriteCount;
        }
    }

    if (!result.isFavorite) {
        state.favorites.items = state.favorites.items.filter(
            (item) => item.id !== result.recipeId
        );
        state.favorites.total = Math.max(0, state.favorites.total - 1);
    }
}


async function toggleFavorite(recipeId) {
    if (state.busy) {
        return;
    }

    state.busy = true;

    try {
        const payload = await apiRequest(`/api/recipes/${recipeId}/favorite`, {
            method: 'POST'
        });

        applyFavoriteResult(payload.data);

        renderBox();
        await loadFavorites();

        if (state.view === 'studio') {
            renderStudioList();
        }

        const detailRecipe = state.box.items.find(
            (item) => item.id === recipeId
        );

        if (detailRecipe && state.detailRecipeId === recipeId) {
            updateDetailFavoriteButton(detailRecipe);
        }

        updateStats();
        toast(payload.message);
    } catch (error) {
        toast(error.message, 'error');
    } finally {
        state.busy = false;
    }
}


function renderFavoritesFromState() {
    elements.favoriteGrid.replaceChildren();

    if (state.favorites.items.length === 0) {
        elements.favoriteGrid.append(
            createElement('li', 'empty-card', 'No favorites yet. Use Save on any recipe card to add one.')
        );
        return;
    }

    for (const recipe of state.favorites.items) {
        elements.favoriteGrid.append(createRecipeCard(recipe));
    }
}


/* ---------- Chef studio ---------- */

async function loadStudio() {
    if (state.user?.role !== 'CHEF') {
        return;
    }

    elements.studioList.replaceChildren(
        createElement('li', 'loading-row', 'Loading your recipes…')
    );

    const params = new URLSearchParams({ limit: '100' });

    if (state.studio.status) {
        params.set('status', state.studio.status);
    }

    if (state.studio.search) {
        params.set('search', state.studio.search);
    }

    try {
        const payload = await apiRequest(`/api/me/recipes?${params.toString()}`);
        state.studio.items = payload.data;
        renderStudioList();
    } catch (error) {
        elements.studioList.replaceChildren(
            createElement('li', 'empty-card', error.message)
        );
    }
}


function renderStudioList() {
    elements.studioList.replaceChildren();
    elements.studioCount.textContent = String(state.studio.items.length);

    if (state.studio.items.length === 0) {
        elements.studioList.append(
            createElement('li', 'empty-card', 'Nothing here yet. Create your first draft in the form.')
        );
        return;
    }

    for (const recipe of state.studio.items) {
        const item = createElement('li', 'studio-item');
        item.classList.toggle('is-editing', recipe.id === state.editingId);

        const row = createElement('div', 'studio-row');
        const copy = createElement('div');
        copy.append(
            createElement('h3', 'studio-title', recipe.title),
            createElement(
                'p',
                'studio-sub',
                `${formatCategory(recipe.category)} · ${recipe.prepMinutes} min · ${formatDate(recipe.updatedAt)}`
            )
        );

        row.append(
            copy,
            createElement('span', 'card-chip', formatStatus(recipe.status))
        );
        item.append(row);

        const actions = createElement('div', 'studio-actions');
        actions.append(
            createActionButton('Edit', 'button-secondary', 'edit', recipe.id),
            createActionButton(
                recipe.status === 'DRAFT' ? 'Publish' : 'Unpublish',
                'button-quiet',
                'status',
                recipe.id
            ),
            createActionButton('Recipe card', 'button-quiet', 'detail', recipe.id),
            createActionButton('Delete', 'button-danger', 'delete', recipe.id)
        );
        item.append(actions);

        elements.studioList.append(item);
    }
}


function startEdit(recipeIdOrObject) {
    const recipe =
        typeof recipeIdOrObject === 'object'
            ? recipeIdOrObject
            : state.studio.items.find((item) => item.id === recipeIdOrObject)
                || state.box.items.find((item) => item.id === recipeIdOrObject)
                || state.favorites.items.find((item) => item.id === recipeIdOrObject);

    if (!recipe) {
        toast('Reload your recipes and try again.', 'error');
        return;
    }

    if (
        state.user?.role !== 'CHEF' ||
        recipe.authorId !== state.user.id
    ) {
        toast('You can only edit your own recipes.', 'error');
        return;
    }

    state.editingId = recipe.id;

    elements.recipeFormTitle.textContent = 'Edit recipe';
    elements.recipeTitle.value = recipe.title;
    elements.recipeSummary.value = recipe.summary;
    elements.recipeCategory.value = recipe.category;
    elements.recipePrep.value = String(recipe.prepMinutes);
    elements.recipeIngredients.value = recipe.ingredients;
    elements.recipeSteps.value = recipe.steps;
    elements.recipeStatus.value = recipe.status;
    elements.statusField.hidden = false;
    elements.saveRecipe.textContent = 'Save changes';
    elements.cancelEdit.hidden = false;

    setMessage(elements.recipeMessage, '', '');
    renderErrors(elements.recipeErrors, []);
    renderPhotoBox(recipe);

    if (state.view !== 'studio') {
        switchView('studio');
    } else {
        renderStudioList();
    }

    elements.recipeForm.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}


function resetRecipeForm() {
    state.editingId = null;

    elements.recipeForm.reset();
    elements.recipePrep.value = '30';
    elements.recipeFormTitle.textContent = 'New recipe';
    elements.saveRecipe.textContent = 'Create draft';
    elements.statusField.hidden = true;
    elements.cancelEdit.hidden = true;
    elements.photoBox.hidden = true;
    elements.removePhoto.hidden = true;
    elements.uploadButton.disabled = true;
    elements.photoInput.value = '';

    setMessage(elements.recipeMessage, '', '');
    setMessage(elements.uploadMessage, '', '');
    renderErrors(elements.recipeErrors, []);
    renderStudioList();
}


function renderPhotoBox(recipe) {
    elements.photoBox.hidden = false;

    if (recipe.photo) {
        elements.photoName.textContent = recipe.photo.originalName;
        elements.removePhoto.hidden = false;
        elements.uploadButton.textContent = 'Replace photo';
    } else {
        elements.photoName.textContent = 'No photo yet';
        elements.removePhoto.hidden = true;
        elements.uploadButton.textContent = 'Upload photo';
    }

    elements.photoInput.value = '';
    elements.uploadButton.disabled = true;
    setMessage(elements.uploadMessage, '');
}


async function handleRecipeSubmit() {
    if (state.busy) {
        return;
    }

    const body = {
        title: elements.recipeTitle.value.trim(),
        summary: elements.recipeSummary.value.trim(),
        ingredients: elements.recipeIngredients.value.trim(),
        steps: elements.recipeSteps.value.trim(),
        category: elements.recipeCategory.value,
        prepMinutes: Number(elements.recipePrep.value)
    };

    setMessage(
        elements.recipeMessage,
        state.editingId ? 'Saving…' : 'Creating draft…',
        ''
    );
    renderErrors(elements.recipeErrors, []);

    state.busy = true;
    elements.saveRecipe.disabled = true;

    try {
        let recipe;

        if (state.editingId) {
            const payload = await apiRequest(`/api/recipes/${state.editingId}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    ...body,
                    status: elements.recipeStatus.value
                })
            });
            recipe = payload.data;
            setMessage(elements.recipeMessage, 'Recipe saved.', 'success');
            toast('Recipe saved.');
        } else {
            const payload = await apiRequest('/api/recipes', {
                method: 'POST',
                body: JSON.stringify(body)
            });
            recipe = payload.data;
            setMessage(elements.recipeMessage, 'Draft created.', 'success');
            toast('Draft created. Add a photo and publish when ready.');
        }

        await loadStudio();
        await loadBox();
        await loadFavorites();
        startEdit(recipe);
    } catch (error) {
        setMessage(elements.recipeMessage, error.message, 'error');
        renderErrors(elements.recipeErrors, describeError(error));
    } finally {
        state.busy = false;
        elements.saveRecipe.disabled = false;
    }
}


async function toggleStatus(recipeId) {
    const recipe = state.studio.items.find((item) => item.id === recipeId);

    if (!recipe) {
        return;
    }

    const nextStatus = recipe.status === 'DRAFT' ? 'PUBLISHED' : 'DRAFT';

    try {
        await apiRequest(`/api/recipes/${recipeId}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: nextStatus })
        });

        await loadStudio();
        await loadBox();
        await loadFavorites();

        if (state.editingId === recipeId) {
            elements.recipeStatus.value = nextStatus;
        }

        toast(
            nextStatus === 'PUBLISHED'
                ? 'Recipe published.'
                : 'Recipe moved back to drafts.'
        );
    } catch (error) {
        toast(error.message, 'error');
    }
}


async function deleteRecipe(recipeId) {
    const recipe = state.studio.items.find((item) => item.id === recipeId);

    if (!recipe) {
        return;
    }

    if (!window.confirm(
        `Delete "${recipe.title}"? Its photo file will be removed too.`
    )) {
        return;
    }

    try {
        await apiRequest(`/api/recipes/${recipeId}`, {
            method: 'DELETE'
        });

        if (state.editingId === recipeId) {
            resetRecipeForm();
        }

        await loadStudio();
        await loadBox();
        await loadFavorites();
        toast('Recipe deleted.');
    } catch (error) {
        toast(error.message, 'error');
    }
}


/* ---------- Photo upload, download, and preview ---------- */

async function handleUpload() {
    const file = elements.photoInput.files[0];

    if (!state.editingId || !file || state.busy) {
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        setMessage(
            elements.uploadMessage,
            'Choose an image smaller than 5 MB.',
            'error'
        );
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    state.busy = true;
    elements.uploadButton.disabled = true;
    elements.uploadButton.textContent = 'Uploading…';
    setMessage(
        elements.uploadMessage,
        'Validating signature and storing privately…',
        ''
    );

    try {
        const payload = await apiRequest(`/api/recipes/${state.editingId}/photo`, {
            method: 'PUT',
            body: formData
        });

        setMessage(elements.uploadMessage, 'Photo stored successfully.', 'success');
        elements.photoInput.value = '';
        toast('Photo stored successfully.');

        await loadStudio();
        await loadBox();
        await loadFavorites();

        const refreshed = state.studio.items.find(
            (item) => item.id === state.editingId
        );

        if (refreshed) {
            renderPhotoBox(refreshed);
        }
    } catch (error) {
        setMessage(elements.uploadMessage, error.message, 'error');
        renderErrors(elements.recipeErrors, describeError(error));
    } finally {
        state.busy = false;
        elements.uploadButton.disabled = elements.photoInput.files.length === 0;
        elements.uploadButton.textContent =
            elements.photoName.textContent === 'No photo yet'
                ? 'Upload photo'
                : 'Replace photo';
    }
}


async function handleRemovePhoto() {
    if (!state.editingId) {
        return;
    }

    if (!window.confirm('Remove this photo from the recipe?')) {
        return;
    }

    try {
        await apiRequest(`/api/recipes/${state.editingId}/photo`, {
            method: 'DELETE'
        });

        await loadStudio();
        await loadBox();
        await loadFavorites();

        const refreshed = state.studio.items.find(
            (item) => item.id === state.editingId
        );

        if (refreshed) {
            renderPhotoBox(refreshed);
        }

        toast('Photo removed.');
    } catch (error) {
        toast(error.message, 'error');
    }
}


async function downloadPhoto(recipeId) {
    try {
        const payload = await apiRequest(`/api/recipes/${recipeId}`);

        if (!payload.data.photo) {
            toast('This recipe has no photo.', 'error');
            return;
        }

        const blob = await downloadBlob(payload.data.photo.downloadUrl);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = payload.data.photo.originalName;
        document.body.append(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);

        toast(`Downloaded ${payload.data.photo.originalName}.`);
    } catch (error) {
        toast(error.message, 'error');
    }
}


/* ---------- Detail drawer ---------- */

async function openDetail(recipeId) {
    state.detailRecipeId = recipeId;

    elements.detailTitle.textContent = 'Loading…';
    elements.detailBody.replaceChildren();
    elements.detailDrawer.hidden = false;
    elements.drawerBackdrop.hidden = false;

    try {
        const payload = await apiRequest(`/api/recipes/${recipeId}`);
        const recipe = payload.data;

        if (state.detailRecipeId !== recipeId) {
            return;
        }

        elements.detailTitle.textContent = recipe.title;
        elements.detailBody.replaceChildren();

        const badges = createElement('div', 'detail-badges');
        badges.append(
            createElement('span', 'type-pill', formatCategory(recipe.category)),
            createElement('span', 'card-chip', formatStatus(recipe.status)),
            createElement('span', 'card-chip', `${recipe.prepMinutes} min`)
        );
        elements.detailBody.append(badges);

        if (recipe.photo) {
            const preview = createElement('img', 'detail-image');
            preview.alt = `Photo for ${recipe.title}`;
            elements.detailBody.append(preview);
            void renderImagePreview(
                recipe.photo.downloadUrl,
                preview,
                recipeId
            );
        }

        elements.detailBody.append(
            createDetailSection('Chef', recipe.authorName),
            createDetailSection('Summary', recipe.summary),
            createDetailSection('Ingredients', recipe.ingredients, true),
            createDetailSection('Method', recipe.steps, true),
            createDetailSection(
                'Added',
                `${formatDate(recipe.createdAt)} · ${recipe.favoriteCount} favorites`
            )
        );

        const actions = createElement('div', 'card-actions detail-actions');
        actions.append(
            createFavoriteButton(recipe)
        );

        if (recipe.photo) {
            actions.append(
                createActionButton(
                    'Download photo',
                    'button-secondary',
                    'download',
                    recipe.id
                )
            );
        }

        elements.detailBody.append(actions);
    } catch (error) {
        elements.detailTitle.textContent = 'Unavailable';
        elements.detailBody.append(
            createElement('p', 'form-message', error.message)
        );
    }
}


function createDetailSection(heading, text, asList = false) {
    const section = createElement('section', 'detail-section');
    section.append(createElement('h3', '', heading));

    if (asList) {
        const list = createElement('ul', 'detail-list');

        for (const line of text.split('\n').map((item) => item.trim()).filter(Boolean)) {
            list.append(createElement('li', '', line));
        }

        section.append(list);
    } else {
        section.append(createElement('p', '', text));
    }

    return section;
}


function updateDetailFavoriteButton(recipe) {
    const button = elements.detailBody.querySelector('[data-action="favorite"]');

    if (!button) {
        return;
    }

    button.textContent = recipe.isFavorite ? '♥ Saved' : '♡ Save';
    button.classList.toggle('is-active', Boolean(recipe.isFavorite));
    button.setAttribute(
        'aria-label',
        recipe.isFavorite
            ? `Remove ${recipe.title} from favorites`
            : `Save ${recipe.title} to favorites`
    );
}


async function renderImagePreview(url, image, recipeId) {
    try {
        const blob = await downloadBlob(url);
        const objectUrl = URL.createObjectURL(blob);

        if (!elements.detailDrawer.hidden && state.detailRecipeId === recipeId) {
            image.src = objectUrl;
            state.objectUrls.push(objectUrl);
        } else {
            URL.revokeObjectURL(objectUrl);
        }
    } catch {
        // A preview failure should not hide the rest of the detail panel.
        image.remove();
    }
}


function closeDetail() {
    elements.detailDrawer.hidden = true;
    elements.drawerBackdrop.hidden = true;
    elements.detailBody.replaceChildren();
    state.detailRecipeId = null;

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
    list.replaceChildren();

    for (const issue of errors) {
        list.append(
            createElement('li', '', `${issue.field}: ${issue.message}`)
        );
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


function formatCategory(value) {
    const labels = {
        BREAKFAST: 'Breakfast',
        LUNCH: 'Lunch',
        DINNER: 'Dinner',
        DESSERT: 'Dessert',
        SNACK: 'Snack',
        BEVERAGE: 'Beverage'
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
