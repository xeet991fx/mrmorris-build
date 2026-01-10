import { useState, useEffect } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
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

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4">
      {/* Search Bar */}
      <div className="relative max-w-sm">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Search companies..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-0 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
        />
      </div>
    </div>
  );
}
