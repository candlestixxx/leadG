'use server'

import { prisma } from '@/lib/db/prisma'
import { revalidatePath } from 'next/cache'

export async function getLeads() {
  if (process.env.npm_lifecycle_event === 'build') {
    return []
  }

  try {
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        campaignLeads: {
          include: { campaign: { select: { name: true } } }
        },
        callLogs: {
          orderBy: { startedAt: 'desc' },
          take: 1,
          select: { outcome: true, startedAt: true }
        }
      },
      take: 50 // Limit for prototype dashboard
    })
    return leads
  } catch (error) {
    console.error("Error fetching leads:", error)
    return []
  }
}

export async function deleteLead(id: string) {
  try {
    await prisma.lead.delete({
      where: { id }
    })
    revalidatePath('/leads')
    return { success: true }
  } catch (error) {
    console.error(`Error deleting lead ${id}:`, error)
    return { success: false, error: 'Failed to delete lead' }
  }
}
