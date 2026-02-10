"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    UserGroupIcon,
    PlusIcon,
    TrashIcon,
    EnvelopeIcon,
    ShieldCheckIcon,
    UserIcon,
    EyeIcon,
    XMarkIcon,
    ArrowPathIcon,
    LinkIcon,
    ClipboardDocumentIcon,
    CheckIcon,
    MagnifyingGlassIcon,
    EllipsisVerticalIcon,
    ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import {
    Role,
    TeamMember,
    TeamOwner,
    InviteLink,
    getTeam,
    inviteTeamMember,
    updateMemberRole,
    removeMember,
    resendInvite,
    generateInviteLink,
    getInviteLink,
    revokeInviteLink,
} from "@/lib/api/team";
import { cn } from "@/lib/utils";

// ============================================
// CONSTANTS
// ============================================

const PROFESSION_META: Record<string, { emoji: string; color: string }> = {
    Engineering: { emoji: "🛠", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    Design: { emoji: "🎨", color: "bg-pink-500/10 text-pink-400 border-pink-500/20" },
    Product: { emoji: "📦", color: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
    Marketing: { emoji: "📣", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
    Sales: { emoji: "💼", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    Operations: { emoji: "⚙️", color: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
    HR: { emoji: "👥", color: "bg-teal-500/10 text-teal-400 border-teal-500/20" },
    Finance: { emoji: "💰", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    Support: { emoji: "🎧", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
    Leadership: { emoji: "👑", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
    Freelance: { emoji: "🚀", color: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
    Other: { emoji: "✨", color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
};

const ROLE_CONFIG: Record<Role, { label: string; color: string; bgColor: string; icon: any; desc: string }> = {
    owner: {
        label: "Owner",
        color: "text-purple-400",
        bgColor: "bg-purple-500/10 border-purple-500/20",
        icon: ShieldCheckIcon,
        desc: "Full access, billing, delete workspace",
    },
    admin: {
        label: "Admin",
        color: "text-blue-400",
        bgColor: "bg-blue-500/10 border-blue-500/20",
        icon: ShieldCheckIcon,
        desc: "Manage team, all CRM features",
    },
    member: {
        label: "Member",
        color: "text-emerald-400",
        bgColor: "bg-emerald-500/10 border-emerald-500/20",
        icon: UserIcon,
        desc: "Create and edit records",
    },
    viewer: {
        label: "Viewer",
        color: "text-zinc-400",
        bgColor: "bg-zinc-500/10 border-zinc-500/20",
        icon: EyeIcon,
        desc: "View only access",
    },
};

type FilterTab = "all" | "admin" | "member" | "viewer" | "pending";

// ============================================
// INVITE MODAL
// ============================================

type InviteTab = "email" | "link";

function InviteModal({
    isOpen,
    onClose,
    onInvite,
    workspaceId,
}: {
    isOpen: boolean;
    onClose: () => void;
    onInvite: (email: string, role: "admin" | "member" | "viewer") => Promise<void>;
    workspaceId: string;
}) {
    const [activeTab, setActiveTab] = useState<InviteTab>("email");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<"admin" | "member" | "viewer">("member");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Invite link state
    const [inviteLink, setInviteLink] = useState<InviteLink | null>(null);
    const [linkRole, setLinkRole] = useState<"member" | "viewer">("member");
    const [isLoadingLink, setIsLoadingLink] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const fetchInviteLink = useCallback(async () => {
        setIsLoadingLink(true);
        try {
            const response = await getInviteLink(workspaceId);
            if (response.success) {
                setInviteLink(response.data);
                if (response.data) {
                    setLinkRole(response.data.role);
                }
            }
        } catch {
            // No link exists or user doesn't have permission — that's fine
            setInviteLink(null);
        }
        setIsLoadingLink(false);
    }, [workspaceId]);

    useEffect(() => {
        if (activeTab === "link" && isOpen) {
            fetchInviteLink();
        }
    }, [activeTab, isOpen, fetchInviteLink]);

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        setIsSubmitting(true);
        await onInvite(email, role);
        setIsSubmitting(false);
        setEmail("");
        setRole("member");
        onClose();
    };

    const handleGenerateLink = async () => {
        setIsLoadingLink(true);
        try {
            const response = await generateInviteLink(workspaceId, linkRole);
            if (response.success && response.data) {
                setInviteLink(response.data);
                toast.success("Invite link created!");
            } else {
                toast.error(response.error || "Failed to generate link");
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to generate link");
        }
        setIsLoadingLink(false);
    };

    const handleRevokeLink = async () => {
        setIsLoadingLink(true);
        try {
            const response = await revokeInviteLink(workspaceId);
            if (response.success) {
                setInviteLink(null);
                // Also reset link role to default
                setLinkRole("member");
                toast.success("Link revoked!");
            } else {
                toast.error(response.error || "Failed to revoke link");
            }
        } catch (error: any) {
            console.error("Revoke link error:", error);
            toast.error(error.response?.data?.error || "Failed to revoke link");
        }
        setIsLoadingLink(false);
    };

    const handleCopyLink = async () => {
        if (!inviteLink?.url) return;
        try {
            await navigator.clipboard.writeText(inviteLink.url);
            setIsCopied(true);
            toast.success("Link copied to clipboard!");
            setTimeout(() => setIsCopied(false), 2000);
        } catch {
            toast.error("Failed to copy link");
        }
    };

    const handleLinkRoleChange = async (newRole: "member" | "viewer") => {
        setLinkRole(newRole);
        if (inviteLink) {
            try {
                const response = await generateInviteLink(workspaceId, newRole);
                if (response.success && response.data) {
                    setInviteLink(response.data);
                    toast.success("Link role updated!");
                }
            } catch {
                toast.error("Failed to update role");
            }
        }
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="w-full max-w-lg bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden mx-4"
            >
                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-border/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                <UserGroupIcon className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-foreground">Invite People</h2>
                                <p className="text-xs text-muted-foreground">Add team members to your workspace</p>
                            </div>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={onClose}
                            className="p-2 rounded-xl hover:bg-muted/50 transition-colors"
                        >
                            <XMarkIcon className="w-5 h-5 text-muted-foreground" />
                        </motion.button>
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex gap-1 mt-4 p-1 rounded-xl bg-muted/30">
                        {[
                            { id: "email" as InviteTab, label: "Email Invite", icon: EnvelopeIcon },
                            { id: "link" as InviteTab, label: "Invite Link", icon: LinkIcon },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                                    activeTab === tab.id
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {activeTab === "email" && (
                        <form onSubmit={handleEmailSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-foreground">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder:text-muted-foreground"
                                    placeholder="colleague@company.com"
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-foreground">Role</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(["admin", "member", "viewer"] as const).map((r) => {
                                        const config = ROLE_CONFIG[r];
                                        const Icon = config.icon;
                                        return (
                                            <button
                                                key={r}
                                                type="button"
                                                onClick={() => setRole(r)}
                                                className={cn(
                                                    "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200",
                                                    role === r
                                                        ? "border-primary bg-primary/5"
                                                        : "border-border/50 hover:border-border bg-muted/20 hover:bg-muted/30"
                                                )}
                                            >
                                                <Icon className={cn("w-5 h-5", role === r ? "text-primary" : "text-muted-foreground")} />
                                                <span className={cn("text-xs font-medium", role === r ? "text-primary" : "text-muted-foreground")}>
                                                    {config.label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {ROLE_CONFIG[role].desc}
                                </p>
                            </div>

                            <div className="flex gap-3 justify-end pt-2">
                                <motion.button
                                    type="button"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={onClose}
                                    className="px-5 py-2.5 rounded-xl bg-muted/50 text-foreground font-medium hover:bg-muted transition-all"
                                >
                                    Cancel
                                </motion.button>
                                <motion.button
                                    type="submit"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    disabled={isSubmitting || !email.trim()}
                                    className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
                                >
                                    {isSubmitting ? (
                                        <span className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                            Sending...
                                        </span>
                                    ) : (
                                        "Send Invite"
                                    )}
                                </motion.button>
                            </div>
                        </form>
                    )}

                    {activeTab === "link" && (
                        <div className="space-y-4">
                            {isLoadingLink ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                </div>
                            ) : inviteLink ? (
                                <>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-foreground">Shareable Link</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                readOnly
                                                value={inviteLink.url}
                                                className="flex-1 px-4 py-3 rounded-xl bg-muted/30 border border-border/50 text-foreground text-sm focus:outline-none select-all truncate"
                                            />
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={handleCopyLink}
                                                className={cn(
                                                    "px-4 py-3 rounded-xl font-medium transition-all flex items-center gap-2 text-sm",
                                                    isCopied
                                                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                                        : "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                                                )}
                                            >
                                                {isCopied ? <CheckIcon className="w-4 h-4" /> : <ClipboardDocumentIcon className="w-4 h-4" />}
                                                {isCopied ? "Copied!" : "Copy"}
                                            </motion.button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-foreground">
                                            Anyone with link joins as
                                        </label>
                                        <select
                                            value={linkRole}
                                            onChange={(e) => handleLinkRoleChange(e.target.value as any)}
                                            className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                        >
                                            <option value="member">Member — Create and edit records</option>
                                            <option value="viewer">Viewer — View only access</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                                        <span>{inviteLink.usageCount} {inviteLink.usageCount === 1 ? "person" : "people"} joined via this link</span>
                                        <span>Created {new Date(inviteLink.createdAt).toLocaleDateString()}</span>
                                    </div>

                                    <button
                                        onClick={handleRevokeLink}
                                        className="w-full px-4 py-2.5 rounded-xl text-red-400 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 font-medium text-sm transition-all"
                                    >
                                        Revoke Link
                                    </button>
                                </>
                            ) : (
                                <div className="text-center py-6 space-y-4">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto">
                                        <LinkIcon className="w-7 h-7 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-foreground font-medium mb-1">Create a shareable invite link</p>
                                        <p className="text-sm text-muted-foreground">
                                            Anyone with the link can join your workspace
                                        </p>
                                    </div>
                                    <select
                                        value={linkRole}
                                        onChange={(e) => setLinkRole(e.target.value as any)}
                                        className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-border/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                    >
                                        <option value="member">Member — Create and edit records</option>
                                        <option value="viewer">Viewer — View only access</option>
                                    </select>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleGenerateLink}
                                        className="w-full px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all"
                                    >
                                        Generate Invite Link
                                    </motion.button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

// ============================================
// MEMBER ROW
// ============================================

function MemberRow({
    member,
    currentUserRole,
    onUpdateRole,
    onRemove,
    onResend,
    index,
}: {
    member: TeamMember | TeamOwner;
    currentUserRole: Role | null;
    onUpdateRole: (memberId: string, role: "admin" | "member" | "viewer") => void;
    onRemove: (memberId: string) => void;
    onResend: (memberId: string) => void;
    index: number;
}) {
    const [showActions, setShowActions] = useState(false);
    const role = member.role;
    const roleConfig = ROLE_CONFIG[role];
    const RoleIcon = roleConfig.icon;
    const isTeamMember = role !== "owner" && "_id" in member;
    const isOwnerEntry = role === "owner";
    const userInfo = isTeamMember ? (member as TeamMember).userId : (member as TeamOwner);
    const canManage = currentUserRole === "owner" || (currentUserRole === "admin" && role !== "admin" && role !== "owner");
    const isPending = isTeamMember && (member as TeamMember).status === "pending";

    const displayName = userInfo?.name || (isOwnerEntry ? userInfo?.email : null);
    const displayEmail = userInfo?.email || (member as TeamMember).inviteEmail;
    const avatarLetter = (displayName || displayEmail)?.charAt(0).toUpperCase();
    const profession = (userInfo as any)?.profession;
    const professionMeta = profession ? PROFESSION_META[profession] : null;

    const joinedAt = isTeamMember ? (member as TeamMember).joinedAt || (member as TeamMember).createdAt : null;
    const timeAgo = joinedAt ? getTimeAgo(new Date(joinedAt)) : null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03, type: "spring", stiffness: 400, damping: 30 }}
            className={cn("group relative", showActions ? "z-20" : "")}
            onMouseLeave={() => setShowActions(false)}
        >
            <div className="flex items-center gap-4 px-5 py-4 rounded-xl hover:bg-muted/30 transition-all duration-200">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                    {userInfo?.profilePicture ? (
                        <img
                            src={(userInfo as any).profilePicture}
                            alt={displayName || ""}
                            className="w-11 h-11 rounded-xl object-cover"
                        />
                    ) : (
                        <div className={cn(
                            "w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold",
                            isOwnerEntry
                                ? "bg-gradient-to-br from-purple-500/30 to-purple-600/10 text-purple-400"
                                : isPending
                                    ? "bg-gradient-to-br from-amber-500/20 to-amber-600/5 text-amber-400"
                                    : "bg-gradient-to-br from-primary/20 to-primary/5 text-primary"
                        )}>
                            {avatarLetter || "?"}
                        </div>
                    )}
                    {/* Online dot for owner */}
                    {isOwnerEntry && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-card rounded-full" />
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground truncate">
                            {displayName || "Pending Invite"}
                        </p>
                        {isPending && (
                            <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                Pending
                            </span>
                        )}
                        {professionMeta && (
                            <span className={cn("px-2 py-0.5 text-[10px] font-medium rounded-md border", professionMeta.color)}>
                                {professionMeta.emoji} {profession}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
                        {timeAgo && !isPending && (
                            <span className="text-[10px] text-muted-foreground/60">· Joined {timeAgo}</span>
                        )}
                    </div>
                </div>

                {/* Role Badge */}
                <div className="flex items-center gap-2">
                    {canManage && isTeamMember && !isPending ? (
                        <select
                            value={role}
                            onChange={(e) => onUpdateRole((member as TeamMember)._id, e.target.value as any)}
                            className={cn(
                                "px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer appearance-none pr-7 bg-transparent focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all",
                                roleConfig.bgColor,
                                roleConfig.color
                            )}
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`, backgroundPosition: 'right 4px center', backgroundRepeat: 'no-repeat', backgroundSize: '16px' }}
                        >
                            <option value="admin">Admin</option>
                            <option value="member">Member</option>
                            <option value="viewer">Viewer</option>
                        </select>
                    ) : (
                        <span className={cn(
                            "px-3 py-1.5 text-xs font-medium rounded-lg border flex items-center gap-1.5",
                            roleConfig.bgColor,
                            roleConfig.color
                        )}>
                            <RoleIcon className="w-3.5 h-3.5" />
                            {roleConfig.label}
                        </span>
                    )}
                </div>

                {/* Actions */}
                {canManage && isTeamMember && (
                    <div className="relative">
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setShowActions(!showActions)}
                            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all opacity-0 group-hover:opacity-100"
                        >
                            <EllipsisVerticalIcon className="w-4 h-4" />
                        </motion.button>

                        <AnimatePresence>
                            {showActions && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                    className="absolute right-0 top-full mt-1 w-40 bg-card border border-border/50 rounded-xl shadow-xl z-20 overflow-hidden"
                                >
                                    {isPending && (
                                        <button
                                            onClick={() => {
                                                onResend((member as TeamMember)._id);
                                                setShowActions(false);
                                            }}
                                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                                        >
                                            <ArrowPathIcon className="w-4 h-4" />
                                            Resend Invite
                                        </button>
                                    )}
                                    <button
                                        onClick={() => {
                                            onRemove((member as TeamMember)._id);
                                            setShowActions(false);
                                        }}
                                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/5 transition-colors"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                        Remove
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

// ============================================
// HELPERS
// ============================================

function getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "today";
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
}

// ============================================
// MAIN PAGE
// ============================================

export default function TeamSettingsPage() {
    const params = useParams();
    const workspaceId = params.id as string;

    const [owner, setOwner] = useState<TeamOwner | null>(null);
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);
    const [isOwner, setIsOwner] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [showInviteModal, setShowInviteModal] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");
    const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

    const fetchTeam = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await getTeam(workspaceId);
            if (response.success && response.data) {
                setOwner(response.data.owner);
                setMembers(response.data.members);
                setIsOwner(response.data.isOwner);
                setCurrentUserRole(response.data.currentUserRole);
            }
        } catch (error) {
            console.error("Failed to fetch team:", error);
            toast.error("Failed to load team");
        }
        setIsLoading(false);
    }, [workspaceId]);

    useEffect(() => {
        if (workspaceId) fetchTeam();
    }, [workspaceId, fetchTeam]);

    const handleInvite = async (email: string, role: "admin" | "member" | "viewer") => {
        try {
            const response = await inviteTeamMember(workspaceId, { email, role });
            if (response.success) {
                toast.success(response.message || "Invite sent!");
                fetchTeam();
            } else {
                toast.error(response.error || "Failed to send invite");
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to send invite");
        }
    };

    const handleUpdateRole = async (memberId: string, role: "admin" | "member" | "viewer") => {
        try {
            const response = await updateMemberRole(workspaceId, memberId, role);
            if (response.success) {
                toast.success("Role updated!");
                fetchTeam();
            }
        } catch {
            toast.error("Failed to update role");
        }
    };

    const handleRemove = async (memberId: string) => {
        if (!confirm("Remove this team member?")) return;
        try {
            const response = await removeMember(workspaceId, memberId);
            if (response.success) {
                toast.success("Member removed");
                fetchTeam();
            }
        } catch {
            toast.error("Failed to remove member");
        }
    };

    const handleResend = async (memberId: string) => {
        try {
            const response = await resendInvite(workspaceId, memberId);
            if (response.success) {
                toast.success(response.message || "Invite resent!");
            } else {
                toast.error(response.error || "Failed to resend invite");
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to resend invite");
        }
    };

    const canInvite = currentUserRole === "owner" || currentUserRole === "admin";

    // Filter & search
    const allMembers = useMemo(() => {
        const list: (TeamMember | TeamOwner)[] = [];
        if (owner) list.push(owner);
        list.push(...members);
        return list;
    }, [owner, members]);

    const filteredMembers = useMemo(() => {
        let result = allMembers;

        // Filter by tab
        if (activeFilter === "pending") {
            result = result.filter((m) => m.role !== "owner" && (m as TeamMember).status === "pending");
        } else if (activeFilter !== "all") {
            result = result.filter((m) => m.role === activeFilter);
        }

        // Search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter((m) => {
                const info = m.role !== "owner" ? (m as TeamMember).userId : m;
                const name = (info as any)?.name?.toLowerCase() || "";
                const email = (info as any)?.email?.toLowerCase() || (m as TeamMember).inviteEmail?.toLowerCase() || "";
                return name.includes(q) || email.includes(q);
            });
        }

        return result;
    }, [allMembers, activeFilter, searchQuery]);

    // Tab counts
    const counts = useMemo(() => ({
        all: allMembers.length,
        admin: allMembers.filter((m) => m.role === "admin").length,
        member: allMembers.filter((m) => m.role === "member").length,
        viewer: allMembers.filter((m) => m.role === "viewer").length,
        pending: members.filter((m) => m.status === "pending").length,
    }), [allMembers, members]);

    const FILTER_TABS: { id: FilterTab; label: string }[] = [
        { id: "all", label: "All" },
        { id: "admin", label: "Admins" },
        { id: "member", label: "Members" },
        { id: "viewer", label: "Viewers" },
        { id: "pending", label: "Pending" },
    ];

    return (
        <div className="min-h-screen">
            <AnimatePresence>
                {showInviteModal && (
                    <InviteModal
                        isOpen={showInviteModal}
                        onClose={() => setShowInviteModal(false)}
                        onInvite={handleInvite}
                        workspaceId={workspaceId}
                    />
                )}
            </AnimatePresence>

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-8 pt-8 pb-2"
            >
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                            <UserGroupIcon className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Team</h1>
                            <p className="text-sm text-muted-foreground">
                                {allMembers.length} {allMembers.length === 1 ? "member" : "members"} in this workspace
                            </p>
                        </div>
                    </div>
                    {canInvite && (
                        <motion.button
                            whileHover={{ scale: 1.02, y: -1 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setShowInviteModal(true)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
                        >
                            <PlusIcon className="w-5 h-5" />
                            Invite People
                        </motion.button>
                    )}
                </div>

                {/* Search + Filter Bar */}
                <div className="flex items-center gap-4">
                    {/* Search */}
                    <div className="relative flex-1 max-w-sm">
                        <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted/30 border border-border/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all placeholder:text-muted-foreground"
                            placeholder="Search by name or email..."
                        />
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex gap-1 p-1 rounded-xl bg-muted/20 border border-border/30">
                        {FILTER_TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveFilter(tab.id)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5",
                                    activeFilter === tab.id
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {tab.label}
                                {counts[tab.id] > 0 && (
                                    <span className={cn(
                                        "px-1.5 py-0.5 text-[10px] font-semibold rounded-md",
                                        activeFilter === tab.id
                                            ? "bg-primary/10 text-primary"
                                            : "bg-muted/50 text-muted-foreground"
                                    )}>
                                        {counts[tab.id]}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* Member List */}
            <div className="px-8 pt-4 pb-8">
                {isLoading ? (
                    <div className="space-y-2">
                        {[1, 2, 3, 4].map((i) => (
                            <div
                                key={i}
                                className="h-[72px] rounded-xl bg-muted/20 animate-pulse"
                                style={{ animationDelay: `${i * 100}ms` }}
                            />
                        ))}
                    </div>
                ) : filteredMembers.length > 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="rounded-2xl border border-border/30 bg-card/30 divide-y divide-border/20"
                    >
                        {filteredMembers.map((member, index) => (
                            <MemberRow
                                key={(member as any)._id || `owner-${index}`}
                                member={member}
                                currentUserRole={currentUserRole}
                                onUpdateRole={handleUpdateRole}
                                onRemove={handleRemove}
                                onResend={handleResend}
                                index={index}
                            />
                        ))}
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-20 rounded-2xl border border-dashed border-border/40 bg-muted/10"
                    >
                        {searchQuery || activeFilter !== "all" ? (
                            <>
                                <MagnifyingGlassIcon className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                                <h3 className="text-lg font-medium text-foreground mb-1">No results found</h3>
                                <p className="text-sm text-muted-foreground">
                                    Try a different search or filter
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mx-auto mb-4">
                                    <UserGroupIcon className="w-8 h-8 text-primary/60" />
                                </div>
                                <h3 className="text-lg font-medium text-foreground mb-1">No team members yet</h3>
                                <p className="text-sm text-muted-foreground mb-6">Invite colleagues to start collaborating</p>
                                {canInvite && (
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setShowInviteModal(true)}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all"
                                    >
                                        <PlusIcon className="w-5 h-5" />
                                        Invite People
                                    </motion.button>
                                )}
                            </>
                        )}
                    </motion.div>
                )}

                {/* Role Permissions Legend */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mt-8"
                >
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">
                        Role Permissions
                    </h3>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {(Object.entries(ROLE_CONFIG) as [Role, typeof ROLE_CONFIG[Role]][]).map(([key, config]) => {
                            const Icon = config.icon;
                            return (
                                <div
                                    key={key}
                                    className={cn(
                                        "flex items-start gap-2.5 p-3 rounded-xl border",
                                        config.bgColor
                                    )}
                                >
                                    <Icon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", config.color)} />
                                    <div>
                                        <p className={cn("text-xs font-semibold", config.color)}>{config.label}</p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">{config.desc}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
