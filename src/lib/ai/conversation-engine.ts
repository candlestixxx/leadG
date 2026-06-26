import OpenAI from 'openai'
import { prisma } from '@/lib/db/prisma'

// ─── Types ──────────────────────────────────────────────────

export interface ConversationContext {
  agentId: string
  leadId?: string
  campaignId?: string
  callSid: string
  direction: 'inbound' | 'outbound'
  leadInfo?: {
    firstName: string
    lastName: string
    company?: string
    title?: string
    customFields?: Record<string, any>
  }
}

export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface AgentPersonality {
  // Core traits (0-1 scale)
  persuasiveness: number
  honesty: number
  confidence: number
  energy: number
  empathy: number

  // Style
  verbosity: 'concise' | 'moderate' | 'detailed'
  formality: 'casual' | 'professional' | 'formal'
  humor: 'none' | 'light' | 'moderate'

  // Custom instructions
  customTraits?: string
  prohibitedTopics?: string[]
}

export interface ConversationResult {
  response: string
  action: ConversationAction
  sentiment: number
  buyingSignalStrength: number
  shouldTransfer: boolean
  metadata: Record<string, any>
}

export type ConversationAction =
  | 'continue'
  | 'transfer'
  | 'schedule_callback'
  | 'schedule_meeting'
  | 'leave_voicemail'
  | 'end_call'
  | 'objection_handled'
  | 'qualifying'
  | 'closing'

// ─── Conversation Engine ────────────────────────────────────

export class ConversationEngine {
  private openai: OpenAI
  private context: ConversationContext
  private messages: ConversationMessage[] = []
  private personality: AgentPersonality
  private systemPrompt: string = ''
  private callPhase: 'greeting' | 'qualifying' | 'presenting' | 'objection_handling' | 'closing' = 'greeting'
  private objectionHistory: string[] = []
  private buyingSignals: string[] = []

  constructor(openai: OpenAI, context: ConversationContext) {
    this.openai = openai
    this.context = context
    this.personality = this.getDefaultPersonality()
  }

  async initialize(agentConfig: any): Promise<void> {
    this.personality = this.parsePersonality(agentConfig.personality)
    this.systemPrompt = this.buildSystemPrompt(agentConfig)

    this.messages.push({
      role: 'system',
      content: this.systemPrompt,
      timestamp: Date.now()
    })

    // Add initial context about the lead
    if (this.context.leadInfo) {
      const leadContext = this.buildLeadContext(this.context.leadInfo)
      this.messages.push({
        role: 'system',
        content: leadContext,
        timestamp: Date.now()
      })
    }
  }

