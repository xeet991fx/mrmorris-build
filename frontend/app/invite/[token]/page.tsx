"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    UserGroupIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { validateInvite, acceptInvite, InviteValidationResponse } from "@/lib/api/team";
import { useAuthStore } from "@/store/useAuthStore";
import Link from "next/link";

type InviteStatus = "loading" | "valid" | "expired" | "invalid" | "accepted" | "error";

export default function InvitePage() {
    const params = useParams();
    const router = useRouter();
    const token = params.token as string;

    const { isAuthenticated, user, isLoading: authLoading } = useAuthStore();

    const [status, setStatus] = useState<InviteStatus>("loading");
    const [inviteData, setInviteData] = useState<InviteValidationResponse["data"] | null>(null);
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [isAccepting, setIsAccepting] = useState(false);

    // Validate invite on mount
    useEffect(() => {
        const validate = async () => {
            try {
                const response = await validateInvite(token);
                if (response.success && response.data) {
                    setInviteData(response.data);
                    setStatus("valid");
                } else {
                    setErrorMessage(response.error || "Invalid invite link");
                    setStatus("invalid");
                }
            } catch (error: any) {
                const statusCode = error.response?.status;
                const message = error.response?.data?.error || "Failed to validate invite";

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

    const handleAcceptInvite = async () => {
        if (!isAuthenticated) {
            // Redirect to login with return URL
            router.push(`/login?redirect=/invite/${token}`);
            return;
        }

        // Check if logged in user's email matches invite email
        if (user?.email !== inviteData?.email) {
            toast.error(`This invite was sent to ${inviteData?.email}. Please log in with that account.`);
            return;
        }

        setIsAccepting(true);
        try {
            const response = await acceptInvite(token);
            if (response.success) {
                setStatus("accepted");
                toast.success(response.message || "You've joined the workspace!");

                // Redirect to the workspace after a short delay
                setTimeout(() => {
                    router.push(`/projects/${response.data?.workspaceId}`);
                }, 1500);
            } else {
                toast.error(response.error || "Failed to accept invite");
            }
        } catch (error: any) {
            const message = error.response?.data?.error || "Failed to accept invite";
            toast.error(message);

            if (error.response?.status === 410) {
                setStatus("expired");
                setErrorMessage(message);
            }
        } finally {
            setIsAccepting(false);
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
                        <UserGroupIcon className="w-8 h-8 text-primary" />
                    </div>
                    <p className="text-muted-foreground">Validating invite...</p>
                </motion.div>
            </div>
        );
    }

    // Expired invite
    if (status === "expired") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md w-full bg-card border border-border rounded-2xl shadow-xl p-8 text-center"
                >
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                        <ClockIcon className="w-10 h-10 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">Invite Expired</h1>
                    <p className="text-muted-foreground mb-6">
                        {errorMessage || "This invitation has expired. Please ask the team admin to send a new invite."}
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

    // Invalid invite
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
                    <h1 className="text-2xl font-bold text-foreground mb-2">Invalid Invite</h1>
                    <p className="text-muted-foreground mb-6">
                        {errorMessage || "This invitation link is invalid or has already been used."}
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

    // Successfully accepted
    if (status === "accepted") {
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
                        You've successfully joined <strong className="text-foreground">{inviteData?.workspaceName}</strong>
                    </p>
                    <p className="text-sm text-muted-foreground">Redirecting you to the workspace...</p>
                </motion.div>
            </div>
        );
    }

    // Valid invite - show accept UI
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
                    <h1 className="text-2xl font-bold text-foreground">You're Invited!</h1>
                </div>

                {/* Content */}
                <div className="p-8">
                    <div className="text-center mb-6">
                        <p className="text-muted-foreground mb-2">
                            <strong className="text-foreground">{inviteData?.inviterName}</strong> has invited you to join
                        </p>
                        <h2 className="text-xl font-bold text-foreground">{inviteData?.workspaceName}</h2>
                        <p className="text-sm text-muted-foreground mt-2">
                            as a <span className="capitalize font-medium text-primary">{inviteData?.role}</span>
                        </p>
                    </div>

                    {/* Email info */}
                    <div className="bg-muted/50 rounded-lg p-4 mb-6">
                        <p className="text-sm text-muted-foreground">
                            Invitation sent to: <strong className="text-foreground">{inviteData?.email}</strong>
                        </p>
                        {inviteData?.expiresAt && (
                            <p className="text-xs text-muted-foreground mt-1">
                                Expires: {new Date(inviteData.expiresAt).toLocaleDateString()}
                            </p>
                        )}
                    </div>

                    {/* Auth status and actions */}
                    {!isAuthenticated ? (
                        <div className="space-y-3">
                            <p className="text-sm text-center text-muted-foreground mb-4">
                                Sign in or create an account to accept this invitation
                            </p>
                            <Link
                                href={`/login?redirect=/invite/${token}`}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                            >
                                Sign In to Accept
                                <ArrowRightIcon className="w-4 h-4" />
                            </Link>
                            <Link
                                href={`/register?redirect=/invite/${token}`}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors"
                            >
                                Create Account
                            </Link>
                        </div>
                    ) : user?.email === inviteData?.email ? (
                        <button
                            onClick={handleAcceptInvite}
                            disabled={isAccepting}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#9ACD32] text-background font-medium hover:bg-[#8AB82E] transition-colors disabled:opacity-50"
                        >
                            {isAccepting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                                    Joining...
                                </>
                            ) : (
                                <>
                                    Accept Invitation
                                    <CheckCircleIcon className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    ) : (
                        <div className="space-y-3">
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                    You're signed in as <strong>{user?.email}</strong>, but this invite was sent to <strong>{inviteData?.email}</strong>.
                                </p>
                            </div>
                            <Link
                                href={`/login?redirect=/invite/${token}`}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors"
                            >
                                Sign in with {inviteData?.email}
                            </Link>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
