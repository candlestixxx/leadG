import twilio from 'twilio'
import { prisma } from '@/lib/db/prisma'
import { ConversationEngine } from '@/lib/ai/conversation-engine'
import { VoicePipeline, VoiceConfig } from '@/lib/ai/voice-pipeline'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "dummy" })

export class TwilioService {
  private client: twilio.Twilio

  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    )
  }

  // ─── Outbound Call ────────────────────────────────────────

  async makeCall(params: {
    to: string
    from: string
    agentId: string
    leadId?: string
    campaignId?: string
    webhookUrl: string
  }): Promise<string> {
    const call = await this.client.calls.create({
      to: params.to,
      from: params.from,
      url: params.webhookUrl,
      statusCallback: `${process.env.BASE_URL}/api/twilio/status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST',
      record: true,
      machineDetection: 'DetectMessageEnd',
      machineDetectionTimeout: 30,
      timeout: 30
    })

    // Log the call
    await prisma.callLog.create({
      data: {
        organizationId: await this.getOrgId(params.agentId),
        twilioCallSid: call.sid,
        aiAgentId: params.agentId,
        leadId: params.leadId,
        direction: 'OUTBOUND',
        fromNumber: params.from,
        toNumber: params.to,
        status: 'QUEUED',
        campaignId: params.campaignId
      }
    })

    return call.sid
  }

  // ─── Handle Incoming Call Webhook ─────────────────────────

  async handleIncomingCall(callSid: string, from: string, to: string): Promise<string> {
    const twiml = new twilio.twiml.VoiceResponse()

    // Find the organization that owns this phone number
    const phoneNumber = await prisma.phoneNumber.findUnique({
      where: { phoneNumber: to },
      include: { organization: { include: { aiAgents: { where: { isActive: true } } } } }
    })

    if (!phoneNumber || !phoneNumber.organization.aiAgents[0]) {
      twiml.say('Sorry, this number is not currently in service.')
      return twiml.toString()
    }

    const agent = phoneNumber.organization.aiAgents[0]

    // Create call log
    await prisma.callLog.create({
      data: {
        organizationId: phoneNumber.organizationId,
        twilioCallSid: callSid,
        aiAgentId: agent.id,
        direction: 'INBOUND',
        fromNumber: from,
        toNumber: to,
        status: 'IN_PROGRESS',
        answeredAt: new Date()
      }
    })

    // Greet and start gathering input
    const connect = twiml.connect()
    const stream = connect.stream({
      url: `wss://${process.env.BASE_URL?.replace('https://', '')}/api/twilio/stream`
    })
    stream.parameter({ name: 'callSid', value: callSid })
    stream.parameter({ name: 'agentId', value: agent.id })

    return twiml.toString()
  }

  // ─── Handle Call Status Updates ───────────────────────────

  async handleStatusUpdate(params: {
    callSid: string
    callStatus: string
    duration?: string
    recordingUrl?: string
  }): Promise<void> {
    const statusMap: Record<string, string> = {
      'initiated': 'QUEUED',
      'ringing': 'RINGING',
      'in-progress': 'IN_PROGRESS',
      'completed': 'COMPLETED',
      'busy': 'BUSY',
      'no-answer': 'NO_ANSWER',
      'failed': 'FAILED',
      'canceled': 'FAILED'
    }

    const updateData: any = {
      status: statusMap[params.callStatus] || params.callStatus
    }

    if (params.callStatus === 'in-progress') {
      updateData.answeredAt = new Date()
    }

    if (params.callStatus === 'completed') {
      updateData.endedAt = new Date()
      updateData.duration = parseInt(params.duration || '0')
    }

    if (params.recordingUrl) {
      updateData.recordingUrl = params.recordingUrl
    }

    await prisma.callLog.update({
      where: { twilioCallSid: params.callSid },
      data: updateData
    })
  }

  // ─── Warm Transfer ────────────────────────────────────────

  async warmTransfer(callSid: string, transferTo: string, whisperMessage?: string): Promise<void> {
    const twiml = new twilio.twiml.VoiceResponse()

    if (whisperMessage) {
      twiml.say({ voice: 'Polly.Matthew' }, whisperMessage)
    }

    twiml.dial({ action: `${process.env.BASE_URL}/api/twilio/transfer-complete`, timeout: 30 }).number(transferTo)

    await this.client.calls(callSid).update({
      twiml: twiml.toString()
    })

    // Update call log
    await prisma.callLog.update({
      where: { twilioCallSid: callSid },
      data: {
        status: 'TRANSFERRED',
        transferredAt: new Date()
      }
    })
  }

  // ─── Leave Voicemail ──────────────────────────────────────

  async leaveVoicemail(callSid: string, audioUrl: string): Promise<void> {
    const twiml = new twilio.twiml.VoiceResponse()
    twiml.play(audioUrl)
    twiml.hangup()

    await this.client.calls(callSid).update({
      twiml: twiml.toString()
    })

    await prisma.callLog.update({
      where: { twilioCallSid: callSid },
      data: {
        voicemailLeft: true,
        voicemailUrl: audioUrl,
        status: 'COMPLETED'
      }
    })
  }

  // ─── Generate TwiML for Conversation ──────────────────────

  generateConversationTwiML(
    greeting: string,
    voiceConfig: VoiceConfig
  ): string {
    const twiml = new twilio.twiml.VoiceResponse()

    // Initial greeting
    twiml.say({ voice: 'Polly.Matthew' }, greeting)

    // Gather speech input
    const gather = twiml.gather({
      input: ['speech', 'dtmf'],
      action: `${process.env.BASE_URL}/api/twilio/gather`,
      method: 'POST',
      speechTimeout: "3",
      speechModel: 'phone_call',
      language: 'en-US',
      enhanced: true
    })

    // If no input, prompt again
    twiml.say({ voice: 'Polly.Matthew' }, 'Are you still there?')
    twiml.redirect(`${process.env.BASE_URL}/api/twilio/gather?retry=true`)

    return twiml.toString()
  }

  private async getOrgId(agentId: string): Promise<string> {
    const agent = await prisma.aiAgent.findUnique({
      where: { id: agentId },
      select: { organizationId: true }
    })
    return agent?.organizationId || ''
  }
}

export const twilioService = new TwilioService()
