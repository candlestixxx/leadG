import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import OpenAI from 'openai'
import { ConversationEngine } from '@/lib/ai/conversation-engine'

export async function POST(req: NextRequest) {
  const formData = await req.formData()

  const callSid = formData.get('CallSid') as string
  const from = formData.get('From') as string
  const to = formData.get('To') as string
  const speechResult = formData.get('SpeechResult') as string
  const callStatus = formData.get('CallStatus') as string

  const url = new URL(req.url)
  const agentId = url.searchParams.get('agentId')
  const leadId = url.searchParams.get('leadId')
  const campaignId = url.searchParams.get('campaignId')

  // Get agent configuration
  const agent = await prisma.aiAgent.findUnique({
    where: { id: agentId! }
  })

  if (!agent) {
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Configuration error.</Say><Hangup/></Response>',
      { headers: { 'Content-Type': 'text/xml' } }
    )
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  // Build context
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

  const context = {
    agentId: agent.id,
    leadId: leadId || undefined,
    campaignId: campaignId || undefined,
    callSid,
    direction: 'outbound' as const,
    leadInfo
  }

  const conversation = new ConversationEngine(openai, context)
  await conversation.initialize({
    name: agent.name,
    personality: agent.personality,
    systemPrompt: agent.systemPrompt,
    qualifyingQuestions: agent.qualifyingQuestions,
    objectionHandling: agent.objectionHandling
  })

  // If first call (no speech yet), deliver greeting
  if (!speechResult) {
    const greeting = leadInfo
      ? `Hi ${leadInfo.firstName}, this is ${agent.name}. How are you today?`
      : `Hi, this is ${agent.name}. How are you today?`

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">${escapeXml(greeting)}</Say>
  <Gather input="speech" action="/api/twilio/gather?agentId=${agentId}&leadId=${leadId}&campaignId=${campaignId}&callSid=${callSid}"
          speechTimeout="auto" speechModel="phone_call" language="en-US" enhanced="true">
  </Gather>
  <Say voice="Polly.Matthew">Are you still there?</Say>
  <Redirect>/api/twilio/gather?agentId=${agentId}&leadId=${leadId}&campaignId=${campaignId}&callSid=${callSid}&retry=true</Redirect>
</Response>`

    return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
  }

  // Process the speech through conversation engine
  const result = await conversation.processInput(speechResult)

  // Update call log with transcript
  await prisma.callLog.update({
    where: { twilioCallSid: callSid },
    data: {
      transcript: conversation.getTranscript()
        .map(m => `${m.role}: ${m.content}`)
        .join('\n'),
      sentiment: result.sentiment
    }
  })

  let twiml: string

  if (result.shouldTransfer || result.action === 'transfer') {
    // Warm transfer
    const transferNumber = process.env.TRANSFER_NUMBER || '+15551234567'
    twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">${escapeXml(result.response)}</Say>
  <Say voice="Polly.Matthew">Let me connect you with our team right away. One moment please.</Say>
  <Dial action="/api/twilio/transfer-complete?callSid=${callSid}" timeout="30">
    <Number>${transferNumber}</Number>
  </Dial>
</Response>`
  } else if (result.action === 'end_call') {
    twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">${escapeXml(result.response)}</Say>
  <Hangup/>
</Response>`
  } else if (result.action === 'leave_voicemail') {
    const voicemailScript = await conversation.generateVoicemailScript()
    twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">${escapeXml(voicemailScript)}</Say>
  <Hangup/>
</Response>`

    await prisma.callLog.update({
      where: { twilioCallSid: callSid },
      data: { voicemailLeft: true }
    })
  } else {
    // Continue conversation
    twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">${escapeXml(result.response)}</Say>
  <Gather input="speech" action="/api/twilio/gather?agentId=${agentId}&leadId=${leadId}&campaignId=${campaignId}&callSid=${callSid}"
          speechTimeout="auto" speechModel="phone_call" language="en-US" enhanced="true">
  </Gather>
  <Say voice="Polly.Matthew">I'm still here if you'd like to continue.</Say>
  <Redirect>/api/twilio/gather?agentId=${agentId}&leadId=${leadId}&campaignId=${campaignId}&callSid=${callSid}&retry=true</Redirect>
</Response>`
  }

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
