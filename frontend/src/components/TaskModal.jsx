import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import api from '../lib/api'

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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="card w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-6">{isEditing ? 'Edit Task' : 'Create Task'}</h2>

                <form onSubmit={handleSubmit(mutation.mutate)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-full">
                            <label className="label">Title</label>
                            <input className="input" placeholder="Task title" {...register('title', { required: 'Title is required' })} />
                            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
                        </div>

                        <div className="col-span-full">
                            <label className="label">Description</label>
                            <textarea className="input min-h-[100px]" placeholder="Add details..." {...register('description')} />
                        </div>

                        <div>
                            <label className="label">Workspace</label>
                            <select className="input" disabled={isEditing} {...register('team', { required: 'Workspace is required' })}>
                                <option value="">Select Workspace</option>
                                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="label">Assign To</label>
                            <select className="input" {...register('assigned_to_id')}>
                                <option value="">Unassigned</option>
                                {members.map(m => (
                                    <option key={m.user.id} value={m.user.id}>{m.user.email}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="label">Status</label>
                            <select className="input" {...register('status')}>
                                <option value="todo">To Do</option>
                                <option value="in_progress">In Progress</option>
                                <option value="done">Done</option>
                            </select>
                        </div>

                        <div>
                            <label className="label">Priority</label>
                            <select className="input" {...register('priority')}>
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>

                        <div>
                            <label className="label">Due Date</label>
                            <input type="date" className="input" {...register('due_date')} />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 mt-6">
                        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                        <button type="submit" className="btn-primary" disabled={mutation.isPending}>
                            {mutation.isPending ? 'Saving...' : 'Save Task'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
