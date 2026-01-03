import axios from 'axios';

/**
 * Company Identification Service
 * Identifies companies from IP addresses and enriches visitor/contact data
 *
 * Uses multiple data sources:
 * 1. IPApi.com (Free, no API key needed)
 * 2. Clearbit (Premium, requires API key)
 * 3. Hunter.io (Premium, requires API key)
 */

export interface CompanyData {
  name?: string;
  domain?: string;
  industry?: string;
  size?: string;
  location?: string;
  country?: string;
  city?: string;
  logo?: string;
  description?: string;
  linkedin?: string;
  twitter?: string;
  founded?: number;
  employees?: number;
}

export interface IPData {
  ip: string;
  country?: string;
  countryCode?: string;
  region?: string;
  regionName?: string;
  city?: string;
  zip?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  isp?: string;
  org?: string;
  as?: string;
}

class CompanyIdentificationService {
  private clearbitApiKey?: string;
  private hunterApiKey?: string;

  constructor() {
    this.clearbitApiKey = process.env.CLEARBIT_API_KEY;
    this.hunterApiKey = process.env.HUNTER_API_KEY;
  }

  /**
   * Get IP data using free IPApi service
   */
  async getIPData(ip: string): Promise<IPData | null> {
    try {
      // Skip local/private IPs
      if (this.isPrivateIP(ip)) {
        return null;
      }

      const response = await axios.get(`http://ip-api.com/json/${ip}`, {
        params: {
          fields: 'status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as',
        },
        timeout: 5000,
      });

      if (response.data.status === 'fail') {
        console.warn(`IP lookup failed for ${ip}: ${response.data.message}`);
        return null;
      }

      return {
        ip,
        country: response.data.country,
        countryCode: response.data.countryCode,
        region: response.data.region,
        regionName: response.data.regionName,
        city: response.data.city,
        zip: response.data.zip,
        lat: response.data.lat,
        lon: response.data.lon,
        timezone: response.data.timezone,
        isp: response.data.isp,
        org: response.data.org,
        as: response.data.as,
      };
    } catch (error) {
      console.error('IP lookup error:', error);
      return null;
    }
  }

  /**
   * Identify company from IP using Clearbit (if API key available)
   */
  async identifyCompanyFromIP(ip: string): Promise<CompanyData | null> {
    if (!this.clearbitApiKey) {
      console.log('Clearbit API key not configured, skipping company identification');
      return null;
    }

    try {
      const response = await axios.get(`https://company.clearbit.com/v1/companies/find`, {
        params: { ip },
        headers: {
          'Authorization': `Bearer ${this.clearbitApiKey}`,
        },
        timeout: 5000,
      });

      const data = response.data;

      return {
        name: data.name,
        domain: data.domain,
        industry: data.category?.industry,
        size: this.getCompanySize(data.metrics?.employees),
        location: `${data.geo?.city || ''}, ${data.geo?.country || ''}`.trim(),
        country: data.geo?.country,
        city: data.geo?.city,
        logo: data.logo,
        description: data.description,
        linkedin: data.linkedin?.handle ? `https://linkedin.com/company/${data.linkedin.handle}` : undefined,
        twitter: data.twitter?.handle ? `https://twitter.com/${data.twitter.handle}` : undefined,
        founded: data.foundedYear,
        employees: data.metrics?.employees,
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        // No company found for this IP
        return null;
      }
      console.error('Clearbit lookup error:', error.message);
      return null;
    }
  }

  /**
   * Enrich company data from domain using Clearbit
   */
  async enrichCompanyFromDomain(domain: string): Promise<CompanyData | null> {
    if (!this.clearbitApiKey) {
      return null;
    }

    try {
      const response = await axios.get(`https://company.clearbit.com/v2/companies/find`, {
        params: { domain },
        headers: {
          'Authorization': `Bearer ${this.clearbitApiKey}`,
        },
        timeout: 5000,
      });

      const data = response.data;

      return {
        name: data.name,
        domain: data.domain,
        industry: data.category?.industry,
        size: this.getCompanySize(data.metrics?.employees),
        location: `${data.geo?.city || ''}, ${data.geo?.country || ''}`.trim(),
        country: data.geo?.country,
        city: data.geo?.city,
        logo: data.logo,
        description: data.description,
        linkedin: data.linkedin?.handle ? `https://linkedin.com/company/${data.linkedin.handle}` : undefined,
        twitter: data.twitter?.handle ? `https://twitter.com/${data.twitter.handle}` : undefined,
        founded: data.foundedYear,
        employees: data.metrics?.employees,
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error('Clearbit domain enrichment error:', error.message);
      return null;
    }
  }

  /**
   * Extract domain from email
   */
  extractDomainFromEmail(email: string): string | null {
    const match = email.match(/@(.+)$/);
    if (!match) return null;

    const domain = match[1].toLowerCase();

    // Filter out common free email providers
    const freeProviders = [
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
      'aol.com', 'icloud.com', 'mail.com', 'protonmail.com',
      'zoho.com', 'yandex.com', 'gmx.com',
    ];

    if (freeProviders.includes(domain)) {
      return null;
    }

    return domain;
  }

  /**
   * Get company size category from employee count
   */
  private getCompanySize(employees?: number): string {
    if (!employees) return 'Unknown';
    if (employees < 10) return '1-10';
    if (employees < 50) return '11-50';
    if (employees < 200) return '51-200';
    if (employees < 500) return '201-500';
    if (employees < 1000) return '501-1000';
    if (employees < 5000) return '1001-5000';
    return '5000+';
  }

  /**
   * Check if IP is private/local
   */
  private isPrivateIP(ip: string): boolean {
    const parts = ip.split('.').map(Number);

    // localhost
    if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
      return true;
    }

    // Private ranges
    if (parts[0] === 10) return true; // 10.0.0.0 – 10.255.255.255
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // 172.16.0.0 – 172.31.255.255
    if (parts[0] === 192 && parts[1] === 168) return true; // 192.168.0.0 – 192.168.255.255

    return false;
  }

  /**
   * Full company identification from IP
   * Tries multiple sources and combines data
   */
  async identifyFromIP(ip: string): Promise<{
    ipData: IPData | null;
    companyData: CompanyData | null;
  }> {
    const ipData = await this.getIPData(ip);
    let companyData = null;

    // Try Clearbit if available
    if (this.clearbitApiKey) {
      companyData = await this.identifyCompanyFromIP(ip);
    }

    // If Clearbit didn't find anything, try extracting from ISP/Org info
    if (!companyData && ipData?.org) {
      // Basic fallback: use ISP/Org as company name
      companyData = {
        name: ipData.org,
        location: ipData.city ? `${ipData.city}, ${ipData.country}` : ipData.country,
        city: ipData.city,
        country: ipData.country,
      };
    }

    return { ipData, companyData };
  }

  /**
   * Enrich contact with company data from email domain
   */
  async enrichContactFromEmail(email: string): Promise<CompanyData | null> {
    const domain = this.extractDomainFromEmail(email);
    if (!domain) return null;

    return await this.enrichCompanyFromDomain(domain);
  }
}

export const companyIdentificationService = new CompanyIdentificationService();
export default companyIdentificationService;
