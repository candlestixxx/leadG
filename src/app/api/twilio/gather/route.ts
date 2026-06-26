import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import OpenAI from 'openai'
import { ConversationEngine } from '@/lib/ai/conversation-engine'

// Store active conversations (in production, use Redis)
const activeConversations = new Map<string, ConversationEngine>()

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const callSid = formData.get('CallSid') as string
  const speechResult = formData.get('SpeechResult') as string
  const confidence = formData.get('Confidence') as string

  const url = new URL(req.url)
  const agentId = url.searchParams.get('agentId')!
  const leadId = url.searchParams.get('leadId')
  const campaignId = url.searchParams.get('campaignId')
  const retry = url.searchParams.get('retry') === 'true'

  // Get or create conversation
  let conversation = activeConversations.get(callSid)

  if (!conversation) {
    const agent = await prisma.aiAgent.findUnique({ where: { id: agentId } })
    if (!agent) {
      return errorResponse('Configuration error.')
    }

    let leadInfo
    if (leadId) {
      const lead = await prisma.lead.findUnique({ where: { id: leadId } })
      if (lead) {
        leadInfo = {
          firstName: lead.firstName,
          lastName: lead.lastName,
          company: lead.company || undefined,
          title: lead.title || undefined,
          customFields: lead.customFields as Record<string, any>
        }
      }
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    conversation = new ConversationEngine(openai, {
      agentId: agent.id,
      leadId: leadId || undefined,
      campaignId: campaignId || undefined,
      callSid,
      direction: 'outbound',
      leadInfo
    })

    await conversation.initialize({
      name: agent.name,
      personality: agent.personality,
      systemPrompt: agent.systemPrompt,
      qualifyingQuestions: agent.qualifyingQuestions,
      objectionHandling: agent.objectionHandling
    })

    activeConversations.set(callSid, conversation)

    // Clean up after call ends
    setTimeout(() => activeConversations.delete(callSid), 30 * 60 * 1000)
  }

  if (!speechResult && retry) {
    return gatherResponse(
      "I understand you might be busy. I'll just need a moment of your time.",
      agentId, leadId, campaignId, callSid
    )
  }

  if (!speechResult) {
    return gatherResponse(
      "I didn't catch that, could you say that again?",
      agentId, leadId, campaignId, callSid
    )
  }

  const result = await conversation.processInput(speechResult)

  // Update call log
  await prisma.callLog.update({
    where: { twilioCallSid: callSid },
    data: {
      transcript: conversation.getTranscript()
        .map(m => `${m.role}: ${m.content}`)
        .join('\n'),
      sentiment: result.sentiment,
      ...(result.action === 'transfer' ? {
        status: 'TRANSFERRED',
        transferredAt: new Date()
      } : {}),
      ...(result.action === 'end_call' ? {
        status: 'COMPLETED',
        endedAt: new Date(),
        outcome: result.metadata?.outcome || 'NOT_INTERESTED'
      } : {})
    }
  })

  if (result.shouldTransfer || result.action === 'transfer') {
    const transferNumber = process.env.TRANSFER_NUMBER || '+15551234567'
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">${escapeXml(result.response)}</Say>
  <Say voice="Polly.Matthew">One moment while I connect you with our team.</Say>
  <Dial action="/api/twilio/transfer-complete?callSid=${callSid}" timeout="30">
    <Number>${transferNumber}</Number>
  </Dial>
  <Say voice="Polly.Matthew">It seems they're unavailable right now. Let me take a message.</Say>
  <Record action="/api/twilio/voicemail?callSid=${callSid}" maxLength="120" playBeep="true"/>
</Response>`
    activeConversations.delete(callSid)
    return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
  }

  if (result.action === 'schedule_callback' || result.action === 'schedule_meeting') {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">${escapeXml(result.response)}</Say>
  <Say voice="Polly.Matthew">Let me take down the best time for us to reconnect. After the beep, please say your preferred date and time.</Say>
  <Record action="/api/twilio/schedule-callback?callSid=${callSid}&agentId=${agentId}&leadId=${leadId}"
          maxLength="60" playBeep="true"/>
</Response>`
    activeConversations.delete(callSid)
    return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
  }

  if (result.action === 'leave_voicemail' || result.action === 'end_call') {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">${escapeXml(result.response)}</Say>
  <Hangup/>
</Response>`
    activeConversations.delete(callSid)
    return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
  }

  // Continue conversation
  return gatherResponse(
    result.response,
    agentId, leadId, campaignId, callSid
  )
}

function gatherResponse(
  message: string, agentId: string, leadId: string | null,
  campaignId: string | null, callSid: string
): NextResponse {
  const params = `agentId=${agentId}&leadId=${leadId || ''}&campaignId=${campaignId || ''}&callSid=${callSid}`
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">${escapeXml(message)}</Say>
  <Gather input="speech" action="/api/twilio/gather?${params}"
          speechTimeout="auto" speechModel="phone_call" language="en-US" enhanced="true">
  </Gather>
  <Say voice="Polly.Matthew">Are you still there?</Say>
  <Redirect>/api/twilio/gather?${params}&amp;retry=true</Redirect>
</Response>`
  return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
}

function errorResponse(message: string): NextResponse {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response><Say voice="Polly.Matthew">${escapeXml(message)}</Say><Hangup/></Response>`
  return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
