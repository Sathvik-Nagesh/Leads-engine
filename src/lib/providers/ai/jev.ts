/**
 * Jev AI Provider
 *
 * Fast decision/gating layer. Used for cheap binary decisions before
 * escalating to DeepSeek for expensive analysis.
 *
 * If JEV_API_KEY is not set, this provider reports isAvailable = false
 * and the system falls back to deterministic rules or DeepSeek.
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { env } from '@/lib/env';
import { budgetEngine } from '@/lib/budget/budget-engine';
import {
  AIProvider,
  AIRequestOptions,
  AIResponse,
  AIDecision,
  AIUsage,
  repairJSON,
} from './types';

// Jev pricing (placeholder — update when known)
const JEV_PRICING = {
  inputPerMToken: 0.05,
  outputPerMToken: 0.10,
};

export class JevProvider implements AIProvider {
  readonly providerId = 'jev';
  private client: OpenAI | null = null;

  constructor() {
    if (env.JEV_API_KEY && env.JEV_BASE_URL) {
      this.client = new OpenAI({
        apiKey: env.JEV_API_KEY,
        baseURL: env.JEV_BASE_URL,
      });
    }
  }

  get isAvailable(): boolean {
    return Boolean(this.client && env.JEV_API_KEY && env.JEV_DEFAULT_MODEL);
  }

  async generate(options: AIRequestOptions): Promise<AIResponse<string>> {
    if (!this.isAvailable || !this.client) {
      throw new Error('Jev provider is not available');
    }

    await budgetEngine.assertCanSpend();

    const model = env.JEV_DEFAULT_MODEL!;
    const response = await this.client.chat.completions.create({
      model,
      messages: options.messages as OpenAI.ChatCompletionMessageParam[],
      max_tokens: options.maxTokens ?? 512,
      temperature: options.temperature ?? 0.1,
    });

    const content = response.choices[0]?.message?.content ?? '';
    const usage = this.extractUsage(response.usage);

    await budgetEngine.recordUsage({
      provider: 'JEV',
      model,
      usage,
      taskType: options.taskType,
      leadId: options.leadId,
      campaignId: options.campaignId,
    });

    return { content, usage, model, provider: this.providerId };
  }

  async structured<T>(
    options: AIRequestOptions & { responseSchema: z.ZodType<T> }
  ): Promise<AIResponse<T>> {
    const response = await this.generate({
      ...options,
      maxTokens: options.maxTokens ?? 512,
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(response.content);
    } catch {
      parsed = repairJSON(response.content);
    }

    const validated = options.responseSchema.parse(parsed);
    return { ...response, content: validated };
  }

  async classify(options: AIRequestOptions): Promise<AIResponse<AIDecision>> {
    const decisionSchema = z.object({
      decision: z.string(),
      confidence: z.number().min(0).max(1),
      reasonCodes: z.array(z.string()),
      metadata: z.record(z.string(), z.unknown()).optional(),
    });

    return this.structured({ ...options, responseSchema: decisionSchema });
  }

  async vision(_options: AIRequestOptions): Promise<AIResponse<string>> {
    throw new Error('Jev provider does not support vision');
  }

  private extractUsage(apiUsage: OpenAI.CompletionUsage | undefined): AIUsage {
    const inputTokens = apiUsage?.prompt_tokens ?? 0;
    const outputTokens = apiUsage?.completion_tokens ?? 0;
    const usd =
      (inputTokens * JEV_PRICING.inputPerMToken) / 1_000_000 +
      (outputTokens * JEV_PRICING.outputPerMToken) / 1_000_000;

    return {
      inputTokens,
      cachedInputTokens: 0,
      outputTokens,
      estimatedCostUSD: usd,
      estimatedCostINR: usd * env.USD_TO_INR_RATE,
    };
  }
}

// Singleton
export const jevProvider = new JevProvider();
