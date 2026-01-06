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
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Image
              src="/Clianta-logo.jpg"
              alt="Clianta Logo"
              width={40}
              height={40}
              className="object-contain rounded-lg"
            />
            <h1 className="text-lg font-bold text-foreground tracking-tight">
              Clianta
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-border/60 text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200 text-sm h-9 px-4 rounded-lg"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-8 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {/* Welcome Section */}
          <div className="mb-10">
            <h2 className="text-[2rem] font-bold text-foreground mb-2 tracking-tight flex items-center gap-3">
              Welcome back, {user?.name}! <span className="text-3xl">👋</span>
            </h2>
            <p className="text-[0.95rem] text-muted-foreground">
              Here&apos;s what&apos;s happening with your <span className="text-primary font-medium">account</span>
            </p>
          </div>

          {/* User Info Card */}
          <div className="grid md:grid-cols-2 gap-6 mb-10">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <Card className="bg-card border-border/50 p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl">
                <div className="flex items-start gap-5">
                  <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xl font-bold shadow-md">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[1.125rem] font-semibold text-foreground mb-4">
                      Account Information
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-foreground">
                        <User className="h-[18px] w-[18px] text-muted-foreground" />
                        <div>
                          <p className="text-[0.75rem] text-muted-foreground uppercase tracking-wide">Full Name</p>
                          <p className="text-[0.9375rem] font-medium">{user?.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-foreground">
                        <Mail className="h-[18px] w-[18px] text-muted-foreground" />
                        <div>
                          <p className="text-[0.75rem] text-muted-foreground uppercase tracking-wide">Email</p>
                          <p className="text-[0.9375rem] font-medium">{user?.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-foreground">
                        <CheckCircle2 className="h-[18px] w-[18px] text-emerald-500" />
                        <div>
                          <p className="text-[0.75rem] text-muted-foreground uppercase tracking-wide">Status</p>
                          <p className="text-[0.9375rem] font-medium text-emerald-500">
                            {user?.isVerified ? "Verified" : "Not Verified"}
                          </p>
                        </div>
                      </div>
                      {user?.createdAt && (
                        <div className="flex items-center gap-3 text-foreground">
                          <Calendar className="h-[18px] w-[18px] text-muted-foreground" />
                          <div>
                            <p className="text-[0.75rem] text-muted-foreground uppercase tracking-wide">
                              Member Since
                            </p>
                            <p className="text-[0.9375rem] font-medium">
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
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <Card className="bg-card border-border/50 p-6 h-full shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl">
                <h3 className="text-[1.125rem] font-semibold text-foreground mb-4">
                  You&apos;re All Set! ✨
                </h3>
                <p className="text-[0.9375rem] text-muted-foreground mb-5 leading-relaxed">
                  Your account is fully configured and ready to use. Start
                  exploring Clianta&apos;s autonomous marketing features.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-foreground">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-[0.9375rem]">Email verified</span>
                  </div>
                  <div className="flex items-center gap-3 text-foreground">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-[0.9375rem]">Account active</span>
                  </div>
                  <div className="flex items-center gap-3 text-foreground">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-[0.9375rem]">Ready to automate</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <div className="flex items-center gap-2 mb-5">
              <span className="text-primary text-xl">⚡</span>
              <h3 className="text-[1.25rem] font-bold text-foreground">
                Quick Actions
              </h3>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              <Card className="bg-card border-border/50 p-5 hover:border-primary/40 hover:bg-card/80 transition-all duration-300 cursor-pointer group shadow-md hover:shadow-lg rounded-xl">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 bg-secondary rounded-xl flex items-center justify-center group-hover:bg-primary/10 transition-colors duration-300">
                      <User className="h-5 w-5 text-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <h4 className="text-[0.9375rem] font-semibold text-foreground mb-1">
                        Edit Profile
                      </h4>
                      <p className="text-[0.8125rem] text-muted-foreground">
                        Update your account information
                      </p>
                    </div>
                  </div>
                  <span className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300">→</span>
                </div>
              </Card>

              <Card className="bg-card border-border/50 p-5 hover:border-primary/40 hover:bg-card/80 transition-all duration-300 cursor-pointer group shadow-md hover:shadow-lg rounded-xl">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 bg-secondary rounded-xl flex items-center justify-center group-hover:bg-primary/10 transition-colors duration-300">
                      <Mail className="h-5 w-5 text-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <h4 className="text-[0.9375rem] font-semibold text-foreground mb-1">
                        Email Settings
                      </h4>
                      <p className="text-[0.8125rem] text-muted-foreground">
                        Manage your email preferences
                      </p>
                    </div>
                  </div>
                  <span className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300">→</span>
                </div>
              </Card>

              <Card className="bg-card border-border/50 p-5 hover:border-primary/40 hover:bg-card/80 transition-all duration-300 cursor-pointer group shadow-md hover:shadow-lg rounded-xl">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 bg-secondary rounded-xl flex items-center justify-center group-hover:bg-primary/10 transition-colors duration-300">
                      <CheckCircle2 className="h-5 w-5 text-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <h4 className="text-[0.9375rem] font-semibold text-foreground mb-1">
                        Security
                      </h4>
                      <p className="text-[0.8125rem] text-muted-foreground">
                        Manage password and security
                      </p>
                    </div>
                  </div>
                  <span className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300">→</span>
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
