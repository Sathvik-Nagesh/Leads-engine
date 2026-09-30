/**
 * POST /api/leads/import
 *
 * Import leads from CSV text or Google Maps search.
 * Runs normalization and deduplication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { csvLeadSource } from '@/lib/providers/lead-sources/csv';
import { normalizeLead } from '@/lib/pipeline/normalization';
import { checkDuplicate } from '@/lib/pipeline/deduplication';
import { z } from 'zod';

const importSchema = z.object({
  source: z.enum(['csv', 'google_maps']),
  csvContent: z.string().optional(),
  campaignId: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { source, csvContent, campaignId, config } = importSchema.parse(body);

    let rawLeads: any[] = [];

    if (source === 'csv') {
      if (!csvContent) {
        return NextResponse.json({ error: 'csvContent is required for CSV import' }, { status: 400 });
      }
      csvLeadSource.loadCSV(csvContent, 'csv_import');
      rawLeads = await csvLeadSource.search({
        id: campaignId ?? 'manual',
        name: 'Manual Import',
        config: {},
        ...(config ?? {}),
      } as Parameters<typeof csvLeadSource.search>[0]);
    }

    const results = {
      total: rawLeads.length,
      imported: 0,
      duplicates: 0,
      errors: 0,
    };

    for (const rawLead of rawLeads) {
      try {
        const normalized = normalizeLead(rawLead);
        const dupCheck = await checkDuplicate(normalized);

        if (dupCheck.isDuplicate) {
          results.duplicates++;

          // Update existing company's source list
          if (dupCheck.existingCompanyId) {
            await prisma.company.update({
              where: { id: dupCheck.existingCompanyId },
              data: {
                aliases: {
                  push: normalized.companyName,
                },
              },
            }).catch(() => { /* non-fatal */ });
          }

          // Still record the raw lead as duplicate
          await prisma.lead.create({
            data: {
              source: normalized.source,
              sourceId: normalized.sourceId,
              sourceUrl: normalized.sourceUrl,
              companyName: normalized.companyName,
              website: normalized.website,
              phone: normalized.phone,
              email: normalized.email,
              address: normalized.address,
              city: normalized.normalizedCity,
              state: normalized.normalizedState,
              country: normalized.normalizedCountry,
              industry: normalized.normalizedIndustry,
              description: normalized.description,
              socialLinks: normalized.socialLinks,
              rawData: normalized.rawData as object,
              normalizedDomain: normalized.normalizedDomain,
              normalizedPhone: normalized.normalizedPhone,
              normalizedEmail: normalized.normalizedEmail,
              isDuplicate: true,
              duplicateOfId: dupCheck.existingLeadId,
              companyId: dupCheck.existingCompanyId,
              campaignId,
              status: 'DISCOVERED',
              discoveredAt: normalized.discoveredAt,
            },
          }).catch(() => { /* ignore duplicate key */ });

          continue;
        }

        // Create or find company
        let company = normalized.normalizedDomain
          ? await prisma.company.findFirst({
              where: { canonicalDomain: normalized.normalizedDomain },
            })
          : null;

        if (!company) {
          company = await prisma.company.create({
            data: {
              primaryName: normalized.companyName,
              aliases: [],
              canonicalDomain: normalized.normalizedDomain,
              domains: normalized.normalizedDomain ? [normalized.normalizedDomain] : [],
              phones: normalized.normalizedPhone ? [normalized.normalizedPhone] : [],
              emails: normalized.normalizedEmail ? [normalized.normalizedEmail] : [],
              primaryWebsite: normalized.website,
              primaryPhone: normalized.normalizedPhone,
              primaryEmail: normalized.normalizedEmail,
              address: normalized.address,
              city: normalized.normalizedCity,
              state: normalized.normalizedState,
              country: normalized.normalizedCountry ?? 'India',
              industry: normalized.normalizedIndustry,
              lat: normalized.lat,
              lng: normalized.lng,
              currentStatus: 'DISCOVERED',
            },
          });
        }

        await prisma.lead.create({
          data: {
            source: normalized.source,
            sourceId: normalized.sourceId,
            sourceUrl: normalized.sourceUrl,
            companyName: normalized.companyName,
            website: normalized.website,
            phone: normalized.phone,
            email: normalized.email,
            address: normalized.address,
            city: normalized.normalizedCity,
            state: normalized.normalizedState,
            country: normalized.normalizedCountry,
            industry: normalized.normalizedIndustry,
            description: normalized.description,
            socialLinks: normalized.socialLinks,
            rawData: normalized.rawData as object,
            normalizedDomain: normalized.normalizedDomain,
            normalizedPhone: normalized.normalizedPhone,
            normalizedEmail: normalized.normalizedEmail,
            isDuplicate: false,
            companyId: company.id,
            campaignId,
            status: 'DISCOVERED',
            discoveredAt: normalized.discoveredAt,
          },
        });

        results.imported++;
      } catch (err) {
        console.error('[Import] Lead error:', err);
        results.errors++;
      }
    }

    return NextResponse.json(results);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation', details: err.issues }, { status: 400 });
    }
    console.error('[API] leads import:', err);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}
