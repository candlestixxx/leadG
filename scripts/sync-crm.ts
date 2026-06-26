import { prisma } from '@/lib/db/prisma';
import { crmSyncService } from '@/lib/crm/crm-connector';

async function main() {
  console.log('Starting CRM Synchronization job...');

  try {
    // 1. Fetch all organizations that have an active integration
    const integrations = await prisma.integration.findMany({
      where: {
        isActive: true,
        type: { in: ['HUBSPOT', 'SALESFORCE', 'GOHIGHLEVEL'] }
      },
      select: {
        organizationId: true,
        type: true
      }
    });

    if (integrations.length === 0) {
      console.log('No active CRM integrations found. Exiting.');
      return;
    }

    console.log(`Found ${integrations.length} active integrations to sync.`);

    // 2. Iterate through each integration and trigger the sync service
    for (const integration of integrations) {
      console.log(`Syncing leads for Organization: ${integration.organizationId} using ${integration.type}...`);

      try {
        await crmSyncService.syncLeadsToCrm(integration.organizationId);
        console.log(`Successfully synced Organization: ${integration.organizationId}`);
      } catch (syncError: any) {
        console.error(`Failed to sync Organization: ${integration.organizationId}. Error: ${syncError.message}`);
        // Continue to the next organization even if one fails
      }
    }

    console.log('CRM Synchronization job completed successfully.');
  } catch (error: any) {
    console.error('Fatal error during CRM synchronization:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
