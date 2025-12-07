"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sparkles, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { apolloApi, type EnrichmentResult } from "@/lib/apollo-api";
import { toast } from "sonner";

interface EnrichButtonProps {
  workspaceId: string;
  contactId: string;
  contactName: string;
  onEnrichmentComplete?: (result: EnrichmentResult) => void;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "ghost" | "secondary";
}

export function EnrichButton({
  workspaceId,
  contactId,
  contactName,
  onEnrichmentComplete,
  size = "default",
  variant = "default",
}: EnrichButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichmentResult, setEnrichmentResult] = useState<EnrichmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleEnrichClick = () => {
    setIsDialogOpen(true);
    setEnrichmentResult(null);
    setError(null);
  };

  const handleConfirmEnrich = async () => {
    setIsEnriching(true);
    setError(null);

    try {
      const result = await apolloApi.enrichContact(workspaceId, contactId);
      setEnrichmentResult(result);

      if (onEnrichmentComplete) {
        onEnrichmentComplete(result);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to enrich contact";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsEnriching(false);
    }
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    setEnrichmentResult(null);
    setError(null);
  };

  return (
    <>
      <Button
        onClick={handleEnrichClick}
        size={size}
        variant={variant}
        className="gap-2"
      >
        <Sparkles className="h-4 w-4" />
        Enrich with Apollo
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {enrichmentResult
                ? "Enrichment Complete"
                : "Enrich Contact with Apollo"}
            </DialogTitle>
            <DialogDescription>
              {enrichmentResult
                ? "Here's what we found:"
                : `Find additional information for ${contactName} using Apollo.io's B2B database.`}
            </DialogDescription>
          </DialogHeader>

          {!enrichmentResult && !error && (
            <div className="py-6">
              <div className="space-y-3 text-sm">
                <p className="font-medium">What will be enriched:</p>
                <ul className="space-y-2 pl-6 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                    Email address (if available)
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                    Phone number (if available)
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                    LinkedIn profile
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                    Job title & location
                  </li>
                </ul>

                <div className="mt-4 rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Cost:</span> 1 credit
                  </p>
                </div>
              </div>
            </div>
          )}

          {enrichmentResult && (
            <div className="py-4">
              {enrichmentResult.alreadyEnriched ? (
                <div className="rounded-lg border bg-blue-50 p-4 dark:bg-blue-950/20">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    {enrichmentResult.message}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-5 w-5" />
                    Successfully enriched {enrichmentResult.fieldsEnriched.length} fields
                  </div>

                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="mb-2 text-xs font-medium">Fields updated:</p>
                    <div className="flex flex-wrap gap-2">
                      {enrichmentResult.fieldsEnriched.map((field) => (
                        <span
                          key={field}
                          className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                        >
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3 text-xs">
                    <span className="text-muted-foreground">Credits used:</span>
                    <span className="font-medium">{enrichmentResult.creditsUsed}</span>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3 text-xs">
                    <span className="text-muted-foreground">Confidence score:</span>
                    <span className="font-medium">
                      {Math.round(enrichmentResult.confidence * 100)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="py-4">
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900 dark:text-red-100">
                    Enrichment failed
                  </p>
                  <p className="mt-1 text-xs text-red-700 dark:text-red-300">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            {!enrichmentResult && !error && (
              <>
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={isEnriching}
                >
                  Cancel
                </Button>
                <Button onClick={handleConfirmEnrich} disabled={isEnriching}>
                  {isEnriching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEnriching ? "Enriching..." : "Enrich Contact"}
                </Button>
              </>
            )}

            {(enrichmentResult || error) && (
              <Button onClick={handleClose} className="w-full">
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
