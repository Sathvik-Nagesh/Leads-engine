/**
 * Lead Normalization Pipeline
 *
 * Converts RawLead fields into canonical forms.
 * All normalization is deterministic — no AI involved.
 */

import type { RawLead } from '@/lib/providers/lead-sources/types';

// ============================================================
// DOMAIN NORMALIZATION
// ============================================================

/**
 * Extract and canonicalize a domain from a URL or raw string.
 * Returns null if no valid domain can be extracted.
 *
 * https://www.Example.com/path → example.com
 * http://example.com → example.com
 * example.com → example.com
 * www.example.com → example.com
 */
export function canonicalizeDomain(raw?: string | null): string | null {
  if (!raw) return null;

  let url = raw.trim();

  // Add scheme if missing (required for URL parsing)
  if (!url.match(/^https?:\/\//i)) {
    url = 'https://' + url;
  }

  try {
    const parsed = new URL(url);
    let hostname = parsed.hostname.toLowerCase();

    // Strip www.
    hostname = hostname.replace(/^www\./, '');

    // Strip trailing dot
    hostname = hostname.replace(/\.$/, '');

    // Validate it looks like a real domain
    if (!hostname.includes('.') || hostname.length < 4) return null;

    return hostname;
  } catch {
    // Try regex extraction as fallback
    const match = raw.match(/(?:https?:\/\/)?(?:www\.)?([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z]{2,})+)/i);
    if (match?.[1]) {
      return match[1].toLowerCase();
    }
    return null;
  }
}

// ============================================================
// COMPANY NAME NORMALIZATION
// ============================================================

const COMPANY_SUFFIXES_TO_STRIP = [
  /\s*pvt\.?\s*ltd\.?$/i,
  /\s*private\s+limited$/i,
  /\s*ltd\.?$/i,
  /\s*llp$/i,
  /\s*inc\.?$/i,
  /\s*llc\.?$/i,
  /\s*&\s*co\.?$/i,
  /\s*and\s+co\.?$/i,
];

const COMMON_NOISE = [
  /\s*-\s*official\s*(page|website|account)?\s*$/i,
  /\s*\|\s*.+$/,  // Strip "Company | Tagline"
];

export function normalizeCompanyName(raw: string): string {
  let name = raw.trim();

  // Remove noise patterns
  for (const pattern of COMMON_NOISE) {
    name = name.replace(pattern, '');
  }

  // Normalize whitespace
  name = name.replace(/\s+/g, ' ').trim();

  return name;
}

/**
 * Slugified version for comparison (removes special chars, lowercases)
 */
export function companySlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================================
// PHONE NORMALIZATION
// ============================================================

export function normalizePhone(raw?: string | null): string | null {
  if (!raw) return null;

  // Strip all non-digit characters except leading +
  let digits = raw.trim();

  // Preserve leading +
  const hasPlus = digits.startsWith('+');
  digits = digits.replace(/\D/g, '');

  if (!digits || digits.length < 7) return null;

  // Add +91 for Indian numbers without country code
  if (!hasPlus && digits.length === 10 && digits[0] !== '0') {
    return '+91' + digits;
  }

  if (!hasPlus && digits.length === 11 && digits[0] === '0') {
    return '+91' + digits.slice(1);
  }

  return hasPlus ? '+' + digits : digits;
}

// ============================================================
// EMAIL NORMALIZATION
// ============================================================

export function normalizeEmail(raw?: string | null): string | null {
  if (!raw) return null;
  const email = raw.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return null;
  return email;
}

// ============================================================
// LOCATION NORMALIZATION
// ============================================================

