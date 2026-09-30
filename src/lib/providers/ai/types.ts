/**
 * AI Provider Abstraction
 *
 * All AI interactions MUST go through this interface.
 * Never call DeepSeek or Jev APIs directly from business logic.
 */

import { z } from 'zod';

// ============================================================
// TYPES
// ============================================================

export type AITaskType =
  | 'company_understanding'
  | 'website_analysis'
  | 'opportunity_analysis'
  | 'decision_maker_analysis'
  | 'buying_signal_analysis'
  | 'competitor_analysis'
  | 'outreach_email'
  | 'outreach_linkedin'
  | 'outreach_whatsapp'
  | 'research_summary'
  | 'campaign_parse'
  | 'jev_gate';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | AIMessageContent[];
}

export interface AIMessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

export interface AIRequestOptions {
  taskType: AITaskType;
  messages: AIMessage[];
  /** If true, response MUST be valid JSON matching responseSchema */
  structuredOutput?: boolean;
  responseSchema?: z.ZodTypeAny;
  /** Max tokens to generate */
  maxTokens?: number;
  /** 0 = deterministic, 1 = creative */
  temperature?: number;
  /** Enable thinking/reasoning mode (DeepSeek only, costs more) */
  thinkingMode?: boolean;
  /** For logging/cost tracking */
  leadId?: string;
  campaignId?: string;
  companyId?: string;
}

export interface AIUsage {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  estimatedCostUSD: number;
  estimatedCostINR: number;
}

export interface AIResponse<T = string> {
  content: T;
  usage: AIUsage;
  model: string;
  provider: string;
  thinkingContent?: string;
}

export interface AIDecision {
  decision: string;
  confidence: number;
  reasonCodes: string[];
  metadata?: Record<string, unknown>;
}

// ============================================================
// PROVIDER INTERFACE
// ============================================================

export interface AIProvider {
  readonly providerId: string;
  readonly isAvailable: boolean;

  /**
   * Generate text (freeform)
   */
  generate(options: AIRequestOptions): Promise<AIResponse<string>>;

  /**
   * Generate structured JSON output, validated against schema
   */
  structured<T>(
    options: AIRequestOptions & { responseSchema: z.ZodType<T> }
  ): Promise<AIResponse<T>>;

  /**
   * Fast classification / decision gate (cheap)
   */
  classify(options: AIRequestOptions): Promise<AIResponse<AIDecision>>;

  /**
   * Vision analysis (requires image content in messages)
   */
  vision(options: AIRequestOptions): Promise<AIResponse<string>>;
}

// ============================================================
// RESULT REPAIR UTILITY
// ============================================================

/**
 * Attempt to extract valid JSON from a potentially malformed AI response.
 * Tries: direct parse → code block extraction → bracket extraction
 */
export function repairJSON(raw: string): unknown {
  // 1. Direct parse
  try {
    return JSON.parse(raw);
  } catch {
    // continue
  }

  // 2. Extract from markdown code block
  const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock?.[1]) {
    try {
      return JSON.parse(codeBlock[1].trim());
    } catch {
      // continue
    }
  }

  // 3. Find first { ... } or [ ... ]
  const firstBrace = raw.indexOf('{');
  const firstBracket = raw.indexOf('[');
  const start =
    firstBrace === -1
      ? firstBracket
      : firstBracket === -1
        ? firstBrace
        : Math.min(firstBrace, firstBracket);

  if (start !== -1) {
    const lastBrace = raw.lastIndexOf('}');
    const lastBracket = raw.lastIndexOf(']');
    const end = Math.max(lastBrace, lastBracket);
    if (end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {
        // continue
      }
    }
  }

  throw new Error(`Cannot repair JSON from AI response: ${raw.slice(0, 200)}`);
}
