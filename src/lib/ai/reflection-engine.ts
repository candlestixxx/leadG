import OpenAI from 'openai'
import { prisma } from '@/lib/db/prisma'

export class ReflectionEngine {
  private openai: OpenAI

  constructor(openai: OpenAI) {
    this.openai = openai
  }

  async analyzeCallTranscript(callLogId: string): Promise<void> {
    const callLog = await prisma.callLog.findUnique({
      where: { id: callLogId },
      include: { aiAgent: true }
    })

    if (!callLog || !callLog.transcript || !callLog.aiAgentId || !callLog.aiAgent) {
      return
    }

    // Only analyze successful outcomes or highly negative ones for learning
    if (!['MEETING_SCHEDULED', 'TRANSFERRED', 'INTERESTED', 'NOT_INTERESTED'].includes(callLog.outcome || '')) {
      return
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert sales manager reviewing a call transcript.
            The goal is to extract new, successful objection handling responses that the AI used, or new objections it failed to handle.
            Analyze the transcript and extract any novel objections and the corresponding response that led to a positive outcome.
            If the call was negative (e.g. NOT_INTERESTED), identify the objection that caused the failure, and propose a better response.`
          },
          {
            role: 'user',
            content: `Call Outcome: ${callLog.outcome}\n\nTranscript:\n${callLog.transcript}`
          }
        ],
        functions: [
          {
            name: 'update_learning_data',
            description: 'Extract learned objections and optimal responses from the conversation.',
            parameters: {
              type: 'object',
              properties: {
                extracted_insights: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      objection: { type: 'string', description: 'The customer objection.' },
                      response: { type: 'string', description: 'The optimal AI response to overcome it.' },
                      confidence: { type: 'number', description: '0.0 to 1.0 confidence in this insight.' }
                    },
                    required: ['objection', 'response', 'confidence']
                  }
                },
                general_feedback: { type: 'string' }
              },
              required: ['extracted_insights']
            }
          }
        ],
        function_call: { name: 'update_learning_data' }
      })

      const responseMessage = completion.choices[0].message
      if (responseMessage.function_call?.arguments) {
        const data = JSON.parse(responseMessage.function_call.arguments)

        if (data.extracted_insights && data.extracted_insights.length > 0) {
           const currentObjections = Array.isArray(callLog.aiAgent.objectionHandling)
              ? callLog.aiAgent.objectionHandling
              : []

           // Append highly confident insights
           const newInsights = data.extracted_insights
              .filter((insight: any) => insight.confidence > 0.8)
              .map((insight: any) => ({
                 objection: insight.objection,
                 response: insight.response,
                 learnedFromCallId: callLogId,
                 dateLearned: new Date().toISOString()
              }))

           if (newInsights.length > 0) {
               await prisma.aiAgent.update({
                 where: { id: callLog.aiAgentId },
                 data: {
                   objectionHandling: [...currentObjections, ...newInsights],
                   learningData: {
                     ...((callLog.aiAgent.learningData as any) || {}),
                     lastReflectionAt: new Date().toISOString(),
                     totalReflections: (((callLog.aiAgent.learningData as any)?.totalReflections || 0) + 1)
                   }
                 }
               })
               console.log(`[ReflectionEngine] Agent ${callLog.aiAgentId} learned ${newInsights.length} new objection handlers.`)
           }
        }
      }

    } catch (error) {
      console.error("[ReflectionEngine] Analysis failed:", error)
    }
  }
}
