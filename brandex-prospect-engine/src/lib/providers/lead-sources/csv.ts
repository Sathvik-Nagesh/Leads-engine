/**
 * CSV Lead Source Connector
 *
 * Imports leads from a CSV file or string.
 * Maps common column name variations to RawLead fields.
 * No external API needed.
 */

import type { LeadSource, CampaignConfig, RawLead } from './types';

// Column name aliases (case-insensitive)
const COLUMN_ALIASES: Record<keyof Omit<RawLead, 'source' | 'sourceId' | 'sourceUrl' | 'rawData' | 'discoveredAt' | 'socialLinks'>, string[]> = {
  companyName:   ['company', 'company name', 'business', 'business name', 'name', 'organisation', 'organization'],
  website:       ['website', 'url', 'web', 'site', 'domain', 'website url'],
  phone:         ['phone', 'phone number', 'mobile', 'contact', 'tel', 'telephone'],
  email:         ['email', 'email address', 'e-mail', 'contact email'],
  address:       ['address', 'street', 'street address', 'full address'],
  city:          ['city', 'town', 'locality'],
  state:         ['state', 'province', 'region'],
  country:       ['country', 'nation'],
  pincode:       ['pincode', 'pin', 'postal code', 'zip', 'zip code', 'postcode'],
  lat:           ['lat', 'latitude'],
  lng:           ['lng', 'lon', 'longitude'],
  industry:      ['industry', 'sector', 'category', 'business type'],
  description:   ['description', 'about', 'notes', 'details', 'business description'],
  companyType:   ['type', 'company type', 'business type'],
};

function normalizeHeader(header: string): string {
  return header.toLowerCase().trim().replace(/[_-]/g, ' ');
}

function buildHeaderMap(headers: string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const header of headers) {
    const normalized = normalizeHeader(header);
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.includes(normalized)) {
        map.set(header, field);
        break;
      }
    }
  }
  return map;
}

function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx]?.trim() ?? '';
    });
    rows.push(row);
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

export class CSVLeadSource implements LeadSource {
  readonly id = 'csv';
  readonly name = 'CSV Import';
  readonly isAvailable = true;

  private csvContent: string = '';
  private sourceLabel: string = 'csv_upload';

  /**
   * Load CSV content before calling search().
   */
  loadCSV(content: string, label = 'csv_upload'): void {
    this.csvContent = content;
    this.sourceLabel = label;
  }

  async search(config: CampaignConfig): Promise<RawLead[]> {
    if (!this.csvContent) {
      console.warn('[CSV] No CSV content loaded.');
      return [];
    }

    const rows = parseCSV(this.csvContent);
    if (rows.length === 0) return [];

    const headers = Object.keys(rows[0]);
    const headerMap = buildHeaderMap(headers);
    const maxLeads = config.maxLeads ?? rows.length;

    const leads: RawLead[] = [];

    for (const row of rows.slice(0, maxLeads)) {
      const lead: Partial<RawLead> = {
        source: this.sourceLabel,
        discoveredAt: new Date(),
        rawData: row as Record<string, unknown>,
      };

      // Map columns to RawLead fields
      for (const [header, field] of headerMap.entries()) {
        const value = row[header]?.trim();
        if (!value) continue;

        if (field === 'lat' || field === 'lng') {
          const num = parseFloat(value);
          if (!isNaN(num)) (lead as Record<string, unknown>)[field] = num;
        } else {
          (lead as Record<string, unknown>)[field] = value;
        }
      }

      // Must have a company name to be a valid lead
      if (!lead.companyName) {
        // Try raw first column as company name
        const firstValue = Object.values(row)[0]?.trim();
        if (firstValue) lead.companyName = firstValue;
        else continue;
      }

      leads.push(lead as RawLead);
    }

    return leads;
  }

  async estimate(_config: CampaignConfig): Promise<number> {
    if (!this.csvContent) return 0;
    const rows = parseCSV(this.csvContent);
    return rows.length;
  }
}

export const csvLeadSource = new CSVLeadSource();
