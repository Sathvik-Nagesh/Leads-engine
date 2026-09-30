/**
 * DeepSeek AI Provider
 *
 * Uses the OpenAI-compatible API via the `openai` SDK.
 * All API calls are server-side only. Keys never reach the client.
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

// Pricing in USD per 1M tokens (update when DeepSeek changes pricing)
const PRICING = {
  'deepseek-chat': {
    input: 0.14, // $0.14 / 1M input tokens
    cachedInput: 0.014, // $0.014 / 1M cached input
    output: 0.28, // $0.28 / 1M output tokens
  },
} as const;

function getDefaultPricing() {
  return PRICING['deepseek-chat'];
}

function calculateCost(
  model: string,
  inputTokens: number,
  cachedInputTokens: number,
  outputTokens: number,
  usdToInr: number
): { usd: number; inr: number } {
  const pricing =
    PRICING[model as keyof typeof PRICING] ?? getDefaultPricing();
  const usd =
    (inputTokens * pricing.input) / 1_000_000 +
    (cachedInputTokens * pricing.cachedInput) / 1_000_000 +
    (outputTokens * pricing.output) / 1_000_000;
  return { usd, inr: usd * usdToInr };
}

export class DeepSeekProvider implements AIProvider {
  readonly providerId = 'deepseek';
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: env.DEEPSEEK_API_KEY,
      baseURL: env.DEEPSEEK_BASE_URL,
    });
  }

  get isAvailable(): boolean {
    return Boolean(env.DEEPSEEK_API_KEY);
  }

  async generate(options: AIRequestOptions): Promise<AIResponse<string>> {
    await budgetEngine.assertCanSpend();

    const model = options.thinkingMode
      ? env.DEEPSEEK_DEFAULT_MODEL
      : env.DEEPSEEK_FLASH_MODEL;

    const response = await this.client.chat.completions.create({
      model,
      messages: options.messages as OpenAI.ChatCompletionMessageParam[],
      max_tokens: options.maxTokens ?? 2048,
      temperature: options.temperature ?? 0.3,
    });

    const content = response.choices[0]?.message?.content ?? '';
    const usage = this.extractUsage(model, response.usage);

    await budgetEngine.recordUsage({
      provider: 'DEEPSEEK',
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
    await budgetEngine.assertCanSpend();

    const model = env.DEEPSEEK_FLASH_MODEL;

    // Inject JSON instruction into system message
    const messages = this.injectJsonInstruction(options.messages);

    const response = await this.client.chat.completions.create({
      model,
      messages: messages as OpenAI.ChatCompletionMessageParam[],
      max_tokens: options.maxTokens ?? 4096,
      temperature: options.temperature ?? 0.1,
      response_format: { type: 'json_object' },
    });

    const rawContent = response.choices[0]?.message?.content ?? '{}';
    const usage = this.extractUsage(model, response.usage);

    await budgetEngine.recordUsage({
      provider: 'DEEPSEEK',
      model,
      usage,
      taskType: options.taskType,
      leadId: options.leadId,
      campaignId: options.campaignId,
    });

    // Parse & validate
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      parsed = repairJSON(rawContent);
    }

    const validated = options.responseSchema.parse(parsed);

    return {
      content: validated,
      usage,
      model,
      provider: this.providerId,
    };
  }

  async classify(options: AIRequestOptions): Promise<AIResponse<AIDecision>> {
    const decisionSchema = z.object({
      decision: z.string(),
      confidence: z.number().min(0).max(1),
      reasonCodes: z.array(z.string()),
      metadata: z.record(z.string(), z.unknown()).optional(),
    });

    const result = await this.structured({
      ...options,
      responseSchema: decisionSchema,
      maxTokens: 512,
      temperature: 0.1,
    });

    return result as AIResponse<AIDecision>;
  }

  async vision(options: AIRequestOptions): Promise<AIResponse<string>> {
    // DeepSeek supports vision with image_url content parts
    return this.generate({ ...options, maxTokens: options.maxTokens ?? 1024 });
  }

  private injectJsonInstruction(messages: AIRequestOptions['messages']) {
    return messages.map((m, i) => {
      if (i === 0 && m.role === 'system' && typeof m.content === 'string') {
        return {
          ...m,
          content:
            m.content +
            '\n\nYou MUST respond with valid JSON only. No prose, no markdown, no code blocks — just the JSON object.',
        };
      }
      return m;
    });
  }

  private extractUsage(
    model: string,
    apiUsage: OpenAI.CompletionUsage | undefined
  ): AIUsage {
    const inputTokens = apiUsage?.prompt_tokens ?? 0;
    const cachedInputTokens =
      (apiUsage as { prompt_tokens_details?: { cached_tokens?: number } })
        ?.prompt_tokens_details?.cached_tokens ?? 0;
    const outputTokens = apiUsage?.completion_tokens ?? 0;

    const cost = calculateCost(
      model,
      inputTokens,
      cachedInputTokens,
      outputTokens,
      env.USD_TO_INR_RATE
    );

    return {
      inputTokens,
      cachedInputTokens,
      outputTokens,
      estimatedCostUSD: cost.usd,
      estimatedCostINR: cost.inr,
    };
  }
}

// Singleton
export const deepseekProvider = new DeepSeekProvider();
