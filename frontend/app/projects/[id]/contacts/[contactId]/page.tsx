"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowLeftIcon,
    PencilIcon,
    TrashIcon,
    BoltIcon,
    EllipsisVerticalIcon,
    EnvelopeIcon,
    PhoneIcon,
    BuildingOffice2Icon,
    BriefcaseIcon,
    TagIcon,
    CalendarIcon,
    ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { Sparkles, Copy, Check } from "lucide-react";
import { Menu } from "@headlessui/react";
import { useContactStore } from "@/store/useContactStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { Contact } from "@/lib/api/contact";
import EditContactModal from "@/components/contacts/EditContactModal";
import EnrollInWorkflowModal from "@/components/workflows/EnrollInWorkflowModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ContactActivityTab from "@/components/contacts/details/ContactActivityTab";
import ContactEmailsTab from "@/components/contacts/details/ContactEmailsTab";
import ContactInsightsTab from "@/components/contacts/details/ContactInsightsTab";
import ContactNotesTab from "@/components/contacts/details/ContactNotesTab";
import ContactFilesTab from "@/components/contacts/details/ContactFilesTab";
import LeadScoreBadge from "@/components/contacts/LeadScoreBadge";
import { cn } from "@/lib/utils";
import { apolloApi } from "@/lib/apollo-api";
import toast from "react-hot-toast";
import { useInsightTracking } from "@/hooks/useInsightTracking";
import { format } from "date-fns";

type TabType = "activity" | "emails" | "insights" | "notes" | "files";

const TABS: { id: TabType; label: string }[] = [
    { id: "activity", label: "Activity" },
    { id: "emails", label: "Emails" },
    { id: "insights", label: "Insights" },
    { id: "notes", label: "Notes" },
    { id: "files", label: "Files" },
];

// Animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.05 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

