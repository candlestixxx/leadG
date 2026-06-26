import { prisma } from '@/lib/db/prisma'
import axios from 'axios'

// ─── CRM Connector: Universal Integration Layer ─────────────

export interface CrmLead {
  externalId: string
  firstName: string
  lastName: string
  email?: string
  phone: string
  company?: string
  title?: string
  customFields?: Record<string, any>
}

export interface CrmConnector {
  name: string
  authenticate(credentials: Record<string, string>): Promise<boolean>
  fetchLeads(options?: { limit?: number; offset?: number; filters?: any }): Promise<CrmLead[]>
  pushLead(lead: CrmLead): Promise<string> // returns external ID
  updateLead(externalId: string, data: Partial<CrmLead>): Promise<void>
  pushActivity(externalId: string, activity: {
    type: string
    subject: string
    description: string
    timestamp: Date
    outcome?: string
  }): Promise<void>
}

// ─── HubSpot Connector ──────────────────────────────────────

export class HubSpotConnector implements CrmConnector {
  name = 'hubspot'
  private apiKey: string = ''
  private baseUrl = 'https://api.hubapi.com'

  async authenticate(credentials: Record<string, string>): Promise<boolean> {
    this.apiKey = credentials.apiKey
    try {
      await axios.get(`${this.baseUrl}/crm/v3/objects/contacts?limit=1`, {
        headers: { Authorization: `Bearer ${this.apiKey}` }
      })
      return true
    } catch {
      return false
    }
  }

  async fetchLeads(options?: any): Promise<CrmLead[]> {
    const response = await axios.get(`${this.baseUrl}/crm/v3/objects/contacts`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
      params: {
        limit: options?.limit || 100,
        after: options?.offset,
        properties: 'firstname,lastname,email,phone,company,jobtitle'
      }
    })

    return response.data.results.map((contact: any) => ({
      externalId: contact.id,
      firstName: contact.properties.firstname || '',
      lastName: contact.properties.lastname || '',
      email: contact.properties.email,
      phone: contact.properties.phone || '',
      company: contact.properties.company,
      title: contact.properties.jobtitle
    }))
  }

  async pushLead(lead: CrmLead): Promise<string> {
    const response = await axios.post(`${this.baseUrl}/crm/v3/objects/contacts`, {
      properties: {
        firstname: lead.firstName,
        lastname: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        jobtitle: lead.title
      }
    }, {
      headers: { Authorization: `Bearer ${this.apiKey}` }
    })
    return response.data.id
  }

  async updateLead(externalId: string, data: Partial<CrmLead>): Promise<void> {
    const properties: Record<string, any> = {}
    if (data.firstName) properties.firstname = data.firstName
    if (data.lastName) properties.lastname = data.lastName
    if (data.email) properties.email = data.email
    if (data.phone) properties.phone = data.phone
    if (data.company) properties.company = data.company
    if (data.title) properties.jobtitle = data.title

    await axios.patch(`${this.baseUrl}/crm/v3/objects/contacts/${externalId}`, {
      properties
    }, {
      headers: { Authorization: `Bearer ${this.apiKey}` }
    })
  }

  async pushActivity(externalId: string, activity: any): Promise<void> {
    await axios.post(`${this.baseUrl}/crm/v3/objects/calls`, {
      properties: {
        hs_call_title: activity.subject,
        hs_call_body: activity.description,
        hs_call_duration: activity.duration || 0,
        hs_call_status: activity.outcome || 'COMPLETED',
        hs_call_start_time: activity.timestamp.toISOString(),
        hs_call_to_number: activity.toNumber,
        hs_call_from_number: activity.fromNumber
      },
      associations: [{
        to: { id: externalId },
        types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 194 }]
      }]
    }, {
      headers: { Authorization: `Bearer ${this.apiKey}` }
    })
  }
}

// ─── Salesforce Connector ───────────────────────────────────

export class SalesforceConnector implements CrmConnector {
  name = 'salesforce'
  private accessToken: string = ''
  private instanceUrl: string = ''

