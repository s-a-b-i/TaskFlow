import axios from 'axios'

/**
 * Pre-configured Axios instance for all API requests.
 * - Base URL points to /api (proxied to Django in dev, direct in prod)
 * - withCredentials enables session cookie on cross-origin requests
 * - CSRF token is read from the csrftoken cookie and sent as X-CSRFToken header
 */
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
})

/** Read the CSRF token from the browser cookie set by Django. */
let manualCsrfToken = null
export const setManualCsrfToken = (token) => { manualCsrfToken = token }

function getCsrfToken() {
    if (manualCsrfToken) return manualCsrfToken
    const match = document.cookie.match(/csrftoken=([^;]+)/)
    return match ? match[1] : null
}

// Attach CSRF token to all mutating requests
api.interceptors.request.use((config) => {
    const method = config.method?.toUpperCase()
    if (method && !['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method)) {
        const token = getCsrfToken()
        if (token) config.headers['X-CSRFToken'] = token
    }
    return config
})

// Global response error handler – redirect to /login on 403
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // SMART Handle 403 Session Expiry
        // Only redirect if it's an authentication issue, NOT a permission issue
        if (error.response?.status === 403 && !window.location.pathname.startsWith('/login')) {
            const code = error.response?.data?.code
            if (code === 'not_authenticated' || code === 'authentication_failed') {
                window.location.href = '/login'
            }
        }

        // Format error for UI components
        const backendError = error.response?.data?.detail
        let message = 'Something went wrong. Please try again.'

        if (typeof backendError === 'string') {
            message = backendError
        } else if (typeof backendError === 'object' && backendError !== null) {
            // Always preserve the full object for field-level mapping
            error.fieldErrors = backendError

            // Try to find a primary message for the summary/toast
            const primaryError = backendError.non_field_errors || backendError.detail
            if (primaryError) {
                message = Array.isArray(primaryError) ? primaryError[0] : String(primaryError)
            } else {
                message = 'Please check the highlighted fields.'
            }
        }

        error.displayMessage = message
        return Promise.reject(error)
    },
)

export default api
