'use server'

import { prisma } from '@/lib/db/prisma'
import { revalidatePath } from 'next/cache'

export async function getCampaigns() {
  if (process.env.npm_lifecycle_event === 'build') {
    return []
  }

  try {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        aiAgent: {
          select: { name: true }
        },
        _count: {
          select: { steps: true, campaignLeads: true }
        }
      }
    })
    return campaigns
  } catch (error) {
    console.error("Error fetching campaigns:", error)
    return []
  }
}

export async function getCampaign(id: string) {
  if (process.env.npm_lifecycle_event === 'build') {
    return null
  }

  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { order: 'asc' }
        },
        aiAgent: true
      }
    })
    return campaign
  } catch (error) {
    console.error(`Error fetching campaign ${id}:`, error)
    return null
  }
}

export async function toggleCampaignStatus(id: string, currentStatus: string) {
  try {
    const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    await prisma.campaign.update({
      where: { id },
      data: { status: newStatus as any }
    })
    revalidatePath('/campaigns')
    revalidatePath(`/campaigns/${id}`)
    return { success: true, status: newStatus }
  } catch (error) {
    console.error("Error toggling campaign status:", error)
    return { success: false, error: 'Failed to update status' }
  }
}

export async function updateCampaignSteps(campaignId: string, steps: any[]) {
  try {
    // Basic implementation: delete existing and recreate to preserve order
    // In production, an upsert approach matching IDs would be better to avoid losing step history.
    await prisma.$transaction(async (tx) => {
      await tx.campaignStep.deleteMany({
        where: { campaignId }
      })

      const newSteps = steps.map((step, index) => ({
        campaignId,
        order: index,
        type: step.type,
        delayValue: step.delayValue || 0,
        delayUnit: step.delayUnit || 'HOURS',
        script: step.script || null,
      }))

      if (newSteps.length > 0) {
        await tx.campaignStep.createMany({
          data: newSteps
        })
      }
    })

    revalidatePath(`/campaigns/${campaignId}`)
    return { success: true }
  } catch (error) {
    console.error("Error updating campaign steps:", error)
    return { success: false, error: 'Failed to update steps' }
  }
}
