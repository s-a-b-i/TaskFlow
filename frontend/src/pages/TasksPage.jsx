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
                        Workspace Tasks
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
            <div className="card p-4 flex flex-wrap items-center gap-3 bg-white">
                <Filter className="w-4 h-4 text-gray-400" />

                <input
                    type="text"
                    placeholder="Search..."
                    className="input w-auto max-w-[200px]"
                    value={filters.search}
                    onChange={(e) => updateFilter('search', e.target.value)}
                />

                <select className="input w-auto min-w-[140px]" value={filters.team} onChange={(e) => updateFilter('team', e.target.value)}>
                    <option value="">All Workspaces</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>

                <select className="input w-auto min-w-[140px]" value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
                    <option value="">All Statuses</option>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                </select>

                <select className="input w-auto min-w-[140px]" value={filters.priority} onChange={(e) => updateFilter('priority', e.target.value)}>
                    <option value="">All Priorities</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                </select>

                <button
                    onClick={() => updateFilter('my_tasks', filters.my_tasks ? '' : 'true')}
                    className={`btn-sm border rounded-full transition-colors ${filters.my_tasks ? 'bg-indigo-100 border-indigo-200 text-indigo-700' : 'bg-gray-50 border-gray-200 text-gray-700'}`}
                >
                    Assigned to me
                </button>

                <button
                    onClick={() => updateFilter('overdue', filters.overdue ? '' : 'true')}
                    className={`btn-sm border rounded-full transition-colors ${filters.overdue ? 'bg-red-100 border-red-200 text-red-700' : 'bg-gray-50 border-gray-200 text-gray-700'}`}
                >
                    Overdue Only
                </button>

                {queryParts.length > 0 && (
                    <button onClick={resetFilters} className="btn-ghost btn-sm ml-auto text-red-600 hover:bg-red-50">
                        <X className="w-3.5 h-3.5" /> Clear Filters
                    </button>
                )}
            </div>

            {/* Task List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {['todo', 'in_progress', 'done'].map(statusCol => {
                    const columnTasks = tasks.filter(t => t.status === statusCol)
                    return (
                        <div key={statusCol} className="flex flex-col gap-4">
                            <div className="flex items-center justify-between pb-2 border-b-2 border-gray-200">
                                <h3 className="font-bold text-gray-700 capitalize">
                                    {statusCol.replace('_', ' ')}
                                </h3>
                                <span className="badge bg-gray-200 text-gray-700">{columnTasks.length}</span>
                            </div>

                            {columnTasks.map(task => (
                                <div key={task.id} className={`card p-4 border-l-4 ${task.priority === 'high' ? 'border-l-red-500' : task.priority === 'medium' ? 'border-l-yellow-500' : 'border-l-green-500'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">{task.team_name}</span>
                                        <div className="flex gap-1 opacity-50 hover:opacity-100 transition-opacity">
                                            <button onClick={() => { setActiveTask(task); setIsModalOpen(true); }} className="p-1 hover:bg-blue-50 hover:text-blue-600 rounded">
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => {
                                                if (confirm('Delete this task?')) deleteTask.mutate(task.id)
                                            }} className="p-1 hover:bg-red-50 hover:text-red-600 rounded">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    <h4 className="font-bold text-gray-900 mb-1">{task.title}</h4>
                                    {task.description && <p className="text-sm text-gray-500 line-clamp-2 mb-4">{task.description}</p>}

                                    <div className="flex items-center gap-3 mt-auto pt-4 border-t border-gray-50 text-xs">
                                        {task.due_date && (
                                            <span className={`flex items-center gap-1 font-medium ${task.is_overdue ? 'text-red-600' : 'text-gray-500'}`}>
                                                <Calendar className="w-3.5 h-3.5" />
                                                {format(new Date(task.due_date), 'MMM d, yyyy')}
                                            </span>
                                        )}

                                        <div className="ml-auto w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold" title={task.assigned_to?.email || 'Unassigned'}>
                                            {task.assigned_to ? (task.assigned_to.first_name?.[0] || '?') : '-'}
                                        </div>
                                    </div>

                                    {/* Quick status actions via select */}
                                    <select
                                        className="input mt-3 text-xs py-1 h-auto cursor-pointer bg-gray-50 border-gray-100"
                                        value={task.status}
                                        onChange={(e) => updateStatus.mutate({ id: task.id, status: e.target.value })}
                                    >
                                        <option value="todo">To Do</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="done">Done</option>
                                    </select>
                                </div>
                            ))}
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
