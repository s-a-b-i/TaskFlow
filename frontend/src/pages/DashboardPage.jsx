import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AlertCircle, Calendar, CheckCircle2, Clock, LayoutDashboard, Target, Users } from 'lucide-react'
import api from '../lib/api'
import { format } from 'date-fns'

function StatCard({ title, value, icon: Icon, color, bg }) {
    return (
        <div className="card p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bg}`}>
                <Icon className={`w-6 h-6 ${color}`} />
            </div>
            <div>
                <p className="text-sm font-medium text-[#6B7280]">{title}</p>
                <h3 className="text-2xl font-bold text-[#111827] mt-0.5">{value}</h3>
            </div>
        </div>
    )
}

export default function DashboardPage() {
    const { data, isLoading, error } = useQuery({
        queryKey: ['dashboard'],
        queryFn: async () => {
            const res = await api.get('/dashboard/')
            return res.data
        },
    })

    if (isLoading) return <div className="p-8 pb-0 animate-pulse bg-gray-200 h-screen rounded -ml-6 -mt-6" />
    if (error) return <div className="p-8 text-red-600">Failed to load dashboard</div>

    const { teams_count, tasks, my_tasks, overdue_tasks } = data

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[#111827] flex items-center gap-2">
                        <LayoutDashboard className="w-6 h-6 text-[#2563EB]" />
                        Dashboard Overivew
                    </h1>
                    <p className="text-[#6B7280] text-sm mt-1">Here's what's happening in your workspaces today.</p>
                </div>
                <Link to="/tasks" className="btn-primary">View All Tasks</Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="My Workspaces" value={teams_count} icon={Users} color="text-blue-600" bg="bg-blue-100" />
                <StatCard title="Total Tasks" value={tasks.total} icon={Target} color="text-indigo-600" bg="bg-indigo-100" />
                <StatCard title="My Assigned Tasks" value={my_tasks.total} icon={CheckCircle2} color="text-green-600" bg="bg-green-100" />
                <StatCard title="Tasks Due Today" value={tasks.due_today} icon={Calendar} color="text-yellow-600" bg="bg-yellow-100" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Task Status Overview */}
                <div className="card p-6 lg:col-span-2">
                    <h2 className="text-lg font-bold text-[#111827] mb-4">Workspace Task Status</h2>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 rounded-xl border border-gray-100 bg-gray-50 flex flex-col items-center justify-center">
                            <span className="text-3xl font-bold text-gray-700">{tasks.todo}</span>
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 mt-2">To Do</span>
                        </div>
                        <div className="p-4 rounded-xl border border-blue-100 bg-blue-50 flex flex-col items-center justify-center">
                            <span className="text-3xl font-bold text-blue-700">{tasks.in_progress}</span>
                            <span className="text-xs font-semibold uppercase tracking-wider text-blue-500 mt-2">In Progress</span>
                        </div>
                        <div className="p-4 rounded-xl border border-green-100 bg-green-50 flex flex-col items-center justify-center">
                            <span className="text-3xl font-bold text-green-700">{tasks.done}</span>
                            <span className="text-xs font-semibold uppercase tracking-wider text-green-500 mt-2">Done</span>
                        </div>
                    </div>
                </div>

                {/* Reminders: Overdue Tasks */}
                <div className="card shadow-md border-red-100">
                    <div className="p-4 border-b border-red-100 bg-red-50 flex items-center gap-2 rounded-t-xl">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <h2 className="text-sm font-bold text-red-800">Needs Attention (Overdue)</h2>
                        <span className="ml-auto bg-red-200 text-red-800 py-0.5 px-2 rounded-full text-xs font-bold">
                            {my_tasks.overdue}
                        </span>
                    </div>
                    <div className="p-4">
                        {overdue_tasks.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">You have no overdue tasks! 🎉</p>
                        ) : (
                            <ul className="space-y-3">
                                {overdue_tasks.map((task) => (
                                    <li key={task.id} className="flex flex-col gap-1 p-3 rounded-lg border border-red-50 bg-white shadow-sm">
                                        <div className="flex justify-between items-start">
                                            <span className="text-sm font-semibold text-gray-900 line-clamp-1">{task.title}</span>
                                            <span className="badge-high">High</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-red-600 mt-1">
                                            <Clock className="w-3.5 h-3.5" />
                                            Due {format(new Date(task.due_date), 'MMM d, yyyy')}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {overdue_tasks.length > 0 && (
                            <Link to="/tasks?overdue=true" className="btn-ghost w-full mt-4 text-red-600 hover:bg-red-50 text-xs">
                                View all overdue tasks
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
