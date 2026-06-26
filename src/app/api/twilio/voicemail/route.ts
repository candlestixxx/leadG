import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const callSid = formData.get('CallSid') as string
  const recordingUrl = formData.get('RecordingUrl') as string

  if (callSid && recordingUrl) {
    try {
        await prisma.callLog.update({
        where: { twilioCallSid: callSid },
        data: {
            voicemailLeft: true,
            voicemailUrl: recordingUrl,
            status: 'COMPLETED'
        }
        })
    } catch (error) {
        console.error("Failed to save voicemail URL", error);
    }
  }

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">Thank you for your message. We will get back to you soon. Goodbye.</Say>
  <Hangup/>
</Response>`
  return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
}
