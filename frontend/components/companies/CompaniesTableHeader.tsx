import { useState, useEffect } from "react";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  FunnelIcon,
  AdjustmentsHorizontalIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useCompanyStore } from "@/store/useCompanyStore";
import { useDebounce } from "@/hooks/useDebounce";

interface CompaniesTableHeaderProps {
  onAddCompany: () => void;
  onToggleColumnManager: () => void;
  workspaceId: string;
}

export default function CompaniesTableHeader({
  onAddCompany,
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
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="flex-1 w-full sm:max-w-md relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search companies..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-card/95 border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-border transition-colors"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {selectedCompanies.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="inline-flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-lg text-sm font-medium transition-all"
            >
              <TrashIcon className="w-4 h-4" />
              Delete ({selectedCompanies.length})
            </button>
          )}

          <button
            onClick={onToggleColumnManager}
            className="inline-flex items-center gap-2 px-3 py-2 bg-card/95 border border-border text-foreground hover:text-foreground hover:border-border rounded-lg text-sm font-medium transition-all"
          >
            <AdjustmentsHorizontalIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Columns</span>
          </button>

          <button
            onClick={onAddCompany}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#9ACD32] text-background font-medium text-sm rounded-lg hover:bg-[#8AB82E] transition-all shadow-sm hover:shadow flex-1 sm:flex-initial justify-center"
          >
            <PlusIcon className="w-4 h-4" />
            Add Company
          </button>
        </div>
      </div>
    </div>
  );
}
