/**
 * GET  /api/budget/stats     — current month stats
 */

import { NextResponse } from 'next/server';
import { budgetEngine } from '@/lib/budget/budget-engine';

export async function GET() {
  try {
    const stats = await budgetEngine.getMonthlyStats();
    return NextResponse.json(stats);
  } catch (err) {
    console.error('[API] budget stats:', err);
    return NextResponse.json({ error: 'Failed to fetch budget stats' }, { status: 500 });
  }
}
