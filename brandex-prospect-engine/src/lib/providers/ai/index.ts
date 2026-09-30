/**
 * AI Provider Registry
 *
 * Single entry point for all AI calls.
 * Routes to: Jev (if available + cheap task) → DeepSeek → error
 */

import { deepseekProvider } from './deepseek';
import { jevProvider } from './jev';
import type { AIProvider, AIRequestOptions, AIResponse, AIDecision } from './types';
import { z } from 'zod';

const JEV_ELIGIBLE_TASKS = new Set(['jev_gate', 'campaign_parse']);

class AIRegistry {
  private getProvider(options: AIRequestOptions): AIProvider {
    // Use Jev for gate decisions when available
    if (JEV_ELIGIBLE_TASKS.has(options.taskType) && jevProvider.isAvailable) {
      return jevProvider;
    }
    // Default: DeepSeek
    return deepseekProvider;
  }

  async generate(options: AIRequestOptions): Promise<AIResponse<string>> {
    const provider = this.getProvider(options);
    try {
      return await provider.generate(options);
    } catch (err) {
      // Fallback from Jev → DeepSeek
      if (provider.providerId !== 'deepseek') {
        console.warn(`[AI] ${provider.providerId} failed, falling back to DeepSeek:`, err);
        return deepseekProvider.generate(options);
      }
      throw err;
    }
  }

  async structured<T>(
    options: AIRequestOptions & { responseSchema: z.ZodType<T> }
  ): Promise<AIResponse<T>> {
    const provider = this.getProvider(options);
    try {
      return await provider.structured(options);
    } catch (err) {
      if (provider.providerId !== 'deepseek') {
        console.warn(`[AI] ${provider.providerId} failed, falling back to DeepSeek:`, err);
        return deepseekProvider.structured(options);
      }
      throw err;
    }
  }

  async classify(options: AIRequestOptions): Promise<AIResponse<AIDecision>> {
    const provider = this.getProvider(options);
    try {
      return await provider.classify(options);
    } catch (err) {
      if (provider.providerId !== 'deepseek') {
        console.warn(`[AI] ${provider.providerId} failed, falling back to DeepSeek:`, err);
        return deepseekProvider.classify(options);
      }
      throw err;
    }
  }

  async vision(options: AIRequestOptions): Promise<AIResponse<string>> {
    // Vision always goes to DeepSeek (Jev doesn't support it)
    return deepseekProvider.vision(options);
  }
}

export const ai = new AIRegistry();
export type { AIProvider, AIRequestOptions, AIResponse, AIDecision };
export { repairJSON } from './types';
