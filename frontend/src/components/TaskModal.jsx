import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { X, ChevronDown } from 'lucide-react'
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
            title: '', description: '', status: 'todo', priority: 'medium', team: teams[0]?.id || '', assigned_to_ids: [], due_date: ''
        }
    })

    const selectedAssignees = watch('assigned_to_ids') || []

    // Watch selected team to fetch its members for the assignee list
    const selectedTeamId = watch('team')
    const { data: members = [] } = useQuery({
        queryKey: ['team-members', selectedTeamId],
        queryFn: async () => (await api.get(`/teams/${selectedTeamId}/members/`)).data,
        enabled: !!selectedTeamId
    })

    // Filter out the task creator/current user from the assignment list
    const assignableMembers = members.filter(m => m.user.id !== user?.id)

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
            toast.success(isEditing ? 'Task updated' : 'Task created')
            onClose()
        },
        onError: (err) => {
            toast.error(err.displayMessage)
        }
    })

    return (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6">
            <div className="card w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h2 className="text-base font-black text-slate-900 uppercase tracking-widest">
                            {isEditing ? 'Update Task' : 'Draft New Task'}
                        </h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                            Refine workspace objective
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200/50 text-slate-400 rounded-xl transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit(mutation.mutate)} className="p-8 space-y-8 max-h-[85vh] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                        {/* Status & Priority Row */}
                        <div className="space-y-2">
                            <label className="label">Task Status</label>
                            <div className="relative">
                                <select className="input h-12 font-bold uppercase tracking-widest text-[11px] appearance-none pr-10" {...register('status')}>
                                    <option value="todo">To Do</option>
                                    <option value="in_progress">Active Progress</option>
                                    <option value="done">Completed</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="label">Complexity / Priority</label>
                            <div className="relative">
                                <select className="input h-12 font-bold uppercase tracking-widest text-[11px] appearance-none pr-10" {...register('priority')}>
                                    <option value="low">Low Impact</option>
                                    <option value="medium">Standard Priority</option>
                                    <option value="high">Critical / High</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Title - Full Width */}
                        <div className="col-span-full space-y-2">
                            <label className="label">Task Title</label>
                            <input className="input h-12 font-bold text-lg placeholder:text-slate-300" placeholder="What is the objective?" {...register('title', { required: 'Title is required' })} />
                            {errors.title && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-widest">{errors.title.message}</p>}
                        </div>

                        {/* Description - Full Width */}
                        <div className="col-span-full space-y-2">
                            <label className="label">Detailed Requirement</label>
                            <textarea className="input min-h-[120px] py-4 leading-relaxed placeholder:text-slate-300" placeholder="Break down the steps or provide context..." {...register('description')} />
                        </div>

                        {/* Team & Date Row */}
                        <div className="space-y-2">
                            <label className="label">Workspace / Team</label>
                            <div className="relative">
                                <select className="input h-12 font-bold appearance-none pr-10" disabled={isEditing} {...register('team', { required: 'Workspace is required' })}>
                                    <option value="">Choose Workspace</option>
                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="label">Target Date</label>
                            <input type="date" className="input h-12 font-bold" {...register('due_date')} />
                        </div>

                        {/* Assign To - Full Width with Custom Multi-Selection dropdown UI */}
                        <div className="col-span-full space-y-4 pt-4 border-t border-slate-50">
                            <div className="flex items-center justify-between">
                                <label className="label">Strategic Assignments</label>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    {selectedAssignees.length} members selected
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto p-4 bg-slate-50/50 rounded-2xl border border-slate-100 shadow-inner">
                                {assignableMembers.length === 0 && (
                                    <p className="text-[10px] text-slate-400 font-bold italic col-span-full py-4 text-center">
                                        No other members available for assignment (Creator excluded)
                                    </p>
                                )}
                                {assignableMembers.map(m => (
                                    <label key={m.user.id} className={`flex items-center gap-3 cursor-pointer group p-3 rounded-xl transition-all border ${selectedAssignees.includes(m.user.id) ? 'bg-white border-primary/20 shadow-sm' : 'bg-transparent border-transparent hover:bg-white/50'}`}>
                                        <div className="relative flex items-center">
                                            <input
                                                type="checkbox"
                                                value={m.user.id}
                                                checked={selectedAssignees.includes(m.user.id)}
                                                onChange={(e) => {
                                                    const userId = m.user.id
                                                    if (e.target.checked) {
                                                        setValue('assigned_to_ids', [...selectedAssignees, userId])
                                                    } else {
                                                        setValue('assigned_to_ids', selectedAssignees.filter(id => id !== userId))
                                                    }
                                                }}
                                                className="w-4 h-4 rounded-md border-slate-300 text-primary focus:ring-primary/20 transition-all cursor-pointer"
                                            />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className={`text-xs font-bold leading-none truncate ${selectedAssignees.includes(m.user.id) ? 'text-primary' : 'text-slate-700'}`}>
                                                {m.user.first_name ? `${m.user.first_name} ${m.user.last_name}` : (m.user.username || m.user.email.split('@')[0])}
                                            </span>
                                            <span className="text-[9px] text-slate-400 font-medium truncate mt-0.5">{m.user.email}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                            {errors.assigned_to_ids && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-widest">{errors.assigned_to_ids.message}</p>}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-8 border-t border-slate-50">
                        <button type="button" onClick={onClose} className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-6 py-3 hover:text-slate-600 transition-colors">Discard</button>
                        <button type="submit" className="btn-primary" disabled={mutation.isPending}>
                            {mutation.isPending ? 'Propagating Changes...' : (isEditing ? 'Push Updates' : 'Launch Task')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
