import { PrismaClient } from '@prisma/client';
import { leadRouter } from '../src/lib/crm/lead-router';

const prisma = new PrismaClient();

async function runPilotMock() {
  console.log('--- Starting CRM Lead Routing Pilot Mock ---');

  try {
    // 1. Create a mock organization and active campaign
    const org = await prisma.organization.create({
      data: {
        name: 'Pilot Testing Org',
        slug: `pilot-org-${Date.now()}`
      }
    });

    const campaign = await prisma.campaign.create({
      data: {
        name: 'High Priority Cash Offer Campaign',
        organizationId: org.id,
        status: 'ACTIVE'
      }
    });

    console.log(`Created Active Campaign: [${campaign.name}]`);

    // 2. Create a mock lead
    const lead = await prisma.lead.create({
      data: {
        organizationId: org.id,
        firstName: 'John',
        lastName: 'RoutingTest',
        email: 'john@example.com',
        phone: '+15558889999',
        status: 'NEW',
        source: 'Simulated Webhook',
        customFields: {
          need: 'wants cash offer today'
        }
      }
    });

    console.log(`Created Mock Lead: [${lead.firstName} ${lead.lastName}] with context:`, lead.customFields);

    // 3. Execute the lead routing logic manually
    console.log('Executing Lead Router...');
    await leadRouter.routeLead(lead);

    // 4. Verify the lead was correctly placed into the Campaign queue
    const assignment = await prisma.campaignLead.findUnique({
      where: {
        campaignId_leadId: {
          campaignId: campaign.id,
          leadId: lead.id
        }
      }
    });

    if (assignment) {
      console.log('✅ SUCCESS: Lead was successfully routed and assigned to the correct active campaign queue.');
      console.log('Campaign Assignment Record:', assignment);
    } else {
      console.error('❌ FAILURE: Lead was not found in the campaign queue.');
    }

  } catch (error) {
    console.error('Test Execution Failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runPilotMock();
