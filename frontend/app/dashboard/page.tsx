"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LogOut, User, Mail, CheckCircle2, Calendar } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

function DashboardContent() {
  const router = useRouter();
  const { user, logout, getCurrentUser } = useAuthStore();

  useEffect(() => {
    getCurrentUser();
  }, [getCurrentUser]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800/50 bg-slate-900/30 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">M</span>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
              MrMorris
            </h1>
          </div>

          <Button
            onClick={handleLogout}
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Welcome Section */}
          <div className="mb-12">
            <h2 className="text-4xl font-bold text-white mb-2">
              Welcome back, {user?.name}!
            </h2>
            <p className="text-slate-400">
              You&apos;re successfully logged in to your MrMorris dashboard.
            </p>
          </div>

          {/* User Info Card */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              <Card className="bg-slate-900/50 backdrop-blur-xl border-slate-800/50 p-6">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-4">
                      Account Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-slate-300">
                        <User className="h-5 w-5 text-slate-500" />
                        <div>
                          <p className="text-xs text-slate-500">Full Name</p>
                          <p className="font-medium">{user?.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-slate-300">
                        <Mail className="h-5 w-5 text-slate-500" />
                        <div>
                          <p className="text-xs text-slate-500">Email</p>
                          <p className="font-medium">{user?.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-slate-300">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="text-xs text-slate-500">Status</p>
                          <p className="font-medium text-green-500">
                            {user?.isVerified ? "Verified" : "Not Verified"}
                          </p>
                        </div>
                      </div>
                      {user?.createdAt && (
                        <div className="flex items-center gap-3 text-slate-300">
                          <Calendar className="h-5 w-5 text-slate-500" />
                          <div>
                            <p className="text-xs text-slate-500">
                              Member Since
                            </p>
                            <p className="font-medium">
                              {new Date(user.createdAt).toLocaleDateString(
                                "en-US",
                                {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                }
                              )}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <Card className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 backdrop-blur-xl border-violet-500/20 p-6 h-full">
                <h3 className="text-xl font-semibold text-white mb-4">
                  🎉 You&apos;re All Set!
                </h3>
                <p className="text-slate-300 mb-6">
                  Your account is fully configured and ready to use. Start
                  exploring MrMorris&apos;s autonomous marketing features.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-300">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Email verified</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Account active</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Ready to automate</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <h3 className="text-2xl font-bold text-white mb-6">
              Quick Actions
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="bg-slate-900/50 backdrop-blur-xl border-slate-800/50 p-6 hover:border-violet-500/50 transition-all cursor-pointer group">
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-500 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="font-semibold text-white mb-2">
                    Edit Profile
                  </h4>
                  <p className="text-sm text-slate-400">
                    Update your account information
                  </p>
                </div>
              </Card>

              <Card className="bg-slate-900/50 backdrop-blur-xl border-slate-800/50 p-6 hover:border-violet-500/50 transition-all cursor-pointer group">
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Mail className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="font-semibold text-white mb-2">
                    Email Settings
                  </h4>
                  <p className="text-sm text-slate-400">
                    Manage your email preferences
                  </p>
                </div>
              </Card>

              <Card className="bg-slate-900/50 backdrop-blur-xl border-slate-800/50 p-6 hover:border-violet-500/50 transition-all cursor-pointer group">
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-500 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="font-semibold text-white mb-2">Security</h4>
                  <p className="text-sm text-slate-400">
                    Manage password and security
                  </p>
                </div>
              </Card>
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
