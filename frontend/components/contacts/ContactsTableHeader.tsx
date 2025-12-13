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
    <div className="px-3 py-2 bg-card/95 border-b border-border">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        {/* Search */}
        <div className="flex-1 w-full sm:max-w-sm relative">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-background border border-border text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 transition-colors rounded"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {selectedContacts.length > 0 && onBulkDelete && (
            <button
              onClick={onBulkDelete}
              className="inline-flex items-center gap-1.5 px-2 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs font-medium transition-all rounded"
            >
              <TrashIcon className="w-3.5 h-3.5" />
              Delete ({selectedContacts.length})
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
            onClick={onAddContact}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#9ACD32] text-background font-medium text-xs hover:bg-[#8AB82E] transition-all border border-[#9ACD32] flex-1 sm:flex-initial justify-center rounded"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            Add Contact
          </button>
        </div>
      </div>
    </div>
  );
}
