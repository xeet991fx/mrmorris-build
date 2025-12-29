"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function NewFormRedirect() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;

    useEffect(() => {
        // Redirect to the edit page with 'new' as the formId
        router.replace(`/projects/${projectId}/forms/new/edit`);
    }, [projectId, router]);

    return (
        <div className="flex items-center justify-center h-screen">
            <p className="text-muted-foreground">Redirecting...</p>
        </div>
    );
}
