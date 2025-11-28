"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, Mail, Lock, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/useAuthStore";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login, isLoading } = useAuthStore();
    const [showPassword, setShowPassword] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);

    // Backend URL for OAuth
    const getBackendUrl = () => {
        if (typeof window === 'undefined') return 'http://localhost:5000';

        // Use dedicated backend URL if available (recommended)
        if (process.env.NEXT_PUBLIC_BACKEND_URL) {
            console.log('🔍 Using NEXT_PUBLIC_BACKEND_URL:', process.env.NEXT_PUBLIC_BACKEND_URL);
            return process.env.NEXT_PUBLIC_BACKEND_URL;
        }

        // Fallback: try to construct from API URL
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        console.log('🔍 NEXT_PUBLIC_API_URL:', apiUrl);

        if (!apiUrl) {
            console.warn('⚠️ No backend URL configured, using localhost');
            return 'http://localhost:5000';
        }

        // Remove /api suffix if present, otherwise use as-is
        const backendUrl = apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl;
        console.log('🔍 Backend URL for OAuth:', backendUrl);
        return backendUrl;
    };

    const backendUrl = getBackendUrl();

    // Check for error in URL params
    useEffect(() => {
        const error = searchParams.get('error');
        if (error) {
            const errorMessages: Record<string, string> = {
                'google_auth_failed': 'Google authentication failed. Please try again.',
                'authentication_failed': 'Authentication failed. Please try again.',
            };
            toast.error(errorMessages[error] || 'An error occurred during authentication.');
        }
    }, [searchParams]);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginInput>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginInput) => {
        try {
            await login(data.email, data.password);
            toast.success("Welcome back!");
            router.push("/projects");
        } catch (error: any) {
            const message = error.response?.data?.error || "Login failed. Please check your credentials.";
            toast.error(message);
        }
    };

    const handleGoogleLogin = () => {
        setIsGoogleLoading(true);
        const googleAuthUrl = `${backendUrl}/api/auth/google`;
        console.log('🚀 Redirecting to Google OAuth:', googleAuthUrl);
        window.location.href = googleAuthUrl;
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 relative overflow-hidden">
            {/* Animated background gradient orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-[#9ACD32]/20 to-transparent rounded-full blur-3xl"
                    animate={{
                        x: [0, 100, 0],
                        y: [0, 50, 0],
                        scale: [1, 1.1, 1],
                    }}
                    transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
                <motion.div
                    className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-[#9ACD32]/20 to-transparent rounded-full blur-3xl"
                    animate={{
                        x: [0, -100, 0],
                        y: [0, -50, 0],
                        scale: [1, 1.2, 1],
                    }}
                    transition={{
                        duration: 25,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md relative z-10"
            >
                {/* Glass card */}
                <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.1, duration: 0.5 }}
                        >
                            <h1 className="text-3xl font-bold text-foreground mb-2">
                                Welcome Back
                            </h1>
                            <p className="text-muted-foreground">
                                Sign in to continue to MrMorris
                            </p>
                        </motion.div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* Email field */}
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                        >
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium text-foreground mb-2"
                            >
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                    {...register("email")}
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    className="pl-10 bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-[#9ACD32] focus:ring-[#9ACD32]/20 transition-all"
                                />
                            </div>
                            {errors.email && (
                                <motion.p
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-1 text-sm text-red-400"
                                >
                                    {errors.email.message}
                                </motion.p>
                            )}
                        </motion.div>

                        {/* Password field */}
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.3, duration: 0.5 }}
                        >
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-foreground mb-2"
                            >
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                    {...register("password")}
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    className="pl-10 pr-10 bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-[#9ACD32] focus:ring-[#9ACD32]/20 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5" />
                                    ) : (
                                        <Eye className="h-5 w-5" />
                                    )}
                                </button>
                            </div>
                            {errors.password && (
                                <motion.p
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-1 text-sm text-red-400"
                                >
                                    {errors.password.message}
                                </motion.p>
                            )}
                        </motion.div>

                        {/* Forgot password link */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4, duration: 0.5 }}
                            className="flex items-center justify-end"
                        >
                            <Link
                                href="/forgot-password"
                                className="text-sm text-[#9ACD32] hover:text-[#9ACD32]/80 transition-colors"
                            >
                                Forgot password?
                            </Link>
                        </motion.div>

                        {/* Submit button */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5, duration: 0.5 }}
                        >
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-[#9ACD32] hover:bg-[#8AB82E]/90 text-white font-semibold py-6 rounded-lg shadow-lg shadow-primary/25 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    <>
                                        Sign In
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </>
                                )}
                            </Button>
                        </motion.div>
                    </form>

                    {/* OR Divider */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6, duration: 0.5 }}
                        className="mt-6 mb-6"
                    >
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-border"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-card/50 text-muted-foreground">OR</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Google Sign-In Button */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.7, duration: 0.5 }}
                    >
                        <Button
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={isLoading || isGoogleLoading}
                            className="w-full bg-white hover:bg-gray-50 text-gray-700 font-semibold py-6 rounded-lg border border-gray-300 shadow-sm transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
                        >
                            {isGoogleLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Connecting...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path
                                            fill="#4285F4"
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        />
                                        <path
                                            fill="#34A853"
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        />
                                        <path
                                            fill="#FBBC05"
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        />
                                        <path
                                            fill="#EA4335"
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        />
                                    </svg>
                                    Continue with Google
                                </>
                            )}
                        </Button>
                    </motion.div>

                    {/* Sign up link */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8, duration: 0.5 }}
                        className="mt-8 pt-6 border-t border-border"
                    >
                        <p className="text-center text-muted-foreground text-sm">
                            Don&apos;t have an account?{" "}
                            <Link
                                href="/register"
                                className="text-[#9ACD32] hover:text-[#9ACD32]/80 font-medium transition-colors"
                            >
                                Sign up
                            </Link>
                        </p>
                    </motion.div>

                    {/* Back to home */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7, duration: 0.5 }}
                        className="mt-4"
                    >
                        <Link
                            href="/"
                            className="block text-center text-muted-foreground hover:text-foreground text-sm transition-colors"
                        >
                            ← Back to Home
                        </Link>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
}
