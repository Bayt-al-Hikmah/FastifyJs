import { API_BASE_URL, apiHostLabel } from './config.js';
import {
    onAuthChange,
    login,
    register,
    logout
} from './auth.js';
import {
    initEvents,
    refreshAll,
    loadEvents,
    setFilters,
    createEvent
} from './events.js';
import {
    initUi,
    toast,
    renderApiError,
    clearError,
    setButtonBusy,
    toIsoString
} from './ui.js';


/**
 * Application entry point.
 *
 * main.js wires the static controls (authentication, creation, search/filters)
 * to the modules that own the API calls and DOM updates. It never navigates to
 * another page: every operation updates just the relevant region.
 */


let dom = {};
let searchTimer = null;
let lastUnauthorizedNotice = 0;


function cacheDom() {

    dom = {
        apiOrigin: document.querySelector('#api-origin'),
        footerApiUrl: document.querySelector('#footer-api-url'),

        sessionBar: document.querySelector('#session-bar'),
        sessionAvatar: document.querySelector('#session-avatar'),
        sessionName: document.querySelector('#session-name'),
        sessionRole: document.querySelector('#session-role'),
        logoutButton: document.querySelector('#logout-button'),

        authCard: document.querySelector('#auth-card'),
        studioCard: document.querySelector('#studio-card'),
        manageCard: document.querySelector('#manage-card'),
        studioUserBadge: document.querySelector('#studio-user-badge'),

        loginTab: document.querySelector('#login-tab'),
        registerTab: document.querySelector('#register-tab'),
        loginForm: document.querySelector('#login-form'),
        registerForm: document.querySelector('#register-form'),
        loginEmail: document.querySelector('#login-email'),
        loginPassword: document.querySelector('#login-password'),
        registerUsername: document.querySelector('#register-username'),
        registerEmail: document.querySelector('#register-email'),
        registerPassword: document.querySelector('#register-password'),
        registerRole: document.querySelector('#register-role'),
        loginError: document.querySelector('#login-error'),
        registerError: document.querySelector('#register-error'),
        loginSubmitButton: document.querySelector('#login-submit-button'),
        registerSubmitButton: document.querySelector('#register-submit-button'),

        createForm: document.querySelector('#create-form'),
        createTitle: document.querySelector('#create-title'),
        createDescription: document.querySelector('#create-description'),
        createLocation: document.querySelector('#create-location'),
        createStartsAt: document.querySelector('#create-starts-at'),
        createCapacity: document.querySelector('#create-capacity'),
        createCategory: document.querySelector('#create-category'),
        createError: document.querySelector('#create-error'),
        createSubmitButton: document.querySelector('#create-submit-button'),

        searchInput: document.querySelector('#search-input'),
        categoryFilter: document.querySelector('#category-filter'),
        scopeFilter: document.querySelector('#scope-filter'),
        refreshButton: document.querySelector('#refresh-button')
    };

}


function displayName(user) {

    if (!user) {

        return 'Member';

    }

    return user.username ?? user.name ?? user.email?.split('@')[0] ?? 'Member';

}


function displayRole(user) {

    const role = user?.role;

    if (role) {

        return String(role).toUpperCase();

    }

    return 'MEMBER';

}


function applyAuthView(user) {

    const signedIn = Boolean(user);

    dom.authCard.hidden = signedIn;
    dom.studioCard.hidden = !signedIn;
    dom.manageCard.hidden = !signedIn;
    dom.sessionBar.hidden = !signedIn;

    if (!signedIn) {

        dom.scopeFilter.value = 'all';
        setFilters({
            scope: 'all'
        });

        refreshAll();

        return;

    }

    const name = displayName(user);

    dom.sessionName.textContent = name;
    dom.sessionRole.textContent = displayRole(user);
    dom.sessionAvatar.textContent = name.slice(0, 1).toUpperCase();
    dom.studioUserBadge.textContent = name;

}


function switchAuthTab(which) {

    const showLogin = which === 'login';

    dom.loginTab.classList.toggle('is-active', showLogin);
    dom.registerTab.classList.toggle('is-active', !showLogin);

    dom.loginTab.setAttribute('aria-selected', String(showLogin));
    dom.registerTab.setAttribute('aria-selected', String(!showLogin));

    dom.loginForm.hidden = !showLogin;
    dom.registerForm.hidden = showLogin;

    clearError(dom.loginError, dom.loginForm);
    clearError(dom.registerError, dom.registerForm);

}