// Common Indian state aliases
const INDIAN_STATES: Record<string, string> = {
  'karnataka': 'Karnataka',
  'ka': 'Karnataka',
  'maharashtra': 'Maharashtra',
  'mh': 'Maharashtra',
  'tamil nadu': 'Tamil Nadu',
  'tn': 'Tamil Nadu',
  'delhi': 'Delhi',
  'new delhi': 'Delhi',
  'telangana': 'Telangana',
  'ts': 'Telangana',
  'andhra pradesh': 'Andhra Pradesh',
  'ap': 'Andhra Pradesh',
  'kerala': 'Kerala',
  'kl': 'Kerala',
  'gujarat': 'Gujarat',
  'gj': 'Gujarat',
  'rajasthan': 'Rajasthan',
  'rj': 'Rajasthan',
};

export function normalizeState(raw?: string | null): string | null {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  return INDIAN_STATES[normalized] ?? toTitleCase(raw.trim());
}

export function normalizeCity(raw?: string | null): string | null {
  if (!raw) return null;
  return toTitleCase(raw.trim());
}

export function normalizeCountry(raw?: string | null): string | null {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'in' || normalized === 'india') return 'India';
  return toTitleCase(raw.trim());
}

// ============================================================
// INDUSTRY NORMALIZATION
// ============================================================

const INDUSTRY_MAP: Record<string, string> = {
  // Google Maps types → canonical
  'interior_design': 'Interior Design',
  'home_goods_store': 'Home & Furniture',
  'furniture_store': 'Home & Furniture',
  'real_estate_agency': 'Real Estate',
  'restaurant': 'Food & Beverage',
  'food': 'Food & Beverage',
  'clothing_store': 'Retail - Apparel',
  'electronics_store': 'Electronics Retail',
  'health': 'Healthcare',
  'doctor': 'Healthcare',
  'hospital': 'Healthcare',
  'school': 'Education',
  'university': 'Education',
  'gym': 'Fitness & Wellness',
  'spa': 'Fitness & Wellness',
  'beauty_salon': 'Beauty & Personal Care',
  'accounting': 'Professional Services',
  'lawyer': 'Legal Services',
  'travel_agency': 'Travel & Tourism',
  'car_dealer': 'Automotive',
  'car_repair': 'Automotive',
};

export function normalizeIndustry(raw?: string | null): string | null {
  if (!raw) return null;
  const lower = raw.toLowerCase().replace(/[^a-z_\s]/g, '').trim();
  // Check direct mapping
  for (const [key, value] of Object.entries(INDUSTRY_MAP)) {
    if (lower.includes(key.replace('_', ' ')) || lower.includes(key)) {
      return value;
    }
  }
  // Default: title case the raw value
  return toTitleCase(raw.split(',')[0].trim());
}

// ============================================================
// SOCIAL URL NORMALIZATION
// ============================================================

export function normalizeSocialUrl(platform: string, raw: string): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.startsWith('http') ? raw : 'https://' + raw);
    return url.toString();
  } catch {
    return null;
  }
}

// ============================================================
// FULL LEAD NORMALIZATION
// ============================================================

export interface NormalizedLead extends RawLead {
  normalizedDomain: string | null;
  normalizedCompanyName: string;
  normalizedPhone: string | null;
  normalizedEmail: string | null;
  normalizedCity: string | null;
  normalizedState: string | null;
  normalizedCountry: string | null;
  normalizedIndustry: string | null;
}

export function normalizeLead(raw: RawLead): NormalizedLead {
  return {
    ...raw,
    companyName: normalizeCompanyName(raw.companyName),
    normalizedCompanyName: normalizeCompanyName(raw.companyName),
    normalizedDomain: canonicalizeDomain(raw.website),
    normalizedPhone: normalizePhone(raw.phone),
    normalizedEmail: normalizeEmail(raw.email),
    normalizedCity: normalizeCity(raw.city),
    normalizedState: normalizeState(raw.state),
    normalizedCountry: normalizeCountry(raw.country) ?? 'India',
    normalizedIndustry: normalizeIndustry(raw.industry),
  };
}

// ============================================================
// UTILITIES
// ============================================================

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
