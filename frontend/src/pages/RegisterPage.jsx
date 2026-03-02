import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckSquare, Eye, EyeOff, UserPlus } from 'lucide-react'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

const schema = z
    .object({
        first_name: z.string().min(1, 'First name is required'),
        last_name: z.string().min(1, 'Last name is required'),
        username: z.string().min(2, 'Username must be at least 2 characters'),
        email: z.string().email('Enter a valid email'),
        password: z.string().min(8, 'Password must be at least 8 characters'),
        confirm_password: z.string(),
    })
    .refine((d) => d.password === d.confirm_password, {
        message: 'Passwords do not match',
        path: ['confirm_password'],
    })

export default function RegisterPage() {
    const navigate = useNavigate()
    const setUser = useAuthStore((s) => s.setUser)
    const [showPw, setShowPw] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
        setError,
    } = useForm({ resolver: zodResolver(schema) })

    async function onSubmit(data) {
        setIsLoading(true)
        try {
            const response = await api.post('/auth/register/', data)
            setUser(response.data.user)
            toast.success('Account created! Welcome to TaskFlow 🎉')
            navigate('/')
        } catch (err) {
            const detail = err.response?.data?.detail
            if (typeof detail === 'object' && detail !== null) {
                Object.entries(detail).forEach(([field, msg]) => {
                    const message = Array.isArray(msg) ? msg[0] : String(msg)
                    setError(field, { message })
                })
            } else {
                setError('root', { message: String(detail) || 'Registration failed.' })
            }
        } finally {
            setIsLoading(false)
        }
    }

    const field = (name, label, type = 'text', placeholder = '') => (
        <div>
            <label className="label">{label}</label>
            <input
                type={type}
                className={`input ${errors[name] ? 'border-red-400' : ''}`}
                placeholder={placeholder}
                {...register(name)}
            />
            {errors[name] && <p className="mt-1 text-xs text-red-600">{errors[name].message}</p>}
        </div>
    )

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#EFF6FF] via-white to-[#F0FDF4] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] flex items-center justify-center shadow-lg mb-4">
                        <CheckSquare className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-[#111827]">Create your account</h1>
                    <p className="text-sm text-[#6B7280] mt-1">Start managing tasks with your team</p>
                </div>

                <div className="card p-8 shadow-lg">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                        {errors.root && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                {errors.root.message}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            {field('first_name', 'First name', 'text', 'Jane')}
                            {field('last_name', 'Last name', 'text', 'Doe')}
                        </div>

                        {field('username', 'Username', 'text', 'janedoe')}
                        {field('email', 'Email address', 'email', 'you@company.com')}

                        {/* Password with toggle */}
                        <div>
                            <label className="label">Password</label>
                            <div className="relative">
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    className={`input pr-10 ${errors.password ? 'border-red-400' : ''}`}
                                    placeholder="At least 8 characters"
                                    {...register('password')}
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]"
                                    onClick={() => setShowPw(!showPw)}
                                >
                                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
                        </div>

                        <div>
                            <label className="label">Confirm password</label>
                            <input
                                type="password"
                                className={`input ${errors.confirm_password ? 'border-red-400' : ''}`}
                                placeholder="Repeat your password"
                                {...register('confirm_password')}
                            />
                            {errors.confirm_password && (
                                <p className="mt-1 text-xs text-red-600">{errors.confirm_password.message}</p>
                            )}
                        </div>

                        <button type="submit" className="btn-primary w-full py-2.5 text-sm font-semibold mt-2" disabled={isLoading}>
                            {isLoading ? (
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <UserPlus className="w-4 h-4" />
                            )}
                            {isLoading ? 'Creating account…' : 'Create account'}
                        </button>
                    </form>
                </div>

                <p className="text-center text-sm text-[#6B7280] mt-6">
                    Already have an account?{' '}
                    <Link to="/login" className="text-[#2563EB] font-semibold hover:text-[#1D4ED8]">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    )
}
