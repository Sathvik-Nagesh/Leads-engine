/**
 * GET  /api/capabilities        — list all capabilities
 * POST /api/capabilities        — create capability
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1),
  category: z.enum(['TECHNOLOGY', 'GROWTH', 'CREATIVE', 'BUSINESS_INFRASTRUCTURE', 'EDUCATION_COMMUNITY']),
  description: z.string().min(1),
  idealCustomers: z.string().optional(),
  positiveSignals: z.array(z.string()).default([]),
  negativeSignals: z.array(z.string()).default([]),
  evidenceRequirements: z.array(z.string()).default([]),
  relatedCapabilityIds: z.array(z.string()).default([]),
  pitchAngles: z.array(z.string()).default([]),
  prohibitedClaims: z.array(z.string()).default([]),
  enabled: z.boolean().default(true),
});

export async function GET() {
  try {
    const capabilities = await prisma.capability.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    return NextResponse.json(capabilities);
  } catch (err) {
    console.error('[API] capabilities GET:', err);
    return NextResponse.json({ error: 'Failed to fetch capabilities' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = createSchema.parse(body);
    const capability = await prisma.capability.create({ data });
    return NextResponse.json(capability, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: err.issues }, { status: 400 });
    }
    console.error('[API] capabilities POST:', err);
    return NextResponse.json({ error: 'Failed to create capability' }, { status: 500 });
  }
}
