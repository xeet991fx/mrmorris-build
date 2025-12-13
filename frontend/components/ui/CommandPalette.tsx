"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import {
    HomeIcon,
    UserGroupIcon,
    BuildingOffice2Icon,
    Squares2X2Icon,
    RocketLaunchIcon,
    InboxIcon,
    AtSymbolIcon,
    ChartBarIcon,
    BoltIcon,
    PlusIcon,
    MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { useAuthStore } from "@/store/useAuthStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export function CommandPalette() {
    const [open, setOpen] = useState(false);
    const router = useRouter();
    const { currentWorkspace } = useWorkspaceStore();

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    // Prefetch routes when command palette opens for instant navigation
    useEffect(() => {
        if (open && currentWorkspace) {
            const baseUrl = `/projects/${currentWorkspace._id}`;
            router.prefetch(baseUrl);
            router.prefetch(`${baseUrl}/contacts`);
            router.prefetch(`${baseUrl}/companies`);
            router.prefetch(`${baseUrl}/pipelines`);
            router.prefetch(`${baseUrl}/campaigns`);
            router.prefetch(`${baseUrl}/workflows`);
            router.prefetch(`${baseUrl}/inbox`);
            router.prefetch(`${baseUrl}/email-accounts`);
            router.prefetch(`${baseUrl}/email-analytics`);
        }
    }, [open, currentWorkspace, router]);

    const runCommand = (command: () => void) => {
        setOpen(false);
        command();
    };

    if (!currentWorkspace) return null;

    return (
        <>
            {open && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <Command
                        loop
                        className="w-full max-w-2xl bg-popover/80 backdrop-blur-xl border border-border shadow-2xl rounded-xl overflow-hidden"
                    >
                        <div className="flex items-center border-b border-border px-4" cmdk-input-wrapper="">
                            <MagnifyingGlassIcon className="w-5 h-5 text-muted-foreground mr-2" />
                            <Command.Input
                                placeholder="Type a command or search..."
                                className="flex-1 h-14 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                            />
                            <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                <span className="font-mono">ESC</span>
                                <span>to close</span>
                            </div>
                        </div>

                        <Command.List className="max-h-[60vh] overflow-y-auto p-2 scrollbar-thin">
                            <Command.Empty className="py-6 text-center text-muted-foreground">
                                No results found.
                            </Command.Empty>

                            <Command.Group heading="Navigation">
                                <Command.Item
                                    onSelect={() => runCommand(() => router.push(`/projects/${currentWorkspace._id}`))}
                                >
                                    <HomeIcon className="w-5 h-5 mr-2 text-muted-foreground" />
                                    Dashboard
                                </Command.Item>
                                <Command.Item
                                    onSelect={() => runCommand(() => router.push(`/projects/${currentWorkspace._id}/contacts`))}
                                >
                                    <UserGroupIcon className="w-5 h-5 mr-2 text-muted-foreground" />
                                    Contacts
                                </Command.Item>
                                <Command.Item
                                    onSelect={() => runCommand(() => router.push(`/projects/${currentWorkspace._id}/companies`))}
                                >
                                    <BuildingOffice2Icon className="w-5 h-5 mr-2 text-muted-foreground" />
                                    Companies
                                </Command.Item>
                                <Command.Item
                                    onSelect={() => runCommand(() => router.push(`/projects/${currentWorkspace._id}/pipelines`))}
                                >
                                    <Squares2X2Icon className="w-5 h-5 mr-2 text-muted-foreground" />
                                    Pipelines
                                </Command.Item>
                                <Command.Item
                                    onSelect={() => runCommand(() => router.push(`/projects/${currentWorkspace._id}/campaigns`))}
                                >
                                    <RocketLaunchIcon className="w-5 h-5 mr-2 text-muted-foreground" />
                                    Campaigns
                                </Command.Item>
                                <Command.Item
                                    onSelect={() => runCommand(() => router.push(`/projects/${currentWorkspace._id}/workflows`))}
                                >
                                    <BoltIcon className="w-5 h-5 mr-2 text-muted-foreground" />
                                    Workflows
                                </Command.Item>
                                <Command.Item
                                    onSelect={() => runCommand(() => router.push(`/projects/${currentWorkspace._id}/inbox`))}
                                >
                                    <InboxIcon className="w-5 h-5 mr-2 text-muted-foreground" />
                                    Inbox
                                </Command.Item>
                                <Command.Item
                                    onSelect={() => runCommand(() => router.push(`/projects/${currentWorkspace._id}/email-accounts`))}
                                >
                                    <AtSymbolIcon className="w-5 h-5 mr-2 text-muted-foreground" />
                                    Email Accounts
                                </Command.Item>
                                <Command.Item
                                    onSelect={() => runCommand(() => router.push(`/projects/${currentWorkspace._id}/email-analytics`))}
                                >
                                    <ChartBarIcon className="w-5 h-5 mr-2 text-muted-foreground" />
                                    Analytics
                                </Command.Item>
                            </Command.Group>

                            <Command.Group heading="Quick Actions">
                                <Command.Item
                                    onSelect={() => runCommand(() => router.push(`/projects/${currentWorkspace._id}/campaigns?new=true`))}
                                >
                                    <RocketLaunchIcon className="w-5 h-5 mr-2 text-primary" />
                                    Create Campaign
                                </Command.Item>
                                <Command.Item
                                    onSelect={() => runCommand(() => router.push(`/projects/${currentWorkspace._id}/workflows?new=true`))}
                                >
                                    <BoltIcon className="w-5 h-5 mr-2 text-primary" />
                                    Create Workflow
                                </Command.Item>
                                <Command.Item
                                    onSelect={() => runCommand(() => router.push(`/projects/${currentWorkspace._id}/contacts`))}
                                >
                                    <PlusIcon className="w-5 h-5 mr-2 text-primary" />
                                    Add Contact
                                </Command.Item>
                            </Command.Group>
                        </Command.List>
                    </Command>
                </div>
            )}
        </>
    );
}
