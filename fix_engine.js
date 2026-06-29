const fs = require('fs');
let code = fs.readFileSync('src/lib/campaigns/campaign-engine.ts', 'utf8');
code = code.replace(/export class CampaignEngine \{/, `export class CampaignEngine {
  async addLeadToCampaign(campaignId: string, leadId: string): Promise<void> {
    await prisma.campaignLead.upsert({
      where: { campaignId_leadId: { campaignId, leadId } },
      update: { status: 'PENDING', attempts: 0, currentStep: 0 },
      create: { campaignId, leadId, status: 'PENDING' }
    });
  }`);
fs.writeFileSync('src/lib/campaigns/campaign-engine.ts', code);
