import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaignId')

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId required' }, { status: 400 })
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        name: true,
        isAbTesting: true,
        abTestVariants: true
      }
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (!campaign.isAbTesting) {
      return NextResponse.json({ error: 'Campaign is not an A/B test' }, { status: 400 })
    }

    const variants = campaign.abTestVariants as any[]
    const results = await Promise.all(
      variants.map(async (variant: any) => {
        const leads = await prisma.campaignLead.findMany({
          where: {
            campaignId,
            abVariantId: variant.id
          },
          select: {
            status: true,
            attempts: true,
            outcome: true
          }
        })

        const total = leads.length
        const converted = leads.filter((l: any) => l.status === 'CONVERTED').length
        const transferred = leads.filter((l: any) => l.status === 'TRANSFERRED').length
        const completed = leads.filter((l: any) => l.status === 'COMPLETED').length
        const failed = leads.filter((l: any) => l.status === 'FAILED').length
        const optedOut = leads.filter((l: any) => l.status === 'OPTED_OUT').length

        return {
          variantId: variant.id,
          weight: variant.weight || 50,
          agentId: variant.aiAgentId,
          total,
          converted,
          transferred,
          completed,
          failed,
          optedOut,
          conversionRate: total > 0 ? Math.round((converted / total) * 1000) / 10 : 0,
          contactRate: total > 0 ? Math.round(((converted + transferred + completed) / total) * 1000) / 10 : 0
        }
      })
    )

    const totalLeads = results.reduce((sum: number, r: any) => sum + r.total, 0)
    const totalConverted = results.reduce((sum: number, r: any) => sum + r.converted, 0)

    return NextResponse.json({
      campaignId: campaign.id,
      campaignName: campaign.name,
      totalLeads,
      totalConverted,
      overallConversionRate: totalLeads > 0 ? Math.round((totalConverted / totalLeads) * 1000) / 10 : 0,
      variants: results,
      winner: results.length >= 2
        ? results.reduce((best: any, r: any) => r.conversionRate > best.conversionRate ? r : best, results[0]).variantId
        : null
    })
  } catch (error) {
    console.error('A/B test analytics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
