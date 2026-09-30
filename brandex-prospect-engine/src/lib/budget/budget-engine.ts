/**
 * Budget Engine
 *
 * Tracks AI spend against the ₹1,200/month target.
 * Hard-stops paid AI requests when budget is exhausted.
 *
 * Budget states:
 *   NORMAL     < ₹600
 *   CAUTION    ₹600–₹900
 *   RESTRICTED ₹900–₹1,050
 *   MINIMAL    ₹1,050–₹1,200
 *   STOP       ≥ ₹1,200
 */

import { prisma } from '@/lib/db/prisma';
import { env } from '@/lib/env';
import type { AIUsage } from '@/lib/providers/ai/types';

export type BudgetState = 'NORMAL' | 'CAUTION' | 'RESTRICTED' | 'MINIMAL' | 'STOP';

interface RecordUsageParams {
  provider: 'DEEPSEEK' | 'JEV' | 'MOCK';
  model: string;
  usage: AIUsage;
  taskType: string;
  leadId?: string;
  campaignId?: string;
}

interface MonthlyStats {
  spentINR: number;
  budgetINR: number;
  remainingINR: number;
  state: BudgetState;
  requestCount: number;
  costPerLead: number | null;
}

function getBudgetState(spentINR: number, budgetINR: number): BudgetState {
  const pct = spentINR / budgetINR;
  if (spentINR >= budgetINR) return 'STOP';
  if (pct >= 0.875) return 'MINIMAL';    // ≥87.5% = ₹1,050 of ₹1,200
  if (pct >= 0.75) return 'RESTRICTED';  // ≥75%   = ₹900
  if (pct >= 0.5) return 'CAUTION';      // ≥50%   = ₹600
  return 'NORMAL';
}

class BudgetEngine {
  private monthlyBudgetINR: number;

  constructor() {
    this.monthlyBudgetINR = env.BUDGET_MONTHLY_INR;
  }

  /** Get start of current calendar month in UTC */
  private monthStart(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }

  /** Current month's total spend in INR */
  async currentMonthSpendINR(): Promise<number> {
    try {
      const result = await prisma.aIUsageLog.aggregate({
        _sum: { estimatedCostINR: true },
        where: { timestamp: { gte: this.monthStart() } },
      });
      return result._sum.estimatedCostINR ?? 0;
    } catch {
      return 0;
    }
  }

  /** Get full monthly stats */
  async getMonthlyStats(): Promise<MonthlyStats> {
    try {
      const [spentINR, requestCount, leadCount] = await Promise.all([
        this.currentMonthSpendINR(),
        prisma.aIUsageLog.count({
          where: { timestamp: { gte: this.monthStart() } },
        }),
        prisma.company.count({
          where: { firstDiscoveredAt: { gte: this.monthStart() } },
        }),
      ]);

      const budgetINR = this.monthlyBudgetINR;
      const remainingINR = Math.max(0, budgetINR - spentINR);
      const state = getBudgetState(spentINR, budgetINR);
      const costPerLead = leadCount > 0 ? spentINR / leadCount : null;

      return { spentINR, budgetINR, remainingINR, state, requestCount, costPerLead };
    } catch {
      return {
        spentINR: 0,
        budgetINR: this.monthlyBudgetINR,
        remainingINR: this.monthlyBudgetINR,
        state: 'NORMAL',
        requestCount: 0,
        costPerLead: null,
      };
    }
  }

  /** Current budget state */
  async getState(): Promise<BudgetState> {
    try {
      const spent = await this.currentMonthSpendINR();
      return getBudgetState(spent, this.monthlyBudgetINR);
    } catch {
      return 'NORMAL';
    }
  }

  /**
   * Assert budget allows spending. Throws if STOP.
   * Returns current state for callers to adjust behavior.
   */
  async assertCanSpend(): Promise<BudgetState> {
    const state = await this.getState();
    if (state === 'STOP') {
      throw new Error(
        `AI budget exhausted. Monthly limit of ₹${this.monthlyBudgetINR} reached. ` +
          'No further AI requests will be processed until the budget resets.'
      );
    }
    return state;
  }

  /**
   * Returns true if a specific feature should be allowed given budget state.
   */
  isFeatureAllowed(
    feature: 'competitor_research' | 'screenshots' | 'deep_research' | 'standard',
    state: BudgetState
  ): boolean {
    if (state === 'STOP') return false;
    if (state === 'MINIMAL') return feature === 'standard';
    if (state === 'RESTRICTED') return feature === 'standard' || feature === 'deep_research';
    return true; // NORMAL and CAUTION allow everything
  }

  /** Record an AI API call to the usage log */
  async recordUsage(params: RecordUsageParams): Promise<void> {
    const state = await this.getState();

    await prisma.aIUsageLog.create({
      data: {
        provider: params.provider,
        model: params.model,
        inputTokens: params.usage.inputTokens,
        cachedInputTokens: params.usage.cachedInputTokens,
        outputTokens: params.usage.outputTokens,
        estimatedCostUSD: params.usage.estimatedCostUSD,
        estimatedCostINR: params.usage.estimatedCostINR,
        requestType: params.taskType,
        leadId: params.leadId,
        campaignId: params.campaignId,
        budgetStateAtRequest: state,
      },
    });
  }
}

// Singleton
export const budgetEngine = new BudgetEngine();
