import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVoiceProvider, getSmsProvider, getEmailProvider } from '@/lib/adapters';
import { SentimentAnalyzer } from '@/lib/adapters/sentiment';
import { getMlsProvider } from '@/lib/adapters/mls';
import { SCRIPTS, compileScript, generateMockSummary } from '@/lib/scripts';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = await prisma.user.findUnique({ where: { email: session.user.email }});
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { leadId, action, agentPhone } = body;

    if (!leadId || !action) {
      return NextResponse.json({ error: 'leadId and action are required' }, { status: 400 });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { assignedAgent: true }
    });
    if (!lead || lead.userId !== user.id) return NextResponse.json({ error: 'Lead not found or access denied' }, { status: 404 });

    const voice = getVoiceProvider();
    const sms = getSmsProvider();
    const email = getEmailProvider();

    const scriptData: Record<string, any> = {
      firstName: lead.firstName,
      lastName: lead.lastName,
      agent_name: lead.assignedAgent?.name || 'Local Agent',
      area: lead.city || 'your area',
      propertyAddress: lead.propertyAddress,
      leadType: lead.leadType,
      timeline: lead.timeline,
      motivation: lead.motivation
    };

    if (action === 'call') {
      // Inject Live MLS Data for Buyers
      if (lead.leadType === 'Buyer' && lead.city) {
          const mls = getMlsProvider();
          const listings = await mls.fetchActiveListings(lead.city);
          if (listings.length > 0) {
              scriptData.mls_context = `There are currently properties available like ${listings[0].address} listed at $${listings[0].price}.`;
          }
      }

      await voice.callLead(leadId);
      const scriptToUse = lead.leadType === 'Buyer' ? SCRIPTS.buyerFirstCall : SCRIPTS.sellerFirstCall;

      // Inject the MLS context into the AI script if available
      let compiledScript = compileScript(scriptToUse, scriptData);
      if (scriptData.mls_context) {
          compiledScript += `\n\n[System Note to AI: Mention the following live MLS data: ${scriptData.mls_context}]`;
      }

      await prisma.leadActivity.create({
        data: { leadId, type: 'Call', description: `AI Call: "${compiledScript}"` }
      });
      return NextResponse.json({ success: true, message: 'Call initiated' });
    }

    if (action === 'warm_transfer') {
      await voice.warmTransfer(leadId, agentPhone || '555-0000');

      const bridgeScript = compileScript(SCRIPTS.warmTransferBridge, scriptData);
      const whisperScript = compileScript(SCRIPTS.agentWhisper, scriptData);
      const summaryText = generateMockSummary(scriptData, 'Lead Transferred to Agent');

      // Update lead status
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          status: 'Warm Transfer Completed',
          urgencyScore: 90,
          aiSummary: summaryText
        }
      });

      // Create conversation record
      const conversation = await prisma.conversation.create({
        data: { leadId, transcript: 'Mock transcript data...' }
      });

      await prisma.aIConversationSummary.create({
        data: {
          conversationId: conversation.id,
          summary: summaryText
        }
      });

      await prisma.leadActivity.create({
        data: { leadId, type: 'Warm Transfer', description: `Agent whispered: ${whisperScript}` }
      });

      return NextResponse.json({ success: true, message: 'Warm transfer completed successfully' });
    }

    if (action === 'sms') {
      await sms.sendText(leadId, 'Hello from Jules AI');
      await prisma.leadActivity.create({
        data: { leadId, type: 'SMS', description: 'SMS Sent' }
      });
      return NextResponse.json({ success: true, message: 'SMS sent' });
    }

    if (action === 'email') {
      const activities = await prisma.leadActivity.findMany({
          where: { leadId },
          orderBy: { createdAt: 'desc' },
          take: 5
      });

      const summary = await prisma.aIConversationSummary.findFirst({
          where: { conversation: { leadId } },
          orderBy: { createdAt: 'desc' }
      });

      const emailContent = await SentimentAnalyzer.generateEmail(lead, activities, summary, user.id);

      await email.sendEmail(leadId, emailContent.subject, emailContent.body);

      await prisma.leadActivity.create({
        data: { leadId, type: 'Email', description: `AI Email Sent: "${emailContent.subject}"` }
      });

      return NextResponse.json({ success: true, message: 'AI Email generated and sent' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to trigger workflow' }, { status: 500 });
  }
}
