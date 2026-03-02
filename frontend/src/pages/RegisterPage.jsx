import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckSquare, Mail, Lock, ArrowRight } from 'lucide-react'
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
            const { csrf_token, user } = response.data
            if (csrf_token) {
                const { setManualCsrfToken } = await import('../lib/api')
                setManualCsrfToken(csrf_token)
            }
            setUser(user)
            toast.success('Account created! Welcome to TaskFlow 🎉')
            navigate('/')
        } catch (err) {
            if (err.fieldErrors) {
                Object.entries(err.fieldErrors).forEach(([field, msg]) => {
                    const message = Array.isArray(msg) ? msg[0] : String(msg)
                    setError(field, { message })
                })
            } else {
                setError('root', { message: err.displayMessage })
            }
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center mb-6">
                    <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                        <CheckSquare className="w-7 h-7 text-white" />
                    </div>
                </div>
                <h2 className="text-center text-3xl font-black text-slate-900 tracking-tight">
                    Create Account
                </h2>
                <p className="mt-2 text-center text-sm font-bold text-slate-400 uppercase tracking-widest">
                    Join TaskFlow Today
                </p>
            </div>

            <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="card p-8 bg-white border-slate-200">
                    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                        {errors.root && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                {errors.root.message}
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label">First Name</label>
                                <input
                                    type="text"
                                    className={`input ${errors.first_name ? 'border-red-400' : ''}`}
                                    placeholder="John"
                                    {...register('first_name')}
                                />
                                {errors.first_name && <p className="text-[10px] font-bold text-rose-500 mt-2 uppercase tracking-widest">{errors.first_name.message}</p>}
                            </div>
                            <div>
                                <label className="label">Last Name</label>
                                <input
                                    type="text"
                                    className={`input ${errors.last_name ? 'border-red-400' : ''}`}
                                    placeholder="Doe"
                                    {...register('last_name')}
                                />
                                {errors.last_name && <p className="text-[10px] font-bold text-rose-500 mt-2 uppercase tracking-widest">{errors.last_name.message}</p>}
                            </div>
                        </div>

                        <div>
                            <label className="label">Username</label>
                            <input
                                type="text"
                                className={`input ${errors.username ? 'border-red-400' : ''}`}
                                placeholder="janedoe"
                                {...register('username')}
                            />
                            {errors.username && <p className="text-[10px] font-bold text-rose-500 mt-2 uppercase tracking-widest">{errors.username.message}</p>}
                        </div>

                        <div>
                            <label className="label">Email Address</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-4 w-4 text-slate-400" />
                                </div>
                                <input
                                    type="email"
                                    className={`input pl-10 ${errors.email ? 'border-red-400' : ''}`}
                                    placeholder="your@email.com"
                                    {...register('email')}
                                />
                            </div>
                            {errors.email && <p className="text-[10px] font-bold text-rose-500 mt-2 uppercase tracking-widest">{errors.email.message}</p>}
                        </div>

                        <div>
                            <label className="label">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-4 w-4 text-slate-400" />
                                </div>
                                <input
                                    type="password"
                                    className={`input pl-10 ${errors.password ? 'border-red-400' : ''}`}
                                    placeholder="••••••••"
                                    {...register('password')}
                                />
                            </div>
                            {errors.password && <p className="text-[10px] font-bold text-rose-500 mt-2 uppercase tracking-widest">{errors.password.message}</p>}
                        </div>

                        <div>
                            <label className="label">Confirm Password</label>
                            <input
                                type="password"
                                className={`input ${errors.confirm_password ? 'border-red-400' : ''}`}
                                placeholder="••••••••"
                                {...register('confirm_password')}
                            />
                            {errors.confirm_password && (
                                <p className="text-[10px] font-bold text-rose-500 mt-2 uppercase tracking-widest">{errors.confirm_password.message}</p>
                            )}
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="btn-primary w-full h-11 text-xs uppercase tracking-[0.2em] font-black"
                            >
                                {isLoading ? 'Creating account...' : 'Create Account'}
                                {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 pt-8 border-t border-slate-50 text-center">
                        <p className="text-sm font-medium text-slate-500">
                            Already have an account?{' '}
                            <Link to="/login" className="font-bold text-primary hover:text-primary-hover transition-colors">
                                Login here
                            </Link>
                        </p>
                    </div>
                </div>

                <p className="mt-8 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    TaskFlow Manager
                </p>
            </div>
        </div>
    )
}
