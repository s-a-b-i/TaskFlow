import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, CheckSquare, LogOut, ChevronRight } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import api from '../lib/api'
import toast from 'react-hot-toast'

const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/teams', label: 'Teams', icon: Users },
    { to: '/tasks', label: 'Tasks', icon: CheckSquare },
]

export default function Sidebar() {
    const { user, clearUser } = useAuthStore()
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    async function handleLogout() {
        try {
            await api.post('/auth/logout/')
        } catch {
            // Even if the request fails, clear local state
        }
        clearUser()
        queryClient.clear()
        navigate('/login')
        toast.success('Logged out successfully')
    }

    return (
        <aside className="w-64 h-screen bg-white border-r border-[#E5E7EB] flex flex-col fixed left-0 top-0 z-40 shadow-sm">
            {/* Brand */}
            <div className="p-6 border-b border-[#E5E7EB]">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] flex items-center justify-center shadow-sm">
                        <CheckSquare className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-[#111827] leading-tight">TaskFlow</h1>
                        <p className="text-xs text-[#6B7280]">Team Manager</p>
                    </div>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 p-4 space-y-1">
                {navItems.map(({ to, label, icon: Icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/'}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${isActive
                                ? 'bg-[#EFF6FF] text-[#2563EB]'
                                : 'text-[#6B7280] hover:bg-gray-50 hover:text-[#111827]'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-[#2563EB]' : ''}`} />
                                <span className="flex-1">{label}</span>
                                {isActive && <ChevronRight className="w-4 h-4 text-[#2563EB]" />}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* User & Logout */}
            <div className="p-4 border-t border-[#E5E7EB]">
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg mb-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-white">
                            {user?.first_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#111827] truncate">
                            {user?.first_name} {user?.last_name}
                        </p>
                        <p className="text-xs text-[#6B7280] truncate">{user?.email}</p>
                    </div>
                </div>
                <button onClick={handleLogout} className="btn-ghost w-full justify-start text-xs gap-2 px-3 py-2">
                    <LogOut className="w-4 h-4" />
                    Sign out
                </button>
            </div>
        </aside>
    )
}
