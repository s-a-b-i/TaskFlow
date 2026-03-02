import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AlertCircle, Calendar, CheckCircle2, Clock, LayoutDashboard, Target, Users } from 'lucide-react'
import api from '../lib/api'
import { format } from 'date-fns'

function StatCard({ title, value, icon: Icon, color, bg }) {
    return (
        <div className="card p-5 flex items-center gap-4 transition-all hover:bg-slate-50/50">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${bg} border border-white/50 shadow-sm`}>
                <Icon className={`w-6 h-6 ${color}`} />
            </div>
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">{title}</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{value}</h3>
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

    if (isLoading) return <div className="p-8 animate-pulse bg-slate-50 h-screen rounded-xl" />
    if (error) return <div className="p-8 card border-rose-200 text-rose-600 font-bold">Error: Could not connect to the server</div>

    const { teams_count, tasks, my_tasks, overdue_tasks } = data

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        Dashboard Overview
                    </h1>
                    <p className="text-slate-500 text-sm font-medium mt-1">A quick look at your tasks and teams</p>
                </div>
                <Link to="/tasks" className="btn-primary">
                    View Tasks
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="My Teams" value={teams_count} icon={Users} color="text-blue-600" bg="bg-blue-50" />
                <StatCard title="All Tasks" value={tasks.total} icon={Target} color="text-indigo-600" bg="bg-indigo-50" />
                <StatCard title="My Tasks" value={my_tasks.total} icon={CheckCircle2} color="text-emerald-600" bg="bg-emerald-50" />
                <StatCard title="Due Today" value={tasks.due_today} icon={Calendar} color="text-amber-600" bg="bg-amber-50" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Task Status Overview */}
                <div className="card p-6 lg:col-span-2">
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 border-b border-slate-50 pb-2">Task Status</h2>
                    <div className="grid grid-cols-3 gap-6">
                        <div className="p-5 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col items-center justify-center text-center group hover:bg-white transition-colors">
                            <span className="text-3xl font-black text-slate-400 group-hover:text-slate-600 transition-colors">{tasks.todo}</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-2">Queued</span>
                        </div>
                        <div className="p-5 rounded-xl border border-blue-100 bg-blue-50/50 flex flex-col items-center justify-center text-center group hover:bg-white transition-colors">
                            <span className="text-3xl font-black text-blue-400 group-hover:text-blue-600 transition-colors">{tasks.in_progress}</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mt-2">Active</span>
                        </div>
                        <div className="p-5 rounded-xl border border-emerald-100 bg-emerald-50/50 flex flex-col items-center justify-center text-center group hover:bg-white transition-colors">
                            <span className="text-3xl font-black text-emerald-400 group-hover:text-emerald-600 transition-colors">{tasks.done}</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mt-2">Done</span>
                        </div>
                    </div>
                </div>

                {/* Reminders: Overdue Tasks */}
                <div className="card overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-500" />
                            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Overdue Tasks</h2>
                        </div>
                        <span className="bg-rose-50 text-rose-600 py-0.5 px-2 rounded-md text-[10px] font-bold border border-rose-100 uppercase">
                            {my_tasks.overdue} tasks
                        </span>
                    </div>
                    <div className="p-6">
                        {overdue_tasks.length === 0 ? (
                            <div className="text-center py-6">
                                <CheckCircle2 className="w-8 h-8 text-emerald-200 mx-auto mb-3" />
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">All Clear</p>
                            </div>
                        ) : (
                            <ul className="space-y-4">
                                {overdue_tasks.map((task) => (
                                    <li key={task.id} className="flex flex-col gap-1 p-3 rounded-lg border border-rose-50 bg-white hover:border-rose-100 transition-colors shadow-sm">
                                        <div className="flex justify-between items-start gap-3">
                                            <span className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug">{task.title}</span>
                                            <span className="badge-high">High</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-tighter text-rose-500 mt-2">
                                            <Clock className="w-3.5 h-3.5" />
                                            EXPIRED {format(new Date(task.due_date), 'MMM d')}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {overdue_tasks.length > 0 && (
                            <Link to="/tasks?overdue=true" className="flex items-center justify-center w-full mt-6 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors border-t border-slate-50 pt-4">
                                See All Tasks
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
