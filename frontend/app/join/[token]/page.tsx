"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    UserGroupIcon,
    CheckCircleIcon,
    XCircleIcon,
    ArrowRightIcon,
    LinkIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { validateJoinLink, joinViaLink, JoinLinkValidationResponse } from "@/lib/api/team";
import { useAuthStore } from "@/store/useAuthStore";
import Link from "next/link";

type JoinStatus = "loading" | "valid" | "expired" | "invalid" | "joined" | "already_member" | "error";

export default function JoinViaLinkPage() {
    const params = useParams();
    const router = useRouter();
    const token = params.token as string;

    const { isAuthenticated, user, isLoading: authLoading } = useAuthStore();

    const [status, setStatus] = useState<JoinStatus>("loading");
    const [linkData, setLinkData] = useState<JoinLinkValidationResponse["data"] | null>(null);
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [isJoining, setIsJoining] = useState(false);

    // Validate link on mount
    useEffect(() => {
        const validate = async () => {
            try {
                const response = await validateJoinLink(token);
                if (response.success && response.data) {
                    setLinkData(response.data);
                    setStatus("valid");
                } else {
                    setErrorMessage(response.error || "Invalid invite link");
                    setStatus("invalid");
                }
            } catch (error: any) {
                const statusCode = error.response?.status;
                const message = error.response?.data?.error || "Failed to validate invite link";

                if (statusCode === 410) {
                    setStatus("expired");
                    setErrorMessage(message);
                } else if (statusCode === 404) {
                    setStatus("invalid");
                    setErrorMessage(message);
                } else {
                    setStatus("error");
                    setErrorMessage(message);
                }
            }
        };

        if (token) {
            validate();
        }
    }, [token]);

    const handleJoin = async () => {
        if (!isAuthenticated) {
            router.push(`/login?redirect=/join/${token}`);
            return;
        }

        setIsJoining(true);
        try {
            const response = await joinViaLink(token);
            if (response.success) {
                setStatus("joined");
                toast.success(response.message || "You've joined the workspace!");

                // Redirect to workspace
                setTimeout(() => {
                    router.push(`/projects/${response.data?.workspaceId}`);
                }, 1500);
            } else {
                toast.error(response.error || "Failed to join");
            }
        } catch (error: any) {
            const message = error.response?.data?.error || "Failed to join workspace";
            const errorData = error.response?.data;

            if (message.includes("already a member") && errorData?.data?.workspaceId) {
                setStatus("already_member");
                setErrorMessage(message);
                // Auto-redirect to workspace
                setTimeout(() => {
                    router.push(`/projects/${errorData.data.workspaceId}`);
                }, 2000);
            } else {
                toast.error(message);
                if (error.response?.status === 410) {
                    setStatus("expired");
                    setErrorMessage(message);
                }
            }
        } finally {
            setIsJoining(false);
        }
    };

    // Loading state
    if (status === "loading" || authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                >
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                        <LinkIcon className="w-8 h-8 text-primary" />
                    </div>
                    <p className="text-muted-foreground">Validating invite link...</p>
                </motion.div>
            </div>
        );
    }

    // Expired or revoked
    if (status === "expired") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md w-full bg-card border border-border rounded-2xl shadow-xl p-8 text-center"
                >
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                        <XCircleIcon className="w-10 h-10 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">Link Expired</h1>
                    <p className="text-muted-foreground mb-6">
                        {errorMessage || "This invite link has expired or been revoked. Ask the team admin for a new one."}
                    </p>
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                    >
                        Go to Login
                        <ArrowRightIcon className="w-4 h-4" />
                    </Link>
                </motion.div>
            </div>
        );
    }

    // Invalid link
    if (status === "invalid" || status === "error") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md w-full bg-card border border-border rounded-2xl shadow-xl p-8 text-center"
                >
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <XCircleIcon className="w-10 h-10 text-red-600 dark:text-red-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">Invalid Link</h1>
                    <p className="text-muted-foreground mb-6">
                        {errorMessage || "This invite link is invalid or has been revoked."}
                    </p>
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                    >
                        Go to Login
                        <ArrowRightIcon className="w-4 h-4" />
                    </Link>
                </motion.div>
            </div>
        );
    }

    // Already a member
    if (status === "already_member") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full bg-card border border-border rounded-2xl shadow-xl p-8 text-center"
                >
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <UserGroupIcon className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">Already a Member</h1>
                    <p className="text-muted-foreground mb-4">
                        You're already a member of this workspace. Redirecting...
                    </p>
                    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
                </motion.div>
            </div>
        );
    }

    // Successfully joined
    if (status === "joined") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full bg-card border border-border rounded-2xl shadow-xl p-8 text-center"
                >
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <CheckCircleIcon className="w-10 h-10 text-green-600 dark:text-green-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">Welcome to the Team!</h1>
                    <p className="text-muted-foreground mb-4">
                        You've successfully joined <strong className="text-foreground">{linkData?.workspaceName}</strong>
                    </p>
                    <p className="text-sm text-muted-foreground">Redirecting you to the workspace...</p>
                </motion.div>
            </div>
        );
    }

    // Valid link — show join UI
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full bg-card border border-border rounded-2xl shadow-xl overflow-hidden"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-primary/20 to-primary/10 p-8 text-center">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                        <UserGroupIcon className="w-10 h-10 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">Join Workspace</h1>
                </div>

                {/* Content */}
                <div className="p-8">
                    <div className="text-center mb-6">
                        <p className="text-muted-foreground mb-2">You've been invited to join</p>
                        <h2 className="text-xl font-bold text-foreground">{linkData?.workspaceName}</h2>
                        <p className="text-sm text-muted-foreground mt-2">
                            as a <span className="capitalize font-medium text-primary">{linkData?.role}</span>
                        </p>
                    </div>

                    {/* Info box */}
                    <div className="bg-muted/50 rounded-lg p-4 mb-6">
                        <p className="text-sm text-muted-foreground">
                            <LinkIcon className="w-4 h-4 inline mr-1.5" />
                            You're joining via a shareable invite link
                        </p>
                    </div>

                    {/* Auth status and actions */}
                    {!isAuthenticated ? (
                        <div className="space-y-3">
                            <p className="text-sm text-center text-muted-foreground mb-4">
                                Sign in or create an account to join this workspace
                            </p>
                            <Link
                                href={`/login?redirect=/join/${token}`}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                            >
                                Sign In to Join
                                <ArrowRightIcon className="w-4 h-4" />
                            </Link>
                            <Link
                                href={`/register?redirect=/join/${token}`}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors"
                            >
                                Create Account
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="bg-muted/30 rounded-lg p-3 text-sm text-muted-foreground text-center">
                                Joining as <strong className="text-foreground">{user?.email}</strong>
                            </div>
                            <button
                                onClick={handleJoin}
                                disabled={isJoining}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#9ACD32] text-background font-medium hover:bg-[#8AB82E] transition-colors disabled:opacity-50"
                            >
                                {isJoining ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                                        Joining...
                                    </>
                                ) : (
                                    <>
                                        Join Workspace
                                        <CheckCircleIcon className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
