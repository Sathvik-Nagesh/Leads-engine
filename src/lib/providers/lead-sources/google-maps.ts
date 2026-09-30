/**
 * Google Maps Places API Lead Source Connector
 *
 * Discovers businesses via the Google Places Text Search API.
 * Returns RawLead objects normalized to the common schema.
 */

import { env } from '@/lib/env';
import type { LeadSource, CampaignConfig, RawLead } from './types';

interface PlacesSearchResult {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  url?: string;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  geometry?: {
    location: { lat: number; lng: number };
  };
  opening_hours?: { open_now?: boolean };
}

interface PlacesApiResponse {
  results: PlacesSearchResult[];
  next_page_token?: string;
  status: string;
}

interface PlaceDetailsResponse {
  result: PlacesSearchResult & {
    address_components?: Array<{ long_name: string; types: string[] }>;
  };
  status: string;
}

function buildSearchQuery(config: CampaignConfig): string[] {
  const queries: string[] = [];
  const locations = config.locations ?? [{}];
  const industries = config.industries ?? ['business'];

  for (const location of locations) {
    for (const industry of industries) {
      const locationStr = [location.city, location.state, location.country]
        .filter(Boolean)
        .join(', ');

      let q = industry;
      if (config.keywords?.length) {
        q += ' ' + config.keywords.slice(0, 2).join(' ');
      }
      if (locationStr) q += ' in ' + locationStr;

      queries.push(q);
    }
  }

  return queries;
}

function extractAddressComponent(
  components: Array<{ long_name: string; types: string[] }>,
  type: string
): string | undefined {
  return components.find((c) => c.types.includes(type))?.long_name;
}

function normalizePlace(place: PlacesSearchResult, query: string): RawLead {
  // Parse address into city/state/country
  // For now, keep full address; detailed parsing happens in normalization pipeline
  const addressParts = place.formatted_address?.split(',').map((s) => s.trim()) ?? [];

  return {
    source: 'google_maps',
    sourceId: place.place_id,
    sourceUrl: place.url,
    companyName: place.name,
    website: place.website,
    phone: place.international_phone_number ?? place.formatted_phone_number,
    address: place.formatted_address,
    city: addressParts[addressParts.length - 3] ?? undefined,
    state: addressParts[addressParts.length - 2] ?? undefined,
    country: addressParts[addressParts.length - 1] ?? undefined,
    industry: place.types?.filter((t) => t !== 'establishment' && t !== 'point_of_interest').join(', '),
    rawData: {
      place_id: place.place_id,
      rating: place.rating,
      user_ratings_total: place.user_ratings_total,
      types: place.types,
      query,
      geometry: place.geometry,
    },
    lat: place.geometry?.location.lat,
    lng: place.geometry?.location.lng,
    discoveredAt: new Date(),
  };
}

export class GoogleMapsLeadSource implements LeadSource {
  readonly id = 'google_maps';
  readonly name = 'Google Maps / Places API';

  get isAvailable(): boolean {
    return Boolean(env.GOOGLE_MAPS_API_KEY);
  }

  async search(config: CampaignConfig): Promise<RawLead[]> {
    if (!this.isAvailable) {
      console.warn('[GoogleMaps] API key not configured, skipping.');
      return [];
    }

    const queries = buildSearchQuery(config);
    const maxTotal = config.maxLeads ?? 100;
    const perQuery = Math.ceil(maxTotal / queries.length);
    const allLeads: RawLead[] = [];

    for (const query of queries) {
      if (allLeads.length >= maxTotal) break;
      try {
        const leads = await this.searchQuery(query, perQuery, config);
        allLeads.push(...leads);
      } catch (err) {
        console.error(`[GoogleMaps] Query failed: "${query}"`, err);
        // Continue with other queries — never lose progress
      }
    }

    return allLeads.slice(0, maxTotal);
  }

  private async searchQuery(
    query: string,
    maxResults: number,
    _config: CampaignConfig
  ): Promise<RawLead[]> {
    const leads: RawLead[] = [];
    let pageToken: string | undefined;

    do {
      const params = new URLSearchParams({
        query,
        key: env.GOOGLE_MAPS_API_KEY!,
        ...(pageToken ? { pagetoken: pageToken } : {}),
      });

      const url = `${env.GOOGLE_MAPS_PLACES_URL}/textsearch/json?${params}`;

      const response = await fetch(url, {
        headers: { 'User-Agent': env.FETCHER_USER_AGENT },
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        throw new Error(`Google Places API returned ${response.status}`);
      }

      const data = (await response.json()) as PlacesApiResponse;

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(`Google Places API error: ${data.status}`);
      }

      for (const place of data.results) {
        leads.push(normalizePlace(place, query));
        if (leads.length >= maxResults) break;
      }

      pageToken = data.next_page_token;

      // Google requires a short delay before using next_page_token
      if (pageToken && leads.length < maxResults) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    } while (pageToken && leads.length < maxResults);

    return leads;
  }

  async estimate(config: CampaignConfig): Promise<number> {
    // Rough estimate based on query count
    const queries = buildSearchQuery(config);
    return queries.length * 20; // ~20 results per query page
  }
}

export const googleMapsLeadSource = new GoogleMapsLeadSource();
