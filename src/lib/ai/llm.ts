import OpenAI from 'openai';

/**
 * Central LLM client factory for LeadG.
 *
 * DeepSeek is OpenAI-compatible, so when DEEPSEEK_API_KEY is set we point the
 * OpenAI SDK at DeepSeek and use `deepseek-v4-flash` (DeepSeek does NOT
 * support OpenAI's `response_format: json_schema` — use `json_object` + a
 * prompt instruction instead). Otherwise we fall back to the previous OpenAI
 * config. Set DEEPSEEK_MODEL=deepseek-v4-pro for the highest-quality tier.
 */

export const USING_DEEPSEEK = !!process.env.DEEPSEEK_API_KEY;
export const LLM_MODEL = USING_DEEPSEEK
  ? process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash'
  : 'gpt-4o-mini';
export const LLM_BASE_URL = USING_DEEPSEEK ? 'https://api.deepseek.com/v1' : undefined;

export function createLLMClient(apiKey: string): OpenAI {
  return new OpenAI({ apiKey, ...(LLM_BASE_URL ? { baseURL: LLM_BASE_URL } : {}) });
}

/** Resolve the LLM key: DeepSeek env > OpenAI env > per-user stored key. */
export function resolveLLMKey(userKey?: string): string | undefined {
  return process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || userKey;
}

/**
 * Parse an appointment date out of natural-language call summary text.
 *
 * Replaces a hardcoded "tomorrow" placeholder with a real LLM extraction.
 * Returns null when the LLM is unavailable or no date can be inferred — the
 * caller must NOT invent a date in that case.
 */
export async function extractAppointmentDate(text: string): Promise<Date | null> {
  const key = resolveLLMKey();
  if (!key || !text) return null;

  try {
    const client = createLLMClient(key);
    const completion = await client.chat.completions.create({
      model: LLM_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'Extract the appointment/meeting date and time from the text. ' +
            'Respond with ONLY a JSON object: {"isoDate": "<ISO 8601>" | null}. ' +
            'Today is ' + new Date().toISOString() + '. If no date is inferable, use null.',
        },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 2048,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content);
    const iso = parsed.isoDate ?? parsed.iso_date ?? parsed.date;
    if (!iso) return null;

    const date = new Date(iso);
    return isNaN(date.getTime()) ? null : date;
  } catch (e) {
    console.warn('[LLM] extractAppointmentDate failed:', e);
    return null;
  }
}
