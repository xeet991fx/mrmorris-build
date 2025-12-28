import { useState, useEffect } from "react";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  FunnelIcon,
  AdjustmentsHorizontalIcon,
  TrashIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";
import { useCompanyStore } from "@/store/useCompanyStore";
import { useDebounce } from "@/hooks/useDebounce";

interface CompaniesTableHeaderProps {
  onAddCompany: () => void;
  onImportCompanies: () => void;
  onToggleColumnManager: () => void;
  workspaceId: string;
}

export default function CompaniesTableHeader({
  onAddCompany,
  onImportCompanies,
  onToggleColumnManager,
  workspaceId,
}: CompaniesTableHeaderProps) {
  const {
    searchQuery,
    setSearchQuery,
    selectedCompanies,
    clearSelectedCompanies,
    deleteCompany,
    fetchCompanies,
  } = useCompanyStore();

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [isInitialized, setIsInitialized] = useState(false);
  const debouncedSearch = useDebounce(localSearch, 300);

  // Update global search when debounced value changes (but skip initial render)
  useEffect(() => {
    if (!isInitialized) {
      setIsInitialized(true);
      return;
    }

    setSearchQuery(debouncedSearch);
    // Re-fetch companies with new search
    if (workspaceId) {
      fetchCompanies(workspaceId, { search: debouncedSearch, page: 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const handleBulkDelete = async () => {
    if (
      !window.confirm(
        `Are you sure you want to delete ${selectedCompanies.length} company(ies)?`
      )
    ) {
      return;
    }

    try {
      for (const companyId of selectedCompanies) {
        await deleteCompany(workspaceId, companyId);
      }
      clearSelectedCompanies();
    } catch (error) {
      console.error("Bulk delete error:", error);
    }
  };

  return (
    <div className="px-3 py-2 bg-card/95 border-b border-border">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        {/* Search */}
        <div className="flex-1 w-full sm:max-w-sm relative">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search companies..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-background border border-border text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 transition-colors rounded"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {selectedCompanies.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="inline-flex items-center gap-1.5 px-2 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs font-medium transition-all rounded"
            >
              <TrashIcon className="w-3.5 h-3.5" />
              Delete ({selectedCompanies.length})
            </button>
          )}

          <button
            onClick={onToggleColumnManager}
            className="inline-flex items-center gap-1.5 px-2 py-1.5 bg-background border border-border text-foreground hover:bg-muted/50 text-xs font-medium transition-all rounded"
          >
            <AdjustmentsHorizontalIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Columns</span>
          </button>

          <button
            onClick={onImportCompanies}
            className="inline-flex items-center gap-1.5 px-2 py-1.5 bg-background border border-border text-foreground hover:bg-muted/50 text-xs font-medium transition-all rounded"
          >
            <ArrowUpTrayIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Import</span>
          </button>

          <button
            onClick={onAddCompany}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-neutral-800 text-black dark:text-white font-medium text-xs hover:bg-neutral-800 transition-all border border-black flex-1 sm:flex-initial justify-center rounded"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            Add Company
          </button>
        </div>
      </div>
    </div>
  );
}
