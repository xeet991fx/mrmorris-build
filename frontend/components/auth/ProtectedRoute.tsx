"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  redirectTo = "/login",
}: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, getCurrentUser } = useAuthStore();

  useEffect(() => {
    // Check authentication and redirect if needed
    const checkAuth = async () => {
      await getCurrentUser();

      // After getCurrentUser completes, check if still not authenticated
      const { isAuthenticated: currentAuth, isLoading: currentLoading } = useAuthStore.getState();

      if (!currentLoading && !currentAuth) {
        router.push(redirectTo);
      }
    };

    checkAuth();
  }, [getCurrentUser, router, redirectTo]);

  // Show loading state
  if (isLoading) {
    return null;
  }

  // Show children if authenticated
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Return null while redirecting
  return null;
}
