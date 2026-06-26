import { NextRequest } from 'next/server'
import { POST } from '@/app/api/webhooks/crm/route'
import { prisma } from '@/lib/db/prisma'
import { campaignEngine } from '@/lib/campaigns/campaign-engine'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    integration: {
      findFirst: jest.fn(),
    },
    lead: {
      upsert: jest.fn(),
    },
  },
}))

jest.mock('@/lib/campaigns/campaign-engine', () => ({
  campaignEngine: {
    addLeadToCampaign: jest.fn(),
  },
}))

describe('CRM Webhook API Route', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 if unauthorized', async () => {
    const req = new NextRequest('http://localhost/api/webhooks/crm', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('should return 404 if integration is not found', async () => {
    (prisma.integration.findFirst as jest.Mock).mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/webhooks/crm', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer dummy-token',
      },
      body: JSON.stringify({}),
    })

    const res = await POST(req)
    expect(res.status).toBe(404)
  })

  it('should return 400 if required fields are missing', async () => {
    (prisma.integration.findFirst as jest.Mock).mockResolvedValue({ id: 'org-1' })

    const req = new NextRequest('http://localhost/api/webhooks/crm', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer dummy-token',
      },
      body: JSON.stringify({ firstName: 'John' }), // Missing phone
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('should upsert lead and add to campaign if campaignId is provided', async () => {
    (prisma.integration.findFirst as jest.Mock).mockResolvedValue({ organizationId: 'org-1' })
    ;(prisma.lead.upsert as jest.Mock).mockResolvedValue({ id: 'lead-1' })

    const req = new NextRequest('http://localhost/api/webhooks/crm', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer dummy-token',
      },
      body: JSON.stringify({
        firstName: 'John',
        phone: '+1234567890',
        campaignId: 'campaign-1',
      }),
    })

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.status).toBe('success')
    expect(json.leadId).toBe('lead-1')

    expect(prisma.lead.upsert).toHaveBeenCalled()
    expect(campaignEngine.addLeadToCampaign).toHaveBeenCalledWith('campaign-1', 'lead-1')
  })
})
