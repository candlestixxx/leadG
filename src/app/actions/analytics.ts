'use server'

import { prisma } from '@/lib/db/prisma'

export async function getAnalyticsData() {
  if (process.env.npm_lifecycle_event === 'build') {
     return { avgSentiment: 0.85, totalTransferred: 42, totalConverted: 12, activeCampaigns: 2, learnedObjections: [] }
  }

  try {
      const calls = await prisma.callLog.findMany({
         select: { sentiment: true, status: true, outcome: true }
      })

      const campaigns = await prisma.campaign.count({ where: { status: 'ACTIVE' } })

      let totalSentiment = 0
      let countWithSentiment = 0
      let totalTransferred = 0
      let totalConverted = 0

      for (const call of calls) {
         if (call.sentiment !== null && call.sentiment !== undefined) {
             totalSentiment += call.sentiment
             countWithSentiment++
         }
         if (call.status === 'TRANSFERRED' || call.outcome === 'TRANSFERRED') {
             totalTransferred++
         }
         if (call.outcome === 'MEETING_SCHEDULED' || call.outcome === 'QUALIFIED' || call.outcome === 'INTERESTED') {
             totalConverted++
         }
      }

      // Fetch learned objections from the first active AI agent
      const agent = await prisma.aiAgent.findFirst({
         where: { isActive: true },
         select: { objectionHandling: true }
      })

      let learnedObjections: any[] = []
      if (agent && Array.isArray(agent.objectionHandling)) {
          // Filter to only objects that were "learned" (have learnedFromCallId)
          learnedObjections = agent.objectionHandling.filter((obj: any) => obj.learnedFromCallId)
      }

      return {
          avgSentiment: countWithSentiment > 0 ? totalSentiment / countWithSentiment : 0,
          totalTransferred,
          totalConverted,
          activeCampaigns: campaigns,
          learnedObjections: learnedObjections.slice(0, 5) // Top 5
      }
  } catch (error) {
      console.error("Error fetching analytics:", error)
      return { avgSentiment: 0, totalTransferred: 0, totalConverted: 0, activeCampaigns: 0, learnedObjections: [] }
  }
}
