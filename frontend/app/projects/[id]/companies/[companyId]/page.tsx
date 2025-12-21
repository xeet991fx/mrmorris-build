"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowLeftIcon,
    PencilIcon,
    TrashIcon,
    EllipsisVerticalIcon,
    BuildingOffice2Icon,
    GlobeAltIcon,
    PhoneIcon,
    UserGroupIcon,
    CurrencyDollarIcon,
    TagIcon,
    CalendarIcon,
    LinkIcon,
} from "@heroicons/react/24/outline";
import { Menu } from "@headlessui/react";
import { useCompanyStore } from "@/store/useCompanyStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { Company } from "@/lib/api/company";
import { Contact, getContacts } from "@/lib/api/contact";
import EditCompanyModal from "@/components/companies/EditCompanyModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import CompanyActivityTab from "@/components/companies/details/CompanyActivityTab";
import CompanyEmailsTab from "@/components/companies/details/CompanyEmailsTab";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { format } from "date-fns";

type TabType = "activity" | "emails" | "contacts" | "notes";

const TABS: { id: TabType; label: string; icon: string }[] = [
    { id: "activity", label: "Activity", icon: "📋" },
    { id: "emails", label: "Emails", icon: "📧" },
    { id: "contacts", label: "Contacts", icon: "👥" },
    { id: "notes", label: "Notes", icon: "📝" },
];