  async authenticate(credentials: Record<string, string>): Promise<boolean> {
    try {
      const response = await axios.post(
        `https://login.salesforce.com/services/oauth2/token`,
        null,
        {
          params: {
            grant_type: 'password',
            client_id: credentials.clientId,
            client_secret: credentials.clientSecret,
            username: credentials.username,
            password: credentials.password + (credentials.securityToken || '')
          }
        }
      )
      this.accessToken = response.data.access_token
      this.instanceUrl = response.data.instance_url
      return true
    } catch {
      return false
    }
  }

  async fetchLeads(options?: any): Promise<CrmLead[]> {
    const query = `SELECT Id, FirstName, LastName, Email, Phone, Company, Title
                   FROM Lead
                   ORDER BY CreatedDate DESC
                   LIMIT ${options?.limit || 200}`

    const response = await axios.get(
      `${this.instanceUrl}/services/data/v58.0/query`,
      {
        headers: { Authorization: `Bearer ${this.accessToken}` },
        params: { q: query }
      }
    )

    return response.data.records.map((lead: any) => ({
      externalId: lead.Id,
      firstName: lead.FirstName || '',
      lastName: lead.LastName || '',
      email: lead.Email,
      phone: lead.Phone || '',
      company: lead.Company,
      title: lead.Title
    }))
  }

  async pushLead(lead: CrmLead): Promise<string> {
    const response = await axios.post(
      `${this.instanceUrl}/services/data/v58.0/sobjects/Lead`,
      {
        FirstName: lead.firstName,
        LastName: lead.lastName,
        Email: lead.email,
        Phone: lead.phone,
        Company: lead.company,
        Title: lead.title
      },
      { headers: { Authorization: `Bearer ${this.accessToken}` } }
    )
    return response.data.id
  }

  async updateLead(externalId: string, data: Partial<CrmLead>): Promise<void> {
    await axios.patch(
      `${this.instanceUrl}/services/data/v58.0/sobjects/Lead/${externalId}`,
      {
        ...(data.firstName && { FirstName: data.firstName }),
        ...(data.lastName && { LastName: data.lastName }),
        ...(data.email && { Email: data.email }),
        ...(data.phone && { Phone: data.phone }),
        ...(data.company && { Company: data.company })
      },
      { headers: { Authorization: `Bearer ${this.accessToken}` } }
    )
  }

  async pushActivity(externalId: string, activity: any): Promise<void> {
    await axios.post(
      `${this.instanceUrl}/services/data/v58.0/sobjects/Task`,
      {
        WhoId: externalId,
        Subject: activity.subject,
        Description: activity.description,
        TaskSubtype: 'Call',
        Status: 'Completed',
        ActivityDate: activity.timestamp.toISOString().split('T')[0]
      },
      { headers: { Authorization: `Bearer ${this.accessToken}` } }
    )
  }
}

// ─── GoHighLevel Connector ──────────────────────────────────

export class GoHighLevelConnector implements CrmConnector {
  name = 'gohighlevel'
  private apiKey: string = ''
  private locationId: string = ''
  private baseUrl = 'https://services.leadconnectorhq.com'

  async authenticate(credentials: Record<string, string>): Promise<boolean> {
    this.apiKey = credentials.apiKey
    this.locationId = credentials.locationId
    try {
      await axios.get(`${this.baseUrl}/contacts/`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Version: '2021-07-28'
        },
        params: { locationId: this.locationId, limit: 1 }
      })
      return true
    } catch {
      return false
    }
  }

  async fetchLeads(options?: any): Promise<CrmLead[]> {
    const response = await axios.get(`${this.baseUrl}/contacts/`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Version: '2021-07-28'
      },
      params: {
        locationId: this.locationId,
        limit: options?.limit || 100,
        startAfterId: options?.offset
      }
    })

    return (response.data.contacts || []).map((contact: any) => ({
      externalId: contact.id,
      firstName: contact.firstName || '',
      lastName: contact.lastName || '',
      email: contact.email,
      phone: contact.phone || '',
      company: contact.companyName,
      customFields: contact.customField
    }))
  }

  async pushLead(lead: CrmLead): Promise<string> {
    const response = await axios.post(`${this.baseUrl}/contacts/`, {
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      companyName: lead.company,
      locationId: this.locationId
    }, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Version: '2021-07-28'
      }
    })
    return response.data.contact.id
  }

  async updateLead(externalId: string, data: Partial<CrmLead>): Promise<void> {
    await axios.put(`${this.baseUrl}/contacts/${externalId}`, {
      ...(data.firstName && { firstName: data.firstName }),
      ...(data.lastName && { lastName: data.lastName }),
      ...(data.email && { email: data.email }),
      ...(data.phone && { phone: data.phone })
    }, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Version: '2021-07-28'
      }
    })
  }

  async pushActivity(externalId: string, activity: any): Promise<void> {
    await axios.post(`${this.baseUrl}/contacts/${externalId}/notes`, {
      body: `[${activity.type}] ${activity.subject}\n\n${activity.description}`,
      locationId: this.locationId
    }, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Version: '2021-07-28'
      }
    })
  }
}

