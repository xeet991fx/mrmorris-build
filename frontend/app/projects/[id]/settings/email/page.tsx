"use client";

import { useParams } from "next/navigation";
import EmailIntegrationSettings from "@/components/settings/EmailIntegrationSettings";

export default function EmailSettingsPage() {
    const params = useParams();
    const projectId = params.id as string;

    return <EmailIntegrationSettings workspaceId={projectId} />;
}
