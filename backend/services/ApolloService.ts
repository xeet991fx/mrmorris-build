import axios, { AxiosInstance, AxiosError } from 'axios';
import Contact from '../src/models/Contact';
import Company from '../src/models/Company';
import ApolloUsage from '../src/models/ApolloUsage';
import { logger } from '../src/utils/logger';
import type { IContact } from '../src/models/Contact';
import type { ICompany } from '../src/models/Company';

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
  email_status: 'verified' | 'guessed' | 'unavailable' | 'bounced';
  phone_numbers: Array<{
    raw_number: string;
    sanitized_number: string;
    type: 'mobile' | 'work' | 'other';
    position: number;
  }>;
  linkedin_url: string | null;
  twitter_url: string | null;
  github_url: string | null;
  facebook_url: string | null;
  organization: {
    id: string;
    name: string;
    website_url: string;
    blog_url: string | null;
    angellist_url: string | null;
    linkedin_url: string | null;
    twitter_url: string | null;
    facebook_url: string | null;
    primary_phone: {
      number: string;
      source: string;
    } | null;
    languages: string[];
    alexa_ranking: number | null;
    phone: string | null;
    linkedin_uid: string | null;
    founded_year: number | null;
    publicly_traded_symbol: string | null;
    publicly_traded_exchange: string | null;
    logo_url: string | null;
    crunchbase_url: string | null;
    primary_domain: string;
    industry: string;
    keywords: string[];
    estimated_num_employees: number;
    retail_location_count: number;
    raw_address: string;
    street_address: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  employment_history: Array<{
    created_at: string;
    current: boolean;
    degree: string | null;
    description: string | null;
    emails: string[] | null;
    end_date: string | null;
    id: string;
    key: string;
    organization_id: string | null;
    organization_name: string;
    start_date: string | null;
    title: string;
    updated_at: string;
  }>;
  photo_url: string | null;
  city: string;
  state: string;
  country: string;
  headline: string | null;
  seniority: string | null;
  departments: string[];
  subdepartments: string[];
  functions: string[];
}

export interface ApolloCompany {
  id: string;
  name: string;
  website_url: string;
  blog_url: string | null;
  angellist_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  facebook_url: string | null;
  primary_phone: {
    number: string;
    source: string;
  } | null;
  languages: string[];
  alexa_ranking: number | null;
  phone: string | null;
  linkedin_uid: string | null;
  founded_year: number | null;
  publicly_traded_symbol: string | null;
  publicly_traded_exchange: string | null;
  logo_url: string | null;
  crunchbase_url: string | null;
  primary_domain: string;
  industry: string;
  keywords: string[];
  estimated_num_employees: number;
  retail_location_count: number;
  raw_address: string;
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  annual_revenue_printed: string | null;
  annual_revenue: number | null;
  total_funding: number | null;
  total_funding_printed: string | null;
  latest_funding_round_date: string | null;
  latest_funding_stage: string | null;
  technology_names: string[];
  current_technologies: Array<{
    uid: string;
    name: string;
    category: string;
  }>;
  seo_description: string | null;
  short_description: string | null;
  account_id: string | null;
}

export interface EmailVerification {
  email: string;
  status: 'valid' | 'invalid' | 'risky' | 'unknown' | 'accept_all' | 'disposable';
  free_email: boolean;
  disposable: boolean;
  mx_records: boolean;
  smtp_valid: boolean;
  email_quality_score: number;
}

export interface EnrichmentResult {
  success: boolean;
  contact: IContact;
  fieldsEnriched: string[];
  creditsUsed: number;
  apolloData: ApolloPerson | null;
  confidence: number;
  dataSource: 'apollo';
}

export interface BulkEnrichmentResult {
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

export interface SearchPeopleParams {
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

export interface SearchPeopleResult {
  people: ApolloPerson[];
  pagination: {
    page: number;
    per_page: number;
    total_entries: number;
    total_pages: number;
  };
  creditsUsed: number;
}

export interface FindPersonParams {
  firstName: string;
  lastName: string;
  companyName?: string;
  companyDomain?: string;
}

export interface CreditsInfo {
  remaining: number;
  limit: number;
  resetDate: string;
  usedThisMonth: number;
}

// ═══════════════════════════════════════════════════════════════
// ERROR CLASSES
// ═══════════════════════════════════════════════════════════════

export class ApolloAPIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public apolloErrorCode?: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'ApolloAPIError';
  }
}

