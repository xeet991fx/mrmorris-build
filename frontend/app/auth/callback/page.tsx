"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import toast from "react-hot-toast";

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
        router.push("/login");
        return;
      }

      if (!token) {
        toast.error("No authentication token received.");
        router.push("/login");
        return;
      }

      try {
        // Set token
        setToken(token);

        // Fetch user data
        await fetchUser();

        toast.success("Successfully logged in with Google!");
        router.push("/projects");
      } catch (error) {
        console.error("Callback error:", error);
        toast.error("Failed to complete authentication.");
        router.push("/login");
      }
    };

    handleCallback();
  }, [searchParams, router, setToken, fetchUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-violet-500 mx-auto mb-4" />
        <p className="text-slate-400 text-lg">Completing authentication...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-violet-500 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
