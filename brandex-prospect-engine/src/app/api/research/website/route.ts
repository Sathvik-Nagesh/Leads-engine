/**
 * POST /api/research/website
 *
 * Runs the full website intelligence pipeline for a company:
 * 1. SSRF-safe fetch
 * 2. Deterministic audit (no AI)
 * 3. Optional: DeepSeek website analysis
 * 4. Store WebsiteAudit record
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { fetchWebsite } from '@/lib/pipeline/website-fetcher';
import { auditWebsite } from '@/lib/pipeline/website-auditor';
import { ai } from '@/lib/providers/ai';
import { websiteAnalysisPrompt } from '@/lib/prompts';
import { budgetEngine } from '@/lib/budget/budget-engine';
import { z } from 'zod';

const requestSchema = z.object({
  companyId: z.string(),
  url: z.string().url(),
  runAIAnalysis: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyId, url, runAIAnalysis } = requestSchema.parse(body);

    // Verify company exists
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Step 1: Fetch website
    const fetchResult = await fetchWebsite(url);

    // Step 2: Deterministic audit
    const audit = auditWebsite(fetchResult);

    // Step 3: Store audit record
    const auditRecord = await prisma.websiteAudit.create({
      data: {
        companyId,
        url,
        finalUrl: audit.finalUrl,
        httpStatus: audit.httpStatus,
        httpsEnabled: audit.httpsEnabled,
        sslValid: audit.sslValid,
        loadTimeMs: audit.loadTimeMs,
        hasTitle: audit.hasTitle,
        title: audit.title,
        hasMetaDescription: audit.hasMetaDescription,
        metaDescription: audit.metaDescription,
        hasH1: audit.hasH1,
        h1Text: audit.h1Text,
        hasCanonical: audit.hasCanonical,
        hasRobots: audit.hasRobots,
        hasSitemap: audit.hasSitemap,
        hasFavicon: audit.hasFavicon,
        hasMobileViewport: audit.hasMobileViewport,
        hasContactPage: audit.hasContactPage,
        hasContactForm: audit.hasContactForm,
        hasPhone: audit.hasPhone,
        hasEmail: audit.hasEmail,
        hasWhatsApp: audit.hasWhatsApp,
        hasBookingLink: audit.hasBookingLink,
        hasCTA: audit.hasCTA,
        hasSocialLinks: audit.hasSocialLinks,
        hasBlog: audit.hasBlog,
        hasPortfolio: audit.hasPortfolio,
        hasPricing: audit.hasPricing,
        hasCareers: audit.hasCareers,
        hasAnalytics: audit.hasAnalytics,
        analyticsType: audit.analyticsTypes.join(', '),
        cms: audit.cms,
        framework: audit.framework,
        technologies: audit.technologies,
        hasStructuredData: audit.hasStructuredData,
        structuredDataTypes: audit.structuredDataTypes,
        imageCount: audit.imageCount,
        hasAltText: audit.imagesWithAlt > 0,
        pageWordCount: audit.pageWordCount,
        extractedText: audit.extractedText.slice(0, 20_000),
        extractedLinks: audit.extractedLinks as object[],
        fetchError: audit.fetchError,
        usedJina: fetchResult.usedJina ?? false,
        rawHtmlSize: audit.rawHtmlSize,
        cleanedSize: audit.extractedText.length,
      },
    });

    // Update company website
    await prisma.company.update({
      where: { id: companyId },
      data: {
        primaryWebsite: audit.finalUrl || url,
        lastResearchedAt: new Date(),
      },
    });

    // Step 4: Optional AI analysis
    let aiAnalysis = null;
    if (runAIAnalysis) {
      const budgetState = await budgetEngine.getState();
      if (budgetState !== 'STOP') {
        try {
          const messages = websiteAnalysisPrompt({
            companyName: company.primaryName,
            auditFindings: {
              hasTitle: audit.hasTitle,
              title: audit.title,
              hasH1: audit.hasH1,
              hasMetaDescription: audit.hasMetaDescription,
              httpsEnabled: audit.httpsEnabled,
              hasMobileViewport: audit.hasMobileViewport,
              hasContactForm: audit.hasContactForm,
              hasCTA: audit.hasCTA,
              hasBlog: audit.hasBlog,
              hasAnalytics: audit.hasAnalytics,
              technologies: audit.technologies,
              cms: audit.cms,
              pageWordCount: audit.pageWordCount,
              accessibilityIssues: audit.accessibilityIssues,
            },
            extractedText: audit.extractedText.slice(0, 8000),
          });

          const websiteAnalysisSchema = z.object({
            overallQuality: z.enum(['poor', 'below_average', 'average', 'good', 'excellent']),
            technicalHealth: z.object({ score: z.number(), issues: z.array(z.string()), strengths: z.array(z.string()) }),
            conversionReadiness: z.object({ score: z.number(), issues: z.array(z.string()), strengths: z.array(z.string()) }),
            seoHealth: z.object({ score: z.number(), issues: z.array(z.string()), strengths: z.array(z.string()) }),
            contentQuality: z.object({ score: z.number(), issues: z.array(z.string()), strengths: z.array(z.string()) }),
            userExperience: z.object({ score: z.number(), issues: z.array(z.string()), strengths: z.array(z.string()) }),
            keyFindings: z.array(z.string()),
            evidenceBasedGaps: z.array(z.string()),
            confidence: z.number(),
          });

          const response = await ai.structured({
            taskType: 'website_analysis',
            messages,
            responseSchema: websiteAnalysisSchema,
            companyId,
          });

          aiAnalysis = response.content;
        } catch (err) {
          console.error('[Research] AI website analysis failed:', err);
          // Non-fatal — we still have deterministic audit
        }
      }
    }

    return NextResponse.json({
      auditId: auditRecord.id,
      audit,
      aiAnalysis,
      fetchError: audit.fetchError,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation', details: err.issues }, { status: 400 });
    }
    console.error('[API] website research:', err);
    return NextResponse.json({ error: 'Website research failed' }, { status: 500 });
  }
}
