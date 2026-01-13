"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  BuildingOffice2Icon,
  PlusIcon,
  ArrowDownTrayIcon,
  Cog6ToothIcon,
  SparklesIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { useCompanyStore } from "@/store/useCompanyStore";
import { Company } from "@/lib/api/company";
import CompaniesTableHeader from "@/components/companies/CompaniesTableHeader";
import CompaniesTable from "@/components/companies/CompaniesTable";
import AddCompanySlideOver from "@/components/companies/AddCompanySlideOver";
import EditCompanySlideOver from "@/components/companies/EditCompanySlideOver";
import CompanyColumnManager from "@/components/companies/CompanyColumnManager";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ImportModal from "@/components/import/ImportModal";
import { useInsightTracking } from "@/hooks/useInsightTracking";
import { CompanyIntelligencePanel } from "@/components/companies/CompanyIntelligencePanel";
import { cn } from "@/lib/utils";

export default function CompaniesPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const { companies, isLoading, fetchCompanies, deleteCompany, bulkDeleteCompanies, fetchCustomColumns, selectedCompanies } = useCompanyStore();

  const [isAddSlideOverOpen, setIsAddSlideOverOpen] = useState(false);
  const [isEditSlideOverOpen, setIsEditSlideOverOpen] = useState(false);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<string | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);

  const { track } = useInsightTracking({
    workspaceId,
    page: 'companies',
    enabled: !!workspaceId,
  });

  // Fetch companies and custom columns on mount
  useEffect(() => {
    if (workspaceId) {
      fetchCompanies(workspaceId);
      fetchCustomColumns(workspaceId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const handleEdit = (company: Company) => {
    setSelectedCompany(company);
    setIsEditSlideOverOpen(true);
  };

  const handleDelete = (companyId: string) => {
    setCompanyToDelete(companyId);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!companyToDelete) return;

    try {
      await deleteCompany(workspaceId, companyToDelete);
      toast.success("Company deleted successfully");
      setCompanyToDelete(null);
    } catch (error) {
      toast.error("Failed to delete company");
    }
  };

  const handleBulkDelete = () => {
    if (selectedCompanies.length === 0) return;
    setBulkDeleteConfirmOpen(true);
  };

  const confirmBulkDelete = async () => {
    try {
      const deletedCount = await bulkDeleteCompanies(workspaceId, selectedCompanies);
      toast.success(`Deleted ${deletedCount} companies`);
    } catch (error) {
      toast.error("Failed to delete companies");
    }
  };

  if (isLoading && companies.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-400">
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading companies...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col overflow-hidden">
        <div className="px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-4 flex-shrink-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                Companies
              </h1>
              {companies.length > 0 && (
                <span className="px-2.5 py-1 text-sm font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                  {companies.length}
                </span>
              )}
              {selectedCompanies.length > 0 && (
                <span className="px-2.5 py-1 text-sm font-medium text-blue-600 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  {selectedCompanies.length} selected
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setShowAIPanel(!showAIPanel)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm rounded-full transition-colors",
                  showAIPanel
                    ? "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                )}
              >
                <SparklesIcon className="w-4 h-4" />
                <span className="hidden sm:inline">AI Insights</span>
              </button>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Import</span>
              </button>
              <button
                onClick={() => setIsColumnManagerOpen(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <Cog6ToothIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Columns</span>
              </button>
              {selectedCompanies.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                >
                  <TrashIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              )}
              <button
                onClick={() => setIsAddSlideOverOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-sm"
              >
                <PlusIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Add Company</span>
              </button>
            </div>
          </motion.div>
        </div>

        {/* Divider */}
        <div className="mx-4 sm:mx-6 lg:mx-8 border-t border-zinc-200 dark:border-zinc-800" />

        {/* AI Intelligence Panel (Collapsible) */}
        <AnimatePresence>
          {showAIPanel && companies.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 sm:px-6 lg:px-8 overflow-hidden"
            >
              <div className="py-4">
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                  <CompanyIntelligencePanel workspaceId={workspaceId} companies={companies} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Table Header with Search */}
        {(companies.length > 0 || isLoading) && (
          <CompaniesTableHeader
            onAddCompany={() => setIsAddSlideOverOpen(true)}
            onImportCompanies={() => setIsImportModalOpen(true)}
            onToggleColumnManager={() => setIsColumnManagerOpen(true)}
            workspaceId={workspaceId}
          />
        )}
        {/* Main Content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {companies.length === 0 && !isLoading ? (
            /* Empty State */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center py-16 px-4"
            >
              <div className="text-center max-w-md">
                <BuildingOffice2Icon className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  No companies yet
                </h2>
                <p className="text-sm text-zinc-500 mb-6">
                  Start building your business network by adding your first company. Track
                  partnerships, manage accounts, and grow your B2B relationships.
                </p>
                <button
                  onClick={() => setIsAddSlideOverOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-sm"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Your First Company
                </button>
              </div>
            </motion.div>
          ) : (
            /* Table */
            <div className="px-4 sm:px-6 lg:px-8 h-full">
              <CompaniesTable
                companies={companies}
                onEdit={handleEdit}
                onDelete={handleDelete}
                workspaceId={workspaceId}
              />
            </div>
          )}
        </div>
      </div>

      {/* Slide-over Forms */}
      <AddCompanySlideOver
        isOpen={isAddSlideOverOpen}
        onClose={() => setIsAddSlideOverOpen(false)}
        workspaceId={workspaceId}
      />

      <EditCompanySlideOver
        isOpen={isEditSlideOverOpen}
        onClose={() => {
          setIsEditSlideOverOpen(false);
          setSelectedCompany(null);
        }}
        workspaceId={workspaceId}
        company={selectedCompany}
      />

      <CompanyColumnManager
        isOpen={isColumnManagerOpen}
        onClose={() => setIsColumnManagerOpen(false)}
      />

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setCompanyToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Company"
        message="Are you sure you want to delete this company? This action cannot be undone."
        confirmText="Delete Company"
        cancelText="Cancel"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={bulkDeleteConfirmOpen}
        onClose={() => setBulkDeleteConfirmOpen(false)}
        onConfirm={confirmBulkDelete}
        title="Delete Selected Companies"
        message={`Are you sure you want to delete ${selectedCompanies.length} company/companies? This action cannot be undone.`}
        confirmText={`Delete ${selectedCompanies.length} Companies`}
        cancelText="Cancel"
        variant="danger"
      />

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        workspaceId={workspaceId}
        type="companies"
        onSuccess={() => fetchCompanies(workspaceId)}
      />
    </>
  );
}
