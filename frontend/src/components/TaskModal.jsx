import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { X } from 'lucide-react'

export default function TaskModal({ task, teams, onClose }) {
    const queryClient = useQueryClient()
    const isEditing = !!task

    const { register, handleSubmit, watch, formState: { errors } } = useForm({
        defaultValues: task ? {
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            team: task.team,
            assigned_to_id: task.assigned_to?.id || '',
            due_date: task.due_date || '',
        } : {
            title: '', description: '', status: 'todo', priority: 'medium', team: teams[0]?.id || '', assigned_to_id: '', due_date: ''
        }
    })

    // Watch selected team to fetch its members for the assignee dropdown
    const selectedTeamId = watch('team')
    const { data: members = [] } = useQuery({
        queryKey: ['team-members', selectedTeamId],
        queryFn: async () => (await api.get(`/teams/${selectedTeamId}/members/`)).data,
        enabled: !!selectedTeamId
    })

    const mutation = useMutation({
        mutationFn: (data) => {
            // Clean up empty strings for null-able fields
            const payload = { ...data }
            if (!payload.assigned_to_id) payload.assigned_to_id = null
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

                        <div>
                            <label className="label">Assigned To</label>
                            <select className="input h-11 font-bold" {...register('assigned_to_id')}>
                                <option value="">Select member</option>
                                {members.map(m => (
                                    <option key={m.user.id} value={m.user.id}>{m.user.email}</option>
                                ))}
                            </select>
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
