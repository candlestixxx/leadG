import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastEvent } from "@/lib/sse/emitter";

// This endpoint receives incoming webhooks from Follow Up Boss (FUB)
export async function POST(req: Request) {
  try {
    const payload = await req.json();

    // Example FUB Payload structure
    // { event: 'people.updated', uri: 'https://api.followupboss.com/v1/people/12345', data: { personId: 12345, ... } }

    // We'll mock the extraction process for the MVP
    const event = payload.event;
    const personEmail = payload.data?.email || payload.person?.email;

    if (!personEmail) {
       return NextResponse.json({ success: true, note: "Ignored, missing identifiable email or phone in payload." });
    }

    console.log(`[FUB Webhook] Received event: ${event} for ${personEmail}`);

    let lead = await prisma.lead.findFirst({
      where: {
        email: personEmail
      }
    });

    if (!lead) {
      console.log(`[FUB Webhook] No local lead found matching email: ${personEmail}. Ingesting as new lead.`);

      const firstName = payload.data?.firstName || payload.person?.firstName || 'Unknown';
      const lastName = payload.data?.lastName || payload.person?.lastName || 'Lead';
      const phone = payload.data?.phones?.[0]?.value || payload.person?.phones?.[0]?.value || null;

      let leadType = 'Buyer';
      const rawTags = (payload.data?.tags || []).join(' ').toLowerCase();
      if (rawTags.includes('seller') || rawTags.includes('listing')) {
        leadType = 'Seller';
      }

      const targetWorkflow = await prisma.followUpWorkflow.findFirst({
          where: { name: leadType === 'Buyer' ? 'Buyer 10-Day Blitz' : 'Seller 14-Day Follow-Up' }
      });

      const defaultUser = await prisma.user.findFirst();

      lead = await prisma.lead.create({
        data: {
          first_name: firstName,
          last_name: lastName,
          email: personEmail,
          phone: phone,
          lead_type: leadType,
          lead_source: 'Follow Up Boss Webhook',
          status: 'New',
          userId: defaultUser?.id, // Assign to default admin if multi-tenant lookup fails
          activeWorkflowId: targetWorkflow ? targetWorkflow.id : undefined,
          currentWorkflowDay: targetWorkflow ? 0 : undefined,
          next_follow_up_at: targetWorkflow ? new Date() : undefined,
        },
      });

      if (targetWorkflow) {
        await prisma.leadActivity.create({
          data: {
            leadId: lead.id,
            type: 'Workflow Started',
            description: `Auto-assigned to ${targetWorkflow.name} via FUB Ingestion`
          }
        });
      }

      broadcastEvent('new_lead', lead);

      return NextResponse.json({ success: true, leadId: lead.id, note: "New lead ingested successfully." });
    }

    let newStatus = lead.status;
    let pauseWorkflow = false;

    // Determine intent from the CRM event
    // In a real system, you'd fetch the full lead profile from FUB via the URI to check the exact "Stage"
    if (event === "people.deleted" || payload.data?.stage === "Trash" || payload.data?.stage === "Closed") {
        newStatus = "Closed/Archived";
        pauseWorkflow = true;
    } else if (payload.data?.stage === "Appointment Set") {
        newStatus = "Appointment Set";
        pauseWorkflow = true;
    }

    // Update local lead state
    const updateData: any = {
        status: newStatus
    };

    if (pauseWorkflow) {
        updateData.activeWorkflowId = null;
        console.log(`[FUB Webhook] Halting active workflows for Lead ${lead.id} based on upstream CRM state.`);
    }

    await prisma.lead.update({
        where: { id: lead.id },
        data: updateData
    });

    // Log the sync
    await prisma.leadActivity.create({
        data: {
            leadId: lead.id,
            type: "CRM_SYNC_INBOUND",
            description: `Received upstream update from Follow Up Boss: ${event}`
        }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("[FUB Webhook] Error processing Follow Up Boss webhook:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
