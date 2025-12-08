"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
    <div className="min-h-screen bg-background px-8 pt-14 pb-8">
      {/* Breadcrumb */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-5 flex items-center gap-2 text-sm"
      >
        <button
          onClick={() => router.push(`/projects/${workspaceId}`)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Dashboard
        </button>
        <ChevronRightIcon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-foreground font-medium">Apollo Search</span>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-foreground mb-1">
          Find Contacts with Apollo
        </h1>
        <p className="text-sm text-muted-foreground">
          Search Apollo.io&apos;s database of 275M+ contacts and companies
        </p>
      </motion.div>

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
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
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
            className="mt-4 text-sm text-primary hover:underline"
          >
            Go to Integrations →
          </button>
        </div>
      </motion.div>
    </div>
  );
}
