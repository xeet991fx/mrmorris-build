"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { LogOut, User, Mail, CheckCircle2, Calendar, Sparkles, TrendingUp, Users, Activity } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { ThemeSelector } from "@/components/shared/ThemeSelector";

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

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 100 },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Gradient Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-card/80 backdrop-blur-2xl">
        {/* Gradient Top Border */}
        <div className="h-1 bg-gradient-to-r from-[var(--theme-primary)] via-[var(--theme-secondary)] to-[var(--theme-primary)] opacity-70" />

        <div className="container mx-auto px-8 py-4 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            <div className="relative">
              <Image
                src="/Clianta-logo.jpg"
                alt="Clianta Logo"
                width={40}
                height={40}
                className="object-contain rounded-xl"
              />
              <div className="absolute -inset-1 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] rounded-xl opacity-20 blur-sm" />
            </div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">
              Clianta
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <ThemeSelector />
            <ThemeToggle />
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-border/60 text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200 text-sm h-9 px-4 rounded-xl group"
            >
              <LogOut className="mr-2 h-4 w-4 group-hover:rotate-12 transition-transform duration-200" />
              Logout
            </Button>
          </motion.div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-8 py-12">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Welcome Section with Gradient */}
          <motion.div variants={itemVariants} className="mb-12">
            <div className="relative">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl font-bold text-foreground mb-2 tracking-tight flex items-center gap-3"
              >
                Welcome back, {user?.name}!
                <motion.span
                  animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  className="text-4xl"
                >
                  👋
                </motion.span>
              </motion.h2>
              <p className="text-base text-muted-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[var(--theme-primary)]" />
                Here's what's happening with your{" "}
                <span
                  className="font-semibold bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] bg-clip-text text-transparent"
                >
                  account
                </span>
              </p>
            </div>
          </motion.div>

          {/* Stats Cards with Gradient Accents */}
          <motion.div variants={itemVariants} className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              { icon: Users, label: "Total Contacts", value: "0", color: "from-blue-500 to-cyan-500" },
              { icon: TrendingUp, label: "Active Campaigns", value: "0", color: "from-purple-500 to-pink-500" },
              { icon: Activity, label: "Recent Activity", value: "0", color: "from-green-500 to-emerald-500" },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                variants={itemVariants}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="relative group"
              >
                {/* Gradient Border */}
                <div className="absolute -inset-[1px] bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] rounded-2xl opacity-0 group-hover:opacity-100 blur transition-opacity duration-300" />

                <div className="relative bg-card rounded-2xl p-6 border border-border/50 backdrop-blur-sm">
                  {/* Gradient Top Border */}
                  <div className={`h-1 w-full rounded-full mb-4 bg-gradient-to-r ${stat.color}`} />

                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                      <motion.p
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 + index * 0.1 }}
                        className="text-3xl font-bold text-foreground"
                      >
                        {stat.value}
                      </motion.p>
                    </div>
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg`}>
                      <stat.icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Main Info Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* Account Information */}
            <motion.div
              variants={itemVariants}
              className="relative group"
            >
              <div className="absolute -inset-[1px] bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] rounded-2xl opacity-20 blur-sm group-hover:opacity-40 transition-opacity duration-300" />

              <div className="relative bg-card/95 backdrop-blur-xl rounded-2xl p-8 border border-border/50">
                {/* Gradient Accent */}
                <div className="h-1 w-20 rounded-full bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] mb-6" />

                <div className="flex items-start gap-5 mb-6">
                  <motion.div
                    whileHover={{ scale: 1.05, rotate: 5 }}
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold relative overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))`,
                    }}
                  >
                    {user?.name?.charAt(0).toUpperCase()}
                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </motion.div>

                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-1">
                      Account Information
                    </h3>
                    <p className="text-sm text-muted-foreground">Your profile details</p>
                  </div>
                </div>

                <div className="space-y-5">
                  {[
                    { icon: User, label: "Full Name", value: user?.name },
                    { icon: Mail, label: "Email", value: user?.email },
                    { icon: CheckCircle2, label: "Status", value: user?.isVerified ? "Verified" : "Not Verified" },
                    {
                      icon: Calendar,
                      label: "Member Since",
                      value: user?.createdAt
                        ? new Date(user.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                        : "N/A",
                    },
                  ].map((item, index) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="flex items-center gap-4 group/item"
                    >
                      <div className="p-2.5 rounded-xl bg-muted/60 group-hover/item:bg-[var(--theme-primary)]/10 transition-colors duration-200">
                        <item.icon className="h-4 w-4 text-muted-foreground group-hover/item:text-[var(--theme-primary)] transition-colors duration-200" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
                          {item.label}
                        </p>
                        <p className="text-sm font-medium text-foreground">{item.value}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Success Message */}
            <motion.div
              variants={itemVariants}
              className="relative group"
            >
              <div className="absolute -inset-[1px] bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl opacity-20 blur-sm group-hover:opacity-40 transition-opacity duration-300" />

              <div className="relative bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20 backdrop-blur-xl rounded-2xl p-8 border border-green-200/50 dark:border-green-800/50 h-full flex flex-col">
                <div className="h-1 w-20 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 mb-6" />

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <motion.div
                      animate={{
                        scale: [1, 1.2, 1],
                        rotate: [0, 10, -10, 0],
                      }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                      className="text-3xl"
                    >
                      ✨
                    </motion.div>
                    <h3 className="text-xl font-bold text-foreground">
                      You're All Set!
                    </h3>
                  </div>

                  <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                    Your account is fully configured and ready to use. Start exploring Clianta's autonomous marketing features.
                  </p>

                  <div className="space-y-3">
                    {["Email verified", "Account active", "Ready to automate"].map((item, index) => (
                      <motion.div
                        key={item}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * index }}
                        className="flex items-center gap-3"
                      >
                        <motion.div
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ duration: 2, delay: index * 0.2, repeat: Infinity, repeatDelay: 3 }}
                          className="w-2 h-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-500"
                        />
                        <span className="text-sm font-medium text-foreground">{item}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Quick Actions with Floating Effect */}
          <motion.div variants={itemVariants}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)]">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Quick Actions</h3>
            </div>

            <div className="grid md:grid-cols-3 gap-5">
              {[
                {
                  icon: User,
                  title: "Edit Profile",
                  description: "Update your account information",
                  path: "/profile",
                  gradient: "from-blue-500 to-cyan-500",
                },
                {
                  icon: Mail,
                  title: "Email Settings",
                  description: "Manage your email preferences",
                  path: "/settings/email",
                  gradient: "from-purple-500 to-pink-500",
                },
                {
                  icon: CheckCircle2,
                  title: "Security",
                  description: "Manage password and security",
                  path: "/settings/security",
                  gradient: "from-green-500 to-emerald-500",
                },
              ].map((action, index) => (
                <motion.div
                  key={action.title}
                  variants={itemVariants}
                  whileHover={{ y: -6, transition: { duration: 0.2 } }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push(action.path)}
                  className="relative group cursor-pointer"
                >
                  {/* Animated Gradient Border */}
                  <div className="absolute -inset-[1px] bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] rounded-2xl opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-300" />

                  <div className="relative bg-card/95 backdrop-blur-xl rounded-2xl p-6 border border-border/50">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${action.gradient} shadow-lg group-hover:shadow-xl transition-shadow duration-300`}>
                        <action.icon className="h-5 w-5 text-white" />
                      </div>
                      <motion.div
                        className="text-muted-foreground"
                        animate={{ x: [0, 4, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                      >
                        →
                      </motion.div>
                    </div>

                    <h4 className="text-base font-semibold text-foreground mb-2 group-hover:text-[var(--theme-primary)] transition-colors duration-200">
                      {action.title}
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {action.description}
                    </p>
                  </div>
                </motion.div>
              ))}
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
