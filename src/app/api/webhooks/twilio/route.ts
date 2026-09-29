import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SentimentAnalyzer } from "@/lib/adapters/sentiment";
import { getCrmProvider } from "@/lib/adapters";

// This endpoint receives webhooks from Twilio when a lead replies via SMS
export async function POST(req: Request) {
  try {
    const textParams = await req.text();
    const params = new URLSearchParams(textParams);

    // Twilio sends the from number and message body
    const fromNumberRaw = params.get("From") || "";
    const body = params.get("Body") || "";

    // Clean Twilio number (e.g. "+15551234567" -> "5551234567")
    const fromNumber = fromNumberRaw.replace("+1", "").replace(/\D/g, "");

    if (!fromNumber || !body) {
       return NextResponse.json({ error: "Missing From or Body parameters" }, { status: 400 });
    }

    console.log(`[Twilio Webhook] Received message from ${fromNumber}: ${body}`);

    // Extract the to parameter to map to the correct agent's integration settings
    const toNumberRaw = params.get("To") || "";
    const toNumber = toNumberRaw.replace("+1", "").replace(/\D/g, "");

    // Look up the tenant who owns this Twilio number
    let tenantUserId: string | undefined = undefined;
    if (toNumber) {
        const settings = await prisma.integrationSettings.findFirst({
            where: {
                provider: 'twilio_phone_number',
                apiKey: { contains: toNumber }
            }
        });
        if (settings && settings.userId) {
            tenantUserId = settings.userId;
        }
    }

    // Look up the lead by phone number, specifically for the tenant who owns the receiving number
    // Note: In a real system, you'd match normalized phone numbers strictly.
    const lead = await prisma.lead.findFirst({
      where: {
        phone: {
          contains: fromNumber
        },
        ...(tenantUserId ? { userId: tenantUserId } : {})
      }
    });

    if (!lead) {
      console.log(`[Twilio Webhook] No lead found matching phone: ${fromNumber}`);
      // Return 200 so Twilio stops retrying
      return new NextResponse("<Response></Response>", {
          status: 200,
          headers: { "Content-Type": "text/xml" }
      });
    }

    // 1. Log the incoming message
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        type: "INBOUND_SMS",
        description: `Received SMS: "${body}"`
      }
    });

    // 2. Perform Sentiment & Intent Analysis
    const analysis = await SentimentAnalyzer.analyze(body, lead.userId || undefined);

    let newStatus = lead.status;

    // 3. Update Lead Status based on Intent
    if (analysis.intent === "DNC" || analysis.intent === "UNSUBSCRIBE") {
      newStatus = "Do Not Contact";
    } else if (analysis.intent === "HOT" || analysis.sentiment === "POSITIVE") {
      newStatus = "Hot Lead";
    } else {
      newStatus = "Contacted"; // General reply
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
        activeWorkflowId: null, // Pause the workflow
        urgency_score: newScore
    };

    await prisma.lead.update({
      where: { id: lead.id },
      data: updatedLeadData
    });

    console.log(`[Twilio Webhook] Lead ${lead.id} status updated to ${newStatus}. Workflow PAUSED.`);

    // 6. Trigger CRM Outbound Sync
    const crmProvider = getCrmProvider();
    await crmProvider.updateLead(lead.id, updatedLeadData as any);

    // Return empty TwiML response as expected by Twilio
    return new NextResponse("<Response></Response>", {
      status: 200,
      headers: { "Content-Type": "text/xml" }
    });

  } catch (error) {
    console.error("[Twilio Webhook] Error processing SMS:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
