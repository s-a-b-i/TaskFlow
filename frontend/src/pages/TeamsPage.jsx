import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Users, UserPlus, Trash2, Edit2, Shield, User, X, Search, Check } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { useForm } from 'react-hook-form'

function TeamModal({ team, onClose }) {
    const queryClient = useQueryClient()
    const { register, handleSubmit, setError, formState: { errors } } = useForm({
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
        <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-[2px] z-50 flex items-center justify-center p-6">
            <div className="card w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">{team ? 'Edit Team' : 'Create Team'}</h2>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 text-slate-400 rounded-lg transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <form onSubmit={handleSubmit(mutation.mutate)} className="p-6 space-y-6">
                    <div>
                        <label className="label">Team Name</label>
                        <input className="input" placeholder="e.g. Design, Marketing..." {...register('name', { required: 'Name is required' })} />
                        {errors.name && <p className="text-[10px] font-bold text-rose-500 mt-1.5 uppercase tracking-widest">{errors.name.message}</p>}
                    </div>
                    <div>
                        <label className="label">Description</label>
                        <textarea className="input min-h-[100px] py-2.5" placeholder="What is this team for?..." {...register('description')} />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
                        <button type="button" onClick={onClose} className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">Cancel</button>
                        <button type="submit" className="btn-primary" disabled={mutation.isPending}>
                            {mutation.isPending ? 'Saving...' : 'Save Team'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

function MemberModal({ team, onClose }) {
    const queryClient = useQueryClient()
    const { handleSubmit, setValue, watch, formState: { errors } } = useForm()
    const [searchQuery, setSearchQuery] = useState('')
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const selectedEmail = watch('email')

    // Fetch users based on search
    const { data: users = [], isLoading: isUsersLoading } = useQuery({
        queryKey: ['user-search', searchQuery],
        queryFn: () => api.get(`/users/?search=${searchQuery}`).then(r => r.data),
        enabled: isDropdownOpen
    })

    const mutation = useMutation({
        mutationFn: (data) => api.post(`/teams/${team.id}/add_member/`, data),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['teams'] }),
                queryClient.invalidateQueries({ queryKey: ['team-members', team.id] }),
            ])
            toast.success('Member added')
            onClose()
        },
        onError: (err) => {
            toast.error(err.displayMessage || 'Failed to add member')
        }
    })

    return (
        <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-[2px] z-50 flex items-center justify-center p-6" onClick={onClose}>
            <div className="card w-full max-w-sm animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Add Member</h2>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 text-slate-400 rounded-lg transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-6">
                    <p className="text-xs text-slate-500 font-medium mb-6 leading-relaxed">
                        Search and select a person to add them to this team.
                    </p>
                    <form onSubmit={handleSubmit(mutation.mutate)} className="space-y-6">
                        <div className="relative">
                            <label className="label">Select Member</label>

                            {/* Search Input / Trigger */}
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Search className="h-3.5 w-3.5 text-slate-400 group-focus-within:text-primary transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    className="input pl-10 h-11"
                                    placeholder="Search by name or email..."
                                    value={isDropdownOpen ? searchQuery : (selectedEmail || '')}
                                    onFocus={() => setIsDropdownOpen(true)}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    autoComplete="off"
                                />
                            </div>

                            {/* Dropdown Menu */}
                            {isDropdownOpen && (
                                <div className="absolute z-[100] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-200/50 max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                                    {isUsersLoading ? (
                                        <div className="p-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading...</div>
                                    ) : users.length === 0 ? (
                                        <div className="p-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">No users found</div>
                                    ) : (
                                        users.map((user) => (
                                            <button
                                                key={user.id}
                                                type="button"
                                                className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between group transition-colors border-b last:border-0 border-slate-50"
                                                onClick={() => {
                                                    setValue('email', user.email)
                                                    setSearchQuery('')
                                                    setIsDropdownOpen(false)
                                                }}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 uppercase">
                                                        {user.first_name?.[0] || user.username[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-900">{user.first_name} {user.last_name} (@{user.username})</p>
                                                        <p className="text-[10px] text-slate-500 font-medium">{user.email}</p>
                                                    </div>
                                                </div>
                                                {selectedEmail === user.email && <Check className="w-4 h-4 text-primary" />}
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
                            <button type="button" onClick={onClose} className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2 transition-colors hover:text-slate-600">Cancel</button>
                            <button type="submit" className="btn-primary min-w-[100px]" disabled={mutation.isPending || !selectedEmail}>
                                {mutation.isPending ? 'Adding...' : 'Add Member'}
                            </button>
                        </div>
                    </form>
                </div>
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
            toast.success('Team deleted')
        },
        onError: (err) => toast.error(err.displayMessage)
    })

    const removeMember = useMutation({
        mutationFn: ({ teamId, userId, force = false }) =>
            api.post(`/teams/${teamId}/remove_member/`, { user_id: userId, force }),
        onSuccess: async (res, variables) => {
            if (res.data.warning === 'user_has_tasks') {
                if (confirm(`${res.data.detail} This will unassign the member from these tasks. Proceed?`)) {
                    removeMember.mutate({ ...variables, force: true })
                }
            } else {
                await Promise.all([
                    queryClient.invalidateQueries({ queryKey: ['teams'] }),
                    queryClient.invalidateQueries({ queryKey: ['team-members', variables.teamId] }),
                ])
                toast.success('Member removed')
            }
        },
        onError: (err) => toast.error(err.displayMessage)
    })

    if (isLoading) return <div className="p-8 animate-pulse bg-slate-50 h-screen rounded-xl" />

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        Workspaces
                    </h1>
                    <p className="text-slate-500 text-sm font-medium mt-1">Manage your teams and members</p>
                </div>
                <button
                    onClick={() => { setActiveTeam(null); setModalType('team'); }}
                    className="btn-primary"
                >
                    Create New Team
                </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {teams.length === 0 ? (
                    <div className="col-span-full py-20 text-center card border-dashed border-slate-300">
                        <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">No Teams Yet</h3>
                        <button
                            onClick={() => { setActiveTeam(null); setModalType('team'); }}
                            className="btn-secondary mx-auto mt-6"
                        >
                            Create Team
                        </button>
                    </div>
                ) : (
                    teams.map(team => {
                        const isOwner = team.user_role === 'owner'

                        return (
                            <div key={team.id} className="card overflow-hidden flex flex-col group hover:border-blue-300 transition-colors">
                                {/* Header */}
                                <div className="p-6 border-b border-slate-50 flex justify-between items-start bg-slate-50/30">
                                    <div className="flex-1 pr-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-slate-900">{team.name}</h3>
                                            {isOwner && <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 uppercase tracking-widest">Owner</span>}
                                        </div>
                                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed h-8">{team.description || 'No description provided.'}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-4">Created: {format(new Date(team.created_at), 'MMM yyyy')}</p>
                                    </div>
                                    {isOwner && (
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => { setActiveTeam(team); setModalType('team'); }} className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-colors">
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm(`Delete team "${team.name}"?`)) {
                                                        deleteTeam.mutate(team.id)
                                                    }
                                                }}
                                                className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Members list */}
                                <div className="p-6 flex-1">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Team Members ({team.member_count})</h4>
                                        {isOwner && (
                                            <button onClick={() => { setActiveTeam(team); setModalType('member'); }} className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest p-1">
                                                Add Member
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {team.members.map(member => (
                                            <div key={member.id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-50 bg-slate-50/30 group/member hover:bg-white hover:border-slate-200 transition-all">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 bg-white border border-slate-200 text-blue-600 rounded-lg flex items-center justify-center text-[10px] font-black shadow-sm">
                                                        {member.user.first_name?.[0]?.toUpperCase() || member.user.username?.[0]?.toUpperCase() || '?'}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[11px] font-bold text-slate-900 truncate">
                                                            {member.user.email}
                                                        </p>
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            {member.role === 'owner' ? <Shield className="w-2.5 h-2.5 text-blue-400" /> : <User className="w-2.5 h-2.5 text-slate-300" />}
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{member.role}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {isOwner && member.user.id !== user?.id && (
                                                    <button
                                                        onClick={() => {
                                                            removeMember.mutate({ teamId: team.id, userId: member.user.id })
                                                        }}
                                                        className="text-slate-300 hover:text-rose-500 p-1"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
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
