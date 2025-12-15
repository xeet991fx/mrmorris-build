"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { BuildingOffice2Icon, InformationCircleIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { useCompanyStore } from "@/store/useCompanyStore";
import { Company } from "@/lib/api/company";
import CompaniesTableHeader from "@/components/companies/CompaniesTableHeader";
import CompaniesTable from "@/components/companies/CompaniesTable";
import AddCompanyModal from "@/components/companies/AddCompanyModal";
import EditCompanyModal from "@/components/companies/EditCompanyModal";
import ColumnManager from "@/components/contacts/ColumnManager";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ImportModal from "@/components/import/ImportModal";

export default function CompaniesPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const { companies, isLoading, fetchCompanies, deleteCompany, fetchCustomColumns } = useCompanyStore();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<string | null>(null);

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
    setIsEditModalOpen(true);
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

  if (isLoading && companies.length === 0) {
    return (
      <div className="min-h-screen bg-background px-8 pt-6 pb-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 border-3 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading companies...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-card/95 flex flex-col">
        {/* Page Header with Dividing Line */}
        <div className="h-12 px-6 border-b border-border flex items-center flex-shrink-0">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3"
          >
            <h1 className="text-lg font-semibold text-foreground">Companies</h1>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <InformationCircleIcon className="w-4 h-4" />
              <span>Manage your business relationships</span>
            </div>
          </motion.div>
        </div>

        {/* Table Header with Search and Actions - Fixed */}
        {companies.length > 0 || isLoading ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex-shrink-0"
          >
            <CompaniesTableHeader
              onAddCompany={() => setIsAddModalOpen(true)}
              onImportCompanies={() => setIsImportModalOpen(true)}
              onToggleColumnManager={() => setIsColumnManagerOpen(true)}
              workspaceId={workspaceId}
            />
          </motion.div>
        ) : null}

        {/* Main Content - Scrollable Table */}
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {companies.length === 0 && !isLoading ? (
              /* Empty State */
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 bg-neutral-800/50 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <BuildingOffice2Icon className="w-8 h-8 text-neutral-500" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground mb-2">
                    No companies yet
                  </h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Start building your business network by adding your first company. Track
                    partnerships, manage accounts, and grow your B2B relationships.
                  </p>
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#9ACD32] text-neutral-900 font-medium text-sm rounded-lg hover:bg-[#8AB82E] transition-all shadow-sm hover:shadow"
                  >
                    Add Your First Company
                  </button>
                </div>
              </div>
            ) : (
              /* Table Only */
              <CompaniesTable
                companies={companies}
                onEdit={handleEdit}
                onDelete={handleDelete}
                workspaceId={workspaceId}
              />
            )}
          </motion.div>
        </div>
      </div>

      {/* Modals */}
      <AddCompanyModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        workspaceId={workspaceId}
      />

      {selectedCompany && (
        <EditCompanyModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedCompany(null);
          }}
          workspaceId={workspaceId}
          company={selectedCompany}
        />
      )}

      <ColumnManager
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
