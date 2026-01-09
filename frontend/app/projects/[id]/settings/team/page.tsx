"use client";

import { useEffect, useState } from "react";
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
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import {
    Role,
    TeamMember,
    TeamOwner,
    getTeam,
    inviteTeamMember,
    updateMemberRole,
    removeMember,
    resendInvite,
} from "@/lib/api/team";
import { cn } from "@/lib/utils";

// ============================================
// ROLE BADGES
// ============================================

const ROLE_BADGES: Record<Role, { label: string; color: string; icon: any }> = {
    owner: {
        label: "Owner",
        color: "bg-purple-500/10 text-purple-400",
        icon: ShieldCheckIcon,
    },
    admin: {
        label: "Admin",
        color: "bg-blue-500/10 text-blue-400",
        icon: ShieldCheckIcon,
    },
    member: {
        label: "Member",
        color: "bg-emerald-500/10 text-emerald-400",
        icon: UserIcon,
    },
    viewer: {
        label: "Viewer",
        color: "bg-zinc-500/10 text-zinc-400",
        icon: EyeIcon,
    },
};

// ============================================
// INVITE MODAL
// ============================================

function InviteModal({
    isOpen,
    onClose,
    onInvite,
}: {
    isOpen: boolean;
    onClose: () => void;
    onInvite: (email: string, role: "admin" | "member" | "viewer") => Promise<void>;
}) {
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<"admin" | "member" | "viewer">("member");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        setIsSubmitting(true);
        await onInvite(email, role);
        setIsSubmitting(false);
        setEmail("");
        setRole("member");
        onClose();
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="w-full max-w-md bg-gradient-to-br from-card to-card/95 rounded-2xl shadow-2xl p-6 mx-4"
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-foreground">Invite Team Member</h2>
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-muted/50 transition-colors"
                    >
                        <XMarkIcon className="w-5 h-5 text-muted-foreground" />
                    </motion.button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-background/60 backdrop-blur-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300 placeholder:text-muted-foreground"
                            placeholder="colleague@company.com"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Role
                        </label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value as any)}
                            className="w-full px-4 py-3 rounded-xl bg-background/60 backdrop-blur-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300"
                        >
                            <option value="admin">Admin - Full access, can manage team</option>
                            <option value="member">Member - Create and edit records</option>
                            <option value="viewer">Viewer - View only access</option>
                        </select>
                    </div>
                    <div className="flex gap-3 justify-end pt-4">
                        <motion.button
                            type="button"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl bg-muted/50 text-foreground font-medium hover:bg-muted transition-all duration-300"
                        >
                            Cancel
                        </motion.button>
                        <motion.button
                            type="submit"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={isSubmitting || !email.trim()}
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-medium hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 disabled:opacity-50"
                        >
                            {isSubmitting ? "Sending..." : "Send Invite"}
                        </motion.button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}

// ============================================
// TEAM MEMBER CARD
// ============================================

