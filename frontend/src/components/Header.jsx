import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import { format } from 'date-fns'
import api from '../lib/api'
import { Menu, Bell, Search, LayoutDashboard, CheckSquare, Users, AlertCircle, Clock, X } from 'lucide-react'

const navigationSuggestions = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Tasks', path: '/tasks', icon: CheckSquare },
    { label: 'Teams', path: '/teams', icon: Users },
]

export default function Header({ toggleSidebar, toggleMobileSidebar, isSidebarCollapsed }) {
    const { user } = useAuthStore()
    const navigate = useNavigate()
    const [searchQuery, setSearchQuery] = useState('')
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [showNotifications, setShowNotifications] = useState(false)
    const searchRef = useRef(null)
    const notificationsRef = useRef(null)

    const { data: dashboardData } = useQuery({
        queryKey: ['dashboard'],
        queryFn: async () => {
            const res = await api.get('/dashboard/')
            return res.data
        },
    })

    const { data: notificationsData, refetch: refetchNotifications } = useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const res = await api.get('/notifications/')
            return res.data
        },
    })

    const overdueTasks = dashboardData?.overdue_tasks || []
    const unreadNotifications = notificationsData?.filter(n => !n.is_read) || []
    const totalAlerts = unreadNotifications.length || overdueTasks.length

    const filteredSuggestions = navigationSuggestions.filter(item =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase())
    )

    useEffect(() => {
        function handleClickOutside(event) {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowSuggestions(false)
            }
            if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
                setShowNotifications(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    async function markAsRead(id) {
        try {
            await api.post(`/notifications/${id}/read/`)
            refetchNotifications()
        } catch (error) {
            console.error('Failed to mark notification as read', error)
        }
    }

    async function markAllAsRead() {
        try {
            await api.post('/notifications/read_all/')
            refetchNotifications()
        } catch (error) {
            console.error('Failed to mark all as read', error)
        }
    }

    function handleNavigate(path) {
        navigate(path)
        setSearchQuery('')
        setShowSuggestions(false)
    }

    return (
        <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-6 shadow-sm shadow-slate-200/50">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => {
                        window.innerWidth < 1024 ? toggleMobileSidebar() : toggleSidebar()
                    }}
                    className="p-2 hover:bg-slate-50 text-slate-500 rounded-lg transition-colors"
                    aria-label="Toggle Sidebar"
                >
                    <Menu className="w-5 h-5" />
                </button>
                <div
                    ref={searchRef}
                    className="relative hidden md:flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all"
                >
                    <Search className="w-4 h-4 text-slate-400 mr-2" />
                    <input
                        type="text"
                        placeholder="Search pages..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value)
                            setShowSuggestions(true)
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        className="bg-transparent border-none text-xs text-slate-900 focus:outline-none w-64"
                    />

                    {showSuggestions && searchQuery && filteredSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-slate-100 shadow-xl z-50 overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                            <p className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50">Navigation</p>
                            {filteredSuggestions.map(item => (
                                <button
                                    key={item.path}
                                    onClick={() => handleNavigate(item.path)}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-slate-600 hover:text-primary transition-colors text-left"
                                >
                                    <item.icon className="w-4 h-4" />
                                    <span className="text-xs font-semibold">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-3">
                <div className="relative" ref={notificationsRef}>
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className={`p-2 hover:bg-slate-50 rounded-lg transition-colors relative ${showNotifications ? 'bg-slate-50 text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Bell className="w-5 h-5" />
                        {totalAlerts > 0 && (
                            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white animate-pulse"></span>
                        )}
                    </button>

                    {showNotifications && (
                        <div className="fixed inset-x-4 top-16 md:absolute md:inset-auto md:right-0 md:top-full md:mt-2 md:w-80 bg-white rounded-xl border border-slate-100 shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Notifications</h3>
                                {unreadNotifications.length > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter text-primary hover:bg-blue-50 transition-colors"
                                    >
                                        Mark all as read
                                    </button>
                                )}
                            </div>
                            <div className="max-h-[350px] overflow-y-auto">
                                {unreadNotifications.length > 0 ? (
                                    <div className="divide-y divide-slate-50">
                                        {unreadNotifications.map(notification => (
                                            <div
                                                key={notification.id}
                                                className="p-4 hover:bg-slate-50 transition-colors group relative"
                                            >
                                                <div className="flex gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${notification.type === 'overdue_task' ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-primary'}`}>
                                                        {notification.type === 'overdue_task' ? <AlertCircle className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <p className="text-xs font-bold text-slate-900 truncate leading-tight">
                                                                {notification.title}
                                                            </p>
                                                            <button
                                                                onClick={() => markAsRead(notification.id)}
                                                                className="text-[9px] text-slate-400 hover:text-primary font-bold"
                                                            >
                                                                Clear
                                                            </button>
                                                        </div>
                                                        <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                                                            {notification.message}
                                                        </p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-1.5">
                                                            {format(new Date(notification.created_at), 'MMM d, h:mm a')}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : overdueTasks.length > 0 ? (
                                    <div className="divide-y divide-slate-50">
                                        <p className="px-4 py-2 text-[10px] font-bold text-rose-500 bg-rose-50/50 uppercase tracking-widest leading-none">Overdue Reminder</p>
                                        {overdueTasks.map(task => (
                                            <Link
                                                key={task.id}
                                                to="/tasks"
                                                onClick={() => setShowNotifications(false)}
                                                className="block p-4 hover:bg-slate-50 transition-colors group"
                                            >
                                                <div className="flex gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-rose-50 flex-shrink-0 flex items-center justify-center text-rose-500 group-hover:bg-rose-100 transition-colors">
                                                        <AlertCircle className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-bold text-slate-900 truncate leading-tight">
                                                            {task.title}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <div className="flex items-center gap-1 text-[9px] font-bold text-rose-500 uppercase tracking-tight">
                                                                <Clock className="w-2.5 h-2.5" />
                                                                Due {format(new Date(task.due_date), 'MMM d')}
                                                            </div>
                                                            <span className="text-slate-300">•</span>
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight truncate">
                                                                {task.team_name}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center">
                                        <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <CheckSquare className="w-5 h-5" />
                                        </div>
                                        <p className="text-xs font-bold text-slate-900">All caught up!</p>
                                        <p className="text-[10px] font-medium text-slate-400 mt-1">No new notifications.</p>
                                    </div>
                                )}
                            </div>
                            {totalAlerts > 0 && (
                                <Link
                                    to="/tasks"
                                    onClick={() => setShowNotifications(false)}
                                    className="block p-3 text-center text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 hover:text-primary hover:bg-slate-50 transition-all border-t border-slate-50"
                                >
                                    View All Workspace Activity
                                </Link>
                            )}
                        </div>
                    )}
                </div>
                <div className="h-8 w-px bg-slate-100 mx-1"></div>
                <div className="flex items-center gap-2 pl-2 cursor-pointer group">
                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                        {user?.first_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
                    </div>
                    <div className="hidden sm:block text-left">
                        <p className="text-xs font-bold text-slate-900 leading-none">
                            {user?.first_name} {user?.last_name}
                        </p>
                        <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                            {user?.email}
                        </p>
                    </div>
                </div>
            </div>
        </header>
    )
}
