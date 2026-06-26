import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { campaignEngine } from '@/lib/campaigns/campaign-engine'

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate Request
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]

    // In a real application, you would lookup the integration record using this token to find the org.
    // For this pilot, we assume a single valid webhook setup.
    const integration = await prisma.integration.findFirst({
      where: {
        type: 'WEBHOOK',
        isActive: true,
      }
    })

    if (!integration) {
        return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    // 2. Parse Lead Data
    const payload = await req.json()

    // Minimal validation
    if (!payload.phone || !payload.firstName) {
        return NextResponse.json({ error: 'Missing required lead fields (phone, firstName)' }, { status: 400 })
    }

    // 3. Upsert Lead
    const lead = await prisma.lead.upsert({
      where: {
        organizationId_phone: {
          organizationId: integration.organizationId,
          phone: payload.phone
        }
      },
      update: {
        firstName: payload.firstName,
        lastName: payload.lastName || '',
        email: payload.email,
        company: payload.company,
        status: 'NEW'
      },
      create: {
        organizationId: integration.organizationId,
        firstName: payload.firstName,
        lastName: payload.lastName || '',
        email: payload.email,
        phone: payload.phone,
        company: payload.company,
        status: 'NEW',
        source: payload.source || 'Webhook CRM'
      }
    })

    // 4. Optionally, add to an active campaign if specified in payload
    if (payload.campaignId) {
       await campaignEngine.addLeadToCampaign(payload.campaignId, lead.id)
    }

    return NextResponse.json({ status: 'success', leadId: lead.id })

  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 })
  }
}
