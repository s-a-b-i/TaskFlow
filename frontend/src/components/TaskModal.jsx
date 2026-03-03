import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { X } from 'lucide-react'

export default function TaskModal({ task, teams, onClose }) {
    const queryClient = useQueryClient()
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
            if (err.fieldErrors) {
                Object.entries(err.fieldErrors).forEach(([field, msg]) => {
                    const message = Array.isArray(msg) ? msg[0] : String(msg)
                    setError(field, { message })
                })
            } else {
                toast.error(err.displayMessage)
            }
        }
    })

    return (
        <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-[2px] z-50 flex items-center justify-center p-6">
            <div className="card w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                            {isEditing ? 'Edit Task' : 'New Task'}
                        </h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                            Task details
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 text-slate-400 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit(mutation.mutate)} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-full">
                            <label className="label">Task Title</label>
                            <input className="input h-11 font-bold" placeholder="What needs to be done?" {...register('title', { required: 'Title is required' })} />
                            {errors.title && <p className="text-[10px] font-bold text-rose-500 mt-1.5 uppercase tracking-widest">{errors.title.message}</p>}
                        </div>

                        <div className="col-span-full">
                            <label className="label">Description</label>
                            <textarea className="input min-h-[100px] py-2.5 leading-relaxed" placeholder="Add some details..." {...register('description')} />
                        </div>

                        <div>
                            <label className="label">Team</label>
                            <select className="input h-11 font-bold" disabled={isEditing} {...register('team', { required: 'Workspace is required' })}>
                                <option value="">Select Team</option>
                                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>

                        <div className="col-span-full">
                            <label className="label">Assign To</label>
                            <div className="grid grid-cols-1 gap-2 mt-2 p-3 bg-slate-50 border border-slate-100 rounded-lg max-h-40 overflow-y-auto">
                                {members.length === 0 && <p className="text-[10px] text-slate-400 font-bold italic">No members in this team</p>}
                                {members.map(m => (
                                    <label key={m.user.id} className="flex items-center gap-3 cursor-pointer group hover:bg-white p-1 rounded transition-colors">
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
                                            className="w-3.5 h-3.5 rounded border-slate-300 text-primary focus:ring-primary/20"
                                        />
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-900 leading-none group-hover:text-primary transition-colors">
                                                {m.user.first_name ? `${m.user.first_name} ${m.user.last_name}` : m.user.username}
                                            </span>
                                            <span className="text-[9px] text-slate-400 font-medium">{m.user.email}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                            {errors.assigned_to_ids && <p className="text-[10px] font-bold text-rose-500 mt-1.5 uppercase tracking-widest">{errors.assigned_to_ids.message}</p>}
                        </div>

                        <div>
                            <label className="label">Task Status</label>
                            <select className="input h-11 font-bold uppercase tracking-widest text-[11px]" {...register('status')}>
                                <option value="todo">To Do</option>
                                <option value="in_progress">Doing</option>
                                <option value="done">Done</option>
                            </select>
                        </div>

                        <div>
                            <label className="label">Priority</label>
                            <select className="input h-11 font-bold uppercase tracking-widest text-[11px]" {...register('priority')}>
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>

                        <div className="col-span-full">
                            <label className="label">Due Date</label>
                            <input type="date" className="input h-11 font-bold" {...register('due_date')} />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-50">
                        <button type="button" onClick={onClose} className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">Cancel</button>
                        <button type="submit" className="btn-primary" disabled={mutation.isPending}>
                            {mutation.isPending ? 'Saving...' : 'Save Task'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