  private buildSystemPrompt(agentConfig: any): string {
    const p = this.personality
    const qualifyingQuestions = agentConfig.qualifyingQuestions || []
    const objectionResponses = agentConfig.objectionHandling || []

    // Parse historical learning data (e.g., successful objection handles)
    let historicalLearnings = '';
    if (agentConfig.learningData && typeof agentConfig.learningData === 'object') {
      const learnings = agentConfig.learningData.successfulObjectionHandles || [];
      if (learnings.length > 0) {
        historicalLearnings = `\n## HISTORICAL LEARNINGS (Use these strategies as they have worked in the past)\n${learnings.map((l: string) => `- ${l}`).join('\n')}\n`;
      }
    }

    return `You are ${agentConfig.name || 'Alex'}, an AI sales assistant.

## CORE IDENTITY
You are a ${p.confidence > 0.7 ? 'highly confident' : 'warm and approachable'} sales professional with ${p.energy > 0.7 ? 'high energy and enthusiasm' : 'a calm, measured demeanor'}.
${p.customTraits ? `\n## CUSTOM TRAITS\n${p.customTraits}` : ''}

## COMMUNICATION STYLE
- Verbosity: ${p.verbosity}
- Formality: ${p.formality}
- Humor: ${p.humor}
- Persuasion level: ${p.persuasiveness > 0.7 ? 'Strong closer - use trial closes, assumptive language' : 'Consultative - focus on discovery and value'}
- Honesty level: ${p.honesty > 0.8 ? 'Always be transparent, even if it means losing the sale' : 'Focus on positive framing without misleading'}

## CONVERSATION RULES
1. Always be genuine and build rapport
2. Listen actively and reference what the prospect says
3. Ask open-ended questions to uncover pain points
4. Match your energy to the prospect's energy
5. Never be pushy — be persistently helpful
6. Handle objections by acknowledging, then redirecting to value
7. Look for buying signals: asking about price, timeline, next steps, implementation

## BUYING SIGNALS TO DETECT
- Asking about pricing, payment terms, or contracts
- Asking about implementation, onboarding, or timeline
- Mentioning budget or decision-making authority
- Asking "how does this work?" or "what would that look like?"
- Expressing urgency about their problem
- Asking about references, case studies, or testimonials
- Saying positive things about the solution

## WHEN TO TRANSFER
Transfer to a human when:
- The prospect explicitly asks to speak to a person
- The conversation becomes too complex for the script
- The prospect is ready to close/sign
- You detect strong buying signals (strength > 0.8)
- The prospect becomes upset or frustrated

${qualifyingQuestions.length > 0 ? `
## QUALIFYING QUESTIONS (ask naturally, not like a checklist)
${qualifyingQuestions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}
` : ''}

${objectionResponses.length > 0 ? `
## OBJECTION RESPONSES
${objectionResponses.map((o: any) => `
**Objection:** ${o.objection}
**Response:** ${o.response}
`).join('\n')}
` : ''}

## OBJECTION HANDLING FRAMEWORK
When you hear an objection:
1. Acknowledge: "I completely understand that..."
2. Clarify: "Can you tell me more about what's holding you back?"
3. Reframe: Present the value from a different angle
4. Check: "Does that address your concern?"
${historicalLearnings}
## RESPONSE FORMAT
Respond conversationally. Keep responses under 3 sentences unless explaining something specific.
Never use bullet points or lists in speech — speak naturally as if on the phone.
${p.prohibitedTopics?.length ? `\n## PROHIBITED TOPICS\nDo not discuss: ${p.prohibitedTopics.join(', ')}` : ''}`
  }

  async processInput(userInput: string): Promise<ConversationResult> {
    // Add user message
    this.messages.push({
      role: 'user',
      content: userInput,
      timestamp: Date.now()
    })

    // Detect sentiment and buying signals from user input
    const analysis = await this.analyzeInput(userInput)

    // Update conversation phase
    this.updatePhase(analysis)

    // Generate response
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: this.messages.map(m => ({
        role: m.role,
        content: m.content
      })),
      temperature: 0.7,
      max_tokens: 200,
      functions: [
        {
          name: 'decide_action',
          description: 'Decide the next action based on the conversation state',
          parameters: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                enum: [
                  'continue', 'transfer', 'schedule_callback',
                  'schedule_meeting', 'leave_voicemail', 'end_call',
                  'qualifying', 'closing'
                ]
              },
              should_transfer: { type: 'boolean' },
              transfer_reason: { type: 'string' },
              sentiment: { type: 'number', minimum: -1, maximum: 1 },
              buying_signal_strength: { type: 'number', minimum: 0, maximum: 1 }
            },
            required: ['action', 'should_transfer', 'sentiment', 'buying_signal_strength']
          }
        }
      ],
      function_call: { name: 'decide_action' }
    })

    const responseMessage = completion.choices[0].message
    const assistantContent = responseMessage.content || ''
    let actionData

    try {
      actionData = JSON.parse(responseMessage.function_call?.arguments || '{}')
    } catch {
      actionData = {
        action: 'continue',
        should_transfer: false,
        sentiment: 0,
        buying_signal_strength: 0
      }
    }

    // Store assistant response
    this.messages.push({
      role: 'assistant',
      content: assistantContent,
      timestamp: Date.now()
    })

    // Track buying signals
    if (actionData.buying_signal_strength > 0.5) {
      this.buyingSignals.push(userInput)
    }

    // Determine if we should force a transfer
    const shouldTransfer = actionData.should_transfer ||
      actionData.buying_signal_strength > 0.8 ||
      this.shouldForceTransfer(userInput)

    return {
      response: assistantContent,
      action: shouldTransfer ? 'transfer' : actionData.action,
      sentiment: actionData.sentiment || 0,
      buyingSignalStrength: actionData.buying_signal_strength || 0,
      shouldTransfer,
      metadata: {
        phase: this.callPhase,
        messageCount: this.messages.length,
        buyingSignals: this.buyingSignals.length,
        objectionCount: this.objectionHistory.length
      }
    }
  }

  private async analyzeInput(input: string): Promise<{
    isObjection: boolean
    isBuyingSignal: boolean
    sentiment: number
    isQuestion: boolean
  }> {
    const lower = input.toLowerCase()

    const objectionPatterns = [
      /not interested/i,
      /too expensive/i,
      /already have/i,
      /bad time/i,
      /call back later/i,
      /send (me )?an? email/i,
      /not (the )?right (time|fit)/i,
      /think(ing)? about it/i,
      /need to (talk|discuss) (to|with)/i,
      /budget/i,
      /can'?t afford/i
    ]

    const buyingPatterns = [
      /how much/i,
      /what('s| is) the (price|cost)/i,
      /when (can|could|would)/i,
      /how (does|do) (it|you|that) (work|help)/i,
      /next steps/i,
      /sign(ing)? up/i,
      /get start(ed)?/i,
      /implementation/i,
      /onboarding/i,
      /timeline/i,
      /contract/i
    ]

    return {
      isObjection: objectionPatterns.some(p => p.test(lower)),
      isBuyingSignal: buyingPatterns.some(p => p.test(lower)),
      sentiment: this.estimateSentiment(lower),
      isQuestion: input.includes('?')
    }
  }

  private estimateSentiment(input: string): number {
    const positive = ['great', 'perfect', 'love', 'yes', 'absolutely',
      'interested', 'definitely', 'sounds good', 'exactly', 'amazing',
      'wonderful', 'fantastic', 'impressed', 'helpful']
    const negative = ['no', 'stop', 'hate', 'terrible', 'worst',
      'annoying', 'spam', 'remove', 'never', 'awful',
      'waste', 'scam', 'fraud']

    let score = 0
    for (const word of positive) if (input.includes(word)) score += 0.15
    for (const word of negative) if (input.includes(word)) score -= 0.2
    return Math.max(-1, Math.min(1, score))
  }

  private updatePhase(analysis: any): void {
    if (analysis.isObjection) {
      this.objectionHistory.push(this.messages[this.messages.length - 1]?.content || '')
      this.callPhase = 'objection_handling'
    } else if (analysis.isBuyingSignal) {
      this.callPhase = 'closing'
    } else if (this.messages.length < 4) {
      this.callPhase = 'greeting'
    } else if (this.messages.length < 10) {
      this.callPhase = 'qualifying'
    } else {
      this.callPhase = 'presenting'
    }
  }

  private shouldForceTransfer(input: string): boolean {
    const transferTriggers = [
      /speak to (someone|a person|a human|your manager|your supervisor)/i,
      /transfer me/i,
      /get me someone/i,
      /let me talk/i,
      /real person/i
    ]
    return transferTriggers.some(p => p.test(input))
  }

  private buildLeadContext(lead: any): string {
    return `## CURRENT LEAD INFORMATION
Name: ${lead.firstName} ${lead.lastName}
${lead.company ? `Company: ${lead.company}` : ''}
${lead.title ? `Title: ${lead.title}` : ''}
${lead.customFields ? `Additional Info: ${JSON.stringify(lead.customFields)}` : ''}
Use this information to personalize your conversation naturally.
Don't reveal that you have this information unless appropriate.`
  }

