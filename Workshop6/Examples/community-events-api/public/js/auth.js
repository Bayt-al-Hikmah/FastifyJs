import { apiRequest } from './api.js'
import { setSession } from './state.js'
import {
    qs,
    setMessage,
    showToast
} from './ui.js'


export function initAuth({ onAuthenticated }) {

    const loginTab = qs('#login-tab')
    const registerTab = qs('#register-tab')
    const loginForm = qs('#login-form')
    const registerForm = qs('#register-form')
    const message = qs('#auth-message')


    function selectTab(which) {

        const loginActive = which === 'login'

        loginTab.classList.toggle('is-active', loginActive)
        registerTab.classList.toggle('is-active', !loginActive)

        loginTab.setAttribute(
            'aria-selected',
            String(loginActive)
        )
        registerTab.setAttribute(
            'aria-selected',
            String(!loginActive)
        )

        loginForm.hidden = !loginActive
        registerForm.hidden = loginActive

        setMessage(message, '')

    }


    loginTab.addEventListener('click', () => selectTab('login'))

    registerTab.addEventListener('click', () => selectTab('register'))


    loginForm.addEventListener('submit', async (event) => {

        event.preventDefault()

        const submit = qs('button[type="submit"]', loginForm)

        submit.disabled = true
        setMessage(message, 'Signing you in…')

        try {

            const email = qs('#login-email').value.trim()
            const password = qs('#login-password').value

            const result = await apiRequest(
                '/api/auth/login',
                {
                    method: 'POST',
                    body: JSON.stringify({ email, password })
                }
            )

            setSession(
                result.data.user,
                result.data.accessToken
            )

            loginForm.reset()
            setMessage(
                message,
                'Signed in. Taking you to your dashboard…',
                'is-success'
            )

            onAuthenticated(result.data.user, false)

        } catch (error) {

            setMessage(
                message,
                error.message,
                'is-error'
            )

        } finally {

            submit.disabled = false

        }

    })


    registerForm.addEventListener('submit', async (event) => {

        event.preventDefault()

        const submit = qs('button[type="submit"]', registerForm)

        submit.disabled = true
        setMessage(message, 'Creating your account…')

        const email = qs('#register-email').value.trim()
        const password = qs('#register-password').value

        try {

            await apiRequest(
                '/api/auth/register',
                {
                    method: 'POST',
                    body: JSON.stringify({
                        username: qs('#register-username').value.trim(),
                        email,
                        password,
                        role: qs(
                            'input[name="role"]:checked',
                            registerForm
                        ).value
                    })
                }
            )


            // Registration returns the user but no token, so sign in with the
            // same credentials to start a session immediately.
            const loginResult = await apiRequest(
                '/api/auth/login',
                {
                    method: 'POST',
                    body: JSON.stringify({ email, password })
                }
            )

            setSession(
                loginResult.data.user,
                loginResult.data.accessToken
            )

            registerForm.reset()
            setMessage(
                message,
                'Account created. Welcome to Gather!',
                'is-success'
            )

            showToast(
                'Account created — welcome to Gather!'
            )

            onAuthenticated(loginResult.data.user, true)

        } catch (error) {

            setMessage(
                message,
                error.message,
                'is-error'
            )

        } finally {

            submit.disabled = false

        }

    })

}
