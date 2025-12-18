"use client";

import { Contact } from "@/lib/api/contact";
import { useContactStore } from "@/store/useContactStore";
import { format } from "date-fns";
import {
    EnvelopeIcon,
    PhoneIcon,
    BuildingOffice2Icon,
    BriefcaseIcon,
    GlobeAltIcon,
    MapPinIcon,
    ClipboardDocumentIcon,
    TagIcon,
    UserIcon,
    CalendarIcon,
    ChartBarIcon,
    LinkIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import LeadScoreBadge from "../LeadScoreBadge";

interface ContactDetailsPanelProps {
    contact: Contact;
    workspaceId: string;
}

export default function ContactDetailsPanel({
    contact,
    workspaceId,
}: ContactDetailsPanelProps) {
    const { customColumns } = useContactStore();

    const fullName = `${contact.firstName} ${contact.lastName}`;
    const initials = `${contact.firstName?.[0] || ""}${contact.lastName?.[0] || ""}`.toUpperCase();

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard`);
    };

    // Get status styling
    const getStatusStyle = (status: string | undefined) => {
        switch (status) {
            case "customer":
                return "bg-green-500/10 text-green-400 border-green-500/20";
            case "prospect":
                return "bg-blue-500/10 text-blue-400 border-blue-500/20";
            case "lead":
                return "bg-amber-500/10 text-amber-400 border-amber-500/20";
            case "inactive":
                return "bg-muted text-muted-foreground border-border";
            default:
                return "bg-muted text-muted-foreground border-border";
        }
    };

    // Placeholder component for empty values
    const Placeholder = ({ text = "Not provided" }: { text?: string }) => (
        <span className="text-muted-foreground/60 italic text-sm">{text}</span>
    );

    return (
        <div className="p-4 space-y-6">
            {/* Profile Header */}
            <div className="text-center pb-4 border-b border-border">
                {/* Avatar */}
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#9ACD32] to-emerald-600 flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl font-bold text-white">{initials || "?"}</span>
                </div>

                {/* Name */}
                <h2 className="text-xl font-semibold text-foreground">{fullName}</h2>

                {/* Job Title & Company */}
                <p className="text-sm text-muted-foreground mt-1">
                    {contact.jobTitle || <Placeholder text="No title" />}
                    {" @ "}
                    {contact.company || <Placeholder text="No company" />}
                </p>

                {/* Status & Lead Score */}
                <div className="flex items-center justify-center gap-2 mt-3">
                    <span
                        className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                            getStatusStyle(contact.status)
                        )}
                    >
                        {contact.status || "lead"}
                    </span>
                    {contact.leadScore ? (
                        <LeadScoreBadge
                            score={contact.leadScore.currentScore}
                            grade={contact.leadScore.grade}
                            size="sm"
                            showScore={true}
                        />
                    ) : (
                        <span className="px-2.5 py-0.5 text-xs font-medium text-muted-foreground/60 bg-muted/50 rounded-full border border-border">
                            No score
                        </span>
                    )}
                </div>
            </div>

            {/* Lead Score Section */}
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <ChartBarIcon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">Lead Score</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                        Grade: {contact.leadScore?.grade || "—"}
                    </span>
                </div>
                {contact.leadScore ? (
                    <>
                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-[#9ACD32] to-emerald-500 rounded-full transition-all"
                                    style={{ width: `${contact.leadScore.currentScore}%` }}
                                />
                            </div>
                            <span className="text-lg font-bold text-foreground">
                                {contact.leadScore.currentScore}
                            </span>
                        </div>
                        {contact.leadScore.previousScore !== contact.leadScore.currentScore && (
                            <p className="text-xs text-muted-foreground mt-1">
                                {contact.leadScore.currentScore > contact.leadScore.previousScore ? "↑" : "↓"}{" "}
                                {Math.abs(contact.leadScore.currentScore - contact.leadScore.previousScore)} from{" "}
                                {contact.leadScore.previousScore}
                            </p>
                        )}
                    </>
                ) : (
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-muted-foreground/20 rounded-full w-0" />
                        </div>
                        <span className="text-lg font-bold text-muted-foreground/50">—</span>
                    </div>
                )}
            </div>

            {/* Contact Methods */}
            <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Contact Info
                </h3>

                {/* Email */}
                <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-2 text-sm">
                        <EnvelopeIcon className="w-4 h-4 text-muted-foreground" />
                        {contact.email ? (
                            <a
                                href={`mailto:${contact.email}`}
                                className="text-foreground hover:text-[#9ACD32] transition-colors truncate"
                            >
                                {contact.email}
                            </a>
                        ) : (
                            <Placeholder text="No email" />
                        )}
                    </div>
                    {contact.email && (
                        <button
                            onClick={() => copyToClipboard(contact.email!, "Email")}
                            className="p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <ClipboardDocumentIcon className="w-4 h-4 text-muted-foreground" />
                        </button>
                    )}
                </div>

                {/* Phone */}
                <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-2 text-sm">
                        <PhoneIcon className="w-4 h-4 text-muted-foreground" />
                        {contact.phone ? (
                            <a
                                href={`tel:${contact.phone}`}
                                className="text-foreground hover:text-[#9ACD32] transition-colors"
                            >
                                {contact.phone}
                            </a>
                        ) : (
                            <Placeholder text="No phone" />
                        )}
                    </div>
                    {contact.phone && (
                        <button
                            onClick={() => copyToClipboard(contact.phone!, "Phone")}
                            className="p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <ClipboardDocumentIcon className="w-4 h-4 text-muted-foreground" />
                        </button>
                    )}
                </div>

                {/* Company */}
                <div className="flex items-center gap-2 text-sm">
                    <BuildingOffice2Icon className="w-4 h-4 text-muted-foreground" />
                    {contact.company ? (
                        <span className="text-foreground">{contact.company}</span>
                    ) : (
                        <Placeholder text="No company" />
                    )}
                </div>

                {/* Job Title */}
                <div className="flex items-center gap-2 text-sm">
                    <BriefcaseIcon className="w-4 h-4 text-muted-foreground" />
                    {contact.jobTitle ? (
                        <span className="text-foreground">{contact.jobTitle}</span>
                    ) : (
                        <Placeholder text="No job title" />
                    )}
                </div>
            </div>

            {/* Social Links */}
            <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Social Links
                </h3>

                {/* LinkedIn */}
                <div className="flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4 text-muted-foreground" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                    {contact.linkedin ? (
                        <a
                            href={contact.linkedin.startsWith("http") ? contact.linkedin : `https://${contact.linkedin}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-foreground hover:text-[#0A66C2] transition-colors truncate"
                        >
                            LinkedIn Profile
                        </a>
                    ) : (
                        <Placeholder text="Not connected" />
                    )}
                </div>

                {/* Twitter */}
                <div className="flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4 text-muted-foreground" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                    </svg>
                    {contact.twitter ? (
                        <a
                            href={contact.twitter.startsWith("http") ? contact.twitter : `https://twitter.com/${contact.twitter.replace("@", "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-foreground hover:text-[#1DA1F2] transition-colors truncate"
                        >
                            {contact.twitter}
                        </a>
                    ) : (
                        <Placeholder text="Not connected" />
                    )}
                </div>

                {/* Website */}
                <div className="flex items-center gap-2 text-sm">
                    <GlobeAltIcon className="w-4 h-4 text-muted-foreground" />
                    {contact.website ? (
                        <a
                            href={contact.website.startsWith("http") ? contact.website : `https://${contact.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-foreground hover:text-[#9ACD32] transition-colors truncate"
                        >
                            {contact.website}
                        </a>
                    ) : (
                        <Placeholder text="No website" />
                    )}
                </div>
            </div>

            {/* Address */}
            <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Address
                </h3>
                <div className="flex items-start gap-2 text-sm">
                    <MapPinIcon className="w-4 h-4 text-muted-foreground mt-0.5" />
                    {contact.address && (contact.address.street || contact.address.city || contact.address.country) ? (
                        <div className="text-foreground">
                            {contact.address.street && <p>{contact.address.street}</p>}
                            <p>
                                {[contact.address.city, contact.address.state, contact.address.zipCode]
                                    .filter(Boolean)
                                    .join(", ") || <Placeholder text="No city/state" />}
                            </p>
                            {contact.address.country && <p>{contact.address.country}</p>}
                        </div>
                    ) : (
                        <Placeholder text="No address provided" />
                    )}
                </div>
            </div>

            {/* Metadata */}
            <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Details
                </h3>

                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                        <UserIcon className="w-4 h-4" />
                        Source
                    </span>
                    <span className="text-foreground">{contact.source || <Placeholder text="Unknown" />}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        Created
                    </span>
                    <span className="text-foreground">
                        {format(new Date(contact.createdAt), "MMM d, yyyy")}
                    </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        Last Contact
                    </span>
                    <span className="text-foreground">
                        {contact.lastContactedAt ? (
                            format(new Date(contact.lastContactedAt), "MMM d, yyyy")
                        ) : (
                            <Placeholder text="Never" />
                        )}
                    </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                        <UserIcon className="w-4 h-4" />
                        Assigned To
                    </span>
                    <span className="text-foreground">{contact.assignedTo || <Placeholder text="Unassigned" />}</span>
                </div>
            </div>

            {/* Custom Fields */}
            <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Custom Fields
                </h3>
                {contact.customFields && Object.keys(contact.customFields).length > 0 ? (
                    Object.entries(contact.customFields).map(([key, value]) => {
                        const columnDef = customColumns.find((col) => col.fieldKey === key);
                        return (
                            <div key={key} className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">
                                    {columnDef?.fieldLabel || key}
                                </span>
                                <span className="text-foreground">{String(value) || "—"}</span>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-sm">
                        <Placeholder text="No custom fields defined" />
                    </div>
                )}
            </div>

            {/* Tags */}
            <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <TagIcon className="w-4 h-4" />
                    Tags
                </h3>
                {contact.tags && contact.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                        {contact.tags.map((tag) => (
                            <span
                                key={tag}
                                className="px-2 py-0.5 text-xs font-medium rounded-full bg-[#9ACD32]/10 text-[#9ACD32] border border-[#9ACD32]/20"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                ) : (
                    <div className="text-sm">
                        <Placeholder text="No tags" />
                    </div>
                )}
            </div>

            {/* Notes Preview */}
            <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Notes Preview
                </h3>
                <div className="p-3 rounded-lg bg-muted/30 border border-border text-sm">
                    {contact.notes ? (
                        <p className="text-foreground line-clamp-3">{contact.notes}</p>
                    ) : (
                        <Placeholder text="No notes added" />
                    )}
                </div>
            </div>
        </div>
    );
}