export default function CompanyDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;
    const companyId = params.companyId as string;

    const { fetchCompany, currentCompany, isLoading, deleteCompany, updateCompany } = useCompanyStore();
    const { currentWorkspace } = useWorkspaceStore();

    const [activeTab, setActiveTab] = useState<TabType>("activity");
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [notes, setNotes] = useState("");
    const [isSavingNotes, setIsSavingNotes] = useState(false);
    const [linkedContacts, setLinkedContacts] = useState<Contact[]>([]);
    const [isLoadingContacts, setIsLoadingContacts] = useState(true);

    // Fetch company on mount
    useEffect(() => {
        if (workspaceId && companyId) {
            fetchCompany(workspaceId, companyId);
        }
    }, [workspaceId, companyId, fetchCompany]);

    // Fetch linked contacts
    useEffect(() => {
        const fetchLinkedContacts = async () => {
            if (!workspaceId || !companyId) return;
            setIsLoadingContacts(true);
            try {
                // Fetch all contacts and filter by companyId
                const response = await getContacts(workspaceId, { limit: 1000 });
                if (response.success && response.data) {
                    const contacts = response.data.contacts.filter(
                        (contact) => contact.companyId === companyId
                    );
                    setLinkedContacts(contacts);
                }
            } catch (error) {
                console.error("Failed to fetch linked contacts:", error);
            } finally {
                setIsLoadingContacts(false);
            }
        };

        fetchLinkedContacts();
    }, [workspaceId, companyId]);

    // Sync notes when company loads
    useEffect(() => {
        if (currentCompany) {
            setNotes(currentCompany.notes || "");
        }
    }, [currentCompany]);

    const handleBack = () => {
        router.push(`/projects/${workspaceId}/companies`);
    };

    const handleDelete = async () => {
        try {
            await deleteCompany(workspaceId, companyId);
            toast.success("Company deleted successfully");
            router.push(`/projects/${workspaceId}/companies`);
        } catch (error) {
            toast.error("Failed to delete company");
        }
    };

    const handleSaveNotes = async () => {
        if (!currentCompany) return;
        setIsSavingNotes(true);
        try {
            await updateCompany(workspaceId, companyId, { notes });
            toast.success("Notes saved");
        } catch (error) {
            toast.error("Failed to save notes");
        } finally {
            setIsSavingNotes(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard`);
    };

    // Tab Content Renderers
    const renderContactsTab = () => {
        if (isLoadingContacts) {
            return (
                <div className="flex items-center justify-center h-full min-h-[300px]">
                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
            );
        }

        if (linkedContacts.length === 0) {
            return (
                <div className="p-6">
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                            <UserGroupIcon className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">No Linked Contacts</h3>
                        <p className="text-sm text-muted-foreground max-w-md">
                            Link contacts to {currentCompany?.name || "this company"} by editing a contact
                            and setting their company field.
                        </p>
                    </div>
                </div>
            );
        }

        return (
            <div className="p-4">
                <div className="space-y-2">
                    {linkedContacts.map((contact) => (
                        <div
                            key={contact._id}
                            onClick={() => router.push(`/projects/${workspaceId}/contacts/${contact._id}`)}
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#9ACD32]/20 to-[#9ACD32]/5 flex items-center justify-center">
                                <span className="text-sm font-medium text-[#9ACD32]">
                                    {contact.firstName[0]}{contact.lastName[0]}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground">
                                    {contact.firstName} {contact.lastName}
                                </p>
                                {contact.jobTitle && (
                                    <p className="text-xs text-muted-foreground">{contact.jobTitle}</p>
                                )}
                            </div>
                            {contact.email && (
                                <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                                    {contact.email}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderNotesTab = () => {
        return (
            <div className="p-6">
                <div className="bg-card border border-border rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-foreground">Notes</h3>
                        <button
                            onClick={handleSaveNotes}
                            disabled={isSavingNotes || notes === currentCompany?.notes}
                            className={cn(
                                "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                                notes !== currentCompany?.notes
                                    ? "bg-[#9ACD32] text-black hover:bg-[#8BC32A]"
                                    : "bg-muted text-muted-foreground cursor-not-allowed"
                            )}
                        >
                            {isSavingNotes ? "Saving..." : "Save Notes"}
                        </button>
                    </div>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add notes about this company..."
                        className="w-full h-64 px-4 py-3 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#9ACD32]/50 resize-none"
                    />
                </div>
            </div>
        );
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case "activity":
                return (
                    <CompanyActivityTab
                        workspaceId={workspaceId}
                        companyId={companyId}
                        linkedContacts={linkedContacts}
                    />
                );
            case "emails":
                return (
                    <CompanyEmailsTab
                        workspaceId={workspaceId}
                        linkedContacts={linkedContacts}
                        companyName={currentCompany?.name || "this company"}
                    />
                );
            case "contacts":
                return renderContactsTab();
            case "notes":
                return renderNotesTab();
            default:
                return null;
        }
    };

    // Right Panel - Company Details
    const CompanyDetailsPanel = () => {
        if (!currentCompany) return null;

        const Placeholder = ({ text = "Not provided" }: { text?: string }) => (
            <span className="text-muted-foreground italic">{text}</span>
        );

        return (
            <div className="p-6 space-y-6">
                {/* Company Avatar & Name */}
                <div className="text-center pb-4 border-b border-border">
                    <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-[#9ACD32]/20 to-[#9ACD32]/5 flex items-center justify-center mx-auto mb-3">
                        <BuildingOffice2Icon className="w-10 h-10 text-[#9ACD32]" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">{currentCompany.name}</h2>
                    {currentCompany.industry && (
                        <p className="text-sm text-muted-foreground mt-1">{currentCompany.industry}</p>
                    )}
                    {/* Status Badge */}
                    <div className="mt-3">
                        <span
                            className={cn(
                                "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium",
                                currentCompany.status === "customer" &&
                                "bg-green-500/10 text-green-400 border border-green-500/20",
                                currentCompany.status === "prospect" &&
                                "bg-blue-500/10 text-blue-400 border border-blue-500/20",
                                currentCompany.status === "lead" &&
                                "bg-amber-500/10 text-amber-400 border border-amber-500/20",
                                currentCompany.status === "churned" &&
                                "bg-red-500/10 text-red-400 border border-red-500/20",
                                !currentCompany.status &&
                                "bg-muted text-muted-foreground border border-border"
                            )}
                        >
                            {currentCompany.status || "Lead"}
                        </span>
                    </div>
                    {/* Linked Contacts Count */}
                    <p className="text-xs text-muted-foreground mt-2">
                        {linkedContacts.length} linked contact{linkedContacts.length !== 1 ? "s" : ""}
                    </p>
                </div>

                {/* Contact Info */}
                <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Contact Info
                    </h3>

                    {/* Website */}
                    <div className="flex items-start gap-3 group">
                        <GlobeAltIcon className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1 min-w-0">
                            {currentCompany.website ? (
                                <a
                                    href={currentCompany.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-[#9ACD32] hover:underline truncate block"
                                >
                                    {currentCompany.website}
                                </a>
                            ) : (
                                <Placeholder />
                            )}
                        </div>
                        {currentCompany.website && (
                            <button
                                onClick={() => copyToClipboard(currentCompany.website!, "Website")}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-all"
                            >
                                <LinkIcon className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                        )}
                    </div>

                    {/* Phone */}
                    <div className="flex items-start gap-3 group">
                        <PhoneIcon className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1 min-w-0">
                            {currentCompany.phone ? (
                                <span className="text-sm text-foreground">{currentCompany.phone}</span>
                            ) : (
                                <Placeholder />
                            )}
                        </div>
                        {currentCompany.phone && (
                            <button
                                onClick={() => copyToClipboard(currentCompany.phone!, "Phone")}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-all"
                            >
                                <LinkIcon className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Company Details */}
                <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Company Details
                    </h3>

                    {/* Company Size */}
                    <div className="flex items-start gap-3">
                        <UserGroupIcon className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                            <p className="text-xs text-muted-foreground">Company Size</p>
                            <p className="text-sm text-foreground">
                                {currentCompany.companySize ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                        {currentCompany.companySize}
                                    </span>
                                ) : (
                                    <Placeholder />
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Employee Count */}
                    <div className="flex items-start gap-3">
                        <UserGroupIcon className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                            <p className="text-xs text-muted-foreground">Employee Count</p>
                            <p className="text-sm text-foreground">
                                {currentCompany.employeeCount ? (
                                    currentCompany.employeeCount.toLocaleString()
                                ) : (
                                    <Placeholder />
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Annual Revenue */}
                    <div className="flex items-start gap-3">
                        <CurrencyDollarIcon className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                            <p className="text-xs text-muted-foreground">Annual Revenue</p>
                            <p className="text-sm text-foreground">
                                {currentCompany.annualRevenue ? (
                                    formatCurrency(currentCompany.annualRevenue)
                                ) : (
                                    <Placeholder />
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Lead Source */}
                    <div className="flex items-start gap-3">
                        <TagIcon className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                            <p className="text-xs text-muted-foreground">Lead Source</p>
                            <p className="text-sm text-foreground">
                                {currentCompany.source || <Placeholder />}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Metadata */}
                <div className="space-y-3 pt-4 border-t border-border">
                    <div className="flex items-start gap-3">
                        <CalendarIcon className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                            <p className="text-xs text-muted-foreground">Created</p>
                            <p className="text-sm text-foreground">
                                {format(new Date(currentCompany.createdAt), "MMM d, yyyy")}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Custom Fields */}
                {currentCompany.customFields && Object.keys(currentCompany.customFields).length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-border">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Custom Fields
                        </h3>
                        {Object.entries(currentCompany.customFields).map(([key, value]) => (
                            <div key={key} className="flex items-start gap-3">
                                <div className="w-4 h-4" />
                                <div className="flex-1">
                                    <p className="text-xs text-muted-foreground capitalize">
                                        {key.replace(/_/g, " ")}
                                    </p>
                                    <p className="text-sm text-foreground">{String(value)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    if (isLoading && !currentCompany) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-3 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Loading company...</p>
                </div>
            </div>
        );
    }

    if (!currentCompany) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <p className="text-lg text-muted-foreground mb-4">Company not found</p>
                    <button
                        onClick={handleBack}
                        className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
                    >
                        Back to Companies
                    </button>
                </div>
            </div>
        );
    }

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
                            {currentCompany.name}
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

                        {/* More Actions Menu */}
                        <Menu as="div" className="relative">
                            <Menu.Button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                                <EllipsisVerticalIcon className="w-5 h-5" />
                            </Menu.Button>
                            <Menu.Items className="absolute right-0 mt-1 w-48 origin-top-right bg-card border border-border rounded-lg shadow-xl overflow-hidden z-10">
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
                                            Delete Company
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

                    {/* Right Panel - Company Details */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="w-[380px] flex-shrink-0 overflow-y-auto bg-card/50"
                    >
                        <CompanyDetailsPanel />
                    </motion.div>
                </div>
            </div>

            {/* Modals */}
            <EditCompanyModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    fetchCompany(workspaceId, companyId);
                }}
                workspaceId={workspaceId}
                company={currentCompany}
            />

            <ConfirmDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={handleDelete}
                title="Delete Company"
                message="Are you sure you want to delete this company? This action cannot be undone."
                confirmText="Delete Company"
                cancelText="Cancel"
                variant="danger"
            />
        </>
    );
}
