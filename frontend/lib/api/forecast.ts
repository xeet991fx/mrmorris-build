/**
 * Forecasting API Client
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Helper to get auth token
function getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
}

// Helper to get auth headers
function getAuthHeaders(): HeadersInit {
    const token = getAuthToken();
    return {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
    };
}

export interface ForecastData {
    period: string;
    forecast: {
        committed: number;
        weightedPipeline: number;
        bestCase: number;
        dealCount: number;
    };
    deals: Array<{
        id: string;
        title: string;
        value: number;
        probability: number;
        adjustedProbability: number;
        expectedClose: string;
        category: 'committed' | 'probable' | 'possible';
    }>;
}

export interface TrendData {
    metric: string;
    periods: Array<{
        period: string;
        value: number;
        count: number;
    }>;
    trend: {
        direction: 'up' | 'down' | 'stable';
        percentChange: number;
    };
}

export interface RiskData {
    totalAtRisk: number;
    totalValueAtRisk: number;
    deals: Array<{
        id: string;
        title: string;
        value: number;
        contact: string | null;
        riskScore: number;
        risks: string[];
        recommendation: string;
    }>;
}

export interface SummaryData {
    reportType: string;
    period: string;
    metrics: {
        newDeals: number;
        dealsWon: number;
        wonValue: number;
        dealsLost: number;
        winRate: number;
        openPipeline: number;
        pipelineValue: number;
        activities: number;
    };
}

/**
 * Get revenue forecast
 */
export async function getForecast(
    workspaceId: string,
    period?: 'month' | 'quarter' | 'year',
    pipelineId?: string
): Promise<{ success: boolean; data: ForecastData }> {
    const params = new URLSearchParams();
    if (period) params.append('period', period);
    if (pipelineId) params.append('pipelineId', pipelineId);

    const response = await fetch(
        `${API_BASE_URL}/workspaces/${workspaceId}/forecast?${params}`,
        {
            method: "GET",
            credentials: "include",
            headers: getAuthHeaders(),
        }
    );

    if (!response.ok) {
        throw new Error("Failed to fetch forecast");
    }

    return response.json();
}

/**
 * Get trend analysis
 */
export async function getTrends(
    workspaceId: string,
    metric?: 'deals_won' | 'revenue' | 'avg_deal_size' | 'win_rate',
    months?: number
): Promise<{ success: boolean; data: TrendData }> {
    const params = new URLSearchParams();
    if (metric) params.append('metric', metric);
    if (months) params.append('months', months.toString());

    const response = await fetch(
        `${API_BASE_URL}/workspaces/${workspaceId}/forecast/trends?${params}`,
        {
            method: "GET",
            credentials: "include",
            headers: getAuthHeaders(),
        }
    );

    if (!response.ok) {
        throw new Error("Failed to fetch trends");
    }

    return response.json();
}

/**
 * Get at-risk deals
 */
export async function getRisks(
    workspaceId: string,
    threshold?: number
): Promise<{ success: boolean; data: RiskData }> {
    const params = new URLSearchParams();
    if (threshold) params.append('threshold', threshold.toString());

    const response = await fetch(
        `${API_BASE_URL}/workspaces/${workspaceId}/forecast/risks?${params}`,
        {
            method: "GET",
            credentials: "include",
            headers: getAuthHeaders(),
        }
    );

    if (!response.ok) {
        throw new Error("Failed to fetch risk alerts");
    }

    return response.json();
}

/**
 * Get executive summary
 */
export async function getSummary(
    workspaceId: string,
    reportType?: 'weekly' | 'monthly' | 'quarterly'
): Promise<{ success: boolean; data: SummaryData }> {
    const params = new URLSearchParams();
    if (reportType) params.append('reportType', reportType);

    const response = await fetch(
        `${API_BASE_URL}/workspaces/${workspaceId}/forecast/summary?${params}`,
        {
            method: "GET",
            credentials: "include",
            headers: getAuthHeaders(),
        }
    );

    if (!response.ok) {
        throw new Error("Failed to fetch summary");
    }

    return response.json();
}
