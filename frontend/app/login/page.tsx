import { Suspense } from "react";
import { Toaster } from "react-hot-toast";
import LoginContent from "./LoginContent";

export default function LoginPage() {
  return (
    <>
      <Toaster position="top-right" />
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-neutral-950 to-black">
            <div className="text-center">
              <div className="w-12 h-12 border-3 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-neutral-400">Loading...</p>
            </div>
          </div>
        }
      >
        <LoginContent />
      </Suspense>
    </>
  );
}
