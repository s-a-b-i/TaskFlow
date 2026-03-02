import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckSquare, Eye, EyeOff, LogIn } from 'lucide-react'
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
    const [showPassword, setShowPassword] = useState(false)
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
            setUser(response.data.user)
            toast.success('Welcome back!')
            navigate('/')
        } catch (err) {
            setError('root', { message: err.displayMessage })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#EFF6FF] via-white to-[#F0FDF4] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] flex items-center justify-center shadow-lg mb-4">
                        <CheckSquare className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-[#111827]">TaskFlow</h1>
                    <p className="text-sm text-[#6B7280] mt-1">Sign in to your workspace</p>
                </div>

                {/* Card */}
                <div className="card p-8 shadow-lg border border-[#E5E7EB]">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                        {/* Root error */}
                        {errors.root && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                {errors.root.message}
                            </div>
                        )}

                        {/* Email */}
                        <div>
                            <label className="label">Email address</label>
                            <input
                                type="email"
                                autoComplete="email"
                                className={`input ${errors.email ? 'border-red-400 focus:border-red-400 focus:ring-red-200' : ''}`}
                                placeholder="you@company.com"
                                {...register('email')}
                            />
                            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
                        </div>

                        {/* Password */}
                        <div>
                            <label className="label">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    className={`input pr-10 ${errors.password ? 'border-red-400' : ''}`}
                                    placeholder="Enter your password"
                                    {...register('password')}
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            className="btn-primary w-full py-2.5 text-sm font-semibold"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <LogIn className="w-4 h-4" />
                            )}
                            {isLoading ? 'Signing in…' : 'Sign in'}
                        </button>
                    </form>
                </div>

                <p className="text-center text-sm text-[#6B7280] mt-6">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-[#2563EB] font-semibold hover:text-[#1D4ED8] transition-colors">
                        Create one
                    </Link>
                </p>
            </div>
        </div>
    )
}
