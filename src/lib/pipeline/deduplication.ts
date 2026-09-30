/**
 * Deduplication Engine
 *
 * Deterministic-first deduplication. LLM is never the sole mechanism.
 *
 * Match priority:
 * 1. Exact domain                     (highest confidence)
 * 2. Normalized company + location    (high confidence)
 * 3. Phone number                     (high confidence)
 * 4. Email domain                     (medium confidence)
 * 5. Fuzzy company name               (low confidence — requires secondary signal)
 *
 * Returns a deduplication decision for each candidate lead.
 */

import { prisma } from '@/lib/db/prisma';
import { companySlug, canonicalizeDomain, normalizePhone } from './normalization';
import type { NormalizedLead } from './normalization';

export type DeduplicationResult =
  | { isDuplicate: true; existingCompanyId: string; existingLeadId?: string; method: string; confidence: number }
  | { isDuplicate: false; existingCompanyId?: never; existingLeadId?: never; method?: never; confidence?: never };

/**
 * Levenshtein distance for fuzzy name matching.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

function similarityScore(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

export async function checkDuplicate(
  lead: NormalizedLead
): Promise<DeduplicationResult> {
  // ── 1. Exact domain match ──────────────────────────────────
  if (lead.normalizedDomain) {
    const existing = await prisma.company.findFirst({
      where: {
        OR: [
          { canonicalDomain: lead.normalizedDomain },
          { domains: { has: lead.normalizedDomain } },
        ],
      },
      select: { id: true },
    });

    if (existing) {
      return {
        isDuplicate: true,
        existingCompanyId: existing.id,
        method: 'exact_domain',
        confidence: 0.99,
      };
    }
  }

  // ── 2. Same source + sourceId ──────────────────────────────
  if (lead.sourceId && lead.source) {
    const existingLead = await prisma.lead.findFirst({
      where: { source: lead.source, sourceId: lead.sourceId },
      select: { id: true, companyId: true },
    });

    if (existingLead) {
      return {
        isDuplicate: true,
        existingCompanyId: existingLead.companyId ?? '',
        existingLeadId: existingLead.id,
        method: 'source_id',
        confidence: 0.99,
      };
    }
  }

  // ── 3. Phone match ─────────────────────────────────────────
  if (lead.normalizedPhone) {
    const existing = await prisma.company.findFirst({
      where: { phones: { has: lead.normalizedPhone } },
      select: { id: true },
    });

    if (existing) {
      return {
        isDuplicate: true,
        existingCompanyId: existing.id,
        method: 'phone',
        confidence: 0.95,
      };
    }
  }

  // ── 4. Email domain match ──────────────────────────────────
  if (lead.normalizedEmail) {
    const emailDomain = lead.normalizedEmail.split('@')[1];
    if (emailDomain && !isGenericEmailDomain(emailDomain)) {
      const existing = await prisma.company.findFirst({
        where: { canonicalDomain: emailDomain },
        select: { id: true },
      });

      if (existing) {
        return {
          isDuplicate: true,
          existingCompanyId: existing.id,
          method: 'email_domain',
          confidence: 0.85,
        };
      }
    }
  }

  // ── 5. Fuzzy name + location ───────────────────────────────
  const slug = companySlug(lead.normalizedCompanyName);
  if (slug.length > 3) {
    // Fetch candidates from same city/state for efficiency
    const candidates = await prisma.company.findMany({
      where: {
        city: lead.normalizedCity ?? undefined,
        state: lead.normalizedState ?? undefined,
      },
      select: { id: true, primaryName: true, aliases: true },
      take: 50,
    });

    for (const candidate of candidates) {
      const candidateSlug = companySlug(candidate.primaryName);
      const score = similarityScore(slug, candidateSlug);

      // Also check aliases
      let bestScore = score;
      for (const alias of candidate.aliases) {
        const aliasScore = similarityScore(slug, companySlug(alias));
        if (aliasScore > bestScore) bestScore = aliasScore;
      }

      if (bestScore >= 0.88) {
        return {
          isDuplicate: true,
          existingCompanyId: candidate.id,
          method: 'fuzzy_name',
          confidence: bestScore * 0.8, // Discounted — fuzzy is less certain
        };
      }
    }
  }

  return { isDuplicate: false };
}

// Generic email providers — don't use email domain for company matching
const GENERIC_EMAIL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
  'rediffmail.com', 'icloud.com', 'live.com', 'ymail.com',
  'protonmail.com', 'zoho.com',
]);

function isGenericEmailDomain(domain: string): boolean {
  return GENERIC_EMAIL_DOMAINS.has(domain.toLowerCase());
}
