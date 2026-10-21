import OpenAI from 'openai';

/**
 * Central LLM client factory for LeadG.
 *
 * DeepSeek is OpenAI-compatible, so when DEEPSEEK_API_KEY is set we point the
 * OpenAI SDK at DeepSeek and use `deepseek-chat` (DeepSeek does NOT support
 * OpenAI's `response_format: json_schema` — use `json_object` + a prompt
 * instruction instead). Otherwise we fall back to the previous OpenAI config.
 */

export const USING_DEEPSEEK = !!process.env.DEEPSEEK_API_KEY;
export const LLM_MODEL = USING_DEEPSEEK
  ? process.env.DEEPSEEK_MODEL || 'deepseek-chat'
  : 'gpt-4o-mini';
export const LLM_BASE_URL = USING_DEEPSEEK ? 'https://api.deepseek.com/v1' : undefined;

export function createLLMClient(apiKey: string): OpenAI {
  return new OpenAI({ apiKey, ...(LLM_BASE_URL ? { baseURL: LLM_BASE_URL } : {}) });
}

/** Resolve the LLM key: DeepSeek env > OpenAI env > per-user stored key. */
export function resolveLLMKey(userKey?: string): string | undefined {
  return process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || userKey;
}
