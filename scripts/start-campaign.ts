import { PrismaClient } from '@prisma/client'
import { campaignEngine } from '../src/lib/campaigns/campaign-engine'

const prisma = new PrismaClient()

async function main() {
  console.log('Fetching Pilot Campaign...')

  const campaign = await prisma.campaign.findFirst({
    where: { name: 'Q3 Pilot Outreach' }
  })

  if (!campaign) {
    console.error('Pilot campaign not found. Did you run the seed script?')
    process.exit(1)
  }

  console.log(`Starting campaign: ${campaign.name} (ID: ${campaign.id})`)

  try {
    await campaignEngine.startCampaign(campaign.id)
    console.log('Campaign started successfully! Background workers are now processing leads.')
  } catch (error) {
    console.error('Failed to start campaign:', error)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
