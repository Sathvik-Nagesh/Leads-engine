/**
 * GET  /api/campaigns        — list campaigns
 * POST /api/campaigns        — create campaign
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  naturalLanguageInput: z.string().optional(),
  config: z.record(z.string(), z.any()),
  budgetLimitINR: z.number().optional(),
  maxLeadCount: z.number().optional(),
});

export async function GET() {
  try {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { leads: true },
        },
      },
    });
    return NextResponse.json(campaigns);
  } catch (err) {
    console.error('[API] campaigns GET:', err);
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = createSchema.parse(body);
    const campaign = await prisma.campaign.create({
      data: {
        name: data.name,
        description: data.description,
        naturalLanguageInput: data.naturalLanguageInput,
        config: data.config as any,
        budgetLimitINR: data.budgetLimitINR,
        maxLeadCount: data.maxLeadCount,
        status: 'DRAFT',
      },
    });
    return NextResponse.json(campaign, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation', details: err.issues }, { status: 400 });
    }
    console.error('[API] campaigns POST:', err);
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}
