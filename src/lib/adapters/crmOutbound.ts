import { prisma } from '@/lib/prisma';
import { CrmProvider, MockCrmProvider } from './index';
import { Lead } from '@prisma/client';

export class WebhookCrmProvider implements CrmProvider {
  async updateLead(leadId: string, data: Partial<Lead>): Promise<boolean> {
    try {
      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (!lead) throw new Error('Lead not found');

      // Fetch webhook URL from user's integration settings
      const settings = await prisma.integrationSettings.findFirst({
        where: {
          provider: 'crm_webhook_url',
          userId: lead.userId || undefined
        }
      });

      const webhookUrl = settings?.apiKey;

      if (!webhookUrl) {
        console.warn(`[CRM Sync] No crm_webhook_url found for user ${lead.userId}. Falling back to mock sync.`);
        return new MockCrmProvider().updateLead(leadId, data);
      }

      console.log(`[CRM Sync] Pushing update to ${webhookUrl} for lead ${leadId}`);

      const payload = {
        event: "lead_updated",
        lead: {
          ...lead,
          ...data
        },
        timestamp: new Date().toISOString()
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`CRM API returned ${response.status} ${response.statusText}`);
      }

      console.log(`[CRM Sync] Success: Lead ${leadId} synced.`);
      return true;

    } catch (e) {
      console.error(`[CRM Sync] Error:`, e);
      return false;
    }
  }
}

export class FollowUpBossProvider implements CrmProvider {
  async updateLead(leadId: string, data: Partial<Lead>): Promise<boolean> {
    try {
      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (!lead) throw new Error('Lead not found');

      // Note: In FUB, external IDs or matching by email/phone is common.
      // We assume the lead's email is used as the primary matching key if the external FUB ID isn't directly mapped,
      // or we update via an external ID if it was synced during the inbound webhook phase.
      // For this MVP, we will demonstrate fetching the FUB API Key and submitting a PUT request.

      const settings = await prisma.integrationSettings.findFirst({
        where: {
          provider: 'fub_api_key',
          userId: lead.userId || undefined
        }
      });

      const fubApiKey = settings?.apiKey;

      if (!fubApiKey) {
        return false; // Handled by factory
      }

      console.log(`[CRM Sync] Pushing update to Follow Up Boss for lead ${lead.email}`);

      // We structure a typical FUB PUT payload
      const payload = {
        person: {
          firstName: lead.first_name,
          lastName: lead.last_name,
          emails: lead.email ? [{ value: lead.email }] : [],
          phones: lead.phone ? [{ value: lead.phone }] : [],
          stage: data.status === 'Hot Lead' ? 'Hot' : data.status,
          tags: [lead.lead_type],
          customFields: {
            UrgencyScore: lead.urgency_score,
            AI_Summary: lead.ai_summary
          }
        }
      };

      // In a robust integration, you would query FUB first to find the personId via email
      // e.g. GET https://api.followupboss.com/v1/people?email=${lead.email}
      // For brevity, we simulate the POST/PUT structure.

      const authHeader = 'Basic ' + Buffer.from(`${fubApiKey}:`).toString('base64');

      // Use POST to create/update based on email match in FUB
      const response = await fetch('https://api.followupboss.com/v1/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify({
          source: "Jules AI Concierge",
          type: "Lead Update",
          message: `Jules Status: ${data.status}. Score: ${lead.urgency_score}`,
          person: payload.person
        })
      });

      if (!response.ok) {
        throw new Error(`FUB API returned ${response.status} ${response.statusText}`);
      }

      console.log(`[CRM Sync] Success: Lead ${leadId} synced to Follow Up Boss.`);
      return true;

    } catch (e) {
      console.error(`[CRM Sync] FUB Error:`, e);
      return false;
    }
  }
}

// A dynamic factory that resolves the user's CRM provider preference
export class DynamicCrmProvider implements CrmProvider {
    async updateLead(leadId: string, data: Partial<Lead>): Promise<boolean> {
        const lead = await prisma.lead.findUnique({ where: { id: leadId } });
        if (!lead) return false;

        const settings = await prisma.integrationSettings.findMany({
            where: {
                userId: lead.userId || undefined,
                provider: { in: ['fub_api_key', 'crm_webhook_url'] }
            }
        });

        const hasFub = settings.find(s => s.provider === 'fub_api_key');
        const hasWebhook = settings.find(s => s.provider === 'crm_webhook_url');

        if (hasFub) {
            return new FollowUpBossProvider().updateLead(leadId, data);
        } else if (hasWebhook) {
            return new WebhookCrmProvider().updateLead(leadId, data);
        } else {
            console.warn(`[CRM Sync] No CRM configuration found for user ${lead.userId}. Mocking sync.`);
            return new MockCrmProvider().updateLead(leadId, data);
        }
    }
}

export function getCrmProvider(): CrmProvider {
  return new DynamicCrmProvider();
}