function requireAuthentication() {

    switchAuthTab('login');

    dom.authCard.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
    });

    toast('Sign in to continue.', 'error');
    dom.loginEmail.focus();

}


function handleUnauthorized() {

    const now = Date.now();

    if (now - lastUnauthorizedNotice < 3000) {

        return;

    }

    lastUnauthorizedNotice = now;

    logout();
    toast('Your session expired. Please sign in again.', 'error');

}


function wireAuthentication() {

    dom.loginTab.addEventListener('click', () => {

        switchAuthTab('login');

    });

    dom.registerTab.addEventListener('click', () => {

        switchAuthTab('register');

    });

    dom.loginForm.addEventListener('submit', async (submitEvent) => {

        submitEvent.preventDefault();

        clearError(dom.loginError, dom.loginForm);
        setButtonBusy(dom.loginSubmitButton, true, 'Signing in…');

        try {

            const user = await login({
                email: dom.loginEmail.value.trim(),
                password: dom.loginPassword.value
            });

            toast(`Welcome back, ${displayName(user)}.`, 'success');
            dom.loginForm.reset();

        } catch (error) {

            renderApiError(error, dom.loginError, dom.loginForm);

        } finally {

            setButtonBusy(dom.loginSubmitButton, false);

        }

    });

    dom.registerForm.addEventListener('submit', async (submitEvent) => {

        submitEvent.preventDefault();

        clearError(dom.registerError, dom.registerForm);
        setButtonBusy(dom.registerSubmitButton, true, 'Creating…');

        try {

            const result = await register({
                username: dom.registerUsername.value.trim(),
                email: dom.registerEmail.value.trim(),
                password: dom.registerPassword.value,
                role: dom.registerRole.value
            });

            dom.registerForm.reset();

            if (result.signedIn) {

                toast('Account created. You are signed in.', 'success');

            } else {

                switchAuthTab('login');
                toast('Account created. Sign in to start organising.', 'success');

            }

        } catch (error) {

            renderApiError(error, dom.registerError, dom.registerForm);

        } finally {

            setButtonBusy(dom.registerSubmitButton, false);

        }

    });

    dom.logoutButton.addEventListener('click', () => {

        logout();
        toast('You have been signed out.', 'info');

    });

}


function wireCreateForm() {

    dom.createForm.addEventListener('submit', async (submitEvent) => {

        submitEvent.preventDefault();

        clearError(dom.createError, dom.createForm);

        const payload = {
            title: dom.createTitle.value.trim(),
            description: dom.createDescription.value.trim(),
            location: dom.createLocation.value.trim(),
            startsAt: toIsoString(dom.createStartsAt.value),
            capacity: Number(dom.createCapacity.value),
            category: dom.createCategory.value
        };

        try {

            await createEvent(payload, dom.createSubmitButton);

            dom.createForm.reset();
            clearError(dom.createError, dom.createForm);

        } catch (error) {

            renderApiError(error, dom.createError, dom.createForm);

        }

    });

}


function wireFilters() {

    dom.searchInput.addEventListener('input', () => {

        window.clearTimeout(searchTimer);

        searchTimer = window.setTimeout(async () => {

            setFilters({
                search: dom.searchInput.value
            });

            await loadEvents();

        }, 280);

    });

    dom.categoryFilter.addEventListener('change', async () => {

        setFilters({
            category: dom.categoryFilter.value
        });

        await loadEvents();

    });

    dom.scopeFilter.addEventListener('change', async () => {

        setFilters({
            scope: dom.scopeFilter.value
        });

        await loadEvents();

    });

    dom.refreshButton.addEventListener('click', async () => {

        await refreshAll();
        toast('Data refreshed from the API.', 'info');

    });

}


function startApplication() {

    initUi();
    cacheDom();

    initEvents({
        onRequireAuth: requireAuthentication,
        onUnauthorized: handleUnauthorized
    });

    wireAuthentication();
    wireCreateForm();
    wireFilters();

    onAuthChange((user) => {

        applyAuthView(user);

        if (user) {

            refreshAll();

        }

    });

    dom.apiOrigin.textContent = apiHostLabel();
    dom.apiOrigin.title = API_BASE_URL;
    dom.footerApiUrl.textContent = API_BASE_URL;

    refreshAll();

}


startApplication();
