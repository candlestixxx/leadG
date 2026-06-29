import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const callSid = formData.get('CallSid') as string

  const url = new URL(req.url)
  const agentId = url.searchParams.get('agentId') || 'default'
  const leadId = url.searchParams.get('leadId') || ''
  const campaignId = url.searchParams.get('campaignId') || ''

  const host = req.headers.get('host') || process.env.BASE_URL?.replace(/^https?:\/\//, '') || 'localhost:3000'
  const wsUrl = `wss://${host}/api/twilio/stream`

  // Use Twilio Media Streams to pipe real-time audio to our WebSocket server
  // This enables low-latency AI voice interactions using ElevenLabs/Deepgram.
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${wsUrl}">
      <Parameter name="agentId" value="${agentId}" />
      <Parameter name="leadId" value="${leadId}" />
      <Parameter name="campaignId" value="${campaignId}" />
      <Parameter name="callSid" value="${callSid}" />
    </Stream>
  </Connect>
</Response>`

  return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
}
