import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Start seeding...')

  // 1. Create Organization
  const org = await prisma.organization.upsert({
    where: { slug: 'voiceforge-pilot' },
    update: {},
    create: {
      name: 'VoiceForge Pilot Org',
      slug: 'voiceforge-pilot',
      plan: 'STARTER',
    },
  })

  // 2. Create AI Agent
  const agent = await prisma.aiAgent.create({
    data: {
      name: 'Alex - Pilot Specialist',
      organizationId: org.id,
      voiceProvider: 'ELEVENLABS',
      voiceId: '21m00Tcm4TlvDq8ikWAM', // Example ElevenLabs voice
      voiceName: 'Alex',
      voiceGender: 'MALE',
      voiceAccent: 'american',
      systemPrompt: 'You are Alex, an acquisitions specialist. Your goal is to evaluate if the prospect is interested in selling their property.',
      personality: {
        persuasiveness: 0.8,
        honesty: 0.9,
        confidence: 0.8,
        energy: 0.7,
        empathy: 0.8,
        verbosity: 'moderate',
        formality: 'professional',
        humor: 'light'
      },
    },
  })

  // 3. Create Webhook Integration (Simulating CRM)
  await prisma.integration.upsert({
    where: {
      organizationId_type: {
        organizationId: org.id,
        type: 'WEBHOOK',
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      type: 'WEBHOOK',
      name: 'Pilot CRM Webhook',
      credentials: {
        webhookUrl: 'http://localhost:3000/api/webhooks/crm',
        headers: JSON.stringify({ Authorization: 'Bearer test-token' }),
      },
      isActive: true,
    },
  })

  // 4. Create Phone Number
  const phone = await prisma.phoneNumber.create({
    data: {
      organizationId: org.id,
      phoneNumber: '+15550001111',
      friendlyName: 'Pilot Outbound Number',
      isActive: true,
    }
  })

  // 5. Create Leads
  const lead1 = await prisma.lead.create({
    data: {
      organizationId: org.id,
      firstName: 'John',
      lastName: 'Doe',
      phone: '+15551234567',
      company: 'Acme Corp',
      status: 'NEW',
    },
  })

  const lead2 = await prisma.lead.create({
    data: {
      organizationId: org.id,
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '+15559876543',
      company: 'Globex',
      status: 'NEW',
    },
  })

  // 6. Create Pilot Campaign
  const campaign = await prisma.campaign.create({
    data: {
      name: 'Q3 Pilot Outreach',
      organizationId: org.id,
      aiAgentId: agent.id,
      status: 'DRAFT',
      type: 'OUTBOUND_CALLING',
      callsPerMinute: 2,
      callsPerDay: 50,
      steps: {
        create: [
          {
            order: 0,
            type: 'CALL',
          }
        ]
      },
      campaignLeads: {
        create: [
          { leadId: lead1.id },
          { leadId: lead2.id },
        ]
      }
    },
  })

  console.log(`Created Campaign: ${campaign.name} with ID: ${campaign.id}`)
  console.log('Seeding finished.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
