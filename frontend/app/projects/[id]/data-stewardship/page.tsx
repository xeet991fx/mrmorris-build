"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
    ArrowPathIcon,
    ShieldCheckIcon,
    ExclamationTriangleIcon,
    UserMinusIcon,
    BriefcaseIcon,
    CheckCircleIcon,
    ClockIcon,
    PlayIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import {
    getStaleContacts,
    getLeftCompanyContacts,
    getVerificationStats,
    verifyContact,
    scanWorkspace,
    ContactVerificationStatus,
} from "@/lib/api/dataStewardship";

export default function DataStewardshipPage() {
    const params = useParams();
    const workspaceId = params.id as string;

    const [isLoading, setIsLoading] = useState(true);
    const [isScanning, setIsScanning] = useState(false);
    const [verifyingId, setVerifyingId] = useState<string | null>(null);
    const [stats, setStats] = useState({
        total: 0,
        verified: 0,
        stale: 0,
        leftCompany: 0,
        jobChangesThisMonth: 0,
    });
    const [staleContacts, setStaleContacts] = useState<ContactVerificationStatus[]>([]);
    const [leftCompanyContacts, setLeftCompanyContacts] = useState<ContactVerificationStatus[]>([]);
    const [activeTab, setActiveTab] = useState<"stale" | "left">("stale");

    const fetchData = useCallback(async () => {
        try {
            const [statsRes, staleRes, leftRes] = await Promise.all([
                getVerificationStats(workspaceId),
                getStaleContacts(workspaceId, 20),
                getLeftCompanyContacts(workspaceId),
            ]);

            if (statsRes.success && statsRes.data) {
                setStats(statsRes.data);
            }
            if (staleRes.success && staleRes.contacts) {
                setStaleContacts(staleRes.contacts);
            }
            if (leftRes.success && leftRes.contacts) {
                setLeftCompanyContacts(leftRes.contacts);
            }
        } catch (err) {
            console.error("Failed to fetch data:", err);
            toast.error("Failed to load data");
        } finally {
            setIsLoading(false);
        }
    }, [workspaceId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleScanWorkspace = async () => {
        setIsScanning(true);
        try {
            const result = await scanWorkspace(workspaceId);
            if (result.success) {
                toast.success(`Scan complete! ${result.result?.jobChangesDetected || 0} job changes detected`);
                fetchData();
            } else {
                toast.error(result.error || "Scan failed");
            }
        } catch (err: any) {
            toast.error(err.message || "Scan failed");
        } finally {
            setIsScanning(false);
        }
    };

    const handleVerifyContact = async (contactId: string) => {
        setVerifyingId(contactId);
        try {
            const result = await verifyContact(contactId, workspaceId);
            if (result.success) {
                toast.success("Contact verified!");
                fetchData();
            } else {
                toast.error(result.error || "Verification failed");
            }
        } catch (err: any) {
            toast.error(err.message || "Verification failed");
        } finally {
            setVerifyingId(null);
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return "Never";
        return new Date(dateString).toLocaleDateString();
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <ArrowPathIcon className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <ShieldCheckIcon className="w-7 h-7 text-primary" />
                        Data Stewardship
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Monitor contact data quality and detect job changes
                    </p>
                </div>
                <button
                    onClick={handleScanWorkspace}
                    disabled={isScanning}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                    {isScanning ? (
                        <>
                            <ArrowPathIcon className="w-5 h-5 animate-spin" />
                            Scanning...
                        </>
                    ) : (
                        <>
                            <PlayIcon className="w-5 h-5" />
                            Scan All Contacts
                        </>
                    )}
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card border border-border rounded-xl p-5"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-muted-foreground text-sm">Total Contacts</p>
                            <p className="text-2xl font-bold text-foreground mt-1">{stats.total}</p>
                        </div>
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                            <BriefcaseIcon className="w-6 h-6 text-primary" />
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-card border border-border rounded-xl p-5"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-muted-foreground text-sm">Verified</p>
                            <p className="text-2xl font-bold text-green-400 mt-1">{stats.verified}</p>
                        </div>
                        <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center">
                            <CheckCircleIcon className="w-6 h-6 text-green-400" />
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-card border border-border rounded-xl p-5"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-muted-foreground text-sm">Needs Verification</p>
                            <p className="text-2xl font-bold text-yellow-400 mt-1">{stats.stale}</p>
                        </div>
                        <div className="w-12 h-12 bg-yellow-500/10 rounded-full flex items-center justify-center">
                            <ClockIcon className="w-6 h-6 text-yellow-400" />
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-card border border-border rounded-xl p-5"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-muted-foreground text-sm">Left Company</p>
                            <p className="text-2xl font-bold text-red-400 mt-1">{stats.leftCompany}</p>
                        </div>
                        <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center">
                            <UserMinusIcon className="w-6 h-6 text-red-400" />
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-4 border-b border-border">
                <button
                    onClick={() => setActiveTab("stale")}
                    className={`pb-3 px-1 text-sm font-medium transition-colors ${activeTab === "stale"
                            ? "text-primary border-b-2 border-primary"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    <ExclamationTriangleIcon className="w-4 h-4 inline mr-2" />
                    Needs Verification ({staleContacts.length})
                </button>
                <button
                    onClick={() => setActiveTab("left")}
                    className={`pb-3 px-1 text-sm font-medium transition-colors ${activeTab === "left"
                            ? "text-primary border-b-2 border-primary"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    <UserMinusIcon className="w-4 h-4 inline mr-2" />
                    Left Company ({leftCompanyContacts.length})
                </button>
            </div>

            {/* Contact Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="text-left text-sm font-medium text-muted-foreground py-3 px-4">Name</th>
                            <th className="text-left text-sm font-medium text-muted-foreground py-3 px-4">Company</th>
                            <th className="text-left text-sm font-medium text-muted-foreground py-3 px-4">Job Title</th>
                            <th className="text-left text-sm font-medium text-muted-foreground py-3 px-4">Status</th>
                            <th className="text-left text-sm font-medium text-muted-foreground py-3 px-4">Last Verified</th>
                            <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {(activeTab === "stale" ? staleContacts : leftCompanyContacts).map((contact) => (
                            <motion.tr
                                key={contact._id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="hover:bg-muted/30 transition-colors"
                            >
                                <td className="py-3 px-4">
                                    <p className="font-medium text-foreground">
                                        {contact.firstName} {contact.lastName}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{contact.email}</p>
                                </td>
                                <td className="py-3 px-4 text-foreground">
                                    {contact.company}
                                    {contact.previousCompany && (
                                        <p className="text-xs text-muted-foreground line-through">
                                            {contact.previousCompany}
                                        </p>
                                    )}
                                </td>
                                <td className="py-3 px-4 text-foreground">
                                    {contact.jobTitle}
                                    {contact.previousJobTitle && (
                                        <p className="text-xs text-muted-foreground line-through">
                                            {contact.previousJobTitle}
                                        </p>
                                    )}
                                </td>
                                <td className="py-3 px-4">
                                    <span
                                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${contact.employmentStatus === "active"
                                                ? "bg-green-500/20 text-green-400"
                                                : contact.employmentStatus === "left_company"
                                                    ? "bg-red-500/20 text-red-400"
                                                    : "bg-yellow-500/20 text-yellow-400"
                                            }`}
                                    >
                                        {contact.employmentStatus === "active"
                                            ? "Active"
                                            : contact.employmentStatus === "left_company"
                                                ? "Left Company"
                                                : "Unknown"}
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-muted-foreground text-sm">
                                    {formatDate(contact.lastVerifiedAt)}
                                </td>
                                <td className="py-3 px-4 text-right">
                                    <button
                                        onClick={() => handleVerifyContact(contact._id)}
                                        disabled={verifyingId === contact._id}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm disabled:opacity-50"
                                    >
                                        {verifyingId === contact._id ? (
                                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <ShieldCheckIcon className="w-4 h-4" />
                                        )}
                                        Verify
                                    </button>
                                </td>
                            </motion.tr>
                        ))}
                        {(activeTab === "stale" ? staleContacts : leftCompanyContacts).length === 0 && (
                            <tr>
                                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                                    {activeTab === "stale"
                                        ? "All contacts are verified! 🎉"
                                        : "No contacts have left their company."}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
