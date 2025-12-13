import { useState, useEffect } from "react";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  FunnelIcon,
  AdjustmentsHorizontalIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useContactStore } from "@/store/useContactStore";
import { useDebounce } from "@/hooks/useDebounce";

interface ContactsTableHeaderProps {
  onAddContact: () => void;
  onToggleColumnManager: () => void;
  onBulkDelete?: () => void;
  workspaceId: string;
}

export default function ContactsTableHeader({
  onAddContact,
  onToggleColumnManager,
  onBulkDelete,
  workspaceId,
}: ContactsTableHeaderProps) {
  const {
    searchQuery,
    setSearchQuery,
    selectedContacts,
    clearSelectedContacts,
    deleteContact,
    fetchContacts,
  } = useContactStore();

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
    // Re-fetch contacts with new search
    if (workspaceId) {
      fetchContacts(workspaceId, { search: debouncedSearch, page: 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  return (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="flex-1 w-full sm:max-w-md relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-card/95 border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-border transition-colors"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {selectedContacts.length > 0 && onBulkDelete && (
            <button
              onClick={onBulkDelete}
              className="inline-flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-lg text-sm font-medium transition-all"
            >
              <TrashIcon className="w-4 h-4" />
              Delete ({selectedContacts.length})
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
            onClick={onAddContact}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#9ACD32] text-background font-medium text-sm rounded-lg hover:bg-[#8AB82E] transition-all shadow-sm hover:shadow flex-1 sm:flex-initial justify-center"
          >
            <PlusIcon className="w-4 h-4" />
            Add Contact
          </button>
        </div>
      </div>
    </div>
  );
}
