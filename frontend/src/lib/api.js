import axios from 'axios'

/**
 * Pre-configured Axios instance for all API requests.
 * - Base URL points to /api (proxied to Django in dev, direct in prod)
 * - withCredentials enables session cookie on cross-origin requests
 * - CSRF token is read from the csrftoken cookie and sent as X-CSRFToken header
 */
const api = axios.create({
    baseURL: '/api',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
})

/** Read the CSRF token from the browser cookie set by Django. */
function getCsrfToken() {
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
        if (error.response?.status === 403 && !window.location.pathname.startsWith('/login')) {
            window.location.href = '/login'
        }
        return Promise.reject(error)
    },
)

export default api
