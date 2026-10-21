import { prisma } from "@/lib/prisma";
import { createLLMClient, LLM_MODEL } from "@/lib/ai/llm";

export type SentimentResult = {
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  intent: "HOT" | "NOT_INTERESTED" | "DNC" | "UNSUBSCRIBE" | "INFO_REQUEST" | "GENERAL";
  confidence: number;
};

export class SentimentAnalyzer {
  static async generateEmail(lead: any, activities: any[], summary: any, userId?: string): Promise<{ subject: string, body: string }> {
    let openAiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
    if (userId) {
        const settings = await prisma.integrationSettings.findFirst({
            where: { provider: 'openai_api_key', userId }
        });
        if (settings?.apiKey) openAiKey = settings.apiKey;
    }

    if (openAiKey) {
        try {
            const openai = createLLMClient(openAiKey);

            const contextStr = `
            Lead Profile: ${JSON.stringify({ firstName: lead.firstName, lastName: lead.lastName, status: lead.status, type: lead.leadType })}
            Recent Activities: ${JSON.stringify(activities.map(a => a.description))}
            AI Conversation Summary: ${summary?.summary || 'None available'}
            `;

            const completion = await openai.chat.completions.create({
                model: LLM_MODEL,
                messages: [
                    {
                        role: "system",
                        content: "You are an elite real estate assistant named Jules. Write a highly personalized, natural, and concise email to follow up with a lead. Do not sound like a robot. Pivot towards getting a meeting or phone call. Respond with ONLY a JSON object with string keys \"subject\" and \"body\"."
                    },
                    { role: "user", content: `Generate an email for this lead based on their context: ${contextStr}` },
                ],
                response_format: { type: "json_object" },
            });

            if (completion.choices[0].message.content) {
                return JSON.parse(completion.choices[0].message.content);
            }
        } catch (e) {
            console.error("[EmailGenerator] LLM API failed, falling back to mock heuristics.", e);
        }
    }

    return {
        subject: `Following up regarding your property search, ${lead.firstName}`,
        body: `Hi ${lead.firstName},\n\nI just wanted to touch base regarding your real estate goals. Are you available for a quick chat tomorrow?\n\nBest,\nJules (AI Concierge)`
    };
  }

  static async predictLeadScore(lead: any, activities: any[], userId?: string): Promise<number> {
    let openAiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
    if (userId) {
        const settings = await prisma.integrationSettings.findFirst({
            where: { provider: 'openai_api_key', userId }
        });
        if (settings?.apiKey) openAiKey = settings.apiKey;
    }

    if (openAiKey) {
        try {
            const openai = createLLMClient(openAiKey);

            const contextStr = `
            Lead Profile: ${JSON.stringify({ firstName: lead.firstName, status: lead.status, type: lead.leadType, timeline: lead.timeline, budget: lead.budget })}
            Recent Activities: ${JSON.stringify(activities.map(a => a.description))}
            `;

            const completion = await openai.chat.completions.create({
                model: LLM_MODEL,
                messages: [
                    {
                        role: "system",
                        content: "You are an expert real estate data scientist with a predictive ML background. Analyze the lead's profile, financial indicators (budget, preapproval), timeline, and recent behavioral activities. Calculate an exact integer 'urgency_score' from 0 to 100 representing how close this lead is to transacting (100 being immediate). Evaluate cross-signals such as unresponsive emails vs. proactive calls. Respond with ONLY a JSON object with an integer key \"urgency_score\"."
                    },
                    { role: "user", content: `Predict score for: ${contextStr}` },
                ],
                response_format: { type: "json_object" },
            });

            if (completion.choices[0].message.content) {
                const result = JSON.parse(completion.choices[0].message.content);
                return result.urgency_score ?? result.urgencyScore ?? 50;
            }
        } catch (e) {
            console.error("[ScorePredictor] LLM API failed, falling back to heuristic score.", e);
        }
    }

    // Fallback heuristic if LLM fails or key is missing
    return lead.urgencyScore ? Math.min(lead.urgencyScore + 10, 100) : 50;
  }

  static async analyze(message: string, userId?: string): Promise<SentimentResult> {

    // 1. Try to initialize the LLM with the tenant's API key
    let openAiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;

    if (userId) {
        const settings = await prisma.integrationSettings.findFirst({
            where: { provider: 'openai_api_key', userId }
        });
        if (settings?.apiKey) openAiKey = settings.apiKey;
    }

    // 2. Execute true LLM structured output if key exists
    if (openAiKey) {
        try {
            const openai = createLLMClient(openAiKey);
            const completion = await openai.chat.completions.create({
                model: LLM_MODEL,
                messages: [
                    {
                        role: "system",
                        content: "You are an expert real estate lead parser. Analyze the user's message and determine the sentiment and intent. 'HOT' means they want to meet, talk, or buy/sell. 'DNC' means do not contact. 'UNSUBSCRIBE' means stop texting. Respond with ONLY a JSON object with keys: sentiment (one of POSITIVE, NEGATIVE, NEUTRAL), intent (one of HOT, NOT_INTERESTED, DNC, UNSUBSCRIBE, INFO_REQUEST, GENERAL), and confidence (float 0-1)."
                    },
                    { role: "user", content: message },
                ],
                response_format: { type: "json_object" },
            });

            if (completion.choices[0].message.content) {
                return JSON.parse(completion.choices[0].message.content) as SentimentResult;
            }
        } catch (e) {
            console.error("[SentimentAnalyzer] LLM API failed, falling back to mock heuristics.", e);
        }
    }

    // 3. Graceful Mock Heuristics Fallback
    const text = message.toLowerCase();

    if (["stop", "unsubscribe", "cancel", "remove", "quit"].includes(text.trim())) {
      return {
        sentiment: "NEGATIVE",
        intent: "UNSUBSCRIBE",
        confidence: 1.0,
      };
    }

    if (text.includes("don't contact me") || text.includes("do not call") || text.includes("leave me alone")) {
        return {
            sentiment: "NEGATIVE",
            intent: "DNC",
            confidence: 0.95
        };
    }

    // 2. Check for Hot / Positive Intent
    if (
      text.includes("yes") ||
      text.includes("interested") ||
      text.includes("call me") ||
      text.includes("available") ||
      text.includes("how much") ||
      text.includes("view the house") ||
      text.includes("appointment")
    ) {
      return {
        sentiment: "POSITIVE",
        intent: "HOT",
        confidence: 0.85,
      };
    }

    // 3. Check for Not Interested
    if (
        text.includes("no thanks") ||
        text.includes("not looking") ||
        text.includes("already bought") ||
        text.includes("already have an agent")
      ) {
        return {
          sentiment: "NEGATIVE",
          intent: "NOT_INTERESTED",
          confidence: 0.80,
        };
      }

    // Fallback
    return {
      sentiment: "NEUTRAL",
      intent: "GENERAL",
      confidence: 0.5,
    };
  }
}
