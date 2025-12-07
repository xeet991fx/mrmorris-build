/**
 * Apollo.io API Client for Frontend
 * Provides type-safe API calls to Apollo integration endpoints
 */

import { toast } from "sonner";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// ═══════════════════════════════════════════════════════════════
// TYPESCRIPT INTERFACES
// ═══════════════════════════════════════════════════════════════

export interface ApolloPerson {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  title: string;
  email: string | null;
  email_status: "verified" | "guessed" | "unavailable" | "bounced";
  phone_numbers: Array<{
    raw_number: string;
    sanitized_number: string;
    type: "mobile" | "work" | "other";
  }>;
  linkedin_url: string | null;
  city: string;
  state: string;
  country: string;
  organization: {
    name: string;
    website_url: string;
    industry: string;
    estimated_num_employees: number;
  };
}

export interface EnrichmentResult {
  success: boolean;
  data: any; // Contact object
  creditsUsed: number;
  fieldsEnriched: string[];
  confidence: number;
  message?: string;
  alreadyEnriched?: boolean;
}

export interface SearchCriteria {
  jobTitles?: string[];
  companyDomains?: string[];
  locations?: string[];
  industries?: string[];
  companySizes?: string[];
  seniorities?: string[];
  departments?: string[];
  limit?: number;
  page?: number;
}

export interface SearchResult {
  success: boolean;
  results: ApolloPerson[];
  pagination: {
    page: number;
    per_page: number;
    total_entries: number;
    total_pages: number;
  };
  count: number;
  creditsUsed: number;
}

export interface EmailVerification {
  success: boolean;
  data: {
    email: string;
    status: "valid" | "invalid" | "risky" | "unknown";
    free_email: boolean;
    disposable: boolean;
  };
  valid: boolean;
  creditsUsed: number;
}

export interface BulkEnrichResult {
  success: boolean;
  enriched: number;
  failed: number;
  totalCreditsUsed: number;
  results: Array<{
    contactId: string;
    success: boolean;
    fieldsEnriched?: string[];
    error?: string;
  }>;
}

export interface CreditsInfo {
  success: boolean;
  remaining: number;
  limit: number;
  resetDate: string;
  usedThisMonth: number;
  percentageUsed: number;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  contacts: any[];
  errors?: Array<{
    person: string;
    error: string;
  }>;
  creditsUsed: number;
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get authentication token from localStorage
 */
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

/**
 * Make API request with authentication
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    // Handle specific error cases
    if (response.status === 401) {
      toast.error("Session expired. Please login again.");
      // Redirect to login or trigger re-auth
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    } else if (response.status === 403 && data.code === "INSUFFICIENT_CREDITS") {
      toast.error("Insufficient Apollo credits. Please upgrade your plan.");
    } else if (response.status === 429) {
      toast.error(
        `Rate limit exceeded. Please try again in ${data.retryAfter || 60} seconds.`
      );
    } else {
      toast.error(data.error || data.message || "An error occurred");
    }

    throw new Error(data.error || data.message || "API request failed");
  }

  return data as T;
}

// ═══════════════════════════════════════════════════════════════
// APOLLO API METHODS
// ═══════════════════════════════════════════════════════════════

export const apolloApi = {
  /**
   * Enrich a single contact with Apollo data
   */
  enrichContact: async (
    workspaceId: string,
    contactId: string
  ): Promise<EnrichmentResult> => {
    try {
      const result = await apiRequest<EnrichmentResult>(
        `/api/workspaces/${workspaceId}/apollo/enrich-contact`,
        {
          method: "POST",
          body: JSON.stringify({ contactId }),
        }
      );

      if (result.success && !result.alreadyEnriched) {
        toast.success(
          `Contact enriched! ${result.fieldsEnriched.length} fields updated. ${result.creditsUsed} credits used.`
        );
      } else if (result.alreadyEnriched) {
        toast.info(result.message || "Contact was recently enriched");
      }

      return result;
    } catch (error) {
      console.error("Failed to enrich contact:", error);
      throw error;
    }
  },

