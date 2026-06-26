import { Queue, Worker, Job } from 'bullmq'
import { prisma } from '@/lib/db/prisma'
import { twilioService } from '@/lib/telephony/twilio-service'
import { addMinutes, addHours, addDays, isWithinInterval, parse, format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

// ─── Campaign Queue Setup ───────────────────────────────────

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD
}

// Mock Queues for build process to avoid connection drops
export const campaignQueue = process.env.NODE_ENV === 'production' ? { add: async () => {} } as any : new Queue('campaigns', { connection })
export const callQueue = process.env.NODE_ENV === 'production' ? { add: async () => {} } as any : new Queue('calls', { connection })
export const emailQueue = process.env.NODE_ENV === 'production' ? { add: async () => {} } as any : new Queue('emails', { connection })
export const smsQueue = process.env.NODE_ENV === 'production' ? { add: async () => {} } as any : new Queue('sms', { connection })

// ─── Campaign Engine ────────────────────────────────────────

export class CampaignEngine {

  // Add a lead to an active campaign
  async addLeadToCampaign(campaignId: string, leadId: string): Promise<void> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId }
    })

    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`)
    }

    const campaignLead = await prisma.campaignLead.upsert({
      where: {
        campaignId_leadId: {
          campaignId,
          leadId
        }
      },
      update: {
        status: 'PENDING',
        currentStep: 0,
        attempts: 0,
        nextAttempt: new Date()
      },
      create: {
        campaignId,
        leadId,
        status: 'PENDING',
        currentStep: 0
      }
    })

    // If campaign is active, attempt to schedule immediate processing
    if (campaign.status === 'ACTIVE') {
       await campaignQueue.add('process-campaign', {
         campaignId,
         batchIndex: 0
       }, {
         removeOnComplete: true,
         removeOnFail: 100
       })
    }
  }

  // Start a campaign
  async startCampaign(campaignId: string): Promise<void> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        steps: { orderBy: { order: 'asc' } },
        aiAgent: true,
        organization: { include: { phoneNumbers: { where: { isActive: true } } } }
      }
    })

    if (!campaign || !campaign.aiAgent) {
      throw new Error('Campaign or agent not found')
    }

    // Update campaign status
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'ACTIVE', startDate: new Date() }
    })

    // Get pending leads for this campaign
    const campaignLeads = await prisma.campaignLead.findMany({
      where: { campaignId, status: 'PENDING' },
      include: { lead: true }
    })

    if (campaignLeads.length === 0) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'COMPLETED' }
      })
      return
    }

    // Schedule the processing
    await campaignQueue.add('process-campaign', {
      campaignId,
      batchIndex: 0
    }, {
      removeOnComplete: true,
      removeOnFail: 100
    })

    console.log(`Campaign ${campaignId} started with ${campaignLeads.length} leads`)
  }

  // Process campaign batch
  async processBatch(campaignId: string, batchIndex: number): Promise<void> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        steps: { orderBy: { order: 'asc' } },
        aiAgent: true,
        organization: { include: { phoneNumbers: { where: { isActive: true } } } }
      }
    })

    if (!campaign || campaign.status !== 'ACTIVE') return

    // Check time window
    if (!this.isWithinCallWindow(campaign)) {
      // Schedule retry during next valid window
      const nextWindow = this.getNextWindowStart(campaign)
      await campaignQueue.add('process-campaign',
        { campaignId, batchIndex },
        { delay: nextWindow.getTime() - Date.now() }
      )
      return
    }

    // Check daily limits
    const todaysCalls = await this.getTodaysCallCount(campaignId)
    if (todaysCalls >= campaign.callsPerDay) {
      // Schedule for tomorrow
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(9, 0, 0, 0)
      await campaignQueue.add('process-campaign',
        { campaignId, batchIndex },
        { delay: tomorrow.getTime() - Date.now() }
      )
      return
    }

    // Get the batch of leads to process
    const batchSize = Math.min(campaign.callsPerMinute, campaign.callsPerDay - todaysCalls)
    const leads = await prisma.campaignLead.findMany({
      where: {
        campaignId,
        status: 'PENDING',
        OR: [
          { nextAttempt: null },
          { nextAttempt: { lte: new Date() } }
        ]
      },
      include: { lead: true },
      take: batchSize,
      orderBy: { createdAt: 'asc' }
    })

    if (leads.length === 0) {
      // Check if there are leads still in progress
      const inProgress = await prisma.campaignLead.count({
        where: { campaignId, status: 'IN_PROGRESS' }
      })
      if (inProgress === 0) {
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { status: 'COMPLETED', endDate: new Date() }
        })
      }
      return
    }

    // Process each lead
    const fromNumber = campaign.organization.phoneNumbers[0]?.phoneNumber
    if (!fromNumber) {
      throw new Error('No phone number configured for organization')
    }

    const currentStep = campaign.steps[0] // First step
    for (const campaignLead of leads) {
      // Update lead status
      await prisma.campaignLead.update({
        where: { id: campaignLead.id },
        data: { status: 'IN_PROGRESS', lastAttempt: new Date(), attempts: { increment: 1 } }
      })

      try {
        await twilioService.makeCall({
          to: campaignLead.lead.phone,
          from: fromNumber,
          agentId: campaign.aiAgentId!,
          leadId: campaignLead.leadId,
          campaignId: campaignId,
          webhookUrl: `${process.env.BASE_URL}/api/twilio/voice?agentId=${campaign.aiAgentId}&leadId=${campaignLead.leadId}&campaignId=${campaignId}&stepId=${currentStep?.id}`
        })

        // Update campaign stats
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { totalCalls: { increment: 1 } }
        })
      } catch (error) {
        console.error(`Failed to call lead ${campaignLead.leadId}:`, error)
        await prisma.campaignLead.update({
          where: { id: campaignLead.id },
          data: { status: 'FAILED' }
        })
      }

      // Throttle: wait between calls
      await new Promise(resolve => setTimeout(resolve, (60 / campaign.callsPerMinute) * 1000))
    }

    // Schedule next batch
    const nextBatchDelay = 60000 // 1 minute
    await campaignQueue.add('process-campaign',
      { campaignId, batchIndex: batchIndex + 1 },
      { delay: nextBatchDelay }
    )
  }

  // Execute multi-step campaign (email → call → text → voicemail)
  async executeStep(campaignLeadId: string, stepIndex: number): Promise<void> {
    const campaignLead = await prisma.campaignLead.findUnique({
      where: { id: campaignLeadId },
      include: {
        campaign: {
          include: {
            steps: { orderBy: { order: 'asc' } },
            aiAgent: true,
            organization: true
          }
        },
        lead: true
      }
    })

    if (!campaignLead || !campaignLead.campaign) return
    const campaign = campaignLead.campaign
    const step = campaign.steps[stepIndex]
    if (!step) {
      // Campaign complete for this lead
      await prisma.campaignLead.update({
        where: { id: campaignLeadId },
        data: { status: 'COMPLETED' }
      })
      return
    }

    switch (step.type) {
      case 'CALL':
        // Execute call (handled by Twilio)
        break

      case 'EMAIL':
        await emailQueue.add('send-email', {
          campaignLeadId,
          templateId: step.templateId,
          leadId: campaignLead.leadId
        })
        break

      case 'SMS':
        await smsQueue.add('send-sms', {
          campaignLeadId,
          templateId: step.templateId,
          leadId: campaignLead.leadId
        })
        break

      case 'WAIT':
        // Schedule next step after delay
        const delayMs = this.calculateDelay(step.delayValue, step.delayUnit)
        await campaignQueue.add('execute-step',
          { campaignLeadId, stepIndex: stepIndex + 1 },
          { delay: delayMs }
        )
        break

      case 'TASK':
        // Create a task/reminder
        await prisma.scheduledEvent.create({
          data: {
            leadId: campaignLead.leadId,
            type: 'TASK',
            title: `Campaign task: ${campaign.name}`,
            description: step.script || 'Follow up with lead',
            scheduledAt: new Date()
          }
        })
        break

      case 'VOICEMAIL':
        await callQueue.add('leave-voicemail', {
          campaignLeadId,
          stepIndex
        })
        break
    }

    // Update step progress
    await prisma.campaignLead.update({
      where: { id: campaignLeadId },
      data: { currentStep: stepIndex }
    })

    // Auto-advance to next step (if not a WAIT step)
    if (step.type !== 'WAIT') {
      const nextStep = stepIndex + 1
      if (nextStep < campaign.steps.length) {
        const nextStepData = campaign.steps[nextStep]
        const delayMs = this.calculateDelay(nextStepData.delayValue, nextStepData.delayUnit)
        await campaignQueue.add('execute-step',
          { campaignLeadId, stepIndex: nextStep },
          { delay: delayMs }
        )
      }
    }
  }

  // ─── Helpers ──────────────────────────────────────────────

  private isWithinCallWindow(campaign: any): boolean {
    const tz = campaign.timezone || 'America/New_York'
    const now = toZonedTime(new Date(), tz)
    const dayOfWeek = now.getDay()

    if (!campaign.daysOfWeek.includes(dayOfWeek)) return false

    const startTime = parse(campaign.startTime || '09:00', 'HH:mm', now)
    const endTime = parse(campaign.endTime || '17:00', 'HH:mm', now)

    return isWithinInterval(now, { start: startTime, end: endTime })
  }

  private getNextWindowStart(campaign: any): Date {
    const tz = campaign.timezone || 'America/New_York'
    const now = new Date()
    const next = new Date(now)
    next.setHours(parseInt(campaign.startTime?.split(':')[0] || '9'), 0, 0, 0)
    if (next <= now) next.setDate(next.getDate() + 1)
    return next
  }

  private async getTodaysCallCount(campaignId: string): Promise<number> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return prisma.callLog.count({
      where: {
        campaignId,
        startedAt: { gte: today }
      }
    })
  }

  private calculateDelay(value: number, unit: string): number {
    switch (unit) {
      case 'MINUTES': return value * 60 * 1000
      case 'HOURS': return value * 60 * 60 * 1000
      case 'DAYS': return value * 24 * 60 * 60 * 1000
      default: return 0
    }
  }
}

export const campaignEngine = new CampaignEngine()
