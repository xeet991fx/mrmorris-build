"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  UserPlusIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

export default function ApolloSearchPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;

  const [isSearching, setIsSearching] = useState(false);
  const [jobTitles, setJobTitles] = useState("");
  const [locations, setLocations] = useState("");
  const [companyDomains, setCompanyDomains] = useState("");

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      // TODO: Implement search
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success("Search feature coming soon!");
    } catch (error) {
      toast.error("Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-card/95">
      {/* Header */}
      <div className="h-12 px-6 border-b border-border flex items-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3"
        >
          <MagnifyingGlassIcon className="w-5 h-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold text-foreground">Apollo Search</h1>
          <p className="text-xs text-muted-foreground">
            Find contacts and companies
          </p>
        </motion.div>
      </div>

      <div className="px-8 pt-8 pb-8">

        {/* Search Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="rounded-lg border border-border bg-card/50 p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Search Criteria</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Job Titles (comma-separated)
                </label>
                <input
                  type="text"
                  value={jobTitles}
                  onChange={(e) => setJobTitles(e.target.value)}
                  placeholder="VP Sales, CTO, Head of Marketing"
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#9ACD32]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Locations (comma-separated)
                </label>
                <input
                  type="text"
                  value={locations}
                  onChange={(e) => setLocations(e.target.value)}
                  placeholder="San Francisco, New York, Remote"
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#9ACD32]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Company Domains (comma-separated)
                </label>
                <input
                  type="text"
                  value={companyDomains}
                  onChange={(e) => setCompanyDomains(e.target.value)}
                  placeholder="example.com, company.com"
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#9ACD32]"
                />
              </div>

              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#9ACD32] text-background text-sm font-medium rounded-md hover:bg-[#8AB82E] transition-all disabled:opacity-50"
              >
                {isSearching ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <MagnifyingGlassIcon className="w-4 h-4" />
                    Search Apollo
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Info Card */}
          <div className="mt-6 rounded-lg border border-border bg-card/50 p-6">
            <h3 className="text-sm font-semibold text-foreground mb-3">Coming Soon</h3>
            <p className="text-sm text-muted-foreground">
              The Apollo search feature is currently under development. You can configure your
              Apollo integration in the settings and use the EnrichButton component on contact
              pages to enrich individual contacts.
            </p>
            <button
              onClick={() => router.push(`/projects/${workspaceId}/settings/integrations`)}
              className="mt-4 text-sm text-[#9ACD32] hover:underline"
            >
              Go to Integrations →
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
