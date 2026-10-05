import { NextRequest, NextResponse } from 'next/server'
import { twilioService } from '@/lib/telephony/twilio-service'
import { crmSyncService } from '@/lib/crm/crm-connector'
import { prisma } from '@/lib/db/prisma'

export async function POST(req: NextRequest) {
  const formData = await req.formData()

  const callSid = formData.get('CallSid') as string
  const callStatus = formData.get('CallStatus') as string
  const duration = formData.get('CallDuration') as string
  const recordingUrl = formData.get('RecordingUrl') as string

  if (!callSid || !callStatus) {
    return NextResponse.json({ error: 'CallSid and CallStatus are required' }, { status: 400 })
  }

  await twilioService.handleStatusUpdate({
    callSid,
    callStatus,
    duration,
    recordingUrl
  })

  // If call completed, sync to CRM and trigger reflection engine
  if (callStatus === 'completed') {
    const callLog = await prisma.callLog.findUnique({
      where: { twilioCallSid: callSid },
      select: {
        id: true, organizationId: true, leadId: true,
        direction: true, fromNumber: true, toNumber: true,
        duration: true, transcript: true, summary: true,
        sentiment: true, outcome: true,
      }
    })
    if (callLog) {
      try {
        await crmSyncService.pushCallToCrm(callLog.organizationId, callLog.id)
      } catch (error) {
        console.error('CRM sync error:', error)
      }

      // Send to main CRM activity timeline
      try {
        const { sendVoiceEventToCRM } = await import('@/lib/webhooks/crm-voice')
        // Look up lead contact info for matching
        const lead = callLog.leadId ? await prisma.lead.findUnique({
          where: { id: callLog.leadId },
          select: { email: true, phone: true }
        }) : null;

        sendVoiceEventToCRM({
          callId: callSid,
          direction: (callLog.direction as 'inbound' | 'outbound') || 'outbound',
          from: callLog.fromNumber || '',
          to: callLog.toNumber || '',
          status: callStatus,
          duration: callLog.duration || 0,
          transcript: callLog.transcript || undefined,
          summary: callLog.summary || undefined,
          sentiment: callLog.sentiment || undefined,
          outcome: callLog.outcome || undefined,
          leadEmail: lead?.email || undefined,
          leadPhone: lead?.phone || undefined,
        }).catch(console.error)
      } catch (error) {
        console.error('CRM voice webhook error:', error)
      }

      try {
        const { ReflectionEngine } = await import('@/lib/ai/reflection-engine')
        const OpenAI = (await import('openai')).default
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'dummy' })
        const reflection = new ReflectionEngine(openai)
        // Run asynchronously without blocking the webhook response
        reflection.analyzeCallTranscript(callLog.id).catch(console.error)
      } catch (error) {
        console.error('Reflection engine error:', error)
      }
    }
  }

  return new NextResponse('OK')
}