  async generateVoicemailScript(): Promise<string> {
    const recentContext = this.messages.slice(-4)
    const contextSummary = recentContext
      .filter(m => m.role !== 'system')
      .map(m => `${m.role}: ${m.content}`)
      .join('\n')

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Generate a brief, natural voicemail message (under 30 seconds when spoken).
          Be warm, mention the lead's name, your name, a brief value proposition, and a callback number.
          Speak naturally — this will be converted to speech.`
        },
        {
          role: 'user',
          content: `Context from attempted call:\n${contextSummary}\n\nLead: ${this.context.leadInfo?.firstName}`
        }
      ],
      temperature: 0.7,
      max_tokens: 150
    })

    return completion.choices[0].message.content || ''
  }

  getTranscript(): ConversationMessage[] {
    return this.messages.filter(m => m.role !== 'system')
  }

  getSummary(): {
    totalMessages: number
    phases: string[]
    buyingSignals: string[]
    objections: string[]
    overallSentiment: number
  } {
    const sentiments = this.messages
      .filter(m => m.role !== 'system')
      .map((_, i) => 0) // simplified

    return {
      totalMessages: this.messages.filter(m => m.role !== 'system').length,
      phases: [this.callPhase],
      buyingSignals: this.buyingSignals,
      objections: this.objectionHistory,
      overallSentiment: sentiments.length > 0
        ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length
        : 0
    }
  }

  private getDefaultPersonality(): AgentPersonality {
    return {
      persuasiveness: 0.6,
      honesty: 0.9,
      confidence: 0.7,
      energy: 0.6,
      empathy: 0.7,
      verbosity: 'moderate',
      formality: 'professional',
      humor: 'light'
    }
  }

  private parsePersonality(data: any): AgentPersonality {
    if (!data) return this.getDefaultPersonality()
    return { ...this.getDefaultPersonality(), ...data }
  }
}
