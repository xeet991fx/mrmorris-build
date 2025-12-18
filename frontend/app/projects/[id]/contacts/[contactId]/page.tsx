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
} from "@heroicons/react/24/outline";
import { Sparkles } from "lucide-react";
import { Menu } from "@headlessui/react";
import { useContactStore } from "@/store/useContactStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { Contact } from "@/lib/api/contact";
import EditContactModal from "@/components/contacts/EditContactModal";
import EnrollInWorkflowModal from "@/components/workflows/EnrollInWorkflowModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ContactDetailsPanel from "@/components/contacts/details/ContactDetailsPanel";
import ContactActivityTab from "@/components/contacts/details/ContactActivityTab";
import ContactEmailsTab from "@/components/contacts/details/ContactEmailsTab";
import ContactInsightsTab from "@/components/contacts/details/ContactInsightsTab";
import ContactNotesTab from "@/components/contacts/details/ContactNotesTab";
import ContactFilesTab from "@/components/contacts/details/ContactFilesTab";
import { cn } from "@/lib/utils";
import { apolloApi } from "@/lib/apollo-api";
import toast from "react-hot-toast";

type TabType = "activity" | "emails" | "insights" | "notes" | "files";

const TABS: { id: TabType; label: string; icon: string }[] = [
    { id: "activity", label: "Activity", icon: "📋" },
    { id: "emails", label: "Emails", icon: "📧" },
    { id: "insights", label: "Insights", icon: "✨" },
    { id: "notes", label: "Notes", icon: "📝" },
    { id: "files", label: "Files", icon: "📁" },
];

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

    // Fetch contact on mount
    useEffect(() => {
        if (workspaceId && contactId) {
            fetchContact(workspaceId, contactId);
        }
    }, [workspaceId, contactId, fetchContact]);

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
            // Refetch contact to get updated data
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

    if (isLoading && !currentContact) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-3 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Loading contact...</p>
                </div>
            </div>
        );
    }

    if (!currentContact) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <p className="text-lg text-muted-foreground mb-4">Contact not found</p>
                    <button
                        onClick={handleBack}
                        className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
                    >
                        Back to Contacts
                    </button>
                </div>
            </div>
        );
    }

    const fullName = `${currentContact.firstName} ${currentContact.lastName}`;

    return (
        <>
            <div className="min-h-screen bg-background flex flex-col">
                {/* Header Bar */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="h-12 px-4 border-b border-border flex items-center justify-between flex-shrink-0 bg-card"
                >
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleBack}
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ArrowLeftIcon className="w-5 h-5" />
                        </button>
                        <h1 className="text-lg font-semibold text-foreground truncate max-w-[300px]">
                            {fullName}
                        </h1>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsEditModalOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
                        >
                            <PencilIcon className="w-4 h-4" />
                            Edit
                        </button>
                        <button
                            onClick={() => setIsWorkflowModalOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
                        >
                            <BoltIcon className="w-4 h-4" />
                            Workflow
                        </button>

                        {/* More Actions Menu */}
                        <Menu as="div" className="relative">
                            <Menu.Button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                                <EllipsisVerticalIcon className="w-5 h-5" />
                            </Menu.Button>
                            <Menu.Items className="absolute right-0 mt-1 w-48 origin-top-right bg-card border border-border rounded-lg shadow-xl overflow-hidden z-10">
                                <Menu.Item>
                                    {({ active }) => (
                                        <button
                                            onClick={handleEnrich}
                                            disabled={isEnriching}
                                            className={cn(
                                                "w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors",
                                                active ? "bg-purple-500/20 text-purple-400" : "text-purple-400",
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
                                                "w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors",
                                                active ? "bg-red-500/20 text-red-400" : "text-red-400"
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

                {/* Main Content - Two Panel Layout */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left Panel - Tabs */}
                    <div className="flex-1 flex flex-col overflow-hidden border-r border-border">
                        {/* Tab Bar */}
                        <div className="px-4 py-2 border-b border-border bg-card/50 flex gap-1">
                            {TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                                        activeTab === tab.id
                                            ? "bg-muted text-foreground"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                    )}
                                >
                                    <span>{tab.icon}</span>
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-y-auto">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.15 }}
                                    className="h-full"
                                >
                                    {renderTabContent()}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Right Panel - Contact Details */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="w-[380px] flex-shrink-0 overflow-y-auto bg-card/50"
                    >
                        <ContactDetailsPanel contact={currentContact} workspaceId={workspaceId} />
                    </motion.div>
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
