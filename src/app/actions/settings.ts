'use server'

import { prisma } from '@/lib/db/prisma'
import { revalidatePath } from 'next/cache'

export async function getIntegrations() {
  if (process.env.npm_lifecycle_event === 'build') {
    return []
  }

  try {
    const integrations = await prisma.integration.findMany({
      orderBy: { type: 'asc' }
    })
    return integrations
  } catch (error) {
    console.error("Error fetching integrations:", error)
    return []
  }
}

export async function toggleIntegration(id: string, currentStatus: boolean) {
  try {
    await prisma.integration.update({
      where: { id },
      data: { isActive: !currentStatus }
    })
    revalidatePath('/settings')
    return { success: true }
  } catch (error) {
    console.error("Error toggling integration:", error)
    return { success: false, error: 'Failed to update integration' }
  }
}
