"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserCircleIcon,
  EnvelopeIcon,
  KeyIcon,
  CheckIcon,
  XMarkIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";
import { SunIcon, MoonIcon } from "@heroicons/react/24/solid";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/useAuthStore";
import { useTheme } from "next-themes";

export default function AccountSettingsPage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const { user } = useAuthStore();
  const { theme, setTheme } = useTheme();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || "",
        email: user.email || "",
      });
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    // TODO: Implement profile update API call
    toast.success("Profile updated successfully");
    setIsEditingProfile(false);
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    // TODO: Implement password change API call
    toast.success("Password changed successfully");
    setIsChangingPassword(false);
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 30 }
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="px-8 pt-8 pb-6"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
            <UserCircleIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Account Settings</h1>
            <p className="text-sm text-muted-foreground">
              Manage your profile and preferences
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="px-8 pb-8"
      >
        <div className="max-w-2xl space-y-6">
          {/* Profile Information */}
          <motion.div
            variants={itemVariants}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm p-6 shadow-sm hover:shadow-md transition-shadow duration-500"
          >
            {/* Subtle gradient overlay on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-foreground">Profile</h2>
                {!isEditingProfile && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsEditingProfile(true)}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-all duration-300"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </motion.button>
                )}
              </div>

              <AnimatePresence mode="wait">
                {isEditingProfile ? (
                  <motion.div
                    key="editing"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="space-y-5"
                  >
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Name
                      </label>
                      <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                        className="w-full px-4 py-3 bg-background/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300 text-foreground placeholder:text-muted-foreground"
                        placeholder="Your name"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Email
                      </label>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        className="w-full px-4 py-3 bg-background/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300 text-foreground placeholder:text-muted-foreground"
                        placeholder="your@email.com"
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleUpdateProfile}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-xl font-medium hover:shadow-lg hover:shadow-primary/20 transition-all duration-300"
                      >
                        <CheckIcon className="w-4 h-4" />
                        Save
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setIsEditingProfile(false)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-muted/50 text-foreground rounded-xl font-medium hover:bg-muted transition-all duration-300"
                      >
                        <XMarkIcon className="w-4 h-4" />
                        Cancel
                      </motion.button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="viewing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                        <span className="text-xl font-bold text-primary">
                          {(user?.name || user?.email || "?").charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{user?.name || "Not set"}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <EnvelopeIcon className="w-3.5 h-3.5" />
                          {user?.email || "Not set"}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Appearance Settings */}
          <motion.div
            variants={itemVariants}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm p-6 shadow-sm hover:shadow-md transition-shadow duration-500"
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

            <div className="relative z-10">
              <h2 className="text-lg font-semibold text-foreground mb-6">Appearance</h2>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Theme</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Choose your preferred appearance
                  </p>
                </div>

                {/* Modern segmented toggle */}
                <div className="flex items-center p-1 bg-muted/50 rounded-xl gap-1">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setTheme("light")}
                    className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${theme === "light"
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {theme === "light" && (
                      <motion.div
                        layoutId="activeTheme"
                        className="absolute inset-0 bg-background rounded-lg shadow-sm"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <SunIcon className="w-4 h-4 relative z-10" />
                    <span className="relative z-10">Light</span>
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setTheme("dark")}
                    className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${theme === "dark"
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {theme === "dark" && (
                      <motion.div
                        layoutId="activeTheme"
                        className="absolute inset-0 bg-background rounded-lg shadow-sm"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <MoonIcon className="w-4 h-4 relative z-10" />
                    <span className="relative z-10">Dark</span>
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Password Change */}
          <motion.div
            variants={itemVariants}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm p-6 shadow-sm hover:shadow-md transition-shadow duration-500"
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <KeyIcon className="w-5 h-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold text-foreground">Security</h2>
                </div>
                {!isChangingPassword && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsChangingPassword(true)}
                    className="px-4 py-2 bg-muted/50 text-foreground text-sm font-medium rounded-xl hover:bg-muted transition-all duration-300"
                  >
                    Change Password
                  </motion.button>
                )}
              </div>

              <AnimatePresence>
                {isChangingPassword ? (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Current Password
                      </label>
                      <input
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        className="w-full px-4 py-3 bg-background/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className="w-full px-4 py-3 bg-background/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        className="w-full px-4 py-3 bg-background/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300"
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleChangePassword}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-xl font-medium hover:shadow-lg hover:shadow-primary/20 transition-all duration-300"
                      >
                        <CheckIcon className="w-4 h-4" />
                        Update Password
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setIsChangingPassword(false);
                          setPasswordData({
                            currentPassword: "",
                            newPassword: "",
                            confirmPassword: "",
                          });
                        }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-muted/50 text-foreground rounded-xl font-medium hover:bg-muted transition-all duration-300"
                      >
                        <XMarkIcon className="w-4 h-4" />
                        Cancel
                      </motion.button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm text-muted-foreground"
                  >
                    Secure your account with a strong password
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Account Information */}
          <motion.div
            variants={itemVariants}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm p-6 shadow-sm hover:shadow-md transition-shadow duration-500"
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

            <div className="relative z-10">
              <h2 className="text-lg font-semibold text-foreground mb-5">Account Info</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Account ID</p>
                  <p className="text-foreground font-mono text-sm bg-muted/30 px-3 py-2 rounded-lg truncate">
                    {user?.id || "Not available"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Created</p>
                  <p className="text-foreground text-sm bg-muted/30 px-3 py-2 rounded-lg">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    }) : "Not available"}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
