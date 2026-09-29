import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SentimentAnalyzer } from "@/lib/adapters/sentiment";
import { getCrmProvider } from "@/lib/adapters";

// This endpoint receives incoming emails via SendGrid's Inbound Parse webhook.
// SendGrid posts data as multipart/form-data.
export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    // Extract required fields
    const fromRaw = formData.get("from") as string || "";
    const bodyText = formData.get("text") as string || "";
    const subject = formData.get("subject") as string || "No Subject";

    // "From" usually comes in as "John Doe <john@example.com>"
    // Extract just the email part using a basic regex
    const emailMatch = fromRaw.match(/<([^>]+)>/);
    const fromEmail = emailMatch ? emailMatch[1].trim().toLowerCase() : fromRaw.trim().toLowerCase();

    if (!fromEmail) {
       return NextResponse.json({ error: "Missing 'from' parameter" }, { status: 400 });
    }

    console.log(`[SendGrid Webhook] Received email from ${fromEmail}. Subject: ${subject}`);

    // Extract the to parameter to map to the correct agent's integration settings
    const toRaw = formData.get("to") as string || "";
    const toEmailMatch = toRaw.match(/<([^>]+)>/);
    const toEmail = toEmailMatch ? toEmailMatch[1].trim().toLowerCase() : toRaw.trim().toLowerCase();

    // Look up the tenant who owns this receiving email address
    let tenantUserId: string | undefined = undefined;
    if (toEmail) {
        const settings = await prisma.integrationSettings.findFirst({
            where: {
                provider: 'sendgrid_from_email', // Usually the receiving email is the same as the sending email in simple setups
                apiKey: { contains: toEmail }
            }
        });
        if (settings && settings.userId) {
            tenantUserId = settings.userId;
        }
    }

    // Look up the lead by email, scoped to the tenant
    const lead = await prisma.lead.findFirst({
      where: {
        email: fromEmail,
        ...(tenantUserId ? { userId: tenantUserId } : {})
      }
    });

    if (!lead) {
      console.log(`[SendGrid Webhook] No lead found matching email: ${fromEmail}`);
      return NextResponse.json({ success: true, note: "Ignored, no matching lead." });
    }

    // 1. Log the incoming message
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        type: "INBOUND_EMAIL",
        description: `Subject: ${subject}\n\nBody: ${bodyText.substring(0, 200)}...`
      }
    });

    // 2. Perform Sentiment & Intent Analysis
    const analysis = await SentimentAnalyzer.analyze(bodyText, lead.userId || undefined);

    let newStatus = lead.status;

    // 3. Update Lead Status based on Intent
    if (analysis.intent === "DNC" || analysis.intent === "UNSUBSCRIBE") {
      newStatus = "Do Not Contact";
    } else if (analysis.intent === "HOT" || analysis.sentiment === "POSITIVE") {
      newStatus = "Hot Lead";
    } else {
      newStatus = "Contacted";
    }

    // 4. Predict new intelligent Lead Score based on history
    const recentActivities = await prisma.leadActivity.findMany({
        where: { leadId: lead.id },
        orderBy: { createdAt: 'desc' },
        take: 10
    });
    const newScore = await SentimentAnalyzer.predictLeadScore(lead, recentActivities, lead.userId || undefined);

    // 5. Auto-Pause active workflows to prevent double-messaging
    const updatedLeadData = {
        status: newStatus,
        activeWorkflowId: null,
        urgency_score: newScore
    };

    await prisma.lead.update({
      where: { id: lead.id },
      data: updatedLeadData
    });

    console.log(`[SendGrid Webhook] Lead ${lead.id} status updated to ${newStatus}. Workflow PAUSED.`);

    // 6. Trigger CRM Outbound Sync
    const crmProvider = getCrmProvider();
    await crmProvider.updateLead(lead.id, updatedLeadData as any);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("[SendGrid Webhook] Error processing Email:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
