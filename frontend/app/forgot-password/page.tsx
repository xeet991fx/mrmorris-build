"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useAuthStore } from "@/store/useAuthStore";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const { forgotPassword, isLoading } = useAuthStore();
  const [emailSent, setEmailSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    try {
      await forgotPassword(data.email);
      toast.success("Password reset email sent!");
      setEmailSent(true);
    } catch (error: any) {
      // Still show success to prevent email enumeration
      toast.success("If an account exists, a password reset email has been sent!");
      setEmailSent(true);
    }
  };

  if (emailSent) {
    return (
      <>
        <Toaster position="top-right" />
        <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="mb-6 inline-block"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-[#9ACD32] to-[#8AB82E] rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
              </motion.div>

              <h2 className="text-2xl font-bold text-foreground mb-2">
                Check Your Email
              </h2>
              <p className="text-muted-foreground mb-6">
                If an account exists with{" "}
                <span className="text-[#9ACD32] font-medium">
                  {getValues("email")}
                </span>
                , you will receive a password reset link shortly.
              </p>

              <div className="bg-muted/50 border border-border/50 rounded-lg p-4 mb-6">
                <p className="text-sm text-foreground">
                  Didn&apos;t receive the email? Check your spam folder or try again
                  in a few minutes.
                </p>
              </div>

              <Link href="/login">
                <Button className="w-full bg-gradient-to-r from-[#9ACD32] to-[#8AB82E] hover:from-[#9ACD32]/90 hover:to-[#8AB82E]/90">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
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
                  Reset Password
                </h1>
                <p className="text-muted-foreground">
                  Enter your email to receive a reset link
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

              {/* Submit button */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-[#9ACD32] to-[#8AB82E] hover:from-[#9ACD32]/90 hover:to-[#8AB82E]/90 text-white font-semibold py-6 rounded-lg shadow-lg shadow-primary/25 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>Send Reset Link</>
                  )}
                </Button>
              </motion.div>
            </form>

            {/* Divider */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mt-8 pt-6 border-t border-border/50"
            >
              <p className="text-center text-muted-foreground text-sm">
                Remember your password?{" "}
                <Link
                  href="/login"
                  className="text-[#9ACD32] hover:text-[#9ACD32]/80 font-medium transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </motion.div>

            {/* Back to home */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
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
    </>
  );
}
