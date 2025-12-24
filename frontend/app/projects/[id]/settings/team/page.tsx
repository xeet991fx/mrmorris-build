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
        color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
        icon: ShieldCheckIcon,
    },
    admin: {
        label: "Admin",
        color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        icon: ShieldCheckIcon,
    },
    member: {
        label: "Member",
        color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        icon: UserIcon,
    },
    viewer: {
        label: "Viewer",
        color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6"
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-foreground">Invite Team Member</h2>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted">
                        <XMarkIcon className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-border bg-muted/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="colleague@company.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                            Role
                        </label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value as any)}
                            className="w-full px-3 py-2 rounded-lg border border-border bg-muted/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="admin">Admin - Full access, can manage team</option>
                            <option value="member">Member - Create and edit records</option>
                            <option value="viewer">Viewer - View only access</option>
                        </select>
                    </div>
                    <div className="flex gap-3 justify-end pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !email.trim()}
                            className="px-4 py-2 rounded-lg bg-[#9ACD32] text-background font-medium hover:bg-[#8AB82E] transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? "Sending..." : "Send Invite"}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
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
}: {
    member: TeamMember | TeamOwner;
    isOwner: boolean;
    currentUserRole: Role | null;
    onUpdateRole: (memberId: string, role: "admin" | "member" | "viewer") => void;
    onRemove: (memberId: string) => void;
    onResend: (memberId: string) => void;
}) {
    const role = member.role;
    const badge = ROLE_BADGES[role];
    const BadgeIcon = badge.icon;
    // Owner doesn't have userId property - they ARE the user directly
    const isTeamMember = role !== "owner" && "_id" in member;
    // Get user info - for owner, it's the member itself; for team members, it's the populated userId
    const userInfo = isTeamMember
        ? (member as TeamMember).userId
        : (member as TeamOwner);
    const canManage = currentUserRole === "owner" || (currentUserRole === "admin" && role !== "admin" && role !== "owner");
    const isPending = isTeamMember && (member as TeamMember).status === "pending";

    // Get display values
    const displayName = userInfo?.name || (role === "owner" ? userInfo?.email : null);
    const displayEmail = userInfo?.email || (member as TeamMember).inviteEmail;
    const avatarLetter = (displayName || displayEmail)?.charAt(0).toUpperCase();

    return (
        <div className="flex items-center justify-between p-4 bg-card border border-border rounded-xl">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#9ACD32]/20 flex items-center justify-center">
                    <span className="text-[#9ACD32] font-semibold">
                        {avatarLetter}
                    </span>
                </div>
                <div>
                    <p className="font-medium text-foreground">
                        {displayName || "Pending"}
                    </p>
                    <p className="text-sm text-muted-foreground">{displayEmail}</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {isPending && (
                    <>
                        <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                            Pending
                        </span>
                        {canManage && (
                            <button
                                onClick={() => onResend((member as TeamMember)._id)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                title="Resend invite"
                            >
                                <ArrowPathIcon className="w-4 h-4" />
                            </button>
                        )}
                    </>
                )}
                {canManage && role !== "owner" && isTeamMember && !isPending ? (
                    <select
                        value={role}
                        onChange={(e) => onUpdateRole((member as TeamMember)._id, e.target.value as any)}
                        className="px-2 py-1 text-xs rounded-lg border border-border bg-muted/50 text-foreground"
                    >
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                        <option value="viewer">Viewer</option>
                    </select>
                ) : !isPending && (
                    <span className={cn("px-2 py-1 text-xs rounded-full flex items-center gap-1", badge.color)}>
                        <BadgeIcon className="w-3 h-3" />
                        {badge.label}
                    </span>
                )}
                {canManage && role !== "owner" && isTeamMember && (
                    <button
                        onClick={() => onRemove((member as TeamMember)._id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Remove member"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
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
        <div className="min-h-screen bg-card/95">
            <InviteModal
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
                onInvite={handleInvite}
            />

            {/* Header */}
            <div className="h-12 px-6 border-b border-border flex items-center justify-between sticky top-0 z-10 bg-card">
                <div className="flex items-center gap-3">
                    <UserGroupIcon className="w-5 h-5 text-muted-foreground" />
                    <h1 className="text-lg font-semibold text-foreground">Team</h1>
                </div>
                {canInvite && (
                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#9ACD32] text-background font-medium hover:bg-[#8AB82E] transition-all"
                    >
                        <PlusIcon className="w-5 h-5" />
                        Invite Member
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="max-w-3xl mx-auto px-6 py-8">
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-16 rounded-xl bg-card border border-border animate-pulse" />
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
                            />
                        )}

                        {/* Team Members */}
                        {members.map((member) => (
                            <TeamMemberCard
                                key={member._id}
                                member={member}
                                isOwner={isOwner}
                                currentUserRole={currentUserRole}
                                onUpdateRole={handleUpdateRole}
                                onRemove={handleRemove}
                                onResend={handleResend}
                            />
                        ))}

                        {members.length === 0 && (
                            <div className="text-center py-16">
                                <UserGroupIcon className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                                <h3 className="text-lg font-medium text-foreground mb-2">No team members yet</h3>
                                <p className="text-muted-foreground mb-4">Invite colleagues to collaborate</p>
                                {canInvite && (
                                    <button
                                        onClick={() => setShowInviteModal(true)}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#9ACD32] text-background font-medium hover:bg-[#8AB82E] transition-all"
                                    >
                                        <PlusIcon className="w-5 h-5" />
                                        Invite Member
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Permissions Info */}
                <div className="mt-8 p-4 bg-muted/50 rounded-xl border border-border">
                    <h3 className="font-medium text-foreground mb-3">Role Permissions</h3>
                    <div className="space-y-2 text-sm text-muted-foreground">
                        <p><strong className="text-foreground">Owner:</strong> Full access, billing, can delete workspace</p>
                        <p><strong className="text-foreground">Admin:</strong> Manage team, all CRM features, integrations</p>
                        <p><strong className="text-foreground">Member:</strong> Create and edit contacts, deals, tasks</p>
                        <p><strong className="text-foreground">Viewer:</strong> View only access to all data</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
