/**
 * POST /api/campaigns/parse
 *
 * Converts natural language campaign description into structured config.
 * Uses DeepSeek via the AI provider abstraction.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/lib/providers/ai';
import { campaignParsePrompt } from '@/lib/prompts';
import { z } from 'zod';

const requestSchema = z.object({
  input: z.string().min(5, 'Campaign description must be at least 5 characters'),
});

const campaignConfigSchema = z.object({
  name: z.string(),
  description: z.string(),
  industries: z.array(z.string()).default([]),
  subIndustries: z.array(z.string()).default([]),
  locations: z.array(z.object({
    country: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    radius: z.number().nullable().optional(),
  })).default([]),
  companyTypes: z.array(z.string()).default([]),
  employeeMin: z.number().nullable().optional(),
  employeeMax: z.number().nullable().optional(),
  keywords: z.array(z.string()).default([]),
  excludedKeywords: z.array(z.string()).default([]),
  requireWebsite: z.boolean().default(false),
  targetRoles: z.array(z.string()).default([]),
  prioritizedCapabilities: z.array(z.string()).default([]),
  minOpportunityScore: z.number().nullable().optional(),
  maxLeads: z.number().nullable().optional(),
  researchDepth: z.enum(['SHALLOW', 'STANDARD', 'DEEP']).default('STANDARD'),
  competitorResearchMode: z.enum(['OFF', 'SMART', 'ALWAYS']).default('SMART'),
  buyingSignalMode: z.enum(['OFF', 'BASIC', 'DEEP']).default('BASIC'),
  outreachMode: z.enum(['STANDARD', 'HIGH_VALUE', 'STRATEGIC']).default('STANDARD'),
  budgetLimitINR: z.number().nullable().optional(),
  confidence: z.number().default(0.8),
  clarificationsNeeded: z.array(z.string()).default([]),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { input } = requestSchema.parse(body);

    const messages = campaignParsePrompt(input);

    const response = await ai.structured({
      taskType: 'campaign_parse',
      messages,
      responseSchema: campaignConfigSchema,
      maxTokens: 1024,
      temperature: 0.2,
    });

    return NextResponse.json({
      config: response.content,
      usage: response.usage,
      model: response.model,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation', details: err.issues }, { status: 400 });
    }
    console.error('[API] campaign parse:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to parse campaign' },
      { status: 500 }
    );
  }
}
