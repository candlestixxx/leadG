'use server'

import { prisma } from '@/lib/db/prisma'

export async function getDashboardStats() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const [
      callsToday,
      callsYesterday,
      connectionsToday,
      connectionsYesterday,
      transfersToday,
      transfersYesterday,
      conversionsToday,
      conversionsYesterday,
    ] = await Promise.all([
      // Total Calls
      prisma.callLog.count({ where: { startedAt: { gte: today } } }),
      prisma.callLog.count({ where: { startedAt: { gte: yesterday, lt: today } } }),

      // Connections (Answered calls)
      prisma.callLog.count({ where: { startedAt: { gte: today }, status: { in: ['IN_PROGRESS', 'COMPLETED', 'TRANSFERRED'] } } }),
      prisma.callLog.count({ where: { startedAt: { gte: yesterday, lt: today }, status: { in: ['IN_PROGRESS', 'COMPLETED', 'TRANSFERRED'] } } }),

      // Transfers
      prisma.callLog.count({ where: { startedAt: { gte: today }, status: 'TRANSFERRED' } }),
      prisma.callLog.count({ where: { startedAt: { gte: yesterday, lt: today }, status: 'TRANSFERRED' } }),

      // Conversions (Meetings or high intent)
      prisma.callLog.count({ where: { startedAt: { gte: today }, outcome: { in: ['MEETING_SCHEDULED', 'INTERESTED', 'QUALIFIED'] } } }),
      prisma.callLog.count({ where: { startedAt: { gte: yesterday, lt: today }, outcome: { in: ['MEETING_SCHEDULED', 'INTERESTED', 'QUALIFIED'] } } }),
    ])

    return {
      calls: { value: callsToday, change: calculateChange(callsToday, callsYesterday) },
      connections: { value: connectionsToday, change: calculateChange(connectionsToday, connectionsYesterday) },
      transfers: { value: transfersToday, change: calculateChange(transfersToday, transfersYesterday) },
      conversions: { value: conversionsToday, change: calculateChange(conversionsToday, conversionsYesterday) },
    }
  } catch (error) {
    console.error('Failed to fetch stats:', error)
    return {
      calls: { value: 0, change: '0%' },
      connections: { value: 0, change: '0%' },
      transfers: { value: 0, change: '0%' },
      conversions: { value: 0, change: '0%' },
    }
  }
}

export async function getActiveCalls() {
  try {
    const calls = await prisma.callLog.findMany({
      where: { status: 'IN_PROGRESS' },
      include: { lead: true, aiAgent: true },
      take: 5,
      orderBy: { startedAt: 'desc' }
    })

    return calls.map(c => ({
      id: c.id,
      lead: c.lead ? `${c.lead.firstName} ${c.lead.lastName}` : 'Unknown',
      company: c.lead?.company || 'Unknown',
      agent: c.aiAgent?.name || 'VoiceForge Agent',
      duration: c.answeredAt ? Math.floor((Date.now() - c.answeredAt.getTime()) / 1000) : 0,
      sentiment: c.sentiment || 0.5,
      phase: 'In Progress'
    }))
  } catch (error) {
    console.error('Failed to fetch active calls:', error)
    return []
  }
}

export async function getRecentOutcomes() {
  try {
    const calls = await prisma.callLog.findMany({
      where: { status: { in: ['COMPLETED', 'TRANSFERRED', 'FAILED', 'NO_ANSWER'] } },
      include: { lead: true },
      take: 8,
      orderBy: { endedAt: 'desc' }
    })

    return calls.map(c => ({
      id: c.id,
      lead: c.lead ? `${c.lead.firstName} ${c.lead.lastName}` : 'Unknown',
      outcome: formatOutcome(c.outcome || c.status),
      status: mapStatusColor(c.outcome || c.status),
      time: c.endedAt ? formatTimeAgo(c.endedAt) : 'Just now',
      duration: formatDuration(c.duration || 0)
    }))
  } catch (error) {
    console.error('Failed to fetch recent outcomes:', error)
    return []
  }
}

export async function getActiveCampaigns() {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: { status: 'ACTIVE' },
      take: 4,
      orderBy: { createdAt: 'desc' }
    })

    return campaigns.map(c => ({
      name: c.name,
      status: c.status.toLowerCase(),
      leads: c.totalLeads,
      called: c.totalCalls,
      connected: c.totalConnected,
      transferred: c.totalTransferred,
      converted: c.totalConverted
    }))
  } catch (error) {
    console.error('Failed to fetch active campaigns:', error)
    return []
  }
}

// Helpers
function calculateChange(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? '+100%' : '0%'
  const percent = ((current - previous) / previous) * 100
  return `${percent >= 0 ? '+' : ''}${percent.toFixed(1)}%`
}

function formatOutcome(outcome: string): string {
  return outcome.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')
}

function mapStatusColor(outcome: string): 'success' | 'pending' | 'failed' | 'neutral' {
  const successList = ['MEETING_SCHEDULED', 'INTERESTED', 'QUALIFIED', 'TRANSFERRED']
  const pendingList = ['CALLBACK_REQUESTED']
  const failedList = ['NOT_INTERESTED', 'UNQUALIFIED', 'WRONG_NUMBER', 'DO_NOT_CALL', 'FAILED']

  if (successList.includes(outcome)) return 'success'
  if (pendingList.includes(outcome)) return 'pending'
  if (failedList.includes(outcome)) return 'failed'
  return 'neutral'
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
