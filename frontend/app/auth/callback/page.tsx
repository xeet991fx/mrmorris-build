"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/useAuthStore";
import toast, { Toaster } from "react-hot-toast";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setToken, fetchUser } = useAuthStore();

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get("token");
      const error = searchParams.get("error");

      if (error) {
        toast.error("Authentication failed. Please try again.");
        setTimeout(() => router.push("/login"), 2000);
        return;
      }

      if (!token) {
        toast.error("No authentication token received.");
        setTimeout(() => router.push("/login"), 2000);
        return;
      }

      try {
        // Set token
        setToken(token);

        // Fetch user data
        await fetchUser();

        toast.success("Successfully logged in with Google!");
        setTimeout(() => router.push("/projects"), 1500);
      } catch (error) {
        console.error("Callback error:", error);
        toast.error("Failed to complete authentication.");
        setTimeout(() => router.push("/login"), 2000);
      }
    };

    handleCallback();
  }, [searchParams, router, setToken, fetchUser]);

  return (
    <>
      <Toaster position="top-right" />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-neutral-950 to-black px-4 relative overflow-hidden">
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
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative z-10"
        >
          <div className="bg-neutral-800/50 backdrop-blur-xl border border-neutral-900/50 rounded-2xl shadow-2xl p-12 text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="inline-block mb-6"
            >
              <Loader2 className="w-16 h-16 text-[#9ACD32]" />
            </motion.div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Completing Authentication
            </h2>
            <p className="text-neutral-400">
              Please wait while we securely log you in...
            </p>
          </div>
        </motion.div>
      </div>
    </>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-neutral-950 to-black">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#9ACD32] mx-auto mb-4" />
          <p className="text-neutral-400 text-lg">Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
