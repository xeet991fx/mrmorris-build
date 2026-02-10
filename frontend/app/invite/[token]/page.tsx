"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    CheckIcon,
    UserGroupIcon,
    ArrowRightIcon,
    SparklesIcon,
    ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";
import { validateInvite, acceptInvite } from "@/lib/api/team";
import { updateProfile } from "@/lib/api/auth";
import type { Role } from "@/lib/api/team";
import { cn } from "@/lib/utils";

// ============================================
// PROFESSION DATA
// ============================================

const PROFESSIONS = [
    { id: "Engineering", emoji: "🛠", label: "Engineering", desc: "Building & coding" },
    { id: "Design", emoji: "🎨", label: "Design", desc: "UI/UX & visual" },
    { id: "Product", emoji: "📦", label: "Product", desc: "Strategy & roadmap" },
    { id: "Marketing", emoji: "📣", label: "Marketing", desc: "Growth & content" },
    { id: "Sales", emoji: "💼", label: "Sales", desc: "Revenue & deals" },
    { id: "Operations", emoji: "⚙️", label: "Operations", desc: "Process & systems" },
    { id: "HR", emoji: "👥", label: "HR", desc: "People & culture" },
    { id: "Finance", emoji: "💰", label: "Finance", desc: "Budget & planning" },
    { id: "Support", emoji: "🎧", label: "Support", desc: "Customer success" },
    { id: "Leadership", emoji: "👑", label: "Leadership", desc: "Vision & direction" },
    { id: "Freelance", emoji: "🚀", label: "Freelance", desc: "Independent work" },
    { id: "Other", emoji: "✨", label: "Other", desc: "Something else" },
];

const ROLE_LABELS: Record<string, string> = {
    owner: "Owner",
    admin: "Admin",
    member: "Member",
    viewer: "Viewer",
};

// ============================================
// ANIMATED BACKGROUND
// ============================================

function AnimatedBackground() {
    return (
        <div className="fixed inset-0 -z-10 overflow-hidden">
            <div className="absolute inset-0 bg-background" />
            {/* Subtle gradient orbs */}
            <motion.div
                animate={{
                    x: [0, 30, -20, 0],
                    y: [0, -40, 20, 0],
                    scale: [1, 1.1, 0.95, 1],
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px]"
            />
            <motion.div
                animate={{
                    x: [0, -30, 20, 0],
                    y: [0, 20, -30, 0],
                    scale: [1, 0.95, 1.1, 1],
                }}
                transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-purple-500/5 blur-[120px]"
            />
        </div>
    );
}

// ============================================
// STEP 1: WELCOME
// ============================================

function WelcomeStep({
    workspaceName,
    inviterName,
    role,
    email,
    expiresAt,
    isAuthenticated,
    userEmail,
    isAccepting,
    onAccept,
}: {
    workspaceName: string;
    inviterName: string;
    role: string;
    email: string;
    expiresAt: string;
    isAuthenticated: boolean;
    userEmail?: string;
    isAccepting: boolean;
    onAccept: () => void;
}) {
    const router = useRouter();
    const params = useParams();
    const token = params.token as string;
    const needsAuth = !isAuthenticated;
    const wrongEmail = isAuthenticated && userEmail && userEmail !== email;

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full max-w-md mx-auto text-center"
        >
            {/* Workspace Icon */}
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.1 }}
                className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 flex items-center justify-center mx-auto mb-6"
            >
                <UserGroupIcon className="w-10 h-10 text-primary" />
            </motion.div>

            {/* Title */}
            <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-3xl font-bold text-foreground mb-2"
            >
                Join {workspaceName}
            </motion.h1>

            <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-muted-foreground mb-8"
            >
                <span className="font-medium text-foreground">{inviterName}</span> invited you to collaborate
            </motion.p>

            {/* Invite Details Card */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 mb-8 text-left space-y-4"
            >
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Workspace</span>
                    <span className="text-sm font-medium text-foreground">{workspaceName}</span>
                </div>
                <div className="h-px bg-border/30" />
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Your role</span>
                    <span className="text-sm font-medium text-foreground">{ROLE_LABELS[role] || role}</span>
                </div>
                <div className="h-px bg-border/30" />
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Invited as</span>
                    <span className="text-sm font-medium text-foreground">{email}</span>
                </div>
                {expiresAt && (
                    <>
                        <div className="h-px bg-border/30" />
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Expires</span>
                            <span className="text-sm font-medium text-foreground">
                                {new Date(expiresAt).toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                })}
                            </span>
                        </div>
                    </>
                )}
            </motion.div>

            {/* Actions */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-3"
            >
                {wrongEmail && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm mb-4">
                        <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
                        <p>You&apos;re signed in as <strong>{userEmail}</strong>. This invite is for <strong>{email}</strong>.</p>
                    </div>
                )}

                {needsAuth ? (
                    <>
                        <motion.button
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => router.push(`/login?redirect=/invite/${token}`)}
                            className="w-full px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-lg hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                        >
                            Sign in to accept
                            <ArrowRightIcon className="w-5 h-5" />
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => router.push(`/register?redirect=/invite/${token}`)}
                            className="w-full px-6 py-3 rounded-xl bg-muted/50 text-foreground font-medium hover:bg-muted transition-all"
                        >
                            Create an account
                        </motion.button>
                    </>
                ) : wrongEmail ? (
                    <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => router.push(`/login?redirect=/invite/${token}`)}
                        className="w-full px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-lg hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                    >
                        Sign in as {email}
                        <ArrowRightIcon className="w-5 h-5" />
                    </motion.button>
                ) : (
                    <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onAccept}
                        disabled={isAccepting}
                        className="w-full px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-lg hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isAccepting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                Joining...
                            </>
                        ) : (
                            <>
                                Accept & Join
                                <ArrowRightIcon className="w-5 h-5" />
                            </>
                        )}
                    </motion.button>
                )}
            </motion.div>
        </motion.div>
    );
}

