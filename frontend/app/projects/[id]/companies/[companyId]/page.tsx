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
    ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { Copy, Check, ExternalLink } from "lucide-react";
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

const TABS: { id: TabType; label: string }[] = [
    { id: "activity", label: "Activity" },
    { id: "emails", label: "Emails" },
    { id: "contacts", label: "Contacts" },
    { id: "notes", label: "Notes" },
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
function InfoItem({ icon: Icon, label, value, copyable = false, isLink = false }: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string | React.ReactNode;
    copyable?: boolean;
    isLink?: boolean;
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
                        isLink && value ? (
                            <a
                                href={value.startsWith('http') ? value : `https://${value}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline truncate flex items-center gap-1"
                            >
                                {value}
                                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            </a>
                        ) : (
                            <p className="text-sm text-zinc-900 dark:text-zinc-100 truncate">
                                {value || <span className="text-zinc-400 italic">Not provided</span>}
                            </p>
                        )
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
    const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(true);

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

    // Tab Content Renderers
    const renderContactsTab = () => {
        if (isLoadingContacts) {
            return (
                <div className="flex items-center justify-center h-full min-h-[300px]">
                    <div className="w-8 h-8 border-2 border-zinc-200 dark:border-zinc-700 border-t-emerald-500 rounded-full animate-spin" />
                </div>
            );
        }

        if (linkedContacts.length === 0) {
            return (
                <div className="p-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center py-12 text-center"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                            <UserGroupIcon className="w-8 h-8 text-zinc-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">No Linked Contacts</h3>
                        <p className="text-sm text-zinc-500 max-w-md">
                            Link contacts to {currentCompany?.name || "this company"} by editing a contact
                            and setting their company field.
                        </p>
                    </motion.div>
                </div>
            );
        }

        return (
            <div className="p-4">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-2"
                >
                    {linkedContacts.map((contact) => (
                        <motion.div
                            key={contact._id}
                            variants={itemVariants}
                            onClick={() => router.push(`/projects/${workspaceId}/contacts/${contact._id}`)}
                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
                        >
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                                <span className="text-sm font-medium text-white">
                                    {contact.firstName[0]}{contact.lastName[0]}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                    {contact.firstName} {contact.lastName}
                                </p>
                                {contact.jobTitle && (
                                    <p className="text-xs text-zinc-500">{contact.jobTitle}</p>
                                )}
                            </div>
                            {contact.email && (
                                <span className="text-xs text-zinc-400 truncate max-w-[150px]">
                                    {contact.email}
                                </span>
                            )}
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        );
    };

    const renderNotesTab = () => {
        return (
            <div className="p-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                >
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Notes</h3>
                        <button
                            onClick={handleSaveNotes}
                            disabled={isSavingNotes || notes === currentCompany?.notes}
                            className={cn(
                                "px-4 py-2 text-sm font-medium rounded-full transition-colors",
                                notes !== currentCompany?.notes
                                    ? "bg-emerald-500 text-white hover:bg-emerald-600"
                                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
                            )}
                        >
                            {isSavingNotes ? "Saving..." : "Save Notes"}
                        </button>
                    </div>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add notes about this company..."
                        className="w-full h-64 px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 rounded-xl placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                    />
                </motion.div>
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

    // Loading state
    if (isLoading && !currentCompany) {
        return (
            <div className="h-full flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                >
                    <div className="w-10 h-10 border-2 border-zinc-200 dark:border-zinc-700 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-zinc-500">Loading company...</p>
                </motion.div>
            </div>
        );
    }

    // Not found state
    if (!currentCompany) {
        return (
            <div className="h-full flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                >
                    <p className="text-lg text-zinc-500 mb-4">Company not found</p>
                    <button
                        onClick={handleBack}
                        className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                        Back to Companies
                    </button>
                </motion.div>
            </div>
        );
    }

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
                                {currentCompany.name}
                            </h1>
                            {currentCompany.industry && (
                                <p className="text-sm text-zinc-500">{currentCompany.industry}</p>
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

                        {/* More Actions */}
                        <Menu as="div" className="relative">
                            <Menu.Button className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors">
                                <EllipsisVerticalIcon className="w-5 h-5" />
                            </Menu.Button>
                            <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-white dark:bg-zinc-900 rounded-xl shadow-lg ring-1 ring-zinc-200 dark:ring-zinc-800 overflow-hidden z-20">
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
                                            Delete Company
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

                    {/* Right Panel - Company Details (Desktop) */}
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
                                    className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20"
                                >
                                    <BuildingOffice2Icon className="w-10 h-10 text-white" />
                                </motion.div>
                                <motion.h2 variants={itemVariants} className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                                    {currentCompany.name}
                                </motion.h2>
                                {currentCompany.industry && (
                                    <motion.p variants={itemVariants} className="text-sm text-zinc-500 mt-1">
                                        {currentCompany.industry}
                                    </motion.p>
                                )}

                                {/* Status & Contacts Count */}
                                <motion.div variants={itemVariants} className="flex items-center justify-center gap-2 mt-3">
                                    <span className={cn(
                                        "px-3 py-1 rounded-full text-xs font-medium",
                                        currentCompany.status === "customer" && "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
                                        currentCompany.status === "prospect" && "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
                                        currentCompany.status === "lead" && "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
                                        currentCompany.status === "churned" && "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
                                        !currentCompany.status && "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                                    )}>
                                        {currentCompany.status || "Lead"}
                                    </span>
                                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                                        {linkedContacts.length} contact{linkedContacts.length !== 1 ? "s" : ""}
                                    </span>
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
                                <InfoItem icon={GlobeAltIcon} label="Website" value={currentCompany.website || ""} copyable isLink />
                                <InfoItem icon={PhoneIcon} label="Phone" value={currentCompany.phone || ""} copyable />
                            </motion.div>

                            {/* Company Details */}
                            <motion.div
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                                className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800 space-y-1"
                            >
                                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                                    Company Details
                                </h3>
                                <InfoItem
                                    icon={UserGroupIcon}
                                    label="Company Size"
                                    value={currentCompany.companySize ? (
                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                            {currentCompany.companySize}
                                        </span>
                                    ) : ""}
                                />
                                <InfoItem
                                    icon={UserGroupIcon}
                                    label="Employees"
                                    value={currentCompany.employeeCount?.toLocaleString() || ""}
                                />
                                <InfoItem
                                    icon={CurrencyDollarIcon}
                                    label="Annual Revenue"
                                    value={currentCompany.annualRevenue ? formatCurrency(currentCompany.annualRevenue) : ""}
                                />
                                <InfoItem icon={TagIcon} label="Source" value={currentCompany.source || ""} />
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
                                    value={format(new Date(currentCompany.createdAt), "MMMM d, yyyy")}
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
                            <span>Company Details</span>
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
                                        <InfoItem icon={GlobeAltIcon} label="Website" value={currentCompany.website || ""} isLink />
                                        <InfoItem icon={PhoneIcon} label="Phone" value={currentCompany.phone || ""} copyable />
                                        <InfoItem icon={UserGroupIcon} label="Employees" value={currentCompany.employeeCount?.toLocaleString() || ""} />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
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
