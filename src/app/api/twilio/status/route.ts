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

  await twilioService.handleStatusUpdate({
    callSid,
    callStatus,
    duration,
    recordingUrl
  })

  // If call completed, sync to CRM
  if (callStatus === 'completed') {
    const callLog = await prisma.callLog.findUnique({
      where: { twilioCallSid: callSid },
      select: { id: true, organizationId: true }
    })
    if (callLog) {
      try {
        await crmSyncService.pushCallToCrm(callLog.organizationId, callLog.id)
      } catch (error) {
        console.error('CRM sync error:', error)
      }
    }
  }

  return new NextResponse('OK')
}