function TeamMemberCard({
    member,
    isOwner,
    currentUserRole,
    onUpdateRole,
    onRemove,
    onResend,
    index,
}: {
    member: TeamMember | TeamOwner;
    isOwner: boolean;
    currentUserRole: Role | null;
    onUpdateRole: (memberId: string, role: "admin" | "member" | "viewer") => void;
    onRemove: (memberId: string) => void;
    onResend: (memberId: string) => void;
    index: number;
}) {
    const role = member.role;
    const badge = ROLE_BADGES[role];
    const BadgeIcon = badge.icon;
    const isTeamMember = role !== "owner" && "_id" in member;
    const userInfo = isTeamMember
        ? (member as TeamMember).userId
        : (member as TeamOwner);
    const canManage = currentUserRole === "owner" || (currentUserRole === "admin" && role !== "admin" && role !== "owner");
    const isPending = isTeamMember && (member as TeamMember).status === "pending";

    const displayName = userInfo?.name || (role === "owner" ? userInfo?.email : null);
    const displayEmail = userInfo?.email || (member as TeamMember).inviteEmail;
    const avatarLetter = (displayName || displayEmail)?.charAt(0).toUpperCase();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, type: "spring", stiffness: 300, damping: 30 }}
            className="group flex items-center justify-between p-4 rounded-2xl bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm hover:shadow-md transition-all duration-500"
        >
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                    <span className="text-lg font-bold text-primary">
                        {avatarLetter}
                    </span>
                </div>
                <div>
                    <p className="font-medium text-foreground">
                        {displayName || "Pending"}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <EnvelopeIcon className="w-3.5 h-3.5" />
                        {displayEmail}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                {isPending && (
                    <>
                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-amber-500/10 text-amber-400">
                            Pending
                        </span>
                        {canManage && (
                            <motion.button
                                whileHover={{ scale: 1.1, rotate: 180 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => onResend((member as TeamMember)._id)}
                                className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-300"
                                title="Resend invite"
                            >
                                <ArrowPathIcon className="w-4 h-4" />
                            </motion.button>
                        )}
                    </>
                )}
                {canManage && role !== "owner" && isTeamMember && !isPending ? (
                    <select
                        value={role}
                        onChange={(e) => onUpdateRole((member as TeamMember)._id, e.target.value as any)}
                        className="px-3 py-1.5 text-xs font-medium rounded-xl bg-background/60 backdrop-blur-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300"
                    >
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                        <option value="viewer">Viewer</option>
                    </select>
                ) : !isPending && (
                    <span className={cn("px-3 py-1.5 text-xs font-medium rounded-full flex items-center gap-1.5", badge.color)}>
                        <BadgeIcon className="w-3.5 h-3.5" />
                        {badge.label}
                    </span>
                )}
                {canManage && role !== "owner" && isTeamMember && (
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onRemove((member as TeamMember)._id)}
                        className="p-2 rounded-xl text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all duration-300"
                        title="Remove member"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </motion.button>
                )}
            </div>
        </motion.div>
    );
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

    const fetchTeam = async () => {
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
    };

    useEffect(() => {
        if (workspaceId) {
            fetchTeam();
        }
    }, [workspaceId]);

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
        } catch (error) {
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
        } catch (error) {
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

    return (
        <div className="min-h-screen">
            <AnimatePresence>
                {showInviteModal && (
                    <InviteModal
                        isOpen={showInviteModal}
                        onClose={() => setShowInviteModal(false)}
                        onInvite={handleInvite}
                    />
                )}
            </AnimatePresence>

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="px-8 pt-8 pb-6 flex items-center justify-between"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                        <UserGroupIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold text-foreground">Team</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage team members and permissions
                        </p>
                    </div>
                </div>
                {canInvite && (
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowInviteModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-medium hover:shadow-lg hover:shadow-primary/20 transition-all duration-300"
                    >
                        <PlusIcon className="w-5 h-5" />
                        Invite Member
                    </motion.button>
                )}
            </motion.div>

            {/* Content */}
            <div className="max-w-3xl px-8 pb-8">
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: i * 0.1 }}
                                className="h-20 rounded-2xl bg-gradient-to-br from-card/80 to-card/40 animate-pulse"
                            />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* Owner */}
                        {owner && (
                            <TeamMemberCard
                                member={owner}
                                isOwner={isOwner}
                                currentUserRole={currentUserRole}
                                onUpdateRole={handleUpdateRole}
                                onRemove={handleRemove}
                                onResend={handleResend}
                                index={0}
                            />
                        )}

                        {/* Team Members */}
                        {members.map((member, index) => (
                            <TeamMemberCard
                                key={member._id}
                                member={member}
                                isOwner={isOwner}
                                currentUserRole={currentUserRole}
                                onUpdateRole={handleUpdateRole}
                                onRemove={handleRemove}
                                onResend={handleResend}
                                index={index + 1}
                            />
                        ))}

                        {members.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="text-center py-16 rounded-2xl bg-gradient-to-br from-card/80 to-card/40"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 flex items-center justify-center mx-auto mb-4">
                                    <UserGroupIcon className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-medium text-foreground mb-2">No team members yet</h3>
                                <p className="text-muted-foreground mb-6">Invite colleagues to collaborate</p>
                                {canInvite && (
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setShowInviteModal(true)}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-medium hover:shadow-lg hover:shadow-primary/20 transition-all duration-300"
                                    >
                                        <PlusIcon className="w-5 h-5" />
                                        Invite Member
                                    </motion.button>
                                )}
                            </motion.div>
                        )}
                    </div>
                )}

                {/* Permissions Info */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 30 }}
                    className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10"
                >
                    <h3 className="font-semibold text-foreground mb-4">Role Permissions</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-start gap-2">
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-500/10 text-purple-400">Owner</span>
                            <span className="text-muted-foreground">Full access, billing, delete workspace</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-500/10 text-blue-400">Admin</span>
                            <span className="text-muted-foreground">Manage team, all CRM features</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-400">Member</span>
                            <span className="text-muted-foreground">Create and edit records</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-zinc-500/10 text-zinc-400">Viewer</span>
                            <span className="text-muted-foreground">View only access</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
