import { prisma } from '@/lib/db/prisma'
import { campaignEngine } from '@/lib/campaigns/campaign-engine'
import { Lead } from '@prisma/client'

export class LeadRouter {
  /**
   * Evaluates routing rules to automatically assign a new or updated lead to an active campaign.
   */
  async routeLead(lead: Lead): Promise<void> {
    try {
      // Find all active campaigns for the organization
      const activeCampaigns = await prisma.campaign.findMany({
        where: {
          organizationId: lead.organizationId,
          status: 'ACTIVE'
        },
        orderBy: { createdAt: 'desc' }
      })

      if (activeCampaigns.length === 0) {
        console.log(`[LeadRouter] No active campaigns found for organization ${lead.organizationId}. Lead ${lead.id} remains unassigned.`)
        return
      }

      // Basic routing logic:
      // In a full production system, this would evaluate a JSON rules engine.
      // For the pilot, we'll route based on tags, source, or custom field 'need'.

      let assignedCampaignId: string | null = null

      const customFields = (lead.customFields as Record<string, any>) || {}

      for (const campaign of activeCampaigns) {
        // Example Rule 1: If lead source is "Pilot" or "Simulated", route to a Pilot campaign.
        if (lead.source?.toLowerCase().includes('pilot') || lead.source?.toLowerCase().includes('simulated')) {
            if (campaign.name.toLowerCase().includes('pilot')) {
                assignedCampaignId = campaign.id
                break
            }
        }

        // Example Rule 2: If the lead has a specific custom field (e.g. 'need' for cash offer)
        if (customFields['need'] && campaign.name.toLowerCase().includes('cash offer')) {
            assignedCampaignId = campaign.id
            break
        }
      }

      // Fallback: If no rules match, assign to the most recently created active campaign
      if (!assignedCampaignId && activeCampaigns.length > 0) {
          assignedCampaignId = activeCampaigns[0].id
      }

      if (assignedCampaignId) {
        await campaignEngine.addLeadToCampaign(assignedCampaignId, lead.id)
        console.log(`[LeadRouter] Successfully routed lead ${lead.id} to campaign ${assignedCampaignId}.`)
      }

    } catch (error) {
      console.error(`[LeadRouter] Error routing lead ${lead.id}:`, error)
    }
  }
}

export const leadRouter = new LeadRouter()
