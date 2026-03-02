import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Users, UserPlus, Trash2, Edit2, Shield, User } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { useForm } from 'react-hook-form'

function TeamModal({ team, onClose }) {
    const queryClient = useQueryClient()
    const { register, handleSubmit, formState: { errors } } = useForm({
        defaultValues: team || { name: '', description: '' }
    })

    const mutation = useMutation({
        mutationFn: (data) => team ? api.patch(`/teams/${team.id}/`, data) : api.post('/teams/', data),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['teams'] })
            toast.success(team ? 'Team updated' : 'Team created')
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
            <div className="card w-full max-w-md p-6">
                <h2 className="text-xl font-bold mb-4">{team ? 'Edit Workspace' : 'Create Workspace'}</h2>
                <form onSubmit={handleSubmit(mutation.mutate)} className="space-y-4">
                    <div>
                        <label className="label">Workspace Name</label>
                        <input className="input" {...register('name', { required: 'Name is required' })} />
                        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                    </div>
                    <div>
                        <label className="label">Description (Optional)</label>
                        <textarea className="input min-h-[100px]" {...register('description')} />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                        <button type="submit" className="btn-primary" disabled={mutation.isPending}>
                            {mutation.isPending ? 'Saving...' : 'Save Workspace'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

function MemberModal({ team, onClose }) {
    const queryClient = useQueryClient()
    const { register, handleSubmit, formState: { errors } } = useForm()

    const mutation = useMutation({
        mutationFn: (data) => api.post(`/teams/${team.id}/add_member/`, data),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['teams'] })
            toast.success('Member added')
            onClose()
        },
        onError: (err) => {
            if (err.fieldErrors?.email) {
                setError('email', { message: err.fieldErrors.email[0] })
            } else {
                toast.error(err.displayMessage)
            }
        }
    })

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="card w-full max-w-md p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <UserPlus className="w-5 h-5" />
                    Invite Member
                </h2>
                <p className="text-sm text-gray-500 mb-4">Invite an existing user to <strong>{team.name}</strong> by email.</p>
                <form onSubmit={handleSubmit(mutation.mutate)} className="space-y-4">
                    <div>
                        <label className="label">Email Address</label>
                        <input type="email" className="input" placeholder="user@example.com" {...register('email', { required: 'Email required' })} />
                        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                        <button type="submit" className="btn-primary" disabled={mutation.isPending}>
                            {mutation.isPending ? 'Inviting...' : 'Send Invite'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default function TeamsPage() {
    const { user } = useAuthStore()
    const [modalType, setModalType] = useState(null) // 'team', 'member', null
    const [activeTeam, setActiveTeam] = useState(null)
    const queryClient = useQueryClient()

    const { data: teams = [], isLoading } = useQuery({
        queryKey: ['teams'],
        queryFn: async () => {
            const res = await api.get('/teams/')
            return res.data
        }
    })

    const deleteTeam = useMutation({
        mutationFn: (id) => api.delete(`/teams/${id}/`),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['teams'] })
            toast.success('Workspace deleted')
        },
        onError: (err) => toast.error(err.displayMessage)
    })

    const removeMember = useMutation({
        mutationFn: ({ teamId, userId }) => api.post(`/teams/${teamId}/remove_member/`, { user_id: userId }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['teams'] })
            toast.success('Member removed')
        },
        onError: (err) => toast.error(err.displayMessage)
    })

    if (isLoading) return <div className="p-8 animate-pulse bg-gray-200 h-screen rounded -ml-6 -mt-6" />

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Users className="w-6 h-6 text-blue-600" />
                        My Workspaces
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Manage your teams and collaborations</p>
                </div>
                <button
                    onClick={() => { setActiveTeam(null); setModalType('team'); }}
                    className="btn-primary"
                >
                    <Plus className="w-4 h-4" /> New Workspace
                </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {teams.length === 0 ? (
                    <div className="col-span-full py-12 text-center bg-white rounded-xl border border-gray-200 border-dashed">
                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-gray-900">No workspaces yet</h3>
                        <p className="text-gray-500 text-sm mb-4">Create a workspace to start collaborating.</p>
                        <button
                            onClick={() => { setActiveTeam(null); setModalType('team'); }}
                            className="btn-primary mx-auto"
                        >
                            Create Workspace
                        </button>
                    </div>
                ) : (
                    teams.map(team => {
                        const isOwner = team.user_role === 'owner'

                        return (
                            <div key={team.id} className="card overflow-hidden flex flex-col">
                                {/* Header */}
                                <div className="p-5 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-lg">{team.name}</h3>
                                            {isOwner && <span className="badge bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5">Owner</span>}
                                        </div>
                                        <p className="text-sm text-gray-500 line-clamp-2 min-h-5">{team.description || 'No description'}</p>
                                        <p className="text-xs text-gray-400 mt-2">Created {format(new Date(team.created_at), 'MMM d, yyyy')}</p>
                                    </div>
                                    {isOwner && (
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => { setActiveTeam(team); setModalType('team'); }} className="btn-ghost btn-sm text-blue-600 hover:bg-blue-50">
                                                <Edit2 className="w-3.5 h-3.5" /> Edit
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm(`Delete workspace "${team.name}" and all its tasks?`)) {
                                                        deleteTeam.mutate(team.id)
                                                    }
                                                }}
                                                className="btn-ghost btn-sm text-red-600 hover:bg-red-50"
                                                title="Delete workspace"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Members list */}
                                <div className="p-5 flex-1 bg-white">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-xs font-bold text-gray-500 uppercase">Members ({team.member_count})</h4>
                                        {isOwner && (
                                            <button onClick={() => { setActiveTeam(team); setModalType('member'); }} className="btn-ghost btn-sm text-blue-600 py-1">
                                                <UserPlus className="w-3.5 h-3.5" /> Invite
                                            </button>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        {team.members.map(member => (
                                            <div key={member.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
                                                        {member.user.first_name?.[0] || member.user.username?.[0] || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium flex items-center gap-1.5">
                                                            {member.user.email} {user?.id === member.user.id && <span className="text-[10px] text-gray-400 font-normal">(You)</span>}
                                                        </p>
                                                        <span className="text-xs text-gray-500 capitalize flex items-center gap-1">
                                                            {member.role === 'owner' ? <Shield className="w-3 h-3 text-amber-500" /> : <User className="w-3 h-3 text-gray-400" />}
                                                            {member.role}
                                                        </span>
                                                    </div>
                                                </div>
                                                {isOwner && member.user.id !== user?.id && (
                                                    <button
                                                        onClick={() => {
                                                            if (confirm(`Remove ${member.user.email} from ${team.name}?`)) {
                                                                removeMember.mutate({ teamId: team.id, userId: member.user.id })
                                                            }
                                                        }}
                                                        className="text-gray-400 hover:text-red-600 p-1"
                                                        title="Remove member"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {modalType === 'team' && <TeamModal team={activeTeam} onClose={() => { setModalType(null); setActiveTeam(null); }} />}
            {modalType === 'member' && <MemberModal team={activeTeam} onClose={() => { setModalType(null); setActiveTeam(null); }} />}
        </div>
    )
}