// ============================================
// STEP 2: PROFESSION SELECTION
// ============================================

function ProfessionStep({
    onSelect,
    onSkip,
    isSubmitting,
}: {
    onSelect: (profession: string) => void;
    onSkip: () => void;
    isSubmitting: boolean;
}) {
    const [selected, setSelected] = useState<string | null>(null);

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full max-w-lg mx-auto text-center"
        >
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 border border-violet-500/10 flex items-center justify-center mx-auto mb-6"
            >
                <SparklesIcon className="w-8 h-8 text-violet-400" />
            </motion.div>

            <h2 className="text-2xl font-bold text-foreground mb-2">
                What kind of work do you do?
            </h2>
            <p className="text-muted-foreground mb-8">
                This helps your team understand your expertise
            </p>

            {/* Profession Grid */}
            <div className="grid grid-cols-3 gap-2.5 mb-8">
                {PROFESSIONS.map((p, i) => (
                    <motion.button
                        key={p.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.03, type: "spring", stiffness: 400, damping: 25 }}
                        whileHover={{ scale: 1.04, y: -2 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setSelected(p.id)}
                        className={cn(
                            "relative flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all duration-200",
                            selected === p.id
                                ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                                : "border-border/40 bg-card/30 hover:border-border hover:bg-card/60"
                        )}
                    >
                        {/* Check indicator */}
                        <AnimatePresence>
                            {selected === p.id && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 0 }}
                                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center"
                                >
                                    <CheckIcon className="w-3 h-3 text-primary-foreground" />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <span className="text-2xl">{p.emoji}</span>
                        <span className={cn(
                            "text-xs font-semibold",
                            selected === p.id ? "text-primary" : "text-foreground"
                        )}>
                            {p.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground leading-tight">{p.desc}</span>
                    </motion.button>
                ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onSkip}
                    disabled={isSubmitting}
                    className="flex-1 px-5 py-3 rounded-xl bg-muted/50 text-foreground font-medium hover:bg-muted transition-all disabled:opacity-50"
                >
                    Skip for now
                </motion.button>
                <motion.button
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => selected && onSelect(selected)}
                    disabled={!selected || isSubmitting}
                    className="flex-1 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {isSubmitting ? (
                        <>
                            <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            Continue
                            <ArrowRightIcon className="w-4 h-4" />
                        </>
                    )}
                </motion.button>
            </div>
        </motion.div>
    );
}

// ============================================
// STEP 3: SUCCESS
// ============================================

function SuccessStep({
    workspaceName,
    profession,
    workspaceId,
}: {
    workspaceName: string;
    profession?: string;
    workspaceId: string;
}) {
    const router = useRouter();
    const professionData = profession ? PROFESSIONS.find((p) => p.id === profession) : null;

    useEffect(() => {
        const timeout = setTimeout(() => {
            router.push(`/projects/${workspaceId}`);
        }, 3000);
        return () => clearTimeout(timeout);
    }, [router, workspaceId]);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-full max-w-md mx-auto text-center"
        >
            {/* Success Animation */}
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}
                className="relative w-24 h-24 mx-auto mb-8"
            >
                {/* Ring pulse */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: [0.8, 1.5, 2], opacity: [0.5, 0.2, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                    className="absolute inset-0 rounded-full border-2 border-emerald-500/30"
                />
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: [0.8, 1.5, 2], opacity: [0.5, 0.2, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.3 }}
                    className="absolute inset-0 rounded-full border-2 border-emerald-500/20"
                />
                {/* Check circle */}
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/20 flex items-center justify-center">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.3 }}
                    >
                        <CheckIcon className="w-12 h-12 text-emerald-400" />
                    </motion.div>
                </div>
            </motion.div>

            <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-bold text-foreground mb-2"
            >
                Welcome aboard! 🎉
            </motion.h2>

            <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-muted-foreground mb-4"
            >
                You&apos;ve successfully joined <span className="font-semibold text-foreground">{workspaceName}</span>
            </motion.p>

            {professionData && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-card/50 border border-border/50 text-sm mb-6"
                >
                    <span>{professionData.emoji}</span>
                    <span className="text-muted-foreground">Joined as</span>
                    <span className="font-medium text-foreground">{professionData.label}</span>
                </motion.div>
            )}

            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-sm text-muted-foreground mt-6"
            >
                Redirecting you to the workspace...
            </motion.p>

            <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 3, ease: "linear" }}
                className="h-1 bg-gradient-to-r from-primary/50 to-primary rounded-full mt-4 mx-auto max-w-xs"
            />
        </motion.div>
    );
}