export class RateLimitError extends ApolloAPIError {
  constructor(
    message: string = 'Apollo API rate limit exceeded',
    public retryAfter: number = 60
  ) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', true);
    this.name = 'RateLimitError';
  }
}

export class InsufficientCreditsError extends ApolloAPIError {
  constructor(message: string = 'Insufficient Apollo credits') {
    super(message, 403, 'INSUFFICIENT_CREDITS', false);
    this.name = 'InsufficientCreditsError';
  }
}

export class InvalidAPIKeyError extends ApolloAPIError {
  constructor(message: string = 'Invalid Apollo API key') {
    super(message, 401, 'INVALID_API_KEY', false);
    this.name = 'InvalidAPIKeyError';
  }
}

export class PersonNotFoundError extends Error {
  constructor(message: string = 'Person not found in Apollo database') {
    super(message);
    this.name = 'PersonNotFoundError';
  }
}

export class CompanyNotFoundError extends Error {
  constructor(message: string = 'Company not found in Apollo database') {
    super(message);
    this.name = 'CompanyNotFoundError';
  }
}

// ═══════════════════════════════════════════════════════════════
// APOLLO SERVICE CLASS
// ═══════════════════════════════════════════════════════════════

class ApolloService {
  private client: AxiosInstance;
  private apiKey: string;
  private baseURL: string;
  private timeout: number;
  private maxRetries: number = 3;
  private retryDelay: number = 1000; // 1 second base delay

  constructor() {
    this.apiKey = process.env.APOLLO_API_KEY || '';
    this.baseURL = process.env.APOLLO_BASE_URL || 'https://api.apollo.io/v1';
    this.timeout = parseInt(process.env.APOLLO_TIMEOUT || '30000', 10);

    if (!this.apiKey) {
      logger.warn('Apollo API key not configured. Set APOLLO_API_KEY in environment variables.');
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });

