import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as dealApi from "@/lib/api/deal";
import type { Deal, CreateDealData, UpdateDealData, DealQueryParams } from "@/lib/api/deal";

export type DealStage = "lead" | "qualified" | "proposal" | "negotiation" | "closed_won" | "closed_lost";

export interface DealState {
    deals: Deal[];
    currentDeal: Deal | null;
    isLoading: boolean;
    error: string | null;
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
    selectedDeals: string[];
    searchQuery: string;
    filters: {
        stage?: DealStage;
        companyId?: string;
        assignedTo?: string;
    };

    // Actions
    fetchDeals: (workspaceId: string, params?: DealQueryParams) => Promise<void>;
    fetchDeal: (workspaceId: string, dealId: string) => Promise<void>;
    createDeal: (workspaceId: string, data: CreateDealData) => Promise<Deal | null>;
    updateDeal: (workspaceId: string, dealId: string, data: UpdateDealData) => Promise<Deal | null>;
    deleteDeal: (workspaceId: string, dealId: string) => Promise<boolean>;
    updateDealStage: (workspaceId: string, dealId: string, stage: DealStage) => Promise<Deal | null>;
    setCurrentDeal: (deal: Deal | null) => void;
    setSearchQuery: (query: string) => void;
    setFilters: (filters: Partial<DealState["filters"]>) => void;
    toggleDealSelection: (dealId: string) => void;
    clearSelectedDeals: () => void;
    selectAllDeals: () => void;
    clearError: () => void;
}

export const useDealStore = create<DealState>()(
    persist(
        (set, get) => ({
            deals: [],
            currentDeal: null,
            isLoading: false,
            error: null,
            pagination: {
                page: 1,
                limit: 20,
                total: 0,
                pages: 0,
            },
            selectedDeals: [],
            searchQuery: "",
            filters: {},

            fetchDeals: async (workspaceId: string, params?: DealQueryParams) => {
                set({ isLoading: true, error: null });
                try {
                    const state = get();
                    const queryParams: DealQueryParams = {
                        ...params,
                        search: params?.search || state.searchQuery || undefined,
                        stage: params?.stage || state.filters.stage,
                        companyId: params?.companyId || state.filters.companyId,
                        assignedTo: params?.assignedTo || state.filters.assignedTo,
                    };

                    const result = await dealApi.getDeals(workspaceId, queryParams);
                    if (result.success && result.data) {
                        set({
                            deals: result.data.deals,
                            pagination: result.data.pagination,
                            isLoading: false,
                        });
                    } else {
                        set({ error: result.error || "Failed to fetch deals", isLoading: false });
                    }
                } catch (error: any) {
                    set({ error: error.message || "Failed to fetch deals", isLoading: false });
                }
            },

            fetchDeal: async (workspaceId: string, dealId: string) => {
                set({ isLoading: true, error: null });
                try {
                    const result = await dealApi.getDeal(workspaceId, dealId);
                    if (result.success && result.data) {
                        set({ currentDeal: result.data.deal, isLoading: false });
                    } else {
                        set({ error: result.error || "Failed to fetch deal", isLoading: false });
                    }
                } catch (error: any) {
                    set({ error: error.message || "Failed to fetch deal", isLoading: false });
                }
            },

            createDeal: async (workspaceId: string, data: CreateDealData) => {
                set({ isLoading: true, error: null });
                try {
                    const result = await dealApi.createDeal(workspaceId, data);
                    if (result.success && result.data) {
                        set((state) => ({
                            deals: [result.data!.deal, ...state.deals],
                            isLoading: false,
                        }));
                        return result.data.deal;
                    } else {
                        set({ error: result.error || "Failed to create deal", isLoading: false });
                        return null;
                    }
                } catch (error: any) {
                    set({ error: error.message || "Failed to create deal", isLoading: false });
                    return null;
                }
            },

            updateDeal: async (workspaceId: string, dealId: string, data: UpdateDealData) => {
                set({ isLoading: true, error: null });
                try {
                    const result = await dealApi.updateDeal(workspaceId, dealId, data);
                    if (result.success && result.data) {
                        set((state) => ({
                            deals: state.deals.map((d) => (d._id === dealId ? result.data!.deal : d)),
                            currentDeal: state.currentDeal?._id === dealId ? result.data!.deal : state.currentDeal,
                            isLoading: false,
                        }));
                        return result.data.deal;
                    } else {
                        set({ error: result.error || "Failed to update deal", isLoading: false });
                        return null;
                    }
                } catch (error: any) {
                    set({ error: error.message || "Failed to update deal", isLoading: false });
                    return null;
                }
            },

            deleteDeal: async (workspaceId: string, dealId: string) => {
                set({ isLoading: true, error: null });
                try {
                    const result = await dealApi.deleteDeal(workspaceId, dealId);
                    if (result.success) {
                        set((state) => ({
                            deals: state.deals.filter((d) => d._id !== dealId),
                            selectedDeals: state.selectedDeals.filter((id) => id !== dealId),
                            isLoading: false,
                        }));
                        return true;
                    } else {
                        set({ error: result.error || "Failed to delete deal", isLoading: false });
                        return false;
                    }
                } catch (error: any) {
                    set({ error: error.message || "Failed to delete deal", isLoading: false });
                    return false;
                }
            },

            updateDealStage: async (workspaceId: string, dealId: string, stage: DealStage) => {
                return get().updateDeal(workspaceId, dealId, { stage });
            },

            setCurrentDeal: (deal: Deal | null) => {
                set({ currentDeal: deal });
            },

            setSearchQuery: (query: string) => {
                set({ searchQuery: query });
            },

            setFilters: (filters: Partial<DealState["filters"]>) => {
                set((state) => ({
                    filters: { ...state.filters, ...filters },
                }));
            },

            toggleDealSelection: (dealId: string) => {
                set((state) => ({
                    selectedDeals: state.selectedDeals.includes(dealId)
                        ? state.selectedDeals.filter((id) => id !== dealId)
                        : [...state.selectedDeals, dealId],
                }));
            },

            clearSelectedDeals: () => {
                set({ selectedDeals: [] });
            },

            selectAllDeals: () => {
                set((state) => ({
                    selectedDeals: state.deals.map((d) => d._id),
                }));
            },

            clearError: () => {
                set({ error: null });
            },
        }),
        {
            name: "deal-store",
            partialize: (state) => ({
                searchQuery: state.searchQuery,
                filters: state.filters,
            }),
        }
    )
);
