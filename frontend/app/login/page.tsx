"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, Mail, Lock, ArrowRight } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useAuthStore } from "@/store/useAuthStore";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

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
      const message = error.response?.data?.error || "Login failed";
      toast.error(message);
    }
  };

  return (
    <>
      <Toaster position="top-right" />
      <div className="min-h-screen flex items-center justify-center bg-neutral-900 px-4 py-12 relative overflow-hidden">
        {/* Animated background gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-[#9ACD32]/5 to-transparent rounded-full blur-3xl"
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
            className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-neutral-900/50 to-transparent rounded-full blur-3xl"
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
          <div className="bg-neutral-800/70 backdrop-blur-xl border border-neutral-800 rounded-2xl shadow-2xl p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.5 }}
              >
                <h1 className="text-3xl font-bold text-white mb-2">
                  Welcome Back
                </h1>
                <p className="text-neutral-400">
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
                  className="block text-sm font-medium text-neutral-300 mb-2"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-500" />
                  <Input
                    {...register("email")}
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-10 bg-neutral-900/50 border-neutral-800 text-white placeholder:text-neutral-500 focus:border-[#9ACD32] focus:ring-[#9ACD32]/20 transition-all"
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
                  className="block text-sm font-medium text-neutral-300 mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-500" />
                  <Input
                    {...register("password")}
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className="pl-10 pr-10 bg-neutral-900/50 border-neutral-800 text-white placeholder:text-neutral-500 focus:border-[#9ACD32] focus:ring-[#9ACD32]/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
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

            {/* Divider */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="mt-8 pt-6 border-t border-neutral-800"
            >
              <p className="text-center text-neutral-400 text-sm">
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
                className="block text-center text-neutral-500 hover:text-neutral-400 text-sm transition-colors"
              >
                ← Back to Home
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