// ============================================
// MAIN INVITE PAGE
// ============================================

type Step = "welcome" | "profession" | "success";

export default function InvitePage() {
    const params = useParams();
    const token = params.token as string;
    const { user, isAuthenticated } = useAuthStore();

    const [step, setStep] = useState<Step>("welcome");
    const [isLoading, setIsLoading] = useState(true);
    const [isAccepting, setIsAccepting] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedProfession, setSelectedProfession] = useState<string | undefined>();
    const [joinedWorkspaceId, setJoinedWorkspaceId] = useState<string>("");

    const [inviteData, setInviteData] = useState<{
        workspaceName: string;
        inviterName: string;
        email: string;
        role: string;
        expiresAt: string;
    } | null>(null);

    // Validate invite
    useEffect(() => {
        if (!token) return;
        (async () => {
            setIsLoading(true);
            try {
                const response = await validateInvite(token);
                if (response.success && response.data) {
                    setInviteData(response.data);
                } else {
                    setError(response.error || "Invalid or expired invite");
                }
            } catch (error: any) {
                setError(error.response?.data?.error || "Failed to validate invite");
            }
            setIsLoading(false);
        })();
    }, [token]);

    const handleAccept = async () => {
        setIsAccepting(true);
        try {
            const response = await acceptInvite(token);
            if (response.success) {
                setJoinedWorkspaceId(response.data?.workspaceId || "");
                setStep("profession");
                toast.success("Invite accepted!");
            } else {
                toast.error(response.error || "Failed to accept invite");
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to accept invite");
        }
        setIsAccepting(false);
    };

    const handleProfessionSelect = async (profession: string) => {
        setIsSubmitting(true);
        try {
            await updateProfile({ profession });
            setSelectedProfession(profession);
            setStep("success");
        } catch {
            toast.error("Failed to save profession, but you're still in!");
            setStep("success");
        }
        setIsSubmitting(false);
    };

    const handleProfessionSkip = () => {
        setStep("success");
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <AnimatedBackground />
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground">Validating invite...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <AnimatedBackground />
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md text-center"
                >
                    <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
                        <ExclamationTriangleIcon className="w-8 h-8 text-red-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">Invite not valid</h2>
                    <p className="text-muted-foreground mb-6">{error}</p>
                    <motion.a
                        href="/login"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all"
                    >
                        Go to Login
                    </motion.a>
                </motion.div>
            </div>
        );
    }

    if (!inviteData) return null;

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12">
            <AnimatedBackground />

            {/* Step indicator */}
            <div className="fixed top-8 left-1/2 -translate-x-1/2 z-10">
                <div className="flex items-center gap-2">
                    {(["welcome", "profession", "success"] as Step[]).map((s, i) => (
                        <div key={s} className="flex items-center gap-2">
                            <motion.div
                                animate={{
                                    scale: step === s ? 1.2 : 1,
                                    backgroundColor:
                                        step === s
                                            ? "hsl(var(--primary))"
                                            : (["welcome", "profession", "success"].indexOf(step) > i)
                                                ? "hsl(var(--primary) / 0.5)"
                                                : "hsl(var(--muted))",
                                }}
                                className="w-2.5 h-2.5 rounded-full transition-colors"
                            />
                            {i < 2 && (
                                <div className={cn(
                                    "w-8 h-0.5 rounded-full transition-colors",
                                    (["welcome", "profession", "success"].indexOf(step) > i)
                                        ? "bg-primary/50"
                                        : "bg-muted"
                                )} />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <AnimatePresence mode="wait">
                {step === "welcome" && (
                    <WelcomeStep
                        key="welcome"
                        workspaceName={inviteData.workspaceName}
                        inviterName={inviteData.inviterName}
                        role={inviteData.role}
                        email={inviteData.email}
                        expiresAt={inviteData.expiresAt}
                        isAuthenticated={isAuthenticated}
                        userEmail={user?.email}
                        isAccepting={isAccepting}
                        onAccept={handleAccept}
                    />
                )}
                {step === "profession" && (
                    <ProfessionStep
                        key="profession"
                        onSelect={handleProfessionSelect}
                        onSkip={handleProfessionSkip}
                        isSubmitting={isSubmitting}
                    />
                )}
                {step === "success" && (
                    <SuccessStep
                        key="success"
                        workspaceName={inviteData.workspaceName}
                        profession={selectedProfession}
                        workspaceId={joinedWorkspaceId}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
