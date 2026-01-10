"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { motion } from "framer-motion";

export default function NewFormRedirect() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;

    useEffect(() => {
        router.replace(`/projects/${projectId}/forms/new/edit`);
    }, [projectId, router]);

    return (
        <div className="h-full flex items-center justify-center">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
            >
                <div className="w-10 h-10 border-2 border-zinc-200 dark:border-zinc-700 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-zinc-500">Redirecting to form editor...</p>
            </motion.div>
        </div>
    );
}
