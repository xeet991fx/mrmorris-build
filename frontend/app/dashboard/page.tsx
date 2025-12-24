"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { LogOut, User, Mail, CheckCircle2, Calendar } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/shared/theme-toggle";

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/95 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/Clianta-logo.jpg"
              alt="Clianta Logo"
              width={36}
              height={36}
              className="object-contain"
            />
            <h1 className="text-base font-semibold text-foreground">
              Clianta
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-border text-foreground hover:bg-muted hover:text-foreground text-sm h-8 px-3"
            >
              <LogOut className="mr-2 h-3.5 w-3.5" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-1">
              Welcome back, {user?.name}!
            </h2>
            <p className="text-sm text-muted-foreground">
              You&apos;re successfully logged in to your Clianta dashboard.
            </p>
          </div>

          {/* User Info Card */}
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              <Card className="bg-card/95 backdrop-blur-xl border-border p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#9ACD32] rounded-full flex items-center justify-center text-neutral-900 text-lg font-semibold shadow-sm">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-3">
                      Account Information
                    </h3>
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2.5 text-foreground">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Full Name</p>
                          <p className="text-sm font-medium">{user?.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 text-foreground">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Email</p>
                          <p className="text-sm font-medium">{user?.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 text-foreground">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <div>
                          <p className="text-xs text-muted-foreground">Status</p>
                          <p className="text-sm font-medium text-green-500">
                            {user?.isVerified ? "Verified" : "Not Verified"}
                          </p>
                        </div>
                      </div>
                      {user?.createdAt && (
                        <div className="flex items-center gap-2.5 text-foreground">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Member Since
                            </p>
                            <p className="text-sm font-medium">
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
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              <Card className="bg-card/95 backdrop-blur-xl border-border p-5 h-full shadow-sm">
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  You&apos;re All Set!
                </h3>
                <p className="text-sm text-foreground mb-4">
                  Your account is fully configured and ready to use. Start
                  exploring Clianta&apos;s autonomous marketing features.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-foreground">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Email verified</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    <span className="text-sm">Account active</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
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
            transition={{ delay: 0.3, duration: 0.3 }}
          >
            <h3 className="text-xl font-bold text-foreground mb-4">
              Quick Actions
            </h3>
            <div className="grid md:grid-cols-3 gap-3">
              <Card className="bg-card/95 backdrop-blur-xl border-border p-4 hover:border-border hover:bg-card transition-all cursor-pointer group shadow-sm">
                <div className="text-center">
                  <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:bg-muted transition-colors">
                    <User className="h-5 w-5 text-foreground" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground mb-1">
                    Edit Profile
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Update your account information
                  </p>
                </div>
              </Card>

              <Card className="bg-card/95 backdrop-blur-xl border-border p-4 hover:border-border hover:bg-card transition-all cursor-pointer group shadow-sm">
                <div className="text-center">
                  <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:bg-muted transition-colors">
                    <Mail className="h-5 w-5 text-foreground" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground mb-1">
                    Email Settings
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Manage your email preferences
                  </p>
                </div>
              </Card>

              <Card className="bg-card/95 backdrop-blur-xl border-border p-4 hover:border-border hover:bg-card transition-all cursor-pointer group shadow-sm">
                <div className="text-center">
                  <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:bg-muted transition-colors">
                    <CheckCircle2 className="h-5 w-5 text-foreground" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground mb-1">Security</h4>
                  <p className="text-xs text-muted-foreground">
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
