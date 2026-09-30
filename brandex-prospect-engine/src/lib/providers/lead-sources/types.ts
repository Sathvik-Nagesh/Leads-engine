/**
 * Lead Source Abstraction
 *
 * All discovery connectors implement this interface.
 * Normalizes every source into the same RawLead structure.
 */

export interface RawLead {
  // Source provenance (never destroy)
  source: string;      // connector id e.g. 'google_maps', 'csv', 'web_search'
  sourceId?: string;   // id in the source system
  sourceUrl?: string;  // URL where this lead was found

  // Company identity
  companyName: string;
  website?: string;
  phone?: string;
  email?: string;

  // Location
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  lat?: number;
  lng?: number;

  // Classification
  industry?: string;
  description?: string;
  companyType?: string;

  // Social
  socialLinks?: Record<string, string>;

  // Raw payload from source (preserved)
  rawData?: Record<string, unknown>;

  discoveredAt: Date;
}

export interface CampaignConfig {
  id: string;
  name: string;

  // Targeting
  industries?: string[];
  subIndustries?: string[];
  locations?: LocationTarget[];
  companyTypes?: string[];
  employeeMin?: number;
  employeeMax?: number;
  keywords?: string[];
  excludedKeywords?: string[];

  // Requirements
  requireWebsite?: boolean;
  websiteQuality?: 'any' | 'basic' | 'professional';

  // Decision maker
  targetRoles?: string[];

  // Capabilities
  prioritizedCapabilities?: string[];
  minOpportunityScore?: number;

  // Volume
  maxLeads?: number;

  // Research
  researchDepth?: 'SHALLOW' | 'STANDARD' | 'DEEP';
  competitorResearchMode?: 'OFF' | 'SMART' | 'ALWAYS';
  buyingSignalMode?: 'OFF' | 'BASIC' | 'DEEP';
  outreachMode?: 'STANDARD' | 'HIGH_VALUE' | 'STRATEGIC';

  // Budget
  budgetLimitINR?: number;
}

export interface LocationTarget {
  country?: string;
  state?: string;
  city?: string;
  radius?: number;         // km
  radiusCenter?: {
    lat: number;
    lng: number;
  };
}

/**
 * Every lead source connector implements this interface.
 */
export interface LeadSource {
  readonly id: string;
  readonly name: string;
  readonly isAvailable: boolean;

  /**
   * Search for leads matching the campaign config.
   * Must return normalized RawLead objects.
   * Must never throw — return empty array on failure.
   */
  search(config: CampaignConfig): Promise<RawLead[]>;

  /**
   * Estimate how many leads this source can provide
   * for a given config (without actually fetching them).
   * Used for budget/cost estimation.
   */
  estimate?(config: CampaignConfig): Promise<number>;
}

/**
 * Source registry — all connectors register here.
 */
class LeadSourceRegistry {
  private sources = new Map<string, LeadSource>();

  register(source: LeadSource): void {
    this.sources.set(source.id, source);
  }

  get(id: string): LeadSource | undefined {
    return this.sources.get(id);
  }

  getAvailable(): LeadSource[] {
    return Array.from(this.sources.values()).filter((s) => s.isAvailable);
  }

  getAll(): LeadSource[] {
    return Array.from(this.sources.values());
  }
}

export const leadSourceRegistry = new LeadSourceRegistry();
