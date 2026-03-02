import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, CheckSquare, LogOut, ChevronRight, X } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import api from '../lib/api'
import toast from 'react-hot-toast'

const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/teams', label: 'Teams', icon: Users },
    { to: '/tasks', label: 'Tasks', icon: CheckSquare },
]

export default function Sidebar({ isCollapsed, isMobileOpen, onClose }) {
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
        <aside className={`
            fixed top-0 bottom-0 left-0 z-50 bg-white border-r border-slate-200 flex flex-col transition-all duration-300
            ${isCollapsed ? 'lg:w-20' : 'lg:w-64'} 
            ${isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
        `}>
            {/* Brand */}
            <div className={`p-4 h-16 flex items-center border-b border-slate-100 ${isCollapsed ? 'lg:justify-center' : 'px-6'}`}>
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-sm shadow-primary/20 flex-shrink-0">
                        <CheckSquare className="w-5 h-5 text-white" />
                    </div>
                    {(!isCollapsed || isMobileOpen) && (
                        <div>
                            <h1 className="text-sm font-bold text-slate-900 leading-tight">TaskFlow</h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Simple Task Manager</p>
                        </div>
                    )}
                </div>
                {isMobileOpen && (
                    <button onClick={onClose} className="ml-auto lg:hidden p-2 text-slate-400">
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Nav */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {navItems.map(({ to, label, icon: Icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/'}
                        title={isCollapsed ? label : ''}
                        onClick={() => {
                            if (window.innerWidth < 1024) onClose()
                        }}
                        className={({ isActive }) =>
                            `flex items-center gap-3 rounded-lg text-sm font-semibold transition-all duration-200 group ${isCollapsed ? 'lg:justify-center h-12 lg:w-12 mx-auto' : 'px-3 h-11'} ${isActive
                                ? 'bg-blue-50 text-primary shadow-sm'
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600'}`} />
                                {(!isCollapsed || isMobileOpen) && <span className="flex-1 truncate">{label}</span>}
                                {(!isCollapsed || isMobileOpen) && isActive && <ChevronRight className="w-4 h-4 text-primary" />}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Profile & Logout */}
            <div className={`p-4 border-t border-slate-100 bg-slate-50/50 ${(isCollapsed && !isMobileOpen) ? 'flex flex-col items-center gap-4' : ''}`}>
                {(!isCollapsed || isMobileOpen) ? (
                    <>
                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg mb-3">
                            <div className="w-9 h-9 rounded-full bg-white border border-slate-200 text-primary flex items-center justify-center flex-shrink-0 font-bold text-xs shadow-sm">
                                {user?.first_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-900 truncate">
                                    {user?.first_name} {user?.last_name}
                                </p>
                                <p className="text-[10px] font-medium text-slate-400 truncate tracking-tight">{user?.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 w-full px-3 h-10 rounded-lg text-rose-600 hover:bg-rose-50 transition-all text-xs font-bold uppercase tracking-widest"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign out
                        </button>
                    </>
                ) : (
                    <button
                        onClick={handleLogout}
                        title="Sign out"
                        className="w-10 h-10 flex items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50 transition-all shadow-sm border border-rose-100 bg-white"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                )}
            </div>
        </aside>
    )
}
