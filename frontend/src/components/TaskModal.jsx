import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { X, ChevronDown, Users, Loader2 } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

export default function TaskModal({ task, teams, onClose }) {
    const queryClient = useQueryClient()
    const { user } = useAuthStore()
    const isEditing = !!task

    const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
        defaultValues: task ? {
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            team: task.team,
            assigned_to_ids: task.assigned_to?.map(u => u.id) || [],
            due_date: task.due_date || '',
        } : {
            title: '', description: '', status: 'todo', priority: 'medium',
            team: teams[0]?.id || '', assigned_to_ids: [], due_date: ''
        }
    })

    const selectedAssignees = watch('assigned_to_ids') || []
    const selectedTeamId = watch('team')

    // staleTime:0 & refetchOnMount:true ensures fresh member data
    // without requiring a page refresh after adding/removing members
    const { data: members = [], isLoading: membersLoading } = useQuery({
        queryKey: ['team-members', selectedTeamId],
        queryFn: async () => (await api.get(`/teams/${selectedTeamId}/members/`)).data,
        enabled: !!selectedTeamId,
        staleTime: 0,
        refetchOnMount: true,
    })

    // Filter out the current user (task creator) from assignment list
    const assignableMembers = members.filter(m => m.user.id !== user?.id)

    // Clear assignees when team changes (prevents assigning cross-team users — bug fix)
    const handleTeamChange = (e) => {
        setValue('team', e.target.value)
        setValue('assigned_to_ids', [])
    }

    const mutation = useMutation({
        mutationFn: (data) => {
            const payload = { ...data }
            if (!payload.due_date) payload.due_date = null
            return isEditing
                ? api.patch(`/tasks/${task.id}/`, payload)
                : api.post('/tasks/', payload)
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['tasks'] })
            toast.success(isEditing ? 'Task updated!' : 'Task created!')
            onClose()
        },
        onError: (err) => toast.error(err.displayMessage || 'Something went wrong')
    })

    return (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl shadow-slate-900/10 border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[95vh]">

                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                    <div>
                        <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                            {isEditing ? '✏️ Edit Task' : '➕ New Task'}
                        </h2>
                        <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                            {isEditing ? `Editing: ${task.title}` : 'Fill in the details below'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(mutation.mutate)} className="overflow-y-auto flex-1">
                    <div className="p-6 space-y-5">

                        {/* Title */}
                        <div>
                            <label className="label">Task Title <span className="text-rose-500">*</span></label>
                            <input
                                className={`input h-11 font-semibold ${errors.title ? 'border-rose-400 focus:ring-rose-200' : ''}`}
                                placeholder="What needs to be done?"
                                {...register('title', { required: 'Title is required' })}
                            />
                            {errors.title && <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.title.message}</p>}
                        </div>

                        {/* Description */}
                        <div>
                            <label className="label">Description <span className="text-slate-300 font-normal">(optional)</span></label>
                            <textarea
                                className="input py-3 leading-relaxed resize-none"
                                style={{ minHeight: '90px' }}
                                placeholder="Add details, steps, or context..."
                                {...register('description')}
                            />
                        </div>

                        {/* Row: Team + Due Date */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="label">Team / Workspace</label>
                                <div className="relative">
                                    <select
                                        className="input h-11 appearance-none pr-10"
                                        disabled={isEditing}
                                        {...register('team', { required: 'Team is required' })}
                                        onChange={handleTeamChange}
                                    >
                                        <option value="">Select a team</option>
                                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>

                            <div>
                                <label className="label">Due Date</label>
                                <input type="date" className="input h-11" {...register('due_date')} />
                            </div>
                        </div>

                        {/* Row: Status + Priority */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="label">Status</label>
                                <div className="relative">
                                    <select className="input h-11 appearance-none pr-10" {...register('status')}>
                                        <option value="todo">📋 To Do</option>
                                        <option value="in_progress">⚡ In Progress</option>
                                        <option value="done">✅ Done</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>

                            <div>
                                <label className="label">Priority</label>
                                <div className="relative">
                                    <select className="input h-11 appearance-none pr-10" {...register('priority')}>
                                        <option value="low">🟢 Low</option>
                                        <option value="medium">🟡 Medium</option>
                                        <option value="high">🔴 High</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {/* Assign To */}
                        {selectedTeamId && (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="label mb-0">Assign To</label>
                                    {selectedAssignees.length > 0 && (
                                        <span className="text-[10px] font-bold text-primary bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                            {selectedAssignees.length} selected
                                        </span>
                                    )}
                                </div>

                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                    {membersLoading ? (
                                        <div className="flex items-center justify-center gap-2 py-6 text-slate-400">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span className="text-xs font-medium">Loading members...</span>
                                        </div>
                                    ) : assignableMembers.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-6 text-center bg-slate-50">
                                            <Users className="w-6 h-6 text-slate-200 mx-auto mb-2" />
                                            <p className="text-xs text-slate-400 font-medium">No other members in this team</p>
                                            <p className="text-[10px] text-slate-300 mt-0.5">Add members from the Teams page first</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto">
                                            {assignableMembers.map(m => {
                                                const isSelected = selectedAssignees.includes(m.user.id)
                                                const name = m.user.first_name
                                                    ? `${m.user.first_name} ${m.user.last_name}`
                                                    : (m.user.username || m.user.email.split('@')[0])
                                                const initial = (m.user.first_name?.[0] || m.user.email[0] || '?').toUpperCase()
                                                return (
                                                    <label
                                                        key={m.user.id}
                                                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'bg-white hover:bg-slate-50'}`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setValue('assigned_to_ids', [...selectedAssignees, m.user.id])
                                                                } else {
                                                                    setValue('assigned_to_ids', selectedAssignees.filter(id => id !== m.user.id))
                                                                }
                                                            }}
                                                            className="w-4 h-4 rounded text-primary border-slate-300 cursor-pointer flex-shrink-0"
                                                        />
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isSelected ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}>
                                                            {initial}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-sm font-semibold truncate ${isSelected ? 'text-primary' : 'text-slate-800'}`}>{name}</p>
                                                            <p className="text-[10px] text-slate-400 truncate">{m.user.email}</p>
                                                        </div>
                                                        {isSelected && <span className="text-primary font-bold text-sm flex-shrink-0">✓</span>}
                                                    </label>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between flex-shrink-0">
                        <button type="button" onClick={onClose} className="text-sm font-semibold text-slate-400 hover:text-slate-600 transition-colors px-3 py-2">
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={mutation.isPending}>
                            {mutation.isPending ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                            ) : isEditing ? 'Update Task' : 'Create Task'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
