import { create } from "zustand";
import { getTeam, TeamMember } from "@/lib/api/team";
import { getContacts, Contact } from "@/lib/api/contact";
import { getCompanies, Company } from "@/lib/api/company";

interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface FormDataCacheState {
  // Data
  teamMembers: SelectOption[];
  contacts: SelectOption[];
  companies: SelectOption[];

  // Loading states
  isLoadingTeam: boolean;
  isLoadingContacts: boolean;
  isLoadingCompanies: boolean;

  // Cache timestamps (for stale checking)
  teamFetchedAt: number | null;
  contactsFetchedAt: number | null;
  companiesFetchedAt: number | null;

  // Current workspace (to invalidate cache on workspace change)
  currentWorkspaceId: string | null;

  // Actions
  fetchTeamMembers: (workspaceId: string, force?: boolean) => Promise<void>;
  fetchContacts: (workspaceId: string, force?: boolean) => Promise<void>;
  fetchCompanies: (workspaceId: string, force?: boolean) => Promise<void>;
  fetchAllFormData: (workspaceId: string, force?: boolean) => Promise<void>;
  clearCache: () => void;
}

// Cache is considered stale after 5 minutes
const CACHE_TTL = 5 * 60 * 1000;

export const useFormDataCache = create<FormDataCacheState>((set, get) => ({
  // Data
  teamMembers: [],
  contacts: [],
  companies: [],

  // Loading states
  isLoadingTeam: false,
  isLoadingContacts: false,
  isLoadingCompanies: false,

  // Cache timestamps
  teamFetchedAt: null,
  contactsFetchedAt: null,
  companiesFetchedAt: null,

  // Current workspace
  currentWorkspaceId: null,

  fetchTeamMembers: async (workspaceId: string, force = false) => {
    const state = get();

    // Check if cache is still valid
    const isSameWorkspace = state.currentWorkspaceId === workspaceId;
    const isCacheValid = state.teamFetchedAt && (Date.now() - state.teamFetchedAt) < CACHE_TTL;

    if (isSameWorkspace && isCacheValid && state.teamMembers.length > 0 && !force) {
      return; // Use cached data
    }

    set({ isLoadingTeam: true });

    try {
      const response = await getTeam(workspaceId);
      if (response.success && response.data) {
        const members: SelectOption[] = [];

        // Add owner
        if (response.data.owner) {
          const owner = response.data.owner;
          members.push({
            value: owner._id,
            label: owner.name,
            sublabel: `${owner.email} (Owner)`,
          });
        }

        // Add team members
        response.data.members.forEach((member: TeamMember) => {
          if (member.userId && member.status === "active") {
            members.push({
              value: member.userId._id,
              label: member.userId.name,
              sublabel: member.userId.email,
            });
          }
        });

        set({
          teamMembers: members,
          teamFetchedAt: Date.now(),
          currentWorkspaceId: workspaceId,
        });
      }
    } catch (error) {
      console.error("Failed to fetch team:", error);
    } finally {
      set({ isLoadingTeam: false });
    }
  },

  fetchContacts: async (workspaceId: string, force = false) => {
    const state = get();

    // Check if cache is still valid
    const isSameWorkspace = state.currentWorkspaceId === workspaceId;
    const isCacheValid = state.contactsFetchedAt && (Date.now() - state.contactsFetchedAt) < CACHE_TTL;

    if (isSameWorkspace && isCacheValid && state.contacts.length > 0 && !force) {
      return; // Use cached data
    }

    set({ isLoadingContacts: true });

    try {
      const response = await getContacts(workspaceId, { limit: 500 });
      if (response.success && response.data) {
        set({
          contacts: response.data.contacts.map((contact: Contact) => ({
            value: contact._id,
            label: `${contact.firstName} ${contact.lastName}`,
            sublabel: contact.email || contact.company,
          })),
          contactsFetchedAt: Date.now(),
          currentWorkspaceId: workspaceId,
        });
      }
    } catch (error) {
      console.error("Failed to fetch contacts:", error);
    } finally {
      set({ isLoadingContacts: false });
    }
  },

  fetchCompanies: async (workspaceId: string, force = false) => {
    const state = get();

    // Check if cache is still valid
    const isSameWorkspace = state.currentWorkspaceId === workspaceId;
    const isCacheValid = state.companiesFetchedAt && (Date.now() - state.companiesFetchedAt) < CACHE_TTL;

    if (isSameWorkspace && isCacheValid && state.companies.length > 0 && !force) {
      return; // Use cached data
    }

    set({ isLoadingCompanies: true });

    try {
      const response = await getCompanies(workspaceId, { limit: 500 });
      if (response.success && response.data) {
        set({
          companies: response.data.companies.map((company: Company) => ({
            value: company._id,
            label: company.name,
          })),
          companiesFetchedAt: Date.now(),
          currentWorkspaceId: workspaceId,
        });
      }
    } catch (error) {
      console.error("Failed to fetch companies:", error);
    } finally {
      set({ isLoadingCompanies: false });
    }
  },

  fetchAllFormData: async (workspaceId: string, force = false) => {
    const state = get();

    // Fetch all in parallel
    await Promise.all([
      state.fetchTeamMembers(workspaceId, force),
      state.fetchContacts(workspaceId, force),
      state.fetchCompanies(workspaceId, force),
    ]);
  },

  clearCache: () => {
    set({
      teamMembers: [],
      contacts: [],
      companies: [],
      teamFetchedAt: null,
      contactsFetchedAt: null,
      companiesFetchedAt: null,
      currentWorkspaceId: null,
    });
  },
}));
