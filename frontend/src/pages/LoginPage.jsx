import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckSquare, Mail, Lock, ArrowRight } from 'lucide-react'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

const schema = z.object({
    email: z.string().email('Enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
})

export default function LoginPage() {
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
            const response = await api.post('/auth/login/', data)
            const { csrf_token, user } = response.data
            if (csrf_token) {
                const { setManualCsrfToken } = await import('../lib/api')
                setManualCsrfToken(csrf_token)
            }
            setUser(user)
            toast.success('Welcome back!')
            navigate('/')
        } catch (err) {
            setError('root', { message: err.displayMessage })
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
                    Welcome Back
                </h2>
                <p className="mt-2 text-center text-sm font-bold text-slate-400 uppercase tracking-widest">
                    Login to TaskFlow
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
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="btn-primary w-full h-11 text-xs uppercase tracking-[0.2em] font-black"
                            >
                                {isLoading ? 'Logging in...' : 'Login Now'}
                                {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 pt-8 border-t border-slate-50 text-center">
                        <p className="text-sm font-medium text-slate-500">
                            Need an account?{' '}
                            <Link to="/register" className="font-bold text-primary hover:text-primary-hover transition-colors">
                                Create one here
                            </Link>
                        </p>
                    </div>
                </div>

                <p className="mt-8 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    &copy; {new Date().getFullYear()} TaskFlow Manager
                </p>
            </div>
        </div>
    )
}
