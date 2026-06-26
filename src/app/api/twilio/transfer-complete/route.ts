import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const callSid = formData.get('CallSid') as string
  const dialCallStatus = formData.get('DialCallStatus') as string

  if (dialCallStatus !== 'completed' && dialCallStatus !== 'answered') {
     const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">I'm sorry, no one is available to take your call at the moment. Please leave a message after the tone.</Say>
  <Record action="/api/twilio/voicemail?callSid=${callSid}" maxLength="120" playBeep="true"/>
</Response>`
      return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
  }

  // If connected, end smoothly
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Hangup/>
</Response>`
  return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
}