// Copyable info item component
function InfoItem({ icon: Icon, label, value, copyable = false }: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string | React.ReactNode;
    copyable?: boolean;
}) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (typeof value === 'string') {
            navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <motion.div
            variants={itemVariants}
            className="group flex items-start gap-3 py-2.5"
        >
            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                    {label}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                    {typeof value === 'string' ? (
                        <p className="text-sm text-zinc-900 dark:text-zinc-100 truncate">
                            {value || <span className="text-zinc-400 italic">Not provided</span>}
                        </p>
                    ) : (
                        value
                    )}
                    {copyable && typeof value === 'string' && value && (
                        <button
                            onClick={handleCopy}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                        >
                            {copied ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                                <Copy className="w-3.5 h-3.5 text-zinc-400" />
                            )}
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

export default function ContactDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;
    const contactId = params.contactId as string;

    const { fetchContact, currentContact, isLoading, deleteContact } = useContactStore();
    const { currentWorkspace } = useWorkspaceStore();

    const [activeTab, setActiveTab] = useState<TabType>("activity");
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isEnriching, setIsEnriching] = useState(false);
    const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(true);

    const { track } = useInsightTracking({
        workspaceId,
        page: 'contact_detail',
        enabled: !!workspaceId && !!contactId,
    });

    useEffect(() => {
        if (workspaceId && contactId) {
            fetchContact(workspaceId, contactId);
            track('view', 'contact', contactId);
        }
    }, [workspaceId, contactId, fetchContact, track]);

    const handleBack = () => {
        router.push(`/projects/${workspaceId}/contacts`);
    };

    const handleDelete = async () => {
        try {
            await deleteContact(workspaceId, contactId);
            toast.success("Contact deleted successfully");
            router.push(`/projects/${workspaceId}/contacts`);
        } catch (error) {
            toast.error("Failed to delete contact");
        }
    };

    const handleEnrich = async () => {
        if (!currentWorkspace?._id || !currentContact) return;
        setIsEnriching(true);
        try {
            await apolloApi.enrichContact(currentWorkspace._id, contactId);
            fetchContact(workspaceId, contactId);
        } catch (error) {
            // Error handled by apolloApi
        } finally {
            setIsEnriching(false);
        }
    };

    const renderTabContent = () => {
        if (!currentContact) return null;

        switch (activeTab) {
            case "activity":
                return <ContactActivityTab workspaceId={workspaceId} contactId={contactId} />;
            case "emails":
                return <ContactEmailsTab workspaceId={workspaceId} contactId={contactId} contact={currentContact} />;
            case "insights":
                return <ContactInsightsTab contact={currentContact} />;
            case "notes":
                return (
                    <ContactNotesTab
                        contact={currentContact}
                        workspaceId={workspaceId}
                        onUpdate={() => fetchContact(workspaceId, contactId)}
                    />
                );
            case "files":
                return <ContactFilesTab workspaceId={workspaceId} contactId={contactId} />;
            default:
                return null;
        }
    };

    // Loading state
    if (isLoading && !currentContact) {
        return (
            <div className="h-full flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                >
                    <div className="w-10 h-10 border-2 border-zinc-200 dark:border-zinc-700 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-zinc-500">Loading contact...</p>
                </motion.div>
            </div>
        );
    }

    // Not found state
    if (!currentContact) {
        return (
            <div className="h-full flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                >
                    <p className="text-lg text-zinc-500 mb-4">Contact not found</p>
                    <button
                        onClick={handleBack}
                        className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                        Back to Contacts
                    </button>
                </motion.div>
            </div>
        );
    }

    const fullName = `${currentContact.firstName} ${currentContact.lastName}`;

    return (
        <>
            <div className="h-full flex flex-col overflow-hidden">
                {/* Clean Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="px-4 sm:px-6 py-4 flex items-center justify-between flex-shrink-0 border-b border-zinc-100 dark:border-zinc-800"
                >
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleBack}
                            className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                        >
                            <ArrowLeftIcon className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                                {fullName}
                            </h1>
                            {currentContact.jobTitle && (
                                <p className="text-sm text-zinc-500">{currentContact.jobTitle}</p>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsEditModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors"
                        >
                            <PencilIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Edit</span>
                        </button>
                        <button
                            onClick={() => setIsWorkflowModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-full transition-colors"
                        >
                            <BoltIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Workflow</span>
                        </button>

                        {/* More Actions */}
                        <Menu as="div" className="relative">
                            <Menu.Button className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors">
                                <EllipsisVerticalIcon className="w-5 h-5" />
                            </Menu.Button>
                            <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-white dark:bg-zinc-900 rounded-xl shadow-lg ring-1 ring-zinc-200 dark:ring-zinc-800 overflow-hidden z-20">
                                <Menu.Item>
                                    {({ active }) => (
                                        <button
                                            onClick={handleEnrich}
                                            disabled={isEnriching}
                                            className={cn(
                                                "w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors text-violet-600 dark:text-violet-400",
                                                active ? "bg-violet-50 dark:bg-violet-900/20" : "",
                                                isEnriching && "opacity-50 cursor-not-allowed"
                                            )}
                                        >
                                            <Sparkles className="w-4 h-4" />
                                            {isEnriching ? "Enriching..." : "Enrich with Apollo"}
                                        </button>
                                    )}
                                </Menu.Item>
                                <Menu.Item>
                                    {({ active }) => (
                                        <button
                                            onClick={() => setIsDeleteDialogOpen(true)}
                                            className={cn(
                                                "w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors text-red-600 dark:text-red-400",
                                                active ? "bg-red-50 dark:bg-red-900/20" : ""
                                            )}
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                            Delete Contact
                                        </button>
                                    )}
                                </Menu.Item>
                            </Menu.Items>
                        </Menu>
                    </div>
                </motion.div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                    {/* Left Panel - Tabs & Content */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Pill-style Tabs */}
                        <div className="px-4 sm:px-6 py-3 flex-shrink-0">
                            <div className="inline-flex p-1 rounded-full bg-zinc-100 dark:bg-zinc-800/50">
                                {TABS.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={cn(
                                            "px-4 py-1.5 text-sm font-medium rounded-full transition-all",
                                            activeTab === tab.id
                                                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                                                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                                        )}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-y-auto">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    transition={{ duration: 0.2 }}
                                    className="h-full"
                                >
                                    {renderTabContent()}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Right Panel - Contact Details (Desktop) */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="hidden lg:block w-[380px] flex-shrink-0 overflow-y-auto border-l border-zinc-100 dark:border-zinc-800"
                    >
                        <div className="p-6">
                            {/* Hero Section */}
                            <motion.div
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                                className="text-center mb-8"
                            >
                                <motion.div
                                    variants={itemVariants}
                                    className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20"
                                >
                                    <span className="text-2xl font-bold text-white">
                                        {currentContact.firstName[0]}{currentContact.lastName[0]}
                                    </span>
                                </motion.div>
                                <motion.h2 variants={itemVariants} className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                                    {fullName}
                                </motion.h2>
                                {currentContact.jobTitle && (
                                    <motion.p variants={itemVariants} className="text-sm text-zinc-500 mt-1">
                                        {currentContact.jobTitle}
                                    </motion.p>
                                )}

                                {/* Status & Lead Score */}
                                <motion.div variants={itemVariants} className="flex items-center justify-center gap-2 mt-3">
                                    <span className={cn(
                                        "px-3 py-1 rounded-full text-xs font-medium",
                                        currentContact.status === "customer" && "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
                                        currentContact.status === "prospect" && "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
                                        currentContact.status === "lead" && "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
                                        currentContact.status === "inactive" && "bg-zinc-100 dark:bg-zinc-800 text-zinc-500",
                                        !currentContact.status && "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                                    )}>
                                        {currentContact.status || "Lead"}
                                    </span>
                                    {currentContact.leadScore && (
                                        <LeadScoreBadge
                                            score={currentContact.leadScore.currentScore}
                                            grade={currentContact.leadScore.grade}
                                            size="sm"
                                            showScore={true}
                                        />
                                    )}
                                </motion.div>
                            </motion.div>

                            {/* Contact Information */}
                            <motion.div
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                                className="space-y-1"
                            >
                                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                                    Contact Information
                                </h3>
                                <InfoItem icon={EnvelopeIcon} label="Email" value={currentContact.email || ""} copyable />
                                <InfoItem icon={PhoneIcon} label="Phone" value={currentContact.phone || ""} copyable />
                                <InfoItem icon={BuildingOffice2Icon} label="Company" value={currentContact.company || ""} />
                                <InfoItem icon={BriefcaseIcon} label="Job Title" value={currentContact.jobTitle || ""} />
                                <InfoItem icon={TagIcon} label="Source" value={currentContact.source || ""} />
                            </motion.div>

                            {/* Metadata */}
                            <motion.div
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                                className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800"
                            >
                                <InfoItem
                                    icon={CalendarIcon}
                                    label="Created"
                                    value={format(new Date(currentContact.createdAt), "MMMM d, yyyy")}
                                />
                            </motion.div>
                        </div>
                    </motion.div>

                    {/* Mobile Details Panel Toggle */}
                    <div className="lg:hidden border-t border-zinc-100 dark:border-zinc-800">
                        <button
                            onClick={() => setIsDetailsPanelOpen(!isDetailsPanelOpen)}
                            className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-zinc-700 dark:text-zinc-300"
                        >
                            <span>Contact Details</span>
                            <ChevronDownIcon className={cn(
                                "w-5 h-5 transition-transform",
                                isDetailsPanelOpen && "rotate-180"
                            )} />
                        </button>
                        <AnimatePresence>
                            {isDetailsPanelOpen && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="p-4 space-y-4">
                                        <InfoItem icon={EnvelopeIcon} label="Email" value={currentContact.email || ""} copyable />
                                        <InfoItem icon={PhoneIcon} label="Phone" value={currentContact.phone || ""} copyable />
                                        <InfoItem icon={BuildingOffice2Icon} label="Company" value={currentContact.company || ""} />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <EditContactModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    fetchContact(workspaceId, contactId);
                }}
                workspaceId={workspaceId}
                contact={currentContact}
            />

            <EnrollInWorkflowModal
                isOpen={isWorkflowModalOpen}
                onClose={() => setIsWorkflowModalOpen(false)}
                entityType="contact"
                entityId={contactId}
                entityName={fullName}
            />

            <ConfirmDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={handleDelete}
                title="Delete Contact"
                message="Are you sure you want to delete this contact? This action cannot be undone."
                confirmText="Delete Contact"
                cancelText="Cancel"
                variant="danger"
            />
        </>
    );
}