    // Request interceptor to add API key
    this.client.interceptors.request.use((config) => {
      config.headers['X-Api-Key'] = this.apiKey;
      return config;
    });

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.info('Apollo API request successful', {
          endpoint: response.config.url,
          status: response.status,
        });
        return response;
      },
      (error) => {
        logger.error('Apollo API request failed', {
          endpoint: error.config?.url,
          status: error.response?.status,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Execute API request with retry logic and exponential backoff
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    retryCount: number = 0
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const apolloError = this.handleError(error);

      // Retry only if error is retryable and we haven't exceeded max retries
      if (apolloError.retryable && retryCount < this.maxRetries) {
        const delay = this.retryDelay * Math.pow(2, retryCount); // Exponential backoff
        logger.info(`Retrying Apollo API request in ${delay}ms (attempt ${retryCount + 1}/${this.maxRetries})`);

        await this.sleep(delay);
        return this.executeWithRetry(operation, retryCount + 1);
      }

      throw apolloError;
    }
  }

  /**
   * Handle and classify errors from Apollo API
   */
  private handleError(error: unknown): ApolloAPIError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<any>;

      if (axiosError.response) {
        const status = axiosError.response.status;
        const data = axiosError.response.data;

        switch (status) {
          case 401:
            return new InvalidAPIKeyError(
              data?.message || 'Invalid Apollo API key. Please check your credentials.'
            );

          case 403:
            if (data?.error?.includes('credit') || data?.message?.includes('credit')) {
              return new InsufficientCreditsError(
                data?.message || 'Insufficient Apollo credits. Please upgrade your plan.'
              );
            }
            return new ApolloAPIError(
              data?.message || 'Access forbidden',
              403,
              data?.error_code,
              false
            );

          case 429:
            const retryAfter = parseInt(axiosError.response.headers['retry-after'] || '60', 10);
            return new RateLimitError(
              data?.message || 'Apollo API rate limit exceeded. Please try again later.',
              retryAfter
            );

          case 404:
            return new ApolloAPIError(
              data?.message || 'Resource not found',
              404,
              data?.error_code,
              false
            );

          case 500:
          case 502:
          case 503:
          case 504:
            return new ApolloAPIError(
              data?.message || 'Apollo API server error. Please try again later.',
              status,
              data?.error_code,
              true // Server errors are retryable
            );

          default:
            return new ApolloAPIError(
              data?.message || 'Apollo API request failed',
              status,
              data?.error_code,
              false
            );
        }
      } else if (axiosError.request) {
        // Request made but no response (network error, timeout)
        if (axiosError.code === 'ECONNABORTED') {
          return new ApolloAPIError(
            'Apollo API request timed out. Please try again.',
            0,
            'TIMEOUT',
            true
          );
        }
        return new ApolloAPIError(
          'Network error: Unable to reach Apollo API. Please check your internet connection.',
          0,
          'NETWORK_ERROR',
          true
        );
      }
    }

    // Unknown error
    return new ApolloAPIError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      0,
      'UNKNOWN_ERROR',
      false
    );
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Validate response data
   */
  private validatePersonData(data: any): ApolloPerson | null {
    if (!data || typeof data !== 'object') {
      return null;
    }

    // Check required fields
    if (!data.id || !data.first_name || !data.last_name) {
      logger.warn('Invalid person data from Apollo: missing required fields', { data });
      return null;
    }

    return data as ApolloPerson;
  }

  /**
   * Validate company data
   */
  private validateCompanyData(data: any): ApolloCompany | null {
    if (!data || typeof data !== 'object') {
      return null;
    }

    // Check required fields
    if (!data.id || !data.name) {
      logger.warn('Invalid company data from Apollo: missing required fields', { data });
      return null;
    }

    return data as ApolloCompany;
  }

  /**
   * Log Apollo API usage
   */
  private async logUsage(
    workspaceId: string,
    userId: string,
    action: string,
    creditsUsed: number,
    success: boolean,
    entityId?: string,
    error?: string,
    responseTime?: number
  ): Promise<void> {
    try {
      await ApolloUsage.create({
        workspaceId,
        userId,
        action,
        creditsUsed,
        success,
        entityId,
        error,
        timestamp: new Date(),
        responseTime,
      });
    } catch (err) {
      logger.error('Failed to log Apollo usage', { error: err });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC API METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Find a person by name and company
   */
  async findPerson(params: FindPersonParams): Promise<ApolloPerson | null> {
    return this.executeWithRetry(async () => {
      const { firstName, lastName, companyName, companyDomain } = params;

      const requestBody: any = {
        first_name: firstName,
        last_name: lastName,
      };

      if (companyName) {
        requestBody.organization_name = companyName;
      }

      if (companyDomain) {
        requestBody.domain = companyDomain;
      }

      const response = await this.client.post('/people/match', requestBody);

      if (!response.data || !response.data.person) {
        throw new PersonNotFoundError(
          `Person not found: ${firstName} ${lastName}${companyName ? ` at ${companyName}` : ''}`
        );
      }

      const person = this.validatePersonData(response.data.person);
      if (!person) {
        throw new PersonNotFoundError('Invalid person data received from Apollo');
      }

      return person;
    });
  }

  /**
   * Enrich an existing contact with Apollo data
   */
  async enrichContact(
    contactId: string,
    workspaceId: string,
    userId: string
  ): Promise<EnrichmentResult> {
    const startTime = Date.now();

    try {
      // Find the contact
      const contact = await Contact.findById(contactId);
      if (!contact) {
        throw new Error(`Contact not found: ${contactId}`);
      }

      // Search for person in Apollo
      const searchParams: FindPersonParams = {
        firstName: contact.firstName,
        lastName: contact.lastName,
      };

      if (contact.company) {
        const company = await Company.findById(contact.company);
        if (company) {
          searchParams.companyName = company.name;
          if (company.website) {
            searchParams.companyDomain = company.website.replace(/^https?:\/\//, '').replace(/\/$/, '');
          }
        }
      }

      const apolloPerson = await this.findPerson(searchParams);
      const fieldsEnriched: string[] = [];
      let creditsUsed = 1; // Apollo charges 1 credit per enrichment

      // Update contact with Apollo data
      if (apolloPerson.email && !contact.email) {
        contact.email = apolloPerson.email;
        fieldsEnriched.push('email');
      }

      if (apolloPerson.phone_numbers && apolloPerson.phone_numbers.length > 0 && !contact.phone) {
        const primaryPhone = apolloPerson.phone_numbers.find(p => p.type === 'mobile') || apolloPerson.phone_numbers[0];
        contact.phone = primaryPhone.sanitized_number;
        fieldsEnriched.push('phone');
      }

      if (apolloPerson.linkedin_url && !contact.socialProfiles?.linkedin) {
        if (!contact.socialProfiles) {
          contact.socialProfiles = {};
        }
        contact.socialProfiles.linkedin = apolloPerson.linkedin_url;
        fieldsEnriched.push('linkedin');
      }

      if (apolloPerson.twitter_url && !contact.socialProfiles?.twitter) {
        if (!contact.socialProfiles) {
          contact.socialProfiles = {};
        }
        contact.socialProfiles.twitter = apolloPerson.twitter_url;
        fieldsEnriched.push('twitter');
      }

      if (apolloPerson.title && !contact.title) {
        contact.title = apolloPerson.title;
        fieldsEnriched.push('title');
      }

      if (apolloPerson.city || apolloPerson.state || apolloPerson.country) {
        if (!contact.location) {
          contact.location = {};
        }
        if (apolloPerson.city && !contact.location.city) {
          contact.location.city = apolloPerson.city;
          fieldsEnriched.push('city');
        }
        if (apolloPerson.state && !contact.location.state) {
          contact.location.state = apolloPerson.state;
          fieldsEnriched.push('state');
        }
        if (apolloPerson.country && !contact.location.country) {
          contact.location.country = apolloPerson.country;
          fieldsEnriched.push('country');
        }
      }

      // Add Apollo enrichment metadata
      contact.apolloEnrichment = {
        enrichedAt: new Date(),
        apolloId: apolloPerson.id,
        confidence: apolloPerson.email_status === 'verified' ? 0.95 : 0.75,
        dataSource: 'apollo',
        fieldsEnriched,
        creditsUsed,
      };

      // Verify email if we got one
      if (apolloPerson.email) {
        contact.emailVerification = {
          status: apolloPerson.email_status === 'verified' ? 'valid' :
                  apolloPerson.email_status === 'bounced' ? 'invalid' :
                  apolloPerson.email_status === 'guessed' ? 'risky' : 'unknown',
          verifiedAt: new Date(),
          provider: 'apollo',
        };
      }

      await contact.save();

      const responseTime = Date.now() - startTime;
      await this.logUsage(workspaceId, userId, 'enrich_contact', creditsUsed, true, contactId, undefined, responseTime);

      return {
        success: true,
        contact,
        fieldsEnriched,
        creditsUsed,
        apolloData: apolloPerson,
        confidence: contact.apolloEnrichment.confidence,
        dataSource: 'apollo',
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.logUsage(workspaceId, userId, 'enrich_contact', 0, false, contactId, errorMessage, responseTime);

      throw error;
    }
  }

  /**
   * Search for people by criteria
   */
  async searchPeople(
    params: SearchPeopleParams,
    workspaceId: string,
    userId: string
  ): Promise<SearchPeopleResult> {
    const startTime = Date.now();

    try {
      const requestBody: any = {
        page: params.page || 1,
        per_page: Math.min(params.limit || 25, 100), // Apollo max is 100
      };

      // Add filters
      if (params.jobTitles && params.jobTitles.length > 0) {
        requestBody.person_titles = params.jobTitles;
      }

      if (params.companyDomains && params.companyDomains.length > 0) {
        requestBody.organization_domains = params.companyDomains;
      }

      if (params.locations && params.locations.length > 0) {
        requestBody.person_locations = params.locations;
      }

      if (params.industries && params.industries.length > 0) {
        requestBody.organization_industry_tag_ids = params.industries;
      }

      if (params.companySizes && params.companySizes.length > 0) {
        requestBody.organization_num_employees_ranges = params.companySizes;
      }

      if (params.seniorities && params.seniorities.length > 0) {
        requestBody.person_seniorities = params.seniorities;
      }

      if (params.departments && params.departments.length > 0) {
        requestBody.person_departments = params.departments;
      }

      const response = await this.executeWithRetry(async () => {
        return this.client.post('/mixed_people/search', requestBody);
      });

      const people = (response.data.people || [])
        .map((p: any) => this.validatePersonData(p))
        .filter((p: ApolloPerson | null) => p !== null) as ApolloPerson[];

      const creditsUsed = response.data.pagination?.total_entries || people.length;

      const responseTime = Date.now() - startTime;
      await this.logUsage(workspaceId, userId, 'search', creditsUsed, true, undefined, undefined, responseTime);

      return {
        people,
        pagination: response.data.pagination || {
          page: params.page || 1,
          per_page: params.limit || 25,
          total_entries: people.length,
          total_pages: 1,
        },
        creditsUsed,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.logUsage(workspaceId, userId, 'search', 0, false, undefined, errorMessage, responseTime);

      throw error;
    }
  }

  /**
   * Get company information by domain
   */
  async getCompany(
    domain: string,
    workspaceId: string,
    userId: string
  ): Promise<ApolloCompany | null> {
    const startTime = Date.now();

    try {
      const response = await this.executeWithRetry(async () => {
        return this.client.post('/organizations/enrich', {
          domain: domain.replace(/^https?:\/\//, '').replace(/\/$/, ''),
        });
      });

      if (!response.data || !response.data.organization) {
        throw new CompanyNotFoundError(`Company not found for domain: ${domain}`);
      }

      const company = this.validateCompanyData(response.data.organization);
      if (!company) {
        throw new CompanyNotFoundError('Invalid company data received from Apollo');
      }

      const creditsUsed = 1;
      const responseTime = Date.now() - startTime;

      await this.logUsage(workspaceId, userId, 'enrich_company', creditsUsed, true, undefined, undefined, responseTime);

      return company;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.logUsage(workspaceId, userId, 'enrich_company', 0, false, undefined, errorMessage, responseTime);

      throw error;
    }
  }

  /**
   * Verify email validity
   */
  async verifyEmail(
    email: string,
    workspaceId: string,
    userId: string
  ): Promise<EmailVerification> {
    const startTime = Date.now();

    try {
      const response = await this.executeWithRetry(async () => {
        return this.client.post('/email_verification', {
          email,
        });
      });

      const verification = response.data.email_verification;
      const creditsUsed = 1;
      const responseTime = Date.now() - startTime;

      await this.logUsage(workspaceId, userId, 'verify_email', creditsUsed, true, undefined, undefined, responseTime);

      return {
        email,
        status: verification.status || 'unknown',
        free_email: verification.free_email || false,
        disposable: verification.disposable || false,
        mx_records: verification.mx_records || false,
        smtp_valid: verification.smtp_valid || false,
        email_quality_score: verification.email_quality_score || 0,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.logUsage(workspaceId, userId, 'verify_email', 0, false, undefined, errorMessage, responseTime);

      throw error;
    }
  }

  /**
   * Bulk enrichment (multiple contacts)
   */
  async bulkEnrich(
    contactIds: string[],
    workspaceId: string,
    userId: string
  ): Promise<BulkEnrichmentResult> {
    const results: BulkEnrichmentResult = {
      enriched: 0,
      failed: 0,
      totalCreditsUsed: 0,
      results: [],
    };

    // Process in batches of 10 to avoid overwhelming the API
    const batchSize = 10;
    for (let i = 0; i < contactIds.length; i += batchSize) {
      const batch = contactIds.slice(i, i + batchSize);

      // Process batch in parallel
      const batchPromises = batch.map(async (contactId) => {
        try {
          const result = await this.enrichContact(contactId, workspaceId, userId);
          results.enriched++;
          results.totalCreditsUsed += result.creditsUsed;
          results.results.push({
            contactId,
            success: true,
            fieldsEnriched: result.fieldsEnriched,
          });
        } catch (error) {
          results.failed++;
          results.results.push({
            contactId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      await Promise.all(batchPromises);

      // Small delay between batches to respect rate limits
      if (i + batchSize < contactIds.length) {
        await this.sleep(500);
      }
    }

    return results;
  }

  /**
   * Get credits remaining
   */
  async getCreditsRemaining(workspaceId: string, userId: string): Promise<CreditsInfo> {
    try {
      const response = await this.executeWithRetry(async () => {
        return this.client.get('/auth/health');
      });

      const health = response.data;

      // Get usage this month from our database
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const usageThisMonth = await ApolloUsage.aggregate([
        {
          $match: {
            workspaceId,
            timestamp: { $gte: startOfMonth },
            success: true,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$creditsUsed' },
          },
        },
      ]);

      const used = usageThisMonth.length > 0 ? usageThisMonth[0].total : 0;

      // Calculate reset date (first day of next month)
      const resetDate = new Date();
      resetDate.setMonth(resetDate.getMonth() + 1);
      resetDate.setDate(1);
      resetDate.setHours(0, 0, 0, 0);

      return {
        remaining: health.credits_remaining || 0,
        limit: health.credits_limit || 0,
        resetDate: resetDate.toISOString(),
        usedThisMonth: used,
      };
    } catch (error) {
      logger.error('Failed to get Apollo credits info', { error });
      throw error;
    }
  }

  /**
   * Check if API key is valid
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.executeWithRetry(async () => {
        return this.client.get('/auth/health');
      });
      return true;
    } catch (error) {
      logger.error('Apollo API connection test failed', { error });
      return false;
    }
  }
}

export default new ApolloService();
