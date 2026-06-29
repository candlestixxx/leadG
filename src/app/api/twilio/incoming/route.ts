import { NextRequest, NextResponse } from 'next/server'
import { twilioService } from '@/lib/telephony/twilio-service'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const callSid = formData.get('CallSid') as string
  const from = formData.get('From') as string
  const to = formData.get('To') as string

  try {
    const twiml = await twilioService.handleIncomingCall(callSid, from, to)
    return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
  } catch (error) {
    console.error('Error handling incoming call:', error)
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Say>An error occurred.</Say><Hangup/></Response>',
      { headers: { 'Content-Type': 'text/xml' } }
    )
  }
}
