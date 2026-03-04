import { create } from 'zustand'
import api from '../lib/api'

/**
 * Global auth store using Zustand.
 * Tracks the current user and provides login/logout/init actions.
 */
export const useAuthStore = create((set, get) => ({
    user: null,
    isAuthenticated: false,
    isLoading: true,   // True while checking session on page load

    /** Called on app boot to check if an existing session is valid. */
    init: async () => {
        const token = localStorage.getItem('auth_token')
        if (!token) {
            set({ user: null, isAuthenticated: false, isLoading: false })
            return
        }

        try {
            const { data } = await api.get('/auth/me/')
            set({ user: data, isAuthenticated: true, isLoading: false })
        } catch {
            localStorage.removeItem('auth_token')
            set({ user: null, isAuthenticated: false, isLoading: false })
        }
    },

    /** Set user after successful login/register. */
    setUser: (user) => set({ user, isAuthenticated: true }),

    /** Clear auth state after logout. */
    clearUser: () => {
        localStorage.removeItem('auth_token')
        set({ user: null, isAuthenticated: false })
    },
}))