  /**
   * Search for people in Apollo database
   */
  searchPeople: async (
    workspaceId: string,
    criteria: SearchCriteria
  ): Promise<SearchResult> => {
    try {
      const result = await apiRequest<SearchResult>(
        `/api/workspaces/${workspaceId}/apollo/search`,
        {
          method: "POST",
          body: JSON.stringify(criteria),
        }
      );

      if (result.success) {
        toast.success(
          `Found ${result.count} contacts. ${result.creditsUsed} credits used.`
        );
      }

      return result;
    } catch (error) {
      console.error("Failed to search people:", error);
      throw error;
    }
  },

  /**
   * Enrich a company with Apollo data
   */
  enrichCompany: async (
    workspaceId: string,
    companyId?: string,
    domain?: string
  ): Promise<EnrichmentResult> => {
    try {
      const result = await apiRequest<EnrichmentResult>(
        `/api/workspaces/${workspaceId}/apollo/enrich-company`,
        {
          method: "POST",
          body: JSON.stringify({ companyId, domain }),
        }
      );

      if (result.success) {
        toast.success(`Company enriched! ${result.creditsUsed} credits used.`);
      }

      return result;
    } catch (error) {
      console.error("Failed to enrich company:", error);
      throw error;
    }
  },

  /**
   * Verify email validity
   */
  verifyEmail: async (
    workspaceId: string,
    email: string
  ): Promise<EmailVerification> => {
    try {
      const result = await apiRequest<EmailVerification>(
        `/api/workspaces/${workspaceId}/apollo/verify-email`,
        {
          method: "POST",
          body: JSON.stringify({ email }),
        }
      );

      if (result.success) {
        const statusMessage = result.valid
          ? "Email is valid ✓"
          : `Email is ${result.data.status}`;
        toast.success(`${statusMessage}. ${result.creditsUsed} credits used.`);
      }

      return result;
    } catch (error) {
      console.error("Failed to verify email:", error);
      throw error;
    }
  },

  /**
   * Bulk enrich multiple contacts
   */
  bulkEnrich: async (
    workspaceId: string,
    contactIds: string[]
  ): Promise<BulkEnrichResult> => {
    try {
      const result = await apiRequest<BulkEnrichResult>(
        `/api/workspaces/${workspaceId}/apollo/bulk-enrich`,
        {
          method: "POST",
          body: JSON.stringify({ contactIds }),
        }
      );

      if (result.success) {
        toast.success(
          `Enriched ${result.enriched} contacts. ${result.failed} failed. ${result.totalCreditsUsed} credits used.`
        );
      }

      return result;
    } catch (error) {
      console.error("Failed to bulk enrich:", error);
      throw error;
    }
  },

  /**
   * Get remaining Apollo credits
   */
  getCredits: async (workspaceId: string): Promise<CreditsInfo> => {
    try {
      return await apiRequest<CreditsInfo>(
        `/api/workspaces/${workspaceId}/apollo/credits`,
        {
          method: "GET",
        }
      );
    } catch (error) {
      console.error("Failed to get credits:", error);
      throw error;
    }
  },

  /**
   * Import contacts from Apollo search
   */
  importContacts: async (
    workspaceId: string,
    searchCriteria: SearchCriteria,
    createContacts: boolean = true,
    assignToUserId?: string,
    tags?: string[]
  ): Promise<ImportResult> => {
    try {
      const result = await apiRequest<ImportResult>(
        `/api/workspaces/${workspaceId}/apollo/import`,
        {
          method: "POST",
          body: JSON.stringify({
            searchCriteria,
            createContacts,
            assignToUserId,
            tags,
          }),
        }
      );

      if (result.success && createContacts) {
        toast.success(
          `Imported ${result.imported} contacts. ${result.creditsUsed} credits used.`
        );
      }

      return result;
    } catch (error) {
      console.error("Failed to import contacts:", error);
      throw error;
    }
  },

  /**
   * Test Apollo API connection
   */
  testConnection: async (workspaceId: string): Promise<boolean> => {
    try {
      const result = await apiRequest<{ success: boolean; connected: boolean }>(
        `/api/workspaces/${workspaceId}/apollo/test-connection`,
        {
          method: "GET",
        }
      );

      if (result.connected) {
        toast.success("Apollo API connection successful!");
      } else {
        toast.error("Apollo API connection failed. Please check your API key.");
      }

      return result.connected;
    } catch (error) {
      console.error("Failed to test connection:", error);
      toast.error("Failed to test Apollo API connection");
      return false;
    }
  },
};

export default apolloApi;
