'use server'

import { prisma } from '@/lib/db/prisma'
import { revalidatePath } from 'next/cache'

export async function getAgents() {
  if (process.env.npm_lifecycle_event === 'build') {
    return []
  }

  try {
    const agents = await prisma.aiAgent.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { campaigns: true, callLogs: true }
        }
      }
    })
    return agents
  } catch (error) {
    console.error("Error fetching agents:", error)
    return []
  }
}

export async function getAgent(id: string) {
  if (process.env.npm_lifecycle_event === 'build') {
    return null
  }

  try {
    const agent = await prisma.aiAgent.findUnique({
      where: { id }
    })
    return agent
  } catch (error) {
    console.error(`Error fetching agent ${id}:`, error)
    return null
  }
}

export async function updateAgent(id: string, data: any) {
  try {
    await prisma.aiAgent.update({
      where: { id },
      data
    })
    revalidatePath('/agents')
    revalidatePath(`/agents/${id}`)
    return { success: true }
  } catch (error) {
    console.error("Error updating agent:", error)
    return { success: false, error: 'Failed to update agent configuration' }
  }
}
