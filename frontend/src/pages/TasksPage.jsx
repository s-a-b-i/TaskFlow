import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, CheckSquare, Calendar, Trash2, Edit2, Filter, X } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import TaskModal from '../components/TaskModal'
import { useSearchParams } from 'react-router-dom'

export default function TasksPage() {
    const { user } = useAuthStore()
    const [searchParams, setSearchParams] = useSearchParams()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [activeTask, setActiveTask] = useState(null)
    const queryClient = useQueryClient()

    // Read filters from URL
    const filters = {
        team: searchParams.get('team') || '',
        status: searchParams.get('status') || '',
        priority: searchParams.get('priority') || '',
        search: searchParams.get('search') || '',
        my_tasks: searchParams.get('my_tasks') || '',
        overdue: searchParams.get('overdue') || '',
    }

    const { data: teams = [] } = useQuery({
        queryKey: ['teams'],
        queryFn: async () => (await api.get('/teams/')).data
    })

    // Build query string 
    const queryParts = Object.entries(filters)
        .filter(([_, v]) => v)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    const queryString = queryParts.length ? `?${queryParts.join('&')}` : ''

    const { data: tasks = [], isLoading } = useQuery({
        queryKey: ['tasks', queryString],
        queryFn: async () => (await api.get(`/tasks/${queryString}`)).data
    })

    const updateStatus = useMutation({
        mutationFn: ({ id, status }) => api.patch(`/tasks/${id}/`, { status }),
        onSuccess: async () => await queryClient.invalidateQueries({ queryKey: ['tasks'] }),
        onError: (err) => toast.error(err.displayMessage)
    })

    const deleteTask = useMutation({
        mutationFn: (id) => api.delete(`/tasks/${id}/`),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['tasks'] })
            toast.success('Task deleted')
        },
        onError: (err) => toast.error(err.displayMessage)
    })

    const updateFilter = (k, v) => {
        const newParams = new URLSearchParams(searchParams)
        if (v) newParams.set(k, v)
        else newParams.delete(k)
        setSearchParams(newParams)
    }

    const resetFilters = () => setSearchParams(new URLSearchParams())

    if (isLoading) return <div className="p-8 animate-pulse bg-gray-200 h-screen rounded -ml-6 -mt-6" />

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <CheckSquare className="w-6 h-6 text-green-600" />
                        All Tasks
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Manage and track your team's work</p>
                </div>
                <button
                    onClick={() => { setActiveTask(null); setIsModalOpen(true); }}
                    className="btn-primary"
                >
                    <Plus className="w-4 h-4" /> New Task
                </button>
            </div>

            {/* Filter Bar */}
            <div className="card p-4 flex flex-wrap items-center gap-3 bg-white border-slate-200">
                <div className="flex items-center gap-2 mr-2">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Filters</span>
                </div>

                <div className="flex-1 flex flex-wrap items-center gap-3">
                    <input
                        type="text"
                        placeholder="Search tasks..."
                        className="input w-64"
                        value={filters.search}
                        onChange={(e) => updateFilter('search', e.target.value)}
                    />

                    <select className="input w-44" value={filters.team} onChange={(e) => updateFilter('team', e.target.value)}>
                        <option value="">All Teams</option>
                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>

                    <select className="input w-40" value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
                        <option value="">All Statuses</option>
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="done">Done</option>
                    </select>

                    <select className="input w-40" value={filters.priority} onChange={(e) => updateFilter('priority', e.target.value)}>
                        <option value="">All Priorities</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                    </select>

                    <div className="h-6 w-px bg-slate-200 mx-1" />

                    <button
                        onClick={() => updateFilter('my_tasks', filters.my_tasks ? '' : 'true')}
                        className={`h-10 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${filters.my_tasks ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                    >
                        My Tasks
                    </button>

                    <button
                        onClick={() => updateFilter('overdue', filters.overdue ? '' : 'true')}
                        className={`h-10 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${filters.overdue ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                    >
                        Overdue
                    </button>
                </div>

                {queryParts.length > 0 && (
                    <button onClick={resetFilters} className="text-xs font-bold text-slate-400 hover:text-rose-600 transition-colors uppercase tracking-widest px-2">
                        Reset
                    </button>
                )}
            </div>

            {/* Task Board */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {['todo', 'in_progress', 'done'].map(statusCol => {
                    const columnTasks = tasks.filter(t => t.status === statusCol)
                    return (
                        <div key={statusCol} className="flex flex-col gap-5">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">
                                        {statusCol.replace('_', ' ')}
                                    </h3>
                                    <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                                        {columnTasks.length}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-4 min-h-[200px]">
                                {columnTasks.map(task => (
                                    <div key={task.id} className="card p-5 group hover:border-blue-300 transition-colors">
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">{task.team_name}</span>
                                            {user?.id === task.created_by?.id && (
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => { setActiveTask(task); setIsModalOpen(true); }} className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-colors">
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button onClick={() => {
                                                        if (confirm('Delete this task?')) deleteTask.mutate(task.id)
                                                    }} className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <h4 className="text-sm font-bold text-slate-900 mb-1 leading-snug">{task.title}</h4>
                                        {task.description && <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">{task.description}</p>}

                                        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-50">
                                            <span className={`badge badge-${task.priority}`}>
                                                {task.priority}
                                            </span>

                                            {task.due_date && (
                                                <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-tighter ${task.is_overdue ? 'text-rose-600' : 'text-slate-400'}`}>
                                                    <Calendar className="w-3 h-3" />
                                                    {format(new Date(task.due_date), 'MMM d')}
                                                </span>
                                            )}

                                            <div className="ml-auto w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold" title={task.assigned_to?.email || 'Unassigned'}>
                                                {task.assigned_to ? (task.assigned_to.first_name?.[0] || '?') : '?'}
                                            </div>
                                        </div>

                                        <select
                                            className="w-full mt-4 h-8 px-2 text-[10px] font-black uppercase tracking-widest bg-slate-50 border border-slate-100 rounded-md text-slate-500 outline-none focus:border-blue-200 transition-colors"
                                            value={task.status}
                                            onChange={(e) => updateStatus.mutate({ id: task.id, status: e.target.value })}
                                        >
                                            <option value="todo">To Do</option>
                                            <option value="in_progress">Doing</option>
                                            <option value="done">Completed</option>
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>

            {isModalOpen && (
                <TaskModal
                    task={activeTask}
                    teams={teams}
                    onClose={() => { setIsModalOpen(false); setActiveTask(null); }}
                />
            )}
        </div>
    )
}