// ─── Webhook Connector (Custom CRM) ────────────────────────

export class WebhookConnector implements CrmConnector {
  name = 'webhook'
  private webhookUrl: string = ''
  private headers: Record<string, string> = {}

  async authenticate(credentials: Record<string, string>): Promise<boolean> {
    this.webhookUrl = credentials.webhookUrl
    this.headers = credentials.headers ? JSON.parse(credentials.headers) : {}
    return true
  }

  async fetchLeads(): Promise<CrmLead[]> { return [] }
  async pushLead(lead: CrmLead): Promise<string> { return '' }
  async updateLead(): Promise<void> {}

  async pushActivity(externalId: string, activity: any): Promise<void> {
    await axios.post(this.webhookUrl, {
      event: 'call_activity',
      externalId,
      activity
    }, { headers: this.headers })
  }
}

// ─── CRM Connector Factory ─────────────────────────────────

export function createCrmConnector(type: string): CrmConnector {
  switch (type) {
    case 'hubspot': return new HubSpotConnector()
    case 'salesforce': return new SalesforceConnector()
    case 'gohighlevel': return new GoHighLevelConnector()
    case 'webhook': return new WebhookConnector()
    default: throw new Error(`Unsupported CRM type: ${type}`)
  }
}

// ─── Sync Service ───────────────────────────────────────────

export class CrmSyncService {
  async syncLeadsToCrm(organizationId: string): Promise<void> {
    const integration = await prisma.integration.findFirst({
      where: { organizationId, isActive: true, type: { in: ['HUBSPOT', 'SALESFORCE', 'GOHIGHLEVEL'] } }
    })

    if (!integration) return

    const connector = createCrmConnector(integration.type.toLowerCase())
    await connector.authenticate(integration.credentials as Record<string, string>)

    // Fetch leads from CRM and sync to VoiceForge
    const crmLeads = await connector.fetchLeads({ limit: 500 })

    for (const crmLead of crmLeads) {
      await prisma.lead.upsert({
        where: {
          organizationId_phone: {
            organizationId,
            phone: crmLead.phone
          }
        },
        create: {
          organizationId,
          firstName: crmLead.firstName,
          lastName: crmLead.lastName,
          email: crmLead.email,
          phone: crmLead.phone,
          company: crmLead.company,
          title: crmLead.title,
          externalId: crmLead.externalId,
          crmType: integration.type,
          lastSyncedAt: new Date(),
          customFields: crmLead.customFields || {}
        },
        update: {
          firstName: crmLead.firstName,
          lastName: crmLead.lastName,
          email: crmLead.email,
          company: crmLead.company,
          title: crmLead.title,
          lastSyncedAt: new Date()
        }
      })
    }

    await prisma.integration.update({
      where: { id: integration.id },
      data: { lastSyncAt: new Date() }
    })
  }

  async pushCallToCrm(organizationId: string, callLogId: string): Promise<void> {
    const integration = await prisma.integration.findFirst({
      where: { organizationId, isActive: true }
    })
    if (!integration) return

    const connector = createCrmConnector(integration.type.toLowerCase())
    await connector.authenticate(integration.credentials as Record<string, string>)

    const callLog = await prisma.callLog.findUnique({
      where: { id: callLogId },
      include: { lead: true }
    })
    if (!callLog?.lead?.externalId) return

    await connector.pushActivity(callLog.lead.externalId, {
      type: 'call',
      subject: `${callLog.direction} Call - ${callLog.outcome || 'Completed'}`,
      description: callLog.summary || callLog.transcript?.substring(0, 500) || '',
      timestamp: callLog.startedAt,
      outcome: callLog.outcome || undefined
    })
  }
}

export const crmSyncService = new CrmSyncService()
